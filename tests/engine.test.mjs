import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS,CARD,RIGS,CHAINS} from '../src/data.js';
import {createRun,createHeat,scoreChain,applyAction,chainType,effectiveRigs,marketPrice,quota,setupBreach,bestChain} from '../src/engine.js';

const heat=()=>createHeat();
function fixture(ids,changes={}){
 const run=createRun('TEST-SEED','ghost');
 run.deck=CARDS.map((c,i)=>({id:c.id,key:`deck${i}`}));
 run.hand=ids.map((id,i)=>({id,key:`hand${i}`}));run.rigs=[];run.history=[];
 Object.assign(run,changes);return run;
}
const score=(r,h=heat(),offering=null)=>scoreChain(r,r.hand.map(c=>c.key),h,offering);
const event=(s,id)=>s.events.find(e=>e.label===id);
const cardList=ids=>ids.map(id=>CARD[id]);

test('all seven chain types and wildcard constraints',()=>{
 const cases=[['Probe',['pretext']],['Echo',['pretext','badge']],['Ladder',['pretext','query','slide']],['Trinity',['pretext','badge','whisper']],['Kill Chain',['pretext','query','slide','firmware']],['Monoculture',['badge','pretext','whisper','gala']],['Perfect Ladder',['pretext','spearphish','badge','gala']]];
 assert.deepEqual(new Set(cases.map(x=>x[0])),new Set(Object.keys(CHAINS)));
 for(const [type,ids]of cases)assert.equal(chainType(cardList(ids)),type);
 assert.equal(chainType(cardList(['crawl','query','ghost','session'])),'Perfect Ladder');
 assert.equal(chainType(cardList(['pretext','vendor','slide','firmware'])),'Kill Chain');
 assert.equal(chainType(cardList(['pretext','vendor','query','firmware'])),'Probe');
 assert.equal(chainType(cardList(['pretext','query','slide','firmware']),['Burned','Normal','Normal','Normal']),'Probe');
 assert.equal(chainType(cardList(['pretext','query','slide','firmware']),['Normal','Normal','Normal','Burned']),'Kill Chain');
});

test('all 30 cards produce finite scores without mutating run or heat',()=>{
 for(const c of CARDS){const r=fixture([c.id]),h=heat(),before=structuredClone({r,h});const s=score(r,h);assert.ok(Number.isFinite(s.score)&&s.score>=0,c.id);assert.equal(s.executions[0].id,c.id);assert.deepEqual({r,h},before)}
});

test('SOCIAL effects: draw, setup, cooling, wild class, minimum double, credits',()=>{
 assert.equal(score(fixture(['pretext'])).draw,1);
 assert.equal(score(fixture(['pretext','spearphish'])).executions[1].payload,40);
 assert.equal(score(fixture(['spearphish','pretext'])).executions[0].payload,20);
 assert.equal(score(fixture(['badge'])).noise,0);
 assert.equal(score(fixture(['crawl','query','ghost'])).dominant,'WEB');
 assert.equal(score(fixture(['pretext','spearphish','whisper'])).payload,12+40+32+12);
 assert.equal(score(fixture(['gala'])).credits,3);
});

test('WEB effects: recon, positional mult, hand bonus, loud, copy, noise',()=>{
 assert.equal(score(fixture(['crawl','query'])).executions[1].payload,44);
 assert.equal(event(score(fixture(['crawl','query'])),'Malformed Query').value,3);
 assert.equal(event(score(fixture(['query','crawl'])),'Malformed Query'),undefined);
 const r=fixture(['cookie','pretext','seed']);assert.equal(scoreChain(r,['hand0'],heat()).payload,40);
 assert.equal(score(fixture(['spill'],{trace:40})).payload,108);
 assert.equal(score(fixture(['pretext','session'])).executions[1].payload,59);
 const red=score(fixture(['query','deface']));assert.equal(red.noise,36);assert.equal(event(red,'Red Screen').value,5);
});

