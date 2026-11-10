import {createRoom,mutateRoom,publicRoom} from '../src/room.js';
import {loadRoom,saveRoom,newCode,newToken,storageMode} from './store.mjs';
export async function requestRoom(body){
 if(!body||typeof body!=='object'||Array.isArray(body))throw new Error('Invalid request.');if(body.type==='health')return {ok:true,storage:storageMode()};
 let token=typeof body.token==='string'&&/^[a-f0-9-]{36}$/.test(body.token)?body.token:null;
 if(body.type==='create'){token=newToken();for(let i=0;i<4;i++){const code=newCode(),room=createRoom(code,token,body.name,Date.now());if(await saveRoom(room,-1))return {token,room:publicRoom(room,token,Date.now()),storage:storageMode()}}throw new Error('Could not reserve a room. Please try again.')}
 const code=String(body.code||'').toUpperCase();if(!/^[A-Z0-9]{6}$/.test(code))throw new Error('Room codes have six letters or numbers.');if(body.type==='join'&&!token)token=newToken();if(!token&&!(body.type==='state'&&body.spectate))throw new Error('Your session has expired. Join the room again.');
 for(let i=0;i<7;i++){const current=await loadRoom(code);if(!current)throw new Error('Room not found. It may have expired.');const next=mutateRoom(current,token,body,Date.now());next.version=current.version+1;if(await saveRoom(next,current.version))return {token,room:publicRoom(next,token,Date.now()),storage:storageMode()}}
 throw new Error('The room is busy. Please try again.');
}
