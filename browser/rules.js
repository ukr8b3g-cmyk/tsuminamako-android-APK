/* Namako Tsumi v0.3. Pure deterministic reference for scripts/rules.gd. */
'use strict';
class NamakoRules {
  static COLS=8; static ROWS=12; static TARGET=.8; static TOP_BUFFER=4;
  static SHAPES=[[[0,0],[1,0]],[[0,0],[1,0],[2,0]],[[0,0],[1,0],[2,0],[3,0]],[[0,0],[1,0],[1,1]],[[0,0],[1,0],[1,1],[2,1]],[[0,0],[1,0],[2,0],[2,1]]];
  constructor(seed=1){this.reset(seed);}
  reset(seed=1){this.board=Array(96).fill(0);this.pieces=new Map();this.nextId=1;this.kept=0;this.slipped=0;this.turns=0;this.randomState=seed>>>0;this.bag=[];}
  randomInt(limit){this.randomState=(this.randomState*1664525+1013904223)>>>0;return this.randomState%Math.max(limit,1);}
  nextSpec(){if(!this.bag.length){this.bag=[0,1,2,3,4,5];for(let i=5;i>0;i--){let j=this.randomInt(i+1);[this.bag[i],this.bag[j]]=[this.bag[j],this.bag[i]];}}return{shape:this.bag.pop(),color:this.randomInt(6)};}
  shape(index){return NamakoRules.SHAPES[Math.max(0,Math.min(5,index))].map(p=>p.slice());}
  rotate(cells,direction=1){let r=cells.map(([x,y])=>direction>0?[-y,x]:[y,-x]);let mx=Math.min(...r.map(p=>p[0])),my=Math.min(...r.map(p=>p[1]));return r.map(([x,y])=>[x-mx,y-my]);}
  width(cells){return Math.max(...cells.map(p=>p[0]+1),0);}
  at([x,y]){return x<0||x>=8||y<0||y>=12?0:this.board[y*8+x];}
  canPlace(cells,[ox,oy]){if(!cells.length)return false;const seen=new Set();for(const [x,y]of cells){let px=x+ox,py=y+oy,k=px+','+py;if(px<0||px>=8||py< -4||py>=12||this.at([px,py])||seen.has(k))return false;seen.add(k);}return true;}
  landing(cells,origin){let [x,y]=origin;if(!this.canPlace(cells,[x,y]))return[x,y];for(let i=0;i<17&&this.canPlace(cells,[x,y+1]);i++)y++;return[x,y];}
  preview(cells,[ox,oy]){let contacts=[],floor=false;if(!this.canPlace(cells,[ox,oy]))return{keep:false,reason:'blocked',contacts,floor:false};for(const [x,y]of cells){let px=x+ox,py=y+oy;if(py<0)return{keep:false,reason:'overflow',contacts,floor:false};floor ||= py===11;for(const [dx,dy]of [[1,0],[-1,0],[0,-1],[0,1]]){let id=this.at([px+dx,py+dy]);if(id&&!contacts.includes(id))contacts.push(id);}}contacts.sort((a,b)=>a-b);let keep=floor||contacts.length>=2;return{keep,reason:floor?'floor':keep?'friends':'slip',contacts,floor};}
  commit(cells,[ox,oy],color){let result=this.preview(cells,[ox,oy]);result.id=0;this.turns++;if(!result.keep){this.slipped++;return result;}let absolute=cells.map(([x,y])=>[x+ox,y+oy]);for(const [x,y]of absolute)this.board[y*8+x]=this.nextId;this.pieces.set(this.nextId,{cells:absolute,color:Math.max(0,Math.min(5,color))});result.id=this.nextId++;this.kept++;return result;}
  fillCount(){return this.board.filter(x=>x>0).length;}
  fillRatio(){return this.fillCount()/96;}
  isClear(){return this.fillCount()>=77;}
  holes(){let count=0;for(let x=0;x<8;x++){let covered=false;for(let y=0;y<12;y++){if(this.at([x,y]))covered=true;else if(covered)count++;}}return count;}
  demoChoice(cells,preferSlip=false){let best=null,bestScore=-Infinity,rotated=cells.map(p=>p.slice());for(let rotation=0;rotation<4;rotation++){for(let x=0;x<=8-this.width(rotated);x++){let pos=this.landing(rotated,[x,-NamakoRules.TOP_BUFFER]),check=this.preview(rotated,pos);if(['blocked','overflow'].includes(check.reason))continue;let score=pos[1]*8;if(check.keep){score+=1000;const oldBoard=this.board.slice(),oldPieces=new Map(this.pieces),oldId=this.nextId,oldKept=this.kept,oldTurns=this.turns;this.commit(rotated,pos,0);score-=this.holes()*35;this.board=oldBoard;this.pieces=oldPieces;this.nextId=oldId;this.kept=oldKept;this.turns=oldTurns;}else if(preferSlip&&pos[1]>2)score+=2000;score-=Math.abs(x-3)*.01;if(score>bestScore){bestScore=score;best={cells:rotated.map(p=>p.slice()),origin:pos,rotation,keep:check.keep};}}rotated=this.rotate(rotated);}return best;}
  retainableLanding(cells){
    // Search legal input states, including sideways movement during descent.
    // First try straight drops to keep the common, open-board case cheap.
    const rotations=[cells.map(p=>p.slice())];
    for(let i=1;i<4;i++)rotations.push(this.rotate(rotations[i-1]));
    for(let r=0;r<4;r++)for(let x=0;x<=8-this.width(rotations[r]);x++){
      const origin=this.landing(rotations[r],[x,-NamakoRules.TOP_BUFFER]);
      if(this.preview(rotations[r],origin).keep)return{cells:rotations[r],origin};
    }
    const start=[0,Math.floor((8-this.width(cells))/2),-NamakoRules.TOP_BUFFER];
    const queue=[start],seen=new Set([start.join(',')]);
    const add=(r,x,y)=>{const key=[r,x,y].join(',');if(!seen.has(key)&&this.canPlace(rotations[r],[x,y])){seen.add(key);queue.push([r,x,y]);}};
    for(let i=0;i<queue.length;i++){
      const[r,x,y]=queue[i],shape=rotations[r];
      if(!this.canPlace(shape,[x,y+1])&&this.preview(shape,[x,y]).keep)return{cells:shape,origin:[x,y]};
      add(r,x-1,y);add(r,x+1,y);add(r,x,y+1);
      for(const direction of [-1,1]){const next=(r+direction+4)%4;for(const kick of [0,-1,1,-2,2,-3,3])if(this.canPlace(rotations[next],[x+kick,y])){add(next,x+kick,y);break;}}
    }
    return null;
  }
  verifyInvariants(){let total=0;if(this.board.length!==96)return false;for(const[id,piece]of this.pieces){for(const p of piece.cells){if(p[0]<0||p[0]>=8||p[1]<0||p[1]>=12||this.at(p)!==id)return false;total++;}}for(const id of this.board)if(id&&!this.pieces.has(id))return false;return total===this.fillCount()&&this.kept===this.pieces.size&&this.turns===this.kept+this.slipped;}
}
if(typeof module!=='undefined')module.exports=NamakoRules;
