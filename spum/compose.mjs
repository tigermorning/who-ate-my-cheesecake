// 도면을 한 장의 그림으로 합친다. render.mjs 와 buildtheme.mjs 가 같이 쓴다.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { surface } from './png.mjs';
import { W, H, PROPS, ONWALL, PATCH, RUGS,
         floorOf, isWall, isFence, isDoor, sizeOf, PASSABLE, at } from './house.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const inBox = (x, y) => ([x1, y1, x2, y2]) => x >= x1 && x <= x2 && y >= y1 && y <= y2;

export function loadSmo() {
  const smo = JSON.parse(readFileSync(join(__dirname, 'smo.json'), 'utf8'));
  return { smo, byKey: Object.fromEntries(smo.map(o => [o.key, o])) };
}

// Z = 픽셀 배율 (1 이면 한 칸 16px)
export function composeHouse(Z = 1, { shadows = true } = {}) {
  const { byKey } = loadSmo();
  const TS = 16 * Z;
  const sf = surface(W * TS, H * TS, '#2A2018');
  const stamp = (key, tx, ty) => {
    const o = byKey[key]; if (!o) return;
    const { width: w, height: h, pixels } = o.visual;
    const ox = tx * TS, oy = ty * TS;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = pixels[y * w + x]; if (!c) continue;
      sf.fill(ox + x * Z, oy + y * Z, Z, Z, c);
    }
  };

  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const pt = PATCH.find(inBox(x, y));
    stamp(pt ? pt[4] : floorOf(x, y), x, y);
    const rug = RUGS.find(inBox(x, y));
    if (rug) stamp(rug[4], x, y);
  }
  RUGS.forEach(([x1, y1, x2, y2]) => {
    const bx = x1 * TS, by = y1 * TS, bw = (x2 - x1 + 1) * TS, bh = (y2 - y1 + 1) * TS;
    const t = Math.max(1, 2 * Z);
    sf.wash(bx, by, bw, t, '#7A6A4E', 0.55); sf.wash(bx, by + bh - t, bw, t, '#7A6A4E', 0.55);
    sf.wash(bx, by, t, bh, '#7A6A4E', 0.55); sf.wash(bx + bw - t, by, t, bh, '#7A6A4E', 0.55);
  });
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (isWall(x, y)) {
      if (isFence(x, y)) { stamp('fence', x, y); continue; }
      // 남쪽이 벽이 아니면 벽의 앞면이 보인다 — 두께가 생긴다.
      const below = at(x, y + 1);
      const openBelow = below !== '#';
      const outer = openBelow && (below === '.' || below === ',');
      stamp(openBelow ? (outer ? 'house_wall_face_stone' : 'house_wall_face') : 'house_wall', x, y);
    } else if (isDoor(x, y)) stamp('wooden_door', x, y);
  }
  if (shadows) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!isWall(x, y - 1) || isWall(x, y) || isDoor(x, y)) continue;
    sf.wash(x * TS, y * TS, TS, Math.max(1, 3 * Z), '#3A2A1C', 0.16);
  }
  const items = [...PROPS, ...ONWALL].map(p => {
    const [cw, ch] = sizeOf(p.key);
    return { ...p, cw, ch, sort: p.y + ch - 1 + (p.on ? 0.5 : 0) + (byKey[p.key]?.layerHint === 'back' ? -100 : 0) };
  }).sort((a, b) => a.sort - b.sort);
  items.forEach(p => {
    if (shadows && !p.on && !PASSABLE.has(p.key) && byKey[p.key]?.layerHint !== 'back')
      sf.wash(p.x * TS + Z, (p.y + p.ch) * TS - 2 * Z, p.cw * TS - 2 * Z, 4 * Z, '#3A2A1C', 0.20);
    stamp(p.key, p.x, p.y);
  });
  return { sf, TS };
}
