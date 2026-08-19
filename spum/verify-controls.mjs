// 키보드로 실제로 걸어 다니는지, 대화·증언판이 여닫히는지 확인한다.
import { chromium } from 'playwright';
import path from 'node:path';
const ctx = await chromium.launchPersistentContext(path.join(process.env.TEMP || '/tmp', 'wamc-qa'),
  { headless: false, viewport: { width: 1400, height: 950 } });
const page = ctx.pages()[0] || await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
await page.goto('http://127.0.0.1:8790/spum/play.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForSelector('#dlg[open] .sel button', { timeout: 20000 });
await page.locator('#dlg[open] .sel button').first().click();
await page.waitForTimeout(3500);

const pos = () => page.evaluate(() => ({ ...window.__wamc.playerGrid }));
const walkable = (x, y) => page.evaluate(([x, y]) => window.__wamc.isWalkable(x, y), [x, y]);

// ① WASD / 화살표로 걷는다 — 막힌 칸으로는 안 간다
let moved = 0, illegal = 0;
const start = await pos();
for (const key of ['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowRight','ArrowDown','ArrowLeft','KeyD','KeyD','KeyS','KeyS']) {
  const before = await pos();
  await page.keyboard.press(key);
  await page.waitForTimeout(320);
  const after = await pos();
  if (after.x !== before.x || after.y !== before.y) {
    moved++;
    if (!(await walkable(after.x, after.y))) illegal++;
  }
}
console.log(`키 이동: 시작 ${start.x},${start.y} → 지금 ${(await pos()).x},${(await pos()).y} · 움직인 횟수 ${moved} · 막힌 칸 진입 ${illegal}`);

// ② 맵 전체가 다닐 수 있는가 — 걸을 수 있는 칸 중 몇 %에 닿는가
const reach = await page.evaluate(() => {
  const g = window.__wamc, W = Math.round(Math.sqrt(g.obstacle.length));
  let total = 0; const seen = new Set(); const q = [[g.playerGrid.x, g.playerGrid.y]];
  for (let i = 0; i < g.obstacle.length; i++) if (!g.obstacle[i]) total++;
  seen.add(g.playerGrid.y * W + g.playerGrid.x);
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      const nx = x + dx, ny = y + dy, k = ny * W + nx;
      if (nx < 0 || ny < 0 || nx >= W || ny >= W || seen.has(k) || !g.isWalkable(nx, ny)) continue;
      seen.add(k); q.push([nx, ny]);
    }
  }
  return { total, reachable: seen.size };
});
console.log(`탐험 가능: ${reach.reachable}/${reach.total} 칸 (${Math.round(reach.reachable / reach.total * 100)}%)`);

// ③ E / Space / Esc / Tab
const st = async () => page.evaluate(() => ({
  chat: !!document.querySelector('.overchat') && !document.querySelector('.overchat').classList.contains('away'),
  board: (document.querySelector('#board')?.closest('.card')?.style.display) !== 'none',
  near: window.__wamc.nearestNPC ?? null,
}));
// 가까운 NPC 옆으로 순간이동해서 E 를 눌러 본다
await page.evaluate(() => {
  const g = window.__wamc;
  const n = Object.entries(g.npcState)[0];
  for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[0,0]]) {
    const x = n[1].gx + dx, y = n[1].gy + dy;
    if (g.isWalkable(x, y)) { g.warp(x, y); break; }
  }
});
await page.waitForTimeout(700);
await page.keyboard.press('KeyE'); await page.waitForTimeout(500);
const afterE = await st();
await page.keyboard.press('Escape'); await page.waitForTimeout(400);
const afterEsc = await st();
// Esc 뒤에 다시 걸어지는지
const b4 = await pos(); await page.keyboard.press('KeyD'); await page.waitForTimeout(350); const af = await pos();
await page.keyboard.press('Space'); await page.waitForTimeout(500);
const afterSpace = await st();
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
await page.keyboard.press('Tab'); await page.waitForTimeout(300);
const afterTab = await st();
await page.keyboard.press('Tab'); await page.waitForTimeout(300);
const afterTab2 = await st();

console.log(`E → 대화창 ${afterE.chat ? '열림 ✓' : '안 열림 ✗'} (근처 ${afterE.near})`);
console.log(`Esc → ${afterEsc.chat ? '아직 열림 ✗' : '닫힘 ✓'} · 그 뒤 이동 ${(af.x!==b4.x||af.y!==b4.y) ? '됨 ✓' : '안 됨 ✗'}`);
console.log(`Space → 대화창 ${afterSpace.chat ? '열림 ✓' : '안 열림 ✗'}`);
console.log(`Tab → 증언판 ${afterTab.board ? '보임 ✗' : '숨김 ✓'} · 한 번 더 → ${afterTab2.board ? '보임 ✓' : '숨김 ✗'}`);

// ④ NPC 가 스스로 돌아다니는가 + 서로 만나는가
const before = await page.evaluate(() => Object.fromEntries(Object.entries(window.__wamc.npcState).map(([k,v])=>[k,v.gx+','+v.gy])));
await page.waitForTimeout(12000);
const after2 = await page.evaluate(() => ({
  pos: Object.fromEntries(Object.entries(window.__wamc.npcState).map(([k,v])=>[k,v.gx+','+v.gy])),
  gossip: window.__wamc.gossip,
}));
const movedNpc = Object.keys(before).filter(k => before[k] !== after2.pos[k]).length;
console.log(`NPC 자율 이동: ${movedNpc}/${Object.keys(before).length} 명이 12초 안에 자리를 옮김 · NPC 끼리 나눈 말 ${after2.gossip}건`);
console.log('페이지 오류', errs.length); errs.slice(0,4).forEach(e=>console.log('  ! '+e));
await page.screenshot({ path: 'spum/screenshots/controls.png' });
await ctx.close(); process.exit(0);
