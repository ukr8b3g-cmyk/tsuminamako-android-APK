const fs=require('fs'),path=require('path'),assert=require('assert'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch(require('./browser_test_support').launchOptions);try{
for(const lang of ['ja','en'])for(const [width,height]of [[320,568],[390,844],[1080,2400],[1440,3200]]){
const p=await b.newPage({viewport:{width,height}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.route('https://namako.test/**',r=>r.fulfill({contentType:'text/html',body:fs.readFileSync(path.join(__dirname,'../START.html'),'utf8').replace('<head>',`<head><script>window.NAMAKO_TEST_LANGUAGE='${lang}';window.NAMAKO_TEST_MODE=true;</script>`)}));
await p.goto('https://namako.test');await p.waitForFunction(()=>window.__namako);
for(const theme of ['dark','light','lcd']){
await p.evaluate(theme=>{__namako.dark=theme==='dark';__namako.lcd=theme==='lcd';__namako.speedIndex=0;__namako.sync();__namako.resize();},theme);
for(let i=0;i<5;i++){
assert(await p.locator('#demo-speed').isVisible());
await p.evaluate(()=>{const e=document.getElementById('demo-speed'),r=e.getBoundingClientRect(),l=document.getElementById('lore-button').getBoundingClientRect();if(r.left<l.right&&r.right>l.left)throw Error('Speed overlaps lore');const c=document.createElement('canvas').getContext('2d');c.font=getComputedStyle(e).font;if(e.textContent.split('\n').some(line=>c.measureText(line).width+4>e.clientWidth))throw Error('Speed label overflow');});
await p.locator('#demo-speed').click();assert.equal(await p.evaluate(()=>__namako.speedIndex),(i+1)%5);
}
const cardRect=await p.locator('#cards-button').boundingBox();
const speedRect=await p.locator('#demo-speed').boundingBox();
assert(cardRect.x>=speedRect.x+speedRect.width);
const before=await p.evaluate(()=>JSON.stringify([__namako.model.board,__namako.origin,__namako.cards.ownedUnique()]));
await p.locator('#cards-button').click();assert(await p.locator('#collection').isVisible());
await p.evaluate(()=>__namako.update(.5));
assert.equal(await p.evaluate(()=>JSON.stringify([__namako.model.board,__namako.origin,__namako.cards.ownedUnique()])),before);
await p.locator('#collection-close').click();assert.equal(await p.evaluate(()=>__namako.mode),'demo');
await p.locator('#start').click();assert.deepEqual(await p.locator('#cards-button').boundingBox(),cardRect);
await p.evaluate(()=>__namako.beginDemo());
}
await p.locator('#start').click();assert(!(await p.locator('#demo-speed').isVisible()));assert.deepEqual(errors,[]);await p.close();
}console.log('PASS 24 locale/size/theme cases: visible speed control, all five clicks, label fit, hidden in play');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
