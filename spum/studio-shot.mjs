import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('spum.soonsoon.ai'));
await page.bringToFront();
const cvs = await page.$$('canvas');
let best = null, bestA = 0;
for (const c of cvs) {
  const bb = await c.boundingBox();
  if (bb && bb.width * bb.height > bestA) { bestA = bb.width * bb.height; best = { c, bb }; }
}
console.log('캔버스', JSON.stringify(best.bb));
await best.c.screenshot({ path: 'spum/screenshots/58-whole.png' });
// 캔버스 픽셀을 통째로 뽑는다 (뷰포트 밖까지)
const data = await page.evaluate(() => {
  const cs = [...document.querySelectorAll('canvas')].sort((a, b) => b.width * b.height - a.width * a.height);
  const c = cs[0];
  return { w: c.width, h: c.height, url: c.toDataURL('image/png') };
});
console.log('캔버스 픽셀', data.w, 'x', data.h);
const fs = await import('node:fs');
fs.writeFileSync('spum/screenshots/59-canvas-raw.png', Buffer.from(data.url.split(',')[1], 'base64'));
process.exit(0);
