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
    const map = g.obstacle, W = g.mapW;
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

// ── 실제로 걸어 다녀 본다 ──────────────────────────────────
// 방마다 이름표 자리끼리 길을 찾아 걸어 보고, 지나간 칸이 전부 걸을 수 있는 칸인지 본다.
const nav = await page.evaluate(() => {
  const g = window.__wamc;
  const map = g.obstacle, W = Math.sqrt(map.length) | 0;
  const targets = (window.__zones || []).length ? window.__zones : null;
  const out = { pairs: 0, ok: 0, fail: [], illegal: 0, steps: 0 };
  const pts = Object.values(g.npcState).map(s => ({ x: s.gx, y: s.gy }))
    .concat([{ x: g.playerGrid.x, y: g.playerGrid.y }]);
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    out.pairs++;
    const p = g.findPath(pts[i].x, pts[i].y, pts[j].x, pts[j].y);
    if (!p) { out.fail.push(`${pts[i].x},${pts[i].y} → ${pts[j].x},${pts[j].y}`); continue; }
    out.ok++; out.steps += p.length;
    for (const c of p) if (!g.isWalkable(c.x, c.y)) out.illegal++;
  }
  return out;
});
console.log(`길찾기 ${nav.ok}/${nav.pairs} 쌍 성공 · 지나간 칸 ${nav.steps} · 막힌 칸을 지난 횟수 ${nav.illegal}`);
if (nav.fail.length) console.log('  길 없음:', nav.fail.slice(0, 6).join(' | '));

// 플레이어를 먼 곳까지 실제로 걷게 해서 한 칸씩 확인한다
const trek = await page.evaluate(async () => {
  const g = window.__wamc;
  // 이야기가 걸린 자리(랜드마크)를 전부 돌아본다 — 도면 검사에서 빈 칸임이 보장된 곳
  const far = (g.landmarks || []).map(L => [L.x, L.y]);
  const bad = [];
  let moved = 0;
  for (const [tx, ty] of far) {
    const p = g.findPath(g.playerGrid.x, g.playerGrid.y, tx, ty);
    if (!p) { bad.push(`길 없음 → ${tx},${ty}`); continue; }
    for (const c of p) {
      if (!g.isWalkable(c.x, c.y)) bad.push(`막힌 칸 ${c.x},${c.y}`);
      g.warp(c.x, c.y); moved++;
    }
    if (g.playerGrid.x !== tx || g.playerGrid.y !== ty) bad.push(`도착 실패 ${tx},${ty}`);
  }
  return { moved, bad };
});
console.log(`플레이어 걸음 ${trek.moved}칸 · 문제 ${trek.bad.length}`);
trek.bad.slice(0, 6).forEach(b => console.log('  ! ' + b));
await page.screenshot({ path: 'spum/screenshots/map-walk.png' });
console.log('콘솔 오류', errs.length); errs.slice(0, 8).forEach(e => console.log('  ! ' + e));
await ctx.close(); process.exit(0);
