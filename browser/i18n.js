'use strict';
const NamakoI18n=(()=>{
 const suppliedOSLocale=window.NAMAKO_OS_LOCALE||new URLSearchParams(globalThis.location?.search||'').get('namako_os_locale');
 const locale=(suppliedOSLocale||navigator.language||(navigator.languages||[])[0]||'en');
 const japanese=/^ja(?:[-_]|$)/i.test(locale),missing=new Set();
 const dictionary=window.NAMAKO_EN.ui;
 const keys=Object.keys(dictionary).sort((a,b)=>b.length-a.length);
 function t(value){
  value=String(value);if(japanese)return value;
  if(Object.prototype.hasOwnProperty.call(dictionary,value))return dictionary[value];
  let result=value;for(const key of keys)if(result.includes(key))result=result.split(key).join(dictionary[key]);
  if(/[ぁ-んァ-ヶ一-龯]/u.test(result)){missing.add(value);console.warn('Missing English translation:',value);}
  return result;
 }
 function apply(){
  document.documentElement.lang=japanese?'ja':'en';
  if(japanese)return;
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;
  while(node=walker.nextNode())if(!['SCRIPT','STYLE'].includes(node.parentElement.tagName)&&/[ぁ-んァ-ヶ一-龯]/u.test(node.nodeValue))node.nodeValue=t(node.nodeValue);
  for(const element of document.querySelectorAll('[aria-label],[title],[alt]'))for(const attr of ['aria-label','title','alt'])if(element.hasAttribute(attr))element.setAttribute(attr,t(element.getAttribute(attr)));
  document.title=t(document.title);
  for(const image of document.querySelectorAll('img[data-en-src]'))image.src=image.getAttribute('data-en-src');
  const catalog=window.NAMAKO_CARD_CATALOG;
  for(const card of [...catalog.cards,catalog.completion_card])if(card){card.name=t(card.name);if(card.image_en){card.image=card.image_en;card.image_data=card.image_data_en||null;}}
  window.NAMAKO_TRIVIA_CATALOG={...window.NAMAKO_TRIVIA_CATALOG,language:'en',notice:window.NAMAKO_EN.lore.notice,episodes:window.NAMAKO_EN.lore.entries};
 }
 apply();return{locale: japanese?'ja':'en',t,missing};
})();
globalThis.NamakoI18n=NamakoI18n;
