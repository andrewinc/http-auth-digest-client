/**
 * start server
 * node server [port [encode [auth]]]
 * 
 * - port: listening port default: 3000
 * - encode: one of 'br', 'deflate', 'gzip' (without case sens.). Other (Ex.: 'none') - no encoding answer. Encoding use if client have it in header 'Accept-encoding'
 * - auth: one of 'Basic', 'Digest' (without case sens.). Other (Ex.: 'none') - no HTTP-auth headers.
 */
const process = require('process');
const http = require('http');
const server_module=require('./server_module');
const {dirname, basename}=require('./util');

let worker=server_module.serverWorker;


let nodePath = process.argv[0];
let appPath = process.argv[1];
let script = basename(appPath); // a
let path=appPath.substr(0, appPath.length-script.length); // C:\project\server\
let fname=path+'file.txt'; 


const fs = require('fs');

fs.open(fname, 'w', (err,fd)=>{
  
  fs.writeSync(fd, (new Date()).toString())
  fs.writeSync(fd,"\n");
  let t;
  let PORT = server_module.PORT;
  if ((process.argv.length>2) && !isNaN(t=parseInt(process.argv[2],10))) { PORT = t; }
  
  //encoding: 'br', 'deflate', 'gzip', other (null)
  const enc_array=server_module.options.support_encode;//['br', 'deflate', 'gzip']
  if ( (process.argv.length>3) && ((t=enc_array.indexOf(process.argv[3].toLowerCase()))>=0) ) { server_module.options.encode = enc_array[t];  }
  
  //auth type 'Basic', 'Digest'
  const auth_type=server_module.options.support_auth; // ['digest', 'basic']
  if ( (process.argv.length>4) && ((t=auth_type.indexOf(process.argv[4].toLowerCase())>=0)) ) { server_module.options.digest = (0==t); }
  
  
  const server = http.createServer((req, res) => {
    let answer = worker(req,res);
    if (answer instanceof Buffer) answer=answer.toString('utf8');
    fs.writeSync(fd,(new Date()).toString()+" "+req.method+" "+req.url+"\t"+answer+"\n");
    console.log(answer);
  });

  server.listen(PORT, server_module.HOST, () => {
    //console.log(`Server running at http://${server_module.HOST}:${PORT}/`);
  });
  
  //fs.closeSync(fd);
});

