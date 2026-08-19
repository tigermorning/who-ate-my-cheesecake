// NAV 오버레이를 끄고 맵을 실제로 본다 (CLAUDE.md §3-7).
import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = b.contexts()[0];
const page = ctx.pages().find(p => p.url().includes('spum.soonsoon.ai')) || ctx.pages()[0];
await page.bringToFront();
const n = await page.evaluate(() => {
  let off = 0;
  document.querySelectorAll('input[type=checkbox]').forEach(cb => {
    const row = cb.closest('div,li,tr');
    if (row && /NAV|Walk|Block|워커블|장애물/.test(row.textContent || '') && cb.checked) { cb.click(); off++; }
  });
  return off;
});
console.log('NAV 끈 개수:', n);
await page.waitForTimeout(2500);
await page.screenshot({ path: 'spum/screenshots/41-map-nonav.png' });
// 캔버스만 따로
const cv = await page.$('canvas');
if (cv) await cv.screenshot({ path: 'spum/screenshots/42-map-canvas.png' });
console.log('찍었다');
process.exit(0);
