'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch(require('./browser_test_support').launchOptions);
 try{
  for(const [w,h] of [[540,860],[360,640],[360,760],[390,844],[412,915],[390,915]]){
   const page=await browser.newPage({viewport:{width:w,height:h},hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(pathToFileURL(path.join(__dirname,'..','START.html')).href+'?test=1');await page.waitForFunction(()=>window.__namako);
   const layout=await page.evaluate(()=>{const g=__namako,B=window.eval('B'),rect=id=>document.getElementById(id).getBoundingClientRect();return {cell:B.c,boardBottom:B.y+B.h,status:parseFloat(document.getElementById('status').style.top),start:parseFloat(document.getElementById('start').style.top),stage:rect('stage'),wrap:rect('wrap'),height:g.layoutHeight,fill:rect('fill'),count:rect('count'),next:rect('next-label'),footer:rect('footer'),drop:rect('drop'),boardLeft:B.x};});
   assert(layout.boardBottom+17<layout.status&&layout.status+22<layout.start,'board/status/buttons separated');assert(layout.wrap.width<=w+1&&layout.wrap.height<=h+1,'fits viewport');assert(Math.abs(layout.stage.height-layout.height*(layout.stage.width/540))<2,'uniform scaling');assert(layout.footer.bottom<=h+1,'footer visible');
   if(h/w>=2){assert(layout.cell>=59,'tall phone uses larger square cells');assert(layout.count.bottom<layout.next.top,'HUD and next piece separated');}
   if(w===390||w===360){await page.waitForTimeout(2300);await page.screenshot({path:path.join(__dirname,`responsive_${w}x${h}.png`)});await page.click('#start');assert(await page.locator('#drop').evaluate(el=>el.getBoundingClientRect().height)>=(h/w>=2?50:40),'primary touch target fits the available height');await page.screenshot({path:path.join(__dirname,`responsive_play_${w}x${h}.png`)});if(w===390){await page.click('#theme');await page.screenshot({path:path.join(__dirname,`responsive_dark_${w}x${h}.png`)});}}
   assert.deepEqual(errors,[]);await page.close();console.log(`PASS ${w}x${h}: cell ${layout.cell.toFixed(1)}, stage height ${layout.height.toFixed(0)}`);
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
