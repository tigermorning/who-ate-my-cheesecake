// Who Ate My Cheesecake? — 집 도면.
//
// 도면은 아래 GRID 한 장이다. 한 글자가 한 칸(화면 24px). 40×30 = 960×720.
// play.html 이 그리고, buildmap.mjs 가 SPUM Studio 맵으로 뽑고, houseplan.mjs 가 검사한다.
// 놓이는 것은 전부 SPUM 오브젝트(SMO) 다 — spum/smo.json, spum/buildsmo.mjs 참고.
//
//   #  벽·울타리   .  뜰       ,  돌길      +  문
//   K  부엌        D  식당     B  욕실      L  거실      S  서재      C  복도
//   W  데크        Y  운동장   V  텃밭      H  헛간
//
// 단층집 하나. 방들이 지붕 하나 아래 이어져 있고, 복도가 현관·거실·서재를 잇는다.
// 도면을 고칠 때: GRID 를 고치고 `node spum/houseplan.mjs` 를 돌린다.

export const GRID = [
// 0         1         2         3
// 0123456789012345678901234567890123456789
  '########################################', //  0
  '#......................................#', //  1
  '#......................................#', //  2
  '#.......########################.......#', //  3
  '#.......#KKKKKKKK#BBBB#LLLLLLLL#.......#', //  4
  '#.......#KKKKKKKK#BBBB#LLLLLLLL#########', //  5
  '#.......#KKKKKKKK#BBBB#LLLLLLLL##HHHHH##', //  6
  '#.......#KKKKKKKK#BBBB#LLLLLLLL##HHHHH##', //  7
  '#.......#KKKKKKKK#BBBB#LLLLLLLL##HHHHH##', //  8
  '#.......#KKKKKKKK#BBBB#LLLLLLLL##HHHHH##', //  9
  '#.WWWWWW#KKKKKKKK###+##LLLLLLLL####+####', // 10
  '#.WWWWWW#KKKKKKKK+LLLLLLLLLLLLL#.......#', // 11
  '#.WWWWWW#DDDDDDDD#LLLLLLLLLLLLL#.......#', // 12
  '#.WWWWWW#DDDDDDDD#LLLLLLLLLLLLL#.......#', // 13
  '#.WWWWWW#DDDDDDDD+LLLLLLLLLLLLL#.......#', // 14
  '#.WWWWWW#DDDDDDDD#LLLLLLLLLLLLL#VVVVVV.#', // 15
  '#.WWWWWW#DDDDDDDD#LLLLLLLLLLLLL#VVVVVV.#', // 16
  '#.WWWWWW#DDDDDDDD#LLLLLLLLLLLLL#VVVVVV.#', // 17
  '#.WWWWWW#DDDDDDDD#CCCC##########VVVVVV.#', // 18
  '#.YYYYYY#DDDDDDDD#CCCC#SSSSSSSS#VVVVVV.#', // 19
  '#.YYYYYY#DDDDDDDD+CCCC#SSSSSSSS#VVVVVV.#', // 20
  '#.YYYYYY#DDDDDDDD#CCCC#SSSSSSSS#VVVVVV.#', // 21
  '#.YYYYYY#DDDDDDDD#CCCC+SSSSSSSS#VVVVVV.#', // 22
  '#.YYYYYY#DDDDDDDD#CCCC#SSSSSSSS#VVVVVV.#', // 23
  '#.YYYYYY#DDDDDDDD#CCCC#SSSSSSSS#VVVVVV.#', // 24
  '#.YYYYYY#DDDDDDDD#CCCC#SSSSSSSS#VVVVVV.#', // 25
  '#.......############+###########.......#', // 26
  '#..................,,,.................#', // 27
  '#..................,,,.................#', // 28
  '###################,,,##################', // 29
];

export const W = GRID[0].length, H = GRID.length;

// 글자 → 방 이름. 뜰의 자리들도 이름이 있다 — 알리바이가 걸리는 곳이기 때문이다.
const OF = {
  K: '부엌', D: '식당', B: '욕실', L: '거실', S: '서재', C: '복도',
  W: '데크', Y: '운동장', V: '텃밭', H: '헛간',
};
export const INDOOR = new Set(['부엌', '식당', '욕실', '거실', '서재', '복도']);

// 글자 → 바닥 SMO 키
const FLOOR = {
  K: 'stone_floor', D: 'wood_floor', B: 'tile_floor', L: 'wood_floor', S: 'wood_floor',
  C: 'wood_floor', '+': 'wood_floor', W: 'deck_wood', Y: 'gym_floor', V: 'garden_soil',
  H: 'shed_floor', '.': 'grass', ',': 'stone_path', '#': 'grass',
};

