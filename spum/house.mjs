// Who Ate My Cheesecake? — house map.
//
// 도면은 아래 GRID 한 장이다. 한 글자가 한 칸.
// play.html 이 그리고, buildmap.mjs 가 SPUM Studio 맵으로 뽑고, houseplan.mjs 가 검사한다.
//
//   #  벽        .  집 밖(뜰)      ,  현관 앞 돌길
//   K  부엌      L  거실           S  서재
//   B  침실      G  화원           +  문         C  복도
//
// 비선형 배치: 침실·화원은 윗줄, 부엌·거실·서재는 아랫줄, 복도로 연결.
// 엔진이 아는 방은 다섯뿐이다 — 거실/부엌/침실/화원/서재.
// 도면을 고칠 때: GRID 를 고치고 `node spum/houseplan.mjs` 를 돌린다.

export const GRID = [
// 0         1         2         3
// 0123456789012345678901234567890123456789
  '########################################', // 0
  '#......................................#', // 1
  '#.BBBBBBBBBBBBBB..GGGGGGGGGGGGGGGGGGGG.#', // 2
  '#.BBBBBBBBBBBBBB..GGGGGGGGGGGGGGGGGGGG.#', // 3
  '#.BBBBBBBBBBBBBB..GGGGGGGGGGGGGGGGGGGG.#', // 4
  '#.BBBBBBBBBBBBBB..GGGGGGGGGGGGGGGGGGGG.#', // 5
  '#.BBBBBBBBBBBBBB..GGGGGGGGGGGGGGGGGGGG.#', // 6
  '#.BBBBBBBBBBBBBB..GGGGGGGGGGGGGGGGGGGG.#', // 7
  '#.BBBBBBBBBBBBBB..GGGGGGGGGGGGGGGGGGGG.#', // 8
  '#.BBBBBBBBBBBBBB..GGGGGGGGGGGGGGGGGGGG.#', // 9
  '#........C+C...#.#GGGGGGGGGGGGGGGGGGGG.#', // 10
  '#........CCC...#.#.......C+C...........#', // 11
  '#........CCCCCCC.#.......CCC...........#', // 12
  '#......+......CC.........CCSSSSSSSSSSS.#', // 13
  '#.KKKKKKKKKKKKCCLLLLLLLLLCCSSSSSSSSSSS.#', // 14
  '#.KKKKKKKKKKKKCCLLLLLLLLLCCSSSSSSSSSSS.#', // 15
  '#.KKKKKKKKKKKKCCLLLLLLLLLCCSSSSSSSSSSS.#', // 16
  '#.KKKKKKKKKKK+CCLLLLLLLLLCCSSSSSSSSSSS.#', // 17
  '#.KKKKKKKKKKKKCCLLLLLLLLLCCSSSSSSSSSSS.#', // 18
  '#.KKKKKKKKKKKKC+LLLLLLLLL+CSSSSSSSSSSS.#', // 19
  '#.KKKKKKKKKKKKCCLLLLLLLLLC+SSSSSSSSSSS.#', // 20
  '#.KKKKKKKKKKKKCCLLLLLLLLLCCSSSSSSSSSSS.#', // 21
  '#.KKKKKKKKKKKKCCLLLLLLLLLCCSSSSSSSSSSS.#', // 22
  '#.KKKKKKKKKKK+CCLLLLLLLLLCCSSSSSSSSSSS.#', // 23
  '#.KKKKKKKKKKKKCCLLLLLLLLLCCSSSSSSSSSSS.#', // 24
  '#.KKKKKKKKKKKKCCLLLLLLLLLCCSSSSSSSSSSS.#', // 25
  '#.KKKKKKKKKKKKCCLLLLLLLLLCCSSSSSSSSSSS.#', // 26
  '#.KKKKKKKKKKKKCC....++...CCSSSSSSSSSSS.#', // 27
  '#......................................#', // 28
  '########################################', // 29
];

export const W = GRID[0].length, H = GRID.length;

