import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('spum.soonsoon.ai'));
await page.bringToFront();
// NAV 끄기
for (let k = 0; k < 3; k++) {
  await page.evaluate(() => {
    document.querySelectorAll('input[type=checkbox]').forEach(cb => {
      const row = cb.closest('div,li,tr');
      if (row && /NAV|Walk|Block|워커블|장애물/.test(row.textContent || '') && cb.checked) cb.click();
    });
  });
  await page.waitForTimeout(600);
}
// 축소해서 전체 보기
const zoomOut = page.locator('button:has-text("zoom_out"), [aria-label*=out]').first();
for (let i = 0; i < 5; i++) { await zoomOut.click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(400); }
await page.waitForTimeout(1500);
await page.screenshot({ path: 'spum/screenshots/55-map-fit.png' });
const cv = await page.$('canvas');
if (cv) await cv.screenshot({ path: 'spum/screenshots/56-canvas-fit.png' });
console.log('찍었다');
process.exit(0);
