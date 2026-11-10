export const CLASSES=['SOCIAL','WEB','NETWORK','SUPPLY','IMPLANT'];
export const COLORS={SOCIAL:'#e5b76c',WEB:'#f08584',NETWORK:'#74c6d3',SUPPLY:'#b4c875',IMPLANT:'#be9cde'};
export const CLASS_SYMBOL={SOCIAL:'◎',WEB:'⌘',NETWORK:'⌁',SUPPLY:'⤴',IMPLANT:'◈'};
const card=(id,name,cls,stage,payload,noise,effect,text,art)=>({id,name,cls,stage,payload,noise,effect,text,art});
export const CARDS=[
card('pretext','Pretext','SOCIAL',1,12,2,'draw','Draw 1 extra card after this chain.','mask'),
card('spearphish','Velvet Hook','SOCIAL',2,20,6,'setup','×2 payload if played after stage 1.','hook'),
card('badge','Borrowed Face','SOCIAL',3,28,8,'quiet','−12 noise for this chain.','face'),
card('ghost','Helpdesk Ghost','SOCIAL',3,22,4,'wildClass','Wild class. Becomes the class that helps your chain.','ghost'),
card('whisper','Insider Whisper','SOCIAL',4,32,9,'doubleLow','Double the lowest earlier card’s payload.','mouth'),
card('gala','Golden Ticket','SOCIAL',5,48,16,'money','Earn $3 each time this scores.','ticket'),
card('crawl','Directory Crawl','WEB',1,14,4,'recon','The next card scores +20 payload.','folder'),
card('query','Malformed Query','WEB',2,24,8,'second','+3 mult when second in the chain.','terminal'),
card('cookie','Cookie Jar','WEB',3,30,8,'hand','+5 payload for each unplayed card in hand.','jar'),
card('spill','Script Spill','WEB',3,36,16,'loud','×3 payload when trace is at least 40.','spill'),
card('session','Session Hijack','WEB',4,35,12,'copyPrevious','Add twice the previous card’s scored payload.','key'),
card('deface','Red Screen','WEB',5,55,22,'red','+5 mult. Every WEB card adds +3 noise.','screen'),
card('port','Port Whisper','NETWORK',1,13,2,'pivot','+12 payload per pivot used this breach.','antenna'),
card('tunnel','Tunnel','NETWORK',2,23,5,'tunnel','The next card in this chain makes no noise.','tunnel'),
card('slide','Lateral Slide','NETWORK',3,31,8,'network','+2 mult for each other NETWORK card.','arrows'),
card('relay','Relay Hop','NETWORK',3,25,4,'marker','Leave a relay: next chain gets +4 mult.','relay'),
card('backbone','Backbone Tap','NETWORK',4,40,11,'diversity','×1 payload for each distinct class.','network'),
card('pulse','Blackout Pulse','NETWORK',5,52,18,'cool','After scoring, remove 30 trace.','bolt'),
card('typo','Typo Squat','SUPPLY',1,10,1,'grow','Permanently gains +8 payload whenever scored.','sprout'),
card('poison','Poisoned Update','SUPPLY',2,18,4,'infect','Earn $1. Next breach starts with +100 progress.','crate'),
card('vendor','Vendor Backdoor','SUPPLY',3,25,6,'wildStage','Wild stage. Fits anywhere in a rising ladder.','door'),
card('rot','Dependency Rot','SUPPLY',3,22,3,'rot','Every SUPPLY card permanently gains +4 payload.','mushroom'),
card('firmware','Signed Firmware','SUPPLY',4,37,7,'immune','Ignores heat penalties. Always counts in ladders.','seal'),
card('update','Update Server','SUPPLY',5,48,12,'supplyMult','+1 mult per SUPPLY card played this breach.','server'),
card('seed','Dormant Seed','IMPLANT',1,9,0,'persist','Returns to hand once per breach. Gains +8 payload.','seed'),
card('registry','Registry Key','IMPLANT',2,20,3,'persist','Returns to hand once per breach. Gains +8 payload.','key'),
card('rootkit','Rootkit Shell','IMPLANT',3,34,6,'shell','×2 payload if an earlier card is IMPLANT.','shell'),
card('process','Ghost Process','IMPLANT',3,24,1,'persist','Returns to hand once per breach. Gains +8 payload.','ghost'),
card('bomb','Logic Bomb','IMPLANT',4,28,5,'bomb','×5 payload on the final move. Otherwise ×1.','bomb'),
card('eternal','Eternal Foothold','IMPLANT',5,42,7,'eternal','×1.5 mult if every card is IMPLANT.','eye')];
export const CARD=Object.fromEntries(CARDS.map(c=>[c.id,c]));
const rig=(id,name,rarity,price,text,art,color)=>({id,name,rarity,price,text,art,color});
export const RIGS=[
rig('mask','Ski Mask','COMMON',5,'+1 mult per 15 trace remaining. A quiet start pays.','mask','#91b3a0'),
rig('quiet','Quiet Hours','UNCOMMON',7,'×2.2 mult when chain noise is 15 or less.','moon','#a3bcdb'),
rig('hammer','Sledgehammer','COMMON',5,'+35 payload per card. +12 chain noise.','hammer','#d0a078'),
rig('fork','Fork Bomb','RARE',10,'Every original card scores again at 60% payload. +12 noise.','fork','#ce7575'),
rig('tree','Dependency Tree','COMMON',5,'+1 mult per SUPPLY card in your entire deck.','tree','#a7c173'),
rig('compound','Compound Interest','UNCOMMON',7,'×1.35 mult per cleared breach. Growth is exponential.','coin','#e2ba63'),
rig('spore','Spore Drive','RARE',9,'Each scored SUPPLY card gains +5 payload forever. Replays grow too.','mushroom','#b8bd71'),
rig('cold','Cold Reader','COMMON',5,'Fresh cards score ×2 payload instead of ×1.3.','snow','#8bc4cc'),
rig('contrarian','Contrarian','UNCOMMON',7,'×2.5 mult with 3 or more distinct classes.','prism','#b99acf'),
rig('potato','Hot Potato','UNCOMMON',7,'×1.5 mult for EACH Warm or Hot card.','flame','#df9561'),
rig('arson','Arsonist','UNCOMMON',7,'Offerings become ×2.5 mult, and permanently add ×0.2 to this rig.','match','#dd7869'),
rig('martyr','Martyr','RARE',9,'Offerings cost no card noise, earn $3, and retrigger the offered card twice.','heart','#cf8395'),
rig('feint','Feint','COMMON',5,'First chain of every breach cannot be countered. Surprise is ×1.8.','mask','#b293c9'),
rig('reflect','Looking Glass','RARE',9,'If countered, replace ×0.6 with ×2. Prediction becomes a weapon.','mirror','#8abcc6'),
rig('carbon','Carbon Copy','UNCOMMON',7,'Your rightmost card scores two extra times at 75% payload.','copies','#c2b39b'),
rig('feedback','Feedback Loop','RARE',10,'×1.3 mult per retrigger in this chain. Copies feed the machine.','loop','#d1a0be'),
rig('afterimage','Afterimage','UNCOMMON',7,'Each original stage 1 card retriggers twice at 80% payload.','ghost','#84c4b2'),
rig('staircase','Stairway','UNCOMMON',7,'Rising chains gain ×1.4 mult per step. Four cards = ×2.74.','stairs','#c7b58a'),
rig('mirror','Mirror Circuit','RARE',10,'Copies the rig immediately to its left once. Cannot copy another Mirror.','mirror','#b3b8d8'),
rig('battery','Blood Battery','UNCOMMON',7,'×3 mult while trace is 40 or higher. Loud builds live dangerously.','battery','#df8c79')];
export const RIG=Object.fromEntries(RIGS.map(r=>[r.id,r]));
export const CHAINS={Probe:1,Echo:2,Ladder:4,Trinity:5,'Kill Chain':7,Monoculture:9,'Perfect Ladder':13};
export const KITS=[
{id:'ghost',name:'GHOST',subtitle:'Leave no footprints.',cls:'IMPLANT',rig:'mask',bonus:'afterimage',desc:'Persist, retrigger, stay quiet.',icon:'ghost'},
{id:'hammer',name:'HAMMER',subtitle:'Knock. Loudly.',cls:'WEB',rig:'hammer',bonus:'carbon',desc:'Copy big hits. Embrace the trace.',icon:'hammer'},
{id:'gardener',name:'GARDENER',subtitle:'Small things multiply.',cls:'SUPPLY',rig:'tree',bonus:'spore',desc:'Grow your deck into a monster.',icon:'sprout'},
{id:'arsonist',name:'ARSONIST',subtitle:'Everyone pays. You profit.',cls:'NETWORK',rig:'arson',bonus:'potato',desc:'Offer warm cards. Feed the fire.',icon:'flame'},
{id:'mimic',name:'MIMIC',subtitle:'Be someone unexpected.',cls:'SOCIAL',rig:'feint',bonus:'contrarian',desc:'Mixed chains. Break the forecast.',icon:'mask'}];
export const BREACHES=[
{name:'THE INTAKE',sector:'THE LOBBY',quota:600,rule:'A door is only a suggestion.',edict:'none'},
{name:'GLASS CORRIDOR',sector:'THE LOBBY',quota:1400,rule:'Honeypot: your first chain adds +10 noise.',edict:'honeypot'},
{name:'THE ARCHIVIST',sector:'THE LOBBY',quota:3400,rule:'Known cards: anything played last breach loses 25% payload.',edict:'archivist',boss:true},
{name:'POWER STATION',sector:'THE FOUNDRY',quota:6500,rule:'Blackout: draw one fewer card.',edict:'blackout'},
{name:'DEAD CHANNEL',sector:'THE FOUNDRY',quota:12000,rule:'Lockdown: only one pivot this breach.',edict:'lockdown'},
{name:'THE MIRROR',sector:'THE FOUNDRY',quota:24000,rule:'Echo, Trinity and Monoculture make twice the noise.',edict:'mirror',boss:true},
{name:'COLD STORAGE',sector:'THE VAULT',quota:42000,rule:'Audit: chains below 10 noise are countered.',edict:'audit'},
{name:'LAST ELEVATOR',sector:'THE VAULT',quota:72000,rule:'Tithe: each play costs $1, if you have it.',edict:'tithe'},
{name:'WARDEN',sector:'THE VAULT',quota:140000,rule:'Six moves. Three phases. Everything you taught it.',edict:'warden',boss:true}];
export const TIERS={Fresh:{factor:1.3,label:'FRESH',icon:'✧',color:'#79c5a5'},Normal:{factor:1,label:'STABLE',icon:'−',color:'#aaa99b'},Warm:{factor:.85,label:'WARM',icon:'≈',color:'#e7b566'},Hot:{factor:.65,label:'HOT',icon:'▲',color:'#f18c66'},Burned:{factor:.25,label:'PATCHED',icon:'×',color:'#e2666c'}};
