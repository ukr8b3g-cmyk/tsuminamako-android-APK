const fs=require('fs'),vm=require('vm'),assert=require('assert');
const root=require('path').resolve(__dirname,'..');
assert.equal(JSON.parse(fs.readFileSync(root+'/data/card_manifest.json','utf8')).cards.concat([JSON.parse(fs.readFileSync(root+'/data/card_manifest.json','utf8')).completion_card]).filter(c=>c.image_en).length,21);
const manifest=JSON.parse(fs.readFileSync(root+'/data/card_manifest.json','utf8'));
for(const language of ['ja-JP','en-US','fr-FR']){
 const m=JSON.parse(JSON.stringify(manifest));
 const nodes=[];const context={window:{NAMAKO_OS_LOCALE:language,NAMAKO_EN:JSON.parse(fs.readFileSync(root+'/browser/locales/en.json','utf8')),NAMAKO_CARD_CATALOG:m,NAMAKO_TRIVIA_CATALOG:{}},navigator:{},URLSearchParams,console,NodeFilter:{SHOW_TEXT:4},document:{documentElement:{},body:{},createTreeWalker:()=>({nextNode:()=>null}),querySelectorAll:()=>nodes,title:''}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(root+'/browser/i18n.js','utf8'),context);
 const all=m.cards.concat([m.completion_card]);
 assert.equal(context.NamakoI18n.locale,'ja');
 for(const selected of ['ja','en','ja']){
  context.NamakoI18n.setLanguage(selected,false);
  for(let i=0;i<all.length;i++){const old=manifest.cards.concat([manifest.completion_card])[i];assert.equal(all[i].image,selected==='ja'?old.image:old.image_en||old.image);if(old.image_en)assert(fs.existsSync(root+'/'+old.image_en));}
 }
 console.log('PASS default Japanese and switched card artwork on OS',language);
}
