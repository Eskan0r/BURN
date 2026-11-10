// Deterministic exhaustive-chain policy. This is a balance probe, not a human win-rate estimate.
import fs from 'node:fs';
import {CARDS,CARD,KITS,RIG} from '../src/data.js';
import {createRun,createHeat,scoreChain,applyAction,bestChain,marketPrice,quota,hash} from '../src/engine.js';
const samples=Math.max(1,Math.min(100,Number(process.env.BALANCE_SAMPLES)||5));
const heat=createHeat();
const preferences={ghost:['feedback','afterimage','fork','carbon','quiet','mirror','mask','staircase'],hammer:['feedback','fork','carbon','battery','staircase','mirror','hammer','reflect'],gardener:['feedback','fork','carbon','spore','compound','tree','mirror'],arsonist:['feedback','fork','carbon','battery','reflect','martyr','potato','arson'],mimic:['feedback','carbon','fork','staircase','mirror','contrarian','feint']};
function rank(kit,id){const i=preferences[kit].indexOf(id);return i<0?0:20-i*2}
function market(run){
 const rigOffers=run.market.offers.map((o,index)=>({o,index})).filter(({o})=>o.kind==='rig'&&!o.sold&&marketPrice(o,heat)<=run.credits).sort((a,b)=>rank(run.kit,b.o.id)-rank(run.kit,a.o.id));
 for(const{o,index}of rigOffers){if(run.rigs.length<5)return applyAction(run,{type:'buy',index},heat);const worst=run.rigs.map((id,i)=>({id,i,value:rank(run.kit,id)})).sort((a,b)=>a.value-b.value)[0];if(rank(run.kit,o.id)>worst.value){run=applyAction(run,{type:'sell',index:worst.i},heat);return applyAction(run,{type:'buy',index},heat)}}
 const cls=KITS.find(k=>k.id===run.kit).cls;
 const card=run.market.offers.findIndex(o=>o.kind==='card'&&!o.sold&&CARD[o.id].cls===cls&&marketPrice(o,heat)<=run.credits&&run.deck.length<25);
 if(card>=0)return applyAction(run,{type:'buy',index:card},heat);
 const book=run.market.offers.findIndex(o=>o.kind==='book'&&!o.sold&&o.price<=run.credits&&['Trinity','Perfect Ladder','Monoculture','Kill Chain'].includes(o.id));
 if(book>=0)return applyAction(run,{type:'buy',index:book},heat);
 if(run.credits>=9&&run.market.rerolls<2)return applyAction(run,{type:'reroll'},heat);
 return applyAction(run,{type:'continue'},heat);
}
function limitedChain(run,step){
 let rng=hash(`${run.seed}:${step}`),best=null;const next=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296};
 function consider(cards){if(!cards.length)return;const keys=cards.map(c=>c.key),score=scoreChain(run,keys,heat),value=score.score-(score.trace>=100&&run.progress+score.score<quota(run)?1e10:0);if(!best||value>best.value)best={keys,score,value}}
 for(const card of run.hand)consider([card]);
 for(const cls of new Set(run.hand.map(c=>CARD[c.id].cls)))consider(run.hand.filter(c=>CARD[c.id].cls===cls).sort((a,b)=>CARD[a.id].stage-CARD[b.id].stage).slice(0,4));
 consider([...run.hand].sort((a,b)=>CARD[a.id].stage-CARD[b.id].stage).slice(0,4));
 for(let i=0;i<24;i++){const pool=[...run.hand],cards=[];while(cards.length<Math.min(4,run.hand.length))cards.push(pool.splice(Math.floor(next()*pool.length),1)[0]);consider(cards)}
 return best;
}
function simulate(kit,seed,mode='descent',policy='exhaustive'){
 let run=createRun(seed,kit,mode),steps=0;
 while(!['won','lost'].includes(run.status)&&steps++<220){
  if(run.status==='market'){run=market(run);continue}if(run.status==='failed'){run=applyAction(run,{type:'retry'},heat);continue}
  let best=policy==='exhaustive'?bestChain(run,heat):limitedChain(run,steps);
  if(run.pivots>0&&best.score.score*run.moves<quota(run)-run.progress){const keep=new Set(best.keys);let keys=run.hand.filter(c=>!keep.has(c.key)).map(c=>c.key).slice(0,5);if(!keys.length)keys=best.keys.slice(0,2);run=applyAction(run,{type:'pivot',keys},heat);best=policy==='exhaustive'?bestChain(run,heat):limitedChain(run,steps+1000)}
  run=applyAction(run,{type:'play',keys:best.keys},heat);
 }
 return {seed,kit,mode,policy,status:run.status,breach:run.breach+1,cleared:run.cleared,best:run.best,total:run.totalScore,rigs:run.rigs,integrity:run.integrity,steps};
}
function showcase(name,ids,rigs,changes={},heated=[]){
 const run=createRun('SHOWCASE',changes.kit||'ghost');run.hand=ids.map((id,i)=>({id,key:`show${i}`}));run.deck=CARDS.map((c,i)=>({id:c.id,key:`deck${i}`}));run.rigs=rigs;run.history=[];Object.assign(run,changes);
 const h=createHeat();for(const id of heated)h[id].tier='Warm';const score=scoreChain(run,run.hand.map(c=>c.key),h,heated.length?run.hand.find(c=>c.id===heated[0]).key:null);
 return {name,cards:ids,rigs,score:score.score,payload:score.payload,mult:Number(score.mult.toFixed(3)),noise:score.noise,chain:score.type,retriggers:score.retriggers,assumptions:changes};
}
const showcases=[
 showcase('Ghost replay engine',['seed','registry','rootkit','eternal'],['afterimage','fork','carbon','feedback','mirror'],{growth:{seed:32,registry:32,rootkit:20},books:{'Perfect Ladder':2}}),
 showcase('Gardener compound growth',['typo','poison','rot','update'],['spore','fork','carbon','feedback','compound'],{kit:'gardener',cleared:7,growth:{typo:150,poison:100,rot:100,update:100},supplyPlayed:8,books:{'Perfect Ladder':2}}),
 showcase('Arsonist heated offering',['port','tunnel','slide','pulse'],['potato','arson','martyr','feedback','battery'],{kit:'arsonist',trace:45,offerings:5,books:{'Perfect Ladder':2}},['port','tunnel','slide','pulse']),
];
console.log('Constructed late-run synergies (not seeded playthrough claims):');for(const result of showcases)console.log(JSON.stringify(result));
const results=[];
const summaries=[];
for(const policy of ['exhaustive','limited'])for(const kit of KITS){for(let i=0;i<samples;i++)results.push(simulate(kit.id,`BALANCE-${i}`,'descent',policy));const group=results.filter(r=>r.kit===kit.id&&r.policy===policy),scores=group.map(r=>r.best).sort((a,b)=>a-b);const summary={policy,kit:kit.id,runs:group.length,wins:group.filter(r=>r.status==='won').length,meanBreaches:Number((group.reduce((s,r)=>s+r.cleared,0)/group.length).toFixed(2)),bestMin:scores[0],bestMedian:scores[Math.floor(scores.length/2)],bestMax:scores.at(-1),distinctFinalRacks:new Set(group.map(r=>[...r.rigs].sort().join(','))).size};summaries.push(summary);console.log(JSON.stringify(summary))}
const sprint=KITS.map(k=>simulate(k.id,'DEMO-SPRINT','sprint'));console.log('Sprint:',JSON.stringify(sprint.map(r=>({kit:r.kit,status:r.status,best:r.best}))));
const report={generated:new Date().toISOString(),method:'Frozen Normal heat; two greedy policies: exhaustive all ordered chains of up to four cards, and limited search of singles, same-class ascending chains, plus 24 seeded random four-card candidates. Both buy matching rigs and cards, and reroll markets up to twice. Automated deterministic samples, not human win-rate estimates. Showcase states are explicitly constructed late-run builds.',samplesPerKitPerPolicy:samples,showcases,summaries,results,sprint};
fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/balance-report.json',JSON.stringify(report,null,2));