test('NETWORK effects: pivots, next-card silence, network mult, relay, diversity, cooling',()=>{
 assert.equal(score(fixture(['port'],{pivotsUsed:3})).payload,49);
 assert.equal(score(fixture(['tunnel','deface'])).noise,5); // The next card makes no noise, including its own additional effect.
 assert.equal(event(score(fixture(['port','slide','pulse'])),'Lateral Slide').value,4);
 assert.equal(score(fixture(['relay'])).nextMarker,4);
 assert.equal(score(fixture(['pretext','query','backbone'])).executions[2].payload,120);
 assert.equal(score(fixture(['pulse'],{trace:50})).trace,38);
});

test('SUPPLY effects: permanent growth, infection, rot, heat immunity, accumulated mult',()=>{
 assert.equal(score(fixture(['typo'])).growth.typo,8);
 const infected=score(fixture(['poison']));assert.equal(infected.credits,1);assert.equal(infected.progressBonus,100);
 const rot=score(fixture(['rot']));for(const c of CARDS.filter(c=>c.cls==='SUPPLY'))assert.equal(rot.growth[c.id],4);
 const h=heat();h.firmware.tier='Burned';assert.equal(score(fixture(['firmware']),h).payload,37);
 assert.equal(event(score(fixture(['update'],{supplyPlayed:3})),'Update Server').value,4);
});

test('IMPLANT effects: Persist growth, shell setup, final-move bomb, eternal multiplier',()=>{
 for(const id of ['seed','registry','process']){const s=score(fixture([id]));assert.deepEqual(s.persist,['hand0']);assert.equal(s.growth[id],8)}
 assert.equal(score(fixture(['seed','rootkit'])).executions[1].payload,68);
 assert.equal(score(fixture(['rootkit','seed'])).executions[0].payload,34);
 assert.equal(score(fixture(['bomb'],{moves:1})).payload,140);
 assert.equal(score(fixture(['bomb'],{moves:2})).payload,28);
 assert.equal(event(score(fixture(['seed','eternal'])),'Eternal Foothold').value,1.5);
 assert.equal(event(score(fixture(['pretext','eternal'])),'Eternal Foothold'),undefined);
});

test('all heat tiers change payload and only Hot adds base noise',()=>{
 for(const[tier,factor,extra]of [['Fresh',1.3,0],['Normal',1,0],['Warm',.85,0],['Hot',.65,10],['Burned',.25,0]]){
  const h=heat();h.gala.tier=tier;const s=score(fixture(['gala']),h);assert.equal(s.payload,Math.round(48*factor));assert.equal(s.noise,16+extra);
 }
});

test('rig additive effects: mask, hammer and dependency tree',()=>{
 assert.equal(event(score(fixture(['pretext'],{rigs:['mask'],trace:40})),'Ski Mask').value,4);
 const hammer=score(fixture(['pretext','query'],{rigs:['hammer']}));assert.equal(hammer.payload,12+24+70);assert.equal(hammer.noise,22);
 assert.equal(event(score(fixture(['pretext'],{rigs:['tree']})),'Dependency Tree').value,6);
});

test('rig conditions: quiet, compound, cold, contrarian, battery and stairway',()=>{
 assert.equal(event(score(fixture(['pretext'],{rigs:['quiet']})),'Quiet Hours').value,2.2);
 assert.equal(event(score(fixture(['deface'],{rigs:['quiet']})),'Quiet Hours'),undefined);
 assert.equal(event(score(fixture(['pretext'],{rigs:['compound'],cleared:3})),'Compound Interest').value,1.35**3);
 const h=heat();h.pretext.tier='Fresh';assert.equal(score(fixture(['pretext'],{rigs:['cold']}),h).payload,24);
 assert.equal(event(score(fixture(['pretext','query','slide'],{rigs:['contrarian']})),'Contrarian').value,2.5);
 assert.equal(event(score(fixture(['pretext'],{rigs:['battery'],trace:40})),'Blood Battery').value,3);
 assert.equal(event(score(fixture(['pretext'],{rigs:['battery'],trace:39})),'Blood Battery'),undefined);
 assert.equal(event(score(fixture(['pretext','query','slide'],{rigs:['staircase']})),'Stairway').value,1.4**2);
});

