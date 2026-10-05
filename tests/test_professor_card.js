'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),url=process.env.NAMAKO_TEST_URL||pathToFileURL(path.join(root,'artifacts/web/index.html')).href;
const embedded=JSON.parse(fs.readFileSync(path.join(root,'START.html'),'utf8').match(/window\.NAMAKO_AUDIO=(\{.*?\});<\/script>/s)[1]);
const voices=['professor_card_voice','dog_card_voice','dolphin_card_voice'];
for(const name of voices){const original=fs.readFileSync(path.join(root,`assets/audio/${name}.wav`));assert.deepEqual(fs.readFileSync(path.join(root,`artifacts/web/assets/audio/${name}.wav`)),original);assert.deepEqual(Buffer.from(embedded[name].split(',')[1],'base64'),original);}
const wait=(page,fn)=>page.waitForFunction(fn,null,{polling:50,timeout:10000});
const stopped=page=>page.evaluate(()=>['professor_card_voice','dog_card_voice','dolphin_card_voice'].every(name=>__namako.audio.voices[name].every(a=>a.paused&&a.currentTime===0)));
(async()=>{const browser=await chromium.launch(require('./browser_test_support').launchOptions);try{
 for(const language of ['ja','en']){
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(language=>{window.NAMAKO_TEST_MODE=true;window.NAMAKO_TEST_LANGUAGE=language;window.requestAnimationFrame=()=>0;},language);
  await page.goto(url);await page.waitForFunction(()=>window.__namako);
  const musicLevel=await page.evaluate(()=>__namako.audio.music.volume);
  await page.locator('#lore-button').tap();await wait(page,()=>__namako.audio.voicePlaying('professor_voice'));
  assert.equal(await page.locator('.trivia-companion').count(),3);
  assert.match(await page.locator('#trivia-professor-card').getAttribute('src'),new RegExp(`trivia_professor${language==='en'?'_en':''}\\.webp$`));
  assert.equal(await page.locator('#trivia-professor-thumb span').textContent(),language==='ja'?'博士':'Doctor');
  for(const viewport of [{width:320,height:568},{width:390,height:844},{width:430,height:932},{width:844,height:390}]){
   await page.setViewportSize(viewport);
   for(const theme of ['light','dark','lcd']){
    await page.evaluate(theme=>{__namako.lcd=theme==='lcd';__namako.dark=theme==='dark';__namako.applyTheme();__namako.resize();},theme);
    const layout=await page.evaluate(()=>{
     const bounds=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
     return {lab:bounds(document.querySelector('.trivia-lab')),speech:bounds(document.querySelector('.trivia-speech')),cards:[...document.querySelectorAll('.trivia-companion')].map(e=>({...bounds(e),visible:!e.hidden,loaded:e.querySelector('img').complete&&e.querySelector('img').naturalWidth>0,hit:document.elementFromPoint(e.getBoundingClientRect().x+e.getBoundingClientRect().width/2,e.getBoundingClientRect().y+e.getBoundingClientRect().height/2)?.closest('button')===e}))};
    });
    for(const [i,card] of layout.cards.entries()){
     assert(card.visible&&card.loaded&&card.hit,`${language}/${theme}/${viewport.width}: thumbnail ${i} must be visible and tappable`);
     assert(card.width>=44&&card.height>=44,'minimum 44px touch target');
     assert(card.x>=layout.lab.x&&card.right<=layout.lab.right&&card.y>=layout.lab.y&&card.bottom<=layout.lab.bottom,'cards inside lab');
     assert(card.y>layout.speech.bottom,'cards clear the speech bubble');
     if(i)assert(card.x>layout.cards[i-1].right,'separate thumbnails');
    }
   }
  }
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{__namako.lcd=false;__namako.dark=true;__namako.applyTheme();__namako.resize();});
  if(process.env.NAMAKO_SCREENSHOTS){fs.mkdirSync(path.join(root,'artifacts/tests'),{recursive:true});await page.screenshot({path:path.join(root,`artifacts/tests/professor_thumbnails_${language}.png`)});}
  await page.locator('#trivia-professor-thumb').tap();await wait(page,()=>__namako.audio.voices.professor_card_voice[0].currentTime>.05);
  assert.equal(await page.locator('#trivia-card-viewer').isVisible(),true);
  assert.equal(await page.evaluate(()=>document.getElementById('trivia-card-large').src),await page.evaluate(()=>document.getElementById('trivia-professor-card').src));
  assert.equal(await page.evaluate(()=>__namako.audio.voicePlaying('professor_voice')),false,'notes entry voice stops before card voice');
  assert(Math.abs(await page.evaluate(()=>__namako.audio.voices.professor_card_voice[0].duration)-2.96)<.001);
  assert(Math.abs(await page.evaluate(()=>__namako.audio.music.volume)-musicLevel*.3)<.0001);
  await page.locator('#trivia-card-close').tap();assert.equal(await stopped(page),true);
  assert(Math.abs(await page.evaluate(()=>__namako.audio.music.volume)-musicLevel)<.0001,'close restores BGM');
  await page.locator('#trivia-professor-thumb').tap();await wait(page,()=>__namako.audio.voicePlaying('professor_card_voice'));
  assert.equal(await page.evaluate(()=>__namako.audio.voiceIndex.professor_card_voice),2,'one voice per opening');
  await wait(page,()=>__namako.audio.voices.professor_card_voice[1].ended&&!__namako.audio.narrationActive);
  assert(Math.abs(await page.evaluate(()=>__namako.audio.music.volume)-musicLevel)<.0001,'ended restores BGM');
  await page.locator('#trivia-card-close').tap();
  for(const [id,name,duration] of [['trivia-dog-open','dog_card_voice',3.2],['trivia-dolphin-open','dolphin_card_voice',2.034467120181406]]){
   await page.locator('#'+id).tap();await page.waitForFunction(name=>__namako.audio.voices[name].some(a=>!a.paused&&a.currentTime>.05),name,{polling:50,timeout:10000});
   const state=await page.evaluate(name=>({duration:__namako.audio.voices[name].find(a=>!a.paused).duration,playing:['professor_card_voice','dog_card_voice','dolphin_card_voice','professor_voice'].filter(n=>__namako.audio.voicePlaying(n))}),name);
   assert(Math.abs(state.duration-duration)<.001);assert.deepEqual(state.playing,[name],'only matching card speech');
   assert(Math.abs(await page.evaluate(()=>__namako.audio.music.volume)-musicLevel*.3)<.0001);await page.locator('#trivia-card-close').tap();assert.equal(await stopped(page),true);
  }
  await page.locator('#trivia-professor-open').tap();await wait(page,()=>__namako.audio.voicePlaying('professor_card_voice'));await page.locator('#trivia-card-large').tap();assert.equal(await stopped(page),true,'portrait opens same card and image tap stops voice');
  await page.evaluate(()=>__namako.audio.toggleSfx());for(const id of ['trivia-professor-thumb','trivia-dog-open','trivia-dolphin-open']){await page.locator('#'+id).tap();assert.equal(await stopped(page),true,'SFX OFF respected');await page.locator('#trivia-card-close').tap();}await page.evaluate(()=>__namako.audio.toggleSfx());
  await page.locator('#trivia-professor-thumb').tap();await wait(page,()=>__namako.audio.voicePlaying('professor_card_voice'));await page.evaluate(()=>__namako.finishTrivia());assert.equal(await stopped(page),true,'notes exit stops card speech');
  await page.locator('#lore-button').tap();await page.locator('#trivia-professor-thumb').tap();await wait(page,()=>__namako.audio.voicePlaying('professor_card_voice'));await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));assert.equal(await stopped(page),true,'page exit stops card speech');
  await page.locator('#trivia-card-close').tap();await page.locator('#trivia-professor-thumb').tap();await wait(page,()=>__namako.audio.voicePlaying('professor_card_voice'));
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await stopped(page),true,'background stops card speech');
  assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>NamakoI18n.missing.size),0);await context.close();
 }
 console.log('PASS character cards: 3 existing bilingual thumbnails; 320/390/430 portrait and landscape in all themes; matching doctor/dog/dolphin WAV playback, no overlapping speech, replay, BGM duck/restore, SFX OFF and close/exit/background cancellation.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
