// 집 한 채를 SPUM 맵 테마 한 장으로 굽는다.
//   node spum/buildtheme.mjs              SPUM 유니티 타일셋 재료로 집을 짓는다 (기본)
//   REF_PNG=1 node spum/buildtheme.mjs    참조 그림을 잘라 쓴다 (비교용. 게임에는 안 쓴다)
//     → spum/house-theme.png   타일 시트 (한 칸 32px)
//     → spum/house-theme.json  타일 속성 + 어느 칸에 어느 타일이 들어가는지
//
// SPUM 맵은 라이브러리의 SMO 를 바로 그리지 못한다. `map.tilesets[]` 에 map-theme 으로
// 등록된 타일만 그리고 레이어에는 숫자 ID 만 들어간다. 그래서 통째로 시트로 굽는다.
//
// 막힘 여부는 그림이 아니라 **도면(house.mjs)** 이 정한다. NPC 길찾기가 이걸 읽는다.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { surface, decodePNG } from './png.mjs';
import { W, H, at, roomOf, isWall, isFence, isDoor, buildBlocked } from './house.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, '..', 'docs', 'house_32grid.png');
const COLS = 32;                   // 시트 열 수
const TS = 32;                     // 화면 한 칸 (원본 16px 을 2배)

// ── 집 한 채를 한 장으로 만든다 ─────────────────────────────
let sf, sfFront = null;
if (!process.env.REF_PNG) {
  const cmp = await import('./compose.mjs');
  ({ sf } = cmp.composeHouse(2, { pass: 'back' }));
  ({ sf: sfFront } = cmp.composeHouse(2, { pass: 'front' }));   // 캐릭터 위에 그려질 층
} else {
  const im = decodePNG(readFileSync(SRC));
  const cell = im.w / W;                                   // 512 / 32 = 16
  if (Math.abs(cell - Math.round(cell)) > 1e-6)
    throw new Error(`원본 ${im.w}px 가 ${W}칸으로 안 나눠떨어진다`);
  // 원본에 그려진 격자선을 지운다 — 안 지우면 게임 화면에 흰 줄이 그대로 남는다.
  // 칸 경계(16의 배수) 한 줄을 양옆 화소의 평균으로 덮는다.
  const px = im.px, iw = im.w, ih = im.h;
  for (let x = 0; x < iw; x += cell) for (let y = 0; y < ih; y++) {
    const a = ((x - 1 + iw) % iw), b = ((x + 1) % iw);
    const d = (y * iw + x) * 4, s1 = (y * iw + a) * 4, s2 = (y * iw + b) * 4;
    for (let k = 0; k < 3; k++) px[d + k] = (px[s1 + k] + px[s2 + k]) >> 1;
  }
  for (let y = 0; y < ih; y += cell) for (let x = 0; x < iw; x++) {
    const a = ((y - 1 + ih) % ih), b = ((y + 1) % ih);
    const d = (y * iw + x) * 4, s1 = (a * iw + x) * 4, s2 = (b * iw + x) * 4;
    for (let k = 0; k < 3; k++) px[d + k] = (px[s1 + k] + px[s2 + k]) >> 1;
  }
  sf = surface(W * TS, H * TS, '#000000');
  const z = TS / cell;                                     // 2배 최근접 확대
  for (let y = 0; y < H * TS; y++) for (let x = 0; x < W * TS; x++) {
    const s = (Math.floor(y / z) * im.w + Math.floor(x / z)) * 4;
    const d = (y * sf.w + x) * 4;
    sf.px[d] = im.px[s]; sf.px[d + 1] = im.px[s + 1]; sf.px[d + 2] = im.px[s + 2]; sf.px[d + 3] = 255;
  }
}

// ── 같은 그림인 칸은 한 타일로 묶는다 ───────────────────────
const cellKey = (src, cx, cy) => {
  let s = '';
  for (let y = 0; y < TS; y += 2) for (let x = 0; x < TS; x += 2) {
    const i = ((cy * TS + y) * src.w + (cx * TS + x)) * 4;
    s += String.fromCharCode(src.px[i], src.px[i + 1], src.px[i + 2], src.px[i + 3]);
  }
  return s;
};
const isEmpty = (src, cx, cy) => {
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++)
    if (src.px[((cy * TS + y) * src.w + (cx * TS + x)) * 4 + 3] > 8) return false;
  return true;
};

