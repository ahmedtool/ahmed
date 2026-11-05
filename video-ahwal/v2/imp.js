const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
await p.goto('file://'+__dirname+'/index.html');
require('fs').writeFileSync('impacts.json',JSON.stringify(await p.evaluate(()=>impacts)));await b.close()})();
