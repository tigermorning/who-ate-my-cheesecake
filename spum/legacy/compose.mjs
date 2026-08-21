// 도면을 한 장의 그림으로 합친다. render.mjs 와 buildtheme.mjs 가 같이 쓴다.
// 화소는 전부 SPUM 유니티 타일셋에서 온다 — spum/materials.mjs 참고.
import { surface } from '../png.mjs';
import { drawMat, drawObj, drawRug } from './spumart.mjs';
import { W, H, PROPS, ONWALL, PATCH, RUGS,
         floorOf, isWall, isFence, isDoor, isRoad, sizeOf, PASSABLE, OVERHEAD, at } from './house.mjs';
import { OBJ } from '../materials.mjs';

export const inBox = (x, y) => ([x1, y1, x2, y2]) => x >= x1 && x <= x2 && y >= y1 && y <= y2;

// 그림자를 밑에 깔면 가구가 바닥에서 뜬 것처럼 보이지 않는다.
const CONTACT = ['#2A1D12', 0.22];

// Z = 픽셀 배율 (1 이면 한 칸 16px, 2 면 32px)
// pass 'back'  = 바닥·벽·가구. 머리 위를 덮는 것은 맨 아랫줄만 그린다
// pass 'front' = 나무 우듬지·차양처럼 **캐릭터보다 위**에 그려질 윗줄만 (나머지는 투명)
export function composeHouse(Z = 2, { shadows = true, pass = 'back' } = {}) {
  const TS = 16 * Z;
  const front = pass === 'front';
  const sf = surface(W * TS, H * TS, front ? '#00000000' : '#1E2A16');
  if (front) {
    for (const p of PROPS) {
      const [cw, ch] = sizeOf(p.key);
      if (!OVERHEAD.has(p.key) || ch < 2) continue;
      drawObj(sf, p.key, p.x, p.y, cw, ch, TS, [0, ch - 1]);
    }
    return { sf, TS };
  }

  // ① 바닥
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const pt = PATCH.find(inBox(x, y));
    drawMat(sf, pt ? pt[4] : floorOf(x, y), x, y, TS);
  }

  // ② 깔개
  RUGS.forEach(([x1, y1, x2, y2, key]) => drawRug(sf, key, x1, y1, x2, y2, TS));

  // ③ 벽·울타리·문
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (isFence(x, y)) { drawMat(sf, 'fence', x, y, TS); continue; }
    if (isWall(x, y)) {
      const below = at(x, y + 1);
      drawMat(sf, below === '#' ? 'wall' : 'wall_face', x, y, TS);
    } else if (isDoor(x, y)) {
      drawObj(sf, 'door', x, y, 1, 1, TS);         // 벽에 난 문
    }
  }

  // ④ 벽 밑 그림자 — 집이 두께를 갖는다
  if (shadows) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (isWall(x, y) || isRoad(x, y)) continue;
    if (!isWall(x, y - 1)) continue;
    sf.wash(x * TS, y * TS, TS, Math.max(2, 3 * Z), CONTACT[0], CONTACT[1]);
  }

  // ⑤ 물건 — 아래쪽에 있는 것이 위에 그려진다 (3/4 시점 깊이)
  const items = [...PROPS, ...ONWALL].map(p => {
    const [cw, ch] = sizeOf(p.key);
    return { ...p, cw, ch, sort: p.y + ch - 1 + (p.on ? 0.5 : 0) };
  }).sort((a, b) => a.sort - b.sort);

  for (const p of items) {
    if (shadows && !p.on && !PASSABLE.has(p.key))
      sf.wash(p.x * TS + Z, (p.y + p.ch) * TS - 3 * Z, p.cw * TS - 2 * Z, 4 * Z, CONTACT[0], CONTACT[1] + 0.06);
    // 머리 위를 덮는 것은 맨 아랫줄만 여기에 남긴다 — 윗줄은 front 로 간다
    const rows = (OVERHEAD.has(p.key) && p.ch >= 2) ? [p.ch - 1, p.ch] : null;
    if (!drawObj(sf, p.key, p.x, p.y, p.cw, p.ch, TS, rows))
      console.error('없는 물건:', p.key);
  }
  return { sf, TS };
}

export { OBJ };
