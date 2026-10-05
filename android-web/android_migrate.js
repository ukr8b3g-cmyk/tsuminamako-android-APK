'use strict';
// One-time read-only import of native Godot saves. No eval or save deletion.
(()=>{
 const legacy=window.NAMAKO_LEGACY||{};
 function value(text){try{return JSON.parse(text.trim().replace(/Vector2i\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/g,'[$1,$2]').replace(/PackedInt32Array\(([\d,\s-]*)\)/g,'[$1]').replace(/Array\[(?:int|Vector2i)\]\((\[[\d,\s\[\]-]*\])\)/g,'$1').replace(/([{,]\s*)(-?\d+)\s*:/g,'$1"$2":'));}catch(_){return null;}}
 function section(file,name){
  const text=legacy[file]||'',match=text.match(new RegExp('(?:^|\\n)\\['+name+'\\]\\s*\\n([\\s\\S]*?)(?=\\n\\[|$)'));if(!match)return {};
  const keys=[...match[1].matchAll(/^([\w-]+)\s*=/gm)],result={};for(let i=0;i<keys.length;i++)result[keys[i][1]]=value(match[1].slice(keys[i].index+keys[i][0].length,i+1<keys.length?keys[i+1].index:undefined));return result;
 }
 const put=(key,data)=>{if(data!==null&&data!==undefined&&localStorage.getItem(key)===null)localStorage.setItem(key,typeof data==='string'?data:JSON.stringify(data));};
 try{
  if(localStorage.getItem('namako_native_import_v1')==='true')return;
  const counts=section('namako_cards.cfg','cards'),progress=section('namako_cards.cfg','progress'),cards={};
  for(const [id,count]of Object.entries(counts))if(Number.isSafeInteger(count)&&count>0)cards[id]=count;
  if(Object.keys(cards).length)put('namako_cards',{...cards,__lastGrant:progress.last_grant||{},__completionSeen:progress.completion_seen===true,__completionSize:progress.completion_size||12});
  const settings='namako_settings.cfg',audio=section(settings,'audio'),appearance=section(settings,'appearance'),gameplay=section(settings,'gameplay');
  if(Object.keys(audio).length){put('namako_audio',{music:audio.music!==false,sfx:audio.sfx!==false,level:Number.isFinite(audio.level)?audio.level:.7});put('namako_track',audio.track??0);}
  if(Object.keys(appearance).length){put('namako_theme',appearance.lcd?'lcd':appearance.dark===false?'light':'dark');put('namako_reduced_motion',appearance.reduced_motion===true);}
  put('namako_speed_index',gameplay.speed_index);put('namako_difficulty',gameplay.difficulty_index);
  const language=section('namako_language.cfg','ui').language;if(['ja','en'].includes(language))put('namako_language',language);
  const old=section('namako_session.cfg','session').state;
  if(old?.model&&typeof old.round==='string'){const m=old.model,model={board:m.board,pieces:Object.entries(m.pieces||{}).map(([id,p])=>[Number(id),p]),nextId:m.next_id,kept:m.kept,cleared:m.cleared??0,slipped:m.slipped,turns:m.turns,randomState:m.random_state,bag:m.bag};put('namako_session_v1',{version:old.version,round:old.round,model,active:old.active,origin:old.origin,color:old.color,next:old.next,phase:old.phase,mode:old.mode==='trivia'?'trivia':'paused',triviaId:old.trivia_id||0,difficulty:old.difficulty,targetRatio:old.target_ratio});}
  localStorage.setItem('namako_native_import_v1','true');
 }catch(_){/* Retry next launch if storage was unavailable. */}
 delete window.NAMAKO_LEGACY;
})();
