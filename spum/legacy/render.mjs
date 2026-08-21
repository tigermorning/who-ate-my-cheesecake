// 도면을 그림으로 뽑아 눈으로 확인한다.  node spum/render.mjs [배율] [파일]
//   node spum/render.mjs 2 docs/house.png
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { surface } from './png.mjs';
import { W, H, PROPS, ONWALL, PATCH, RUGS, ZONES, SPOT,
         at, floorOf, isWall, isFence, isDoor, sizeOf, PASSABLE } from './house.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const Z = Number(process.argv.filter(a => !a.startsWith('--'))[2] || 2);
const OUT = process.argv.filter(a => !a.startsWith('--'))[3] || join(__dirname, '..', 'docs', 'house.png');

const smo = JSON.parse(readFileSync(join(__dirname, 'smo.json'), 'utf8'));
const byKey = Object.fromEntries(smo.map(o => [o.key, o]));
const TS = 16 * Z;
const sf = surface(W * TS, H * TS, '#2A2018');

function stamp(key, tx, ty) {
  const o = byKey[key]; if (!o) return;
  const { width: w, height: h, pixels } = o.visual;
  const ox = tx * TS, oy = ty * TS;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = pixels[y * w + x]; if (!c) continue;
    sf.fill(ox + x * Z, oy + y * Z, Z, Z, c);
  }
}
const inBox = (x, y) => ([x1, y1, x2, y2]) => x >= x1 && x <= x2 && y >= y1 && y <= y2;

// 바닥
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const pt = PATCH.find(inBox(x, y));
  stamp(pt ? pt[4] : floorOf(x, y), x, y);
  const rug = RUGS.find(inBox(x, y));
  if (rug) stamp(rug[4], x, y);
}
// 깔개 테두리 — 한 장의 천으로 보이게
RUGS.forEach(([x1, y1, x2, y2]) => {
  const bx = x1 * TS, by = y1 * TS, bw = (x2 - x1 + 1) * TS, bh = (y2 - y1 + 1) * TS;
  const t = Math.max(1, 2 * Z);
  sf.wash(bx, by, bw, t, '#7A6A4E', 0.55); sf.wash(bx, by + bh - t, bw, t, '#7A6A4E', 0.55);
  sf.wash(bx, by, t, bh, '#7A6A4E', 0.55); sf.wash(bx + bw - t, by, t, bh, '#7A6A4E', 0.55);
});

// 벽 · 문
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (isWall(x, y)) stamp(isFence(x, y) ? 'fence' : 'house_wall', x, y);
  else if (isDoor(x, y)) stamp('wooden_door', x, y);
}
// 벽 밑 그림자 — 빛이 위에서 오니 벽 아래쪽 바닥이 어둡다
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (!isWall(x, y - 1) || isWall(x, y) || isDoor(x, y)) continue;
  sf.wash(x * TS, y * TS, TS, Math.max(1, 3 * Z), '#3A2A1C', 0.16);
}

// 소품 — 아래쪽에 있는 것을 나중에 그린다 (Y 정렬)
const items = [...PROPS, ...ONWALL].map(p => {
  const [cw, ch] = sizeOf(p.key);
  return { ...p, sort: p.y + ch - 1 + (p.on ? 0.5 : 0) + (byKey[p.key]?.layerHint === 'back' ? -100 : 0) };
});
items.sort((a, b) => a.sort - b.sort);
items.forEach(p => {
  const [cw, ch] = sizeOf(p.key);
  if (!p.on && !PASSABLE.has(p.key) && byKey[p.key]?.layerHint !== 'back')
    sf.wash(p.x * TS + Z, (p.y + ch) * TS - 2 * Z, cw * TS - 2 * Z, 4 * Z, '#3A2A1C', 0.20);
  stamp(p.key, p.x, p.y);
});

// --spots 를 주면 자리 이름표와 서 있는 자리를 표시한다 (검사용)
if (process.argv.includes('--spots')) {
  ZONES.forEach(z => sf.wash(z.x * TS - TS, z.y * TS - TS / 2, TS * 3, TS, '#FFE9C9', 0.30));
  Object.values(SPOT).forEach(s => sf.wash(s.x * TS, s.y * TS, TS, TS, '#E8894A', 0.55));
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, sf.png());
console.log(`${OUT} · ${W * TS}×${H * TS}`);
