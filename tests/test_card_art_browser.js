const fs=require('fs'), assert=require('assert');
const {chromium}=require('playwright');
const root=require('path').resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch(require('./browser_test_support').launchOptions);
 try {
  for(const lang of ['ja','en','fr']){
   const page=await browser.newPage({viewport:{width:432,height:960}});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   const html=fs.readFileSync(root+'/START.html','utf8').replace('<head>',`<head><script>window.NAMAKO_TEST_LANGUAGE='${lang}';window.NAMAKO_TEST_MODE=true;</script>`);
   await page.setContent(html,{waitUntil:'load'});
   await page.waitForFunction(()=>window.__namako);
   const result=await page.evaluate(async lang=>{
    const g=window.__namako,cards=[...g.cards.enabledCards(),g.cards.completionCard()];
    if(cards.length!==21)throw Error('Expected 21 cards');
    for(const card of cards){
     if(!card.image_en||!card.image_data_en)throw Error('Missing English asset '+card.id);
     if(lang!=='ja'&&(card.image!==card.image_en||card.image_data!==card.image_data_en))throw Error('English selection '+card.id);
     if(lang==='ja'&&card.image.includes('/en/'))throw Error('Japanese selection '+card.id);
     const img=new Image();img.src=g.rewardView.imageSource(card);await img.decode();
     if(img.naturalWidth!==1024||img.naturalHeight!==1536)throw Error('Dimensions '+card.id);
    }
    for(const c of g.cards.enabledCards())g.cards.collection[c.id]=1;
    g.rewardView.showCollection();
    const shown=[...document.querySelectorAll('#collection-grid img')];
    if(shown.length!==21)throw Error('Collection count');
    for(let i=0;i<shown.length;i++){if(shown[i].getAttribute('src')!==g.rewardView.imageSource(cards[i]))throw Error('Collection source');await shown[i].decode();}
    g.rewardView.showZoom(cards[0],shown[0]);
    const zoom=document.querySelector('#card-zoom img');await zoom.decode();
    if(zoom.getAttribute('src')!==g.rewardView.imageSource(cards[0]))throw Error('Zoom source');
    return cards.length;
   },lang);
   if(lang==='en')await page.screenshot({path:root+'/tests/english_card_zoom.png'});
   await page.evaluate(async()=>{const g=window.__namako;g.rewardView.hideCollection();g.mode='reveal';g.reduced=true;g.rewardView.show(g.cards.completionCard(),1,false);const img=document.getElementById('reward-front');await img.decode();if(img.hidden||img.getAttribute('src')!==g.cards.completionCard().image_data)throw Error('Reward source');});
   if(lang==='en')await page.screenshot({path:root+'/tests/english_complete_reward.png'});
   assert.deepEqual(errors,[]);console.log('PASS browser '+lang+': '+result+' images decoded, collection, zoom, completion reward');
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

