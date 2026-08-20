// Who Ate My Cheesecake? — 집 도면 (32×32).
//
// 바탕 그림: docs/house_32grid.png (512×512, 32×32 격자 = 한 칸 16px).
// 이 그림이 SPUM Object Editor 의 **source image** 다. 잘라서 타일로 쓰고,
// 이 도면은 그 타일마다 **막힘 여부와 방 이름**을 정한다.
//   화면 한 칸 32px (16px 원본을 2배) → 무대 1024×1024.
//
// 좌표는 그림에 32×32 격자를 얹어(`node spum/refgrid.mjs 32 32 out.png docs/house_32grid.png`) 읽었다.
//   집 바깥벽  x 5..27  y 2..25
//   부엌 x 6..13 y 3..10 · 욕실 x 15..18 y 3..8 · 복도 x 14..18 y 10..11
//   식당 x 6..18 y 12..24 · 거실 x 20..26 y 3..16 · 서재 x 20..26 y 18..24
//   데크 x 1..4 y 6..13 · 운동장 x 1..4 y 17..25 · 헛간 x 28..30 y 4..8 · 텃밭 x 28..30 y 17..25
//
//   #  벽·울타리   .  뜰    ,  돌길   +  문   =  바깥 길
//   K 부엌  D 식당  B 욕실  L 거실  S 서재  C 복도  W 데크  Y 운동장  V 텃밭  H 헛간
//
// 고치면 `node spum/houseplan.mjs` 로 검사하고,
// `node spum/buildtheme.mjs && node spum/buildmap.mjs > spum/house-map.json` 으로 다시 굽는다.

export const W = 32, H = 32;

const g = Array.from({ length: H }, () => new Array(W).fill('.'));
const box = (x1, y1, x2, y2, ch) => {
  for (let y = Math.max(0, y1); y <= Math.min(H - 1, y2); y++)
    for (let x = Math.max(0, x1); x <= Math.min(W - 1, x2); x++) g[y][x] = ch;
};

box(0, 0, W - 1, 0, '=');                              // 뒤편
box(0, 29, W - 1, H - 1, '=');                         // 집 앞 길
box(1, 29, W - 2, 29, ',');                            // 인도 — 대문이 여기로 나온다
box(0, 1, 0, 28, '#'); box(W - 1, 1, W - 1, 28, '#');  // 울타리
box(1, 1, W - 2, 1, '#'); box(1, 28, W - 2, 28, '#');

box(5, 2, 27, 25, '#');                                // 집을 통째로 벽으로 채우고
box(6, 3, 13, 10, 'K');                                // 방을 파낸다
box(6, 11, 18, 24, 'D');
box(15, 3, 18, 8, 'B');
box(14, 10, 18, 11, 'C');
box(20, 3, 26, 16, 'L');
box(20, 18, 26, 24, 'S');

box(16, 9, 17, 9, '+');                                // 욕실 문
box(19, 13, 19, 14, '+');                              // 식당 ↔ 거실
box(19, 20, 19, 21, '+');                              // 식당 ↔ 서재
box(15, 25, 17, 25, '+');                              // 현관문
box(5, 7, 5, 8, '+');                                  // 부엌 → 데크
box(27, 10, 27, 11, '+');                              // 거실 → 뜰
box(27, 19, 27, 19, '+'); box(27, 22, 27, 22, '+');    // 서재·거실 → 뜰

box(1, 6, 4, 13, 'W');                                 // 데크
box(1, 17, 4, 25, 'Y');                                // 운동장
box(27, 3, 31, 9, '#'); box(28, 4, 30, 8, 'H');        // 헛간
box(29, 9, 29, 9, '+');
box(28, 17, 30, 25, 'V');                              // 텃밭

box(28, 10, 30, 16, ',');                              // 옆길 (헛간·텃밭으로)
box(1, 14, 4, 16, ',');                                // 데크 ↔ 운동장
box(1, 26, 30, 26, ',');                               // 집 앞을 가로지르는 길
box(15, 27, 17, 27, ',');                              // 대문으로 내려가는 길
box(16, 28, 16, 28, '+');                              // 대문

export const GRID = g.map(r => r.join(''));

const OF = {
  K: '부엌', D: '식당', B: '욕실', L: '거실', S: '서재', C: '복도',
  W: '데크', Y: '운동장', V: '텃밭', H: '헛간',
};
export const INDOOR = new Set(['부엌', '식당', '욕실', '거실', '서재', '복도']);

