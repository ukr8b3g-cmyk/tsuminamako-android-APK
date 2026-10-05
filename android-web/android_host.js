'use strict';
// Native lifecycle adapter. The bundled game's source is unchanged.
let androidPaused=false;
const androidUpdate=game.update.bind(game);
game.update=dt=>{if(!androidPaused)androidUpdate(dt);};
window.TsumiNamakoAndroid={
 pause(){androidPaused=true;NamakoSession.save(game);if(game.mode==='play')game.pause();game.opening.stop();game.audio.suspend();game.keys.clear();game.pointer=null;},
 resume(){androidPaused=false;game.lastTime=0;game.resize();game.audio.resumeAudio();},
 back(){
  if(game.helpOpen){game.finishHelp(game.firstGuide?'demo':'return');return true;}
  if(game.settingsOpen){game.closeSettings();return true;}
  if(game.collectionOpen){if(document.getElementById('card-zoom'))game.rewardView.hideZoom();else game.closeCollection();return true;}
  if(game.mode==='trivia'){if(!document.getElementById('trivia-card-viewer').hidden)game.closeTriviaCard();else game.finishTrivia();return true;}
  if(game.mode==='reveal'){game.finishReward();return true;}
  if(game.mode==='celebrate')return true;
  if(game.mode==='play'){game.pause();return true;}
  if(game.mode==='paused'){game.resume();return true;}
  if(game.mode==='stuck'){game.beginDemo();return true;}
  return false;
 }
};
