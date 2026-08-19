// Who Ate My Cheesecake? — 집 도면.
//
// 참조 그림 docs/reference-house.png (1254×1254) 를 48×48 격자로 옮긴 것이다.
// 그림 한 칸 = 1254/48 ≈ 26px, 화면 한 칸 = 32px (SPUM 타일 16px 를 2배로 그린다).
//
// 좌표는 그림에 48×48 격자를 얹어(`node spum/refgrid.mjs 48 48 …`) 직접 읽었다.
//   집 바깥벽  x 8..40  y 2..37
//   부엌       x 9..20  y 4..16      욕실   x 22..27 y 4..12
//   식당(대청) x 9..27  y 17..36     복도   x 21..27 y 14..16
//   거실       x 29..39 y 4..24      서재   x 29..39 y 26..36
//   데크 x 2..7 y 9..19 · 운동장 x 1..7 y 26..37 · 헛간 x 41..46 y 5..14 · 텃밭 x 41..46 y 25..38
//
//   #  벽·울타리   .  뜰    ,  돌길   +  문   =  바깥 길
//   K 부엌  D 식당  B 욕실  L 거실  S 서재  C 복도
//   W 데크  Y 운동장  V 텃밭  H 헛간
//
// 고치면 `node spum/houseplan.mjs` 로 검사하고,
// `node spum/buildtheme.mjs && node spum/buildmap.mjs > spum/house-map.json` 으로 다시 굽는다.

export const W = 48, H = 48;

// ── 도면을 사각형으로 칠한다 ────────────────────────────────
const g = Array.from({ length: H }, () => new Array(W).fill('.'));
const box = (x1, y1, x2, y2, ch) => {
  for (let y = Math.max(0, y1); y <= Math.min(H - 1, y2); y++)
    for (let x = Math.max(0, x1); x <= Math.min(W - 1, x2); x++) g[y][x] = ch;
};

box(0, 44, W - 1, H - 1, '=');                                   // 집 앞 길
box(0, 0, W - 1, 0, '=');                                        // 뒤편
box(0, 1, 0, 43, '#'); box(W - 1, 1, W - 1, 43, '#');            // 울타리
box(1, 1, W - 2, 1, '#'); box(1, 43, W - 2, 43, '#');

box(8, 2, 40, 37, '#');                                          // 집을 통째로 벽으로 채우고
box(9, 4, 20, 16, 'K');                                          // 방을 파낸다
box(9, 17, 27, 36, 'D');
box(22, 4, 27, 12, 'B');
box(21, 14, 27, 16, 'C');
box(29, 4, 39, 24, 'L');
box(29, 26, 39, 36, 'S');

box(24, 13, 25, 13, '+');                                        // 욕실 문
box(28, 19, 28, 20, '+');                                        // 식당 ↔ 거실
box(28, 30, 28, 31, '+');                                        // 식당 ↔ 서재
box(23, 37, 25, 37, '+');                                        // 현관문
box(8, 10, 8, 11, '+');                                          // 부엌 → 데크
box(40, 15, 40, 16, '+');                                        // 거실 → 뜰
box(40, 32, 40, 33, '+');                                        // 서재 → 뜰

box(2, 9, 7, 19, 'W');                                           // 데크
box(1, 26, 7, 37, 'Y');                                          // 운동장
box(41, 5, 46, 14, '#'); box(42, 6, 45, 13, 'H');                // 헛간
box(43, 14, 44, 14, '+');
box(41, 25, 46, 38, 'V');                                        // 텃밭

box(41, 15, 45, 24, ',');                                        // 옆길
box(2, 21, 7, 25, ',');                                          // 운동장 가는 길
box(22, 38, 26, 42, ',');                                        // 앞길
box(23, 43, 25, 43, '+');                                        // 대문

export const GRID = g.map(r => r.join(''));

// 글자 → 방 이름. 뜰의 자리들도 이름이 있다 — 알리바이가 걸리는 곳이기 때문이다.
const OF = {
  K: '부엌', D: '식당', B: '욕실', L: '거실', S: '서재', C: '복도',
  W: '데크', Y: '운동장', V: '텃밭', H: '헛간',
};
export const INDOOR = new Set(['부엌', '식당', '욕실', '거실', '서재', '복도']);

// 글자 → 바닥 재료 키 (spum/materials.mjs)
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
export const isFence = (x, y) => isWall(x, y) && (x <= 1 || y <= 1 || x >= W - 2 || y >= 43);
export const floorOf = (x, y) => FLOOR[at(x, y)] || 'grass';

export function roomOf(x, y) {
  const c = at(x, y);
  if (OF[c]) return OF[c];
  if (c === '+') {                                    // 문은 이웃한 방에 붙는다
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const n = OF[at(x + dx, y + dy)];
      if (n) return n;
    }
  }
  if (c === ',' || c === '.') return y >= 38 ? '현관앞' : null;
  return null;
}

