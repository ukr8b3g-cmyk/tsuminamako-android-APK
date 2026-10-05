'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const Rules=require('../browser/rules');
function modelChecks(){
 const m=new Rules(1),drop=(x,color=0)=>m.commit(m.shape(0),m.landing(m.shape(0),[x,-4]),color);
 drop(0);drop(2);assert.equal(m.pieces.size,2);const before=JSON.stringify([...m.pieces]);
 const prediction=m.preview(m.shape(0),[4,11],0);assert(prediction.willClear);assert.deepEqual(prediction.matchIds,[1,2]);assert.equal(JSON.stringify([...m.pieces]),before);
 const third=drop(4);assert.equal(third.match.count,3);assert.equal(third.match.sources.length,3);assert.equal(m.pieces.size,0);assert.equal(m.fillCount(),0);assert.equal(m.kept,3);assert.equal(m.cleared,3);assert(m.verifyInvariants());
 m.reset();for(const x of [0,2,4])drop(x,x/2);assert.equal(m.pieces.size,3);assert.equal(m.fillCount(),6);assert.equal(m.cleared,0);
 m.reset();for(const x of [0,3,6])drop(x);assert.equal(m.pieces.size,3);assert(m.verifyInvariants());assert.deepEqual(m.matchingIds([[0,0]],[2,10],0),[]);
 m.reset();for(const x of [0,2,6])drop(x);const bridge=m.commit(m.shape(0),[1,10],1);assert(bridge.keep);const match=drop(4);assert.equal(match.match.count,4);assert.equal(m.pieces.size,1);assert.equal(m.pieces.get(bridge.id).color,1);assert.equal(m.fillCount(),2);assert(m.verifyInvariants());
 m.reset();drop(0);drop(2);const safe=m.entryPlan(m.shape(0),true,0),spot=m.landing(safe.cells,safe.origin);assert(m.preview(safe.cells,spot,0).keep);assert(!m.preview(safe.cells,spot,0).willClear);
 const triples=[];for(let d=0;d<3;d++){const r=new Rules(91),colours=[];for(let i=0;i<6000;i++)colours.push(r.nextSpec(d).color);assert.equal(new Set(colours).size,[6,4,3][d]);assert(colours.every(c=>c>=0&&c<[6,4,3][d]));triples.push(colours.slice(2).filter((c,i)=>c===colours[i+1]&&c===colours[i]).length);}
 assert(triples[0]<triples[1]&&triples[1]<triples[2]);
 console.log('PASS same-colour model: connected chain, mixed/disconnected/diagonal pieces, 4-way bridge, other colour retained, fill decreases, safe Easy entry, 6/4/3 colour pools; sampled triples',triples);
}
modelChecks();
const {chromium}=require('playwright');
(async()=>{const browser=await chromium.launch(require('./browser_test_support').launchOptions);try{
 for(const lang of ['ja','en'])for(const theme of ['light','dark','lcd'])for(const size of [[320,568],[412,915]]){
  const context=await browser.newContext({locale:lang,viewport:{width:size[0],height:size[1]}});
  await context.addInitScript(lang=>{window.NAMAKO_TEST_LANGUAGE=lang;window.NAMAKO_TEST_MODE=true;window.requestAnimationFrame=()=>0;},lang);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve(__dirname,'../START.html')).href);await page.waitForFunction(()=>window.__namako);
  await page.evaluate(({theme,lang})=>{
   const g=__namako;g.dark=theme==='dark';g.lcd=theme==='lcd';g.applyTheme();g.audio.musicEnabled=false;g.audio.music.pause();g.beginPlay(1);g.reduced=false;
   window.played=[];g.audio.play=name=>played.push(name);const owned=g.cards.totalOwned();
   for(const x of [0,2,4]){g.active=g.model.shape(0);g.activeColor=0;g.origin=[x,11];g.visual=g.origin.slice();g.phase=0;g.lock();}
   if(!g.matchEffect||g.matchEffect.sources.length!==3||g.model.pieces.size!==0||g.model.fillCount()!==0||played.at(-1)!=='merge')throw Error('Actual same-colour lock/effect/sound');
   if(g.goalReached()||g.cards.totalOwned()!==owned)throw Error('Disappearing group incorrectly rewarded');
   if(!g.audio.voices.merge[0].src.startsWith('data:audio/wav;base64,'))throw Error('Bubble sound not embedded');
   if(!document.getElementById('status').textContent.includes(lang==='ja'?'泡':'bubbles'))throw Error('Localized match feedback');
   g.update(.32);g.draw();const time=g.matchEffect.t;g.pause();g.update(.2);if(g.matchEffect.t!==time)throw Error('Pause did not freeze match');g.resume();g.draw();
  },{theme,lang});
  if(size[0]===412&&lang==='ja')await page.screenshot({path:path.join(__dirname,`same_color_${theme}_mid.png`)});
  await page.evaluate(()=>{
   const g=__namako;g.update(.65);g.draw();if(g.matchEffect)throw Error('Effect does not finish');
   NamakoSession.save(g);const s=NamakoSession.read();if(!s||s.version!==3||s.restoredModel.pieces.size!==0||s.restoredModel.cleared!==3||!s.restoredModel.verifyInvariants())throw Error('v3 cleared checkpoint');
   g.resumeSaved();if(g.model.cleared!==3||g.model.fillCount()!==0)throw Error('Actual resume lost clearing');
   const bad=JSON.parse(localStorage.getItem(NamakoSession.key));bad.model.cleared=0;localStorage.setItem(NamakoSession.key,JSON.stringify(bad));if(NamakoSession.read())throw Error('Corrupt erased count accepted');
   // Legacy v1 ordinary and v2 large pieces preserve their saved positions.
   g.beginPlay(1);g.active=g.model.shape(0);g.activeColor=1;g.origin=[0,11];g.phase=0;g.lock();NamakoSession.save(g);const old=JSON.parse(localStorage.getItem(NamakoSession.key));old.version=1;delete old.model.cleared;localStorage.setItem(NamakoSession.key,JSON.stringify(old));if(!NamakoSession.read())throw Error('Legacy v1 lost');
   const cells=[[0,11],[1,11],[2,11],[3,11],[4,11],[5,11]];old.version=2;old.model.board=Array(96).fill(0);for(const[x,y]of cells)old.model.board[y*8+x]=1;old.model.pieces=[[1,{cells,color:2,units:3}]];old.model.kept=old.model.turns=3;old.model.nextId=2;old.model.slipped=0;old.phase=1;localStorage.setItem(NamakoSession.key,JSON.stringify(old));const legacy=NamakoSession.read();if(!legacy||legacy.restoredModel.fillCount()!==6||legacy.restoredModel.pieces.get(1).units!==3)throw Error('Legacy v2 large lost');
   g.beginDemo();const count=g.cards.totalOwned();g.reduced=true;for(const x of [0,2,4]){g.active=g.model.shape(0);g.activeColor=0;g.origin=[x,11];g.visual=g.origin.slice();g.phase=0;g.lock();}g.speedIndex=4;g.update(.2);g.draw();if(!g.matchEffect||g.phase!==1)throw Error('Mach skipped effect');g.update(.2);if(g.matchEffect||g.cards.totalOwned()!==count)throw Error('Reduced/demo policy');
   g.beginPlay(1);for(const x of [0,2,4]){g.active=g.model.shape(0);g.activeColor=x/2;g.origin=[x,11];g.visual=g.origin.slice();g.phase=0;g.lock();}if(g.matchEffect||g.model.pieces.size!==3)throw Error('Different colours disappeared');g.draw();
  });
  if(size[0]===412&&lang==='ja'&&theme==='lcd')await page.screenshot({path:path.join(__dirname,'same_color_lcd_patterns.png')});
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS 12 browser cases: JA/EN, light/dark/LCD, small/tall screens, actual disappearance, bubble sound, pause, v3 resume, v1/v2 migration, reduced motion, Mach wait, demo without rewards');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
