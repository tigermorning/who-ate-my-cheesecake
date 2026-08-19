// 참조 그림에서 재료 타일을 골라, 도면대로 칠한다.
// 붓으로 쓰는 타일은 SPUM Studio 테마의 타일이다.
import { chromium } from 'playwright';
import { W, H, GRID, buildBlocked, sizeOf, PROPS, ZONES, SPOT, LANDMARKS } from './house.mjs';

// 글자 -> 참조 그림에서 그 재료가 가장 잘 드러나는 칸.
// pick-samples.mjs 가 그림을 재서 고른다 (방의 대표색 + 평평함).
import fsx from 'node:fs';
const picked = JSON.parse(fsx.readFileSync(new URL('./samples.json', import.meta.url), 'utf8'));
const SAMPLE = Object.fromEntries(Object.entries(picked).filter(([k]) => k !== 'fence').map(([k, v]) => [k, [v.x, v.y]]));
const FENCE_SAMPLE = [picked.fence.x, picked.fence.y];

const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('spum.soonsoon.ai'));
await page.bringToFront();
const blocked = Array.from(buildBlocked());
// 가구가 덮는 칸 — 여기는 참조 그림의 그 자리 타일을 그대로 쓴다
const propCells = new Uint8Array(W * H);
for (const p of PROPS) {
  const [cw, ch] = sizeOf(p.key);
  for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
    const x = p.x + i, y = p.y + j;
    if (x >= 0 && y >= 0 && x < W && y < H) propCells[y * W + x] = 1;
  }
}

const res = await page.evaluate(async ({ W, H, rows, blocked, propCells, SAMPLE, FENCE_SAMPLE, zones, spots, marks }) => {
  const out = { steps: [] };
  const smo = JSON.parse(localStorage.getItem('sv_studio_smo_v1') || '[]');
  const theme = smo.find(o => (o.name || '').includes('Who Ate My') && o.mapTheme);
  const mt = theme.mapTheme;
  const tileMap = mt.editorState?.resourceSliceResult?.tileMap;
  if (!tileMap) return { err: 'tileMap 없음' };
  const tiles = mt.tiles || [];
  const byId = new Map(tiles.map(t => [String(t.id), t]));
  const BASE = 2049;
  const packedOfId = id => BASE + Number(id);

  // 표본 칸 -> 타일 id -> 패킹 번호
  const brush = {};
  for (const [ch, [sx, sy]] of Object.entries(SAMPLE)) {
    const id = tileMap[sy]?.[sx];
    brush[ch] = { id, packed: packedOfId(id), role: byId.get(String(id))?.role, name: byId.get(String(id))?.name };
  }
  const fenceId = tileMap[FENCE_SAMPLE[1]]?.[FENCE_SAMPLE[0]];
  brush['fence'] = { id: fenceId, packed: packedOfId(fenceId), role: byId.get(String(fenceId))?.role };
  out.brush = brush;

  const back = new Array(W * H).fill(0);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ch = rows[y][x];
    if (propCells[y * W + x]) {          // 가구 자리는 참조 그림 그대로
      back[y * W + x] = packedOfId(tileMap[y][x]);
      continue;
    }
    const fence = ch === '#' && (x === 0 || y === 0 || x === W - 1 || y === H - 1);
    const bsel = fence ? brush['fence'] : (brush[ch] || brush['.']);
    back[y * W + x] = bsel.packed;
  }

  // 쓰는 타일만 속성으로 넣는다
  const used = [...new Set(back)];
  const tileProperties = {}; const tsTiles = [];
  used.forEach(p => {
    const id = String(p - BASE);
    const t = byId.get(id) || {};
    const cell = (t.cells || [])[0] || { column: 1, row: 1 };
    tileProperties[String(p)] = {
      smoThemeId: theme.id, smoThemeName: theme.name, smoTileId: id, name: t.name || ('tile ' + id),
      category: t.category || 'floor', movement: t.movement || 'passable', interaction: 'none',
      blocksMovement: false, blocksVision: false, moveSpeed: 1,
      sourceCell: cell, sourceCells: t.cells || [cell],
    };
    tsTiles.push({ id, name: t.name || '', category: t.category || 'floor', movement: t.movement || 'passable',
      interaction: 'none', role: t.role || '', cells: t.cells || [cell], assetId: t.assetId || '',
      imageDataUrl: '', properties: {} });
  });
  out.steps.push(`쓰는 타일 ${used.length}종`);

  const now = new Date().toISOString();
  const map = {
    id: 'MAP_cheesecake_house', name: 'Who Ate My Cheesecake? · 집',
    description: '참조 그림의 재료와 배치를 SPUM 타일로 다시 지은 집과 뜰',
    version: 4, width: W, height: H, tileSize: 32,
    tileSetAssetId: 'theme_' + theme.id, mapThemeId: theme.id, savedAt: now,
    layers: [
      { name: 'back_1', type: 'back', label: '바닥', data: back },
      { name: 'front_1', type: 'front', label: '위', data: new Array(W * H).fill(0) },
      { name: 'walkable', type: 'walkable', label: '', data: blocked.map(v => v ? 0 : 1) },
      { name: 'obstacle', type: 'obstacle', label: '', data: blocked.slice() },
    ],
    objects: zones.map((z, i) => ({ id: 'ROOM_' + i, name: z.name, tags: ['room', z.name],
      description: z.name, rect: { col: z.x, row: z.y, width: 1, height: 1 }, color: '#E8C88A' })),
    ruleTiles: {},
    tilesets: [{
      id: 'theme_' + theme.id, name: theme.name, kind: 'custom', imageUrl: '', source: 'map-theme',
      themeId: theme.id, themeName: theme.name, tileProperties, tileIdBase: BASE,
      tileWidth: 32, tileHeight: 32, tiles: tsTiles, columns: 44, createdAt: now, updatedAt: now,
    }],
    spawnPoints: [
      ...spots.map(s => ({ id: 'start_' + s.id, name: s.id, x: s.x, y: s.y, tags: ['actor', s.room] })),
      ...marks.map(m => ({ id: 'spot_' + m.name, name: m.name, x: m.x, y: m.y, tags: ['landmark'] })),
    ],
    meta: { createdAt: now, updatedAt: now, tags: ['치즈케이크'] },
  };
  try { await window.spumStudioData.export(); } catch {}
  const KEY = 'sv_studio_maps_v1';
  const maps = JSON.parse(localStorage.getItem(KEY) || '[]');
  const i = maps.findIndex(m => m.id === map.id);
  if (i >= 0) maps[i] = map; else maps.push(map);
  localStorage.setItem(KEY, JSON.stringify(maps));
  window.dispatchEvent(new CustomEvent('spum:studio-storage-write', { detail: { key: KEY } }));
  try { await window.spumStudioData.saveServerSnapshot('manual'); out.steps.push('서버 저장'); } catch { out.steps.push('서버 저장 실패'); }
  return out;
}, { W, H, rows: GRID, blocked, propCells: Array.from(propCells), SAMPLE, FENCE_SAMPLE, zones: ZONES,
     spots: Object.entries(SPOT).map(([id, s]) => ({ id, ...s })), marks: LANDMARKS });

console.log(JSON.stringify(res, null, 1).slice(0, 1400));
await page.goto('https://spum.soonsoon.ai/studio/?section=map', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(13000);
process.exit(0);
