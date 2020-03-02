const { spawn } = require('child_process');
const process = require('process');
const {dirname, basename}=require('./util');
const server_module=require('./server_module');


let nodePath = process.argv[0];
let appPath = process.argv[1];
let scriptName = basename(appPath);
let path=appPath.substr(0, appPath.length-scriptName.length); // C:\project\server\


console.log('start. params:', process.argv.length);


console.log(`Current directory: ${process.cwd()}`);
console.log("nodePath: " + nodePath);
console.log("scriptPath: " + path);
console.log("appPath: " + appPath +"\n");

/** Start the http server on the command line with parameters and return the Promise.
 * Promise success - successful comparison of the response, failure - no correct response after the time interval.
 *  - if the response is equal to answerData call resolve(receivedData, attempt Number);
 *  - if the waiting time is exceeded and the response did not come or was not found equal to answerData call resolve(receivedData, attempt number);
 * @param {string|Buffer} answerData Data expected from the client
 * @param {type} params command line options for starting the server
 * @return {Promise} */
async function run_server(answerData, params) {
  const TIMEOUT = 10;
  //console.log(answerData, typeof answerData);
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
      let receivedBuf = Buffer.from(data), answerBuf=Buffer.from(answerData);
      
      //equals set answer == start received (without "\n" at end)
      if (0 == answerBuf.compare(receivedBuf, 0, answerBuf.length)) {
        clearTimeout(tProc);
        subprocess.kill();
        resolve(data, attempt);
      }
    });
  });  
}

async function run(){
  const PORT=3000;
  let encode_list =['none'];
  for(let i=0; i<server_module.options.support_encode.length; i++) encode_list.push(server_module.options.support_encode[i]);
  let auth_list=['none'];
  for(let i=0; i<server_module.options.support_auth.length; i++) auth_list.push(server_module.options.support_auth[i]);
  console.log('encode_list', encode_list);
  console.log('auth_list', auth_list);
  for(let eIdx=0; eIdx<encode_list.length; eIdx++) {
    for(let aIdx=0; aIdx<auth_list.length; aIdx++) {
      try{
        const params = [ PORT, encode_list[eIdx], auth_list[aIdx] ];
        console.log(params);
        let run_def=await run_server(server_module.options.answer, params);
      }catch(e){
        console.error(e);
      }
    }
  }
  
}
run();



//console.log(subprocess)