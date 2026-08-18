// house.mjs 의 도면을 SPUM Studio Map 으로 뽑는다.  node spum/buildmap.mjs > spum/house-map.json
import { W, H, ZONES, PATCH, roomOf, floorOf, isDoor, isWall, buildBlocked } from './house.mjs';

const idx = (x, y) => y * W + x;
const blocked = buildBlocked();

// back 1 = 나무 바닥 · 2 = 흙/풀 · 3 = 돌 바닥 · 4 = 물
const BACK = { woodFloor: 1, grass: 2, grassFlower: 2, stoneFloor: 3, water: 4 };
const back = new Array(W * H).fill(0);
const front = new Array(W * H).fill(0);
const walk = new Array(W * H).fill(0);
const block = new Array(W * H).fill(0);

for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = idx(x, y);
  if (isWall(x, y)) { block[i] = 1; front[i] = 1; continue; }
  const pt = PATCH.find(([x1, y1, x2, y2]) => x >= x1 && x <= x2 && y >= y1 && y <= y2);
  back[i] = BACK[pt ? pt[4] : floorOf(x, y)] || 2;
  if (blocked[i]) block[i] = 1; else walk[i] = 1;
}

const spawnPoints = ZONES.map(z => ({ id: 'spawn_' + z.name, name: z.name, x: z.x, y: z.y, tags: ['room'] }));

const now = new Date().toISOString();
console.log(JSON.stringify({
  id: 'MAP_cheesecake_house', name: 'Who Ate My Cheesecake? · House',
  description: '동물 하우스메이트 여섯이 함께 사는 집 하나. 방 다섯이 지붕 하나 아래 이어져 있다.',
  version: 2, width: W, height: H, tileSize: 32,
  tileSetAssetId: 'builtin_tp_tile01', mapThemeId: '', savedAt: now,
  layers: [
    { name: 'back_1', type: 'back', label: '바닥', data: back },
    { name: 'front_1', type: 'front', label: '위', data: front },
    { name: 'walkable', type: 'walkable', label: '', data: walk },
    { name: 'obstacle', type: 'obstacle', label: '', data: block },
  ],
  objects: [], ruleTiles: {}, tilesets: [], spawnPoints,
  meta: { createdAt: now, updatedAt: now, tags: ['치즈케이크의밤'] },
}));
