'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const url=process.env.NAMAKO_TEST_URL||pathToFileURL(path.resolve(__dirname,'../artifacts/web/index.html')).href;
(async()=>{const browser=await chromium.launch(require('./browser_test_support').launchOptions);let cases=0;try{
 for(const lang of ['ja','en'])for(const [width,height,dpr]of [[320,568,2],[390,844,3],[412,915,3],[430,932,3],[915,412,2]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,isMobile:true,hasTouch:true,locale:'en-US'}),page=await context.newPage(),errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failed.push(r.url()));
  await page.addInitScript(()=>{window.NAMAKO_TEST_MODE=true;window.NAMAKO_TEST_ONBOARDING=true;window.requestAnimationFrame=()=>0;});
  await page.goto(url);await page.waitForFunction(()=>window.__namako);assert.equal(await page.locator('#intro-layer').isVisible(),true);
  assert.equal(await page.evaluate(()=>NamakoI18n.locale),'ja');
  if(lang==='en')await page.locator('#intro-language').tap();
  await page.evaluate(()=>{const g=__namako,t=g.clock;g.update(1);if(t!==g.clock||!document.getElementById('wrap').inert)throw Error('Guide must freeze play and block background controls');if(document.documentElement.scrollWidth>innerWidth+1)throw Error('Guide overflows horizontally');if(NamakoI18n.missing.size)throw Error('Missing guide translations');});
  // Transformed quads may round a 44px box by a few millionths of a pixel.
  for(const id of ['intro-play','intro-demo','intro-language']){const box=await page.locator('#'+id).boundingBox();assert(box.width+.01>=44&&box.height+.01>=44,id+' '+JSON.stringify(box));}
  if(width===390)await page.screenshot({path:path.join(__dirname,`mobile_intro_${lang}.png`),fullPage:true});
  await page.locator('#intro-demo').tap();assert.equal(await page.evaluate(()=>__namako.mode),'demo');
  await page.reload();await page.waitForFunction(()=>window.__namako);assert.equal(await page.locator('#intro-layer').isVisible(),false);
  await page.locator('#start').tap();await page.evaluate(()=>{__namako.audio.musicEnabled=false;__namako.audio.sfxEnabled=false;__namako.active=__namako.model.shape(1);__namako.origin=[3,1];__namako.visual=[3,1];__namako.phase=0;__namako.entryRoute=[];__namako.sync();});
  for(const theme of ['dark','light','lcd']){
   await page.evaluate(theme=>{const g=__namako;g.dark=theme==='dark';g.lcd=theme==='lcd';g.applyTheme();g.sync();},theme);
   for(const id of ['settings-open','difficulty','menu','lore-button','cards-button','left','right','rotate','drop']){const box=await page.locator('#'+id).boundingBox();assert(box.width+.01>=44&&box.height+.01>=44, theme+' '+id+' touch target');}
   const tip=await page.locator('#tip').boundingBox(),header=await page.locator('#menu').boundingBox();assert(header.y+header.height<tip.y,'LCD/header must not overlap instructions');
  }
  await page.evaluate(()=>{__namako.dark=true;__namako.lcd=false;__namako.applyTheme();__namako.sync();});
  const x=await page.evaluate(()=>__namako.origin[0]);await page.locator('#left').tap();assert.equal(await page.evaluate(()=>__namako.origin[0]),x-1);
  await page.locator('#right').tap();assert.equal(await page.evaluate(()=>__namako.origin[0]),x);
  const shape=await page.evaluate(()=>JSON.stringify(__namako.active));await page.locator('#rotate').tap();assert.notEqual(await page.evaluate(()=>JSON.stringify(__namako.active)),shape);
  await page.locator('#menu').tap();assert.equal(await page.evaluate(()=>__namako.mode),'paused');assert.match(await page.locator('#modal-title').textContent(),lang==='en'?/Game menu/:/ゲームメニュー/);
  const board=await page.evaluate(()=>JSON.stringify(__namako.model.board));await page.locator('#help-open').tap();assert.equal(await page.locator('#intro-layer').isVisible(),true);await page.locator('#intro-return').tap();assert.equal(await page.evaluate(()=>JSON.stringify(__namako.model.board)),board);assert.equal(await page.evaluate(()=>__namako.mode),'paused');
  await page.locator('#continue').tap();assert.equal(await page.evaluate(()=>__namako.mode),'play');await page.locator('#menu').tap();await page.locator('#help-open').tap();await page.locator('#intro-play').tap();assert.equal(await page.evaluate(()=>__namako.mode),'play');
  await page.locator('#settings-open').tap();await page.locator('#language-toggle').tap();await page.locator('#settings-close').tap();
  await page.evaluate(()=>{if(NamakoI18n.missing.size)throw Error('Missing translations');if(document.documentElement.scrollWidth>innerWidth+1)throw Error('Play layout overflows horizontally');});
  if(width===390)await page.screenshot({path:path.join(__dirname,`mobile_play_${lang}.png`)});
  if(width===390&&lang==='ja'){
   const point=await page.evaluate(()=>{const r=document.getElementById('stage').getBoundingClientRect(),g=__namako;return{x:r.left+(B.x+(g.origin[0]+.5)*B.c)*g.scale,y:r.top+(B.y+2.5*B.c)*g.scale,cell:B.c*g.scale};});
   const beforeTap=await page.evaluate(()=>JSON.stringify(__namako.active));await page.touchscreen.tap(point.x,point.y);assert.notEqual(await page.evaluate(()=>JSON.stringify(__namako.active)),beforeTap,'tap aquarium to rotate');
   const cdp=await context.newCDPSession(page),send=(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y,id:1}]});
   const beforeSlide=await page.evaluate(()=>__namako.origin[0]);await send('touchStart',point.x,point.y);await send('touchMove',point.x+point.cell*1.25,point.y);await send('touchEnd');assert.equal(await page.evaluate(()=>__namako.origin[0]),beforeSlide+1,'slide aquarium to move');
   const beforeDrop=await page.evaluate(()=>__namako.model.turns);await send('touchStart',point.x,point.y);await send('touchMove',point.x,point.y+point.cell*2);await send('touchEnd');assert.equal(await page.evaluate(()=>__namako.model.turns),beforeDrop+1,'swipe down in aquarium to drop');await cdp.detach();
  }
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);await context.close();cases++;
 }
 console.log(`PASS ${cases} mobile cases: first guide, Japanese default, EN/JA, persisted dismissal, frozen background, 44px targets, touch controls, game menu/help/return, portrait/high-DPI/landscape, no missing assets`);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