test('retrigger rigs compose without recursively retriggering each other',()=>{
 const r=fixture(['typo'],{rigs:['fork','carbon','afterimage','feedback','spore']});const s=score(r);
 assert.equal(s.retriggers,5);assert.equal(s.executions.length,6);assert.equal(s.payload,10+6+8+8+8+8);
 assert.equal(s.growth.typo,6*13);assert.equal(s.credits,0);
 assert.equal(s.events.find(e=>e.label.startsWith('Feedback Loop')).value,1.3**5);
 const poison=score(fixture(['poison'],{rigs:['fork','carbon']}));assert.equal(poison.credits,4);assert.equal(poison.progressBonus,400);
});

test('Offering, potato, arson and martyr have bounded independent rewards',()=>{
 const h=heat();h.pretext.tier='Warm';h.query.tier='Hot';
 const r=fixture(['pretext','query'],{rigs:['potato','arson','martyr'],offerings:2});const s=score(r,h,'hand1');
 assert.equal(s.offering,'query');assert.equal(s.retriggers,2);assert.equal(s.credits,3);assert.equal(s.noise,2);
 assert.equal(s.events.find(e=>e.label.startsWith('Hot Potato')).value,2.25);
 assert.equal(s.events.find(e=>e.label.startsWith('Arsonist')).value,1.4);
 assert.equal(event(s,'Offering').value,2.5);
 assert.throws(()=>score(fixture(['pretext']),heat(),'hand0'),/Warm or Hot/);
});

test('forecast counters, Feint protection and Looking Glass replacement',()=>{
 const r=fixture(['pretext'],{history:Array(8).fill('SOCIAL')});assert.equal(score(r).verdict,'COUNTERED');
 r.rigs=['feint'];assert.equal(score(r).verdict,'UNDETECTED');r.turn=1;assert.equal(score(r).verdict,'COUNTERED');
 r.rigs=['reflect'];assert.equal(score(r).predictionFactor,2);assert.equal(score(r).verdict,'REFLECTED');
});

test('Mirror copies the immediate left rig once and never copies a Mirror',()=>{
 const r=fixture(['pretext'],{rigs:['quiet','mirror','mirror']});assert.deepEqual(effectiveRigs(r).map(r=>r.id),['quiet','quiet']);
 assert.equal(score(r).mult,2.2**2);assert.equal(effectiveRigs({...r,rigs:['mirror']}).length,0);
});

test('every published rig ID has explicit scoring coverage',()=>{
 assert.deepEqual(new Set(RIGS.map(r=>r.id)),new Set(['mask','quiet','hammer','fork','tree','compound','spore','cold','contrarian','potato','arson','martyr','feint','reflect','carbon','feedback','afterimage','staircase','mirror','battery']));
});

test('Persist returns an instance once per breach, then discards it',()=>{
 let r=fixture(['seed'],{drawPile:[],discard:[],rigs:[],moves:4});r.deck=[...r.hand];
 r=applyAction(r,{type:'play',keys:['hand0']},heat());assert.ok(r.hand.some(c=>c.key==='hand0'));assert.equal(r.growth.seed,8);
 r=applyAction(r,{type:'play',keys:['hand0']},heat());assert.equal(r.persisted.length,1);assert.equal(r.growth.seed,8);
 // The discard may immediately reshuffle into hand; persisted identity still prevents a second free return.
 assert.deepEqual(scoreChain(r,['hand0'],heat()).persist,[]);
 setupBreach(r);assert.deepEqual(r.persisted,[]);
});

test('quota clears before simultaneous trace or final-move failure',()=>{
 const r=fixture(['pretext'],{progress:599,trace:99,moves:1});const next=applyAction(r,{type:'play',keys:['hand0']},heat());
 assert.equal(next.status,'market');assert.equal(next.integrity,3);assert.equal(next.trace,101);
});

