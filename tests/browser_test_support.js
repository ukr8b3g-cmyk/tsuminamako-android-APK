'use strict';
const fs=require('node:fs');
const candidates=[process.env.PLAYWRIGHT_BROWSER_PATH,
 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
 'C:/Program Files/Microsoft/Edge/Application/msedge.exe','/usr/bin/chromium'].filter(Boolean);
const executablePath=candidates.find(p=>fs.existsSync(p));
module.exports={launchOptions:{headless:true,...(executablePath?{executablePath}:{})}};
