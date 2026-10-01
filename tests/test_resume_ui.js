'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url'),{chromium}=require('playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),browser=await chromium.launch(require('./browser_test_support').launchOptions);
 try{
 const page=await browser.newPage({viewport:{width:540,height:860}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.join(root,'START.html')).href+'?test=1');
 await page.waitForFunction(()=>window.__namako);
 assert.equal(await page.locator('h1').innerText(),'つみなまこ');
 async function checkLayout(){
  const layout=await page.evaluate(()=>{const box=id=>{const r=document.getElementById(id).getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};};const stage=box('stage'),scale=stage.w/540;return{settings:['theme','track','speed','music','sfx'].map(box),cards:box('cards-button'),tip:box('tip'),mode:box('mode'),count:box('count'),status:box('status'),start:box('start'),left:box('left'),footer:box('footer'),board:{top:stage.y+B.y*scale,bottom:stage.y+(B.y+B.h)*scale,width:B.w,height:B.h,cell:B.c}};});
  const row=layout.settings;
  for(let i=1;i<row.length;i++){assert(Math.abs(row[i].y-row[0].y)<1&&Math.abs(row[i].h-row[0].h)<1,'settings have uniform height');assert(row[i-1].x+row[i-1].w<row[i].x,'settings do not overlap');}
  assert(layout.cards.y+layout.cards.h<row[0].y,'collection is above settings');
  assert(row[0].y+row[0].h<layout.tip.y,'settings clear rule panel');
  assert(layout.tip.y+layout.tip.h<layout.mode.y,'rule panel clears progress');
  assert(layout.mode.y+layout.mode.h<layout.board.top&&layout.count.y+layout.count.h<layout.board.top,'progress clears board');
  assert.equal(layout.board.width,layout.board.cell*8);assert.equal(layout.board.height,layout.board.cell*12);
  assert(layout.board.bottom<layout.status.y,'board clears message');
  assert(layout.status.y+layout.status.h<layout.start.y,'message clears start');
  assert(layout.start.y+layout.start.h<layout.footer.y,'start clears footer');
 }
 await checkLayout();
 await page.click('#speed');await page.click('#speed');await page.click('#speed');
 assert.match(await page.locator('#speed').innerText(),/マッハ/);assert.equal(await page.evaluate(()=>__namako.speed),6);
 await page.click('#music');await page.click('#track');assert.equal(await page.evaluate(()=>__namako.audio.musicEnabled),false);
 await page.click('#track');assert.equal(await page.evaluate(()=>__namako.audio.trackIndex),2);
 await page.waitForFunction(()=>__namako.audio.music.readyState>=2);
 await page.click('#track');assert.equal(await page.evaluate(()=>__namako.audio.trackIndex),3);await page.waitForFunction(()=>__namako.audio.music.readyState>=2);await page.reload();await page.waitForFunction(()=>window.__namako);assert.equal(await page.evaluate(()=>__namako.audio.trackIndex),3);await page.click('#track');assert.equal(await page.evaluate(()=>__namako.audio.trackIndex),0);
 await page.click('#track');
 await page.click('#start');assert.equal(await page.evaluate(()=>__namako.speed),2,'Mach restricted to demo');
 await page.screenshot({path:path.join(root,'tests','layout_play_540.png')});
 const expected=await page.evaluate(()=>{const g=__namako;g.hardDrop();g.spawn();g.pause();NamakoSession.save(g);return JSON.parse(localStorage.getItem(NamakoSession.key));});
 await page.reload();await page.waitForFunction(()=>window.__namako);assert(await page.locator('#resume-save').isVisible());
 assert.equal(await page.evaluate(()=>__namako.audio.trackIndex),1);assert.equal(await page.evaluate(()=>__namako.audio.musicEnabled),false);
 await page.click('#resume-save');assert.equal(await page.evaluate(()=>__namako.mode),'paused');
 const actual=await page.evaluate(()=>{NamakoSession.save(__namako);return JSON.parse(localStorage.getItem(NamakoSession.key));});assert.deepEqual(actual,expected,'board, falling piece, next piece, RNG and counters restored');
 await page.click('#continue');
 await page.evaluate(()=>{const g=__namako;for(const c of g.cards.enabledCards().filter(c=>c.id!=='card_12'))g.cards.add(c);g.cards.pickReward=()=>g.cards.enabledCards().find(c=>c.id==='card_12');g.model.reset(123);let guard=0;while(!g.model.isClear()&&guard++<120){const sp=g.model.nextSpec(),plan=g.model.demoChoice(g.model.shape(sp.shape));g.model.commit(plan.cells,plan.origin,sp.color);}g.clear();g.finishCelebration();});
 assert.equal(await page.evaluate(()=>__namako.cards.totalOwned()),20);
 await page.reload();await page.waitForFunction(()=>window.__namako);await page.click('#resume-save');
 assert.equal(await page.evaluate(()=>__namako.mode),'reveal');assert.equal(await page.evaluate(()=>__namako.cards.totalOwned()),20,'reload cannot duplicate clear reward');
 await page.click('#reward-next');assert.equal(await page.evaluate(()=>__namako.showingComplete),true);
 await page.waitForTimeout(3100);assert.match(await page.locator('#reward-title').innerText(),/コンプリート/);
 assert.equal(await page.locator('#reward-front').evaluate(el=>el.complete&&el.naturalWidth>0),true);
 await page.screenshot({path:path.join(root,'tests','complete_reward.png')});
 await page.click('#reward-next');assert.equal(await page.evaluate(()=>__namako.cards.completionSeen),true);assert.equal(await page.evaluate(()=>__namako.mode),'trivia');const episodeId=await page.evaluate(()=>__namako.triviaEpisode.id);await page.reload();await page.waitForFunction(()=>window.__namako);await page.click('#resume-save');assert.equal(await page.evaluate(()=>__namako.triviaEpisode.id),episodeId);await page.click('#trivia-next');
 await page.click('#cards-button');assert.equal(await page.locator('#collection-grid .owned').count(),21,'bonus is viewable outside twenty-card collection');await page.click('#collection-close');
 await page.evaluate(()=>__namako.beginDemo());await page.setViewportSize({width:390,height:844});await page.waitForTimeout(7000);
 await checkLayout();
 await page.screenshot({path:path.join(root,'tests','resume_mach_mobile.png')});
 await page.evaluate(()=>localStorage.setItem(NamakoSession.key,'{"version":1,"round":"broken"}'));await page.reload();await page.waitForFunction(()=>window.__namako);
 assert.equal(await page.locator('#resume-save').isVisible(),false,'invalid checkpoint safely ignored');
 assert.equal(await page.evaluate(()=>__namako.cards.totalOwned()),20,'cards retained despite invalid session');
 assert.deepEqual(errors,[]);console.log('PASS resume roundtrip, reward deduplication, twenty-card completion, bonus artwork, four-track persistence, Mach, header and invalid-save recovery');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
