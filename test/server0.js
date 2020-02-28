const http = require('http');
const zlib = require('zlib');
const crypto = require('crypto');

const hostname = '127.0.0.1';
const port = 3000;

const md5 = (data) => crypto.createHash('md5').update(data).digest('hex');
const base64_encode = (data) => Buffer.from(data).toString('base64');
const base64_decode = (data) => Buffer.from(data, 'base64').toString('utf8');

const USER  = "service";
const PASS  = "2222";
const REALM = "GOLD authentication";
const DEBUG = true;

const needBasicAuth=(res)=>{res.statusCode = 401; res.setHeader('WWW-Authenticate', `Basic realm="${REALM}"`);};
const DIGEST_NONCE=md5((new Date()).getTime().toString());
const needDigestAuth=(res)=>{ const head='WWW-Authenticate', www=`Digest realm="${REALM}", nonce="${DIGEST_NONCE}", qop="auth"`;
  res.statusCode = 401; res.setHeader(head, www);
  if (DEBUG) console.log(head, www);
};


const server = http.createServer((req, res) => {
  res.statusCode = 200;
  if (DEBUG) console.log(req.method, req.url); // "/"
  
  // working on path "/"
  if ('/'==req.url) {
    if (DEBUG) console.log(req.headers);
    
    //browser send Authorization header 
    if (req.headers.authorization) {
      var authorization = req.headers.authorization; //'Basic dXNlcjoxMTE=' for user:111
      if (DEBUG) console.log('req.headers.authorization', authorization); 
      var auth_arr=authorization.trim().split(/ +/);//['Basic', 'dXNlcjoxMTE=']
      if (DEBUG) console.log(auth_arr);
      if (auth_arr.length){
        switch(auth_arr[0].toLowerCase()) {
          //<editor-fold defaultstate="collapsed" desc="Basic">
          case 'basic':
            if (auth_arr.length<2){
              needBasicAuth(res); //incorect basic params
              break;
            }
            let user_pass =base64_decode(auth_arr[1]); //"user:111"
            let up = user_pass.split(':');// ['user', '111']
            if ((up.length<1) || (up[0] != USER) || (up[1] != PASS)) {
              needBasicAuth(res); //incorect user or pass
            } else {
              console.log('OK - basic auth');
            }
          break;//Basic
          //</editor-fold>
          
          //<editor-fold defaultstate="collapsed" desc="Digest">
          case 'digest'://req `Digest realm="GOLD authentication", charset="UTF-8", nonce="5e579a86:7defc736a0ff8796e49355f72d50feb3", qop="auth"`
            //authorization='Digest username="service",realm="GOLD authentication",nonce="5e579a86:7defc736a0ff8796e49355f72d50feb3",uri="/bus/cgi/parameter.cgi",cnonce="5fc0be493b19dad7dc7eca2d11d214c9",nc=00000001,algorithm=MD5,response="1d4081a497356678be3f47357dbabe37",qop="auth"'
            //for uri=/bus/cgi/parameter.cgi
            // auth_arr=['Digest', ...]
            let auth_substr=authorization.substr(auth_arr[0].length).trim(); //'username="service",realm="GOLD authentication",nonce="5e579a86:7defc736a0ff8796e49355f72d50feb3",uri="/bus/cgi/parameter.cgi",cnonce="5fc0be493b19dad7dc7eca2d11d214c9",nc=00000001,algorithm=MD5,response="1d4081a497356678be3f47357dbabe37",qop="auth"'
            let a = auth_substr.split(',');// ['username="service"', 'realm="GOLD authentication"', ...]
            let key_arr=[], //['username', 'realm', 'nonce', 'uri', 'cnonce', 'nc', 'algorithm', 'response', 'qop']
                map={}; //{username: 'service', realm:'GOLD authentication', ...}
            for(let i=0; i<a.length; i++) {
              let t=a[i].split('=');
              let key=t[0].trim();
              key_arr.push(key);
              map[key]=t[1].trim().replace(/^(["'])(.*)(["'])$/, '$2');
            }
            if(!map['username'] || (USER != map['username'])) {
              needDigestAuth(res); // unknown user
              break;
            }
            if (!map['nonce'] || !map['nc'] || !map['cnonce'] || !map['qop'] || !map['response']) {
              needDigestAuth(res); // unknown nonce, nc, cnonce, qop
              break;
            }
            
            let A1 = md5(map['username']+':'+REALM+':'+PASS);
            let A2 = md5(req.method+':'+req.url);
            let response=md5([A1, DIGEST_NONCE, //map['nonce'],
              map['nc'], map['cnonce'], map['qop'], A2].join(':'));
            if (response != map['response']) {
              needDigestAuth(res); // incorrect responce
              break;
            } else {
              console.log('OK - digest auth');
            }
          break;//Digest
          //</editor-fold>
          default:
            needBasicAuth(res); //incorect Authorization type  
        }
      } else { //incorect Authorization header
        needBasicAuth(res);
      } 
    } else { //not found Authorization header
      needDigestAuth(res);
      //needBasicAuth(res);
    }
  }





  res.setHeader('Content-Type', 'text/plain');
  
  let answer = 'Hello World';
  
  if (req.headers && req.headers['accept-encoding']) {
    let enc= req.headers['accept-encoding'].split(/[ ,]+/); //["gzip", "deflate", "br"]
    
    if (enc.indexOf('br')>=0){
      res.setHeader('Content-Encoding', 'br');
      answer = zlib.brotliCompressSync(Buffer.from(answer));
    } else
    if (enc.indexOf('gzip')>=0) {
      res.setHeader('Content-Encoding', 'gzip');
      answer = zlib.gzipSync(Buffer.from(answer));
    } else    
    if (enc.indexOf('deflate')>=0) {
      res.setHeader('Content-Encoding', 'deflate');
      answer = zlib.deflateRawSync(Buffer.from(answer));
    }
  }
  res.end(answer);
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});