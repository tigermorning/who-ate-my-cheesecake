// 집 전체를 SPUM 맵 테마 한 장으로 굽는다.
//   node spum/buildtheme.mjs
//     → docs/house-theme.png     16열짜리 타일 시트 (한 칸 32px)
//     → spum/house-theme.json    타일 속성 + 40×30 칸에 어느 타일이 들어가는지
//
// 왜 이렇게 하나: SPUM 맵은 라이브러리에 있는 SMO 를 바로 그리지 못한다.
// 맵이 그릴 수 있는 건 `map.tilesets[]` 에 map-theme 으로 등록된 타일뿐이고,
// 레이어에는 숫자 타일 ID 만 들어간다. 그래서 집 한 채를 통째로 시트로 굽는다.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { surface } from './png.mjs';
import { composeHouse } from './compose.mjs';
import { W, H, at, roomOf, isWall, isFence, isDoor, buildBlocked } from './house.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const Z = 2;                       // 한 칸 32px — Studio 맵 기본 칸 크기
const COLS = 16;

// 그림자를 굽지 않는다. 벽 밑 그림자를 넣으면 고유 타일이 306개로 불어나
// 테마 한 장(16×16=256)에 안 들어간다. 게임 화면(play.html)은 그림자를 직접 그린다.
const { sf, TS } = composeHouse(Z, { shadows: false });

const cellKey = (cx, cy) => {
  let s = '';
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
    const i = ((cy * TS + y) * sf.w + (cx * TS + x)) * 4;
    s += String.fromCharCode(sf.px[i], sf.px[i + 1], sf.px[i + 2]);
  }
  return s;
};

const blocked = buildBlocked();
const index = new Map();           // 그림 내용 → 타일 번호
const tiles = [];                  // 타일 번호 → {처음 나온 자리}
const layer = new Array(W * H);

for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const k = cellKey(x, y);
  if (!index.has(k)) { index.set(k, tiles.length); tiles.push({ x, y }); }
  layer[y * W + x] = index.get(k);
}

// 타일마다 이름과 성질을 붙인다 — Studio 의 tileProperties 가 이걸 쓴다
const nameOf = (x, y) => {
  if (isFence(x, y)) return ['울타리', 'obstacle_blocking'];
  if (isWall(x, y)) return ['집 벽', 'obstacle_blocking'];
  if (isDoor(x, y)) return ['문', 'floor'];
  const r = roomOf(x, y) || '뜰';
  return [r + (blocked[y * W + x] ? ' 가구' : ' 바닥'), blocked[y * W + x] ? 'obstacle_blocking' : 'floor'];
};
const seen = {};
const tileDefs = tiles.map((t, i) => {
  const [base, category] = nameOf(t.x, t.y);
  seen[base] = (seen[base] || 0) + 1;
  const block = !!blocked[t.y * W + t.x];
  return {
    tileId: String(i + 1),
    name: `${base} ${String(seen[base]).padStart(2, '0')}`,
    category,
    movement: block ? 'blocked' : 'passable',
    interaction: 'none',
    blocksMovement: block,
    blocksVision: isWall(t.x, t.y),
    moveSpeed: block ? 0 : 1,
    sourceCell: { column: (i % COLS) + 1, row: Math.floor(i / COLS) + 1 },
    from: { x: t.x, y: t.y, char: at(t.x, t.y) },
  };
});

// 시트로 옮겨 그린다
const rows = Math.ceil(tiles.length / COLS);
const sheet = surface(COLS * TS, rows * TS, '#00000000');
tiles.forEach((t, i) => {
  const dx = (i % COLS) * TS, dy = Math.floor(i / COLS) * TS;
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
    const s = ((t.y * TS + y) * sf.w + (t.x * TS + x)) * 4;
    const d = ((dy + y) * sheet.w + (dx + x)) * 4;
    sheet.px[d] = sf.px[s]; sheet.px[d + 1] = sf.px[s + 1];
    sheet.px[d + 2] = sf.px[s + 2]; sheet.px[d + 3] = 255;
  }
});

// 시트는 두 곳에 둔다 — 게임이 읽는 곳(spum/)과 문서용(docs/)
mkdirSync(join(__dirname, '..', 'docs'), { recursive: true });
const png = sheet.png();
writeFileSync(join(__dirname, 'house-theme.png'), png);
writeFileSync(join(__dirname, '..', 'docs', 'house-theme.png'), png);
writeFileSync(join(__dirname, 'house-theme.json'), JSON.stringify({
  name: 'Who Ate My Cheesecake? · 집',
  tileSize: TS, columns: COLS, rows, count: tiles.length,
  width: W, height: H,
  tiles: tileDefs,
  layer,                                            // 40×30 — 0부터 세는 타일 번호
  walkable: Array.from({ length: W * H }, (_, i) => blocked[i] ? 0 : 1),
  obstacle: Array.from({ length: W * H }, (_, i) => blocked[i] ? 1 : 0),
}, null, 0));

const b = tileDefs.filter(t => t.blocksMovement).length;
console.log(`타일 ${tiles.length}개 (${COLS}×${rows}) · 막힘 ${b} · 지나감 ${tiles.length - b}`);
console.log(`spum/house-theme.png · docs/house-theme.png  ${sheet.w}×${sheet.h}`);