export const at = (x, y) => (y < 0 || y >= H || x < 0 || x >= W) ? '#' : GRID[y][x];
export const isDoor = (x, y) => at(x, y) === '+';
export const isWall = (x, y) => at(x, y) === '#';
export const isYard = (x, y) => { const c = at(x, y); return c === '.' || c === ','; };
// 바깥 테두리는 울타리, 나머지 '#' 은 집 벽
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

// 화면에 찍히는 자리 이름표
export const ZONES = [
  { name: '부엌', x: 12, y: 7 }, { name: '식당', x: 12, y: 19 }, { name: '욕실', x: 19, y: 6 },
  { name: '거실', x: 26, y: 14 }, { name: '서재', x: 26, y: 21 }, { name: '복도', x: 19, y: 22 },
  { name: '데크', x: 4, y: 16 }, { name: '운동장', x: 4, y: 24 },
  { name: '텃밭', x: 34, y: 24 }, { name: '헛간', x: 35, y: 8 }, { name: '현관', x: 20, y: 28 },
];

// 바닥을 덮어쓰는 자리 (돌길·꽃밭)
export const PATCH = [
  [34, 15, 35, 25, 'stone_path'],          // 텃밭 사이 징검돌
  [1, 26, 7, 28, 'grass_flower'], [32, 26, 38, 28, 'grass_flower'],
  [1, 1, 38, 2, 'grass_flower'],
];

// 깔개 — 방 안에만 깔린다
export const RUGS = [
  [10, 13, 15, 17, 'rug_warm'],            // 식탁 밑
  [9, 20, 15, 23, 'rug_cool'],             // 식당 쪽 앉는 자리
  [23, 7, 30, 13, 'rug_warm'],             // 난로 앞
  [24, 22, 29, 25, 'rug_cool'],            // 서재
  [19, 19, 21, 25, 'rug_warm'],            // 현관에서 거실로 가는 길
  [11, 5, 15, 6, 'rug_warm'],              // 부엌 발치
];

