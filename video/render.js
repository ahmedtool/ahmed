// Renders an HTML timeline to MP4: node video/render.js [page.html] [out.mp4]   (needs playwright + ffmpeg)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

const FPS = 30, DUR = 29, SRC = process.argv[2] || 'promo.html';
const out = path.join(__dirname, process.argv[3] || 'mizan-promo.mp4');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, SRC) + '#render');
  await page.evaluate(() => document.fonts.ready);
  const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', FPS, '-c:v', 'mjpeg', '-i', '-',
    '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-shortest',
    '-c:v', 'libx264', '-crf', '17', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k',
    '-movflags', '+faststart', out], { stdio: ['pipe', 'ignore', 'inherit'] });
  for (let i = 0; i < FPS * DUR; i++) {
    await page.evaluate(t => window.seek(t), i / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 96 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log('wrote', out);
})();