const blocked = buildBlocked();
const index = new Map(), tiles = [], layer = new Array(W * H);
const layerFront = new Array(W * H).fill(-1);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  // 그림이 같아도 **막힘이 다르면 다른 타일**이다 — 길찾기가 타일 속성을 읽기 때문이다
  const k = cellKey(sf, x, y) + '|' + blocked[y * W + x];
  if (!index.has(k)) { index.set(k, tiles.length); tiles.push({ src: sf, x, y }); }
  layer[y * W + x] = index.get(k);
}
if (sfFront) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (isEmpty(sfFront, x, y)) continue;
  const k = 'F|' + cellKey(sfFront, x, y);
  if (!index.has(k)) { index.set(k, tiles.length); tiles.push({ src: sfFront, x, y, front: true }); }
  layerFront[y * W + x] = index.get(k);
}

// ── 타일마다 이름과 성질 ────────────────────────────────────
const nameOf = (x, y) => {
  if (isFence(x, y)) return ['울타리', 'obstacle_blocking'];
  if (isWall(x, y)) return ['집 벽', 'obstacle_blocking'];
  if (isDoor(x, y)) return ['문', 'floor'];
  const r = roomOf(x, y) || '뜰';
  return [r + (blocked[y * W + x] ? ' 가구' : ' 바닥'), blocked[y * W + x] ? 'obstacle_blocking' : 'floor'];
};
const seen = {};
const tileDefs = tiles.map((t, i) => {
  const [base0, category0] = nameOf(t.x, t.y);
  const base = t.front ? base0 + ' 위' : base0;
  const category = t.front ? 'decoration' : category0;
  seen[base] = (seen[base] || 0) + 1;
  const block = t.front ? false : !!blocked[t.y * W + t.x];
  return {
    tileId: String(i + 1),
    name: `${base} ${String(seen[base]).padStart(2, '0')}`,
    category,
    movement: block ? 'blocked' : 'passable',
    interaction: 'none',
    blocksMovement: block,
    blocksVision: !t.front && isWall(t.x, t.y),
    moveSpeed: block ? 0 : 1,
    sourceCell: { column: (i % COLS) + 1, row: Math.floor(i / COLS) + 1 },
    from: { x: t.x, y: t.y, char: at(t.x, t.y) },
  };
});

// ── 시트로 옮겨 그린다 ──────────────────────────────────────
const rows = Math.ceil(tiles.length / COLS);
const sheet = surface(COLS * TS, rows * TS, '#00000000');
tiles.forEach((t, i) => {
  const dx = (i % COLS) * TS, dy = Math.floor(i / COLS) * TS;
  const src = t.src || sf;
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
    const s = ((t.y * TS + y) * src.w + (t.x * TS + x)) * 4;
    const d = ((dy + y) * sheet.w + (dx + x)) * 4;
    sheet.px[d] = src.px[s]; sheet.px[d + 1] = src.px[s + 1];
    sheet.px[d + 2] = src.px[s + 2]; sheet.px[d + 3] = src.px[s + 3];
  }
});

mkdirSync(join(__dirname, '..', 'docs'), { recursive: true });
writeFileSync(join(__dirname, 'house-theme.png'), sheet.png());
writeFileSync(join(__dirname, 'house-theme.json'), JSON.stringify({
  name: 'Who Ate My Cheesecake? · 집',
  source: process.env.REF_PNG ? 'docs/house_32grid.png' : 'spum-unity-tileset',
  tileSize: TS, columns: COLS, rows, count: tiles.length,
  width: W, height: H,
  tiles: tileDefs, layer, layerFront,
  walkable: Array.from({ length: W * H }, (_, i) => blocked[i] ? 0 : 1),
  obstacle: Array.from({ length: W * H }, (_, i) => blocked[i] ? 1 : 0),
}, null, 0));

const b = tileDefs.filter(t => t.blocksMovement).length;
console.log(`타일 ${tiles.length}개 (${COLS}×${rows}) · 막힘 ${b} · 지나감 ${tiles.length - b} · 머리 위 ${layerFront.filter(v => v >= 0).length}칸`);
console.log(`spum/house-theme.png  ${sheet.w}×${sheet.h}  (재료: ${process.env.REF_PNG ? 'docs/house_32grid.png' : 'SPUM 유니티 타일셋'})`);
