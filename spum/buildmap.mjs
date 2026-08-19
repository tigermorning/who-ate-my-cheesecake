// 도면을 진짜 SPUM Studio 맵으로 뽑는다.
//   node spum/buildtheme.mjs && node spum/buildmap.mjs > spum/house-map.json
//
// SPUM 맵의 규칙 (실계정 데이터로 확인):
//  · 맵은 라이브러리에 있는 SMO 를 바로 그리지 못한다. `tilesets[]` 에
//    source:"map-theme" 로 등록된 타일만 그린다.
//  · 레이어는 평탄 배열이고 값은 packed 타일 ID. 인덱스는 row*width+col, 0 은 빈 칸.
//  · tileIdBase 는 2048 칸 블록 — builtin 1, 첫 테마 2049, 그다음 4097.
//  · objects[] 는 SMO 배치가 아니라 사각형 주석이다. 그래서 방 이름표로 쓴다.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { W, H, ZONES, SPOT, LANDMARKS, roomOf } from './house.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const theme = JSON.parse(readFileSync(join(__dirname, 'house-theme.json'), 'utf8'));

const THEME_SMO_ID = 'SMO_CHZ_THEME_HOUSE';
const THEME_NAME = 'Who Ate My Cheesecake? · 집';
const BASE = 2049;                                  // 첫 커스텀 테마 블록
const now = new Date().toISOString();

// ── 타일 속성: packed ID → 이 타일이 무엇인지 ──────────────
const tileProperties = {};
theme.tiles.forEach((t, i) => {
  tileProperties[String(BASE + i)] = {
    smoThemeId: THEME_SMO_ID, smoThemeName: THEME_NAME,
    smoTileId: t.tileId, name: t.name, category: t.category,
    movement: t.movement, interaction: t.interaction,
    blocksMovement: t.blocksMovement, blocksVision: t.blocksVision,
    moveSpeed: t.moveSpeed,
    sourceCell: t.sourceCell, sourceCells: [t.sourceCell],
  };
});

// ── 레이어 ──────────────────────────────────────────────────
const back = theme.layer.map(i => BASE + i);        // 집 한 채가 통째로 여기 들어간다
// front = 캐릭터보다 위에 그려질 칸 (나무 우듬지·차양 …). 0 은 빈 칸이다.
const front = (theme.layerFront || new Array(W * H).fill(-1)).map(i => i >= 0 ? BASE + i : 0);
const { walkable, obstacle } = theme;

// ── 방 이름표: 방마다 칸을 큰 사각형으로 쪼개 주석으로 남긴다 ──
function rectsOf(name) {
  const left = new Set();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (roomOf(x, y) === name) left.add(y * W + x);
  const out = [];
  while (left.size) {
    const first = Math.min(...left);
    const x0 = first % W, y0 = Math.floor(first / W);
    let w = 0; while (left.has(y0 * W + x0 + w)) w++;
    let h = 1;
    for (;;) {
      let full = true;
      for (let i = 0; i < w; i++) if (!left.has((y0 + h) * W + x0 + i)) { full = false; break; }
      if (!full) break;
      h++;
    }
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) left.delete((y0 + j) * W + x0 + i);
    out.push({ col: x0, row: y0, width: w, height: h });
  }
  return out;
}
const ROOM_COLOR = {
  부엌: '#E8C88A', 식당: '#D9A468', 욕실: '#9FC7DA', 거실: '#E0B07A', 서재: '#B79A6E',
  복도: '#CFC0A0', 데크: '#C08B4E', 운동장: '#9BA2A8', 텃밭: '#7C5734', 헛간: '#AC8B5F',
  현관앞: '#D1CAB6',
};
const objects = [];
Object.keys(ROOM_COLOR).forEach(name => {
  rectsOf(name).forEach((r, i) => objects.push({
    id: `ROOM_${name}_${i}`, name, tags: ['room', name],
    description: `${name} — 어젯밤 여기 있었다고 말할 수 있는 자리`,
    rect: r, color: ROOM_COLOR[name],
  }));
});

// ── 자리 ────────────────────────────────────────────────────
const spawnPoints = [
  ...ZONES.map(z => ({ id: 'label_' + z.name, name: z.name, x: z.x, y: z.y, tags: ['room', 'label'] })),
  ...Object.entries(SPOT).map(([id, s]) => ({ id: 'start_' + id, name: id, x: s.x, y: s.y, tags: ['actor', s.room] })),
  ...LANDMARKS.map(L => ({ id: 'spot_' + L.name, name: L.name, x: L.x, y: L.y, tags: ['landmark'] })),
];

console.log(JSON.stringify({
  id: 'MAP_cheesecake_house', name: THEME_NAME,
  description: '단층집 한 채와 뜰. 부엌·식당·욕실·거실·서재가 복도 하나로 이어지고, 뜰에 데크·운동장·텃밭·헛간이 있다.',
  version: 3, width: W, height: H, tileSize: theme.tileSize,
  tileSetAssetId: 'theme_' + THEME_SMO_ID, mapThemeId: THEME_SMO_ID, savedAt: now,
  layers: [
    { name: 'back_1', type: 'back', label: '집', data: back },
    { name: 'front_1', type: 'front', label: '위', data: front },
    { name: 'walkable', type: 'walkable', label: '', data: walkable },
    { name: 'obstacle', type: 'obstacle', label: '', data: obstacle },
  ],
  objects, ruleTiles: {},
  tilesets: [
    { id: 'builtin_tp_tile01', name: 'TP_Tile01', kind: 'builtin',
      imageUrl: 'https://spum.soonsoon.ai/assets/TP_Tile01.png', source: '', themeId: '', themeName: '',
      tileProperties: {}, tileIdBase: 1, tileWidth: 32, tileHeight: 32, tiles: [], columns: 0,
      createdAt: '', updatedAt: '' },
    { id: 'theme_' + THEME_SMO_ID, name: THEME_NAME, kind: 'custom',
      imageUrl: '', source: 'map-theme', themeId: THEME_SMO_ID, themeName: THEME_NAME,
      tileProperties, tileIdBase: BASE, tileWidth: theme.tileSize, tileHeight: theme.tileSize,
      tiles: [], columns: theme.columns, createdAt: now, updatedAt: now },
  ],
  spawnPoints,
  meta: { createdAt: now, updatedAt: now, tags: ['치즈케이크'],
          themeSheet: 'house-theme.png', themeTiles: theme.count },
}));
