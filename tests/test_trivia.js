'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'data','namako_episodes_100.json'),'utf8'));
const Trivia=require('../browser/trivia.js');
assert.equal(data.episodes.length,100);
assert.deepEqual(data.episodes.map(e=>e.id),Array.from({length:100},(_,i)=>i+1));
for(const episode of data.episodes){
 assert(episode.title&&episode.body&&episode.category);
 // This current dataset is fictional lore, not a factual source-indexed catalog.
 assert.equal(typeof episode.body,"string");
}
const trivia=new Trivia(data);
assert.equal(trivia.byId(100).id,100);
assert.equal(trivia.pick(()=>0).id,1);
assert.notEqual(trivia.pick(()=>0).id,1,'consecutive duplicate is skipped');
assert.equal(trivia.byId(101),null);
console.log('PASS trivia: 100 ordered episodes, fictional lore text, random draw, no consecutive duplicate.');
