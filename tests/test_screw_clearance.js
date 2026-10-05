const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
(async () => {
  const browser = await chromium.launch(require('./browser_test_support').launchOptions);
  let count = 0;
  try {
    for (const language of ['ja', 'en']) {
      for (const [width, height] of [[320,568],[390,844],[412,915],[1080,2400],[1440,3200],[1280,800]]) {
        const page = await browser.newPage({viewport: {width,height}});
        await page.route('https://namako.test/**', route => route.fulfill({contentType:'text/html',body:
          fs.readFileSync(path.join(__dirname,'../START.html'),'utf8').replace('<head>',
            `<head><script>window.NAMAKO_TEST_LANGUAGE='${language}';window.NAMAKO_TEST_MODE=true;</script>`)}));
        await page.goto('https://namako.test');
        await page.waitForFunction(() => window.__namako);
        await page.evaluate(() => {
          const game = __namako;
          game.lcd = true; game.dark = false; game.applyTheme(); game.resize(); game.sync();
          game.audio.musicEnabled = false;
          const screws = [...document.querySelectorAll('#lcd-hardware i')];
          const intersects = (a,b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
          for (const mode of ['demo','play']) {
            if (mode === 'play') game.beginPlay();
            const stage = document.getElementById('stage').getBoundingClientRect();
            const scale = stage.width / 540;
            const obstacles = ['settings-open','difficulty','menu','lore-button','cards-button','tip','footer']
              .map(id => document.getElementById(id)).filter(e => !e.hidden);
            for (const screw of screws) {
              const rect = screw.getBoundingClientRect();
              if (rect.left < stage.left + 14*scale || rect.right > stage.right - 14*scale ||
                  rect.top < stage.top + 14*scale || rect.bottom > stage.bottom - 14*scale)
                throw Error('Screw crosses housing border');
              for (const obstacle of obstacles)
                if (intersects(rect,obstacle.getBoundingClientRect())) throw Error('Screw overlaps '+obstacle.id);
            }
          }
          game.beginDemo(); game.resize();
        });
        assert.equal(await page.locator('#lcd-hardware i').count(),4);
        if (width === 390) await page.screenshot({path:path.join(__dirname,`screws_${language}.png`)});
        await page.close(); count++;
      }
    }
    console.log(`PASS ${count} locale/viewport cases: screws stay inside frame, clear of controls and footer in demo/play`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
