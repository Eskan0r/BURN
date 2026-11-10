import {CARDS,CARD,RIG,RIGS,KITS,CLASSES,CHAINS,BREACHES,TIERS} from './data.js';

export const clone=o=>structuredClone(o);
export const hash=s=>{let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0};
export function random(state){state.rng=(state.rng+0x6D2B79F5)>>>0;let t=state.rng;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}
export function shuffle(a,state){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(random(state)*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
export function createHeat(){return Object.fromEntries(CARDS.map(c=>[c.id,{uses:1,index:1,tier:'Normal',burnUntil:0,scarUntil:0,everBurned:false}]))}
export function forecast(run,heat){const history=Object.fromEntries(CLASSES.map(c=>[c,0]));let hw=0;run.history.slice(-8).forEach((c,i)=>{history[c]+=i+1;hw+=i+1});const usage=CLASSES.map(c=>CARDS.filter(a=>a.cls===c).reduce((s,a)=>s+(heat[a.id]?.uses??1),0));const total=usage.reduce((a,b)=>a+b,0)||1;return Object.fromEntries(CLASSES.map((c,i)=>[c,.5*(hw?history[c]/hw:1/5)+.3*usage[i]/total+.2*run.deck.filter(x=>CARD[x.id].cls===c).length/run.deck.length]))}
function validStages(cards){let last=0;for(const c of cards){const s=c.effect==='wildStage'?last+1:c.stage;if(s<=last||s>5)return false;last=s}return true}
export function chainType(cards,tiers=[]){if(!cards.length)return 'Probe';const classes=new Set(cards.filter(c=>c.effect!=='wildClass').map(c=>c.cls));const same=classes.size<=1;const rising=validStages(cards)&&!cards.some((c,i)=>tiers[i]==='Burned'&&c.effect!=='immune');if(cards.length===4){if(same&&rising)return 'Perfect Ladder';if(same)return 'Monoculture';if(rising)return 'Kill Chain'}if(cards.length===3){if(same)return 'Trinity';if(rising)return 'Ladder'}if(cards.length===2&&same)return 'Echo';return 'Probe'}
export function effectiveRigs(run){const out=[];run.rigs.forEach((id,i)=>{if(id==='mirror'){const left=run.rigs[i-1];if(left&&left!=='mirror')out.push({id:left,label:`Mirror → ${RIG[left].name}`})}else out.push({id,label:RIG[id].name})});return out}
export function quota(run){return Math.round(BREACHES[run.breach].quota*(run.retry?1.1:1))}
export function phase(run){return run.breach===8?Math.min(3,Math.floor((6-run.moves)/2)+1):0}
export function scoreChain(run,keys,heat,offering=null){
 if(!Array.isArray(keys)||keys.length<1||keys.length>4||new Set(keys).size!==keys.length)throw new Error('Select 1–4 different cards from your hand.');
 const instances=keys.map(k=>run.hand.find(c=>c.key===k));if(instances.some(c=>!c))throw new Error('That card is not in your hand.');
 const cards=instances.map(x=>CARD[x.id]);const tiers=cards.map(c=>c.effect==='immune'?'Normal':phase(run)===2&&['Hot','Burned'].includes(heat[c.id]?.tier)?'Burned':heat[c.id]?.tier||'Normal');
 if(offering&&!keys.includes(offering))throw new Error('Your Offering must be in this chain.');
 const oi=keys.indexOf(offering);if(oi>=0&&!['Warm','Hot'].includes(tiers[oi]))throw new Error('Only Warm or Hot cards can be offered.');
 const rigs=effectiveRigs(run),has=id=>rigs.filter(r=>r.id===id).length;
 const wildTarget=cards.filter(c=>c.effect!=='wildClass').sort((a,b)=>cards.filter(x=>x.cls===b.cls).length-cards.filter(x=>x.cls===a.cls).length||b.payload-a.payload)[0]?.cls||'SOCIAL';
 const classes=cards.map(c=>c.effect==='wildClass'?wildTarget:c.cls);const distinct=new Set(classes).size;
 const dominant=[...new Set(classes)].sort((a,b)=>classes.filter(c=>c===b).length-classes.filter(c=>c===a).length||Math.max(...cards.filter((_,i)=>classes[i]===b).map(c=>c.payload))-Math.max(...cards.filter((_,i)=>classes[i]===a).map(c=>c.payload)))[0];
 const type=chainType(cards,tiers),level=run.books[type]||0;
 let payload=level*20,mult=CHAINS[type]+level*2+run.marker,noise=0,credits=0,draw=0,nextMarker=0,progressBonus=0,retriggers=0,cooling=0;
 const events=[],values=[],growth={},persist=[],executions=[];
 const add=(label,value,kind='mult')=>{events.push({label,value,kind});if(kind==='mult')mult+=value;else if(kind==='xmult')mult*=value;else if(kind==='payload')payload+=value};
 events.push({label:`${type}${level?` Lv.${level+1}`:''}`,value:mult,kind:'base'});
 const known=run.breach===2?run.previousIds:phase(run)===3?Object.entries(run.played).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([id])=>id):[];
 cards.forEach((c,i)=>{
  let v=c.payload+(run.growth[c.id]||0)+(growth[c.id]||0);v*=TIERS[tiers[i]].factor;if(tiers[i]==='Fresh'&&has('cold'))v*=Math.pow(2/1.3,has('cold'));
  if(known.includes(c.id))v*=.75;
  if(i>0&&cards[i-1].effect==='recon')v+=20;
  if(c.effect==='setup'&&cards.slice(0,i).some(a=>a.stage===1))v*=2;
  if(c.effect==='hand')v+=Math.max(0,run.hand.length-cards.length)*5;
  if(c.effect==='loud'&&run.trace>=40)v*=3;
  if(c.effect==='copyPrevious'&&i>0)v+=values[i-1]*2;
  if(c.effect==='pivot')v+=run.pivotsUsed*12;
  if(c.effect==='diversity')v*=distinct;
  if(c.effect==='shell'&&classes.slice(0,i).includes('IMPLANT'))v*=2;
  if(c.effect==='bomb'&&run.moves===1)v*=5;
  if(c.effect==='doubleLow'&&i>0){const minimum=Math.min(...values);payload+=minimum;events.push({label:'Insider Whisper · doubles earlier card',value:Math.round(minimum),kind:'payload'})}
  v=Math.max(0,v);values.push(v);let n=c.noise+(tiers[i]==='Hot'?10:0)+(c.effect==='red'?cards.filter(x=>x.cls==='WEB').length*3:0);if(i>0&&cards[i-1].effect==='tunnel')n=0;if(oi===i&&has('martyr'))n=0;noise+=n;
  if(c.effect==='quiet')noise-=12;
  const repeats=[];for(let j=0;j<has('fork');j++)repeats.push({factor:.6,label:'Fork Bomb'});for(let j=0;j<has('carbon')&&i===cards.length-1;j++)repeats.push({factor:.75,label:'Carbon Copy'},{factor:.75,label:'Carbon Copy'});for(let j=0;j<has('afterimage')&&c.stage===1;j++)repeats.push({factor:.8,label:'Afterimage'},{factor:.8,label:'Afterimage'});for(let j=0;j<has('martyr')&&oi===i;j++)repeats.push({factor:1,label:'Martyr'},{factor:1,label:'Martyr'});
  // A retrigger scores this resolved card. It never schedules another trigger.
  const passes=[{factor:1,label:c.name},...repeats];passes.forEach((p,j)=>{
   const scored=Math.round(v*p.factor);payload+=scored;executions.push({key:keys[i],id:c.id,label:j?`${p.label} → ${c.name}`:c.name,payload:scored,repeat:j>0});if(j>0)retriggers++;
   if(c.effect==='grow')growth[c.id]=(growth[c.id]||0)+8;
   if(c.effect==='rot')for(const other of CARDS.filter(x=>x.cls==='SUPPLY'))growth[other.id]=(growth[other.id]||0)+4;
   if(c.cls==='SUPPLY'&&has('spore'))growth[c.id]=(growth[c.id]||0)+5*has('spore');
   if(c.effect==='money')credits+=3;if(c.effect==='infect'){credits++;progressBonus+=100}
   if(c.effect==='second'&&i===1)add(`${j?'↳ ':''}Malformed Query`,3);
   if(c.effect==='network')add(`${j?'↳ ':''}Lateral Slide`,2*(classes.filter(x=>x==='NETWORK').length-1));
   if(c.effect==='red')add(`${j?'↳ ':''}Red Screen`,5);
   if(c.effect==='supplyMult')add(`${j?'↳ ':''}Update Server`,run.supplyPlayed+classes.filter(x=>x==='SUPPLY').length);
   if(c.effect==='marker')nextMarker+=4;if(c.effect==='draw')draw++;if(c.effect==='cool')cooling+=30;
  });
  if(c.effect==='persist'&&!run.persisted.includes(keys[i])){persist.push(keys[i]);growth[c.id]=(growth[c.id]||0)+8}
 });
 noise=Math.max(0,noise+12*has('hammer')+12*has('fork')+(BREACHES[run.breach].edict==='honeypot'&&run.turn===0?10:0));
 if(BREACHES[run.breach].edict==='mirror'&&['Echo','Trinity','Monoculture'].includes(type))noise*=2;
 // Additions resolve before multiplicative rigs; each category keeps slot order.
 for(const r of rigs){if(r.id==='mask')add(r.label,Math.floor((100-run.trace)/15));if(r.id==='hammer')add(r.label,cards.length*35,'payload');if(r.id==='tree')add(r.label,run.deck.filter(c=>CARD[c.id].cls==='SUPPLY').length)}
 for(const r of rigs){
  if(r.id==='quiet'&&noise<=15)add(r.label,2.2,'xmult');
  if(r.id==='compound')add(r.label,Math.pow(1.35,run.cleared),'xmult');
  if(r.id==='contrarian'&&distinct>=3)add(r.label,2.5,'xmult');
  if(r.id==='potato'){const n=tiers.filter(t=>t==='Warm'||t==='Hot').length;if(n)add(`${r.label} · ${n} heated cards`,Math.pow(1.5,n),'xmult')}
  if(r.id==='arson'&&run.offerings>0)add(`${r.label} · permanent growth`,1+.2*run.offerings,'xmult');
  if(r.id==='feedback'&&retriggers)add(`${r.label} · ${retriggers} retriggers`,Math.pow(1.3,retriggers),'xmult');
  if(r.id==='staircase'&&['Ladder','Kill Chain','Perfect Ladder'].includes(type))add(r.label,Math.pow(1.4,cards.length-1),'xmult');
  if(r.id==='battery'&&run.trace>=40)add(r.label,3,'xmult');
 }
 if(cards.some(c=>c.effect==='eternal')&&classes.every(c=>c==='IMPLANT'))add('Eternal Foothold',1.5,'xmult');
 if(oi>=0)add('Offering',has('arson')?2.5:1.5,'xmult');if(oi>=0&&has('martyr'))credits+=3*has('martyr');
 const prediction=forecast(run,heat),top=Math.max(...Object.values(prediction));let verdict='UNDETECTED',predictionFactor=1;
 const counter=(prediction[dominant]===top&&top>=.4)||(BREACHES[run.breach].edict==='audit'&&noise<10);
 if(counter&&!(has('feint')&&run.turn===0)){predictionFactor=has('reflect')?Math.pow(2,has('reflect')):.6;verdict=has('reflect')?'REFLECTED':'COUNTERED'}else if(prediction[dominant]<.15){predictionFactor=has('feint')?1.8:1.3;verdict='SURPRISE'}
 if(predictionFactor!==1)add(verdict,predictionFactor,'xmult');
 const score=Math.floor(payload*mult);return {score,payload:Math.round(payload),mult,noise:Math.round(noise),trace:Math.max(0,run.trace+noise-cooling),cooling,type,dominant,verdict,predictionFactor,prediction,events,executions,tiers,credits,draw,nextMarker,progressBonus,retriggers,growth,persist,offering:oi>=0?cards[oi].id:null};
}
function draw(run,count){for(let i=0;i<count;i++){if(!run.drawPile.length){run.drawPile=shuffle(run.discard,run);run.discard=[]}if(run.drawPile.length)run.hand.push(run.drawPile.pop())}}
export function setupBreach(run){run.status='playing';run.progress=run.nextProgress||0;run.nextProgress=0;run.trace=0;run.moves=run.breach===8?6:4;run.pivots=BREACHES[run.breach].edict==='lockdown'?1:3;run.pivotsUsed=0;run.turn=0;run.marker=0;run.supplyPlayed=0;run.persisted=[];run.thisIds=[];run.hand=[];run.discard=[];run.drawPile=shuffle(run.deck,run);draw(run,BREACHES[run.breach].edict==='blackout'?7:8);run.last=null;run.message=BREACHES[run.breach].rule}
export function createRun(seed,kitId='ghost',mode='descent'){
 const kit=KITS.find(k=>k.id===kitId);if(!kit)throw new Error('Unknown loadout.');
 const run={seed:String(seed).slice(0,48),rng:hash(seed),kit:kitId,mode,deck:[],rigs:[kit.rig,kit.bonus],books:{},growth:{},credits:5,integrity:3,breach:0,cleared:0,retry:0,history:[],played:{},offerings:0,counters:0,surprises:0,totalScore:0,best:0,totalPivots:0,hotUsed:0,nextKey:1,nextProgress:0,previousIds:[],log:[]};
 const own=CARDS.filter(c=>c.cls===kit.cls);const picks=[...own,...own.slice(0,4),...CARDS.filter(c=>c.cls!==kit.cls&&c.stage<=2).slice(0,6),...shuffle(CARDS.filter(c=>c.cls!==kit.cls&&c.stage>=3),run).slice(0,4)];run.deck=picks.map(c=>({id:c.id,key:`c${run.nextKey++}`}));
 if(mode==='sprint'){run.rigs.push('feedback');run.credits=10}setupBreach(run);return run;
}
function makeMarket(run){const owned=new Set(run.rigs);const matching={ghost:['quiet','feedback','carbon','mirror','staircase'],hammer:['fork','feedback','battery','reflect','staircase'],gardener:['compound','carbon','fork','feedback','mirror'],arsonist:['martyr','reflect','fork','carbon','battery'],mimic:['staircase','carbon','feedback','mirror','compound']}[run.kit];const relevant=shuffle(matching.filter(id=>!owned.has(id)),run);const other=shuffle(RIGS.filter(r=>!owned.has(r.id)&&!relevant.slice(0,2).includes(r.id)),run);const cardPool=shuffle(CARDS.filter(c=>c.cls===KITS.find(k=>k.id===run.kit).cls),run);const mixed=shuffle(CARDS,run);run.market={offers:[...relevant.slice(0,2).map(id=>({kind:'rig',id,price:RIG[id].price})),...other.slice(0,1).map(r=>({kind:'rig',id:r.id,price:r.price})),...cardPool.slice(0,2).concat(mixed.slice(0,1)).map(c=>({kind:'card',id:c.id,price:c.stage<=2?3:c.stage===3?4:5})),{kind:'book',id:shuffle(Object.keys(CHAINS).filter(t=>t!=='Probe'),run)[0],price:4}],rerolls:0,removals:0,reward:run.reward||null}}
export function marketPrice(offer,heat){if(offer.kind!=='card')return offer.price;const tier=heat[offer.id]?.tier;if(tier==='Burned')return Infinity;return Math.ceil(offer.price*(tier==='Fresh'?1.25:tier==='Hot'?.75:1))}
function fail(run,cause){run.integrity--;run.failure={cause,progress:run.progress,quota:quota(run),breach:run.breach};if(run.integrity<=0){run.status='lost';return}run.status='failed';run.message=cause==='trace'?'You filled the wrong bar.':'The door remained closed.'}
export function applyAction(input,action,heat){const run=clone(input);if(!action||typeof action.type!=='string')throw new Error('Invalid action.');
 if(action.type==='play'){
  if(run.status!=='playing')throw new Error('You are not in a breach.');const s=scoreChain(run,action.keys,heat,action.offering);run.moves--;run.turn++;run.progress+=s.score;run.totalScore+=s.score;run.best=Math.max(run.best,s.score);run.trace=s.trace;run.credits+=s.credits;run.marker=s.nextMarker;run.nextProgress+=s.progressBonus;run.supplyPlayed+=action.keys.filter(k=>CARD[run.hand.find(c=>c.key===k).id].cls==='SUPPLY').length;run.history.push(s.dominant);if(s.verdict==='COUNTERED')run.counters++;if(s.verdict==='SURPRISE')run.surprises++;if(s.offering)run.offerings++;run.hotUsed+=s.tiers.filter(t=>['Hot','Burned'].includes(t)).length;
  Object.entries(s.growth).forEach(([id,v])=>run.growth[id]=(run.growth[id]||0)+v);const used=run.hand.filter(c=>action.keys.includes(c.key));for(const c of used){run.played[c.id]=(run.played[c.id]||0)+1;run.thisIds.push(c.id)}run.hand=run.hand.filter(c=>!action.keys.includes(c.key));run.discard.push(...used.filter(c=>!s.persist.includes(c.key)));run.hand.push(...used.filter(c=>s.persist.includes(c.key)));run.persisted.push(...s.persist);run.last=s;if(BREACHES[run.breach].edict==='tithe')run.credits=Math.max(0,run.credits-1);
  // The quota wins ties, including a chain that would also reach 100 trace.
  if(run.progress>=quota(run)){run.cleared++;const base=BREACHES[run.breach].boss?6:4,unused=run.moves,overkill=Math.min(4,Math.floor((run.progress/quota(run)-1)*4)),interest=Math.min(4,Math.floor(run.credits/5));run.reward={base,unused,overkill,interest,total:base+unused+overkill+interest};run.credits+=run.reward.total;run.status=run.breach===8||run.mode==='sprint'?'won':'market';if(run.status==='market')makeMarket(run)}else if(run.trace>=100)fail(run,'trace');else if(run.moves<=0)fail(run,'moves');else draw(run,Math.max(0,(BREACHES[run.breach].edict==='blackout'?7:8)-run.hand.length)+s.draw);
 }else if(action.type==='pivot'){
  if(run.status!=='playing'||run.pivots<=0)throw new Error('No pivots available.');if(!Array.isArray(action.keys)||action.keys.length<1||action.keys.length>5||new Set(action.keys).size!==action.keys.length||action.keys.some(k=>!run.hand.some(c=>c.key===k)))throw new Error('Select 1–5 cards to pivot.');const removed=run.hand.filter(c=>action.keys.includes(c.key));run.hand=run.hand.filter(c=>!action.keys.includes(c.key));draw(run,removed.length);run.discard.push(...removed);run.pivots--;run.pivotsUsed++;run.totalPivots++;run.last=null;
 }else if(action.type==='buy'){
  if(run.status!=='market')throw new Error('The Market is closed.');if(!Number.isInteger(action.index)||action.index<0||action.index>=run.market.offers.length)throw new Error('Invalid market offer.');const offer=run.market.offers[action.index];if(!offer||offer.sold)throw new Error('Already sold.');const price=marketPrice(offer,heat);if(run.credits<price)throw new Error('Not enough credits.');if(offer.kind==='rig'&&run.rigs.length>=5)throw new Error('Your rack is full. Sell a rig first.');if(offer.kind==='card'&&run.deck.length>=40)throw new Error('Your deck is full.');run.credits-=price;if(offer.kind==='rig')run.rigs.push(offer.id);if(offer.kind==='card')run.deck.push({id:offer.id,key:`c${run.nextKey++}`});if(offer.kind==='book')run.books[offer.id]=(run.books[offer.id]||0)+1;offer.sold=true;
 }else if(action.type==='sell'){
  if(run.status!=='market'||!Number.isInteger(action.index)||!run.rigs[action.index])throw new Error('Choose a rig to sell in the Market.');run.credits+=Math.floor(RIG[run.rigs[action.index]].price/2);run.rigs.splice(action.index,1);
 }else if(action.type==='reorder'){
  if(!['market','playing'].includes(run.status)||!Number.isInteger(action.from)||!Number.isInteger(action.to)||action.from<0||action.to<0||action.from>=run.rigs.length||action.to>=run.rigs.length)throw new Error('Invalid rig position.');const [rig]=run.rigs.splice(action.from,1);run.rigs.splice(action.to,0,rig);
 }else if(action.type==='remove'){
  if(run.status!=='market')throw new Error('Remove cards in the Market.');const price=3+run.market.removals;if(run.credits<price)throw new Error('Not enough credits.');if(run.deck.length<=15)throw new Error('Keep at least 15 cards.');const i=run.deck.findIndex(c=>c.key===action.key);if(i<0)throw new Error('Card not found.');run.deck.splice(i,1);run.credits-=price;run.market.removals++;
 }else if(action.type==='reroll'){
  if(run.status!=='market')throw new Error('The Market is closed.');const n=run.market.rerolls,removals=run.market.removals;if(run.credits<2+n)throw new Error('Not enough credits.');run.credits-=2+n;makeMarket(run);run.market.rerolls=n+1;run.market.removals=removals;
 }else if(action.type==='continue'){
  if(run.status!=='market')throw new Error('Finish this breach first.');run.previousIds=[...new Set(run.thisIds)];run.breach++;run.retry=0;setupBreach(run);
 }else if(action.type==='retry'){
  if(run.status!=='failed')throw new Error('No retry is available.');if(run.retry){run.previousIds=[...new Set(run.thisIds)];run.breach++;run.retry=0;if(run.breach>=9){run.status='lost';return run}}else run.retry=1;setupBreach(run);
 }else throw new Error('Unknown game action.');
 run.log.push({type:action.type,keys:action.keys,offering:action.offering,index:action.index,key:action.key,from:action.from,to:action.to});return run;
}
export function verdict(run){const [favorite,count]=Object.entries(run.played).sort((a,b)=>b[1]-a[1])[0]||['pretext',0];if(run.status==='won'&&run.hotUsed===0)return 'I have no record of you. That is considerably more troubling than your escape.';if(run.status==='won')return `You got out. You played ${CARD[favorite].name} ${count} times. I kept a copy. The next operator will thank you.`;return `You played ${CARD[favorite].name} ${count} times. You reached breach ${run.breach+1} and taught me ${run.history.length} things. ${run.counters?`I predicted you ${run.counters} times. You were remarkably helpful.`:'Your creativity was noted. Your exit was not approved.'}`}
export function bestChain(run,heat){let best=null;const hand=run.hand;function visit(keys){if(keys.length){const s=scoreChain(run,keys,heat);const value=s.score-(s.trace>=100&&run.progress+s.score<quota(run)?1e10:0);if(!best||value>best.value)best={keys:[...keys],score:s,value}}if(keys.length===4)return;for(const c of hand)if(!keys.includes(c.key))visit([...keys,c.key])}visit([]);return best}
