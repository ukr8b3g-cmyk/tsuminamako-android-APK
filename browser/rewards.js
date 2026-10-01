'use strict';
function namakoText(value){return globalThis.NamakoI18n?globalThis.NamakoI18n.t(value):value;}
class NamakoRewardView {
 constructor(app){this.app=app;this.swapTimer=null;}
 imageSource(card){return card.image_data||card.image;}
 show(card,count,milestone){
  const rank=String(card.rank),high=['SR','SSR','SECRET','COMPLETE'].includes(rank);
  const panel=document.getElementById('reward'),flip=document.getElementById('reward-flip');
  panel.className='rarity-'+rank;document.getElementById('reward-title').textContent=rank==='COMPLETE'?namakoText('やったね！ コンプリート！'):namakoText('カードをゲット！');
  const duration=({N:1100,R:1350,SR:1700,SSR:2100,SECRET:2500,COMPLETE:2900})[rank]||1350;
  panel.style.setProperty('--duration',duration+'ms');
  const front=document.getElementById('reward-front'),back=document.getElementById('reward-back');front.src=this.imageSource(card);front.alt=rank+' '+card.name;front.hidden=true;back.hidden=false;
  document.getElementById('reward-note').textContent=rank+' '+card.name+(count>1?'　（'+count+namakoText('枚目）'):'　NEW!')+(milestone?namakoText('\n10種類達成！「ナマコの仲間たち」と記念水槽を獲得！'):'');
  panel.hidden=false;flip.classList.remove('play','instant');void flip.offsetWidth;flip.classList.add(this.app.reduced?'instant':'play');
  clearTimeout(this.swapTimer);
  if(this.app.reduced){back.hidden=true;front.hidden=false;this.app.audio.play(high?'card_rare':'card_pop');}
  else this.swapTimer=setTimeout(()=>{if(this.app.mode==='reveal'){back.hidden=true;front.hidden=false;this.app.audio.play(high?'card_rare':'card_pop');}},duration*.62);
 }
 hide(){clearTimeout(this.swapTimer);this.swapTimer=null;document.getElementById('reward').hidden=true;}
 showCollection(){
  const cards=this.app.cards,grid=document.getElementById('collection-grid');grid.replaceChildren();
  for(const card of [...cards.enabledCards(),...(cards.complete()?[cards.completionCard()]:[])]){
   const owned=card.id==='complete'?1:cards.owned(card.id),tile=document.createElement('div');tile.className='collection-tile'+(owned?' owned':' locked');
   if(owned){const image=document.createElement('img');image.src=this.imageSource(card);image.alt=card.rank+' '+card.name;image.loading='lazy';image.tabIndex=0;image.setAttribute('role','button');image.setAttribute('aria-label',card.name+namakoText('を拡大'));image.onclick=()=>this.showZoom(card,image);image.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();this.showZoom(card,image);}};tile.append(image);}
   else{const back=document.createElement('div');back.className='collection-back';back.textContent='？';tile.append(back);}
   const label=document.createElement('div');label.className='collection-label';label.textContent=owned?card.name+' ×'+owned:namakoText('未発見');tile.append(label);grid.append(tile);
  }
  document.getElementById('collection-progress').textContent=cards.ownedUnique()+'/'+cards.enabledCards().length+namakoText('種類　合計')+cards.totalOwned()+namakoText('枚')+(cards.complete()?'　'+cards.enabledCards().length+namakoText('種類コンプリート！ 全員集合カード獲得'):cards.milestoneUnlocked()?namakoText('　称号「ナマコの仲間たち」・記念水槽 解放'):namakoText('　10種類で記念水槽を解放'));
  document.getElementById('collection').hidden=false;
 }
 showZoom(card,source){
  this.hideZoom();this.zoomSource=source;
  const zoom=document.createElement('button');zoom.id='card-zoom';zoom.setAttribute('aria-label',card.name+namakoText('。もう一度押すと図鑑に戻る'));
  const art=document.createElement('img');art.src=this.imageSource(card);art.alt=card.rank+' '+card.name;zoom.append(art);
  const note=document.createElement('span');note.textContent=card.name+namakoText('　·　タップで戻る');zoom.append(note);
  zoom.onclick=()=>this.hideZoom();document.getElementById('collection').append(zoom);zoom.focus();
 }
 hideZoom(){const zoom=document.getElementById('card-zoom');if(zoom){zoom.remove();if(this.zoomSource)this.zoomSource.focus();}this.zoomSource=null;}
 hideCollection(){this.hideZoom();document.getElementById('collection').hidden=true;document.getElementById('collection-grid').replaceChildren();}
}
