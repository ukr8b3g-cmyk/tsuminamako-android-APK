/* Shared card catalog and locally saved collection. */
'use strict';
class NamakoCards{
 constructor(catalog=window.NAMAKO_CARD_CATALOG||{}){this.catalog=catalog;this.collection={};this.lastGrant={};this.completionSeen=false;try{const saved=JSON.parse(localStorage.getItem('namako_cards')||'{}');this.lastGrant=saved.__lastGrant||{};this.completionSeen=saved.__completionSeen===true&&(Number(saved.__completionSize)||12)>=this.enabledCards().length;if(saved&&typeof saved==='object'&&!Array.isArray(saved))for(const card of catalog.cards||[]){const count=Number(saved[card.id]);if(Number.isSafeInteger(count)&&count>0)this.collection[card.id]=count;}}catch(_){this.collection={};}}
 enabledCards(){return (this.catalog.cards||[]).filter(c=>c&&c.enabled===true);}
 rewardsEnabled(){return this.catalog.rewards_enabled===true&&this.enabledCards().length>0;}
 rankWeights(){const out={};for(const r of this.catalog.ranks||[])out[String(r.id)]=Math.max(0,Number(r.weight)||0);return out;}
 pickReward(random=Math.random){const cards=this.enabledCards();if(!cards.length)return null;const groups={};for(const c of cards)(groups[c.rank]||(groups[c.rank]=[])).push(c);const weights=this.rankWeights(),ranks=Object.keys(groups);let total=ranks.reduce((s,r)=>s+(weights[r]??1),0);if(total<=0)return cards[Math.floor(random()*cards.length)];let roll=random()*total,chosen=ranks[0];for(const rank of ranks){roll-=weights[rank]??1;if(roll<=0){chosen=rank;break;}}let pool=groups[chosen];if(this.catalog.duplicate_policy==='prefer_unowned_in_rank'){const unseen=pool.filter(c=>this.owned(c.id)===0);if(unseen.length)pool=unseen;}return pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];}
 add(card){if(!card)return 0;const id=String(card.id);this.collection[id]=(Number(this.collection[id])||0)+1;this.save();return this.collection[id];}
 save(){try{localStorage.setItem('namako_cards',JSON.stringify({...this.collection,__lastGrant:this.lastGrant,__completionSeen:this.completionSeen,__completionSize:this.enabledCards().length}));}catch(_){}}
 grantForRound(round){if(this.lastGrant.round===round)return this.enabledCards().find(c=>c.id===this.lastGrant.card)||null;const card=this.pickReward();if(card){this.lastGrant={round,card:card.id};this.add(card);}return card;}
 complete(){return this.enabledCards().length>0&&this.ownedUnique()===this.enabledCards().length;}
 completionCard(){return this.catalog.completion_card;}
 owned(id){return Number(this.collection[String(id)])||0;}
 ownedUnique(){return this.enabledCards().filter(c=>this.owned(c.id)>0).length;}
 totalOwned(){return this.enabledCards().reduce((sum,c)=>sum+this.owned(c.id),0);}
 milestoneUnlocked(){return this.ownedUnique()>=Math.max(1,Number(this.catalog.milestone_unique)||10);}
}
if(typeof module!=='undefined')module.exports=NamakoCards;