// 글자 → 바닥 재료 (spum/materials.mjs). 그림을 잘라 쓸 때는 안 쓰이고,
// SPUM 재료로 다시 그릴 때(`SPUM_ART=1`)만 쓰인다.
const FLOOR = {
  K: 'wood_floor', D: 'wood_floor', B: 'marble', L: 'wood_floor', S: 'parquet',
  C: 'wood_floor', '+': 'wood_floor', W: 'deck_wood', Y: 'gravel', V: 'veg_soil',
  H: 'deck_wood', '.': 'grass', ',': 'stone_path', '#': 'grass', '=': 'brick_tan',
};

export const at = (x, y) => (y < 0 || y >= H || x < 0 || x >= W) ? '#' : GRID[y][x];
export const isDoor = (x, y) => at(x, y) === '+';
export const isWall = (x, y) => at(x, y) === '#';
export const isRoad = (x, y) => at(x, y) === '=';
export const isYard = (x, y) => { const c = at(x, y); return c === '.' || c === ','; };
export const isFence = (x, y) => isWall(x, y) && (x <= 0 || y <= 1 || x >= W - 1 || y >= 28);
export const floorOf = (x, y) => FLOOR[at(x, y)] || 'grass';

export function roomOf(x, y) {
  const c = at(x, y);
  if (OF[c]) return OF[c];
  if (c === '+') {
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const n = OF[at(x + dx, y + dy)];
      if (n) return n;
    }
  }
  if (c === ',' || c === '.') return y >= 26 ? '현관앞' : null;
  return null;
}

export const ZONES = [
  { name: '부엌', x: 9, y: 6 }, { name: '식당', x: 16, y: 17 }, { name: '욕실', x: 16, y: 8 },
  { name: '거실', x: 21, y: 15 }, { name: '서재', x: 20, y: 20 }, { name: '복도', x: 16, y: 10 },
  { name: '데크', x: 3, y: 12 }, { name: '운동장', x: 2, y: 24 },
  { name: '텃밭', x: 30, y: 21 }, { name: '헛간', x: 29, y: 6 }, { name: '현관앞', x: 16, y: 26 },
];

export const PATCH = [];

// 깔개 — 그림에 있는 러그 자리 (SPUM 재료 모드에서만 쓰인다)
export const RUGS = [
  [8, 12, 15, 19, 'rug_rect'],             // 식탁 밑
  [20, 10, 25, 16, 'rug_rect'],            // 소파 앞
  [20, 20, 26, 24, 'rug_rect'],            // 서재
  [8, 5, 12, 6, 'rug_rect'],               // 부엌 발치
];

