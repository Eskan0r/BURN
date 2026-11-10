import {spawn} from 'node:child_process';
let api,client,stopping=false,buffer='';
function stop(code=0){if(stopping)return;stopping=true;process.exitCode=code;if(api&&!api.killed)api.kill();if(client&&!client.killed)client.kill()}
function startClient(port){if(client||stopping)return;client=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1'],{stdio:'inherit',env:{...process.env,BURN_API_PORT:port}});client.on('error',error=>{console.error(`BURNED client failed to start: ${error.message}`);stop(1)});client.on('exit',code=>stop(code??0))}
api=spawn(process.execPath,['server/local.mjs'],{stdio:['inherit','pipe','inherit'],env:{...process.env,BURN_API_PORT:'0'}});
api.stdout.setEncoding('utf8');
api.stdout.on('data',chunk=>{process.stdout.write(chunk);buffer+=chunk;const match=buffer.match(/(?:^|\n)BURNED_API_PORT=(\d+)(?:\n|$)/);if(match)startClient(match[1]);buffer=buffer.slice(-128)});
api.on('error',error=>{console.error(`BURNED room server failed to start: ${error.message}`);stop(1)});
api.on('exit',code=>{if(!stopping)stop(code??1)});
process.on('SIGINT',()=>stop(0));
process.on('SIGTERM',()=>stop(0));
