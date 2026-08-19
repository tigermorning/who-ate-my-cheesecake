// house.mjs 의 도면을 SPUM Studio Map 으로 뽑는다.
//   node spum/buildmap.mjs > spum/house-map.json
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { W, H, ZONES, PATCH, RUGS, PROPS, ONWALL, SPOT, LANDMARKS,
         roomOf, floorOf, isWall, isFence, isDoor, sizeOf, PASSABLE, buildBlocked } from './house.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const smo = JSON.parse(readFileSync(join(__dirname, 'smo.json'), 'utf8'));
const byKey = Object.fromEntries(smo.map(o => [o.key, o]));

const idx = (x, y) => y * W + x;
const blocked = buildBlocked();
const inBox = (x, y) => ([x1, y1, x2, y2]) => x >= x1 && x <= x2 && y >= y1 && y <= y2;

// 바닥 SMO 키마다 번호를 하나씩 준다 — 타일셋 없이 SMO 자체가 타일이다
const terrainKeys = smo.filter(o => o.layerHint === 'back').map(o => o.key);
const backId = Object.fromEntries(terrainKeys.map((k, i) => [k, i + 1]));

const back = new Array(W * H).fill(0);
const front = new Array(W * H).fill(0);
const walk = new Array(W * H).fill(0);
const block = new Array(W * H).fill(0);

for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = idx(x, y);
  const pt = PATCH.find(inBox(x, y));
  const rug = RUGS.find(inBox(x, y));
  back[i] = backId[rug ? rug[4] : (pt ? pt[4] : floorOf(x, y))] || backId.grass;
  if (isWall(x, y)) front[i] = isFence(x, y) ? 2 : 1;   // 1 = 집 벽, 2 = 울타리
  if (blocked[i]) block[i] = 1; else walk[i] = 1;
}

// 놓인 것 — SPUM 오브젝트로 그대로 나간다
const objects = [];
const push = (p, layer) => {
  const o = byKey[p.key];
  if (!o) return;
  const [cw, ch] = sizeOf(p.key);
  objects.push({
    id: `OBJ_${p.key}_${p.x}_${p.y}`,
    objectId: o.id, key: p.key, name: o.name,
    x: p.x, y: p.y, width: cw, height: ch,
    layer, z: p.y + ch - 1 + (p.on ? 0.5 : 0),
    blocksMovement: !p.on && !PASSABLE.has(p.key),
    room: roomOf(p.x, p.y) || '뜰',
    interaction: o.interaction,
  });
};
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (isWall(x, y)) push({ key: isFence(x, y) ? 'fence' : 'house_wall', x, y }, 'front');
  else if (isDoor(x, y)) push({ key: 'wooden_door', x, y }, 'front');
}
PROPS.forEach(p => push(p, 'front'));
ONWALL.forEach(p => push(p, 'front'));
objects.sort((a, b) => a.z - b.z);

const spawnPoints = [
  ...ZONES.map(z => ({ id: 'spawn_' + z.name, name: z.name, x: z.x, y: z.y, tags: ['room'] })),
  ...Object.entries(SPOT).map(([id, s]) => ({ id: 'start_' + id, name: id, x: s.x, y: s.y, tags: ['actor', s.room] })),
  ...LANDMARKS.map(L => ({ id: 'spot_' + L.name, name: L.name, x: L.x, y: L.y, tags: ['landmark'] })),
];

const now = new Date().toISOString();
console.log(JSON.stringify({
  id: 'MAP_cheesecake_house', name: 'Who Ate My Cheesecake? · House',
  description: '단층집 한 채와 뜰. 부엌·식당·욕실·거실·서재가 복도 하나로 이어지고, 뜰에 데크·운동장·텃밭·헛간이 있다.',
  version: 3, width: W, height: H, tileSize: 24,
  tileSetAssetId: '', mapThemeId: '', savedAt: now,
  layers: [
    { name: 'back_1', type: 'back', label: '바닥', data: back, legend: backId },
    { name: 'front_1', type: 'front', label: '벽', data: front },
    { name: 'walkable', type: 'walkable', label: '', data: walk },
    { name: 'obstacle', type: 'obstacle', label: '', data: block },
  ],
  objects, ruleTiles: {}, tilesets: [], spawnPoints,
  meta: { createdAt: now, updatedAt: now, tags: ['치즈케이크'], objectSource: 'spum/smo.json' },
}));
