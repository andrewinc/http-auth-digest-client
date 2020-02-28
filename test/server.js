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
  
const hostname = '127.0.0.1';
const port = 3000;

  
  
  fs.writeSync(fd, (new Date()).toString())
  fs.writeSync(fd,"\n");
  
  const server = http.createServer((req, res) => {
    let answer = worker(req,res);
    if (answer instanceof Buffer) answer=answer.toString('utf8');
    fs.writeSync(fd,(new Date()).toString()+" "+req.method+" "+req.url+"\t"+answer+"\n");
    console.log(answer);
  });

  server.listen(server_module.PORT, server_module.HOST, () => {
    //console.log(`Server running at http://${server_module.HOST}:${server_module.PORT}/`);
  });
  
  //fs.closeSync(fd);
});

