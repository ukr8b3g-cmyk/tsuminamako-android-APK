'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
(async()=>{const browser=await chromium.launch(require('./browser_test_support').launchOptions);try{
 for(const theme of ['light','dark','lcd'])for(const size of [[320,568],[412,915]]){
  const context=await browser.newContext({locale:'en-US',viewport:{width:size[0],height:size[1]}});
  await context.addInitScript(()=>{window.NAMAKO_TEST_MODE=true;window.requestAnimationFrame=()=>0;});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve(__dirname,'../START.html')).href);await page.waitForFunction(()=>window.__namako);
  await page.evaluate(theme=>{const g=__namako;g.audio.musicEnabled=false;g.audio.sfxEnabled=false;g.dark=theme==='dark';g.lcd=theme==='lcd';g.applyTheme();if(NamakoI18n.locale!=='ja'||document.querySelector('h1').textContent!=='つみなまこ')throw Error('English OS must start in Japanese');g.beginPlay(123);g.model.commit(g.model.shape(0),[0,11],1);g.sync();window.before=JSON.stringify({board:g.model.board,origin:g.origin,next:g.next,kept:g.model.kept,round:g.roundId,mode:g.mode});window.cycle=g.trivia.remaining.slice();},theme);
  await page.locator('#settings-open').click();
  for(const id of ['settings-title','language-toggle']){const r=await page.locator('#'+id).boundingBox();assert(r.x>=0&&r.x+r.width<=size[0]&&r.y>=0&&r.y+r.height<=size[1]);}
  const heading=await page.locator('#settings-title').boundingBox(),button=await page.locator('#language-toggle').boundingBox();assert(heading.x+heading.width<button.x);
  await page.locator('#language-toggle').click();
  await page.evaluate(()=>{const g=__namako;if(NamakoI18n.locale!=='en'||document.querySelector('h1').textContent!=='Tsumi Namako'||document.getElementById('rotate').textContent!=='Rotate')throw Error('English UI switch');if(JSON.stringify({board:g.model.board,origin:g.origin,next:g.next,kept:g.model.kept,round:g.roundId,mode:g.mode})!==before)throw Error('Language switch reset game');if(String(g.trivia.remaining)!==String(cycle))throw Error('Reading history reset');if(g.trivia.episodes.some(e=>/[ぁ-んァ-ヶ一-龯]/u.test(e.title+e.body)))throw Error('English lore missing');if(g.cards.enabledCards().some(c=>!c.image.includes('/en/')))throw Error('English card art missing');if(!document.getElementById('trivia-dog-card').src.includes('base64'))throw Error('Embedded companion image');});
  if(size[0]===412&&theme==='dark')await page.screenshot({path:path.join(__dirname,'language_settings_en.png')});
  await page.reload();await page.waitForFunction(()=>window.__namako);assert.equal(await page.evaluate(()=>NamakoI18n.locale),'en');
  await page.locator('#settings-open').click();await page.locator('#language-toggle').click();await page.locator('#settings-close').click();
  await page.evaluate(()=>{const g=__namako;if(NamakoI18n.locale!=='ja'||document.getElementById('rotate').textContent!=='回す'||g.cards.enabledCards().some(c=>c.image.includes('/en/')))throw Error('Japanese restore');g.openLore();if(!/[ぁ-んァ-ヶ一-龯]/u.test(document.getElementById('trivia-body').textContent))throw Error('Japanese lore restore');g.finishTrivia();g.beginPlay(1);g.reduced=false;for(const x of [0,2,4]){g.active=g.model.shape(0);g.activeColor=0;g.origin=[x,11];g.visual=g.origin.slice();g.phase=0;g.lock();}g.draw();if(g.model.fillCount()!==0||!g.matchEffect)throw Error('Same-colour rule changed');g.update(.1);const p=g.matchPose();if(p.join<=0||p.join>=1||p.fade!==0||p.fused!==0)throw Error('Joining stage');g.draw();});
  if(size[0]===412)await page.screenshot({path:path.join(__dirname,`jelly_${theme}_join.png`)});
  await page.evaluate(()=>{const g=__namako;g.update(.3);const p=g.matchPose();if(p.fused!==1||p.fade!==0||p.jelly===0||p.bubbles!==0)throw Error('Jelly should be connected and opaque before bubbling');g.draw();g.openSettings();window.effectTime=g.matchEffect.t;g.update(.3);if(g.matchEffect.t!==effectTime)throw Error('Settings did not freeze jelly');g.toggleLanguage();if(g.matchEffect.t!==effectTime)throw Error('Switch restarted jelly');g.closeSettings();});
  if(size[0]===412)await page.screenshot({path:path.join(__dirname,`jelly_${theme}_fused.png`)});
  await page.evaluate(()=>{const g=__namako;if(/[ぁ-んァ-ヶ一-龯]/u.test(document.getElementById('status').textContent))throw Error('Status did not switch to English');g.update(.28);const p=g.matchPose();if(p.fade<=0||p.fade>=1||p.bubbles<=0)throw Error('Delayed bubble fade');g.draw();});
  if(size[0]===412)await page.screenshot({path:path.join(__dirname,`jelly_${theme}_bubbles.png`)});
  await page.evaluate(()=>{const g=__namako;g.update(.23);if(g.matchEffect||g.model.fillCount()!==0||!g.model.verifyInvariants())throw Error('Jelly must disappear');g.reduced=true;g.beginPlay(1);for(const x of [0,2,4]){g.active=g.model.shape(0);g.activeColor=0;g.origin=[x,11];g.visual=g.origin.slice();g.phase=0;g.lock();}g.update(.1);if(g.matchPose().fused!==0||g.matchPose().jelly!==0)throw Error('Reduced motion must avoid jelly motion');g.update(.26);if(g.matchEffect)throw Error('Reduced fade must finish');if(NamakoI18n.missing.size)throw Error('Missing translations');});
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS 6 cases: Japanese default on English OS, actual button EN/JA switching and persistence, unchanged board and reading history, bilingual artwork, safe settings header, join/opaque jelly/delayed bubbles, pause, reduced motion');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
