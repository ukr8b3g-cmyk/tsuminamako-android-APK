'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const root=process.env.NAMAKO_ROOT||path.resolve(__dirname,'..');
const Rules=require(root+'/browser/rules.js');
const {chromium}=require('playwright');
function build(model,kind){
 model.reset(1);let id=1;
 const add=cells=>{model.pieces.set(id,{cells,color:id%6});for(const[x,y]of cells)model.board[y*8+x]=id;id++;};
 if(kind==='roof'){for(const y of [0,4,5,6,7,8,9,10,11])for(let x=0;x<8;x+=4)add([[x,y],[x+1,y],[x+2,y],[x+3,y]]);}
 else{for(let y=0;y<12;y++)for(let x=0;x<7;x+=2)add(x===6?[[6,y]]:[[x,y],[x+1,y]]);}
 model.nextId=id;model.kept=id-1;model.turns=id-1;
}
const m=new Rules(1);for(let s=0;s<6;s++)assert(m.retainableLanding(m.shape(s)),'Empty board must remain playable');
build(m,'roof');assert(m.verifyInvariants());const before=JSON.stringify({board:m.board,pieces:[...m.pieces],bag:m.bag,next:m.nextId,turns:m.turns});
for(let s=0;s<6;s++)assert.equal(m.retainableLanding(m.shape(s)),null,'Sealed roof has no reachable landing');
assert.equal(JSON.stringify({board:m.board,pieces:[...m.pieces],bag:m.bag,next:m.nextId,turns:m.turns}),before,'Probe must not mutate');
build(m,'shaft');assert(m.verifyInvariants());assert.equal(m.retainableLanding(m.shape(3)),null,'L piece cannot fit a one-column opening');assert(m.retainableLanding(m.shape(0)),'Two-cell vertical piece can fit');
// A sideways route under a roof must be considered, not only vertical drops.
const cave=new Rules(1);cave.board=Array(96).fill(1);
for(let y=0;y<8;y++)cave.board[y*8]=0;
for(let y=3;y<=4;y++)for(let x=1;x<=3;x++)cave.board[y*8+x]=0;
cave.board[3*8+4]=2;cave.board[4*8+4]=2;
const shape=cave.shape(0);let straight=false,rot=shape;
for(let r=0;r<4;r++){for(let x=0;x<=8-cave.width(rot);x++)straight ||= cave.preview(rot,cave.landing(rot,[x,-4])).keep;rot=cave.rotate(rot);}
assert.equal(straight,false);assert(cave.retainableLanding(shape),'Reachable cave must not trigger a false full clear');
console.log('PASS rules: sealed roof, alternate shape, sideways reachable cavity, non-mutating probe');
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{for(const lang of ['ja','en'])for(const theme of ['light','dark','lcd']){
 const context=await b.newContext({locale:lang,viewport:{width:390,height:844}});await context.addInitScript(()=>{window.NAMAKO_TEST_MODE=true;window.requestAnimationFrame=()=>0;});
 const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(pathToFileURL(root+'/START.html').href+'?test=1');await p.waitForFunction(()=>window.__namako);
 await p.evaluate(({build,theme})=>{const g=__namako;localStorage.clear();g.cards.collection={};g.cards.lastGrant={};g.audio.play=()=>{};g.audio.musicEnabled=false;g.dark=theme==='dark';g.lcd=theme==='lcd';g.applyTheme();g.beginPlay();g.difficultyIndex=1;window.build=(new Function('model','kind','('+build+')(model,kind)'));window.build(g.model,'shaft');g.next={shape:3,color:2};g.spawn();if(g.mode!=='play'||!g.model.retainableLanding(g.active))throw Error('Suitable replacement missing');if(g.cards.totalOwned()!==0)throw Error('Playable board awarded clear');const board=g.model.board.slice();g.draw();if(String(board)!==String(g.model.board))throw Error('Board changed');window.build(g.model,'roof');g.next={shape:2,color:1};g.spawn();if(g.mode!=='celebrate'||g.clearReason!=='packed'||g.model.fillRatio()>=g.targetRatio)throw Error('Blocked tank did not complete below goal');if(g.cards.totalOwned()!==1)throw Error('Packed clear reward');g.update(2.4);if(g.mode!=='reveal')throw Error('Packed clear reveal');}, {build:build.toString(),theme});
 await p.reload();await p.waitForFunction(()=>window.__namako);await p.evaluate(()=>{const g=__namako;g.audio.musicEnabled=false;g.resumeSaved();if(g.mode!=='celebrate'||g.clearReason!=='packed'||g.cards.totalOwned()!==1)throw Error('Packed clear resume');g.update(2.4);g.finishReward();if(g.mode!=='play')throw Error('Next playable tank');g.beginDemo();});
 // Reinstall the fixture function after reload, then test the demo-specific path.
 await p.evaluate(build=>{const g=__namako;(new Function('model','kind','('+build+')(model,kind)'))(g.model,'roof');g.next={shape:3,color:0};g.spawn();const count=g.cards.totalOwned();if(g.mode!=='celebrate')throw Error('Blocked demo did not finish');g.update(2.4);if(g.mode!=='trivia'||g.cards.totalOwned()!==count)throw Error('Demo notes/reward regression');g.finishTrivia();if(g.mode!=='demo')throw Error('Next demo');},build.toString());
 assert.deepEqual(errors,[]);await context.close();}
 console.log('PASS 6 browser cases: ja/en × light/dark/LCD; shape replacement, packed completion below goal, saved reward/reload, next game and demo notes');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
