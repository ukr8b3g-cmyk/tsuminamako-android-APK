'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const site=path.resolve(__dirname,'../artifacts/web');
const wait=(page,fn)=>page.waitForFunction(fn,null,{polling:25,timeout:10000});
(async()=>{const browser=await chromium.launch(require('./browser_test_support').launchOptions);try{
 for(const language of ['ja','en']){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await context.route('https://namako.test/**',async route=>{const url=new URL(route.request().url()),file=path.resolve(site,'.'+decodeURIComponent(url.pathname));assert(file.startsWith(site+path.sep));const type=file.endsWith('.wav')?'audio/wav':file.endsWith('.webp')?'image/webp':file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html';await route.fulfill({body:fs.readFileSync(file),contentType:type});});
  await page.addInitScript(language=>{window.NAMAKO_TEST_MODE=true;window.NAMAKO_TEST_LANGUAGE=language;window.requestAnimationFrame=()=>0;},language);
  await page.goto('https://namako.test/index.html');await wait(page,()=>window.__namako);await page.evaluate(()=>__namako.audio.narration.preloaded);assert.equal(await page.evaluate(()=>__namako.audio.narration.cache.size),4,'all four narration clips cached');
  await page.locator('#lore-button').tap();await wait(page,()=>__namako.audio.voicePlaying('professor_voice'));assert.equal(await page.evaluate(()=>__namako.audio.music.paused),true);
  await page.locator('#trivia-audio').tap();assert.equal(await page.evaluate(()=>__namako.audio.narration.voice.paused),true);await wait(page,()=>!__namako.audio.music.paused);
  await page.locator('#trivia-audio').tap();await wait(page,()=>__namako.audio.voicePlaying('professor_voice'));
  for(const viewport of [{width:320,height:568},{width:390,height:844},{width:430,height:932},{width:844,height:390}]){
   await page.setViewportSize(viewport);await page.evaluate(()=>__namako.resize());
   await page.locator('#trivia-audio').scrollIntoViewIfNeeded();const rect=await page.locator('#trivia-audio').boundingBox();assert(rect.height>=43.5&&rect.width>=44);assert(rect.x>=0&&rect.y>=0&&rect.x+rect.width<=viewport.width+1&&rect.y+rect.height<=viewport.height+1,JSON.stringify({viewport,rect}));
  }
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>__namako.resize());
  for(const id of ['trivia-professor-thumb','trivia-dog-open','trivia-dolphin-open']){
   for(let i=0;i<2;i++){
    await page.locator('#'+id).tap();await wait(page,()=>__namako.audio.narration.voice.currentTime>.04&&__namako.audio.narration.state==='playing');assert.equal(await page.evaluate(()=>__namako.audio.music.paused),true);
    const current=await page.evaluate(()=>__namako.audio.narration.current);await page.locator('#trivia-card-audio').tap();await page.locator('#trivia-card-audio').tap();await wait(page,()=>__namako.audio.narration.state==='playing');assert.equal(await page.evaluate(()=>__namako.audio.narration.current),current);
    const hit=await page.locator('#trivia-card-audio').boundingBox();assert(hit.height>=44);await page.locator('#trivia-card-close').tap();assert.equal(await page.evaluate(()=>__namako.audio.narration.voice.paused),true);
   }
  }
  // A one-off loading interruption retries once, using the same player.
  await page.evaluate(()=>{const n=__namako.audio.narration;n.realPlay=n.voice.play.bind(n.voice);n.testCalls=0;n.voice.play=()=>++n.testCalls===1?Promise.reject(new DOMException('test interruption','AbortError')):n.realPlay();});
  await page.locator('#trivia-professor-thumb').tap();await wait(page,()=>__namako.audio.voicePlaying('professor_card_voice'));assert.equal(await page.evaluate(()=>__namako.audio.narration.testCalls),2);assert.equal(await page.evaluate(()=>__namako.audio.narration.retries),1);await page.locator('#trivia-card-close').tap();
  // Permission denial does not retry automatically; the visible control recovers by tap.
  await page.evaluate(()=>{const n=__namako.audio.narration;n.testCalls=0;n.voice.play=()=>{++n.testCalls;return Promise.reject(new DOMException('test policy','NotAllowedError'));};});
  await page.locator('#trivia-dog-open').tap();await wait(page,()=>__namako.audio.narration.state==='blocked');assert.equal(await page.evaluate(()=>__namako.audio.narration.testCalls),1);await wait(page,()=>!__namako.audio.music.paused);
  await page.evaluate(()=>{const n=__namako.audio.narration;n.voice.play=n.realPlay;});await page.locator('#trivia-card-audio').tap();await wait(page,()=>__namako.audio.voicePlaying('dog_card_voice'));await page.locator('#trivia-card-close').tap();
  // Persistent failure terminates, restores BGM and leaves the replay button usable.
  await page.evaluate(()=>{const n=__namako.audio.narration;n.testCalls=0;n.voice.play=()=>{++n.testCalls;return Promise.reject(new DOMException('test network','NetworkError'));};});
  await page.locator('#trivia-dolphin-open').tap();await wait(page,()=>__namako.audio.narration.state==='error');assert.equal(await page.evaluate(()=>__namako.audio.narration.testCalls),2);await wait(page,()=>!__namako.audio.music.paused);assert.equal(await page.locator('#trivia-card-audio').isEnabled(),true);await page.locator('#trivia-card-close').tap();
  // Closing during pending playback cancels the old promise and retry.
  await page.evaluate(()=>{const n=__namako.audio.narration;n.voice.play=()=>new Promise(resolve=>{n.testResolve=resolve;});});await page.locator('#trivia-professor-thumb').tap();await page.locator('#trivia-card-close').tap();await page.evaluate(()=>__namako.audio.narration.testResolve());assert.equal(await page.evaluate(()=>__namako.audio.narration.state), 'idle');assert.equal(await page.evaluate(()=>__namako.audio.narrationActive),false);
  await page.evaluate(()=>{const n=__namako.audio.narration;n.voice.play=n.realPlay;__namako.audio.musicEnabled=false;__namako.audio.apply();});await page.locator('#trivia-dog-open').tap();await wait(page,()=>__namako.audio.voicePlaying('dog_card_voice'));await page.locator('#trivia-card-close').tap();assert.equal(await page.evaluate(()=>__namako.audio.music.paused),true,'BGM OFF remains OFF');
  await page.evaluate(()=>__namako.audio.toggleSfx());await page.locator('#trivia-professor-thumb').tap();assert.equal(await page.locator('#trivia-card-audio').isEnabled(),false);assert.equal(await page.evaluate(()=>__namako.audio.narration.voice.paused),true);await page.locator('#trivia-card-close').tap();await page.evaluate(()=>__namako.audio.toggleSfx());
  await page.locator('#trivia-dolphin-open').tap();await wait(page,()=>__namako.audio.voicePlaying('dolphin_card_voice'));await page.evaluate(()=>__namako.audio.suspend());assert.equal(await page.evaluate(()=>__namako.audio.narration.voice.paused&&__namako.audio.music.paused),true);await page.evaluate(()=>__namako.audio.resumeAudio());assert.equal(await page.evaluate(()=>__namako.audio.narration.voice.paused),true,'foreground does not replay old speech');await page.locator('#trivia-card-audio').tap();await wait(page,()=>__namako.audio.voicePlaying('dolphin_card_voice'));
  assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>NamakoI18n.missing.size),0);await context.close();
 }
 console.log('PASS narration recovery: JA/EN, four preloaded clips, actual entry/card/replay audio, touch targets, BGM pause/resume/OFF, one transient retry, bounded persistent failure, policy-denied tap recovery, stale promise cancellation and background silence.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
