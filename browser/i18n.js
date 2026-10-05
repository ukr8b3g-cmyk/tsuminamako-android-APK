'use strict';
const NamakoI18n=(()=>{
 let language='ja';
 try{const saved=globalThis.localStorage?.getItem('namako_language');if(['ja','en'].includes(saved))language=saved;}catch(_){}
 if(window.NAMAKO_TEST_MODE&&['ja','en'].includes(window.NAMAKO_TEST_LANGUAGE))language=window.NAMAKO_TEST_LANGUAGE;
 const missing=new Set();
 const dictionary=window.NAMAKO_EN.ui;
 const keys=Object.keys(dictionary).sort((a,b)=>b.length-a.length);
 const reverseKeys=keys.slice().sort((a,b)=>dictionary[b].length-dictionary[a].length);
 function numberFormat(value,from,to){if(from.split('%d').length!==2)return null;const [head,tail]=from.split('%d');if(!value.startsWith(head)||!value.endsWith(tail))return null;const number=value.slice(head.length,tail?value.length-tail.length:undefined);return /^\d+$/.test(number)?to.replace('%d',number):null;}
 function source(value){value=String(value);if(/[ぁ-んァ-ヶ一-龯]/u.test(value))return value;for(const key of reverseKeys){if(dictionary[key]===value)return key;const formatted=numberFormat(value,dictionary[key],key);if(formatted!==null)return formatted;}let result=value;for(const key of reverseKeys)if(dictionary[key])result=result.split(dictionary[key]).join(key);return result;}
 const title=document.title,texts=[],attributes=[],images=[];
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;
 while(node=walker.nextNode())if(!['SCRIPT','STYLE'].includes(node.parentElement.tagName))texts.push([node,node.nodeValue]);
 for(const element of document.querySelectorAll('[aria-label],[title],[alt]'))for(const attr of ['aria-label','title','alt'])if(element.hasAttribute(attr))attributes.push([element,attr,element.getAttribute(attr)]);
 for(const img of document.querySelectorAll('img[data-en-src]'))images.push([img,img.getAttribute('src'),img.getAttribute('data-en-src')]);
 const catalog=window.NAMAKO_CARD_CATALOG,cards=[...catalog.cards,catalog.completion_card].filter(Boolean),originalCards=cards.map(card=>({...card}));
 const originalTrivia=window.NAMAKO_TRIVIA_CATALOG;
 function t(value){
  value=String(value);if(language==='ja')return value;
  if(Object.prototype.hasOwnProperty.call(dictionary,value))return dictionary[value];
  for(const key of keys){const formatted=numberFormat(value,key,dictionary[key]);if(formatted!==null)return formatted;}
  let result=value;for(const key of keys)if(result.includes(key))result=result.split(key).join(dictionary[key]);
  if(/[ぁ-んァ-ヶ一-龯]/u.test(result)){missing.add(value);console.warn('Missing English translation:',value);}
  return result;
 }
 function apply(){
  document.documentElement.lang=language;
  for(const [node,source]of texts)node.nodeValue=t(source);
  for(const [element,attr,source]of attributes)element.setAttribute(attr,t(source));
  document.title=t(title);
  for(const [img,ja,en]of images)img.src=language==='ja'?ja:en;
  cards.forEach((card,index)=>{const original=originalCards[index];Object.assign(card,original);if(!Object.hasOwn(original,'image_data'))delete card.image_data;card.name=t(original.name);if(language==='en'&&original.image_en){card.image=original.image_en;card.image_data=original.image_data_en||null;}});
  window.NAMAKO_TRIVIA_CATALOG=language==='ja'?originalTrivia:{...originalTrivia,language:'en',notice:window.NAMAKO_EN.lore.notice,episodes:window.NAMAKO_EN.lore.entries};
 }
 function setLanguage(value,persist=true){language=value==='en'?'en':'ja';if(persist)try{globalThis.localStorage?.setItem('namako_language',language);}catch(_){}apply();}
 apply();return{get locale(){return language;},t,source,missing,setLanguage};
})();
globalThis.NamakoI18n=NamakoI18n;
