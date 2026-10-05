'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),url=process.env.NAMAKO_TEST_URL||pathToFileURL(path.join(root,'artifacts/web/index.html')).href;
const original=fs.readFileSync(path.join(root,'assets/audio/opening.wav'));
assert.deepEqual(fs.readFileSync(path.join(root,'artifacts/web/assets/audio/opening.wav')),original);
const standalone=fs.readFileSync(path.join(root,'START.html'),'utf8');
const embedded=JSON.parse(standalone.match(/window\.NAMAKO_AUDIO=(\{.*?\});<\/script>/s)[1]);
assert.deepEqual(Buffer.from(embedded.opening.split(',')[1],'base64'),original);
const options=require('./browser_test_support').launchOptions;
const wait=(page,fn)=>page.waitForFunction(fn,null,{polling:50,timeout:10000});
async function open(browser,muted=false){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(muted=>{window.NAMAKO_TEST_MODE=true;window.NAMAKO_TEST_ONBOARDING=true;window.requestAnimationFrame=()=>0;localStorage.setItem('namako_guide_seen_v1','true');if(muted)localStorage.setItem('namako_audio',JSON.stringify({sfx:false}));},muted);
 await page.goto(url);await page.waitForFunction(()=>window.__namako);
 return {context,page,errors};
}
(async()=>{
 const allowed=await chromium.launch({...options,args:['--autoplay-policy=no-user-gesture-required']});
 try{
  const {context,page,errors}=await open(allowed);
  await wait(page,()=>__namako.opening.state==='playing'&&__namako.opening.voice.currentTime>.1);
  assert.equal(await page.evaluate(()=>__namako.audio.music.paused),true,'BGM stays stopped during opening');
  assert(Math.abs(await page.evaluate(()=>__namako.opening.voice.duration)-1.8507936507936509)<.001);
  await page.locator('#intro-language').tap();
  assert.equal(await page.evaluate(()=>__namako.opening.generation),1,'language tap must not restart clip');
  assert.equal(await page.locator('#intro-audio').textContent(),'■ Stop audio');
  await page.locator('#intro-audio').tap();assert.equal(await page.evaluate(()=>__namako.opening.voice.paused),true);
  await page.locator('#intro-audio').tap();await wait(page,()=>__namako.opening.state==='done');
  await page.locator('#intro-title').tap();assert.equal(await page.evaluate(()=>__namako.opening.voice.paused),true,'completed clip must not repeat on later taps');
  await page.locator('#intro-audio').tap();await wait(page,()=>__namako.opening.state==='playing');
  await page.locator('#intro-demo').tap();assert.equal(await page.evaluate(()=>__namako.opening.voice.paused&&__namako.opening.voice.currentTime===0&&!__namako.audio.openingActive),true,'leaving guide stops opening');
  await wait(page,()=>!__namako.audio.music.paused);
  await page.locator('#start').tap();await page.locator('#menu').tap();await page.locator('#help-open').tap();
  assert.equal(await page.evaluate(()=>__namako.opening.state),'ready','menu help opens silently');
  await page.locator('#intro-title').tap();assert.equal(await page.evaluate(()=>__namako.opening.voice.paused),true);
  await page.locator('#intro-audio').tap();await wait(page,()=>__namako.opening.state==='playing');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  assert.equal(await page.evaluate(()=>__namako.opening.voice.paused&&__namako.audio.music.paused),true,'hidden tab stops both audio streams');
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  assert.equal(await page.evaluate(()=>__namako.opening.voice.paused),true,'returning tab does not unexpectedly replay');
  // Pending play completion must not revive the clip after closing the guide.
  await page.evaluate(()=>{__namako.opening.voice.play=()=>new Promise(resolve=>window.resolveOpening=resolve);__namako.opening.play();});
  await page.locator('#intro-return').tap();await page.evaluate(()=>window.resolveOpening());
  assert.equal(await page.evaluate(()=>__namako.opening.active||__namako.opening.state==='playing'||__namako.opening.pending),false);
  assert.deepEqual(errors,[]);await context.close();
  const muted=await open(allowed,true);assert.equal(await muted.page.locator('#intro-audio').isDisabled(),true);
  assert.equal(await muted.page.evaluate(()=>__namako.opening.voice.paused&&__namako.opening.state==='muted'),true,'saved SFX OFF respected');await muted.context.close();
 }finally{await allowed.close();}
 const restricted=await chromium.launch({...options,args:['--autoplay-policy=document-user-activation-required','--disable-features=PreloadMediaEngagementData,MediaEngagementBypassAutoplayPolicies']});
 try{
  const {context,page,errors}=await open(restricted);
  await wait(page,()=>__namako.opening.state==='blocked');
  assert.equal(await page.locator('#intro-audio').textContent(),'▶ タップで音声を再生');
  await page.locator('#intro-title').tap();await wait(page,()=>__namako.opening.state==='playing'&&__namako.opening.voice.currentTime>.1);
  assert.equal(await page.evaluate(()=>__namako.audio.music.paused),true);
  await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));assert.equal(await page.evaluate(()=>__namako.opening.voice.paused),true);
  assert.deepEqual(errors,[]);await context.close();
 }finally{await restricted.close();}
 console.log('PASS opening audio: exact WAV in split/standalone builds, real autoplay and mobile tap fallback, single playback, stop/replay, JA/EN, BGM isolation, SFX OFF, exit/hidden-tab cancellation.');
})().catch(e=>{console.error(e);process.exitCode=1;});
