'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const gameSource=fs.readFileSync(path.join(root,'browser','game.js'),'utf8');
const end=gameSource.indexOf('const game=new NamakoApp();');
assert(end>0);
const elements=new Map();
function element(id){
 if(!elements.has(id))elements.set(id,{style:{},hidden:id==='trivia-card-viewer',disabled:false,textContent:'',scrollTop:0,setAttribute(){},removeAttribute(name){delete this[name];},classList:{toggle(){}}});
 return elements.get(id);
}
const saves=[];let clears=0;
const session={read:()=>null,save:g=>saves.push(g.mode),clear:()=>{clears++;}};
const sandbox={window:{},document:{getElementById:element,querySelector:element},NamakoSession:session};
vm.runInNewContext(gameSource.slice(0,end)+'\nglobalThis.TestApp=NamakoApp;',sandbox);
const episodes=[{id:1,title:'最初の話',body:'最初の本文'},{id:2,title:'次の話',body:'次の本文'}];
function make(mode){
 const app=Object.create(sandbox.TestApp.prototype);let index=0;
 app.mode=mode;app.roundId=mode==='demo'?'':'round-1';app.triviaReturnMode=null;app.triviaEpisode=null;app.rewardFromDemo=false;
 app.trivia={episodes,pick:()=>episodes[index++%episodes.length]};
 app.cards={rewardsEnabled:()=>true,milestoneUnlocked:()=>false,ownedUnique:()=>0,enabledCards:()=>[{id:'card-1'}]};
 app.audio={trackLabel:()=>'潮の庭',musicEnabled:true,sfxEnabled:true,play(){}};
 app.model={fillRatio:()=>0,fillCount:()=>0,kept:0,pieces:new Map()};app.entryRoute=[];
 app.collectionOpen=false;app.difficultyIndex=1;app.speedIndex=0;app.phase=0;app.demoClock=0;app.celebrationMessage='';
 return app;
}
const demo=make('demo');demo.openLore();
assert.equal(demo.mode,'trivia');assert.equal(demo.triviaReturnMode,'demo');
assert.equal(element('trivia-heading').textContent,'✦ 博士のうんちく ✦');
assert.equal(element('trivia-more').hidden,false);assert.equal(element('trivia-next').textContent,'戻る');
assert.deepEqual(saves,[]);
element('trivia-paper').scrollTop=50;demo.moreLore();
assert.equal(element('trivia-title').textContent,'次の話');assert.equal(element('trivia-paper').scrollTop,0);
demo.openTriviaCard('existing-dog-card.png','助手の犬・コリ助');
assert.equal(element('trivia-card-viewer').hidden,false);
assert.equal(element('trivia-card-large').src,'existing-dog-card.png');
assert.equal(element('trivia-card-caption').textContent,'助手の犬・コリ助');
assert.equal(demo.mode,'trivia');assert.equal(demo.triviaEpisode.id,2);
demo.closeTriviaCard();assert.equal(element('trivia-card-viewer').hidden,true);
demo.finishTrivia();assert.equal(demo.mode,'demo');assert.equal(clears,0);
const play=make('play');play.openLore();
assert.deepEqual(saves,['play']);assert.equal(play.mode,'trivia');
play.finishTrivia();assert.equal(play.mode,'play');assert.equal(clears,0);
const paused=make('paused');paused.openLore();paused.finishTrivia();assert.equal(paused.mode,'paused');
const cleared=make('play');let nextRounds=0;cleared.mode='trivia';cleared.beginPlay=()=>{nextRounds++;};cleared.finishTrivia();
assert.equal(nextRounds,1);assert.equal(clears,1);
const sessionSource=fs.readFileSync(path.join(root,'browser','session.js'),'utf8');
let storageWrites=0;const storage={localStorage:{setItem(){storageWrites++;}}};
vm.runInNewContext(sessionSource+'\nglobalThis.TestSession=NamakoSession;',storage);
storage.TestSession.save({roundId:'round-1',triviaReturnMode:'play'});
assert.equal(storageWrites,0,'reading lore never overwrites a play checkpoint');
for(const html of ['browser/START.html','START.html']){
 const source=fs.readFileSync(path.join(root,html),'utf8');
 assert.match(source,/<button id="lore-button"/);assert.match(source,/<button id="trivia-more"/);
}
console.log('PASS lore viewer: random next story, return to demo/play/pause, stage clear, checkpoint protection, HTML buttons.');
