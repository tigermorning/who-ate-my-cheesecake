// 게임을 실제로 열어 맵·충돌·길찾기를 확인한다.
//   node spum/verify-map.mjs            창을 띄우고 확인 후 닫는다
import { chromium } from 'playwright';
import path from 'node:path';
const PROFILE = path.join(process.env.TEMP || '/tmp', 'wamc-qa');
const ctx = await chromium.launchPersistentContext(PROFILE, { headless: false, viewport: { width: 1500, height: 1000 } });
const page = ctx.pages()[0] || await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
page.on('pageerror', e => errs.push('PAGEERROR ' + String(e).slice(0, 200)));

await page.goto('http://127.0.0.1:8790/spum/play.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForSelector('#dlg[open] .sel button', { timeout: 20000 });
await page.locator('#dlg[open] .sel button').first().click();
await page.waitForTimeout(4000);

const info = await page.evaluate(() => {
  const g = window.__wamc;
  const bg = document.querySelector('#bg');
  return { has: !!g, bg: bg ? bg.width + 'x' + bg.height : null,
           npc: g ? Object.keys(g.npcState).length : 0,
           player: g ? { ...g.playerGrid } : null };
});
console.log('맵 캔버스', info.bg, '· NPC', info.npc, '· 플레이어', JSON.stringify(info.player));
await page.screenshot({ path: 'spum/screenshots/map-new.png' });

// 시간을 여러 번 넘겨 NPC 가 가구 위에 서는지 본다
let bad = 0, checks = 0, moved = 0;
const seen = {};
for (let round = 0; round < 10; round++) {
  await page.click('#btnNextHour').catch(() => {});
  await page.waitForTimeout(2500);
  const r = await page.evaluate(() => {
    const g = window.__wamc; if (!g) return null;
    const map = g.obstacle, W = 48;
    const out = { on: [], n: 0, pos: {} };
    for (const [id, s] of Object.entries(g.npcState)) {
      out.n++; out.pos[id] = s.gx + ',' + s.gy;
      if (map && map[s.gy * W + s.gx]) out.on.push(id + '@' + s.gx + ',' + s.gy);
    }
    if (map && map[g.playerGrid.y * W + g.playerGrid.x]) out.on.push('player');
    return out;
  });
  if (!r) break;
  checks += r.n; bad += r.on.length;
  for (const [id, p] of Object.entries(r.pos)) { if (seen[id] && seen[id] !== p) moved++; seen[id] = p; }
  if (r.on.length) console.log('  막힌 칸 위:', r.on.join(' '));
}
await page.screenshot({ path: 'spum/screenshots/map-after.png' });
console.log(`검사 ${checks}회 · 가구 위에 선 경우 ${bad} · 자리를 옮긴 횟수 ${moved}`);
console.log('콘솔 오류', errs.length); errs.slice(0, 8).forEach(e => console.log('  ! ' + e));
await ctx.close(); process.exit(0);
