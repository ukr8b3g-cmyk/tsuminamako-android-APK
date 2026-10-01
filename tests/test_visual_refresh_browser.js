'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch(require('./browser_test_support').launchOptions);
 let cases=0;
 try {
  for(const lang of ['ja','en']) for(const [width,height,dpr] of [[320,568,2],[390,844,3],[540,1200,2],[540,1200,8/3],[1280,800,1]]){
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,locale:lang});
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(lang=>{window.NAMAKO_OS_LOCALE=lang;window.NAMAKO_TEST_MODE=true;},lang);
   await page.goto((process.env.NAMAKO_TEST_URL||'http://127.0.0.1:8765/browser/START.html')+'?test=1');
   await page.waitForFunction(()=>window.__namako);
   for(const theme of ['dark','light','lcd']){
    await page.evaluate(theme=>{const g=window.__namako;g.dark=theme==='dark';g.lcd=theme==='lcd';g.applyTheme();},theme);
    await page.locator('#settings-open').click();
    assert.equal(await page.locator('#settings-layer').isVisible(),true);
    const snapshot=await page.evaluate(()=>({clock:__namako.clock,mode:__namako.mode}));
    await page.waitForTimeout(100);
    assert.deepEqual(await page.evaluate(()=>({clock:__namako.clock,mode:__namako.mode})),snapshot);
    await page.locator('#music-volume').press('Home');
    for(let n=0;n<17;n++)await page.locator('#music-volume').press('ArrowRight');
    assert.equal(await page.evaluate(()=>__namako.audio.musicLevel),.85);
    const contained=await page.evaluate(()=>{const p=document.getElementById('settings-panel').getBoundingClientRect();return [...document.querySelectorAll('#settings-panel button,#settings-panel input')].every(e=>{let r=e.getBoundingClientRect();return r.left>=p.left-1&&r.right<=p.right+1&&r.top>=p.top-1&&r.bottom<=p.bottom+1;});});
    assert.ok(contained,'Settings controls remain in panel');
    await page.locator('#settings-close').click();
    assert.equal(await page.locator('#settings-layer').isVisible(),false);
    assert.equal(await page.evaluate(()=>document.getElementById('menu').inert),false);
    cases++;
   }
   await page.reload();await page.waitForFunction(()=>window.__namako);
   assert.equal(await page.evaluate(()=>__namako.audio.musicLevel),.85);
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log('PASS '+cases+' browser theme/locale/viewport cases: settings freeze, containment, close, music save/reload');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
