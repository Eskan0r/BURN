/* Extended browser evidence. Fixtures are explicitly labeled; production has no debug endpoints. */
import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {CARDS,CARD} from '../src/data.js';
import {bestChain,scoreChain,marketPrice,quota} from '../src/engine.js';
import {createRoom,mutateRoom} from '../src/room.js';

const base=process.env.QA_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--disable-gpu'],timeout:20000});
const report={date:new Date().toISOString(),checks:[],errors:[],journeys:[],fixtures:[],screenshots:[]};
fs.mkdirSync('artifacts',{recursive:true});
async function makePage(){const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});const page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>report.errors.push(e.message));await page.goto(base,{waitUntil:'domcontentloaded'});return page}
async function shot(page,name){const file=`artifacts/journey-${name}.png`;await page.screenshot({path:file,fullPage:true,animations:'disabled'});report.screenshots.push(file)}
async function check(name,fn){try{await fn();report.checks.push({name,passed:true});console.log(`PASS ${name}`)}catch(error){report.checks.push({name,passed:false,error:error.message});console.log(`FAIL ${name}: ${error.message}`)}}
async function api(page,body){const result=await page.evaluate(async body=>{const session=JSON.parse(sessionStorage.getItem('burned-session-v1'));const{request}=await import('/src/client.js');return request(session,body)},body);if(result.error)throw new Error(result.error);return result.room}
const state=page=>api(page,{type:'state'});
const action=(page,value,room)=>api(page,{type:'action',action:value,requestId:randomUUID(),heatVersion:room.heatVersion});
async function idle(page){await page.locator('.score-burst').waitFor({state:'hidden'});await page.waitForTimeout(100)}
async function clear(page){await page.keyboard.press('Escape');await expect(page.locator('.hand .exploit-card[aria-pressed="true"]')).toHaveCount(0)}
async function select(page,room,keys){await clear(page);for(const key of keys){const index=room.run.hand.findIndex(c=>c.key===key);assert.ok(index>=0);await page.locator('.hand .exploit-card').nth(index).click()}await expect(page.locator('.hand .exploit-card[aria-pressed="true"]')).toHaveCount(keys.length)}
async function play(page,room,keys,keyboard=false){await select(page,room,keys);if(keyboard){await page.locator('.hand-heading').click();await page.keyboard.press('Enter')}else await page.getByRole('button',{name:/^PLAY CHAIN/}).click();await expect.poll(async()=>(await state(page)).run.log.length).toBeGreaterThan(room.run.log.length);await idle(page);return state(page)}
async function start(page,{offline=false,kit='GARDENER',seed='BALANCE-0'}={}){
 await page.getByRole('button',{name:offline?'Offline practice':/^CREATE A ROOM/}).click();await page.getByRole('button',{name:/^ENTER THE UNDER/}).waitFor();
 await page.getByLabel('Bot operators',{exact:true}).selectOption('0');await expect.poll(async()=>(await state(page)).botCount).toBe(0);
 await page.getByRole('button',{name:new RegExp(kit)}).click();await expect.poll(async()=>(await state(page)).kit).toBe(kit.toLowerCase());
 await page.locator('.seed-field input').fill(seed);await page.getByRole('button',{name:/^ENTER THE UNDER/}).click();await page.getByRole('button',{name:/^PLAY CHAIN/}).waitFor();return state(page);
}
async function shop(page,room){
 const priority=['feedback','fork','carbon','spore','compound','tree','mirror'];const rank=id=>{const n=priority.indexOf(id);return n<0?0:20-n*2};let count=0;
 while(room.run.status==='market'&&count++<20){const r=room.run,options=r.market.offers.map((o,index)=>({o,index}));const rigs=options.filter(({o})=>o.kind==='rig'&&!o.sold&&o.price<=r.credits).sort((a,b)=>rank(b.o.id)-rank(a.o.id));let chosen=null;
  for(const{o,index}of rigs){if(r.rigs.length<5){chosen={type:'buy',index};break}const worst=r.rigs.map((id,index)=>({id,index})).sort((a,b)=>rank(a.id)-rank(b.id))[0];if(rank(o.id)>rank(worst.id)){chosen={type:'sell',index:worst.index};break}}
  if(!chosen){const c=options.find(({o})=>o.kind==='card'&&!o.sold&&CARD[o.id].cls==='SUPPLY'&&marketPrice(o,room.heat)<=r.credits&&r.deck.length<25);if(c)chosen={type:'buy',index:c.index}}
  if(!chosen){const b=options.find(({o})=>o.kind==='book'&&!o.sold&&o.price<=r.credits&&['Trinity','Perfect Ladder','Monoculture','Kill Chain'].includes(o.id));if(b)chosen={type:'buy',index:b.index}}
  if(!chosen&&r.credits>=9&&r.market.rerolls<2)chosen={type:'reroll'};
  if(!chosen)break;room=await action(page,chosen,room);
 }
 await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:/^NEXT BREACH/}).click();await page.getByRole('button',{name:/^PLAY CHAIN/}).waitFor();return state(page);
}

