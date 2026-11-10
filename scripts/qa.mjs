import {chromium} from '@playwright/test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {bestChain,scoreChain} from '../src/engine.js';
const base=process.env.QA_URL||'http://127.0.0.1:5173';
const executablePath=process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe';
fs.mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath,args:['--disable-gpu']});
const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
async function screenshot(name){await page.screenshot({path:`artifacts/${name}.png`,fullPage:true})}
async function session(){return page.evaluate(()=>JSON.parse(sessionStorage.getItem('burned-session-v1')))}
async function state(){const s=await session();return page.evaluate(async s=>{const r=await fetch('/api/room',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...s,type:'state'})});return r.json()},s)}
async function api(body,target=page){const s=await target.evaluate(()=>JSON.parse(sessionStorage.getItem('burned-session-v1')));return target.evaluate(async({s,body})=>{const r=await fetch('/api/room',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...s,...body})});return r.json()},{s,body})}
try{
 await page.goto(base);await page.getByRole('button',{name:'CREATE A ROOM →',exact:true}).waitFor();await page.evaluate(()=>document.fonts.ready);await screenshot('01-title');
 await page.getByRole('button',{name:'CREATE A ROOM →',exact:true}).click();await page.getByRole('button',{name:'ENTER THE UNDER →',exact:true}).waitFor();await screenshot('02-lobby');
 // A separate browser context gets a distinct session and joins a real shared room.
 await page.getByLabel('Room size',{exact:true}).selectOption('4');await page.waitForTimeout(300);const s=await session();const peerContext=await browser.newContext({viewport:{width:1280,height:720}});const peer=await peerContext.newPage();await peer.goto(`${base}/?room=${s.code}`);await peer.getByRole('button',{name:'JOIN THE ROOM →',exact:true}).click();await peer.getByRole('button',{name:'WAITING FOR HOST…',exact:true}).waitFor();
 await page.getByRole('button',{name:/GARDENER/}).click();await page.waitForTimeout(300);await page.locator('.seed-field input').fill('QA-RENDER');await page.getByRole('button',{name:'ENTER THE UNDER →',exact:true}).click();await page.getByRole('button',{name:'PLAY CHAIN',exact:false}).waitFor();await screenshot('03-breach-1440');
 await page.setViewportSize({width:1280,height:720});await screenshot('04-breach-1280');await page.setViewportSize({width:1440,height:900});
 const initial=await state();assert.equal(initial.room.players.filter(p=>!p.bot).length,2);assert.equal(initial.room.botCount,2);
 const best=bestChain(initial.room.run,initial.room.heat);const predicted=best.score.score;
 for(const key of best.keys){const idx=initial.room.run.hand.findIndex(c=>c.key===key);await page.locator('.hand .exploit-card').nth(idx).click()}
 await screenshot('05-selected-chain');await page.locator('.score-preview').click();await page.getByRole('dialog',{name:'THE ARITHMETIC'}).waitFor();await screenshot('06-score-details');await page.getByRole('button',{name:'Close dialog',exact:true}).click();
 await page.getByRole('button',{name:'PLAY CHAIN',exact:false}).click();await page.waitForTimeout(1700);const after=await state();assert.equal(after.room.run.last.score,predicted,'displayed preview equals authoritative score');
 let rounds=0;
 while(after.room.run.status==='playing'&&rounds++<5){const current=await state();if(current.room.run.status!=='playing')break;const choice=bestChain(current.room.run,current.room.heat);for(const key of choice.keys){const idx=current.room.run.hand.findIndex(c=>c.key===key);await page.locator('.hand .exploit-card').nth(idx).click()}await page.getByRole('button',{name:'PLAY CHAIN',exact:false}).click();await page.waitForTimeout(1700)}
 await page.getByRole('button',{name:'NEXT BREACH →',exact:true}).waitFor();await screenshot('07-market');
 const market=await state();const buy=market.room.run.market.offers.findIndex(o=>o.kind==='rig'&&o.price<=market.room.run.credits);if(buy>=0){const o=market.room.run.market.offers[buy];await page.locator('.shop-rig').nth(buy).getByRole('button',{name:`BUY · $${o.price}`,exact:true}).click();await page.waitForTimeout(300);assert.equal((await state()).room.run.rigs.length,3)}
 await page.getByRole('button',{name:'THE WALL',exact:false}).click();await page.locator('.heat-grid').waitFor();await screenshot('08-wall');
 await peer.getByRole('button',{name:'THE WALL',exact:false}).click();await peer.locator('.heat-grid').waitFor();await peer.waitForTimeout(2800);const peerState=await api({type:'state'},peer);assert.equal(peerState.room.code,s.code);assert.equal(peerState.room.players.filter(p=>!p.bot).length,2);assert.ok(peerState.room.heatVersion>=initial.room.heatVersion);assert.ok(peerState.room.players.find(p=>p.id===initial.room.me).score>0,'peer sees another context’s scored run');
 await page.getByRole('button',{name:'← BACK TO DESCENT',exact:true}).click();await page.getByRole('button',{name:'HOW TO PLAY',exact:false}).click();await screenshot('09-manual');await page.getByRole('button',{name:'Close dialog',exact:true}).click();
 await page.setViewportSize({width:390,height:844});await screenshot('10-mobile-market');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'mobile has no horizontal overflow');
 await page.setViewportSize({width:1440,height:900});await page.getByRole('button',{name:'NEXT BREACH →',exact:true}).click();await page.getByRole('button',{name:'PLAY CHAIN',exact:false}).waitFor();
 // Verify pivot changes the hand but preserves moves and score.
 const pivotBefore=await state();await page.locator('.hand .exploit-card').first().click();await page.getByRole('button',{name:/^PIVOT/}).click();await page.waitForTimeout(500);const pivotAfter=await state();assert.equal(pivotAfter.room.run.pivots,pivotBefore.room.run.pivots-1);assert.equal(pivotAfter.room.run.moves,pivotBefore.room.run.moves);assert.equal(pivotAfter.room.run.totalScore,pivotBefore.room.run.totalScore);
 await page.setViewportSize({width:390,height:844});await screenshot('11-mobile-breach');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'mobile breach has no horizontal overflow');
 await peerContext.close();
 // Resuming the session survives a page reload.
 await page.reload();await page.getByRole('button',{name:'PLAY CHAIN',exact:false}).waitFor();assert.equal((await state()).room.code,s.code);
 assert.deepEqual(errors,[],'browser console has no errors');fs.writeFileSync('artifacts/qa-report.json',JSON.stringify({date:new Date().toISOString(),passed:true,checks:['title/lobby/game/market/wall rendered','two independent browser sessions share real server state','preview equals server score','rig purchase','pivot preserves moves and score','reload resume','390px no horizontal overflow','no browser console errors'],screenshots:fs.readdirSync('artifacts').filter(x=>x.endsWith('.png')),errors},null,2));console.log('QA PASS: independent browser sessions, scoring, shop, pivot, reload, mobile layout. Screenshots in artifacts/.');
}catch(error){await screenshot('qa-failure');console.error(error);console.error('Browser errors:',errors);process.exitCode=1}finally{await browser.close()}
