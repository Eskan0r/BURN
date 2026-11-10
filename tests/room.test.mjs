import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,mutateRoom,publicRoom,tickRoom} from '../src/room.js';
import {scoreChain} from '../src/engine.js';
const HOST='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',OTHER='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',T=1_000_000;
function waiting(){return createRoom('TEST42',HOST,'HOST',T)}
function started(bots=0){let r=waiting();r=mutateRoom(r,HOST,{type:'configure',capacity:3,bots},T);return mutateRoom(r,HOST,{type:'start',seed:'ROOM-TEST'},T)}
function playRequest(r,id='play-1'){return {type:'action',requestId:id,heatVersion:r.heatVersion,action:{type:'play',keys:[r.players[0].run.hand[0].key]}}}

test('host alone configures and starts; seat limits and kit validation enforced',()=>{
 let r=waiting();assert.throws(()=>mutateRoom(r,OTHER,{type:'join',name:'OTHER'},T),/seats/);
 r=mutateRoom(r,HOST,{type:'configure',capacity:3,bots:0},T);r=mutateRoom(r,OTHER,{type:'join',name:'OTHER'},T);
 assert.throws(()=>mutateRoom(r,OTHER,{type:'configure',capacity:6,bots:1},T),/host/);assert.throws(()=>mutateRoom(r,OTHER,{type:'start'},T),/host/);
 assert.throws(()=>mutateRoom(r,HOST,{type:'configure',capacity:3,bots:2},T),/seats/);assert.throws(()=>mutateRoom(r,OTHER,{type:'kit',kit:'fake'},T),/loadout/);
 r=mutateRoom(r,HOST,{type:'start'},T);assert.throws(()=>mutateRoom(r,OTHER,{type:'kit',kit:'ghost'},T),/loadout/);
});

test('public views reveal only the requesting operators run and no bearer credentials',()=>{
 let r=waiting();r=mutateRoom(r,HOST,{type:'configure',capacity:3,bots:0},T);r=mutateRoom(r,OTHER,{type:'join',name:'OTHER'},T);r=mutateRoom(r,HOST,{type:'start'},T);
 const own=publicRoom(r,OTHER,T),spectator=publicRoom(r,null,T);
 assert.equal(own.me,OTHER.slice(0,8));assert.deepEqual(own.run,r.players[1].run);assert.equal(spectator.run,null);assert.equal(spectator.isHost,false);
 for(const view of [own,spectator]){assert.ok(!JSON.stringify(view).includes(HOST));assert.ok(!JSON.stringify(view).includes(OTHER));assert.ok(view.players.every(p=>!('run'in p)&&!('token'in p)))}
});

test('idempotent play identity prevents duplicate score, uses and moves',()=>{
 const r=started(),request=playRequest(r);const once=mutateRoom(r,HOST,request,T+1000);const twice=mutateRoom(once,HOST,request,T+1001);
 assert.deepEqual(twice.players[0].run,once.players[0].run);assert.deepEqual(twice.heat,once.heat);assert.equal(twice.processed.length,1);
});

test('preview snapshot remains authoritative for 15 seconds then expires',()=>{
 const r=started(),request=playRequest(r);const chosen=r.players[0].run.hand[0];const expected=scoreChain(r.players[0].run,[chosen.key],r.snapshots.at(-1).heat);
 r.heat[chosen.id].tier='Burned';const next=mutateRoom(r,HOST,request,T+1000);assert.equal(next.players[0].run.last.score,expected.score);
 assert.throws(()=>mutateRoom(r,HOST,request,T+16000),/Heat shifted/);
});

test('play cadence and identities reject accidental double actions',()=>{
 const r=started(),once=mutateRoom(r,HOST,playRequest(r),T+1000);
 assert.throws(()=>mutateRoom(once,HOST,playRequest(once,'play-2'),T+1200),/previous chain/);
 assert.throws(()=>mutateRoom(r,HOST,{type:'action',action:{type:'pivot',keys:[]}},T),/identity/);
});

test('heat changes require stability, patched lock survives cooling, and scar follows',()=>{
 const r=started();r.heat.pretext.uses=10;tickRoom(r,T+3000);assert.equal(r.heat.pretext.tier,'Normal');
 tickRoom(r,T+12000);assert.equal(r.heat.pretext.tier,'Burned');assert.equal(r.patch,1);const lock=r.heat.pretext.burnUntil;
 r.heat.pretext.uses=.06;tickRoom(r,T+15000);assert.equal(r.heat.pretext.tier,'Burned');assert.equal(r.patch,1);
 tickRoom(r,lock+1000);tickRoom(r,lock+10000);assert.equal(r.heat.pretext.tier,'Warm');
 tickRoom(r,r.heat.pretext.scarUntil+1000);tickRoom(r,r.heat.pretext.scarUntil+10000);assert.equal(r.heat.pretext.tier,'Fresh');
});

