import http from 'node:http';
import {requestRoom} from './service.mjs';
const server=http.createServer(async(req,res)=>{res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');if(req.url?.split('?')[0]!=='/api/room'){res.writeHead(404);res.end(JSON.stringify({error:'Not found'}));return}if(req.method!=='POST'){res.writeHead(405);res.end(JSON.stringify({error:'Use POST'}));return}let raw='';try{for await(const chunk of req){raw+=chunk;if(raw.length>16384){res.writeHead(413);res.end(JSON.stringify({error:'Request too large'}));return}}const result=await requestRoom(JSON.parse(raw));res.writeHead(200);res.end(JSON.stringify(result))}catch(error){res.writeHead(400);res.end(JSON.stringify({error:error.message}))}});
const port=process.env.BURN_API_PORT===undefined?3002:Number(process.env.BURN_API_PORT);
server.on('error',error=>{console.error(`BURNED room server could not listen on 127.0.0.1:${port}: ${error.message}`);process.exitCode=1});
server.listen(port,'127.0.0.1',()=>{const address=server.address();process.stdout.write(`BURNED room server listening on http://127.0.0.1:${address.port}\nBURNED_API_PORT=${address.port}\n`)});
