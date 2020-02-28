const { spawn } = require('child_process');
const process = require('process');
const {dirname, basename}=require('./util');
const server_module=require('./server_module');


let nodePath = process.argv[0];
let appPath = process.argv[1];
let script = basename(appPath); // a
let path=appPath.substr(0, appPath.length-script.length); // C:\project\server\


console.log('start');


console.log(`Current directory: ${process.cwd()}`);
console.log("nodePath: " + nodePath);
console.log("scriptPath: " + path);
console.log("appPath: " + appPath +"\n");


async function run_server(answer, params) {
  const TIMEOUT = 10;
  console.log(answer, typeof answer);
  let process_param = ('undefined' == typeof params)?[]:params.map((v)=>v);
  //console.log(process_param,  process_param instanceof Array);
  process_param.unshift(path+'server');

  return new Promise((resolve, reject)=>{
    console.log(`Start timeout ${TIMEOUT}s default server`);
    let subprocess = spawn("node", process_param, {cwd:dirname(appPath)});
    let tProc= setTimeout(() => {
      subprocess.kill(); // Does not terminate the Node.js process in the shell.
      reject('answer failed');
    }, 1000*TIMEOUT);
    let attempt=0;
    subprocess.stdout.on('data', (data) => {
      attempt++;
      console.log(`\t${attempt}. stdout: ${data}`);
      console.log('data', Buffer.from(data));
      console.log('answer', Buffer.from(answer));
      if (answer == data) {
        clearTimeout(tProc);
        subprocess.kill();
        resolve(data, attempt);
      }
    });
  });  
}

async function run(){
  try{
    let run_def=await run_server(server_module.options.answer);
  }catch(e){
    console.error(e);
  }
}
run();



//console.log(subprocess)