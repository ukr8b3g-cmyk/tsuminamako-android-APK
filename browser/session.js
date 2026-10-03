/* Versioned, bounded local checkpoint. No demo state is saved. */

'use strict';

class NamakoSession{

 static key='namako_session_v1';

 static clear(){try{localStorage.removeItem(this.key);}catch(_){}}

 static read(){try{const s=JSON.parse(localStorage.getItem(this.key)||'null');if(!s||s.version!==1||typeof s.round!=='string'||!s.round||s.round.length>100)return null;

 const m=new NamakoRules();for(const k of ['nextId','kept','slipped','turns','randomState']){if(!Number.isSafeInteger(s.model[k])||s.model[k]<0)return null;m[k]=s.model[k];}

 if(!Array.isArray(s.model.board)||s.model.board.length!==96||!s.model.board.every(Number.isSafeInteger)||!Array.isArray(s.model.pieces)||s.model.pieces.length>48)return null;

 m.board=s.model.board;m.pieces=new Map(s.model.pieces);m.bag=s.model.bag;

 const cell=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isSafeInteger);

 for(const [id,p]of m.pieces)if(!Number.isSafeInteger(id)||id<=0||id>=m.nextId||!p||!Array.isArray(p.cells)||p.cells.length>4||!p.cells.every(cell)||!Number.isInteger(p.color)||p.color<0||p.color>5)return null;

 if(!Array.isArray(m.bag)||m.bag.length>6||new Set(m.bag).size!==m.bag.length||!m.bag.every(n=>Number.isInteger(n)&&n>=0&&n<6)||!m.verifyInvariants())return null;

 if(!Array.isArray(s.active)||s.active.length<2||s.active.length>4||!s.active.every(cell)||!cell(s.origin)||!Number.isInteger(s.color)||s.color<0||s.color>5||![0,1].includes(s.phase))return null;

 if(!s.next||!['shape','color'].every(k=>Number.isInteger(s.next[k])&&s.next[k]>=0&&s.next[k]<6))return null;

 if(s.phase===0&&!m.isClear()&&!m.canPlace(s.active,s.origin))return null;
 if(s.mode==='trivia'&&(!Number.isInteger(s.triviaId)||s.triviaId<1||s.triviaId>200))return null;
 if(s.targetRatio!==undefined&&![.7,.8,.85,.9,.95].includes(s.targetRatio))return null;
 if(s.difficulty!==undefined&&(!Number.isInteger(s.difficulty)||s.difficulty<0||s.difficulty>2))return null;

 return {...s,restoredModel:m};}catch(_){return null;}}
 static save(g){if(!g.roundId||g.triviaReturnMode||g.rewardFromDemo||g.mode==='demo'||g.mode==='clear')return;const m=g.model;const s={version:1,round:g.roundId,model:{board:m.board,pieces:[...m.pieces],nextId:m.nextId,kept:m.kept,slipped:m.slipped,turns:m.turns,randomState:m.randomState,bag:m.bag},active:g.active,origin:g.origin,color:g.activeColor,next:g.next,phase:g.phase===1?1:0,mode:g.mode,triviaId:g.triviaEpisode?.id||0,difficulty:g.difficultyIndex,targetRatio:g.targetRatio};try{localStorage.setItem(this.key,JSON.stringify(s));}catch(_){}}
}