// ── 놓인 것 ─────────────────────────────────────────────────
// {key, x, y} — (x,y) 는 왼쪽 위 칸. 크기는 smo.json 의 size 를 따른다.
// on:true 는 가구 위에 얹히는 것 — 길을 막지 않고 겹쳐도 된다.
export const PROPS = [
  // ══ 부엌 x9..16 y4..11 ══
  { key: 'fridge', x: 9, y: 4 },                      // 크다. 사건의 중심이다
  { key: 'counter', x: 11, y: 4 },
  { key: 'sink_counter', x: 13, y: 4 },
  { key: 'stove', x: 15, y: 4 },
  { key: 'cupboard', x: 9, y: 7 },
  { key: 'kitchen_island', x: 11, y: 8 },
  { key: 'cooking_pot', x: 15, y: 4, on: true },
  { key: 'plates', x: 12, y: 8, on: true },
  { key: 'empty_plate', x: 13, y: 8, on: true },      // 아침에 발견된 빈 접시
  { key: 'chair_up', x: 11, y: 10 }, { key: 'chair_up', x: 13, y: 10 },
  { key: 'plant_pot', x: 16, y: 7 },
  { key: 'boxes', x: 16, y: 10 },
  { key: 'plant_pot', x: 9, y: 11 },

  // ══ 식당 x9..16 y12..25 ══
  { key: 'shelf', x: 9, y: 12 },
  { key: 'cupboard', x: 15, y: 12 },
  { key: 'dining_table', x: 11, y: 14 },
  { key: 'chair_up', x: 11, y: 13 }, { key: 'chair_up', x: 13, y: 13 },
  { key: 'chair_down', x: 11, y: 17 }, { key: 'chair_down', x: 13, y: 17 },
  { key: 'chair_left', x: 10, y: 15 }, { key: 'chair_right', x: 15, y: 15 },
  { key: 'plant_pot', x: 12, y: 15, on: true },       // 식탁 한가운데
  { key: 'plates', x: 14, y: 15, on: true },
  { key: 'shelf', x: 9, y: 19 },
  { key: 'plant_pot', x: 15, y: 18 },
  { key: 'armchair', x: 9, y: 21 }, { key: 'armchair', x: 9, y: 24 },
  { key: 'coffee_table', x: 11, y: 21 },
  { key: 'books', x: 12, y: 21, on: true },
  { key: 'armchair', x: 14, y: 21 },
  { key: 'side_table', x: 13, y: 24 },
  { key: 'lamp', x: 15, y: 24 },
  { key: 'plant_pot', x: 11, y: 24 },

  // ══ 욕실 x18..21 y4..9 ══
  { key: 'bathtub', x: 18, y: 4 },
  { key: 'bath_cabinet', x: 21, y: 4 },
  { key: 'toilet', x: 18, y: 7 },
  { key: 'bath_sink', x: 20, y: 7 },
  { key: 'plant_pot', x: 21, y: 8 },

  // ══ 거실 x23..30 y4..10 + x18..30 y11..17 ══
  { key: 'hearth', x: 26, y: 4 },                     // 크고 단단한 난로
  { key: 'shelf', x: 23, y: 4 },
  { key: 'cabinet', x: 30, y: 4 },
  { key: 'plant_pot', x: 23, y: 6 },
  { key: 'sofa_long', x: 24, y: 8 },
  { key: 'sofa_side', x: 28, y: 8 },                  // ㄱ자로 꺾인다
  { key: 'coffee_table', x: 24, y: 11 },
  { key: 'plant_pot', x: 25, y: 11, on: true },
  { key: 'side_table', x: 23, y: 10 },
  { key: 'lamp', x: 29, y: 16 },
  { key: 'armchair', x: 21, y: 11 },
  { key: 'armchair', x: 28, y: 13 },
  { key: 'side_table', x: 27, y: 13 },
  { key: 'plant_pot', x: 18, y: 11 },
  { key: 'cabinet', x: 18, y: 12 },
  { key: 'side_table', x: 18, y: 16 },
  { key: 'plant_pot', x: 18, y: 17 },
  { key: 'armchair', x: 21, y: 15 },
  { key: 'plant_pot', x: 30, y: 16 },
  { key: 'shelf', x: 23, y: 16 },

  // ══ 서재 x23..30 y19..25 ══
  { key: 'bookshelf_large', x: 23, y: 19 }, { key: 'bookshelf_large', x: 25, y: 19 },
  { key: 'bookshelf_large', x: 27, y: 19 }, { key: 'bookshelf_large', x: 29, y: 19 },
  { key: 'desk', x: 25, y: 22 },
  { key: 'books', x: 25, y: 22, on: true },
  { key: 'note', x: 26, y: 22, on: true },
  { key: 'diary', x: 27, y: 22, on: true },
  { key: 'chair_up', x: 26, y: 24 },
  { key: 'lamp', x: 23, y: 24 },
  { key: 'armchair', x: 29, y: 23 },
  { key: 'plant_pot', x: 24, y: 25 },
  { key: 'plant_pot', x: 30, y: 21 },

  // ══ 복도 x18..21 y18..25 — 비워 둔다 ══
  { key: 'plant_pot', x: 18, y: 19 },
  { key: 'lamp', x: 21, y: 18 },
  { key: 'side_table', x: 18, y: 22 },
  { key: 'note', x: 18, y: 22, on: true },
  { key: 'plant_pot', x: 21, y: 25 },

  // ══ 데크 x2..7 y10..18 ══
  { key: 'patio_set', x: 3, y: 11 },
  { key: 'deck_chair', x: 2, y: 12 }, { key: 'deck_chair', x: 6, y: 12 },
  { key: 'deck_chair', x: 4, y: 10 }, { key: 'deck_chair', x: 4, y: 14 },
  { key: 'plant_pot', x: 2, y: 10 }, { key: 'plant_pot', x: 7, y: 10 },
  { key: 'plant_pot', x: 2, y: 17 }, { key: 'plant_pot', x: 7, y: 17 },
  { key: 'boxes', x: 6, y: 16 },

  // ══ 운동장 x2..7 y19..25 ══
  { key: 'exercise_mat', x: 2, y: 23 },
  { key: 'weight_bench', x: 2, y: 20 },
  { key: 'dumbbell_rack', x: 6, y: 20 },
  { key: 'gym_machine', x: 6, y: 22 },
  { key: 'plant_pot', x: 2, y: 19 },
  { key: 'boxes', x: 7, y: 25 },

  // ══ 텃밭 x32..37 y15..25 ══
  { key: 'veg_bed', x: 32, y: 16 }, { key: 'veg_bed', x: 36, y: 16 },
  { key: 'veg_bed', x: 32, y: 20 }, { key: 'veg_bed', x: 36, y: 20 },
  { key: 'watering_can', x: 33, y: 23 },
  { key: 'garden_tools', x: 37, y: 23 },
  { key: 'plant_pot', x: 32, y: 15 }, { key: 'plant_pot', x: 37, y: 15 },
  { key: 'baskets', x: 32, y: 25 },

  // ══ 헛간 x33..37 y6..9 ══
  { key: 'shelf', x: 33, y: 6 },
  { key: 'garden_tools', x: 37, y: 6 },
  { key: 'boxes', x: 33, y: 8 },
  { key: 'baskets', x: 34, y: 8 },
  { key: 'watering_can', x: 36, y: 8 },

  // ══ 뜰 ══
  { key: 'tree', x: 2, y: 1 }, { key: 'tree', x: 12, y: 1 }, { key: 'tree', x: 20, y: 1 },
  { key: 'tree', x: 28, y: 1 }, { key: 'tree', x: 36, y: 1 },
  { key: 'tree', x: 4, y: 4 }, { key: 'tree', x: 4, y: 7 },
  { key: 'tree', x: 33, y: 12 }, { key: 'tree', x: 36, y: 12 },
  { key: 'tree', x: 3, y: 27 }, { key: 'tree', x: 34, y: 27 },
  { key: 'bush', x: 1, y: 5 }, { key: 'bush', x: 1, y: 9 }, { key: 'bush', x: 1, y: 20 },
  { key: 'bush', x: 32, y: 11 }, { key: 'bush', x: 38, y: 13 }, { key: 'bush', x: 38, y: 20 },
  { key: 'flower_bed', x: 9, y: 27 }, { key: 'flower_bed', x: 12, y: 27 },
  { key: 'flower_bed', x: 15, y: 27 }, { key: 'flower_bed', x: 24, y: 27 },
  { key: 'flower_bed', x: 27, y: 27 }, { key: 'flower_bed', x: 30, y: 27 },
  { key: 'flower_bed', x: 6, y: 2 }, { key: 'flower_bed', x: 24, y: 2 },
  { key: 'mailbox', x: 23, y: 28 },
];