const OF = { K: '부엌', L: '거실', S: '서재', B: '침실', G: '화원' };
const FLOOR = {
  K: 'stoneFloor', L: 'woodFloor', S: 'woodFloor', B: 'woodFloor', G: 'stoneFloor',
  C: 'woodFloor', '+': 'woodFloor', '.': 'grass', ',': 'stoneFloor', '#': 'wall',
};

export const at = (x, y) => (y < 0 || y >= H || x < 0 || x >= W) ? '#' : GRID[y][x];
export const isDoor = (x, y) => at(x, y) === '+';
export const isWall = (x, y) => at(x, y) === '#';
export const isOutside = (x, y) => { const c = at(x, y); return c === '.' || c === ','; };
export const floorOf = (x, y) => FLOOR[at(x, y)] || 'grass';

export function roomOf(x, y) {
  const c = at(x, y);
  if (OF[c]) return OF[c];
  if (c === '+') {
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const r = OF[at(x + dx, y + dy)]; if (r) return r;
    }
  }
  if (c === 'C') {
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const r = OF[at(x + dx, y + dy)]; if (r) return r;
    }
  }
  return null;
}

export const ZONES = [
  { name: '침실', x: 8, y: 5 },
  { name: '화원', x: 28, y: 6 },
  { name: '부엌', x: 7, y: 20 },
  { name: '거실', x: 20, y: 20 },
  { name: '서재', x: 32, y: 20 },
  { name: '복도', x: 14, y: 18 },
];

export const PATCH = [
  [20, 3, 23, 5, 'grassFlower'], [30, 3, 32, 5, 'grassFlower'],
  [29, 5, 31, 6, 'water'], [34, 9, 36, 10, 'water'],
  [2, 20, 13, 27, 'woodFloor'],
];

export const RUGS = [
  [3, 3, 14, 8],
  [19, 16, 23, 21],
  [29, 17, 35, 21],
  [29, 23, 34, 26],
  [19, 27, 22, 28],
];

