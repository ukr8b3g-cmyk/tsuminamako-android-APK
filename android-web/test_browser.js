'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),site=path.join(root,'artifacts/apk-site'),entry='https://appassets.androidplatform.net/assets/site/index.html';
const legacy=Object.fromEntries(['namako_cards.cfg','namako_settings.cfg','namako_session.cfg','namako_language.cfg'].map(name=>[name,fs.readFileSync(path.join(__dirname,'.build/legacy',name),'utf8')]));
const wait=(page,fn)=>page.waitForFunction(fn,null,{polling:50,timeout:10000});
async function route(context,saved){
 await context.route('**/*',async request=>{
  const url=new URL(request.request().url());if(url.origin!=='https://appassets.androidplatform.net'||!url.pathname.startsWith('/assets/site/'))throw new Error('Unexpected external request: '+url);
  const relative=decodeURIComponent(url.pathname.slice('/assets/site/'.length)),file=path.resolve(site,relative);assert(file.startsWith(site+path.sep));
  let body=fs.readFileSync(file);if(relative==='index.html')body=Buffer.from(body.toString().replace('/*NATIVE_LEGACY_DATA*/null',JSON.stringify(saved||{}).replace(/</g,'\\u003c')));
  const type=file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.webp')?'image/webp':file.endsWith('.wav')?'audio/wav':'text/html';await request.fulfill({status:200,contentType:type,body});
 });
}
(async()=>{const browser=await chromium.launch(require('../tests/browser_test_support').launchOptions);try{
 for(const language of ['ja','en']){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await route(context,null);
  await page.addInitScript(language=>{window.NAMAKO_TEST_MODE=true;window.NAMAKO_TEST_ONBOARDING=true;window.NAMAKO_TEST_LANGUAGE=language;window.requestAnimationFrame=()=>0;},language);
  await page.goto(entry);await wait(page,()=>window.TsumiNamakoAndroid&&window.__namako);
  assert.equal(await page.locator('#intro-layer').isVisible(),true);await page.locator('#intro-audio').tap();await wait(page,()=>game.opening.voice.currentTime>.05);
  await page.locator('#intro-demo').tap();assert.equal(await page.evaluate(()=>game.opening.voice.paused),true);
  await page.locator('#settings-open').tap();assert.equal(await page.evaluate(()=>TsumiNamakoAndroid.back()&&!game.settingsOpen),true);
  await page.locator('#lore-button').tap();assert.equal(await page.locator('.trivia-companion').count(),3);
  for(const [id,name]of [['trivia-professor-thumb','professor_card_voice'],['trivia-dolphin-open','dolphin_card_voice'],['trivia-dog-open','dog_card_voice']]){
   await page.locator('#'+id).tap();await page.waitForFunction(name=>game.audio.voicePlaying(name)&&game.audio.narration.voice.currentTime>.05,name,{polling:50,timeout:10000});
   assert.equal(await page.evaluate(()=>game.audio.music.paused),true);await page.locator('#trivia-card-audio').tap();assert.equal(await page.evaluate(()=>game.audio.narration.voice.paused),true);await page.locator('#trivia-card-audio').tap();await wait(page,()=>game.audio.narration.state==='playing');await page.evaluate(()=>TsumiNamakoAndroid.pause());assert.equal(await page.evaluate(()=>game.audio.narration.voice.paused&&game.audio.music.paused),true);await page.evaluate(()=>TsumiNamakoAndroid.resume());assert.equal(await page.evaluate(()=>game.audio.narration.voice.paused),true);await page.locator('#trivia-card-audio').tap();await wait(page,()=>game.audio.narration.state==='playing');assert.equal(await page.evaluate(()=>TsumiNamakoAndroid.back()&&document.getElementById('trivia-card-viewer').hidden),true);
   assert.equal(await page.evaluate(()=>game.audio.narration.voice.paused&&!game.audio.narrationActive),true);
  }
  assert.equal(await page.evaluate(()=>TsumiNamakoAndroid.back()&&game.mode==='demo'),true);
  await page.evaluate(()=>{game.cards.collection.card_01=1;game.cards.save();});await page.locator('#cards-button').tap();assert.equal(await page.evaluate(()=>TsumiNamakoAndroid.back()&&!game.collectionOpen),true);
  await page.evaluate(()=>game.beginPlay(123));assert.equal(await page.evaluate(()=>TsumiNamakoAndroid.back()&&game.mode==='paused'),true);assert.equal(await page.evaluate(()=>TsumiNamakoAndroid.back()&&game.mode==='play'),true);
  const round=await page.evaluate(()=>game.roundId);await page.evaluate(()=>TsumiNamakoAndroid.pause());
  const stopped=await page.evaluate(()=>({mode:game.mode,music:game.audio.music.paused,voices:game.audio.narration.voice.paused&&Object.values(game.audio.voices).every(bank=>bank.every(a=>a.paused)),saved:NamakoSession.read()?.round,clock:game.clock}));
  assert.equal(stopped.mode,'paused');assert.equal(stopped.music,true);assert.equal(stopped.voices,true);assert.equal(stopped.saved,round);
  await page.evaluate(()=>game.update(5));assert.equal(await page.evaluate(()=>game.clock),stopped.clock,'background freezes demo/celebration/notebook updates');await page.evaluate(()=>TsumiNamakoAndroid.resume());
  await page.reload();await wait(page,()=>window.TsumiNamakoAndroid);assert.equal(await page.locator('#resume-save').isVisible(),true);await page.locator('#resume-save').tap();assert.equal(await page.evaluate(()=>game.roundId),round);
  assert.equal(await page.evaluate(()=>NamakoI18n.missing.size),0);assert.deepEqual(errors,[]);await context.close();
 }
 for(const existing of [false,true]){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();await route(context,legacy);
  await page.addInitScript(existing=>{window.NAMAKO_TEST_MODE=true;window.requestAnimationFrame=()=>0;if(existing&&localStorage.getItem('namako_cards')===null)localStorage.setItem('namako_cards',JSON.stringify({card_01:10}));},existing);
  await page.goto(entry);await wait(page,()=>window.__namako&&window.TsumiNamakoAndroid);
  assert.equal(await page.evaluate(()=>game.cards.owned('card_01')),existing?10:3);assert.equal(await page.evaluate(()=>game.cards.owned('card_02')),existing?0:1);
  assert.equal(await page.evaluate(()=>game.audio.musicEnabled),false);assert.equal(await page.evaluate(()=>game.audio.musicLevel),.35);assert.equal(await page.evaluate(()=>game.audio.trackIndex),3);assert.equal(await page.evaluate(()=>game.difficultyIndex),0);assert.equal(await page.evaluate(()=>game.speedIndex),3);assert.equal(await page.evaluate(()=>game.lcd&&game.reduced),true);assert.equal(await page.evaluate(()=>NamakoI18n.locale),'en');
  assert.equal(await page.evaluate(()=>NamakoSession.read()?.round),'legacy-round');await page.locator('#resume-save').tap();assert.equal(await page.evaluate(()=>game.roundId),'legacy-round');assert.equal(await page.evaluate(()=>game.mode),'paused');
  await page.evaluate(()=>{game.cards.collection.card_01=12;game.cards.save();});await page.reload();await wait(page,()=>window.__namako);assert.equal(await page.evaluate(()=>game.cards.owned('card_01')),12,'one-time import does not overwrite newer collection');await context.close();
 }
 console.log('PASS extracted APK HTTPS content: JA/EN opening+audio, 3 card voices, nested Android Back, background freeze/silence, resume after reload; real Godot ConfigFile migration of cards/settings/language/session and no overwrite of newer data.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
