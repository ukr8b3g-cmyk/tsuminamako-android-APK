const fs=require('fs'),path=require('path'),assert=require('assert'),{pathToFileURL}=require('url');
const Rules=require('../browser/rules');
const {chromium}=require('playwright');
function fixture(model,kind){
model.reset(1);let id=1;const wall=[[1,6],[1,7],[1,8],[0,8]];
for(let y=0;y<12;y++){if(kind==='roof'&&[1,2,3].includes(y))continue;
for(let x=0;x<8;x+=2){const cells=[];for(const column of [x,x+1]){
if(kind==='shaft'&&column===7)continue;
if(kind==='cave'&&((column===0&&y<8)||([1,2,3].includes(column)&&[3,4].includes(y))||wall.some(([wx,wy])=>wx===column&&wy===y)))continue;
cells.push([column,y]);}if(!cells.length)continue;
model.pieces.set(id,{cells,color:id%6});for(const [cx,cy] of cells)model.board[cy*8+cx]=id;id++;}}
if(kind==='cave'){model.pieces.set(id,{cells:wall,color:0});for(const [x,y]of wall)model.board[y*8+x]=id;id++;}
model.nextId=id;model.kept=model.turns=model.pieces.size;
}
const fixtureSource=fixture.toString();
const m=new Rules(1);fixture(m,'cave');assert(m.verifyInvariants());const p=m.entryPlan(m.shape(0));assert(p.route.length);let previous=p.route[0];for(const step of p.route){assert(m.canPlace(step.cells,step.origin));assert(Math.abs(step.origin[1]-previous.origin[1])<=1);previous=step;}assert(m.preview(previous.cells,previous.origin).keep);
(async()=>{const b=await chromium.launch(require('./browser_test_support').launchOptions);try{
for(const lang of ['ja','en'])for(const theme of ['light','dark','lcd']){
const context=await b.newContext({locale:lang,viewport:{width:390,height:844}});await context.addInitScript(lang=>{window.NAMAKO_TEST_MODE=true;window.NAMAKO_TEST_LANGUAGE=lang;window.requestAnimationFrame=()=>0;},lang);const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(pathToFileURL(path.resolve(__dirname,'../START.html')).href);await page.waitForFunction(()=>window.__namako);
await page.evaluate(({source,theme})=>{
window.makeFixture=new Function('model','kind',`(${source})(model,kind)`);const g=__namako;g.audio.play=()=>{};g.audio.musicEnabled=false;g.cards.collection={};g.cards.lastGrant={};g.dark=theme==='dark';g.lcd=theme==='lcd';g.applyTheme();g.beginPlay();g.difficultyIndex=1;
makeFixture(g.model,'shaft');g.next={shape:3,color:0};g.spawn();if(g.origin[0]!==7||g.model.width(g.active)!==1||!g.model.preview(g.active,g.model.landing(g.active,g.origin)).keep)throw Error('Wrong actual entrance or rotation');const board=g.model.board.slice();g.origin=[3,-1];g.lock();if(g.origin[0]!==7||g.phase!==0||String(board)!==String(g.model.board))throw Error('Overflow rescue mutates board');
makeFixture(g.model,'roof');g.next={shape:0,color:0};g.spawn();if(g.mode!=='stuck'||g.cards.totalOwned()!==0||document.getElementById('modal').hidden)throw Error('Roof needs retry without reward');g.draw();
}, {source:fixtureSource,theme});
assert(await page.locator('#continue').isVisible());assert.equal(await page.locator('#continue').textContent(),lang==='ja'?'はじめから':'New Game');if(theme==='lcd')await page.screenshot({path:path.join(__dirname,`top_entry_stuck_${lang}.png`)});
await page.reload();await page.waitForFunction(()=>window.__namako);await page.evaluate(()=>{__namako.audio.musicEnabled=false;__namako.resumeSaved();if(__namako.mode!=='stuck')throw Error('Stuck reload');});await page.locator('#continue').click();await page.evaluate(()=>{const g=__namako;if(g.mode!=='play'||g.model.fillCount()!==0)throw Error('Touch retry');g.difficultyIndex=0;g.speedIndex=0;g.roundTarget=.85;if(g.targetRatio!==.7||g.speed!==.75)throw Error('Easy target/speed');g.model.board.fill(0);for(let i=0;i<68;i++)g.model.board[i]=1;if(!g.goalReached())throw Error('Easy 70% clear');g.clear();g.finishCelebration();if(g.mode!=='reveal'||g.cards.totalOwned()!==1)throw Error('Genuine clear card');g.finishReward();g.beginDemo();});
await page.evaluate(source=>{window.makeFixture=new Function('model','kind',`(${source})(model,kind)`);const g=__namako;makeFixture(g.model,'roof');g.spawn();if(g.mode!=='demo'||g.phase!==2)throw Error('Stuck demo');g.update(1.6);if(g.mode!=='demo'||g.model.fillCount()>=72)throw Error('Demo restart');g.beginPlay();g.difficultyIndex=1;makeFixture(g.model,'cave');g.next={shape:0,color:0};g.spawn();if(!g.entryRoute.length||g.mode!=='play')throw Error('Cave false end');const kept=g.model.kept;for(let i=0;i<200&&g.entryRoute.length;i++)g.update(.1);if(g.model.kept!==kept+1||!g.model.verifyInvariants())throw Error('Cave path');},fixtureSource);
await page.evaluate(()=>{const g=__namako;for(const seed of [1,73,2026]){g.difficultyIndex=0;g.beginPlay(seed);for(let i=0;i<400&&g.mode==='play';i++){if(g.entryRoute.length)g.update(.1);else if(g.phase)g.update(1);else g.hardDrop();}if(g.mode!=='celebrate'||g.model.fillRatio()<.7)throw Error('Easy recommended entries could not reach 70%: '+seed);}g.beginPlay();g.origin=[2,3];g.ensurePlayableTank();if(String(g.origin)!=='2,3')throw Error('Saved mid-fall origin was reset');});
assert.deepEqual(errors,[]);await context.close();}
console.log('PASS 6 browser cases: side entrance/rotation, overflow recovery, touch retry, saved stuck state, Easy 70% and .75 speed, goal reward, demo restart, legal cave route');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