export const DECOR = [
  // ── 침실 ── 침대, 옷장, 머리맡 탁자
  ['hearthTop', 2, 5], ['hearthFire', 2, 6],
  ['tableL', 3, 2], ['tableM', 4, 2], ['tableR', 5, 2],
  ['tableL2', 3, 3], ['tableM2', 4, 3], ['tableR2', 5, 3],
  ['chair', 6, 2], ['chair', 6, 3],
  ['tableL', 8, 2], ['tableM', 9, 2], ['tableR', 10, 2],
  ['chair', 7, 2], ['chair', 11, 2],
  ['bookshelf', 2, 2], ['bookshelf', 2, 3],
  ['shelfJar', 14, 4], ['shelfJar2', 14, 5],
  ['barrel', 14, 8], ['sack', 13, 8],
  ['banner', 8, 1], ['window', 5, 1], ['window', 11, 1],
  ['tree', 14, 2],

  // ── 화원 ── 화단, 물확, 돌길
  ['tree', 26, 2], ['tree', 28, 3], ['tree', 31, 2], ['tree', 33, 3],
  ['tree', 36, 2], ['tree', 27, 6], ['tree', 32, 7], ['tree', 36, 5],
  ['tree', 30, 10], ['tree', 35, 7], ['tree', 34, 4],
  ['chair', 25, 5], ['chair', 34, 8], ['chair', 29, 8],
  ['shelfJar', 37, 2], ['shelfJar2', 37, 3],
  ['barrel', 37, 6], ['sack', 26, 10],
  ['window', 18, 1], ['window', 24, 1], ['window', 30, 1], ['window', 36, 1],
  ['banner', 21, 1], ['banner', 33, 1],

  // ── 부엌 ── 화덕, 조리대, 개수대, 찬장
  ['hearthTop', 6, 14], ['hearthFire', 6, 15],
  ['tableL', 2, 16], ['tableM', 3, 16], ['tableR', 4, 16],
  ['tableL2', 2, 17], ['tableM2', 3, 17], ['tableR2', 4, 17],
  ['chair', 5, 16], ['chair', 5, 17],
  ['shelfJar', 8, 14], ['shelfJar2', 9, 14],
  ['barrel', 12, 18], ['sack', 13, 18],
  ['shelfJar', 2, 19], ['shelfJar2', 3, 19],
  ['window', 1, 16], ['window', 1, 22], ['banner', 1, 19],

  // ── 거실 ── 난로, 소파, 안락의자
  ['hearthTop', 20, 13], ['hearthFire', 20, 14],
  ['tableL', 19, 20], ['tableM', 20, 20], ['tableR', 21, 20],
  ['tableL2', 19, 21], ['tableM2', 20, 21], ['tableR2', 21, 21],
  ['chair', 18, 20], ['chair', 22, 21], ['chair', 20, 22],
  ['bookshelf', 16, 22], ['bookshelf', 16, 23],
  ['barrel', 21, 15], ['sack', 22, 15],
  ['tree', 17, 25], ['tree', 23, 25],
  ['banner', 18, 13], ['banner', 22, 13],
  ['window', 16, 28], ['window', 23, 28],

  // ── 서재 ── 책장, 난로, 필사대
  ['bookshelf', 29, 13], ['bookshelf', 30, 13],
  ['bookshelf', 32, 13], ['bookshelf', 33, 13], ['bookshelf', 34, 13],
  ['bookshelf', 35, 13], ['bookshelf', 36, 13], ['bookshelf', 37, 13],
  ['bookshelf', 37, 15], ['bookshelf', 37, 16], ['bookshelf', 37, 17],
  ['bookshelf', 37, 21], ['bookshelf', 37, 22], ['bookshelf', 37, 23],
  ['bookshelf', 28, 24], ['bookshelf', 28, 25], ['bookshelf', 28, 26],
  ['hearthTop', 32, 13], ['hearthFire', 32, 14],
  ['tableL', 31, 18], ['tableM', 32, 18], ['tableR', 33, 18],
  ['chair', 30, 17], ['chair', 34, 19], ['chair', 32, 20],
  ['tableL', 30, 24], ['tableM', 31, 24], ['tableR', 32, 24],
  ['tableL2', 30, 25], ['tableM2', 31, 25], ['tableR2', 32, 25],
  ['chair', 30, 23], ['chair', 32, 25], ['chair', 33, 22], ['chair', 33, 26],
  ['ladder', 36, 15], ['ladder', 29, 26],
  ['tree', 35, 20], ['tree', 30, 27],
  ['barrel', 36, 27], ['sack', 33, 27],
  ['window', 38, 16], ['window', 38, 22],
  ['banner', 31, 12], ['banner', 27, 22],

  // ── 복도 ── 계단, 궤짝, 옷장
  ['stairs', 14, 13], ['chest', 10, 11], ['wardrobe', 9, 12],

  // ── 뜰 ── 집을 둘러싼 바깥
  ['tree', 3, 0], ['tree', 9, 0], ['tree', 16, 0], ['tree', 24, 0], ['tree', 33, 0],
  ['tree', 0, 3], ['tree', 0, 10], ['tree', 0, 17], ['tree', 0, 24],
  ['tree', 39, 3], ['tree', 39, 11], ['tree', 39, 19], ['tree', 39, 25],
  ['tree', 11, 28], ['tree', 37, 28], ['tree', 2, 29], ['tree', 8, 29],
  ['tree', 27, 29], ['tree', 34, 29],
  ['barrel', 10, 27], ['barrel', 36, 27],
  ['sack', 12, 29], ['barrel', 25, 29],
];

