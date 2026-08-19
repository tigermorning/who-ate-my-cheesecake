// NPC·플레이어가 막힌 칸에 서 있는지, 길찾기가 가구를 통과하는지 본다.
import { chromium } from 'playwright';
import path from 'node:path';
const PROFILE = path.join(process.env.TEMP || '/tmp', 'wamc-qa');
const ctx = await chromium.launchPersistentContext(PROFILE, { headless: false, viewport: { width: 1300, height: 900 } });
const page = ctx.pages()[0] || await ctx.newPage();
await page.goto('http://127.0.0.1:8790/spum/play.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForSelector('#dlg[open] .sel button', { timeout: 15000 });
await page.locator('#dlg[open] .sel button').first().click();

let bad = 0, checks = 0;
for (let round = 0; round < 8; round++) {
  await page.click('#btnNextHour').catch(() => {});
  await page.waitForTimeout(4000);
  const r = await page.evaluate(() => {
    const g = window.__wamc; if (!g) return null;
    const map = g.obstacle || null;
    const W = 44;
    const out = { on: [], n: 0 };
    for (const [id, s] of Object.entries(g.npcState)) {
      out.n++;
      if (map && map[s.gy * W + s.gx]) out.on.push(id + '@' + s.gx + ',' + s.gy);
    }
    if (map && map[g.playerGrid.y * W + g.playerGrid.x]) out.on.push('player');
    return out;
  });
  if (!r) { console.log('손잡이가 없다'); break; }
  checks += r.n; bad += r.on.length;
  if (r.on.length) console.log('  막힌 칸 위:', r.on.join(' '));
}
console.log(`검사 ${checks}회 · 가구 위에 선 경우 ${bad}`);
await ctx.close();
process.exit(0);
