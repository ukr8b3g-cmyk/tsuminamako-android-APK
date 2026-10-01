'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const root=path.resolve(__dirname,'..'),page=await browser.newPage({viewport:{width:540,height:860},hasTouch:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(root,'START.html')).href+'?test=1');
  await page.waitForFunction(()=>window.__namako);
  await page.evaluate(()=>{__namako.speedIndex=3;__namako.sync();});await page.waitForTimeout(5000);
  await page.screenshot({path:path.join(__dirname,'aquarium_light.png')});
  await page.click('#theme');await page.screenshot({path:path.join(__dirname,'aquarium_night.png')});
  await page.click('#start');
  await page.evaluate(()=>{__namako.origin=[2,3];__namako.visual=[2,3];});
  await page.click('#rotate');assert(await page.evaluate(()=>__namako.rotation.from.length>0));
  await page.waitForTimeout(130);await page.screenshot({path:path.join(__dirname,'aquarium_rotation.png')});
  await page.waitForTimeout(350);await page.click('#drop');assert.equal(await page.evaluate(()=>__namako.phase),1);
  await page.evaluate(()=>{__namako.cards.add(__namako.cards.enabledCards()[0]);__namako.openCollection();});
  await page.setViewportSize({width:390,height:844});
  const art=page.locator('.collection-tile.owned img').first();await art.tap();
  assert(await page.locator('#card-zoom').isVisible());
  const small=await art.boundingBox(),large=await page.locator('#card-zoom img').boundingBox();assert(large.width>small.width*3);
  await page.screenshot({path:path.join(__dirname,'collection_zoom_mobile.png')});
  await page.locator('#card-zoom img').tap();assert.equal(await page.locator('#card-zoom').count(),0);
  assert(await page.locator('#collection').isVisible());await art.tap();await page.keyboard.press('Escape');assert.equal(await page.locator('#card-zoom').count(),0);
  await page.click('#collection-close');await page.click('#cards-button');assert.equal(await page.locator('#card-zoom').count(),0);
  assert.deepEqual(errors,[]);console.log('PASS aquarium render, rotation/drop, touch zoom-toggle, Escape and collection reopen');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
