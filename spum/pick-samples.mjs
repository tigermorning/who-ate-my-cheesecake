// 참조 그림을 칸별로 재서, 글자마다 가장 평평한 칸(순수 바닥)을 고른다.
import { chromium } from 'playwright';
import fs from 'node:fs';
import { W, H, GRID, buildBlocked } from './house.mjs';

const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = b.contexts()[0];
const page = await ctx.newPage();
await page.goto('http://127.0.0.1:8790/spum/play.html', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);

const blocked = Array.from(buildBlocked());
const r = await page.evaluate(async ({ W, H, rows, blocked }) => {
  const img = new Image();
  img.src = '/docs/reference-house.png';
  await img.decode();
  const cv = document.createElement('canvas');
  cv.width = W * 32; cv.height = H * 32;
  const g = cv.getContext('2d');
  g.drawImage(img, 0, 0, cv.width, cv.height);
  const stat = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = g.getImageData(x * 32, y * 32, 32, 32).data;
    let r = 0, gg = 0, bb = 0, n = 0;
    for (let i = 0; i < d.length; i += 16) { r += d[i]; gg += d[i + 1]; bb += d[i + 2]; n++; }
    r /= n; gg /= n; bb /= n;
    let v = 0;
    for (let i = 0; i < d.length; i += 16) v += (d[i] - r) ** 2 + (d[i + 1] - gg) ** 2 + (d[i + 2] - bb) ** 2;
    stat.push({ x, y, r: Math.round(r), g: Math.round(gg), b: Math.round(bb), v: Math.round(v / n) });
  }
  const out = {};
  const chars = new Set(rows.join('').split(''));
  const border = s => s.x === 0 || s.y === 0 || s.x === W - 1 || s.y === H - 1;
  const free = s => !blocked[s.y * W + s.x];        // 가구가 없는 칸만 — 순수 바닥을 뽑는다
  // 그 방의 대표색(중앙값)에 가까우면서 평평한 칸을 고른다
  const med = arr => { const a = [...arr].sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };
  const pickBest = cells => {
    const mr = med(cells.map(c => c.r)), mg = med(cells.map(c => c.g)), mb = med(cells.map(c => c.b));
    return cells.map(c => ({ c, score: Math.hypot(c.r - mr, c.g - mg, c.b - mb) + c.v / 60 }))
                .sort((a, b) => a.score - b.score)[0].c;
  };
  for (const ch of chars) {
    if (ch === '#') continue;
    let cells = stat.filter(s => rows[s.y][s.x] === ch && free(s));
    if (!cells.length) cells = stat.filter(s => rows[s.y][s.x] === ch);
    const best = pickBest(cells);
    out[ch] = { x: best.x, y: best.y, rgb: [best.r, best.g, best.b], v: best.v, n: cells.length };
  }
  // 집 벽과 울타리를 나눈다
  const wall = pickBest(stat.filter(s => rows[s.y][s.x] === '#' && !border(s)));
  out['#'] = { x: wall.x, y: wall.y, rgb: [wall.r, wall.g, wall.b], v: wall.v };
  const fence = pickBest(stat.filter(s => rows[s.y][s.x] === '#' && border(s)));
  out['fence'] = { x: fence.x, y: fence.y, rgb: [fence.r, fence.g, fence.b], v: fence.v };
  return out;
}, { W, H, rows: GRID, blocked });

console.log(JSON.stringify(r, null, 1));
fs.writeFileSync('spum/samples.json', JSON.stringify(r, null, 1));
await page.close();
process.exit(0);
