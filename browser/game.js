'use strict';
function namakoText(value){return globalThis.NamakoI18n?globalThis.NamakoI18n.t(value):value;}
/* Optional, dependency-free PC preview. Native Godot project is in the parent folder.
   Rendering is Canvas 2D; assets/audio is shared with Godot. No fetch/CDN/server. */
const $=id=>document.getElementById(id);
const audioSource=name=>(window.NAMAKO_AUDIO&&window.NAMAKO_AUDIO[name])||('../assets/audio/'+name+'.wav');
const TRIVIA_CARD_VOICES=['professor_card_voice','dog_card_voice','dolphin_card_voice'];
const NARRATION_VOICES=['professor_voice',...TRIVIA_CARD_VOICES];
const PALETTE=['#ff668b','#22c6c5','#ffc44c','#85ce47','#9a79e8','#ffa35c'];
// Soft colour on the LCD keeps same-colour matching readable.
const LCD_PALETTE=['#dba8b7','#92c8c3','#e2ce91','#afc686','#b9afd5','#deb48e'];
const GUIDE_SEEN_KEY='namako_guide_seen_v2_audio';
const TIPS=[
 'ルールはかんたん。床に着いたナマコは、そのまま残る。',
 '床より上では、別のナマコ２匹に触れると残る。',
 '触れるのが１匹以下なら、ぬるっと消える。',
 '緑の影＝残る場所。茶色の影＝消える場所。',
 '同じ色の3匹がつながると、泡になって消える。',
 '色を分けて積もう。かんたんは6色、ふつうは4色。',
 '水槽が80%埋まったら、仲間集合！\nみんなでくねくね、お祝いタイム。'
];
const SPEEDS=[{label:'×1.0',value:1.0},{label:'×1.5',value:1.5},{label:'×2.0',value:2.0},{label:'×3.0',value:3.0},{label:'マッハ',value:6.0}];
const CELEBRATION_MESSAGES=[
 'やったね！ 仲間が増えたよ。',
 'ぎゅうぎゅう。みんなでぬるぬる暮らそう。',
 '新しい仲間、無事に合流しました。',
 'ナマコの仲間たちのできあがり。',
 '今日も水槽がにぎやかです。',
 'ぬるっと集まって、めでたい。',
 'みんな一緒。いい感じに詰まりました。',
 '仲間写真には、ちょっと多すぎるかも。',
 'ぎっしりだけど、みんなごきげん。',
 'ひとりじゃない。ナマコだもの。',
 'おとなりさんが、また増えました。',
 'ぴたっ、ぬるっ、そして仲間たち。',
 '水槽いっぱいのしあわせ。',
 'いい詰まりっぷりです。',
 'みんな来た。みんな残った。',
 'ナマコ会議、参加者多数。',
 '今日の水槽も平和です。',
 'ぬるぬる指数、たいへん良好。',
 'ここが今日から、みんなのおうち。',
 'またひとつ、にぎやかになりました。'
];
const CLEAR_LANDING_SECONDS=.5;
const CLEAR_VIEW_SECONDS=1;
// Landing 0.5s + completed tank 1s + 2.2s to hear the supplied clear voice.
const CELEBRATION_SECONDS=3.7;
const B={x:86,y:180,w:368,h:552,c:46};
class AudioBank{
 constructor(){this.unlocked=false;this.musicEnabled=true;this.sfxEnabled=true;this.musicLevel=.7;try{const v=JSON.parse(localStorage.getItem('namako_audio')||localStorage.getItem('namako_v02_audio')||'{}');this.musicEnabled=v.music!==false;this.sfxEnabled=v.sfx!==false;this.musicLevel=Number.isFinite(v.level)?Math.max(0,Math.min(1,v.level)):.7;}catch(_){/* Private browsing storage may be unavailable. */}
 this.tracks=['tide_garden','bubble_parade','moon_pool','aquarium_air','drowse'];this.trackNames=['潮の庭','ぽにゅ散歩','月の水槽','水槽の呼吸','まどろみ'];this.trackIndex=0;try{this.trackIndex=Math.max(0,Math.min(this.tracks.length-1,Number(localStorage.getItem('namako_track'))||0));}catch(_){}this.music=new Audio(audioSource(this.tracks[this.trackIndex]));this.music.loop=true;this.music.preload='none';this.voices={};this.voiceIndex={};
 for(const name of ['move','rotate','drop','stick','slip','click','start','clear','clear_voice','professor_voice','professor_card_voice','dog_card_voice','dolphin_card_voice','fanfare','card_pop','card_rare','merge']){this.voices[name]=Array.from({length:3},()=>{const a=new Audio(audioSource(name));a.preload='none';if(NARRATION_VOICES.includes(name)){a.addEventListener('ended',()=>this.refreshNarration());a.addEventListener('error',()=>{a.pause();this.refreshNarration();});}return a;});this.voiceIndex[name]=0;}
 this.isDemo=true;this.isCelebrating=false;this.openingActive=false;this.narrationActive=false;this.apply();}
 trackLabel(){return namakoText(this.trackNames[this.trackIndex]);}
 cycleTrack(){this.trackIndex=(this.trackIndex+1)%this.tracks.length;this.music.pause();this.music.src=audioSource(this.tracks[this.trackIndex]);this.music.load();try{localStorage.setItem('namako_track',String(this.trackIndex));}catch(_){}this.apply();}
 unlock(){this.unlocked=true;this.apply();}
 apply(){this.music.volume=Math.min(1,this.musicLevel*.7*(this.isCelebrating?.4:(this.isDemo?.65:1))*(this.narrationActive?.3:1)*Math.pow(10,[.6,-1,-.4,2.7,1.1][this.trackIndex]/20));this.music.muted=!this.musicEnabled;if(this.unlocked&&this.musicEnabled&&!this.openingActive&&!document.hidden){this.music.play().catch(()=>{});}else this.music.pause();}
 demo(value){this.isDemo=value;this.isCelebrating=false;this.apply();} celebrate(value){this.isCelebrating=value;this.apply();}
 voicePlaying(name){return this.voices[name]?.some(a=>!a.paused&&!a.ended)||false;}
 refreshNarration(){this.narrationActive=NARRATION_VOICES.some(name=>this.voicePlaying(name));this.apply();}
 stopVoice(name){for(const a of this.voices[name]||[]){a.pause();try{a.currentTime=0;}catch(_){}}if(NARRATION_VOICES.includes(name))this.refreshNarration();}
 play(name,inDemo=false){if(!this.unlocked||!this.sfxEnabled||this.openingActive)return;const bank=this.voices[name];if(!bank)return;const a=bank[this.voiceIndex[name]++%bank.length];try{a.currentTime=0;}catch(_){}const narration=NARRATION_VOICES.includes(name),underVoice=['clear','fanfare'].includes(name)&&this.voicePlaying('clear_voice');a.volume=narration?(inDemo?.55:.82):name==='clear_voice'?(inDemo?.42:.82):underVoice?(inDemo?.08:.16):(inDemo?.16:.46);if(narration){this.narrationActive=true;this.apply();}a.play().catch(()=>{if(narration)this.refreshNarration();});}
 save(){try{localStorage.setItem('namako_audio',JSON.stringify({music:this.musicEnabled,sfx:this.sfxEnabled,level:this.musicLevel}));}catch(_){}}
 toggleMusic(){this.musicEnabled=!this.musicEnabled;this.unlock();this.apply();this.save();}
 toggleSfx(){this.sfxEnabled=!this.sfxEnabled;if(!this.sfxEnabled){for(const bank of Object.values(this.voices))for(const a of bank){a.pause();a.currentTime=0;}this.narrationActive=false;}this.unlock();this.save();this.play('click');}
}
// Keep the supplied opening clip separate from gameplay SFX and BGM.
class OpeningVoice{
 constructor(bank,onChange){this.bank=bank;this.onChange=onChange;this.voice=new Audio(audioSource('opening'));this.voice.preload='none';this.voice.volume=.8;this.active=false;this.pending=false;this.generation=0;this.state='ready';this.autoPending=false;
  this.voice.addEventListener('ended',()=>{if(this.active){this.state='done';this.onChange();}});
  this.voice.addEventListener('error',()=>{if(this.active){this.pending=false;this.autoPending=false;this.state='error';this.onChange();}});
 }
 open(auto){this.active=true;this.bank.openingActive=true;this.bank.apply();this.state=this.bank.sfxEnabled?'ready':'muted';this.autoPending=auto&&this.bank.sfxEnabled;this.onChange();if(this.autoPending)this.play();}
 play(){if(!this.active||document.hidden||!this.bank.sfxEnabled||this.pending)return;
  const attempt=++this.generation;this.pending=true;this.state='loading';try{this.voice.currentTime=0;}catch(_){}this.onChange();
  this.voice.play().then(()=>{if(attempt!==this.generation)return;this.pending=false;this.autoPending=false;this.state='playing';this.onChange();}).catch(error=>{if(attempt!==this.generation)return;this.pending=false;this.state=error.name==='NotAllowedError'?'blocked':'error';if(this.state==='error')this.autoPending=false;this.onChange();});
 }
 retry(){if(this.autoPending&&this.state==='blocked')this.play();}
 stop(){++this.generation;this.pending=false;this.autoPending=false;this.voice.pause();try{this.voice.currentTime=0;}catch(_){}this.state=this.bank.sfxEnabled?'done':'muted';if(this.active)this.onChange();}
 close(){this.stop();this.active=false;this.bank.openingActive=false;}
}
class NamakoApp{
 constructor(){this.model=new NamakoRules(73);this.audio=new AudioBank();this.cards=new NamakoCards();this.trivia=new NamakoTrivia();this.triviaEpisode=null;this.triviaReturnMode=null;this.rewardFromDemo=false;this.demoOverlayTime=0;this.rewardView=new NamakoRewardView(this);this.collectionOpen=false;this.lastReward=null;this.speedIndex=0;this.difficultyIndex=1;try{const saved=localStorage.getItem('namako_difficulty');if(saved!==null)this.difficultyIndex=Math.max(0,Math.min(2,Number(saved)||0));}catch(_){}this.easyGuide=null;try{this.speedIndex=Math.max(0,Math.min(SPEEDS.length-1,Number(localStorage.getItem('namako_speed_index'))||0));}catch(_){}this.mode='demo';this.phase=0;this.phaseTime=0;this.clock=0;this.demoClock=0;this.fallTime=0;this.demoWait=0;this.statusTime=0;this.active=[];this.origin=[0,-3];this.visual=[0,-3];this.next={};this.activeColor=0;this.showActive=true;this.pointer=null;this.keys=new Set();this.effects=[];this.impact=null;this.vanish=null;this.trails=[];this.dropSerial=0;this.celebrationTime=0;this.celebrationMessage='';this.lastTime=0;this.ctx=$('canvas').getContext('2d');this.scale=1;this.pixelRatio=1;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 this.helpOpen=false;this.firstGuide=false;this.settingsOpen=false;this.opening=new OpeningVoice(this.audio,()=>this.syncOpeningAudio());try{const reduced=localStorage.getItem("namako_reduced_motion");if(reduced!==null)this.reduced=reduced==="true";}catch(_){}this.dark=true;this.lcd=false;try{const theme=localStorage.getItem('namako_theme');if(theme){this.dark=theme==='dark';this.lcd=theme==='lcd';}}catch(_){}this.applyTheme();this.roundId="";this.saveClock=0;this.showingComplete=false;this.bind();this.resize();this.beginDemo();try{if((!window.NAMAKO_TEST_MODE||window.NAMAKO_TEST_ONBOARDING)&&localStorage.getItem(GUIDE_SEEN_KEY)!=='true')this.openHelp(true);}catch(_){if(!window.NAMAKO_TEST_MODE)this.openHelp(true);}requestAnimationFrame(t=>this.frame(t));}
 bind(){
 const demoSpeed=document.createElement('button');demoSpeed.id='demo-speed';demoSpeed.className='small';demoSpeed.onclick=()=>this.cycleSpeed();$('stage').appendChild(demoSpeed);
 for(const id of ['theme','track','speed','music','sfx'])$('settings-panel').appendChild($(id));
 $('music-volume').oninput=()=>{this.audio.musicLevel=Number($('music-volume').value)/100;this.audio.apply();this.audio.save();this.sync();};$('settings-open').onclick=()=>this.openSettings();$('settings-close').onclick=()=>this.closeSettings();
 $('language-toggle').onclick=()=>this.toggleLanguage();$('intro-language').onclick=()=>this.toggleLanguage();$('intro-demo').onclick=()=>this.finishHelp('demo');$('intro-play').onclick=()=>this.finishHelp('play');$('intro-return').onclick=()=>this.finishHelp('return');$('help-open').onclick=()=>this.openHelp(false);
 $('intro-audio').onclick=()=>{if(this.opening.state==='playing')this.opening.stop();else this.opening.play();};
 $('intro-layer').addEventListener('click',e=>{if(!e.target.closest('#intro-audio,#intro-demo,#intro-play,#intro-return'))this.opening.retry();});
 $('motion-toggle').onclick=()=>{this.reduced=!this.reduced;try{localStorage.setItem('namako_reduced_motion',String(this.reduced));}catch(_){}this.effects=[];this.rotation=null;this.sync();};
 const unlock=()=>{const wasUnlocked=this.audio.unlocked;this.audio.unlock();if(!wasUnlocked&&this.mode==='trivia')this.audio.play('professor_voice',this.rewardFromDemo&&!this.triviaReturnMode);};document.addEventListener('pointerdown',unlock,{once:true});document.addEventListener('keydown',unlock,{once:true});
 $('difficulty').onclick=()=>this.cycleDifficulty();$('resume-save').onclick=()=>this.resumeSaved();$('track').onclick=()=>{this.audio.cycleTrack();this.sync();};$('start').onclick=()=>this.beginPlay();$('left').onclick=()=>this.move([-1,0]);$('right').onclick=()=>this.move([1,0]);$('rotate').onclick=()=>this.rotate(1);$('drop').onclick=()=>this.hardDrop();$('menu').onclick=()=>this.pause();$('restart-pause').onclick=()=>this.beginPlay();$('continue').onclick=()=>this.resume();$('to-demo').onclick=()=>this.beginDemo();
  $('theme').onclick=()=>{if(this.lcd){this.lcd=false;this.dark=true;}else if(this.dark){this.dark=false;}else{this.lcd=true;}this.applyTheme();try{localStorage.setItem('namako_theme',this.lcd?'lcd':this.dark?'dark':'light');}catch(_){}this.audio.play('click');};$('music').onclick=()=>{this.audio.toggleMusic();this.sync();};$('sfx').onclick=()=>{this.audio.toggleSfx();this.sync();};$('speed').onclick=()=>this.cycleSpeed();$('lore-button').onclick=()=>this.openLore();$('trivia-more').onclick=()=>this.moreLore();const openProfessor=()=>this.openTriviaCard($('trivia-professor-card').src,namakoText('ガボジョイック・ベヘソナー博士'),'professor_card_voice');$('trivia-professor-open').onclick=openProfessor;$('trivia-professor-thumb').onclick=openProfessor;$('trivia-dog-open').onclick=()=>this.openTriviaCard($('trivia-dog-card').src,namakoText('助手の犬・コリ助'),'dog_card_voice');$('trivia-dolphin-open').onclick=()=>this.openTriviaCard($('trivia-dolphin-card').src,namakoText('イルカ・コリーヌ・プレ号'),'dolphin_card_voice');$('trivia-card-close').onclick=()=>this.closeTriviaCard();$('trivia-card-large').onclick=()=>this.closeTriviaCard();$('cards-button').onclick=()=>this.openCollection();$('collection-close').onclick=()=>this.closeCollection();$('reward-next').onclick=()=>this.finishReward();$('trivia-next').onclick=()=>this.finishTrivia();
 window.addEventListener('pagehide',()=>{NamakoSession.save(this);this.opening.stop();this.audio.stopVoice('clear_voice');this.audio.stopVoice('professor_voice');this.stopTriviaCardVoices();this.audio.music.pause();});window.addEventListener('resize',()=>this.resize());if(window.visualViewport)visualViewport.addEventListener('resize',()=>this.resize());document.addEventListener('visibilitychange',()=>{if(document.hidden){this.keys.clear();this.pointer=null;this.opening.stop();this.audio.stopVoice('clear_voice');this.audio.stopVoice('professor_voice');this.stopTriviaCardVoices();if(this.mode==='play')this.pause();}this.audio.apply();});window.addEventListener('blur',()=>{this.keys.clear();this.pointer=null;if(this.mode==='play')this.pause();});
 window.addEventListener('keydown',e=>this.keyDown(e));window.addEventListener('keyup',e=>this.keys.delete(e.code));
 const c=$('canvas');c.addEventListener('contextmenu',e=>e.preventDefault());c.addEventListener('pointerdown',e=>{if(this.helpOpen||this.settingsOpen||this.mode!=='play'||this.phase!==0||this.entryRoute.length)return;const p=this.point(e);if(!this.onBoard(p))return;if(e.button===2){e.preventDefault();this.hardDrop();return;}if(e.button!==0)return;this.pointer={id:e.pointerId,start:p,originX:this.origin[0]};c.setPointerCapture(e.pointerId);e.preventDefault();});
 c.addEventListener('pointermove',e=>{if(!this.pointer||e.pointerId!==this.pointer.id)return;const p=this.point(e),target=Math.max(0,Math.min(8-this.model.width(this.active),this.pointer.originX+Math.round((p[0]-this.pointer.start[0])/B.c)));for(let i=0;i<8&&this.origin[0]!==target;i++){if(!this.move([target>this.origin[0]?1:-1,0]))break;}});
 c.addEventListener('pointerup',e=>{if(!this.pointer||e.pointerId!==this.pointer.id)return;const p=this.point(e),dx=p[0]-this.pointer.start[0],dy=p[1]-this.pointer.start[1];this.pointer=null;if(dy>52&&dy>Math.abs(dx)*.8)this.hardDrop();else if(Math.hypot(dx,dy)<12)this.rotate(1);});
 c.addEventListener('pointercancel',()=>this.pointer=null);}
 resumeSaved(){const s=NamakoSession.read();if(!s){this.sync();return;}this.reset(1);this.roundId=s.round;this.roundTarget=s.targetRatio||0;this.model=s.restoredModel;this.active=s.active;this.origin=s.origin;this.visual=s.origin.slice();this.activeColor=s.color;this.next=s.next;this.phase=s.phase;this.difficultyIndex=Number.isInteger(s.difficulty)?s.difficulty:this.difficultyIndex;this.audio.unlock();this.audio.demo(false);this.mode='play';if(s.mode==='trivia'&&this.trivia.byId(s.triviaId)){this.triviaEpisode=this.trivia.byId(s.triviaId);this.mode='trivia';this.renderTrivia(this.triviaEpisode);this.sync();this.audio.play('professor_voice');return;}if(this.goalReached()){this.clear();}else{if(this.phase===1)this.spawn();else this.ensurePlayableTank();if(['celebrate','stuck'].includes(this.mode))return;this.mode='paused';this.sync();}}
 toggleLanguage(){
  const before=this.mode,previousStatus=NamakoI18n.source($('status').textContent);NamakoI18n.setLanguage(NamakoI18n.locale==='ja'?'en':'ja');
  this.trivia.catalog=window.NAMAKO_TRIVIA_CATALOG;this.trivia.episodes=this.trivia.catalog.episodes;
  if(this.triviaEpisode)this.triviaEpisode=this.trivia.byId(this.triviaEpisode.id);
  if(this.lastReward)this.lastReward=[...this.cards.enabledCards(),this.cards.completionCard()].find(c=>c.id===this.lastReward.id)||this.lastReward;
  if(before==='trivia'&&this.triviaEpisode)this.renderTrivia(this.triviaEpisode);
  this.prediction();this.sync();this.syncOpeningAudio();$('status').textContent=namakoText(previousStatus);this.draw();this.audio.play('click');
 }
 applyTheme(){document.documentElement.dataset.reduced=String(this.reduced);document.documentElement.dataset.theme=this.lcd?'lcd':this.dark?'dark':'light';$('theme').textContent=this.lcd?namakoText('液晶'):this.dark?namakoText('夜モード'):namakoText('昼モード');$('theme').setAttribute('aria-label',namakoText('表示モードを切替')); $('theme').setAttribute('aria-pressed',String(this.dark));}
 point(e){const r=$('stage').getBoundingClientRect();return[(e.clientX-r.left)/this.scale,(e.clientY-r.top)/this.scale];}
 onBoard([x,y]){return x>=B.x&&x<B.x+B.w&&y>=B.y&&y<B.y+B.h;}
 resize(){
 const bodyStyle=getComputedStyle(document.body),safeX=parseFloat(bodyStyle.paddingLeft||0)+parseFloat(bodyStyle.paddingRight||0),safeY=parseFloat(bodyStyle.paddingTop||0)+parseFloat(bodyStyle.paddingBottom||0);
 const rawW=Math.max(1,Math.min(innerWidth,window.visualViewport?visualViewport.width:innerWidth)-safeX),rawH=Math.max(1,Math.min(innerHeight,window.visualViewport?visualViewport.height:innerHeight)-safeY);
 const touch=matchMedia('(pointer: coarse)').matches||navigator.maxTouchPoints>0||rawW<=600,landscape=touch&&rawW>rawH;this.touch=touch;document.body.dataset.landscape=String(landscape);$('stage').dataset.touch=String(touch);
 const vw=landscape?Math.min(rawW,460):rawW,vh=landscape?Math.max(rawH,740):rawH;
 const height=Math.max(860,540*vh/vw),t=Math.min(1,(height-860)/280),extra=height-860-280*t;
 const layoutScale=Math.min(vw/540,vh/height,1.25),controlH=touch?Math.max(96+8*t,60/layoutScale):96+8*t,controlY=height-controlH-(touch?48:32),statusY=controlY-(touch?44:30),settingsY=90,settingsH=38+34*t,tipY=touch?Math.max(124,102+30*t):102+30*t,tipH=touch?Math.max(45+9*t,40/layoutScale):45+9*t,hudY=tipY+tipH+10,hudH=23+20*t;
 this.layoutHeight=height;this.layoutT=t;$('stage').style.setProperty('--layout-t',t);this.uiLayout={controlH,controlY,statusY,settingsY,settingsH,tipY,tipH,hudY,hudH};B.c=45+14*t+Math.min(3,extra/60);B.c=Math.min(B.c,(statusY-18-(hudY+46))/12);B.w=B.c*8;B.h=B.c*12;B.x=(540-B.w)/2;B.y=Math.max(hudY+46,Math.min(180+103*t+extra*.35,statusY-18-B.h));this.tankBackdrop=null;
 this.scale=layoutScale;$('stage').style.setProperty('--touch-target-height',Math.ceil(44/this.scale)+'px');$('stage').style.setProperty('--touch-header-font',Math.max(18,13/this.scale)+'px');$('stage').style.setProperty('--touch-body-font',Math.max(18,14/this.scale)+'px');$('stage').style.setProperty('--touch-small-font',Math.max(16,12/this.scale)+'px');$('wrap').style.width=540*this.scale+'px';$('wrap').style.height=height*this.scale+'px';$('stage').style.height=height+'px';$('stage').style.transform=`scale(${this.scale})`;
 this.pixelRatio=Math.min(3,Math.max(1,devicePixelRatio*this.scale),Math.sqrt(8000000/(540*height)));$('canvas').style.height=height+'px';$('canvas').width=Math.round(540*this.pixelRatio);$('canvas').height=Math.round(height*this.pixelRatio);
 const place=(id,props)=>{const style=$(id).style;for(const[k,v]of Object.entries(props))style[k]=v+'px';};
 place('version',{left:22,top:43});$('version').hidden=true;place('difficulty',{left:20,top:8+12*t,width:116,height:74});place('menu',{left:144,top:8+12*t,width:116,height:74});place('lore-button',{left:268,top:8+12*t,width:116,height:74});place('cards-button',{left:392,top:8+12*t,width:128,height:74});placeTitle();
 function placeTitle(){const h=document.querySelector('h1');Object.assign(h.style,{left:(B.x+12)+'px',top:(B.y+14)+'px',width:(B.w-110)+'px',textAlign:'left'});}
 place('settings-open',{left:20,top:8+12*t,width:94,height:74});
 place('demo-speed',{left:220,top:8+12*t,width:94,height:74,fontSize:16});
 for(const [id,x]of [['difficulty',120],['menu',220],['lore-button',320],['cards-button',420]])place(id,{left:x,width:id==='cards-button'?100:94,fontSize:18});
 place('music',{width:196});place('settings-layer',{height});place('settings-panel',{top:(height-680)/2});
 for(const [i,id]of ['theme','track','speed','music','sfx'].entries())place(id,{left:24,top:76+i*84,width:412,height:74,fontSize:20});place('music',{width:196});
 place('tip',{top:tipY,height:tipH});place('fill',{left:20,top:hudY,width:65,height:hudH,fontSize:26});place('target',{left:90,top:hudY+9,width:76});place('mode',{left:B.x+12,top:B.y+54,width:B.w-110,height:26});place('count',{left:395,top:hudY,width:125});place('next-label',{left:B.x+B.w-145,top:B.y+7});
 place('status',{left:touch?20:75,top:statusY,width:touch?500:390,height:touch?36:24});place('footer',{top:height-(touch?42:25),height:touch?38:20});
 for(const id of ['start','resume-save'])place(id,{top:controlY+8,height:controlH-16});
 for(const [id,x,w] of [['left',27,92],['right',127,92],['rotate',227,118],['drop',353,160]])place(id,{left:x,top:controlY+8,width:w,height:controlH-16});
 const middle=(height-860)/2;place('reward',{left:20,top:16,width:500,height:height-32});place('trivia',{top:16,height:height-32});
 const panelH=height-32,areaH=panelH-300,artH=Math.min(areaH,660),artW=artH*2/3;
 place('reward-flip',{left:(500-artW)/2,top:78+(areaH-artH)/2,width:artW,height:artH});place('reward-aura',{left:(500-artW)/2-20,top:58+(areaH-artH)/2,width:artW+40,height:artH+40});
 place('reward-title',{width:460});place('reward-note',{top:panelH-210,width:450,height:125});place('reward-next',{left:80,top:panelH-75,width:340});
 document.querySelector('.trivia-paper').style.height=(panelH-426-92)+'px';document.querySelector('.trivia-footnote').style.top=(panelH-88)+'px';place('trivia-next',{top:panelH-70});place('trivia-more',{top:panelH-70});place('collection',{top:35+middle});place('modal',{top:302+middle});place('celebrate-banner',{top:332+middle});
}
 approximateRemaining(){const needed=Math.max(0,Math.ceil(this.targetRatio*96)-this.model.fillCount());const mean=this.model.constructor.SHAPES?this.model.constructor.SHAPES.reduce((n,s)=>n+s.length,0)/this.model.constructor.SHAPES.length:20/6;return Math.ceil(needed/mean);}
 syncOpeningAudio(){const button=$('intro-audio'),state=this.opening.state;button.disabled=state==='loading'||state==='muted';button.textContent=namakoText(state==='playing'?'■ 音声を止める':state==='done'?'↻ もう一度聞く':state==='blocked'?'▶ タップで音声を再生':state==='muted'?'音声 OFF（SE設定）':state==='loading'?'音声を準備中…':state==='error'?'▶ 音声を再試行':'▶ 音声を聞く');}
 openHelp(first=false){
 if(this.helpOpen)return;this.helpOpen=true;this.firstGuide=first;this.keys.clear();this.pointer=null;
 $('wrap').inert=true;$('intro-layer').hidden=false;$('intro-return').hidden=first;this.opening.open(first);$('intro-layer').scrollTop=0;$('intro-play').focus({preventScroll:true});
}
finishHelp(action){
 if(!this.helpOpen)return;this.helpOpen=false;this.firstGuide=false;try{localStorage.setItem(GUIDE_SEEN_KEY,'true');}catch(_){}
 this.opening.close();$('intro-layer').hidden=true;$('wrap').inert=false;this.lastTime=0;
 if(action==='play')this.beginPlay();else if(action==='demo'){this.audio.unlock();this.beginDemo();}else{this.audio.apply();this.sync();$('help-open').focus();}
}
openSettings(){if(!['demo','play','paused'].includes(this.mode)||this.collectionOpen)return;this.settingsOpen=true;this.keys.clear();this.pointer=null;this.settingsInert=[...$('stage').children].filter(e=>e!==$('settings-layer')).map(e=>[e,e.inert]);for(const [e]of this.settingsInert)e.inert=true;$('settings-layer').hidden=false;$('settings-close').focus();this.sync();}
 closeSettings(){this.settingsOpen=false;$('settings-layer').hidden=true;for(const [e,inert]of this.settingsInert||[])e.inert=inert;this.settingsInert=[];this.lastTime=0;this.sync();$('settings-open').focus();}
 reset(seed){this.audio.stopVoice?.('clear_voice');this.audio.stopVoice?.('professor_voice');this.stopTriviaCardVoices();this.matchEffect=null;this.entryRoute=[];this.entryTime=0;this.roundTarget=0;this.clearReason='goal';this.celebrationStage=null;this.model.reset(seed);this.effects=[];this.impact=null;this.vanish=null;this.trails=[];this.phase=0;this.phaseTime=0;this.fallTime=0;this.pointer=null;this.statusTime=0;this.celebrationTime=0;this.celebrationMessage='';this.lastReward=null;this.collectionOpen=false;this.rewardView.hide();this.rewardView.hideCollection();this.triviaEpisode=null;this.triviaReturnMode=null;$('trivia').hidden=true;this.audio.celebrate(false);this.keys.clear();this.next=this.model.nextSpec(this.difficultyIndex);this.spawn();}
 beginDemo(){if(['play','paused'].includes(this.mode))NamakoSession.save(this);this.mode='demo';this.rewardFromDemo=false;this.demoClock=0;this.reset(73);this.audio.demo(true);this.status(namakoText('ぽにゅっと、ぴたっ。次はどの仲間かな？'),3.0);this.sync();}
 beginPlay(seed=Date.now()>>>0){this.roundId=Date.now().toString(36)+Math.random().toString(36).slice(2);this.showingComplete=false;this.rewardFromDemo=false;this.mode='play';this.reset(seed);this.audio.unlock();this.audio.demo(false);this.audio.play('start');this.status(namakoText('床なら残る。床より上は２匹に触れれば残る。'),3.2);this.sync();NamakoSession.save(this);}
 spawn(){this.rotation=null;this.active=this.model.shape(this.next.shape);this.activeColor=this.next.color;this.next=this.model.nextSpec(this.difficultyIndex);this.origin=[Math.floor((8-this.model.width(this.active))/2),-NamakoRules.TOP_BUFFER];this.phase=0;this.fallTime=0;if(!this.ensurePlayableTank())return;if(this.mode==='demo'&&!this.entryRoute.length){const plan=this.model.demoChoice(this.active,this.model.turns>2&&this.model.turns%5===3,this.activeColor);if(plan){this.active=plan.cells;this.origin[0]=plan.origin[0];this.demoTarget=plan.origin[0];}else this.demoTarget=this.origin[0];this.demoWait=.45;}this.visual=this.origin.slice();this.showActive=true;this.prediction();this.sync();}
 keyDown(e){if(this.helpOpen){if(e.code==='Escape'&&!this.firstGuide)this.finishHelp('return');return;}if(this.settingsOpen){if(e.code==='Escape'){e.preventDefault();this.closeSettings();}return;}const handled=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyZ','KeyX','KeyA','KeyD','KeyS','KeyR','KeyP','Escape','Enter','NumpadEnter'];if(!handled.includes(e.code))return;
 // Preserve standard keyboard activation of focused menu/settings buttons.
 if(e.target instanceof HTMLButtonElement&&(['Enter','NumpadEnter'].includes(e.code)||(e.code==='Space'&&!['left','right','rotate','drop'].includes(e.target.id)))){return;}
  e.preventDefault();if(this.collectionOpen){if(!e.repeat&&e.code==='Escape'){if(document.getElementById('card-zoom'))this.rewardView.hideZoom();else this.closeCollection();}return;}if(this.mode==='reveal'){if(!e.repeat&&['Escape','Enter','NumpadEnter','Space'].includes(e.code))this.finishReward();return;}if(this.mode==='trivia'){if(!e.repeat&&['Escape','Enter','NumpadEnter','Space'].includes(e.code)){if(!$('trivia-card-viewer').hidden)this.closeTriviaCard();else this.finishTrivia();}return;}if(this.mode==='celebrate')return;this.keys.add(e.code);if(this.mode==='demo'){if(!e.repeat&&['Enter','NumpadEnter','Space'].includes(e.code))this.beginPlay();return;}
  if(!e.repeat&&e.code==='KeyR'){this.beginPlay();return;}
  if(['paused','clear','stuck'].includes(this.mode)){if(!e.repeat&&['Escape','Enter','NumpadEnter','Space'].includes(e.code))this.resume();return;}
 if(['ArrowLeft','KeyA'].includes(e.code))this.move([-1,0]);else if(['ArrowRight','KeyD'].includes(e.code))this.move([1,0]);else if(!e.repeat){if(e.code==='KeyZ')this.rotate(-1);else if(['KeyX','ArrowUp'].includes(e.code))this.rotate(1);else if(e.code==='Space')this.hardDrop();else if(['Escape','KeyP'].includes(e.code))this.pause();}}
 cycleDifficulty(){if(['celebrate','reveal','trivia'].includes(this.mode))return;this.roundTarget=0;this.difficultyIndex=(this.difficultyIndex+1)%3;try{localStorage.setItem('namako_difficulty',String(this.difficultyIndex));}catch(_){}this.audio.play('click');this.prediction();this.sync();NamakoSession.save(this);}
 applyEntryPlan(){
  const plan=this.model.entryPlan(this.active,this.mode==='play'&&this.difficultyIndex===0,this.activeColor);
  if(!plan)return false;
  const moved=String(this.origin)!==String(plan.origin)||JSON.stringify(this.active)!==JSON.stringify(plan.cells);
  this.active=plan.cells;this.origin=plan.origin;this.visual=this.origin.slice();this.entryRoute=plan.route;this.entryTime=0;this.phase=0;this.fallTime=0;this.showActive=true;
  if(moved||this.entryRoute.length)this.status(namakoText('空いている投入口から落とすよ。'),2);
  return true;
 }
 stuck(){
  this.entryRoute=[];this.showActive=false;this.pointer=null;this.keys.clear();
  if(this.mode==='demo'){this.phase=2;this.phaseTime=1.5;this.status(namakoText('水槽がいっぱい。次の水槽へ。'),1.5);}
  else{this.mode='stuck';this.phase=1;this.sync();NamakoSession.save(this);}
 }
 ensurePlayableTank(){
  if(this.origin[1]>=0&&this.model.canPlace(this.active,this.origin))return true;
  if(this.model.retainableLanding(this.active)&&this.applyEntryPlan())return true;
  const available=NamakoRules.SHAPES.map((_,i)=>!!this.model.retainableLanding(this.model.shape(i)));
  if(!available.some(Boolean)){this.stuck();return false;}
  for(let i=0;i<12;i++){
   const spec=this.next;this.next=this.model.nextSpec(this.difficultyIndex);
   if(available[spec.shape]){this.active=this.model.shape(spec.shape);this.activeColor=spec.color;if(this.applyEntryPlan()){this.status(namakoText('この形は入らないので、入る仲間に交代！'),2);return true;}}
  }
  this.stuck();return false;
 }
 get targetRatio(){return this.difficultyIndex===0?Math.min(this.roundTarget||.7,.7):this.roundTarget||[.7,.9,.95][this.difficultyIndex];}
 goalReached(){return this.model.fillRatio()>=this.targetRatio;}
 recommend(){if(this.mode!=='play'||this.difficultyIndex!==0||!this.active.length)return null;let best=null,score=-Infinity;for(let x=0;x<=8-this.model.width(this.active);x++){const start=[x,-NamakoRules.TOP_BUFFER];if(!this.model.canPlace(this.active,start))continue;const spot=this.model.landing(this.active,start),pred=this.model.preview(this.active,spot,this.activeColor);if(!pred.keep)continue;const value=spot[1]*10+pred.contacts.length*2-(pred.willClear?10000:0)-Math.abs(x-3)*.1;if(value>score){score=value;best=spot;}}return best;}
 cycleSpeed(){this.speedIndex=(this.speedIndex+1)%(this.mode==='demo'?SPEEDS.length:4);try{localStorage.setItem('namako_speed_index',String(this.speedIndex));}catch(_){}this.audio.play('click');this.status(namakoText('落下スピード ')+namakoText(SPEEDS[this.speedIndex===4&&this.mode!=='demo'?3:this.speedIndex].label),1.1);this.sync();}
 get speed(){return SPEEDS[this.speedIndex===4&&this.mode!=='demo'?3:this.speedIndex].value*(this.difficultyIndex===2&&this.mode!=='demo'?1.4:this.difficultyIndex===0&&this.mode!=='demo'?.75:1);}
 openLore(){if(this.collectionOpen||!['demo','play','paused'].includes(this.mode))return;const episode=this.trivia.pick();if(!episode)return;const returnMode=this.mode;if(returnMode==='play')NamakoSession.save(this);this.triviaReturnMode=returnMode;this.triviaEpisode=episode;this.mode='trivia';this.demoOverlayTime=0;this.renderTrivia(episode);this.audio.play('click',returnMode==='demo');this.sync();this.audio.play('professor_voice');}
 stopTriviaCardVoices(){for(const name of TRIVIA_CARD_VOICES)this.audio.stopVoice?.(name);}
 openTriviaCard(image,title,voice=null){if(this.mode!=='trivia')return;this.stopTriviaCardVoices();if(voice)this.audio.stopVoice?.('professor_voice');$('trivia-card-large').src=image;$('trivia-card-large').alt=title+namakoText('のカード');$('trivia-card-caption').textContent=title;$('trivia-card-viewer').hidden=false;const demo=this.triviaReturnMode==='demo'||this.rewardFromDemo;this.audio.play('click',demo);if(voice)this.audio.play(voice,demo);}
 closeTriviaCard(){this.stopTriviaCardVoices();if($('trivia-card-viewer').hidden)return;$('trivia-card-viewer').hidden=true;$('trivia-card-large').removeAttribute('src');this.audio.play('click',this.triviaReturnMode==='demo'||this.rewardFromDemo);}
 moreLore(){if(this.mode!=='trivia'||!this.triviaReturnMode)return;const episode=this.trivia.pick();if(!episode)return;this.triviaEpisode=episode;this.renderTrivia(episode);this.audio.play('click',this.triviaReturnMode==='demo');}
 openCollection(){if(!this.cards.rewardsEnabled()||['celebrate','reveal','trivia'].includes(this.mode))return;this.collectionOpen=true;this.keys.clear();this.pointer=null;this.rewardView.showCollection();this.audio.play('click');this.sync();}
 closeCollection(){if(!this.collectionOpen)return;this.collectionOpen=false;this.rewardView.hideCollection();this.audio.play('click');this.sync();}
 move([dx,dy],audible=true){if(!['play','demo'].includes(this.mode)||this.phase!==0||this.entryRoute.length)return false;const p=[this.origin[0]+dx,this.origin[1]+dy];if(!this.model.canPlace(this.active,p))return false;this.origin=p;if(audible&&dx)this.audio.play('move',this.mode==='demo');this.prediction();return true;}
 rotate(direction=1){if(this.mode!=='play'||this.phase!==0||this.entryRoute.length)return;const r=this.model.rotate(this.active,direction);for(const kick of [0,-1,1,-2,2,-3,3]){const p=[this.origin[0]+kick,this.origin[1]];if(this.model.canPlace(r,p)){this.rotation={from:this.active.map(([x,y])=>[(x+this.visual[0]+.5)*B.c,(y+this.visual[1]+.5)*B.c]),time:this.clock};this.active=r;this.origin=p;this.audio.play('rotate');this.prediction();return;}}}
 hardDrop(){if(this.mode!=='play'||this.phase!==0||this.entryRoute.length)return;const old=this.origin.slice();this.origin=this.model.landing(this.active,this.origin);for(const p of this.active)this.trails.push({x:(p[0]+old[0]+.5)*B.c,y1:(p[1]+old[1]+.5)*B.c,y2:(p[1]+this.origin[1]+.5)*B.c,t:0,color:PALETTE[this.activeColor]});this.visual=this.origin.slice();this.audio.play('drop');this.lock();}
 lock(){if(this.phase!==0)return;if(['blocked','overflow'].includes(this.model.preview(this.active,this.origin).reason)){this.ensurePlayableTank();this.prediction();this.sync();return;}const r=this.model.commit(this.active,this.origin,this.activeColor);this.phase=1;this.phaseTime=.70;this.showActive=false;this.pointer=null;this.dropSerial++;const absolute=this.active.map(([x,y])=>[x+this.origin[0],y+this.origin[1]]),center=absolute.reduce((s,p)=>[s[0]+(p[0]+.5)*B.c/absolute.length,s[1]+(p[1]+.5)*B.c/absolute.length],[0,0]);
 if(r.keep){this.impact={id:r.id,t:0};this.burst(center,PALETTE[this.activeColor]);if(r.match){this.matchEffect={...r.match,t:0};this.phaseTime=.95;this.audio.play('merge',this.mode==='demo');this.status(namakoText('ぽにゅっ！ 同じ色の%d匹が泡になった！').replace('%d',String(r.match.count)),1.8);}else{this.audio.play('stick',this.mode==='demo');this.status(namakoText(r.reason==='floor'?'ぴたっ！　床にくっついた。':r.reason==='big'?'大きなナマコが支えてくれた！':'ぴたっ！　２匹にくっついて残った。'),1.35);}}
 else{this.vanish={cells:absolute,color:this.activeColor,t:0};this.burst(center,PALETTE[this.activeColor],true);this.audio.play('slip',this.mode==='demo');this.status(r.reason==='overflow'?namakoText('上はいっぱい。横にずらしてみよう。'):namakoText('ぬるっ…　大丈夫、次を置こう。'),1.35);}if(r.keep&&this.goalReached()){this.clear(this.mode==='demo');return;}this.sync();NamakoSession.save(this);}
 status(text,seconds){$('status').textContent=text;$('status').style.color='#348d7d';this.statusTime=seconds;}
 prediction(){this.easyGuide=this.recommend();if(this.mode!=='play'||this.phase!==0||this.statusTime>0)return;if(this.difficultyIndex===2){$('status').textContent=namakoText('着地をよく見て、仲間をつなごう。');return;}const r=this.model.preview(this.active,this.model.landing(this.active,this.origin),this.activeColor);$('status').textContent=r.willClear?namakoText('同じ色が3匹つながる！ 色を分けよう。'):r.keep?(r.floor?namakoText('床にぴたっ。ここなら残る！'):namakoText('ここなら残る！')):namakoText('ここだと消える → 横にずらす／回してみよう');$('status').style.color=r.willClear?'#ad7bea':r.keep?'#348d7d':'#a07745';}
 pause(){if(this.mode!=='play')return;this.mode='paused';NamakoSession.save(this);this.pointer=null;this.keys.clear();this.audio.play('click');this.sync();}
 resume(){if(['clear','stuck'].includes(this.mode))this.beginPlay();else if(this.mode==='paused'){this.mode='play';this.audio.play('click');this.sync();}}
 clear(fromDemo=false,reason='goal'){
  if(this.mode==='celebrate'||this.mode==='reveal')return;
  this.clearReason=reason;this.roundTarget=this.targetRatio;this.rewardFromDemo=fromDemo;this.mode='celebrate';this.showActive=false;this.pointer=null;this.keys.clear();
  this.celebrationTime=CELEBRATION_SECONDS;this.celebrationStage='landing';
  this.celebrationMessage=reason==='packed'?namakoText('どの仲間も入らないので、この水槽は完成！'):namakoText(CELEBRATION_MESSAGES[Math.floor(Math.random()*CELEBRATION_MESSAGES.length)]);
  this.clearMilestoneNew=false;
  if(!fromDemo&&this.cards.rewardsEnabled()){
   const before=this.cards.milestoneUnlocked();this.lastReward=this.cards.grantForRound(this.roundId);this.clearMilestoneNew=!before&&this.cards.milestoneUnlocked();
  }
  this.audio.celebrate(true);this.status(namakoText('ぴたっ！ 最後の仲間が着地。'),CELEBRATION_SECONDS);this.sync();NamakoSession.save(this);
 }
 updateCelebration(dt){
  this.celebrationTime=Math.max(0,this.celebrationTime-dt);
  const elapsed=CELEBRATION_SECONDS-this.celebrationTime;
  const stage=elapsed<CLEAR_LANDING_SECONDS?'landing':elapsed<CLEAR_LANDING_SECONDS+CLEAR_VIEW_SECONDS?'view':'party';
  if(stage!==this.celebrationStage){
   this.celebrationStage=stage;
   if(stage==='view')this.status(namakoText('ぎゅっと集合。完成した水槽を眺めよう。'),1);
   if(stage==='party'){
    this.audio.play('clear_voice',this.rewardFromDemo);this.audio.play('clear',this.rewardFromDemo);this.audio.play('fanfare',this.rewardFromDemo);
    this.burst([B.w*.2,B.h*.3],'#f6ce6e',false,true);this.burst([B.w*.5,B.h*.5],'#f7869b',false,true);this.burst([B.w*.8,B.h*.3],'#58c9c7',false,true);
    this.status(namakoText(this.clearReason==='packed'?'ぎゅうぎゅう！ 水槽満員！':'やったね！ 水槽完成！'),.8);
   }
   this.sync();
  }
  if(this.celebrationTime===0)this.finishCelebration();
 }
 finishCelebration(){
  if(this.mode!=='celebrate')return;
  this.audio.celebrate(false);
  if(this.rewardFromDemo){this.showDemoTrivia();return;}
  if(!this.rewardFromDemo&&this.cards.rewardsEnabled()){
   const card=this.lastReward||this.cards.grantForRound(this.roundId);
   if(card){this.lastReward=card;this.mode='reveal';this.rewardView.show(card,this.cards.owned(card.id),this.clearMilestoneNew);this.sync();NamakoSession.save(this);return;}
  }
  this.nextTank();
 }
 showDemoTrivia(){
  const episode=this.trivia.pick();if(!episode){this.nextTank();return;}
  this.triviaReturnMode=null;this.triviaEpisode=episode;this.mode='trivia';
  // Reading time is independent of fall speed. Japanese uses characters,
  // English uses words; a card opened by the reader pauses this countdown.
  const readingUnits=NamakoI18n.locale==='ja'?episode.body.length/7:episode.body.trim().split(/\s+/).length/3;
  this.demoOverlayTime=Math.max(12,Math.min(40,readingUnits));
  this.renderTrivia(episode);this.sync();this.audio.play('professor_voice',true);
 }
 nextTank(){const demo=this.rewardFromDemo;this.rewardView.hide();this.rewardFromDemo=false;this.demoOverlayTime=0;if(demo)this.beginDemo();else{NamakoSession.clear();this.beginPlay();}}
 finishReward(){if(this.mode!=='reveal')return;if(!this.showingComplete&&this.cards.complete()&&!this.cards.completionSeen){this.showingComplete=true;this.demoOverlayTime=this.rewardFromDemo?6.5:0;this.rewardView.show(this.cards.completionCard(),1,false);this.sync();return;}if(this.showingComplete){this.cards.completionSeen=true;this.cards.save();this.showingComplete=false;}this.rewardView.hide();this.nextTank();}
 renderTrivia(episode){$('trivia-number').textContent=namakoText(`研究手帖 ${String(episode.id).padStart(3,'0')} / ${String(this.trivia.episodes.length).padStart(3,'0')}`);$('trivia-title').textContent=episode.title;$('trivia-body').textContent=episode.body;document.querySelector('.trivia-footnote').textContent=namakoText(episode.id>100?'つみなまこのお話・フィクション':'ツミナマコは架空の生き物です。');$('trivia-paper').scrollTop=0;}
 finishTrivia(){if(this.mode!=='trivia'&&this.mode!=='celebrate')return;this.audio.stopVoice?.('professor_voice');this.stopTriviaCardVoices();this.closeTriviaCard();if(this.triviaReturnMode){const returnMode=this.triviaReturnMode;this.triviaReturnMode=null;this.triviaEpisode=null;this.demoOverlayTime=0;this.mode=returnMode;this.audio.play('click',returnMode==='demo');this.sync();return;}const demo=this.rewardFromDemo;this.triviaEpisode=null;this.rewardFromDemo=false;this.demoOverlayTime=0;$('trivia').hidden=true;if(!demo)NamakoSession.clear();this.audio.play('click',demo);if(demo)this.beginDemo();else this.beginPlay();}
 sync(){if($('language-toggle'))$('language-toggle').textContent=namakoText('日本語 / EN');if($('intro-language'))$('intro-language').textContent=namakoText('日本語 / EN');$('menu').textContent=namakoText('Ⅱ\nメニュー');if($('demo-speed')){$('demo-speed').hidden=this.mode!=='demo'||this.collectionOpen;$('demo-speed').textContent=namakoText('速さ ').trim()+'\n'+namakoText(SPEEDS[this.speedIndex].label);$('demo-speed').setAttribute('aria-label',namakoText('落下スピード ')+namakoText(SPEEDS[this.speedIndex].label)); }if($('settings-open')){$('settings-open').hidden=!['demo','play','paused'].includes(this.mode)||this.collectionOpen;$('motion-toggle').textContent=namakoText('演出を軽く: ')+(this.reduced?'ON':'OFF');}if(document.documentElement?.dataset)this.applyTheme();const saved=NamakoSession.read();$('track').textContent='♪ '+this.audio.trackLabel();$('difficulty').textContent=[namakoText('かんたん'),namakoText('ふつう'),namakoText('むずかしい')][this.difficultyIndex];$('difficulty').setAttribute('aria-label',namakoText('難易度を変更。現在')+$('difficulty').textContent);$('target').textContent='/ '+Math.round(this.targetRatio*100)+'%';$('resume-save').hidden=this.mode!=='demo'||!saved;$('start').textContent=saved?namakoText('はじめから'):namakoText('スタート');$('start').style.left=saved?'278px':'82px';$('start').style.width=saved?'180px':'376px';const demo=this.mode==='demo',celebrating=this.mode==='celebrate',revealing=this.mode==='reveal',trivia=this.mode==='trivia',dialog=['paused','clear','stuck'].includes(this.mode)&&!this.collectionOpen;$('music').textContent='BGM '+(this.audio.musicEnabled?'ON':'OFF')+' '+Math.round((this.audio.musicLevel??.7)*100)+'%';if($('music-volume'))$('music-volume').value=String(Math.round((this.audio.musicLevel??.7)*100));$('sfx').textContent='SE '+(this.audio.sfxEnabled?'ON':'OFF');$('speed').textContent=namakoText('速さ ')+namakoText(SPEEDS[this.speedIndex===4&&this.mode!=='demo'?3:this.speedIndex].label);$('speed').setAttribute('aria-label',namakoText('落下スピード ')+namakoText(SPEEDS[this.speedIndex===4&&this.mode!=='demo'?3:this.speedIndex].label)+namakoText('。押すと変更'));$('music').setAttribute('aria-pressed',String(this.audio.musicEnabled));$('sfx').setAttribute('aria-pressed',String(this.audio.sfxEnabled));$('fill').textContent=Math.floor(this.model.fillRatio()*100)+'%';$('count').textContent=namakoText('あと約%d匹').replace('%d',String(this.approximateRemaining()));document.querySelector?.('h1')?.classList.toggle('demo-title',demo);$('mode').hidden=!demo;$('mode').textContent=demo?'AUTO DEMO':(celebrating?'FRIENDS PARTY':(revealing?'CARD GET':(trivia?namakoText('研究手帖'):(this.cards.milestoneUnlocked()?namakoText('ナマコの仲間たち'):namakoText('のんびり積もう')))));$('lore-button').hidden=celebrating||revealing||trivia||dialog||this.collectionOpen;$('cards-button').hidden=!this.cards.rewardsEnabled()||celebrating||revealing||trivia||this.collectionOpen;$('cards-button').textContent=namakoText('図鑑')+'\n'+this.cards.ownedUnique()+'/'+this.cards.enabledCards().length;$('menu').hidden=this.mode!=='play';$('start').hidden=!demo;$('controls').hidden=this.mode!=='play';for(const id of ['left','right','rotate','drop'])$(id).disabled=this.phase!==0||this.entryRoute.length>0;$('tip').textContent=celebrating?(namakoText(this.clearReason==='packed'?'ぎゅうぎゅう！ 水槽満員！':'やったね！ 水槽完成！')):(demo?namakoText(TIPS[Math.floor(this.demoClock/5.2)%TIPS.length]).replace('80%',Math.round(this.targetRatio*100)+'%'):namakoText(this.lcd?'同じ色・点模様の3匹がつながると泡になる。色を分けよう。\n床か2匹につくと残る。':'同じ色の3匹がつながると消える。色を分けて積もう。\n床か2匹につくと残る。'));$('status').setAttribute('aria-live',demo?'off':'polite');$('footer').textContent=this.touch&&!celebrating?namakoText(demo?'デモ中 · 速さを変えて眺めよう':'スライドで移動 · タップで回転 · 下へスワイプ'):demo?namakoText('自動デモ中  ·  ルールを見たらスタート  ·  速さボタンで変更できます'):(celebrating?(this.rewardFromDemo?namakoText('お祝い中…　このあと博士のうんちく'):namakoText('お祝い中…　このあとカードをゲット！')):namakoText('← → 移動   Z / X 回転   Space 落下   Esc メニュー   R やり直す'));$('celebrate-banner').hidden=!(celebrating&&this.celebrationStage==='party');for(const id of ['difficulty','speed','cards-button','lore-button'])$(id).disabled=celebrating||revealing;$('celebrate-title').textContent=namakoText(this.clearReason==='packed'?'ぎゅうぎゅう！ 水槽満員！':'やったね！ 水槽完成！');$('celebrate-message').textContent=this.celebrationMessage;$('restart-pause').hidden=this.mode==='stuck';$('to-demo').style.top=this.mode==='stuck'?'203px':'265px';$('help-open').hidden=this.mode!=='paused';$('modal').style.height=this.mode==='stuck'?'277px':'405px';$('modal').style.top=(this.mode==='stuck'?(this.layoutHeight-277)/2:(this.layoutHeight-405)/2)+'px';$('modal').hidden=!dialog;$('shade').hidden=!(dialog||revealing||trivia||this.collectionOpen);$('trivia').hidden=!trivia;const browsing=trivia&&!!this.triviaReturnMode;$('trivia').classList.toggle('browse',browsing);$('trivia-heading').textContent=(browsing||this.rewardFromDemo)?namakoText('✦ 博士のうんちく ✦'):namakoText('✦ １面クリア ✦');$('trivia-more').hidden=!browsing;$('trivia-next').textContent=browsing?namakoText('戻る'):this.rewardFromDemo?namakoText('デモを続ける ▶'):namakoText('次の面へ ▶');
 if(this.mode==='paused'){$('modal-title').textContent=namakoText('ゲームメニュー');$('modal-note').textContent=namakoText('急がなくて大丈夫。\n「はじめから」で空の水槽からやり直せます。');$('continue').textContent=namakoText('ゲームへ戻る');}
  else if(this.mode==='stuck'){$('modal-title').textContent=namakoText('水槽がいっぱい');$('modal-note').textContent=namakoText('もう入る場所がないよ。\n「はじめから」で新しい水槽に挑戦しよう。');$('continue').textContent=namakoText('はじめから');}
  else if(this.mode==='clear'){$('modal-title').textContent=namakoText('仲間が増えたよ！');$('modal-note').textContent=namakoText(`${this.lastReward?this.lastReward.name+'を獲得！':this.celebrationMessage}\n水槽 ${Math.floor(this.model.fillRatio()*100)}%  ·  残った ${this.model.pieces.size}匹`);$('continue').textContent=namakoText('もう一回');}}
 update(dt){if(this.settingsOpen||this.helpOpen)return;this.saveClock+=dt;if(this.saveClock>=1){this.saveClock=0;NamakoSession.save(this);}this.clock+=dt;for(const p of this.effects){p.t+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=120*dt;}this.effects=this.effects.filter(p=>p.t<p.life);for(const p of this.trails)p.t+=dt;this.trails=this.trails.filter(p=>p.t<.24);if(this.impact){this.impact.t+=dt;if(this.impact.t>1)this.impact=null;}if(this.vanish){this.vanish.t+=dt;if(this.vanish.t>=.62)this.vanish=null;}
  if(this.rewardFromDemo&&['reveal','trivia'].includes(this.mode)&&(this.mode!=='trivia'||$('trivia-card-viewer').hidden)){this.demoOverlayTime-=dt;if(this.demoOverlayTime<=0){if(this.mode==='reveal')this.finishReward();else this.finishTrivia();}}if(this.collectionOpen||['paused','clear','reveal','trivia','stuck'].includes(this.mode))return;if(this.matchEffect){this.matchEffect.t+=dt;if(this.matchEffect.t>=(this.reduced?.35:.9))this.matchEffect=null;}if(this.mode==='celebrate'){this.updateCelebration(dt);return;}this.visual=this.visual.map((v,i)=>v+(this.origin[i]-v)*(1-Math.exp(-dt*18)));
 if(this.mode==='demo'){this.demoClock+=dt;const text=namakoText(TIPS[Math.floor(this.demoClock/5.2)%TIPS.length]).replace('80%',Math.round(this.targetRatio*100)+'%');if($('tip').textContent!==text)$('tip').textContent=text;}
 if(this.statusTime>0){this.statusTime=Math.max(0,this.statusTime-dt);if(this.statusTime===0)this.prediction();}
 if(this.entryRoute.length){this.entryTime+=dt*this.speed;if(this.entryTime>=.08){this.entryTime=0;const step=this.entryRoute.shift();this.active=step.cells;this.origin=step.origin;if(!this.entryRoute.length)this.lock();}return;}
 if(this.phase){this.phaseTime-=dt*(this.mode==='demo'&&this.speedIndex===4?3:1);if(this.phaseTime<=0&&!this.matchEffect){if(this.phase===2)this.reset(73+Math.floor(this.clock)%97);else if(this.goalReached()){if(this.mode==='demo'){this.clear(true);}else this.clear();}else if(this.mode==='demo'&&this.model.turns>=50){this.phase=2;this.phaseTime=1;}else this.spawn();}return;}
 if(this.mode==='demo'){this.demoWait-=dt*this.speed;if(this.demoWait<=0){if(this.origin[0]!==this.demoTarget&&this.origin[1]<0){this.move([this.demoTarget>this.origin[0]?1:-1,0],false);this.demoWait=.13;}else{if(!this.move([0,1],false))this.lock();this.demoWait=.075;}}}
 else{this.fallTime+=dt*this.speed;const interval=this.keys.has('ArrowDown')||this.keys.has('KeyS')?.055:.72;if(this.fallTime>=interval){this.fallTime=0;if(!this.move([0,1],false))this.lock();}}}
 completionWiggle(id){
  const elapsed=CELEBRATION_SECONDS-this.celebrationTime-CLEAR_LANDING_SECONDS;
  const delay=([...this.model.pieces.keys()].indexOf(id)%12)*.055;
  if(elapsed<delay||elapsed>delay+.65)return 0;
  return Math.sin((elapsed-delay)/.65*Math.PI)*.8;
 }
 drawClearAtmosphere(){
  const c=this.ctx,near=this.model.fillRatio()>=this.targetRatio-.05;
  if(near||this.mode==='celebrate'){
   const pulse=this.reduced?1:.65+.35*Math.sin(this.clock*3),y=B.h*(1-this.targetRatio);
   c.save();c.globalAlpha=pulse;c.setLineDash([7,7]);this.line(8,y,B.w-8,y,this.lcd?'#263129':this.dark?'#a4fff1':'#096fba',2);c.setLineDash([]);
   if(this.mode!=='celebrate'){c.font='bold 20px sans-serif';c.textAlign='center';c.fillStyle=this.lcd?'#263129':this.dark?'#d0fff4':'#075b84';c.fillText(namakoText('あと少し！'),B.w/2,y+27);}c.restore();
  }
  if(this.mode==='celebrate'&&this.celebrationStage!=='landing'&&!this.reduced){
   const elapsed=CELEBRATION_SECONDS-this.celebrationTime-CLEAR_LANDING_SECONDS;
   c.save();c.globalAlpha=.65;
   for(let i=0;i<14;i++){const x=B.w*(i+.5)/14,y=B.h-18-elapsed*(45+i%4*13)-i%3*18;this.circle(x,y,3+i%3,null,this.lcd?'#263129':this.dark?'#b9fff4':'#188ab2',1.6);}c.restore();
  }
 }
 burst([x,y],color,down=false,party=false){if(this.reduced)return;const n=party?30:12;for(let i=0;i<n;i++){const a=party?Math.random()*Math.PI*2:(down?Math.PI/2:-Math.PI/2)+(Math.random()-.5)*2.4,s=party?80+Math.random()*130:30+Math.random()*65;this.effects.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,t:0,life:party?1.5:.6,r:1.5+Math.random()*2.2,color});}if(this.effects.length>150)this.effects.splice(0,this.effects.length-150);}
 frame(time){if(document.hidden){this.lastTime=0;requestAnimationFrame(t=>this.frame(t));return;}const dt=this.lastTime?Math.min((time-this.lastTime)/1000,.05):0;this.lastTime=time;this.update(dt);this.draw();requestAnimationFrame(t=>this.frame(t));}
 round(x,y,w,h,r,fill,stroke=null,lw=1){const c=this.ctx;c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}}
 circle(x,y,r,fill,stroke=null,lw=1){const c=this.ctx;c.beginPath();c.arc(x,y,Math.max(.01,r),0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}}
 line(x1,y1,x2,y2,ink,width){const c=this.ctx;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.strokeStyle=ink;c.lineWidth=width;c.lineCap='round';c.stroke();}
 settledCreature(piece,id,deform=0){this.creature(piece.cells,[0,0],PALETTE[piece.color],1,id,deform);}
 matchPose(){const t=this.matchEffect?.t||0,smooth=(a,b)=>{const q=Math.max(0,Math.min(1,(t-a)/(b-a)));return q*q*(3-2*q);};if(this.reduced)return{join:0,fused:0,fade:Math.min(1,t/.35),bubbles:0,jelly:0};const join=Math.min(1,t/.18);return{join:join*join*(3-2*join),fused:smooth(.18,.32),fade:smooth(.52,.9),bubbles:Math.max(0,Math.min(1,(t-.45)/.45)),jelly:Math.sin(t*27)*Math.exp(-Math.max(0,t-.2)*5)*.28+Math.sin(join*Math.PI)*.28};}
 drawMatchEffect(){
  const event=this.matchEffect;if(!event)return;
  if(!event.net){const all=event.sources.flatMap(p=>p.cells),owners=new Map(),necks=[];event.sources.forEach((p,i)=>p.cells.forEach(cell=>owners.set(cell.join(','),i)));for(const[x,y]of all)for(const[dx,dy]of [[1,0],[0,1]])if(owners.has([x+dx,y+dy].join(','))&&owners.get([x+dx,y+dy].join(','))!==owners.get([x,y].join(',')))necks.push([(x+.5)*B.c,(y+.5)*B.c,(x+dx+.5)*B.c,(y+dy+.5)*B.c]);event.net={all,necks,center:all.reduce((sum,[x,y])=>[sum[0]+(x+.5)*B.c/all.length,sum[1]+(y+.5)*B.c/all.length],[0,0]),centers:event.sources.map(p=>p.cells.reduce((sum,[x,y])=>[sum[0]+(x+.5)*B.c/p.cells.length,sum[1]+(y+.5)*B.c/p.cells.length],[0,0]))};}
  const {all,necks,center,centers}=event.net,pose=this.matchPose(),alpha=1-pose.fade,body=PALETTE[event.color],c=this.ctx;
  if(!this.reduced&&pose.fused<1){c.save();c.globalAlpha=pose.join*(1-pose.fused);for(const[x,y,xx,yy]of necks){const w=B.c*(.12+pose.join*.66);this.line(x,y,xx,yy,this.lcd?this.lcdPaint(event.color):body,w);if(!this.lcd){c.globalAlpha=pose.join*(1-pose.fused)*.3;this.line(x,y-3,xx,yy-3,'#fff',w*.7);c.globalAlpha=pose.join*(1-pose.fused);}}c.restore();}
  if(pose.fused<1)event.sources.forEach((source,i)=>this.creature(source.cells,this.reduced?[0,0]:center.map((v,n)=>(v-centers[i][n])*.06*pose.join*(1-pose.fused)),body,alpha*(1-pose.fused),-2,pose.jelly));
  if(pose.fused>0)this.creature(all,[0,-pose.fade*B.c*.12],body,alpha*pose.fused,-2,pose.jelly);
  if(this.reduced||pose.bubbles<=0)return;const q=pose.bubbles,ink=this.lcd?'#4b5544':'#b6ffde';c.save();c.globalAlpha=(1-q)*.55;this.circle(...center,B.c*(.45+q*1.55),null,ink,2.3);
  for(let i=0;i<12;i++){const angle=i*Math.PI*2/12+.12,x=center[0]+Math.cos(angle)*B.c*(.55+q*1.45),y=center[1]+Math.sin(angle)*B.c*(.55+q*1.45)-q*q*B.c*.45;c.globalAlpha=(1-q)*.9;this.circle(x,y,(1-q)*3.2+.6,null,ink,1.3);}c.restore();
 }
 lcdMarks(x,y,color,alpha=1,scale=1,ink='#b9c3a6'){const c=this.ctx,count=color+1,cols=Math.min(count,3),rows=Math.ceil(count/3);c.save();c.globalAlpha=alpha;for(let i=0;i<count;i++)this.circle(x+(i%3-(cols-1)/2)*8*scale,y+(Math.floor(i/3)-(rows-1)/2)*8*scale,3*scale,ink);c.restore();}
 creature(cells,offset,color,alpha=1,id=0,deform=0){if(!cells.length)return;if(this.lcd){this.lcdCreature(cells,offset,alpha,id,deform,color);return;}const c=this.ctx;let pts=cells.map(([x,y])=>[(x+.5)*B.c+offset[0],(y+.5)*B.c+offset[1]]),middle=pts.reduce((s,p)=>[s[0]+p[0]/pts.length,s[1]+p[1]/pts.length],[0,0]);const party=((this.mode==='celebrate'&&this.celebrationStage!=='landing')||(this.mode==='demo'&&this.phase===2&&this.model.isClear()))&&!this.reduced&&id>0,wiggle=party?this.completionWiggle(id):0;deform+=wiggle*.18;if(!this.reduced&&id>0)deform+=Math.sin(this.clock*1.9+id*.8)*.055;pts=pts.map((p,i)=>[middle[0]+(p[0]-middle[0])*(1+deform*.24)+(party?Math.sin(this.clock*9+i*.9+id)*4.2:0),middle[1]+(p[1]-middle[1])*(1-Math.abs(deform)*.42)+(this.reduced?0:Math.sin(this.clock*3+i*1.1+id)*(id===0?1.2:.45))+(party?Math.cos(this.clock*10+i+id)*3.1:0)]);if(id===0&&this.rotation&&!this.reduced){const t=Math.min(1,(this.clock-this.rotation.time)/.28),e=t*t*(3-2*t);pts=pts.map((p,i)=>{const a=this.rotation.from[i]||p,dx=p[0]-a[0],dy=p[1]-a[1],s=Math.sin(t*Math.PI)*.18;return[a[0]+dx*e-dy*s,a[1]+dy*e+dx*s];});deform+=Math.sin(t*Math.PI)*.24;}let r=B.c*.422*(1-Math.max(-deform,0)*.7);c.save();c.globalAlpha=alpha;
 const big=id>0&&this.model.pieces.get(id)?.units===3;if(big)r*=1.055;
 const tint=(value,amount)=>{const n=parseInt(value.slice(1),16),out=[n>>16,(n>>8)&255,n&255].map(v=>Math.round(amount>=0?v+(255-v)*amount:v*(1+amount)));return '#'+out.map(v=>v.toString(16).padStart(2,'0')).join('');};
 const shade=tint(color,-.12),light=tint(color,.13),speckle=tint(color,-.24),tip=tint(color,.23),edge=tint(color,-.13);
 for(let layer=0;layer<3;layer++){const shift=layer===0?B.c*.055:(layer===2?-B.c*.05:0),ink=layer===0?tint(color,-.46):(layer===2?light:shade),rr=layer===0?r+1:layer===2?r*.89:r;c.globalAlpha=alpha*(layer===0?.68:1);for(let i=0;i<cells.length;i++)for(let j=i+1;j<cells.length;j++)if(Math.abs(cells[i][0]-cells[j][0])+Math.abs(cells[i][1]-cells[j][1])===1)this.line(pts[i][0],pts[i][1]+shift,pts[j][0],pts[j][1]+shift,ink,rr*1.88);for(const[x,y]of pts)this.circle(x,y+shift,rr,ink);}
 const occupied=new Set(cells.map(p=>p.join(',')));c.globalAlpha=alpha;
 for(let i=0;i<pts.length;i++){const[x,y]=pts[i];
  for(const[dx,dy]of [[0,-1],[-1,0],[1,0]]){if(occupied.has([cells[i][0]+dx,cells[i][1]+dy].join(',')))continue;for(const twist of [-.4,.35]){const angle=Math.atan2(dy,dx)+twist,nx=Math.cos(angle),ny=Math.sin(angle),bx=x+nx*r*.82,by=y+ny*r*.82;this.line(bx,by,x+nx*(r+B.c*.045),y+ny*(r+B.c*.045),edge,B.c*.065);this.circle(x+nx*(r+B.c*.023),y+ny*(r+B.c*.023),B.c*.02,tip);}}
  c.globalAlpha=alpha*.42;for(let k=0;k<4;k++){const angle=((i*47+k*79+id*13)%360)*Math.PI/180,d=r*(.28+(k%3)*.17);this.circle(x+Math.cos(angle)*d,y+Math.sin(angle)*d,B.c*(.017+(k%2)*.012),speckle);}
  c.globalAlpha=alpha*.65;if(!occupied.has([cells[i][0],cells[i][1]+1].join(',')))for(const dx of [-.19,.14])this.circle(x+B.c*dx,y+r*.72,B.c*.025,speckle);
  c.globalAlpha=alpha;this.line(x-r*.3,y-r*.47,x+r*.15,y-r*.54,'#ffffff5c',B.c*.045);
 }
 const [hx,hy]=pts[0],faceScale=big?1.12:1,blink=(this.clock+id*.31)%5.3>5.15;for(const dx of [-5,5]){if(blink)this.line(hx+dx-1.8,hy-2,hx+dx+1.8,hy-2,'#254b50',1.5);else{this.circle(hx+dx*faceScale,hy-2*faceScale,2.4*faceScale,'#254b50');this.circle(hx+dx-.6,hy-2.8,.7,'#ffffff');}}c.beginPath();c.arc(hx,hy+1,4,.1,Math.PI-.1);c.strokeStyle='#254b50';c.lineWidth=1.3;c.stroke();this.circle(hx-10,hy+3.5,2.7,'#ffffff40');this.circle(hx+10,hy+3.5,2.7,'#ffffff40');c.restore();}
 lcdColorIndex(color){const index=Number.isInteger(color)?color:color?PALETTE.indexOf(color):this.activeColor;return Math.max(0,Math.min(LCD_PALETTE.length-1,index));}
 lcdPaint(color){return LCD_PALETTE[this.lcdColorIndex(color)];}
 lcdCreature(cells,offset,alpha,id,deform,color){
  const c=this.ctx,colour=this.lcdColorIndex(color),body=LCD_PALETTE[colour],edge='#4b5544',r=B.c*(id>0&&this.model.pieces.get(id)?.units===3?.445:.4)*(1-Math.abs(deform)*.1);
  c.save();c.globalAlpha=alpha;const pts=cells.map(([x,y])=>[(x+.5)*B.c+offset[0],(y+.5)*B.c+offset[1]]);
  for(const[ink,width,radius]of [[edge,B.c*.78,r],[body,B.c*.68,Math.max(1,r-2)]]){for(let i=0;i<cells.length;i++)for(let j=i+1;j<cells.length;j++)if(Math.abs(cells[i][0]-cells[j][0])+Math.abs(cells[i][1]-cells[j][1])===1)this.line(...pts[i],...pts[j],ink,width);for(const[x,y]of pts)this.circle(x,y,radius,ink);}
  const tail=pts.at(-1);this.lcdMarks(...tail,colour,alpha,1,'#43513d');const[x,y]=pts[0];this.circle(x-5,y-3,2.6,'#344432');this.circle(x+5,y-3,2.6,'#344432');this.line(x-3,y+5,x+3,y+5,'#344432',2);c.restore();
 }
 drawLCD(){
  const c=this.ctx;c.setTransform(this.pixelRatio,0,0,this.pixelRatio,0,0);c.clearRect(0,0,540,this.layoutHeight);this.round(B.x-13,B.y-13,B.w+26,B.h+26,18,'#203b3d','#5a7575',4);this.round(B.x-4,B.y-4,B.w+8,B.h+8,7,'#aeb99d','#697660',3);
  c.save();c.beginPath();c.rect(B.x,B.y,B.w,B.h);c.clip();c.translate(B.x,B.y);const grad=c.createLinearGradient(0,0,B.w,B.h);grad.addColorStop(0,'#c1c9af');grad.addColorStop(1,'#a8b497');c.fillStyle=grad;c.fillRect(0,0,B.w,B.h);c.save();c.setLineDash([1,5]);for(let x=0;x<=8;x++)this.line(x*B.c,0,x*B.c,B.h,'#68785a36',1);for(let y=0;y<=12;y++)this.line(0,y*B.c,B.w,y*B.c,'#68785a36',1);c.restore();
  for(const[id,p]of this.model.pieces)this.settledCreature(p,id,this.impact&&this.impact.id===id?Math.cos(this.impact.t*28)*Math.exp(-this.impact.t*8):0);this.drawMatchEffect();
  if(this.showActive){if(this.mode==='play'&&this.difficultyIndex===0&&this.easyGuide)this.creature(this.active,[this.easyGuide[0]*B.c,this.easyGuide[1]*B.c],null,.28);if(this.mode==='play'&&this.difficultyIndex!==2){const dest=this.model.landing(this.active,this.origin);this.creature(this.active,[dest[0]*B.c,dest[1]*B.c],null,.16);}this.creature(this.active,[this.visual[0]*B.c,this.visual[1]*B.c],null);}
  if(this.vanish)this.creature(this.vanish.cells,[0,this.vanish.t*25],PALETTE[this.vanish.color],Math.max(0,1-this.vanish.t/.62));for(const e of this.effects){c.globalAlpha=Math.max(0,1-e.t/e.life)*.5;this.circle(e.x,e.y,e.r,this.lcdPaint(e.color));}c.globalAlpha=1;this.drawClearAtmosphere();this.line(0,B.h-2,B.w,B.h-2,'#4b5544',3);
  if(this.next.shape!==undefined){const cells=this.model.shape(this.next.shape),nx=B.w-55,ny=42,body=this.lcdPaint(this.next.color);for(const[x,y]of cells){for(const[ox,oy]of cells)if((ox===x+1&&oy===y)||(ox===x&&oy===y+1)){this.line(nx+x*11,ny+y*11,nx+ox*11,ny+oy*11,'#4b5544',9);this.line(nx+x*11,ny+y*11,nx+ox*11,ny+oy*11,body,6);}this.circle(nx+x*11,ny+y*11,5.5,'#4b5544');this.circle(nx+x*11,ny+y*11,4,body);}this.lcdMarks(nx,ny+18,this.next.color,1,.75,'#4b5544');}c.restore();
 }
 aquarium(){
 const c=this.ctx;
 if(!this.tankBackdrop||this.tankBackdrop.dark!==this.dark){
  const surface=document.createElement('canvas');surface.width=B.w;surface.height=B.h;const q=surface.getContext('2d');
  const haze=q.createLinearGradient(0,0,0,B.h);haze.addColorStop(0,this.dark?'#8ce8eb20':'#ffffff30');haze.addColorStop(.4,'#ffffff00');haze.addColorStop(1,this.dark?'#0b202943':'#508b7924');q.fillStyle=haze;q.fillRect(0,0,B.w,B.h);
  // A rear sand shelf and sparse plants sit behind the playable grid.
  q.fillStyle=this.dark?'#7b897633':'#b6bd9552';q.beginPath();q.moveTo(0,B.h);q.lineTo(0,B.h-23);q.quadraticCurveTo(B.w*.5,B.h-42,B.w,B.h-20);q.lineTo(B.w,B.h);q.fill();
  for(let plant=0;plant<5;plant++){const x=14+plant*83,h=42+(plant*37)%74;for(let leaf=0;leaf<3;leaf++){q.beginPath();q.moveTo(x,B.h-16);q.bezierCurveTo(x-18+leaf*12,B.h-h*.4,x+24-leaf*15,B.h-h*.8,x+(leaf-1)*14,B.h-h);q.strokeStyle=this.dark?'#55989226':'#528d7233';q.lineWidth=5-leaf;q.lineCap='round';q.stroke();}}
  for(let i=0;i<68;i++){const x=(i*67+13)%B.w,y=B.h-3-(i*13)%19;q.beginPath();q.ellipse(x,y,3+i%5,2+i%3,(i%5)*.3,0,Math.PI*2);q.fillStyle=(this.dark?['#82928d55','#53696766','#aaa89144']:['#b9b69c77','#8ea99c66','#ded7b388'])[i%3];q.fill();}
  q.strokeStyle=this.dark?'#a6f7ff32':'#ffffff69';q.lineWidth=2;q.strokeRect(2,2,B.w-4,B.h-4);
  const lamp=q.createRadialGradient(B.w*.5,0,2,B.w*.5,0,B.w*.68);lamp.addColorStop(0,this.dark?'#b2fbff42':'#ffffff36');lamp.addColorStop(1,'#b2fbff00');q.fillStyle=lamp;q.fillRect(0,0,B.w,B.h*.65);
  q.fillStyle=this.dark?'#ccffff80':'#ffffff88';q.fillRect(B.w*.27,2,B.w*.46,2);
  this.tankBackdrop={surface,dark:this.dark};
 }
 c.drawImage(this.tankBackdrop.surface,0,0);
 for(let i=0;i<3;i++){const y=B.h-24-((this.clock*19+i*71)%(B.h-35)),x=B.w-20+Math.sin(y*.04+i)*3;this.circle(x,y,1.4+i*.55,null,this.dark?'#b1e5df35':'#ffffff65',.8);}
 }
 draw(){if(this.lcd){this.drawLCD();return;}const c=this.ctx;c.setTransform(this.pixelRatio,0,0,this.pixelRatio,0,0);c.clearRect(0,0,540,this.layoutHeight);c.fillStyle=this.cards.milestoneUnlocked()?(this.dark?'#252b30':'#f9f5e4'):(this.dark?'#101f2b':'#eaf5f0');c.fillRect(0,0,540,this.layoutHeight);this.circle(515,557,181,(this.dark?'#18323b':'#e0efdf'));this.circle(14,740,157,(this.dark?'#172e3c':'#dfefe9'));for(let i=0;i<8;i++){let y=((i*137-this.clock*4)%this.layoutHeight+this.layoutHeight)%this.layoutHeight,x=(i%2?487:46)+Math.sin(this.clock*.6+i)*9;this.circle(x,y,3+i%4,null,'#ffffffb3',1.3);}
 // Decorative sea grass never participates in collision or retention.
 for(const [x,y,s]of [[45,652,1],[493,694,-1]]){for(let i=0;i<3;i++){c.beginPath();c.moveTo(x+i*9*s,y);c.bezierCurveTo(x+(i*9+16)*s,y-25,x+(i*9-10)*s,y-47,x+(i*9+9+Math.sin(this.clock+i)*3)*s,y-73-i*8);c.lineWidth=5;c.strokeStyle=[(this.dark?'#365d59':'#c2d9b7'),(this.dark?'#315955':'#bbd6c1'),(this.dark?'#3a6661':'#c8dfc9')][i];c.lineCap='round';c.stroke();}}
 const L=this.uiLayout;this.round(20,L.tipY+2,500,L.tipH+2,18,this.dark?'#9c7741':'#e5bd6e');this.round(20,L.tipY,500,L.tipH,18,this.dark?'#24445b':'#fff7df');this.round(75,L.statusY,390,24,12,this.dark?'#174454':'#d9f1fa');this.round(20,L.controlY,500,L.controlH,22,this.dark?'#22566a':'#78bdd3');this.round(20,L.controlY-3,500,L.controlH,22,this.dark?'#173a4b':'#f8fdff',this.dark?'#3c95ad':'#78bdd3',2);
 this.round(B.x-12,B.y-3,B.w+24,B.h+20,26,this.dark?'#0c6b8c':'#229bc4');this.round(B.x-10,B.y-10,B.w+20,B.h+20,24,this.dark?'#285d70':'#f4fcff',this.dark?'#85f1f8':'#087ca6',5);this.round(B.x,B.y+B.h+1,B.w,4,3,this.dark?'#719d9c':'#eac990');const progressX=B.x+14,progressY=B.y-6,progressW=B.w-28;this.round(progressX,progressY,progressW,4,3,this.dark?'#29515b':'#d4e9e3');let ratio=Math.min(this.model.fillRatio()/this.targetRatio,1);if(ratio>0)this.round(progressX,progressY,progressW*ratio,4,3,this.dark?'#76e4c8':'#168c7c');
 c.save();c.beginPath();c.rect(B.x,B.y,B.w,B.h);c.clip();c.translate(B.x,B.y);let g=c.createLinearGradient(0,0,0,B.h);g.addColorStop(0,(this.dark?'#1a465a':'#d2f0f7'));g.addColorStop(1,(this.dark?'#12394d':'#c2e5f0'));c.fillStyle=g;c.fillRect(0,0,B.w,B.h);this.aquarium();for(let i=0;i<3;i++){const x=20+i*115+Math.sin(this.clock*.22+i)*16;c.beginPath();c.moveTo(x,-5);c.lineTo(x+85,B.h);c.lineTo(x+135,B.h);c.lineTo(x+22,-5);c.closePath();c.fillStyle=this.dark?'#a1e6e909':'#ffffff17';c.fill();}for(let y=0;y<=12;y++)this.line(0,y*B.c,B.w,y*B.c,'#ffffff32',1);for(let x=0;x<=8;x++)this.line(x*B.c,0,x*B.c,B.h,'#ffffff29',1);
 this.circle(B.w-45,40,31,this.dark?'#ffda87':'#e4b756');this.circle(B.w-45,40,27,this.dark?'#3b5272':'#fbefc6');for(let i=0;i<14;i++){let y=((i*51-this.clock*(7+i%3*4))%B.h+B.h)%B.h,x=(i*83+Math.sin(this.clock*.8+i)*7+B.w)%B.w;this.circle(x,y,2+i%3,null,'#ffffff59',1);}
 let contacts=[];if(this.showActive&&this.mode==='play'){if(this.difficultyIndex!==2){const dest=this.model.landing(this.active,this.origin),pred=this.model.preview(this.active,dest,this.activeColor);contacts=pred.contacts;for(const[x,y]of this.active){let px=(x+dest[0]+.5)*B.c,py=(y+dest[1]+.5)*B.c;this.circle(px,py,B.c*.39,pred.willClear?'#ad7bea25':pred.keep?'#309c8719':'#cb995419',pred.willClear?'#ad7bea':pred.keep?'#309c87b3':'#cb9954b3',1.7);}}if(this.difficultyIndex===0&&this.easyGuide){const [gx,gy]=this.easyGuide;for(const[x,y]of this.active){const px=(x+gx+.5)*B.c,py=(y+gy+.5)*B.c;this.circle(px,py,B.c*.45,'#ffd87830','#ffcd59',3);}c.save();c.fillStyle='#fff4bf';c.font='bold 14px sans-serif';c.textAlign='center';c.fillText(namakoText('おすすめ'),(gx+this.model.width(this.active)/2)*B.c,Math.max(18,gy*B.c-8));c.restore();}}
 for(const[id,piece]of this.model.pieces){let deform=this.impact&&this.impact.id===id&&!this.reduced?Math.cos(this.impact.t*28)*Math.exp(-this.impact.t*8):0;this.settledCreature(piece,id,deform);if(this.impact&&this.impact.id===id&&!this.reduced){const p=piece.cells[0],fade=Math.max(0,1-this.impact.t/.65);c.save();c.globalAlpha=fade*.4;this.circle((p[0]+.5)*B.c,(p[1]+.5)*B.c,22+this.impact.t*48,null,'#ffffff',1.8);c.restore();}if(this.showActive&&this.mode==='play'&&contacts.includes(id)){let p=piece.cells[0];this.circle((p[0]+.5)*B.c+11,(p[1]+.5)*B.c-12,4,'#fffbed');}}
 for(const trail of this.trails){c.save();c.globalAlpha=Math.max(0,1-trail.t/.24)*.2;this.line(trail.x,trail.y1,trail.x,trail.y2,trail.color,9);c.restore();}
 this.drawMatchEffect();
 if(this.showActive)this.creature(this.active,[this.visual[0]*B.c,this.visual[1]*B.c],PALETTE[this.activeColor]);if(this.vanish){const p=this.vanish.t/.62;this.creature(this.vanish.cells,[Math.sin(p*13)*8,p*25],PALETTE[this.vanish.color],1-p,-1,-p);}
 for(const p of this.effects){c.save();c.globalAlpha=Math.max(0,1-p.t/p.life)*.85;this.circle(p.x,p.y,p.r,p.color);c.restore();}if(((this.mode==='celebrate'&&this.celebrationStage==='party')||(this.mode==='demo'&&this.phase===2&&this.model.isClear()))&&!this.reduced){for(let i=0;i<12;i++){const x=(29+i*83+Math.sin(this.clock*2+i)*17)%B.w,y=(41+i*61+Math.cos(this.clock*2.4+i)*19)%B.h,r=3+((i*7)%5);c.save();c.globalAlpha=.45+.35*Math.sin(this.clock*5+i);this.line(x-r,y,x+r,y,'#fff5b8',2);this.line(x,y-r,x,y+r,'#fff5b8',2);c.restore();}}this.drawClearAtmosphere();this.line(0,B.h-2,B.w,B.h-2,'#edca8a',4);c.restore();
 this.round(B.x+2,B.y+2,B.w-4,B.h-4,2,null,this.dark?'#a6f9ff':'#20a6ce',2);this.line(B.x+19,B.y+9,B.x+B.w-19,B.y+9,this.dark?'#b9f6f8a8':'#ffffffbd',2);for(const[x,y]of [[12,12],[B.w-12,12],[12,B.h-12],[B.w-12,B.h-12]])this.circle(B.x+x,B.y+y,3.5,this.dark?'#b3f5ef':'#2a98b6',this.dark?'#163b50':'#ffffff',1);
 if(this.next.shape!==undefined){let cells=this.model.shape(this.next.shape),color=PALETTE[this.next.color],nx=B.x+B.w-55,ny=B.y+40;for(const[x,y]of cells){for(const[ox,oy]of cells)if((ox===x+1&&oy===y)||(ox===x&&oy===y+1))this.line(nx+x*11,ny+y*11,nx+ox*11,ny+oy*11,color,9);this.circle(nx+x*11,ny+y*11,5.5,color);}}}
}
const game=new NamakoApp();
// Explicit test mode only; normal play does not expose writable model internals.
if(window.NAMAKO_TEST_MODE===true||new URLSearchParams(location.search).get('test')==='1')window.__namako=game;