// ── 놓인 것 ─────────────────────────────────────────────────
const PROPS_BASE = [
  // ══ 부엌 x6..13 y3..10 ══
  { key: 'fridge', x: 6, y: 3 },
  { key: 'counter', x: 8, y: 3 },
  { key: 'stove', x: 12, y: 3 },
  { key: 'kitchen_island', x: 8, y: 7 },
  { key: 'empty_plate', x: 9, y: 7, on: true },
  { key: 'fruit_bowl', x: 11, y: 7, on: true },
  { key: 'stool', x: 9, y: 10 }, { key: 'stool', x: 10, y: 10 }, { key: 'stool', x: 11, y: 10 },
  { key: 'plant_pot', x: 6, y: 10 },

  // ══ 욕실 x15..18 y3..8 ══
  { key: 'bathtub', x: 15, y: 4 },
  { key: 'toilet', x: 15, y: 6 },
  { key: 'bath_sink', x: 18, y: 7 },
  { key: 'plant_pot', x: 18, y: 3 },

  // ══ 거실 x20..26 y3..16 ══
  { key: 'mantel', x: 20, y: 3, on: true },
  { key: 'fireplace', x: 21, y: 4 },
  { key: 'plant_pot', x: 20, y: 7 }, { key: 'plant_pot', x: 26, y: 7 },
  { key: 'sofa_long', x: 20, y: 8 },
  { key: 'sofa_side', x: 24, y: 11 },
  { key: 'coffee_table', x: 21, y: 11 },
  { key: 'side_table', x: 23, y: 16 },
  { key: 'plant_pot', x: 26, y: 12 },

  // ══ 식당 x6..18 y12..24 ══
  { key: 'dining_table', x: 10, y: 13 },
  { key: 'chair_up', x: 11, y: 12 }, { key: 'chair_up', x: 13, y: 12 },
  { key: 'chair_down', x: 11, y: 19 }, { key: 'chair_down', x: 13, y: 19 },
  { key: 'chair_left', x: 9, y: 15 }, { key: 'chair_right', x: 15, y: 15 },
  { key: 'armchair', x: 7, y: 20 }, { key: 'armchair', x: 10, y: 20 },
  { key: 'lamp', x: 13, y: 21 },
  { key: 'plant_pot', x: 6, y: 12 }, { key: 'plant_pot', x: 6, y: 18 },
  { key: 'plant_pot', x: 15, y: 22 }, { key: 'plant_pot', x: 18, y: 13 },

  // ══ 서재 x20..26 y18..24 ══
  { key: 'bookshelf', x: 20, y: 18 },
  { key: 'desk', x: 21, y: 21 },
  { key: 'books', x: 22, y: 21, on: true },
  { key: 'lamp', x: 25, y: 21, on: true },
  { key: 'chair_up', x: 22, y: 20 },
  { key: 'plant_pot', x: 20, y: 23 }, { key: 'plant_pot', x: 26, y: 20 },

  // ══ 복도·현관 ══
  { key: 'plant_pot', x: 14, y: 23 }, { key: 'baskets', x: 17, y: 11 },

  // ══ 데크 x1..4 y6..13 ══
  { key: 'parasol', x: 1, y: 6 },
  { key: 'plant_pot', x: 4, y: 12 },

  // ══ 운동장 x1..4 y17..25 ══
  { key: 'weight_rack', x: 1, y: 17 },
  { key: 'punch_bag', x: 3, y: 17 },
  { key: 'exercise_mat', x: 3, y: 21 },
  { key: 'dumbbells', x: 1, y: 21 },

  // ══ 헛간 x28..30 y4..8 ══
  { key: 'boxes', x: 28, y: 4 }, { key: 'baskets', x: 28, y: 7 },
  { key: 'garden_tools', x: 30, y: 4 },

  // ══ 텃밭 x28..30 y17..25 ══
  { key: 'veg_bed', x: 28, y: 17 }, { key: 'veg_bed', x: 28, y: 20 }, { key: 'veg_bed', x: 28, y: 23 },
  { key: 'watering_can', x: 30, y: 19 },

  // ══ 뜰 ══
  { key: 'tree', x: 1, y: 2 }, { key: 'tree', x: 26, y: 26 },
  { key: 'tree', x: 1, y: 26 }, { key: 'tree', x: 29, y: 26 },
  { key: 'bush', x: 3, y: 4 }, { key: 'bush', x: 3, y: 15 },
  { key: 'flower_bed', x: 6, y: 26 }, { key: 'flower_bed', x: 10, y: 26 },
  { key: 'flower_bed', x: 19, y: 26 }, { key: 'flower_bed', x: 24, y: 26 },
  { key: 'mailbox', x: 19, y: 27 },
];

export const ONWALL = [
  { key: 'window', x: 9, y: 2 }, { key: 'window', x: 16, y: 2 },
  { key: 'window', x: 22, y: 2 },
  { key: 'window', x: 5, y: 4 }, { key: 'window', x: 5, y: 20 },
  { key: 'window', x: 27, y: 6 }, { key: 'window', x: 27, y: 17 },
  { key: 'window', x: 9, y: 25 }, { key: 'window', x: 21, y: 25 },
  { key: 'painting', x: 22, y: 2 }, { key: 'painting', x: 5, y: 14 },
];

// 첫 자리일 뿐이다. 판이 시작되면 `newRound()` 가 그 판의 동선 첫 칸으로 다시 앉힌다.
// 방과 인물 사이에 뜻은 없다 — 옛 캐스트(베이커=부엌 …)의 흔적이지 설정이 아니다.
export const SPOT = {
  sgn_haru:  { room: '부엌', x: 8, y: 6 },
  sgn_minu:  { room: '서재', x: 25, y: 20 },
  sgn_coco:  { room: '텃밭', x: 30, y: 21 },
  sgn_lulu:  { room: '거실', x: 22, y: 15 },
  sgn_peach: { room: '데크', x: 3, y: 12 },
  sgn_ruby:  { room: '식당', x: 17, y: 17 },
  player:    { room: '복도', x: 16, y: 10 },
};