export const ZONES = [
  { name: '부엌', x: 14, y: 10 }, { name: '식당', x: 24, y: 25 }, { name: '욕실', x: 25, y: 12 },
  { name: '거실', x: 31, y: 23 }, { name: '서재', x: 30, y: 34 }, { name: '복도', x: 24, y: 15 },
  { name: '데크', x: 4, y: 19 }, { name: '운동장', x: 4, y: 36 },
  { name: '텃밭', x: 43, y: 31 }, { name: '헛간', x: 43, y: 9 }, { name: '현관앞', x: 24, y: 40 },
];

// 바닥을 덮어쓰는 자리 (꽃밭·잔디 무늬)
export const PATCH = [
  [2, 2, 45, 3, 'grass_flower'],
  [2, 39, 20, 42, 'grass_flower'], [28, 39, 45, 42, 'grass_flower'],
];

// 깔개 — 참조 그림의 러그 다섯 장
export const RUGS = [
  [13, 9, 19, 11, 'rug_rect'],             // 부엌 발치
  [12, 18, 24, 31, 'rug_rect'],            // 식탁 밑 — 가장 크다
  [29, 13, 38, 24, 'rug_rect'],            // 소파 앞
  [29, 29, 39, 36, 'rug_rect'],            // 서재
  [23, 9, 26, 11, 'rug_round'],            // 욕실
];

