'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const root=process.env.NAMAKO_ROOT||path.resolve(__dirname,'..');
const out=path.join(__dirname,'clear_tales_validation');fs.mkdirSync(out,{recursive:true});
const ja=JSON.parse(fs.readFileSync(path.join(root,'browser/lore_100_v2_1.json'),'utf8'));
const en=JSON.parse(fs.readFileSync(path.join(root,'browser/locales/en.json'),'utf8'));
for(const entries of [ja.entries,en.lore.entries]){
 assert.equal(entries.length,200);assert.equal(new Set(entries.map(e=>e.id)).size,200);
 assert.equal(new Set(entries.slice(100).map(e=>e.title)).size,100);assert.equal(new Set(entries.slice(100).map(e=>e.body)).size,100);
 assert(entries.slice(100).every(e=>e.fiction===true&&e.body.length>35));
}
// Real lock() on a valid near-complete board, rather than calling clear directly.
function prepare(g){
 g.beginPlay(123);g.difficultyIndex=1;g.model.reset(123);let id=1;
 const add=(cells)=>{g.model.pieces.set(id,{cells,color:id%6});for(const[x,y]of cells)g.model.board[y*8+x]=id;id++;};
 for(let y=2;y<12;y++)for(let x=0;x<8;x+=4)add([[x,y],[x+1,y],[x+2,y],[x+3,y]]);
 add([[0,1],[1,1],[2,1],[3,1]]);g.model.nextId=id;g.model.kept=id-1;g.model.turns=id-1;
 g.active=[[0,0],[1,0],[2,0]];g.activeColor=0;g.origin=[4,1];g.visual=g.origin.slice();g.phase=0;g.showActive=true;
 if(!g.model.verifyInvariants()||!g.model.canPlace(g.active,g.origin))throw Error('Invalid fixture');
 g.sync();g.draw();
}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 let cases=0;
 try{
 for(const lang of ['ja','en'])for(const theme of ['light','dark','lcd'])for(const size of [[360,640],[390,844]]){
  const context=await browser.newContext({viewport:{width:size[0],height:size[1]},locale:lang,deviceScaleFactor:2});
  await context.addInitScript(lang=>{window.NAMAKO_TEST_MODE=true;window.NAMAKO_TEST_LANGUAGE=lang;window.requestAnimationFrame=()=>0;},lang);
  const page=await context.newPage(),errors=[],warnings=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning'&&m.text().includes('Missing English'))warnings.push(m.text());});
  await page.goto(pathToFileURL(path.join(root,'START.html')).href+'?test=1');await page.waitForFunction(()=>window.__namako);
  await page.evaluate(({theme,prepare})=>{localStorage.clear();localStorage.setItem('namako_theme',theme);const g=__namako;g.cards.collection={};g.cards.lastGrant={};g.dark=theme==='dark';g.lcd=theme==='lcd';g.applyTheme();window.played=[];g.audio.play=(n,demo)=>played.push({n,demo});g.audio.musicEnabled=false;(new Function('g','('+prepare+')(g)'))(g);}, {theme,prepare:prepare.toString()});
  await page.evaluate(()=>{
   const g=__namako;if(g.targetRatio!==.9)throw Error('Normal target');g.draw();g.lock();
   if(g.mode!=='celebrate'||g.celebrationStage!=='landing')throw Error('Landing stage missing');
   if(!document.getElementById('celebrate-banner').hidden)throw Error('Celebration displayed too early');
   if(g.cards.totalOwned()!==1||!NamakoSession.read())throw Error('Clear checkpoint/reward not saved');
   if(played.some(p=>p.n==='fanfare'))throw Error('Fanfare too early');
   g.update(.49);if(g.celebrationStage!=='landing')throw Error('Landing cut short');
   g.update(.02);if(g.celebrationStage!=='view')throw Error('View stage');g.draw();
  });
  if(size[0]===390)await page.screenshot({path:path.join(out,`${lang}_${theme}_completed.png`)});
  await page.evaluate(()=>{
   const g=__namako;g.update(.98);if(g.celebrationStage!=='view')throw Error('Viewing cut short');g.update(.02);
   if(g.celebrationStage!=='party'||document.getElementById('celebrate-banner').hidden)throw Error('Party banner missing');
   if(played.filter(p=>p.n==='fanfare').length!==1)throw Error('Fanfare count');g.draw();
  });
  await page.waitForFunction(()=>getComputedStyle(document.getElementById('celebrate-banner')).opacity==='1',null,{polling:50,timeout:3000});
  if(size[0]===390)await page.screenshot({path:path.join(out,`${lang}_${theme}_party.png`)});
  await page.evaluate(()=>{const g=__namako;g.update(.78);if(g.mode!=='celebrate')throw Error('Celebration cut short');g.update(.02);if(g.mode!=='reveal')throw Error('Reward missing');if(!document.getElementById('trivia').hidden)throw Error('Automatic doctor');});
  // Reload during the reward: the clear is replayed, the same reward stays owned once.
  await page.reload();await page.waitForFunction(()=>window.__namako);
  await page.evaluate(()=>{const g=__namako;g.audio.musicEnabled=false;g.resumeSaved();if(g.mode!=='celebrate'||g.cards.totalOwned()!==1)throw Error('Resume duplicates/misses reward');g.update(2.4);if(g.mode!=='reveal')throw Error('Resume reveal');g.finishReward();if(g.mode!=='play'||g.cards.totalOwned()!==1)throw Error('Next tank must skip doctor');g.pause();g.openLore();if(g.mode!=='trivia')throw Error('Manual notes missing');
   const ids=[];g.trivia.remaining=[];for(let i=0;i<200;i++)ids.push(g.trivia.pick().id);if(new Set(ids).size!==200)throw Error('Repeated reading cycle');const last=ids.at(-1);if(g.trivia.pick().id===last)throw Error('Cycle boundary repeat');
   const e=g.trivia.byId(101);g.triviaEpisode=e;g.renderTrivia(e);g.sync();
   if(!document.querySelector('.trivia-footnote').textContent.includes(NamakoI18n.locale==='ja'?'フィクション':'Fiction'))throw Error('Fiction label');
  });
  await page.waitForFunction(()=>getComputedStyle(document.getElementById('trivia')).opacity==='1',null,{polling:50,timeout:3000});
  if(size[0]===390)await page.screenshot({path:path.join(out,`${lang}_${theme}_tale.png`)});
  await page.evaluate(()=>{
   const g=__namako;g.finishTrivia();if(g.mode!=='paused')throw Error('Notes return');const count=g.cards.totalOwned();g.beginDemo();g.clear(true);g.update(2.4);if(g.mode!=='trivia'||g.cards.totalOwned()!==count)throw Error('Demo notes missing/reward granted');if(g.demoOverlayTime<12||g.demoOverlayTime>40)throw Error('Reading delay');const wait=g.demoOverlayTime;g.update(wait-.1);if(g.mode!=='trivia')throw Error('Reading cut short');g.update(.2);if(g.mode!=='demo')throw Error('Demo failed to restart');g.openLore();g.update(45);if(g.mode!=='trivia'||g.triviaReturnMode!=='demo')throw Error('Manual reader auto-closed');g.finishTrivia();
   for(const id of ['theme','track','speed','music','sfx','lore-button','difficulty']){const el=document.getElementById(id),r=el.getBoundingClientRect();if(r.left<-.5||r.right>innerWidth+.5)throw Error('Button out of viewport '+id);}g.reduced=true;g.clear(true);g.update(2.4);g.draw();
   if(g.mode!=='trivia')throw Error('Reduced motion demo notes');g.openTriviaCard(document.getElementById('trivia-dog-card').src,'Dog');const remaining=g.demoOverlayTime;g.update(45);if(g.demoOverlayTime!==remaining)throw Error('Reading timer did not pause for card');g.closeTriviaCard();g.finishTrivia();if(g.mode!=='demo')throw Error('Continue demo');
  });
  assert.deepEqual(errors,[]);assert.deepEqual(warnings,[]);await context.close();cases++;
 }
 console.log(`PASS ${cases} browser cases: ja/en × light/dark/LCD × phone sizes; real landing, 2.3s sequence, fanfare, single saved reward/reload, next tank, manual 200-story cycle, fiction label, timed demo notes, manual reading, card-view timer pause, reduced motion.`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
