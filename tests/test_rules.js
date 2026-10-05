/* Run with Node.js: node tests/test_rules.js. No npm dependencies. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Rules=require('../browser/rules.js');
let passed=0;const results=[];
function test(name,fn){fn();passed++;results.push({name,result:'PASS'});console.log('PASS',name);}
const put=(r,cells,x,color=0)=>r.commit(cells,r.landing(cells,[x,-3]),color);
function serial(r){return JSON.stringify({b:r.board,p:[...r.pieces],id:r.nextId,k:r.kept,cleared:r.cleared,s:r.slipped,t:r.turns,r:r.randomState,bag:r.bag});}
test('empty board; no lifetime, waste limit or top-out state',()=>{let r=new Rules();assert.equal(r.fillCount(),0);assert.equal(r.verifyInvariants(),true);assert(!('gameOver'in r));});
test('a floor landing survives',()=>{let r=new Rules();let out=put(r,r.shape(0),0);assert.equal(out.keep,true);assert.equal(out.reason,'floor');assert.equal(r.fillCount(),2);});
test('two cell contacts with ONE creature still slip',()=>{let r=new Rules();put(r,r.shape(0),2);let p=r.landing(r.shape(0),[2,-3]),q=r.preview(r.shape(0),p);assert.equal(q.keep,false);assert.deepEqual(q.contacts,[1]);r.commit(r.shape(0),p,3);assert.equal(r.fillCount(),2);});
test('two DISTINCT creatures retain the bridge',()=>{let r=new Rules();put(r,r.shape(0),0,0);put(r,r.shape(0),2,1);let o=put(r,r.shape(0),1,5);assert.equal(o.keep,true);assert.equal(o.reason,'friends');assert.deepEqual(o.contacts,[1,2]);assert.equal(r.fillCount(),6);});
test('walls are not extra friends',()=>{let r=new Rules();put(r,r.shape(0),0);let o=put(r,[[0,0],[0,1]],0);assert.equal(o.keep,false);assert.deepEqual(o.contacts,[1]);});
test('diagonal-only neighbours do not count',()=>{let r=new Rules();put(r,r.shape(0),0);let q=r.preview([[0,0]],[2,10]);assert.deepEqual(q.contacts,[]);assert.equal(q.keep,false);});
test('an active creature never counts its own segments',()=>{let r=new Rules();assert.equal(r.preview(r.shape(2),[1,5]).keep,false);assert.deepEqual(r.preview(r.shape(2),[1,5]).contacts,[]);});
test('three matching creatures clear',()=>{let r=new Rules();put(r,r.shape(0),0,2);put(r,r.shape(0),2,2);assert.equal(put(r,r.shape(0),1,2).keep,true);assert.equal(r.pieces.size,0);assert.equal(r.cleared,3);});
test('preview is non-mutating',()=>{let r=new Rules();put(r,r.shape(0),0);let old=serial(r);r.preview(r.shape(4),r.landing(r.shape(4),[0,-3]));assert.equal(serial(r),old);});
test('invalid overlap never overwrites a creature',()=>{let r=new Rules();put(r,r.shape(0),0);let old=r.board.slice();let o=r.commit(r.shape(0),[0,11],1);assert.equal(o.reason,'blocked');assert.deepEqual(r.board,old);assert.equal(r.slipped,1);});
test('above-top lock slips without writing outside the tank',()=>{let r=new Rules();let o=r.commit(r.shape(2),[1,-1],0);assert.equal(o.reason,'overflow');assert.equal(r.fillCount(),0);assert.equal(r.turns,1);assert.equal(r.verifyInvariants(),true);});
test('left/right/bottom out of bounds and duplicate cells reject',()=>{let r=new Rules();assert(!r.canPlace([[0,0]],[-1,0]));assert(!r.canPlace([[0,0]],[8,0]));assert(!r.canPlace([[0,0]],[0,12]));assert(!r.canPlace([[0,0]],[0,-5]));assert(!r.canPlace([[0,0],[0,0]],[0,0]));assert(!r.canPlace([],[0,0]));});
test('four rotations preserve every shape exactly',()=>{let r=new Rules();for(let i=0;i<6;i++){let c=r.shape(i),o=c.map(x=>x.slice());for(let j=0;j<4;j++)c=r.rotate(c);assert.deepEqual(c,o);assert.deepEqual(r.rotate(r.rotate(c,1),-1),c);}});
test('six-shape bag and deterministic seed',()=>{let a=new Rules(991),b=new Rules(991);for(let bag=0;bag<20;bag++){let seen=[];for(let i=0;i<6;i++){let x=a.nextSpec(),y=b.nextSpec();assert.deepEqual(x,y);seen.push(x.shape);}assert.equal(new Set(seen).size,6);}});
test('four-cell vertical shape can steer entirely above a blocked top row',()=>{let r=new Rules();r.board.fill(1,0,8);let c=r.rotate(r.shape(2));assert(r.canPlace(c,[3,-Rules.TOP_BUFFER]));assert(r.canPlace(c,[4,-Rules.TOP_BUFFER]));assert.equal(r.preview(c,r.landing(c,[3,-Rules.TOP_BUFFER])).reason,'overflow');});
test('mixed-colour full rows neither disappear nor harden',()=>{let r=new Rules();for(let x=0;x<8;x+=2)put(r,r.shape(0),x,x/2);assert.equal(r.fillCount(),8);assert.equal(r.pieces.size,4);for(const p of r.pieces.values())assert(!('hard'in p));});
test('80% clear uses the exact 77-cell threshold',()=>{let r=new Rules();r.board.fill(1,0,76);assert.equal(r.isClear(),false);r.board[76]=1;assert.equal(r.isClear(),true);});
test('300 straight drops cannot build a tower',()=>{let r=new Rules();for(let i=0;i<300;i++)put(r,r.shape(0),3);assert.equal(r.fillCount(),2);assert.equal(r.kept,1);assert.equal(r.slipped,299);assert(r.verifyInvariants());});
test('demo planner is a non-mutating hint, not a cheat',()=>{let r=new Rules(13);for(let k=0;k<9;k++){let spec=r.nextSpec(),old=serial(r),p=r.demoChoice(r.shape(spec.shape),k%5===3,spec.color);assert.equal(serial(r),old);assert(p);assert.equal(p.keep,r.preview(p.cells,p.origin).keep);r.commit(p.cells,p.origin,spec.color);}});
test('reset clears ownership, timers-independent state and random sequence',()=>{let r=new Rules(8);put(r,r.shape(0),0);r.nextSpec();r.reset(8);assert.equal(serial(r),serial(new Rules(8)));});
let reachability=[];
test('100 seeded Easy games reach the actual 70% goal with colour-aware hints',()=>{for(let seed=1;seed<=100;seed++){let r=new Rules(seed);for(let turn=0;turn<100&&r.fillRatio()<.7;turn++){let spec=r.nextSpec(0),p=r.demoChoice(r.shape(spec.shape),false,spec.color);assert(p,`seed ${seed}: no legal hint`);r.commit(p.cells,p.origin,spec.color);assert(r.verifyInvariants());}assert(r.fillRatio()>=.7,`seed ${seed}`);reachability.push({seed,turns:r.turns,filled:r.fillCount()});}});
test('10,000 randomized placements preserve all invariants',()=>{let total=0;for(let seed=1;seed<=100;seed++){let r=new Rules(seed);for(let i=0;i<100;i++){let spec=r.nextSpec(),c=r.shape(spec.shape),rot=r.randomInt(4);for(let j=0;j<rot;j++)c=r.rotate(c);let x=r.randomInt(9-r.width(c)),p=r.landing(c,[x,-3]),before=r.fillCount(),out=r.commit(c,p,spec.color);assert.equal(r.fillCount(),before+(out.keep?c.length:0)-(out.match?out.match.sources.reduce((n,p)=>n+p.cells.length,0):0));assert(r.verifyInvariants());total++;}}assert.equal(total,10000);});
const summary={suite:'Browser/reference board rules',passed,failed:0,results,reachability:{difficulty:'Easy',target:.7,seeds:100,cleared:100,minTurns:Math.min(...reachability.map(x=>x.turns)),maxTurns:Math.max(...reachability.map(x=>x.turns))},randomPlacements:10000,nativeGodotExecuted:false};
fs.writeFileSync(path.join(__dirname,'rules_results.json'),JSON.stringify(summary,null,2));
console.log(`\n${passed} rule tests PASS. 10,000 invariant checks PASS. 100/100 planned clears.`);
