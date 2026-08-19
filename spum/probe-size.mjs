// 캐릭터가 화면에서 몇 칸을 차지하는지 잰다. 한 칸보다 크게 그려지면
// 가구 옆에 서 있어도 가구 위에 올라선 것처럼 보인다.
import { chromium } from 'playwright';
import path from 'node:path';
const ctx = await chromium.launchPersistentContext(path.join(process.env.TEMP || '/tmp', 'wamc-qa2'),
  { headless: false, viewport: { width: 1300, height: 900 } });
const page = ctx.pages()[0] || await ctx.newPage();
await page.goto('http://127.0.0.1:8790/spum/play.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForSelector('#dlg[open] .sel button', { timeout: 20000 });
await page.locator('#dlg[open] .sel button').first().click();
await page.waitForTimeout(5000);
const r = await page.evaluate(() => {
  const g = window.__wamc, rt = g.runtime;
  const a = rt.getActors()[0];
  const ent = rt.getEntities ? null : null;
  // #scene 캔버스에서 캐릭터 주변 화소를 훑어 실제 그려진 크기를 잰다
  const cv = document.querySelector('#scene');
  const cx = cv.getContext('2d');
  const TS = 32;
  const col = a.tile.col, row = a.tile.row;
  const R = 3;                                   // 앞뒤 3칸을 본다
  const x0 = Math.max(0, (col - R) * TS), y0 = Math.max(0, (row - R) * TS);
  const w = Math.min(cv.width - x0, (2 * R + 1) * TS), h = Math.min(cv.height - y0, (2 * R + 1) * TS);
  const d = cx.getImageData(x0, y0, w, h).data;
  let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (d[(y * w + x) * 4 + 3] > 24) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  return { actor: a.instanceId, tile: a.tile, unitScale: rt.unitScale,
           drawnPx: maxX < 0 ? null : { w: maxX - minX + 1, h: maxY - minY + 1 },
           inTiles: maxX < 0 ? null : { w: +((maxX - minX + 1) / TS).toFixed(2), h: +((maxY - minY + 1) / TS).toFixed(2) },
           // 발끝이 제 칸 안에 있나
           footOffsetTiles: maxX < 0 ? null : +(((y0 + maxY) - row * TS) / TS).toFixed(2) };
});
console.log(JSON.stringify(r));
await ctx.close(); process.exit(0);
