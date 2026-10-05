'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),url=process.env.NAMAKO_TEST_URL||pathToFileURL(path.join(root,'artifacts/web/index.html')).href;
(async()=>{const browser=await chromium.launch(require('./browser_test_support').launchOptions);try{
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.NAMAKO_TEST_MODE=true;window.requestAnimationFrame=()=>0;localStorage.setItem('namako_theme','lcd');localStorage.setItem('namako_audio',JSON.stringify({sfx:false,music:false}));});
 await page.goto(url);await page.waitForFunction(()=>window.__namako);
 // A frozen RAF fixture still needs to repaint when mobile viewport resize clears Canvas.
 await page.evaluate(()=>{const g=__namako,resize=g.resize.bind(g);g.resize=()=>{resize();g.draw();};});
 for(const language of ['ja','en']){
  const report=await page.evaluate(language=>{
   NamakoI18n.setLanguage(language);const g=__namako;g.beginPlay();g.lcd=true;g.dark=false;g.reduced=true;g.applyTheme();g.model=new NamakoRules(73);g.model.pieces.clear();
   for(let color=0;color<6;color++)g.model.pieces.set(color+1,{cells:[[color+1,10],[color+1,11]],color,units:1});
   g.active=[[0,0],[1,0],[2,0]];g.origin=[2,2];g.visual=[2,2];g.activeColor=0;g.next={shape:0,color:0};g.showActive=true;g.easyGuide=null;g.difficultyIndex=2;g.phase=0;g.entryRoute=[];g.sync();g.draw();
   const pixel=(x,y)=>Array.from(g.ctx.getImageData(Math.round(x*g.pixelRatio),Math.round(y*g.pixelRatio),1,1).data).slice(0,3),rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
   const settled=[];for(let color=0;color<6;color++){const found=pixel(B.x+(color+1.5)*B.c,B.y+10.5*B.c+11);if(String(found)!==String(rgb(LCD_PALETTE[color])))throw Error('Wrong settled colour '+color+': '+found);settled.push(found);}
   if(new Set(settled.map(String)).size!==6)throw Error('LCD colours must be distinct');
   for(let color=0;color<6;color++){
    g.activeColor=color;g.next.color=color;g.draw();const expected=rgb(LCD_PALETTE[color]);
    if(String(pixel(B.x+2.5*B.c,B.y+2.5*B.c+11))!==String(expected))throw Error('Falling creature colour mismatch');
    const first=g.model.shape(g.next.shape)[0];if(String(pixel(B.x+B.w-55+first[0]*11,B.y+42+first[1]*11+2))!==String(expected))throw Error('NEXT colour mismatch');
    g.ctx.clearRect(0,0,540,g.layoutHeight);g.reduced=false;g.matchEffect={color,t:.4,sources:[{cells:[[1,4]]},{cells:[[2,4]]},{cells:[[3,4]]}]};g.ctx.save();g.ctx.translate(B.x,B.y);g.drawMatchEffect();g.ctx.restore();
    const pixels=g.ctx.getImageData(0,0,g.ctx.canvas.width,g.ctx.canvas.height).data;let coloured=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]===expected[0]&&pixels[i+1]===expected[1]&&pixels[i+2]===expected[2]&&pixels[i+3]===255)coloured++;
    if(coloured<100)throw Error('Jelly join lost its LCD colour '+color);g.matchEffect=null;g.reduced=true;
   }
   // Restore an ordinary readable sample for the screenshot.
   g.activeColor=4;g.next.color=2;g.draw();if(NamakoI18n.missing.size)throw Error('Missing translation');
   if(document.documentElement.scrollWidth>innerWidth+1)throw Error('Horizontal overflow');
   return {language,settled,theme:document.documentElement.dataset.theme};
  },language);
  assert.equal(report.theme,'lcd');assert.equal(report.settled.length,6);
  if(!process.env.NAMAKO_TEST_URL)await page.screenshot({path:path.join(root,'artifacts/lcd_tint_'+language+'.png')});
 }
 assert.deepEqual(errors,[]);console.log('PASS LCD soft colours: 6 distinct rendered body colours in JA/EN, settled/falling/NEXT/jelly matching, mobile high-DPI layout.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