test('transient heat spike is cancelled before the hysteresis window',()=>{
 const r=started();r.heat.pretext.uses=10;tickRoom(r,T+3000);r.heat.pretext.uses=1;tickRoom(r,T+6000);tickRoom(r,T+15000);assert.equal(r.heat.pretext.tier,'Normal');assert.equal(r.patch,0);
});

test('an Offering bypasses smoothing only for the offered card',()=>{
 let r=started();r.players[0].run.hand=[{id:'query',key:'offered'}];r.heat.query.tier='Warm';r.heat.query.uses=2;r.heat.pretext.uses=10;
 tickRoom(r,T+3000);assert.equal(r.heat.pretext.tier,'Normal');
 r=mutateRoom(r,HOST,{type:'action',requestId:'offering-isolation',heatVersion:r.heatVersion,action:{type:'play',keys:['offered'],offering:'offered'}},T+3100);
 assert.equal(r.heat.pretext.tier,'Normal');assert.equal(r.heat.query.tier,'Burned');assert.equal(r.patch,1);
});

test('bots advance once at their cadence even with repeated actor polls',()=>{
 let r=started(2);r=mutateRoom(r,HOST,{type:'state'},T+12001);const logs=r.players.filter(p=>p.bot).map(p=>p.run.log.length);assert.deepEqual(logs,[1,1]);
 for(let i=0;i<5;i++)r=mutateRoom(r,HOST,{type:'state'},T+12002+i);assert.deepEqual(r.players.filter(p=>p.bot).map(p=>p.run.log.length),logs);
});

test('leaving transfers host authority and spectator cannot issue mutations',()=>{
 let r=waiting();r=mutateRoom(r,HOST,{type:'configure',capacity:3,bots:0},T);r=mutateRoom(r,OTHER,{type:'join',name:'OTHER'},T);r=mutateRoom(r,HOST,{type:'leave'},T);
 assert.equal(r.host,OTHER);assert.throws(()=>mutateRoom(r,HOST,{type:'start'},T),/not in this room/);assert.doesNotThrow(()=>mutateRoom(r,null,{type:'state',spectate:true},T));
});

test('concurrent server submissions use CAS and apply an identical action once',async()=>{
 // Each test worker has its own environment and in-memory store; never contact external Redis.
 delete process.env.UPSTASH_REDIS_REST_URL;delete process.env.UPSTASH_REDIS_REST_TOKEN;delete process.env.VERCEL;
 const {requestRoom}=await import('../server/service.mjs');
 let response=await requestRoom({type:'create',name:'CAS'});const {token}=response,code=response.room.code;
 await requestRoom({type:'configure',code,token,capacity:3,bots:0});response=await requestRoom({type:'start',code,token,seed:'CAS-TEST'});
 const initial=response.room.run,body={type:'action',code,token,requestId:'same-concurrent-request',heatVersion:response.room.heatVersion,action:{type:'play',keys:[initial.hand[0].key]}};
 const results=await Promise.all(Array.from({length:5},()=>requestRoom(body)));const final=await requestRoom({type:'state',code,token});
 assert.equal(final.room.run.log.length,1);assert.equal(final.room.run.moves,initial.moves-1);assert.ok(results.every(r=>r.room.run.totalScore===final.room.run.totalScore));
});

test('simultaneous human and spectator polls cannot double-step the same bots',async()=>{
 delete process.env.UPSTASH_REDIS_REST_URL;delete process.env.UPSTASH_REDIS_REST_TOKEN;delete process.env.VERCEL;
 const {requestRoom}=await import('../server/service.mjs');const{loadRoom,saveRoom}=await import('../server/store.mjs');
 let response=await requestRoom({type:'create',name:'BOT-CAS'});const{token}=response,code=response.room.code;
 await requestRoom({type:'start',code,token,seed:'BOT-CAS'});const stored=await loadRoom(code),previous=stored.version;
 stored.lastTick=Date.now()-13000;for(const bot of stored.players.filter(p=>p.bot))bot.lastMove=Date.now()-13000;
 stored.version++;assert.equal(await saveRoom(stored,previous),true);
 await Promise.all(Array.from({length:5},(_,i)=>requestRoom(i%2?{type:'state',code,token}:{type:'state',code,spectate:true})));
 const after=await loadRoom(code);assert.deepEqual(after.players.filter(p=>p.bot).map(p=>p.run.log.length),[1,1]);
});
