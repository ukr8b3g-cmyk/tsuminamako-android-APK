/* Namako Tsumi v0.3. Pure deterministic reference for scripts/rules.gd. */
'use strict';
class NamakoRules {
  static COLS=8; static ROWS=12; static TARGET=.8; static TOP_BUFFER=4;
  static SHAPES=[[[0,0],[1,0]],[[0,0],[1,0],[2,0]],[[0,0],[1,0],[2,0],[3,0]],[[0,0],[1,0],[1,1]],[[0,0],[1,0],[1,1],[2,1]],[[0,0],[1,0],[2,0],[2,1]]];
  constructor(seed=1){this.reset(seed);}
  reset(seed=1){this.board=Array(96).fill(0);this.pieces=new Map();this.nextId=1;this.kept=0;this.cleared=0;this.slipped=0;this.turns=0;this.randomState=seed>>>0;this.bag=[];}
  randomInt(limit){this.randomState=(this.randomState*1664525+1013904223)>>>0;return this.randomState%Math.max(limit,1);}
  nextSpec(difficulty=1){if(!this.bag.length){this.bag=[0,1,2,3,4,5];for(let i=5;i>0;i--){let j=this.randomInt(i+1);[this.bag[i],this.bag[j]]=[this.bag[j],this.bag[i]];}}return{shape:this.bag.pop(),color:(this.randomInt(16777216)>>>8)%[6,4,3][Math.max(0,Math.min(2,difficulty))]};}
  shape(index){return NamakoRules.SHAPES[Math.max(0,Math.min(5,index))].map(p=>p.slice());}
  rotate(cells,direction=1){let r=cells.map(([x,y])=>direction>0?[-y,x]:[y,-x]);let mx=Math.min(...r.map(p=>p[0])),my=Math.min(...r.map(p=>p[1]));return r.map(([x,y])=>[x-mx,y-my]);}
  width(cells){return Math.max(...cells.map(p=>p[0]+1),0);}
  at([x,y]){return x<0||x>=8||y<0||y>=12?0:this.board[y*8+x];}
  canPlace(cells,[ox,oy]){if(!cells.length)return false;const seen=new Set();for(const [x,y]of cells){let px=x+ox,py=y+oy,k=px+','+py;if(px<0||px>=8||py< -4||py>=12||this.at([px,py])||seen.has(k))return false;seen.add(k);}return true;}
  landing(cells,origin){let [x,y]=origin;if(!this.canPlace(cells,[x,y]))return[x,y];for(let i=0;i<17&&this.canPlace(cells,[x,y+1]);i++)y++;return[x,y];}
  preview(cells,[ox,oy],color=-1){let contacts=[],floor=false;if(!this.canPlace(cells,[ox,oy]))return{keep:false,reason:'blocked',contacts,floor:false};for(const [x,y]of cells){let px=x+ox,py=y+oy;if(py<0)return{keep:false,reason:'overflow',contacts,floor:false};floor ||= py===11;for(const [dx,dy]of [[1,0],[-1,0],[0,-1],[0,1]]){let id=this.at([px+dx,py+dy]);if(id&&!contacts.includes(id))contacts.push(id);}}contacts.sort((a,b)=>a-b);const big=contacts.some(id=>this.pieces.get(id)?.units===3),keep=floor||contacts.length>=2||big;const matchIds=keep&&color>=0?this.matchingIds(cells,[ox,oy],color):[];return{keep,reason:floor?'floor':contacts.length>=2?'friends':big?'big':'slip',contacts,floor,willClear:matchIds.length>=2,matchIds};}
  commit(cells,[ox,oy],color){let result=this.preview(cells,[ox,oy],color);result.id=0;this.turns++;if(!result.keep){this.slipped++;return result;}let absolute=cells.map(([x,y])=>[x+ox,y+oy]);for(const [x,y]of absolute)this.board[y*8+x]=this.nextId;this.pieces.set(this.nextId,{cells:absolute,color:Math.max(0,Math.min(5,color))});result.id=this.nextId++;this.kept++;result.match=this.clearMatching(result.id,result.matchIds);return result;}
  matchingIds(cells,[ox,oy],color){
    const ids=[],dirs=[[1,0],[-1,0],[0,-1],[0,1]],add=id=>{if(id&&this.pieces.get(id)?.color===color&&!ids.includes(id))ids.push(id);};
    for(const[x,y]of cells)for(const[dx,dy]of dirs)add(this.at([x+ox+dx,y+oy+dy]));
    for(let i=0;i<ids.length;i++)for(const[x,y]of this.pieces.get(ids[i]).cells)for(const[dx,dy]of dirs)add(this.at([x+dx,y+dy]));
    return ids.sort((a,b)=>a-b);
  }
  clearMatching(seed,neighbours){
    if(neighbours.length<2)return null;
    const ids=[seed,...neighbours],sources=ids.map(id=>this.pieces.get(id)),color=this.pieces.get(seed).color;
    for(const id of ids){const piece=this.pieces.get(id);for(const[x,y]of piece.cells)this.board[y*8+x]=0;this.cleared+=piece.units||1;this.pieces.delete(id);}
    return{id:seed,sources,color,count:ids.length};
  }
  fillCount(){return this.board.filter(x=>x>0).length;}
  fillRatio(){return this.fillCount()/96;}
  isClear(){return this.fillCount()>=77;}
  holes(){let count=0;for(let x=0;x<8;x++){let covered=false;for(let y=0;y<12;y++){if(this.at([x,y]))covered=true;else if(covered)count++;}}return count;}
  demoChoice(cells,preferSlip=false,color=0){let best=null,bestScore=-Infinity,rotated=cells.map(p=>p.slice());for(let rotation=0;rotation<4;rotation++){for(let x=0;x<=8-this.width(rotated);x++){let pos=this.landing(rotated,[x,-NamakoRules.TOP_BUFFER]),check=this.preview(rotated,pos,color);if(['blocked','overflow'].includes(check.reason))continue;let score=pos[1]*8;if(check.keep){score+=1000;const oldBoard=this.board.slice(),oldPieces=new Map(this.pieces),oldId=this.nextId,oldKept=this.kept,oldCleared=this.cleared,oldFill=this.fillCount(),oldTurns=this.turns;this.commit(rotated,pos,color);score+=(this.fillCount()-oldFill)*75;score-=this.holes()*35;this.board=oldBoard;this.pieces=oldPieces;this.nextId=oldId;this.kept=oldKept;this.cleared=oldCleared;this.turns=oldTurns;}else if(preferSlip&&pos[1]>2)score+=2000;score-=Math.abs(x-3)*.01;if(score>bestScore){bestScore=score;best={cells:rotated.map(p=>p.slice()),origin:pos,rotation,keep:check.keep};}}rotated=this.rotate(rotated);}return best;}
  retainableLanding(cells,includePath=false){
    // Search legal input states, including sideways movement during descent.
    // First try straight drops to keep the common, open-board case cheap.
    const rotations=[cells.map(p=>p.slice())];
    for(let i=1;i<4;i++)rotations.push(this.rotate(rotations[i-1]));
    for(let r=0;r<4;r++)for(let x=0;x<=8-this.width(rotations[r]);x++){
      const origin=this.landing(rotations[r],[x,-NamakoRules.TOP_BUFFER]);
      if(this.preview(rotations[r],origin).keep)return{cells:rotations[r],origin};
    }
    const start=[0,Math.floor((8-this.width(cells))/2),-NamakoRules.TOP_BUFFER];
    const queue=[start],seen=new Set([start.join(',')]),parents=new Map();
    let parent=start;
    const add=(r,x,y)=>{const key=[r,x,y].join(',');if(!seen.has(key)&&this.canPlace(rotations[r],[x,y])){seen.add(key);if(includePath)parents.set(key,parent);queue.push([r,x,y]);}};
    for(let i=0;i<queue.length;i++){
      const[r,x,y]=queue[i],shape=rotations[r];
      if(!this.canPlace(shape,[x,y+1])&&this.preview(shape,[x,y]).keep){const route=[];if(includePath){let cursor=[r,x,y];while(cursor){route.unshift({cells:rotations[cursor[0]].map(p=>p.slice()),origin:cursor.slice(1)});cursor=parents.get(cursor.join(','));}}return{cells:shape,origin:[x,y],route};}
      parent=queue[i];
      add(r,x-1,y);add(r,x+1,y);add(r,x,y+1);
      for(const direction of [-1,1]){const next=(r+direction+4)%4;for(const kick of [0,-1,1,-2,2,-3,3])if(this.canPlace(rotations[next],[x+kick,y])){add(next,x+kick,y);break;}}
    }
    return null;
  }
  entryPlan(cells,preferBest=false,color=-1){
    const center=[Math.floor((8-this.width(cells))/2),-NamakoRules.TOP_BUFFER];
    if(!preferBest&&!['blocked','overflow'].includes(this.preview(cells,this.landing(cells,center)).reason))return{cells:cells.map(p=>p.slice()),origin:center,route:[]};
    let best=null,score=-Infinity,rotated=cells.map(p=>p.slice());
    for(let r=0;r<4;r++){
      for(let x=0;x<=8-this.width(rotated);x++){
        const start=[x,-NamakoRules.TOP_BUFFER],spot=this.landing(rotated,start);
        const forecast=this.preview(rotated,spot,color);if(!forecast.keep)continue;
        const value=spot[1]*10-(preferBest&&forecast.willClear?10000:0)-Math.abs(x-(8-this.width(rotated))/2)*.1-r*.01;
        if(value>score){score=value;best={cells:rotated.map(p=>p.slice()),origin:start,route:[]};}
      }
      rotated=this.rotate(rotated);
    }
    if(best)return best;
    const reachable=this.retainableLanding(cells,true);
    return reachable?{cells:cells.map(p=>p.slice()),origin:center,route:reachable.route||[]}:null;
  }
  verifyInvariants(){let total=0,placements=0;if(this.board.length!==96)return false;for(const[id,piece]of this.pieces){const units=piece.units??1;if(![1,3].includes(units)||!piece.cells.length||piece.cells.length>(units===3?12:4)||(units===3&&piece.cells.length<3))return false;placements+=units;const seen=new Set();for(const p of piece.cells){const k=p.join(',');if(seen.has(k)||p[0]<0||p[0]>=8||p[1]<0||p[1]>=12||this.at(p)!==id)return false;seen.add(k);total++;}if(units===3){const reached=[piece.cells[0].join(',')];for(let i=0;i<reached.length;i++){const[x,y]=reached[i].split(',').map(Number);for(const[dx,dy]of [[1,0],[-1,0],[0,-1],[0,1]]){const k=[x+dx,y+dy].join(',');if(seen.has(k)&&!reached.includes(k))reached.push(k);}}if(reached.length!==seen.size)return false;}}for(const id of this.board)if(id&&!this.pieces.has(id))return false;return total===this.fillCount()&&this.cleared>=0&&this.kept===placements+this.cleared&&this.turns===this.kept+this.slipped;}
}
if(typeof module!=='undefined')module.exports=NamakoRules;
