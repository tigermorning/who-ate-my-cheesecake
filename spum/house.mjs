// Who Ate My Cheesecake? — 집 도면.
//
// 참조 그림 docs/reference-house.png (1375×1144, 비 1.202) 를 격자로 옮긴 것이다.
// 44×36 격자 · 한 칸 32px → 1408×1152. 그림 한 칸이 대략 31px 이라 1:1 로 대응한다.
//
//   그림 좌표 → 칸 = round(px / 31.25)
//   집 바깥벽   x 290..1130 → x 9..36      y 90..930 → y 3..29
//   부엌        x 300..600  → x 10..18     y 100..410 → y 4..12
//   욕실        x 610..780  → x 20..25     y 100..320 → y 4..11
//   거실        x 790..1130 → x 27..35     y 100..620 → y 4..19
//   식당(대청)  x 300..780  → x 10..25     y 420..870 → y 13..28
//   서재        x 790..1130 → x 27..35     y 630..930 → y 21..28
//   현관        x 640..760  → x 21..25     y 840..930 → y 26..28
//
//   #  벽·울타리   .  뜰       ,  돌길      +  문
//   K  부엌        D  식당     B  욕실      L  거실      S  서재      C  현관
//   W  데크        Y  운동장   V  텃밭      H  헛간
//
// 도면을 고치면 `node spum/houseplan.mjs` 로 검사하고,
// `node spum/buildtheme.mjs && node spum/buildmap.mjs > spum/house-map.json` 으로 다시 굽는다.

export const W = 44, H = 36;

// ── 도면을 사각형으로 칠한다 ────────────────────────────────
const g = Array.from({ length: H }, () => new Array(W).fill('.'));
const box = (x1, y1, x2, y2, ch) => {
  for (let y = Math.max(0, y1); y <= Math.min(H - 1, y2); y++)
    for (let x = Math.max(0, x1); x <= Math.min(W - 1, x2); x++) g[y][x] = ch;
};

box(0, 0, W - 1, 0, '#'); box(0, H - 1, W - 1, H - 1, '#');      // 울타리
box(0, 0, 0, H - 1, '#'); box(W - 1, 0, W - 1, H - 1, '#');

box(9, 3, 36, 29, '#');                                          // 집을 통째로 벽으로 채우고
box(10, 4, 18, 12, 'K');                                         // 방을 파낸다
box(20, 4, 25, 11, 'B');
box(27, 4, 35, 19, 'L');
box(10, 13, 25, 28, 'D');
box(15, 13, 18, 13, 'D');                                        // 부엌은 식당 쪽으로 트여 있다
box(15, 12, 18, 12, 'K');
box(27, 21, 35, 28, 'S');
box(21, 26, 25, 28, 'C');                                        // 현관
box(20, 26, 20, 28, '#');                                        // 현관 왼쪽 벽

box(22, 29, 23, 29, '+');                                        // 현관문
box(22, 12, 22, 12, '+');                                        // 욕실 문
box(26, 17, 26, 17, '+');                                        // 식당 ↔ 거실
box(26, 27, 26, 27, '+');                                        // 현관 ↔ 서재
box(31, 20, 31, 20, '+');                                        // 거실 ↔ 서재
box(9, 8, 9, 8, '+');                                            // 데크로 나가는 문
box(36, 15, 36, 15, '+');                                        // 뜰로 나가는 문
box(20, 27, 20, 27, '+');                                        // 현관 ↔ 식당

box(3, 7, 8, 16, 'W');                                           // 데크
box(2, 21, 8, 28, 'Y');                                          // 운동장
box(38, 21, 42, 28, 'V');                                        // 텃밭
box(37, 4, 42, 12, '#'); box(38, 5, 42, 11, 'H');                // 헛간
box(39, 12, 39, 12, '+');

box(37, 13, 37, 20, ',');                                        // 옆길
box(22, 30, 23, 34, ',');                                        // 앞길
box(22, 35, 23, 35, '+');                                        // 대문

export const GRID = g.map(r => r.join(''));

// 글자 → 방 이름. 뜰의 자리들도 이름이 있다 — 알리바이가 걸리는 곳이기 때문이다.
const OF = {
  K: '부엌', D: '식당', B: '욕실', L: '거실', S: '서재', C: '복도',
  W: '데크', Y: '운동장', V: '텃밭', H: '헛간',
};
export const INDOOR = new Set(['부엌', '식당', '욕실', '거실', '서재', '복도']);

// 글자 → 바닥 SMO 키
const FLOOR = {
  K: 'stone_floor', D: 'wood_floor', B: 'tile_floor', L: 'wood_floor', S: 'wood_floor',
  C: 'stone_floor', '+': 'wood_floor', W: 'deck_wood', Y: 'gym_floor', V: 'garden_soil',
  H: 'shed_floor', '.': 'grass', ',': 'stone_path', '#': 'grass',
};