// ── 놓인 것 ─────────────────────────────────────────────────
// {key, x, y} — (x,y) 는 왼쪽 위 칸. 크기는 SIZE 를 따른다.
// on:true 는 가구 위에 얹히는 것 — 길을 막지 않는다.
const PROPS_BASE = [
  // ══ 부엌 x9..20 y4..16 ══ (참조: 냉장고·상부장·싱크·레인지·아일랜드·스툴 3)
  { key: 'fridge', x: 9, y: 5 },
  { key: 'wall_shelf', x: 12, y: 4, on: true },
  { key: 'counter', x: 12, y: 5 },
  { key: 'sink', x: 15, y: 5, on: true },
  { key: 'stove', x: 18, y: 5 },
  { key: 'kitchen_island', x: 13, y: 12 },
  { key: 'sink', x: 15, y: 12, on: true },
  { key: 'fruit_bowl', x: 17, y: 12, on: true },
  { key: 'empty_plate', x: 14, y: 12, on: true },       // 아침에 발견된 빈 접시
  { key: 'stool', x: 14, y: 15 }, { key: 'stool', x: 16, y: 15 }, { key: 'stool', x: 18, y: 15 },
  { key: 'plant_pot', x: 20, y: 10 },
  { key: 'plant_pot', x: 9, y: 15 }, { key: 'plant_pot', x: 14, y: 8 }, { key: 'baskets', x: 12, y: 16 },

  // ══ 욕실 x22..27 y4..12 ══
  { key: 'bathtub', x: 23, y: 6 },
  { key: 'toilet', x: 22, y: 9 },
  { key: 'bath_sink', x: 26, y: 10 },
  { key: 'plant_pot', x: 22, y: 4 }, { key: 'plant_pot', x: 26, y: 4 },
  { key: 'plant_pot', x: 24, y: 11 },

  // ══ 거실 x29..39 y4..24 ══ (참조: 벽난로 + 나무선반 + L자 소파 + 좌탁)
  { key: 'mantel', x: 31, y: 4, on: true },
  { key: 'fireplace', x: 32, y: 5 },
  { key: 'cabinet', x: 29, y: 4 }, { key: 'cabinet', x: 38, y: 4 },
  { key: 'plant_pot', x: 31, y: 10 }, { key: 'plant_pot', x: 38, y: 10 },
  { key: 'plant_pot', x: 39, y: 8 }, { key: 'plant_pot', x: 29, y: 10 },
  { key: 'sofa_long', x: 30, y: 12 },
  { key: 'sofa_side', x: 36, y: 15 },
  { key: 'coffee_table', x: 30, y: 17 },
  { key: 'plant_pot', x: 31, y: 18, on: true },
  { key: 'side_table', x: 34, y: 22 },
  { key: 'lamp', x: 39, y: 21 },
  { key: 'plant_pot', x: 39, y: 17 },

  // ══ 식당 x9..27 y17..36 ══ (참조: 큰 식탁 + 의자 6 + 앉는 자리)
  { key: 'dining_table', x: 15, y: 21 },
  { key: 'chair_up', x: 16, y: 19 }, { key: 'chair_up', x: 19, y: 19 },
  { key: 'chair_down', x: 16, y: 28 }, { key: 'chair_down', x: 19, y: 28 },
  { key: 'chair_left', x: 13, y: 23 }, { key: 'chair_right', x: 23, y: 23 },
  { key: 'armchair', x: 11, y: 31 }, { key: 'armchair', x: 15, y: 31 },
  { key: 'side_table', x: 19, y: 32 },
  { key: 'lamp', x: 21, y: 32 },
  { key: 'plant_pot', x: 11, y: 18 }, { key: 'plant_pot', x: 10, y: 27 },
  { key: 'plant_pot', x: 20, y: 34 }, { key: 'plant_pot', x: 24, y: 33 },
  { key: 'cabinet', x: 9, y: 18 },
  { key: 'plant_pot', x: 26, y: 25 }, { key: 'plant_pot', x: 25, y: 19 }, { key: 'side_table', x: 24, y: 21 },
  { key: 'plant_pot', x: 10, y: 25 }, { key: 'armchair', x: 9, y: 22 },

  // ══ 서재 x29..39 y26..36 ══ (참조: 책장 벽 + 책상 + 의자)
  { key: 'bookshelf', x: 29, y: 26 },
  { key: 'desk', x: 31, y: 32 },
  { key: 'books', x: 33, y: 32, on: true },
  { key: 'lamp', x: 36, y: 32, on: true },
  { key: 'chair_up', x: 33, y: 30 },
  { key: 'chair_up', x: 38, y: 30 },
  { key: 'plant_pot', x: 29, y: 30 }, { key: 'plant_pot', x: 39, y: 26 },
  { key: 'plant_pot', x: 38, y: 35 },

  // ══ 복도·현관 ══
  { key: 'plant_pot', x: 21, y: 35 }, { key: 'plant_pot', x: 26, y: 35 },
  { key: 'baskets', x: 26, y: 14 },

  // ══ 데크 x2..7 y9..19 ══ (참조: 파라솔 + 둥근 탁자 + 의자)
  { key: 'parasol', x: 2, y: 12 },
  { key: 'stool', x: 2, y: 10 }, { key: 'stool', x: 6, y: 10 },
  { key: 'plant_pot', x: 7, y: 19 },

  // ══ 운동장 x1..7 y26..37 ══
  { key: 'weight_rack', x: 1, y: 26 },
  { key: 'punch_bag', x: 5, y: 27 },
  { key: 'dumbbells', x: 2, y: 31 },
  { key: 'exercise_mat', x: 4, y: 32 },

  // ══ 헛간 x42..45 y6..13 ══
  { key: 'boxes', x: 42, y: 6 }, { key: 'boxes', x: 44, y: 6 },
  { key: 'baskets', x: 42, y: 10 }, { key: 'garden_tools', x: 45, y: 10 },

  // ══ 텃밭 x41..46 y25..38 ══ (참조: 나무 두둑 넷)
  { key: 'veg_bed', x: 41, y: 26 }, { key: 'veg_bed', x: 44, y: 26 },
  { key: 'veg_bed', x: 41, y: 34 }, { key: 'veg_bed', x: 44, y: 34 },
  { key: 'watering_can', x: 46, y: 32 },

  // ══ 뜰 ══
  { key: 'tree', x: 2, y: 2 }, { key: 'tree', x: 43, y: 2 },
  { key: 'tree', x: 2, y: 40 }, { key: 'tree', x: 44, y: 40 },
  { key: 'tree', x: 5, y: 21 },
  { key: 'bush', x: 5, y: 6 },
  { key: 'bush', x: 2, y: 22 }, { key: 'bush', x: 43, y: 17 },
  { key: 'bush', x: 9, y: 39 }, { key: 'bush', x: 14, y: 39 },
  { key: 'bush', x: 30, y: 39 }, { key: 'bush', x: 36, y: 39 },
  { key: 'flower_bed', x: 18, y: 39 }, { key: 'flower_bed', x: 27, y: 39 },
  { key: 'flower_bed', x: 33, y: 39 }, { key: 'flower_bed', x: 6, y: 39 },
  { key: 'mailbox', x: 28, y: 41 },
];

// 울타리 안쪽 산울타리 — 참조 그림에서 뜰 가장자리를 채우고 있다.
// 이미 무언가 놓인 칸과 뜰이 아닌 칸은 건너뛴다.
function hedgeRing(base) {
  const taken = new Set();
  for (const p of base) {
    const [cw, ch] = sizeOf(p.key);
    for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) taken.add((p.y + j) * W + (p.x + i));
  }
  const free = (x, y) => {
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
      if (at(x + i, y + j) !== '.' || taken.has((y + j) * W + (x + i))) return false;
    }
    return true;
  };
  const out = [];
  const push = (x, y) => {
    if (!free(x, y)) return;
    out.push({ key: 'hedge', x, y });
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) taken.add((y + j) * W + (x + i));
  };
  for (let x = 2; x <= 44; x += 3) { push(x, 2); push(x, 41); }
  for (let y = 4; y <= 40; y += 3) { push(1, y); push(45, y); }
  return out;
}


