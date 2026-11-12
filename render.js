// Renderiza animacion.html a MP4 1080x1920 (9:16), 8 s.
// Uso: node render.js [fps]   (requiere playwright y ffmpeg)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

const FPS = Number(process.argv[2] || 60);
const OUT = path.join(__dirname, 'animacion_9x16.mp4');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'animacion.html') + '?export');
  await page.evaluate(() => document.fonts.ready);
  const duration = await page.evaluate(() => window.DURATION);
  const frames = Math.round(duration * FPS);

  const ff = spawn('ffmpeg', [
    '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'slow',
    '-movflags', '+faststart', OUT,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });

  for (let i = 0; i < frames; i++) {
    await page.evaluate(t => window.render(t), i / FPS);
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log('Listo:', OUT, frames, 'frames');
})();