export const at = (x, y) => (y < 0 || y >= H || x < 0 || x >= W) ? '#' : GRID[y][x];
export const isDoor = (x, y) => at(x, y) === '+';
export const isWall = (x, y) => at(x, y) === '#';
export const isYard = (x, y) => { const c = at(x, y); return c === '.' || c === ','; };
export const isFence = (x, y) => isWall(x, y) && (x === 0 || y === 0 || x === W - 1 || y === H - 1);
export const floorOf = (x, y) => FLOOR[at(x, y)] || 'grass';

export function roomOf(x, y) {
  const c = at(x, y);
  if (OF[c]) return OF[c];
  if (c === ',') return '현관앞';
  if (c === '+') {
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const r = OF[at(x + dx, y + dy)]; if (r) return r;
    }
  }
  return null;
}

// 방 이름표 자리 — Studio 맵 주석에만 쓴다. 게임 화면에는 찍지 않는다.
export const ZONES = [
  { name: '부엌', x: 14, y: 8 }, { name: '식당', x: 17, y: 23 }, { name: '욕실', x: 22, y: 8 },
  { name: '거실', x: 31, y: 16 }, { name: '서재', x: 31, y: 24 }, { name: '복도', x: 23, y: 27 },
  { name: '데크', x: 5, y: 14 }, { name: '운동장', x: 5, y: 27 },
  { name: '텃밭', x: 40, y: 24 }, { name: '헛간', x: 40, y: 8 }, { name: '현관', x: 22, y: 32 },
];

// 바닥을 덮어쓰는 자리 (돌길·꽃밭)
export const PATCH = [
  [1, 1, 42, 2, 'grass_flower'],
  [1, 30, 20, 32, 'grass_flower'], [25, 30, 42, 32, 'grass_flower'],
  [37, 13, 37, 20, 'stone_path'],
];

// 깔개 — 방 안에만 깔린다
export const RUGS = [
  [11, 15, 19, 21, 'rug_warm'],            // 식탁 밑
  [10, 24, 18, 28, 'rug_cool'],            // 식당 앉는 자리
  [28, 8, 34, 14, 'rug_warm'],             // 난로 앞
  [28, 24, 34, 28, 'rug_cool'],            // 서재
  [21, 26, 25, 28, 'rug_warm'],            // 현관
  [10, 8, 11, 12, 'rug_warm'],             // 부엌 발치
];