export const PROPS = [
  // 침실: 침대·옷장·머리맡 탁자
  { key: 'bed_top', x: 3, y: 4 }, { key: 'bed_bottom', x: 3, y: 5 },
  { key: 'bed_top', x: 8, y: 4 }, { key: 'bed_bottom', x: 8, y: 5 },
  { key: 'bed_top', x: 12, y: 4 }, { key: 'bed_bottom', x: 12, y: 5 },
  { key: 'bed_top', x: 5, y: 7 }, { key: 'bed_bottom', x: 5, y: 8 },
  { key: 'bed_top', x: 9, y: 7 }, { key: 'bed_bottom', x: 9, y: 8 },
  { key: 'wardrobe', x: 6, y: 3 }, { key: 'wardrobe', x: 10, y: 3 },
  { key: 'wardrobe', x: 2, y: 7 }, { key: 'wardrobe', x: 14, y: 6 },
  { key: 'chest', x: 4, y: 6 }, { key: 'chest', x: 8, y: 6 },
  { key: 'nightstand', x: 4, y: 4 }, { key: 'nightstand', x: 9, y: 4 },
  { key: 'nightstand', x: 13, y: 4 },
  { key: 'desk', x: 2, y: 8 }, { key: 'washtub', x: 14, y: 9 },

  // 부엌: 냉장고, 개수대, 화덕, 조리대
  { key: 'fridge', x: 13, y: 24, h: 2 },
  { key: 'sink', x: 11, y: 14 }, { key: 'counter', x: 12, y: 14 },
  { key: 'stove', x: 7, y: 14 }, { key: 'counter', x: 10, y: 14 },
  { key: 'cupboard', x: 2, y: 19 }, { key: 'cupboard', x: 4, y: 19 },
  { key: 'empty_plate', x: 3, y: 16 },
  { key: 'washtub', x: 2, y: 25 },

  // 거실: 난로 앞 소파와 안락의자
  { key: 'sofa_l', x: 19, y: 18 }, { key: 'sofa_r', x: 20, y: 18 },
  { key: 'armchair', x: 17, y: 17 }, { key: 'armchair', x: 22, y: 17 },
  { key: 'armchair', x: 17, y: 24 },
  { key: 'desk', x: 23, y: 23 }, { key: 'chest', x: 18, y: 17 },
  { key: 'cupboard', x: 16, y: 19 },

  // 서재: 난로 앞 안락의자와 필사대
  { key: 'armchair', x: 35, y: 22 }, { key: 'armchair', x: 29, y: 19 },
  { key: 'desk', x: 35, y: 15 }, { key: 'desk', x: 29, y: 23 },
  { key: 'chest', x: 36, y: 25 },
  { key: 'sofa_l', x: 33, y: 20 }, { key: 'sofa_r', x: 34, y: 20 },
];

export const SOLID = new Set([
  'hearthTop', 'hearthFire', 'bookshelf', 'shelfJar', 'shelfJar2', 'barrel', 'sack', 'tree',
  'tableL', 'tableM', 'tableR', 'tableL2', 'tableM2', 'tableR2',
  'fridge', 'sink', 'counter', 'stove', 'cupboard', 'washtub', 'desk', 'chest',
  'stairs', 'wardrobe', 'nightstand', 'bed_top', 'bed_bottom',
  'sofa_l', 'sofa_r', 'armchair',
]);

export const SPOT = {
  sgn_kyle:   { room: '거실', x: 20, y: 19 },
  sgn_howell: { room: '부엌', x: 7, y: 20 },
  sgn_ben:    { room: '서재', x: 33, y: 21 },
  sgn_dorn:   { room: '화원', x: 29, y: 7 },
  sgn_mira:   { room: '침실', x: 7, y: 4 },
  player:     { room: '거실', x: 20, y: 25 },
};

export function buildBlocked() {
  const b = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = at(x, y);
    b[y * W + x] = (c === '#' || c === '.' || c === ',') ? 1 : 0;
  }
  const put = (x, y, w = 1, h = 1) => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const nx = x + i, ny = y + j;
      if (nx >= 0 && ny >= 0 && nx < W && ny < H) b[ny * W + nx] = 1;
    }
  };
  DECOR.forEach(([k, x, y]) => { if (SOLID.has(k)) put(x, y); });
  PROPS.forEach(p => { if (SOLID.has(p.key)) put(p.x, p.y, p.w || 1, p.h || 1); });
  PATCH.forEach(([x1, y1, x2, y2, kind]) => {
    if (kind !== 'water') return;
    for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) if (roomOf(x, y)) b[y * W + x] = 1;
  });
  return b;
}
