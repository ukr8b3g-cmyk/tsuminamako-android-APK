/* HTML edition loads its own lore catalog; native data stays unchanged. */
'use strict';
class NamakoTrivia{
 constructor(catalog=window.NAMAKO_TRIVIA_CATALOG||{}){this.catalog=catalog;this.episodes=Array.isArray(catalog.episodes)?catalog.episodes:[];this.lastId=0;try{this.lastId=Number(localStorage.getItem('namako_trivia_last'))||0;}catch(_){}}
 byId(id){return this.episodes.find(e=>e&&e.id===id)||null;}
 pick(random=Math.random){if(!this.episodes.length)return null;let index=Math.min(this.episodes.length-1,Math.floor(random()*this.episodes.length));if(this.episodes.length>1&&this.episodes[index].id===this.lastId)index=(index+1+Math.floor(random()*(this.episodes.length-1)))%this.episodes.length;const episode=this.episodes[index];this.lastId=episode.id;try{localStorage.setItem('namako_trivia_last',String(this.lastId));}catch(_){}return episode;}
}
if(typeof module!=='undefined')module.exports=NamakoTrivia;