test('failure loses integrity, retries with a scar, then skips without a reward',()=>{
 let r=fixture(['pretext'],{moves:1});r=applyAction(r,{type:'play',keys:['hand0']},heat());assert.equal(r.status,'failed');assert.equal(r.integrity,2);
 r=applyAction(r,{type:'retry'},heat());assert.equal(r.retry,1);assert.equal(quota(r),660);r.hand=[{id:'pretext',key:'retry'}];r.moves=1;
 r=applyAction(r,{type:'play',keys:['retry']},heat());assert.equal(r.integrity,1);const credits=r.credits;
 r=applyAction(r,{type:'retry'},heat());assert.equal(r.breach,1);assert.equal(r.retry,0);assert.equal(r.credits,credits);
 r.hand=[{id:'pretext',key:'final'}];r.moves=1;r=applyAction(r,{type:'play',keys:['final']},heat());assert.equal(r.status,'lost');assert.equal(r.integrity,0);
 assert.throws(()=>applyAction(r,{type:'retry'},heat()),/No retry/);
});

test('market prices are server-calculated and patched cards cannot be purchased',()=>{
 const offer={kind:'card',id:'pretext',price:3};const h=heat();
 for(const[tier,price]of[['Fresh',4],['Normal',3],['Hot',3],['Burned',Infinity]]){h.pretext.tier=tier;assert.equal(marketPrice(offer,h),price)}
 const r=fixture([],{status:'market',credits:10,market:{offers:[offer],removals:0,rerolls:0}});h.pretext.tier='Normal';
 const bought=applyAction(r,{type:'buy',index:0,price:-1000},h);assert.equal(bought.credits,7);assert.equal(bought.deck.length,r.deck.length+1);assert.throws(()=>applyAction(bought,{type:'buy',index:0},h),/sold/);
 h.pretext.tier='Burned';assert.throws(()=>applyAction(r,{type:'buy',index:0},h),/credits|patched/i);
});

test('malformed market indices cannot corrupt the ledger or object prototypes',()=>{
 const r=fixture([],{status:'market',credits:10,market:{offers:[{kind:'card',id:'pretext',price:3}],removals:0,rerolls:0}});
 for(const index of ['__proto__','constructor','0',[],{},-1,.5,100]){
  try{assert.throws(()=>applyAction(r,{type:'buy',index},heat()),undefined,JSON.stringify(index))}
  finally{delete Array.prototype.sold}
 }
 assert.equal(Array.prototype.sold,undefined);assert.equal(r.credits,10);
});

test('invalid, duplicate and foreign hand keys are rejected',()=>{
 const r=fixture(['pretext','query']);for(const keys of [[],['hand0','hand0'],['foreign'],Array(5).fill('hand0'),null])assert.throws(()=>scoreChain(r,keys,heat()));
 assert.throws(()=>applyAction(r,{type:'pivot',keys:['hand0','hand0']},heat()));
});

test('same seed and recorded actions replay to identical complete state',()=>{
 let a=createRun('REPLAY-42','ghost'),b=createRun('REPLAY-42','ghost');const h=heat();assert.deepEqual(a,b);
 const actions=[];for(let i=0;i<10;i++){let action;if(a.status==='playing')action={type:'play',keys:bestChain(a,h).keys};else if(a.status==='market'){const index=a.market.offers.findIndex(o=>o.kind==='rig'&&o.price<=a.credits);action=index>=0&&a.rigs.length<5?{type:'buy',index}:{type:'continue'}}else if(a.status==='failed')action={type:'retry'};else break;actions.push(action);a=applyAction(a,action,h)}
 for(const action of actions)b=applyAction(b,action,h);assert.deepEqual(a,b);
});

test('boss rules apply known-card penalty, reflected noise and WARDEN phases',()=>{
 assert.equal(score(fixture(['pretext'],{breach:2,previousIds:['pretext']})).payload,9);
 assert.equal(score(fixture(['pretext','badge'],{breach:5})).noise,0);
 assert.equal(score(fixture(['port','slide'],{breach:5})).noise,20);
 assert.equal(score(fixture(['seed'],{breach:6})).verdict,'COUNTERED');
 const h=heat();h.gala.tier='Hot';assert.equal(score(fixture(['gala'],{breach:8,moves:4}),h).tiers[0],'Burned');
 assert.equal(score(fixture(['pretext'],{breach:8,moves:2,played:{pretext:4,query:3,gala:2,rot:1}})).payload,9);
});
