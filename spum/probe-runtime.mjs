// 런타임이 실제로 캐릭터를 세우는 칸을 막힘표와 대조한다.
import { chromium } from 'playwright';
import path from 'node:path';
const ctx = await chromium.launchPersistentContext(path.join(process.env.TEMP || '/tmp', 'wamc-qa'),
  { headless: false, viewport: { width: 1300, height: 900 } });
const page = ctx.pages()[0] || await ctx.newPage();
await page.goto('http://127.0.0.1:8790/spum/play.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForSelector('#dlg[open] .sel button', { timeout: 20000 });
await page.locator('#dlg[open] .sel button').first().click();
await page.waitForTimeout(4000);

let bad = 0, n = 0, drift = 0;
const seen = new Set();
for (let i = 0; i < 20; i++) {
  const r = await page.evaluate(() => {
    const g = window.__wamc, rt = g.runtime;
    const acts = rt.getActors();
    const W = Math.round(Math.sqrt(g.obstacle.length));
    return acts.map(a => ({
      id: a.instanceId, col: a.tile.col, row: a.tile.row,
      blocked: !!g.obstacle[a.tile.row * W + a.tile.col],
      nav: a.navState, moving: a.isMoving,
      ours: g.npcState[a.instanceId] ? `${g.npcState[a.instanceId].gx},${g.npcState[a.instanceId].gy}` :
            `${g.playerGrid.x},${g.playerGrid.y}`,
    }));
  });
  for (const a of r) {
    n++;
    if (a.blocked) { bad++; seen.add(`${a.id}@${a.col},${a.row}(${a.nav})`); }
    if (a.ours !== `${a.col},${a.row}`) drift++;
  }
  await page.waitForTimeout(900);
}
console.log(`런타임 위치 검사 ${n}회 · 막힌 칸 위 ${bad} · npcState 와 어긋남 ${drift}`);
console.log('사례:', [...seen].slice(0, 12).join(' | '));
await ctx.close(); process.exit(0);