// ── 놓인 것 ─────────────────────────────────────────────────
// {key, x, y} — (x,y) 는 왼쪽 위 칸. 크기는 smo.json 의 size 를 따른다.
// on:true 는 가구 위에 얹히는 것 — 길을 막지 않고 겹쳐도 된다.
export const PROPS = [
  // ══ 부엌 x10..18 y4..12 ══
  { key: 'fridge', x: 10, y: 4 },                     // 크다. 사건의 중심이다
  { key: 'counter', x: 13, y: 4 },
  { key: 'sink_counter', x: 16, y: 4 },
  { key: 'stove', x: 13, y: 5 },
  { key: 'cupboard', x: 16, y: 5 },
  { key: 'kitchen_island', x: 12, y: 8 },
  { key: 'cooking_pot', x: 14, y: 5, on: true },
  { key: 'plates', x: 13, y: 8, on: true },
  { key: 'empty_plate', x: 15, y: 8, on: true },      // 아침에 발견된 빈 접시
  { key: 'chair_up', x: 12, y: 11 }, { key: 'chair_up', x: 14, y: 11 }, { key: 'chair_up', x: 16, y: 11 },
  { key: 'plant_pot', x: 18, y: 8 },
  { key: 'plant_pot', x: 10, y: 12 },

  // ══ 욕실 x20..25 y4..11 ══
  { key: 'bathtub', x: 20, y: 4 },
  { key: 'toilet', x: 25, y: 4 },
  { key: 'bath_sink', x: 20, y: 7 },
  { key: 'bath_cabinet', x: 25, y: 7 },
  { key: 'plant_pot', x: 24, y: 10 },

  // ══ 거실 x27..35 y4..19 ══
  { key: 'hearth', x: 29, y: 4 },                     // 크고 단단한 난로
  { key: 'cabinet', x: 27, y: 4 }, { key: 'cabinet', x: 35, y: 4 },
  { key: 'plant_pot', x: 28, y: 7 }, { key: 'plant_pot', x: 34, y: 7 },
  { key: 'sofa_long', x: 28, y: 9 },
  { key: 'sofa_side', x: 34, y: 9 },
  { key: 'coffee_table', x: 29, y: 12 },
  { key: 'armchair', x: 27, y: 15 },
  { key: 'side_table', x: 33, y: 15 },
  { key: 'lamp', x: 27, y: 18 },
  { key: 'shelf', x: 32, y: 18 },

  // ══ 식당(대청) x10..25 y13..28 ══
  { key: 'cabinet', x: 10, y: 14 },
  { key: 'shelf', x: 23, y: 13 },
  { key: 'dining_table', x: 12, y: 16 },
  { key: 'chair_up', x: 13, y: 15 }, { key: 'chair_up', x: 15, y: 15 }, { key: 'chair_up', x: 17, y: 15 },
  { key: 'chair_down', x: 13, y: 21 }, { key: 'chair_down', x: 15, y: 21 }, { key: 'chair_down', x: 17, y: 21 },
  { key: 'chair_left', x: 11, y: 18 }, { key: 'chair_right', x: 19, y: 18 },
  { key: 'armchair', x: 10, y: 24 }, { key: 'armchair', x: 14, y: 24 },
  { key: 'coffee_table', x: 11, y: 27 },
  { key: 'lamp', x: 17, y: 26 },
  { key: 'plant_pot', x: 21, y: 14 }, { key: 'plant_pot', x: 24, y: 24 }, { key: 'plant_pot', x: 10, y: 22 },
  { key: 'side_table', x: 23, y: 18 },
  { key: 'armchair', x: 21, y: 16 }, { key: 'armchair', x: 23, y: 15 },
  { key: 'cabinet', x: 25, y: 14 }, { key: 'lamp', x: 21, y: 20 },
  { key: 'plant_pot', x: 25, y: 18 },
  { key: 'side_table', x: 23, y: 22 },

  // ══ 현관 x21..25 y26..28 ══
  { key: 'plant_pot', x: 21, y: 26 }, { key: 'plant_pot', x: 25, y: 28 },
  { key: 'baskets', x: 25, y: 26 },

  // ══ 서재 x27..35 y21..28 ══
  { key: 'bookshelf_large', x: 27, y: 21 }, { key: 'bookshelf_large', x: 33, y: 21 },
  { key: 'bookshelf_large', x: 27, y: 23 }, { key: 'bookshelf_large', x: 33, y: 23 },
  { key: 'desk', x: 28, y: 26 },
  { key: 'books', x: 30, y: 26, on: true },
  { key: 'armchair', x: 34, y: 25 },
  { key: 'lamp', x: 35, y: 27 },
  { key: 'plant_pot', x: 27, y: 28 },

  // ══ 데크 x3..8 y7..16 ══
  { key: 'patio_set', x: 3, y: 8 },
  { key: 'deck_chair', x: 8, y: 14 }, { key: 'deck_chair', x: 3, y: 15 },
  { key: 'plant_pot', x: 8, y: 7 },

  // ══ 운동장 x2..8 y21..28 ══
  { key: 'dumbbell_rack', x: 2, y: 21 },
  { key: 'weight_bench', x: 2, y: 22 },
  { key: 'gym_machine', x: 6, y: 21 },
  { key: 'exercise_mat', x: 2, y: 25 },

  // ══ 텃밭 x38..42 y21..28 ══
  { key: 'veg_bed', x: 38, y: 21 }, { key: 'veg_bed', x: 38, y: 25 },
  { key: 'garden_tools', x: 42, y: 21 },
  { key: 'watering_can', x: 42, y: 25 },

  // ══ 헛간 x38..42 y5..11 ══
  { key: 'boxes', x: 38, y: 6 }, { key: 'boxes', x: 40, y: 6 },
  { key: 'baskets', x: 39, y: 9 }, { key: 'baskets', x: 41, y: 9 },
  { key: 'garden_tools', x: 42, y: 6 },

  // ══ 뜰 ══
  { key: 'tree', x: 1, y: 3 }, { key: 'tree', x: 5, y: 3 },
  { key: 'tree', x: 1, y: 17 }, { key: 'tree', x: 38, y: 15 },
  { key: 'tree', x: 2, y: 30 }, { key: 'tree', x: 7, y: 30 }, { key: 'tree', x: 12, y: 30 },
  { key: 'tree', x: 27, y: 30 }, { key: 'tree', x: 32, y: 30 }, { key: 'tree', x: 38, y: 30 },
  { key: 'bush', x: 5, y: 19 }, { key: 'bush', x: 8, y: 19 }, { key: 'bush', x: 40, y: 18 },
  { key: 'bush', x: 17, y: 33 }, { key: 'bush', x: 26, y: 33 }, { key: 'bush', x: 36, y: 33 },
  { key: 'flower_bed', x: 15, y: 30 }, { key: 'flower_bed', x: 18, y: 30 },
  { key: 'flower_bed', x: 25, y: 30 }, { key: 'flower_bed', x: 30, y: 33 },
  { key: 'flower_bed', x: 35, y: 30 }, { key: 'flower_bed', x: 10, y: 33 },
  { key: 'flower_bed', x: 4, y: 1 }, { key: 'flower_bed', x: 30, y: 1 },
  { key: 'mailbox', x: 25, y: 33 },
];