// 벽에 붙는 것 — 창문은 벽 칸 위에 그려진다
export const ONWALL = [
  { key: 'window', x: 11, y: 3 }, { key: 'window', x: 14, y: 3 },
  { key: 'window', x: 25, y: 3 }, { key: 'window', x: 28, y: 3 },
  { key: 'window', x: 19, y: 3 },
  { key: 'window', x: 8, y: 6 }, { key: 'window', x: 8, y: 9 },
  { key: 'window', x: 8, y: 15 }, { key: 'window', x: 8, y: 20 }, { key: 'window', x: 8, y: 23 },
  { key: 'window', x: 31, y: 6 }, { key: 'window', x: 31, y: 13 },
  { key: 'window', x: 31, y: 16 }, { key: 'window', x: 31, y: 21 }, { key: 'window', x: 31, y: 24 },
  { key: 'window', x: 12, y: 26 }, { key: 'window', x: 15, y: 26 },
  { key: 'window', x: 25, y: 26 }, { key: 'window', x: 28, y: 26 },
  { key: 'mirror', x: 22, y: 7 },
  { key: 'gate', x: 18, y: 29 }, { key: 'gate', x: 22, y: 29 },
];

// ── 서 있는 자리 ────────────────────────────────────────────
export const SPOT = {
  sgn_haru:  { room: '부엌', x: 12, y: 8 },
  sgn_mina:  { room: '서재', x: 26, y: 22 },
  sgn_coco:  { room: '텃밭', x: 34, y: 20 },
  sgn_lulu:  { room: '거실', x: 25, y: 10 },
  sgn_peach: { room: '데크', x: 4, y: 13 },
  sgn_ruby:  { room: '식당', x: 12, y: 16 },
  player:    { room: '복도', x: 20, y: 22 },
};

// 이야기가 걸리는 자리 — 냉장고·난로·책상 …. 검사에서 걸어 닿는지 확인한다.
export const LANDMARKS = [
  { name: '냉장고', x: 11, y: 6 }, { name: '식탁', x: 12, y: 18 }, { name: '난로', x: 27, y: 6 },
  { name: '서재 책상', x: 26, y: 21 }, { name: '책장', x: 26, y: 21 }, { name: '현관', x: 20, y: 27 },
  { name: '데크', x: 4, y: 16 }, { name: '운동장', x: 4, y: 22 }, { name: '텃밭', x: 34, y: 18 },
  { name: '헛간', x: 35, y: 7 },
];

// ── 막힌 칸 ─────────────────────────────────────────────────
// smo.json 을 읽지 않고도 크기를 알아야 해서, 여기 한 벌 적어 둔다.
export const SIZE = {
  fridge: [2, 3], stove: [2, 2], sink_counter: [2, 1], counter: [2, 1], kitchen_island: [3, 2],
  cupboard: [2, 2], dining_table: [4, 3], hearth: [4, 2], sofa_long: [4, 2], sofa_side: [2, 3],
  armchair: [2, 2], coffee_table: [3, 2], shelf: [2, 1], cabinet: [1, 2], lamp: [1, 2],
  bookshelf_large: [2, 2], desk: [3, 2], bathtub: [3, 2], toilet: [1, 2], bath_cabinet: [1, 2],
  patio_set: [3, 3], exercise_mat: [3, 2], weight_bench: [3, 2], dumbbell_rack: [2, 1],
  gym_machine: [2, 3], veg_bed: [2, 2], garden_tools: [1, 2], tree: [2, 2], flower_bed: [2, 1],
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
