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
require('./test_top_entry_easy.js');