try{
 // Organic nine-breach run: all card selections, plays, pivots, retries, and transitions use the UI.
 // Shop purchases use the same authoritative client/API entrypoint to keep this diagnostic bounded.
 const online=await makePage();let room=await start(online),plays=0,steps=0,apiShopVisits=0;
 while(!['won','lost'].includes(room.run.status)&&steps++<100){
  if(room.run.status==='market'){room=await shop(online,room);apiShopVisits++;continue}
  if(room.run.status==='failed'){await online.getByRole('button',{name:/^(TRY AGAIN|MOVE ON)/}).click();await online.getByRole('button',{name:/^PLAY CHAIN/}).waitFor();room=await state(online);continue}
  let best=bestChain(room.run,room.heat);
  if(room.run.pivots>0&&best.score.score*room.run.moves<quota(room.run)-room.run.progress){let keys=room.run.hand.filter(c=>!best.keys.includes(c.key)).map(c=>c.key).slice(0,5);if(keys.length){await select(online,room,keys);await online.getByRole('button',{name:/^PIVOT/}).click();await expect.poll(async()=>(await state(online)).run.pivots).toBe(room.run.pivots-1);room=await state(online);best=bestChain(room.run,room.heat)}}
  room=await play(online,room,best.keys);plays++;console.log(`DESCENT breach=${room.run.breach+1} status=${room.run.status} score=${room.run.last.score}`);
 }
 await shot(online,room.run.status==='won'?'win':'descent-end');report.journeys.push({name:'Organic online full descent',seed:'BALANCE-0',status:room.run.status,breachesCleared:room.run.cleared,breach:room.run.breach+1,uiPlays:plays,apiShopVisits,total:room.run.totalScore,best:room.run.best,note:'No state fixture. All scoring and transitions through visible UI; market purchases via authoritative client request API. Live room heat, zero bots.'});
 await check('nine-breach online run reaches the Surface',async()=>{assert.equal(room.run.status,'won');assert.equal(room.run.breach,8);await expect(online.getByRole('heading',{name:'YOU GOT OUT.'})).toBeVisible()});

 // Organic offline failure route and persistence, using deliberately weak single-card plays.
 const offline=await makePage();let local=await start(offline,{offline:true,kit:'MIMIC',seed:'QA-OFFLINE-LOSS'});
 await check('number keys select and Escape clears selection',async()=>{await offline.keyboard.press('1');await expect(offline.locator('.hand .exploit-card[aria-pressed="true"]')).toHaveCount(1);await offline.keyboard.press('Escape');await expect(offline.locator('.hand .exploit-card[aria-pressed="true"]')).toHaveCount(0)});
 await check('manual outside click dismisses the modal',async()=>{await offline.getByRole('button',{name:/^HOW TO PLAY/}).click();await expect(offline.getByRole('dialog')).toBeVisible();await offline.locator('.modal-backdrop').click({position:{x:3,y:3}});await expect(offline.getByRole('dialog')).toHaveCount(0)});
 await check('Escape closes the manual without changing selected cards',async()=>{await offline.keyboard.press('1');await offline.getByRole('button',{name:/^HOW TO PLAY/}).click();await offline.keyboard.press('Escape');await expect(offline.getByRole('dialog')).toHaveCount(0);await expect(offline.locator('.hand .exploit-card[aria-pressed="true"]')).toHaveCount(1)});await clear(offline);
 await check('card inspection prevents keyboard selection behind its modal',async()=>{await offline.locator('.card-info').first().click();await expect(offline.getByRole('dialog')).toBeVisible();await offline.keyboard.press('1');await expect(offline.locator('.hand .exploit-card[aria-pressed="true"]')).toHaveCount(0)});await offline.keyboard.press('Escape');await clear(offline);
 await check('Enter on score inspection opens details without playing the chain',async()=>{await offline.keyboard.press('1');const before=await state(offline);await offline.getByRole('button',{name:'Inspect score calculation'}).focus();await offline.keyboard.press('Enter');await expect(offline.getByRole('dialog',{name:'THE ARITHMETIC'})).toBeVisible();await offline.waitForTimeout(300);const after=await state(offline);assert.equal(after.run.log.length,before.run.log.length)});await offline.keyboard.press('Escape');await idle(offline);local=await state(offline);
 await check('Enter commits the selected chain exactly once',async()=>{const before=await state(offline);local=await play(offline,before,[before.run.hand[0].key],true);assert.equal(local.run.log.length,before.run.log.length+1)});
 await check('offline reload restores the same run and session',async()=>{const before=await state(offline),saved=await offline.evaluate(()=>JSON.parse(localStorage.getItem('burned-offline-v1')));assert.ok(saved.players[0].run);await offline.reload({waitUntil:'domcontentloaded'});await offline.getByRole('button',{name:/^PLAY CHAIN/}).waitFor();const after=await state(offline);assert.deepEqual(JSON.parse(JSON.stringify(after.run)),JSON.parse(JSON.stringify(before.run)));await expect(offline.locator('.rail-footer')).toContainText('OFFLINE PRACTICE');await shot(offline,'offline')});
 let retries=0,failures=0,lossPlays=0;local=await state(offline);
 while(!['lost','won'].includes(local.run.status)&&lossPlays<35){
  if(local.run.status==='failed'){failures++;if(local.run.retry===0){assert.match(await offline.locator('.failure').innerText(),/10%/);await offline.getByRole('button',{name:/^TRY AGAIN/}).click();retries++}else await offline.getByRole('button',{name:/^MOVE ON/}).click();await offline.getByRole('button',{name:/^PLAY CHAIN/}).waitFor();local=await state(offline);continue}
  if(local.run.status==='market'){await offline.getByRole('button',{name:/^NEXT BREACH/}).click();await offline.getByRole('button',{name:/^PLAY CHAIN/}).waitFor();local=await state(offline);continue}
  const weakest=local.run.hand.map(c=>({key:c.key,score:scoreChain(local.run,[c.key],local.heat).score})).sort((a,b)=>a.score-b.score)[0];local=await play(offline,local,[weakest.key]);lossPlays++;
 }
 await shot(offline,'loss');report.journeys.push({name:'Organic offline loss and retry',seed:'QA-OFFLINE-LOSS',status:local.run.status,uiLossPlays:lossPlays,retries,failures,integrity:local.run.integrity,note:'No fixture. Mimic loadout, zero bots, deliberately lowest-scoring singleton choices. Keyboard checks may score additional singletons.'});
 await check('three integrity losses produce the loss ending after a visible retry',async()=>{assert.equal(local.run.status,'lost');assert.equal(local.run.integrity,0);assert.ok(retries>0);await expect(offline.locator('.end-panel:not(.won)')).toBeVisible()});

 // Explicit rehearsal fixture: a Warm Dormant Seed at 3 uses, one real Offering pushes it to Burned.
 const now=Date.now(),token=randomUUID();let rehearsal=createRoom('LOCAL1',token,'QA REHEARSAL',now);
 rehearsal=mutateRoom(rehearsal,token,{type:'configure',capacity:3,bots:0},now);rehearsal=mutateRoom(rehearsal,token,{type:'start',seed:'QA-REHEARSAL-OFFER'},now);
 const rr=rehearsal.players[0].run,seed=rr.deck.find(c=>c.id==='seed');rr.hand=[seed,...rr.deck.filter(c=>c.key!==seed.key).slice(0,7)];rr.drawPile=rr.deck.filter(c=>!rr.hand.some(h=>h.key===c.key));
 rehearsal.heat.seed={...rehearsal.heat.seed,uses:3,index:3/(32/30),tier:'Warm'};rehearsal.snapshots=[{version:rehearsal.heatVersion,time:now,heat:structuredClone(rehearsal.heat)}];
 const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});const burnPage=await context.newPage();burnPage.setDefaultTimeout(12000);
 await context.addInitScript(({room,session})=>{sessionStorage.setItem('burned-session-v1',JSON.stringify(session));localStorage.setItem('burned-offline-v1',JSON.stringify(room));localStorage.setItem('burned-motion','1')},{room:rehearsal,session:{offline:true,token,code:'LOCAL1'}});
 await burnPage.goto(base,{waitUntil:'domcontentloaded'});await burnPage.getByRole('button',{name:/^PLAY CHAIN/}).waitFor();let br=await state(burnPage);await select(burnPage,br,[seed.key]);await burnPage.getByRole('button',{name:'OFFER',exact:true}).click();await expect(burnPage.getByRole('button',{name:'OFFERED',exact:true})).toBeVisible();await shot(burnPage,'offering');
 await burnPage.getByRole('button',{name:/^PLAY CHAIN/}).click();await burnPage.locator('.burn-banner').waitFor();await idle(burnPage);br=await state(burnPage);await shot(burnPage,'burn');
 report.fixtures.push({name:'QA REHEARSAL / Warm Seed Offering',seed:'QA-REHEARSAL-OFFER',setup:'Offline localStorage room prepared with Warm Dormant Seed and 3 uses. No patched state injected. Visible select, Offer, and Play cause the real scoring and heat transition.',tierAfter:br.heat.seed.tier,patches:br.patch,offering:br.run.last.offering});
 await check('real Offering from labeled fixture produces patch feed, banner and card stamp',async()=>{assert.equal(br.run.last.offering,'seed');assert.equal(br.heat.seed.tier,'Burned');assert.equal(br.patch,1);assert.ok(br.feed.some(f=>f.type==='offering'));assert.ok(br.feed.some(f=>f.type==='burn'));await expect(burnPage.locator('.patched-stamp').first()).toBeVisible();await expect(burnPage.locator('.burn-banner')).toContainText('Dormant Seed')});
 await burnPage.getByRole('button',{name:/^THE WALL/}).click();await expect(burnPage.locator('.heat-tile.burned')).toHaveCount(1);await shot(burnPage,'burn-wall');
}catch(error){report.fatal=error.stack||error.message;console.error(error);process.exitCode=1}
finally{report.passed=!report.fatal&&!report.errors.length&&report.checks.every(c=>c.passed);fs.writeFileSync('artifacts/journey-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,failures:report.checks.filter(c=>!c.passed),fatal:report.fatal||null}));if(!report.passed)process.exitCode=1;await browser.close()}
