'use strict';
const fs=require('fs'),path=require('path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const out=path.join(__dirname,'english_layout_validation');fs.mkdirSync(out,{recursive:true});
const source=fs.readFileSync(path.join(root,'START.html'),'utf8');
const results=[];
async function inspect(page, name, ids){
 const failures=await page.evaluate(ids=>{
  const problems=[];
  for(const id of ids){const el=document.getElementById(id);if(!el||el.hidden||!el.getClientRects().length)continue;
   const box=el.getBoundingClientRect(),r=document.createRange();r.selectNodeContents(el);const text=r.getBoundingClientRect();
   const tolerance=4*__namako.scale; // Font ascent/descent can extend outside its line box; allow those metrics, not extra lines.
   if(text.width>box.width+1||text.height>box.height+tolerance||text.left<box.left-1||text.right>box.right+1||text.top<box.top-tolerance||text.bottom>box.bottom+tolerance)problems.push({id,text:el.textContent,box:box.toJSON(),textBox:text.toJSON()});
  }
  const settings=['theme','track','speed','music','sfx'].map(id=>document.getElementById(id).getBoundingClientRect());
  for(let i=1;i<settings.length;i++)if(settings[i-1].right>=settings[i].left)problems.push({overlap:i});
  return problems;
 },ids);
 results.push({name,failures});
}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  for(const locale of ['en','ja'])for(const [w,h,dpr] of [[540,860,1],[360,640,1],[360,800,3],[390,844,3],[412,915,3],[480,960,1],[635,1036,1],[1440,3200,1]]){
   const page=await browser.newPage({viewport:{width:w,height:h},deviceScaleFactor:dpr,hasTouch:true});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.setContent(source.replace('<head>',`<head><script>window.NAMAKO_OS_LOCALE='${locale}';window.NAMAKO_TEST_MODE=true;</script>`),{waitUntil:'load'});
   await page.waitForFunction(()=>window.__namako);
   await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}'});
   await page.evaluate(()=>{const g=__namako;g.update=()=>{};g.audio.musicEnabled=false;g.audio.sfxEnabled=false;g.speedIndex=3;NamakoSession.read=()=>({});g.sync();});
   for(const dark of [false,true]){
    await page.evaluate(dark=>{__namako.dark=dark;__namako.applyTheme();__namako.sync();},dark);
    for(let track=0;track<4;track++){
     await page.evaluate(i=>{__namako.audio.trackIndex=i;__namako.sync();},track);
     await inspect(page,`${locale} ${w}x${h} ${dark?'dark':'light'} demo track ${track}`,['theme','track','speed','music','sfx','difficulty','lore-button','start','resume-save','footer','tip','mode','count','status']);
    }
    if(locale==='en'&&w===390)await page.screenshot({path:path.join(out,`html_${dark?'dark':'light'}_demo.png`)});
    await page.evaluate(()=>{__namako.beginPlay(123);});
    await inspect(page,`${locale} ${w}x${h} play`,['theme','track','speed','music','sfx','difficulty','lore-button','cards-button','left','right','rotate','drop','footer','tip','mode','count','status']);
    if(locale==='en'&&w===390)await page.screenshot({path:path.join(out,`html_${dark?'dark':'light'}_play.png`)});
    await page.evaluate(()=>__namako.pause());
    await inspect(page,`${locale} ${w}x${h} pause`,['modal-title','modal-note','continue','to-demo']);
    await page.evaluate(()=>{__namako.beginDemo();__namako.openLore();});
    for(let i=0;i<100;i++){
     await page.evaluate(i=>{__namako.triviaEpisode=__namako.trivia.episodes[i];__namako.renderTrivia(__namako.triviaEpisode);},i);
     await inspect(page,`${locale} ${w}x${h} lore ${i}`,['trivia-title','trivia-body','trivia-next','trivia-more']);
    }
    await page.evaluate(()=>{__namako.finishTrivia();__namako.beginDemo();});
    await page.evaluate(()=>{const g=__namako;for(const c of g.cards.enabledCards())g.cards.collection[c.id]=1;g.rewardView.showCollection();});
    await inspect(page,`${locale} ${w}x${h} collection`,['collection-title','collection-progress','collection-close']);
    const captions=await page.locator('.collection-label').evaluateAll(els=>els.filter(el=>el.scrollWidth>el.clientWidth+1).map(el=>el.textContent));
    results.push({name:`${locale} ${w}x${h} collection captions`,failures:captions});
    if(locale==='en'&&w===390)await page.screenshot({path:path.join(out,`html_${dark?'dark':'light'}_collection.png`)});
    await page.evaluate(()=>{__namako.rewardView.hideCollection();__namako.mode='reveal';__namako.reduced=true;});
    for(let card=0;card<21;card++){
     await page.evaluate(i=>{const g=__namako;const c=i===20?g.cards.completionCard():g.cards.enabledCards()[i];g.rewardView.show(c,2,true);},card);
     await inspect(page,`${locale} ${w}x${h} reward ${card}`,['reward-title','reward-note','reward-next']);
    }
    await page.evaluate(()=>{__namako.rewardView.hide();__namako.beginDemo();});
   }
   results.push({name:`${locale} ${w}x${h} console`,failures:errors});
   await page.close();console.log('Checked',locale,w,h);
  }
 }finally{await browser.close();}
 fs.writeFileSync(path.join(out,'html_results.json'),JSON.stringify(results,null,2));
 const bad=results.filter(r=>r.failures.length);console.log('Cases',results.length,'Failing',bad.length);console.log(JSON.stringify(bad.slice(0,8),null,2));process.exitCode=bad.length?1:0;
})().catch(e=>{console.error(e);process.exitCode=1;});