// 벽에 붙는 것 — 창문은 벽 칸 위에 그려진다
export const ONWALL = [
  { key: 'window', x: 13, y: 3 }, { key: 'window', x: 16, y: 3 },
  { key: 'window', x: 22, y: 3 }, { key: 'window', x: 30, y: 3 }, { key: 'window', x: 33, y: 3 },
  { key: 'window', x: 9, y: 6 }, { key: 'window', x: 9, y: 11 }, { key: 'window', x: 9, y: 17 },
  { key: 'window', x: 9, y: 22 }, { key: 'window', x: 9, y: 26 },
  { key: 'window', x: 36, y: 6 }, { key: 'window', x: 36, y: 11 }, { key: 'window', x: 36, y: 18 },
  { key: 'window', x: 36, y: 23 }, { key: 'window', x: 36, y: 27 },
  { key: 'window', x: 12, y: 29 }, { key: 'window', x: 16, y: 29 },
  { key: 'window', x: 28, y: 29 }, { key: 'window', x: 32, y: 29 },
  { key: 'mirror', x: 20, y: 3 },
  { key: 'gate', x: 21, y: 35 }, { key: 'gate', x: 24, y: 35 },
];

// ── 서 있는 자리 ────────────────────────────────────────────
export const SPOT = {
  sgn_haru:  { room: '부엌', x: 11, y: 9 },
  sgn_mina:  { room: '서재', x: 33, y: 27 },
  sgn_coco:  { room: '텃밭', x: 40, y: 24 },
  sgn_lulu:  { room: '거실', x: 31, y: 16 },
  sgn_peach: { room: '데크', x: 6, y: 14 },
  sgn_ruby:  { room: '식당', x: 21, y: 19 },
  player:    { room: '복도', x: 23, y: 27 },
};

// 이야기가 걸리는 자리 — 냉장고·난로·책상 …. 검사에서 걸어 닿는지 확인한다.
export const LANDMARKS = [
  { name: '냉장고', x: 11, y: 8 }, { name: '식탁', x: 15, y: 22 }, { name: '난로', x: 31, y: 8 },
  { name: '서재 책상', x: 30, y: 25 }, { name: '책장', x: 30, y: 23 }, { name: '현관', x: 23, y: 28 },
  { name: '데크', x: 6, y: 14 }, { name: '운동장', x: 4, y: 27 }, { name: '텃밭', x: 40, y: 24 },
  { name: '헛간', x: 40, y: 8 },
];

// ── 막힌 칸 ─────────────────────────────────────────────────
// smo.json 을 읽지 않고도 크기를 알아야 해서, 여기 한 벌 적어 둔다.
// 큰 가구는 참조 그림의 비중에 맞춰 키웠다 — 식탁 7×5, 난로 5×3, 소파 6×2 …
export const SIZE = {
  fridge: [3, 4], stove: [3, 2], sink_counter: [3, 1], counter: [3, 1], kitchen_island: [5, 3],
  cupboard: [3, 2], dining_table: [7, 5], hearth: [5, 3], sofa_long: [6, 2], sofa_side: [2, 5],
  armchair: [2, 2], coffee_table: [4, 2], shelf: [3, 1], cabinet: [1, 2], lamp: [1, 2],
  bookshelf_large: [3, 2], desk: [5, 3], bathtub: [4, 2], toilet: [1, 2], bath_cabinet: [1, 2],
  patio_set: [5, 5], exercise_mat: [5, 3], weight_bench: [4, 2], dumbbell_rack: [2, 1],
  gym_machine: [3, 4], veg_bed: [4, 3], garden_tools: [1, 2], tree: [3, 3], flower_bed: [2, 1],
};
export const sizeOf = key => SIZE[key] || [1, 1];

// 길을 막지 않는 것
export const PASSABLE = new Set([
  'exercise_mat', 'plant_pot', 'bush', 'flower_bed', 'watering_can', 'baskets',
  'window', 'mirror', 'gate', 'cheesecake', 'empty_plate', 'plates', 'cooking_pot',
  'books', 'note', 'diary',
]);

export function buildBlocked() {
  const b = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) b[y * W + x] = isWall(x, y) ? 1 : 0;
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