export const LANDMARKS = [
  { name: '냉장고', x: 8, y: 5 }, { name: '식탁', x: 16, y: 16 }, { name: '난로', x: 22, y: 3 },
  { name: '서재 책상', x: 24, y: 24 }, { name: '책장', x: 20, y: 20 }, { name: '현관', x: 16, y: 24 },
  { name: '데크', x: 3, y: 12 }, { name: '운동장', x: 2, y: 24 }, { name: '텃밭', x: 30, y: 21 },
  { name: '헛간', x: 29, y: 6 }, { name: '아일랜드', x: 8, y: 10 }, { name: '소파', x: 26, y: 10 },
];

// ── 크기 (칸) — 그림에서 잰 그대로 ──────────────────────────
export const SIZE = {
  fridge: [2, 3], counter: [4, 2], stove: [2, 3], kitchen_island: [5, 3], wall_shelf: [3, 1],
  dining_table: [5, 6], chair_up: [1, 1], chair_down: [1, 1], chair_left: [1, 1], chair_right: [1, 1],
  stool: [1, 1], fireplace: [4, 4], mantel: [6, 1], sofa_long: [4, 2], sofa_side: [2, 5],
  armchair: [2, 2], coffee_table: [3, 4], side_table: [1, 1], lamp: [1, 1], cabinet: [1, 2],
  bookshelf: [6, 2], desk: [5, 3], bathtub: [3, 2], toilet: [1, 2], bath_sink: [1, 2],
  parasol: [3, 4], exercise_mat: [2, 3], weight_rack: [2, 3], punch_bag: [1, 3], dumbbells: [1, 1],
  veg_bed: [2, 2], garden_tools: [1, 1], tree: [2, 2], bush: [1, 1], hedge: [2, 2],
  flower_bed: [2, 1], boxes: [2, 2], baskets: [1, 1], plant_pot: [1, 1], mailbox: [1, 1],
  books: [1, 1], watering_can: [1, 1], fruit_bowl: [1, 1], empty_plate: [1, 1], sink: [1, 1],
  window: [1, 1], painting: [1, 1],
};
export const sizeOf = key => SIZE[key] || [1, 1];

// 캐릭터보다 **위에** 그려질 것들 — 나무 우듬지·차양처럼 머리 위를 덮는 것.
// buildtheme 이 이 물건의 윗줄을 front 레이어로 보낸다.
export const OVERHEAD = new Set(['tree', 'parasol', 'mantel', 'wall_shelf', 'window', 'painting', 'hedge', 'bookshelf']);

export const PASSABLE = new Set([
  'exercise_mat', 'plant_pot', 'flower_bed', 'watering_can', 'baskets', 'hedge',
  'window', 'painting', 'mantel', 'wall_shelf', 'mailbox',
  'cheesecake', 'empty_plate', 'fruit_bowl', 'sink', 'books', 'note', 'diary',
]);

// 울타리 안쪽 산울타리 — 그림에서 뜰 가장자리를 채우고 있다
function hedgeRing(base) {
  const taken = new Set();
  for (const p of base) {
    const [cw, ch] = sizeOf(p.key);
    for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) taken.add((p.y + j) * W + (p.x + i));
  }
  const free = (x, y) => {
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++)
      if (at(x + i, y + j) !== '.' || taken.has((y + j) * W + (x + i))) return false;
    return true;
  };
  const out = [];
  const push = (x, y) => {
    if (!free(x, y)) return;
    out.push({ key: 'hedge', x, y });
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) taken.add((y + j) * W + (x + i));
  };
  for (let x = 2; x <= 28; x += 4) { push(x, 2); push(x, 26); }
  for (let y = 4; y <= 24; y += 4) { push(1, y); push(29, y); }
  return out;
}

export const PROPS = [...PROPS_BASE, ...hedgeRing(PROPS_BASE)];

// 밟을 수 있는 글자 — 방 바닥·돌길·문·데크·운동장·텃밭·헛간.
// 잔디('.')와 길 바깥('=')은 **장식**이라 막는다. 그래서 뜰도 길을 따라 다닌다.
const WALKABLE_CH = new Set(['K', 'D', 'B', 'L', 'S', 'C', 'W', 'Y', 'V', 'H', ',', '+']);

export function buildBlocked() {
  const b = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
    b[y * W + x] = WALKABLE_CH.has(at(x, y)) ? 0 : 1;
  for (const p of PROPS) {
    if (p.on || PASSABLE.has(p.key)) continue;
    const [cw, ch] = sizeOf(p.key);
    for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
      const nx = p.x + i, ny = p.y + j;
      if (nx >= 0 && ny >= 0 && nx < W && ny < H) b[ny * W + nx] = 1;
    }
  }
  return b;
}
