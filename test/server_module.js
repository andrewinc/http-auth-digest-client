const zlib = require('zlib');
const crypto = require('crypto');

const md5 = (data) => crypto.createHash('md5').update(data).digest('hex');
const base64_encode = (data) => Buffer.from(data).toString('base64');
const base64_decode = (data) => Buffer.from(data, 'base64').toString('utf8');

const DEBUG = false;
const HOST = '127.0.0.1';
const PORT = 3000;
const REALM = "Realm text";
const DIGEST_NONCE=md5((new Date()).getTime().toString());
var options={
  answer:"Hello world!",
  digest:null,  //true|false|null
  encode:null,  //'br', 'deflate', 'gzip', null
  USER: 'user',
  PASS: '1111',
  support_auth: ['digest', 'basic'],
  support_encode: ['br', 'deflate', 'gzip']
}

//var answer_string="Hello world!";
//var digest=null; //true|false|null
//var encode=null;//'br', 'deflate', 'gzip', null



const needBasicAuth=(res)=>{res.statusCode = 401; res.setHeader('WWW-Authenticate', `Basic realm="${REALM}"`);};
const needDigestAuth=(res)=>{ const head='WWW-Authenticate', www=`Digest realm="${REALM}", nonce="${DIGEST_NONCE}", qop="auth"`;
  res.statusCode = 401; res.setHeader(head, www);
  if (DEBUG) console.log(head, www);
};


const basicCheck=(auth_arr,authorization,method,uri)=>{
  if (auth_arr.length<2){ return false; }//incorect basic params
  let user_pass =base64_decode(auth_arr[1]); //"user:1111"
  let a = user_pass.split(':');// ['user', '1111']
  return ((a.length<1) || (a[0] != options.USER) || (a[1] != options.PASS));
};

const digestCheck=(auth_arr,authorization,method,uri)=>{
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
  if (!map['username'] || (options.USER != map['username'])) { return false; } // unknown user
  if (!map['nonce'] || !map['nc'] || !map['cnonce'] || !map['qop'] || !map['response'])  { return false; } // unknown nonce, nc, cnonce, qop

  let A1 = md5([map['username'],':',options.PASS].join(':'));
  let A2 = md5([method,uri].join(':'));
  let response=md5([A1, DIGEST_NONCE, map['nc'], map['cnonce'], map['qop'], A2].join(':'));
  return (response == map['response']);
};

const encodeAnswer=(res, support_browser_arr, encode, answer)=>{
  // if browser support current encoding - encode answer
  switch(encode){
    case 'br':
      if (support_browser_arr.indexOf(encode)>=0){ 
        res.setHeader('Content-Encoding', encode);
        answer = zlib.brotliCompressSync(Buffer.from(answer));
      }
    break;
    case 'gzip':
      if (support_browser_arr.indexOf(encode)>=0) {
        res.setHeader('Content-Encoding', encode);
        answer = zlib.gzipSync(Buffer.from(answer));
      }
    break;
    case 'deflate':
      if (support_browser_arr.indexOf(encode)>=0) {
        res.setHeader('Content-Encoding', encode);
        answer = zlib.deflateRawSync(Buffer.from(answer));
      }
    break;
  }
  return answer;
}

const serverWorker=(req, res) => {
  res.statusCode = 200;
  if (DEBUG) console.log("REQUEST from browser", req.method, req.url, req.headers); // "/"
  
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
          if (!basicCheck(auth_arr,authorization,req.method,req.url)){
            needBasicAuth(res); 
          } else if (DEBUG) {
            console.log('OK - basic auth');
          }
        break;//Basic
        //</editor-fold>

        //<editor-fold defaultstate="collapsed" desc="Digest">
        case 'digest'://req `Digest realm="GOLD authentication", charset="UTF-8", nonce="5e579a86:7defc736a0ff8796e49355f72d50feb3", qop="auth"`
          //answer authorization='Digest username="service",realm="GOLD authentication",nonce="5e579a86:7defc736a0ff8796e49355f72d50feb3",uri="/bus/cgi/parameter.cgi",cnonce="5fc0be493b19dad7dc7eca2d11d214c9",nc=00000001,algorithm=MD5,response="1d4081a497356678be3f47357dbabe37",qop="auth"'
          if (!digestCheck(auth_arr,authorization,req.method,req.url)) {
            needDigestAuth(res);
          } else if (DEBUG) {
            console.log('OK - digest auth');
          }
        break;//Digest
        //</editor-fold>

        default:
          if(null !== options.digest) if (options.digest) needDigestAuth(res); else needBasicAuth(res); //incorect Authorization type
      }
    } else { //incorect Authorization header
      needBasicAuth(res);
    } 
  } else { //not found Authorization header
    if(null !== options.digest) if (options.digest) needDigestAuth(res); else needBasicAuth(res);
  }




  res.setHeader('Content-Type', 'text/plain');
  
  let answer = Buffer.from(options.answer);
  
  if ((null !== options.encode) && req.headers && req.headers['accept-encoding']) {
    let support_browser_arr= req.headers['accept-encoding'].split(/[ ,]+/); //["gzip", "deflate", "br"]
    answer = encodeAnswer(res, support_browser_arr, options.encode, answer);
  }
  res.end(answer);
  if (DEBUG) console.log('RESPONSE browser', res.statusCode, res.getHeaders(), answer, answer.toString('utf8'), "\n\n");
  return answer;
};

module.exports.DEBUG= DEBUG;
module.exports.HOST = HOST;
module.exports.PORT = PORT;
module.exports.REALM= REALM;
module.exports.DIGEST_NONCE = DIGEST_NONCE;

module.exports.md5 = md5;
module.exports.base64_encode = base64_encode;
module.exports.base64_decode = base64_decode;

module.exports.options = options;
/*
module.exports.answer =function(set){
  console.log(options);
  console.log('set', set);
  if('undefinded'!=typeof set) options.answer_string=set; 
  console.log('answer_string', options.answer_string);
  return options.answer_string; 
};
module.exports.digest =(set)=>{if('undefinded'!=typeof set) options.digest=set; return options.digest; };
module.exports.encode =(set)=>{if('undefinded'!=typeof set) options.encode=set; return options.encode; };
*/
module.exports.needBasicAuth=needBasicAuth;
module.exports.needDigestAuth=needDigestAuth;
module.exports.basicCheck=basicCheck;
module.exports.digestCheck=digestCheck;
module.exports.encodeAnswer=encodeAnswer
module.exports.serverWorker=serverWorker;
