'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ja=JSON.parse(read('browser/lore_100_v2_1.json'));
const en=JSON.parse(read('browser/locales/en.json'));
assert.equal(en.lore.entries.length,200);
assert.deepEqual(en.lore.entries.map(x=>x.id),ja.entries.map(x=>x.id));
assert.equal(new Set(en.lore.entries.map(x=>x.title)).size,200);
for(const entry of en.lore.entries)assert(!/[ぁ-んァ-ヶ一-龯]/u.test(JSON.stringify(entry)));
for(const [locale,os] of [['ja',''],['ja-JP',''],['ja_JP',''],['en-US',''],['fr-FR',''],['de',''],['zh-CN',''],['',''],['en-US','ja-JP'],['ja-JP','en-US']]){
 const document={documentElement:{},body:{},title:'つみなまこ',createTreeWalker:()=>({nextNode:()=>null}),querySelectorAll:()=>[]};
 const sandbox={window:{},location:{search:os?"?namako_os_locale="+os:""},navigator:{language:locale},document,NodeFilter:{SHOW_TEXT:4},URLSearchParams,console:{warn(){}}};
 vm.createContext(sandbox);
 for(const file of ['card_catalog.js','trivia_catalog.js','locale_catalog.js','i18n.js'])vm.runInContext(read('browser/'+file),sandbox);
 const local=sandbox.NamakoI18n;
 assert.equal(local.locale,'ja','First launch must be Japanese for every OS locale');
 assert.equal(local.t('スタート'),'スタート');
 assert.equal(sandbox.window.NAMAKO_TRIVIA_CATALOG.episodes[0].title,ja.entries[0].title);
 local.setLanguage('en',false);const japanese=false;
 assert.equal(local.locale,'en');assert.equal(local.t('スタート'),'Start');
 assert.equal(sandbox.window.NAMAKO_TRIVIA_CATALOG.episodes[0].title,en.lore.entries[0].title);
 if(!japanese){
  for(const name of ['game.js','rewards.js']){
   const source=read('browser/'+name);
   const literal=/(['"`])(?:\\.|(?!\1).)*?\1/gs;
   for(const match of source.matchAll(literal))if(/[ぁ-んァ-ヶ一-龯]/u.test(match[0])){
    let raw=match[0];if(raw[0]==='`')raw=raw.replace(/\$\{.*?\}/gs,'1');
    const value=vm.runInNewContext(raw);const translated=local.t(value);
    assert(!/[ぁ-んァ-ヶ一-龯]/u.test(translated),name+': '+value+' => '+translated);
   }
  }
  const html=read('browser/START.html');
  for(const match of html.matchAll(/(?:>([^<>]+)<)|(?:\b(?:title|alt|aria-label)="([^"]*)")/g)){
   const text=(match[1]||match[2]||'').trim();if(/[ぁ-んァ-ヶ一-龯]/u.test(text))assert(!/[ぁ-んァ-ヶ一-龯]/u.test(local.t(text)),'HTML: '+text+' => '+local.t(text));
  }
  assert.equal(local.missing.size,0);
  const elements=new Map();
  document.getElementById=id=>{if(!elements.has(id))elements.set(id,{hidden:id==='trivia-card-viewer',style:{},textContent:'',attrs:{},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this[k];},classList:{toggle(){}}});return elements.get(id);};
  document.querySelector=s=>document.getElementById(s);sandbox.NamakoSession={read:()=>null};
  const game=read('browser/game.js');
  vm.runInContext(game.slice(0,game.indexOf('const game=new NamakoApp();'))+'\nglobalThis.TestApp=NamakoApp;',sandbox);
  const app=Object.create(sandbox.TestApp.prototype);
  Object.assign(app,{model:{fillRatio:()=>10/96,fillCount:()=>10,kept:10,pieces:new Map(Array.from({length:10},(_,i)=>[i+1,{}]))},cards:{rewardsEnabled:()=>true,ownedUnique:()=>2,enabledCards:()=>Array(20).fill({}),milestoneUnlocked:()=>false},audio:{trackLabel:()=>'Tide Garden',musicEnabled:true,sfxEnabled:true,play(){}},difficultyIndex:1,speedIndex:0,phase:0,entryRoute:[],demoClock:0,collectionOpen:false,celebrationMessage:'A new friend!',rewardFromDemo:false,lastReward:{name:'Jade Namako'},trivia:{episodes:en.lore.entries}});
  for(const mode of ['demo','play','paused','clear','celebrate','reveal','trivia']){
   app.mode=mode;app.sync();if(mode==='trivia')app.renderTrivia(en.lore.entries[0]);
   for(const [id,element]of elements)assert(!/[ぁ-んァ-ヶ一-龯]/u.test(element.textContent+JSON.stringify(element.attrs)),mode+' '+id);
  }
  app.openTriviaCard('existing-image.png','Korisuke');assert.equal(document.getElementById('trivia-card-viewer').hidden,false);
  app.closeTriviaCard();assert.equal(document.getElementById('trivia-card-viewer').hidden,true);
 }
 local.setLanguage('ja',false);assert.equal(local.t('スタート'),'スタート');
 assert.equal(sandbox.window.NAMAKO_TRIVIA_CATALOG.episodes[0].title,ja.entries[0].title);
}
const standalone=read('START.html');
assert(standalone.includes('window.NAMAKO_EN='));
assert.equal((standalone.match(/data-en-src="data:image\/webp;base64,/g)||[]).length,3);
assert(!standalone.includes('<script src='));
console.log('PASS: Japanese by default for every OS locale; explicit EN/JA switching; 200 stories, UI literal/HTML coverage, 3 embedded English character images.');