// 벽에 붙는 것 — 창문·그림은 벽 칸 위에 그려진다
export const ONWALL = [
  { key: 'window', x: 13, y: 3 }, { key: 'window', x: 17, y: 3 },
  { key: 'window', x: 24, y: 3 }, { key: 'window', x: 31, y: 3 }, { key: 'window', x: 36, y: 3 },
  { key: 'window', x: 8, y: 6 }, { key: 'window', x: 8, y: 20 }, { key: 'window', x: 8, y: 30 },
  { key: 'window', x: 40, y: 8 }, { key: 'window', x: 40, y: 22 }, { key: 'window', x: 40, y: 28 },
  { key: 'window', x: 13, y: 37 }, { key: 'window', x: 18, y: 37 },
  { key: 'window', x: 31, y: 37 }, { key: 'window', x: 36, y: 37 },
  { key: 'painting', x: 34, y: 3 }, { key: 'painting', x: 8, y: 24 }, { key: 'painting', x: 28, y: 24 },
];

// ── 서 있는 자리 ────────────────────────────────────────────
export const SPOT = {
  sgn_haru:  { room: '부엌', x: 12, y: 9 },
  sgn_mina:  { room: '서재', x: 30, y: 34 },
  sgn_coco:  { room: '텃밭', x: 43, y: 31 },
  sgn_lulu:  { room: '거실', x: 31, y: 23 },
  sgn_peach: { room: '데크', x: 4, y: 19 },
  sgn_ruby:  { room: '식당', x: 24, y: 26 },
  player:    { room: '복도', x: 24, y: 15 },
};

// 이야기가 걸리는 자리 — 걸어 닿는지 검사한다.
export const LANDMARKS = [
  { name: '냉장고', x: 12, y: 10 }, { name: '식탁', x: 23, y: 25 }, { name: '난로', x: 34, y: 11 },
  { name: '서재 책상', x: 30, y: 36 }, { name: '책장', x: 34, y: 29 }, { name: '현관', x: 24, y: 36 },
  { name: '데크', x: 4, y: 19 }, { name: '운동장', x: 4, y: 36 }, { name: '텃밭', x: 43, y: 31 },
  { name: '헛간', x: 43, y: 9 }, { name: '아일랜드', x: 16, y: 16 }, { name: '소파', x: 33, y: 16 },
];

// ── 크기 (칸) ───────────────────────────────────────────────
// 참조 그림에서 잰 비중 그대로다. 큰 가구는 크게 둔다.
export const SIZE = {
  fridge: [3, 5], counter: [5, 2], stove: [3, 4], kitchen_island: [7, 3], wall_shelf: [4, 1],
  dining_table: [8, 7], chair_up: [2, 2], chair_down: [2, 2], chair_left: [2, 2], chair_right: [2, 2],
  stool: [1, 1], fireplace: [6, 5], mantel: [8, 1], sofa_long: [8, 3], sofa_side: [3, 9],
  armchair: [3, 3], coffee_table: [5, 5], side_table: [2, 2], lamp: [1, 2], cabinet: [2, 3],
  bookshelf: [10, 3], desk: [7, 4], bathtub: [4, 3], toilet: [2, 3], bath_sink: [2, 2],
  parasol: [6, 6], exercise_mat: [3, 5], weight_rack: [3, 5], punch_bag: [2, 4], dumbbells: [2, 2],
  veg_bed: [2, 5], garden_tools: [1, 2], tree: [3, 3], bush: [2, 2], hedge: [2, 2],
  flower_bed: [3, 1], boxes: [2, 2], baskets: [2, 1], plant_pot: [1, 2], mailbox: [1, 2],
  books: [2, 1], watering_can: [1, 1], fruit_bowl: [1, 1], empty_plate: [1, 1], sink: [2, 1],
  window: [2, 1], painting: [2, 1],
};
export const sizeOf = key => SIZE[key] || [1, 1];

export const PROPS = [...PROPS_BASE, ...hedgeRing(PROPS_BASE)];

// 길을 막지 않는 것
export const PASSABLE = new Set([
  'exercise_mat', 'plant_pot', 'flower_bed', 'watering_can', 'baskets', 'hedge',
  'window', 'painting', 'mantel', 'wall_shelf', 'mailbox',
  'cheesecake', 'empty_plate', 'fruit_bowl', 'sink', 'books', 'note', 'diary',
]);

export function buildBlocked() {
  const b = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
    b[y * W + x] = (isWall(x, y) || (isRoad(x, y) && y !== 44)) ? 1 : 0;
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
