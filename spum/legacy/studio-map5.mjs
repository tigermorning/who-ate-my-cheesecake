// 역할로 가른다: 가구(object/detail)와 벽은 참조 그림 그대로, 바닥은 방 재료로 통일.
// 좌표를 맞추지 않으므로 이음새가 생기지 않는다.
import { chromium } from 'playwright';
import fs from 'node:fs';
import { W, H, GRID, buildBlocked, ZONES, SPOT, LANDMARKS } from './house.mjs';

const picked = JSON.parse(fs.readFileSync(new URL('./samples.json', import.meta.url), 'utf8'));
const SAMPLE = Object.fromEntries(Object.entries(picked).filter(([k]) => k !== 'fence').map(([k, v]) => [k, [v.x, v.y]]));
const FENCE_SAMPLE = [picked.fence.x, picked.fence.y];

const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('spum.soonsoon.ai'));
await page.bringToFront();
const blocked = Array.from(buildBlocked());

const res = await page.evaluate(async ({ W, H, rows, blocked, SAMPLE, FENCE_SAMPLE, zones, spots, marks }) => {
  const out = { steps: [] };
  const smo = JSON.parse(localStorage.getItem('sv_studio_smo_v1') || '[]');
  const theme = smo.find(o => (o.name || '').includes('Who Ate My') && o.mapTheme);
  const mt = theme.mapTheme;
  const tileMap = mt.editorState?.resourceSliceResult?.tileMap;
  if (!tileMap) return { err: 'tileMap 없음' };
  const byId = new Map((mt.tiles || []).map(t => [String(t.id), t]));
  const BASE = 2049;
  const packedOfId = id => BASE + Number(id);
  const roleAt = (x, y) => byId.get(String(tileMap[y][x]))?.role || 'floor';

  const brush = {};
  for (const [ch, [sx, sy]] of Object.entries(SAMPLE)) brush[ch] = packedOfId(tileMap[sy][sx]);
  brush['fence'] = packedOfId(tileMap[FENCE_SAMPLE[1]][FENCE_SAMPLE[0]]);

  const back = new Array(W * H).fill(0);
  const front = new Array(W * H).fill(0);
  let furniture = 0, wall = 0, paved = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ch = rows[y][x];
    const role = roleAt(x, y);
    const refTile = packedOfId(tileMap[y][x]);
    const border = x === 0 || y === 0 || x === W - 1 || y === H - 1;
    const floorBrush = ch === '#' ? (border ? brush['fence'] : brush['#']) : (brush[ch] ?? brush['.']);

    if (ch === '#') { back[y * W + x] = refTile; wall++; }
    else if (role === 'object' || role === 'detail') {
      back[y * W + x] = floorBrush;
      front[y * W + x] = refTile;
      furniture++;
    } else { back[y * W + x] = floorBrush; paved++; }
  }
  out.steps.push(`가구 ${furniture} · 벽 ${wall} · 바닥 ${paved}`);

  const used = [...new Set([...back, ...front])].filter(Boolean);
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
    description: '참조 그림의 가구·벽은 그대로, 바닥은 방 재료로 통일한 집과 뜰',
    version: 5, width: W, height: H, tileSize: 32,
    tileSetAssetId: 'theme_' + theme.id, mapThemeId: theme.id, savedAt: now,
    layers: [
      { name: 'back_1', type: 'back', label: '바닥', data: back },
      { name: 'front_1', type: 'front', label: '가구', data: front },
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
}, { W, H, rows: GRID, blocked, SAMPLE, FENCE_SAMPLE, zones: ZONES,
     spots: Object.entries(SPOT).map(([id, s]) => ({ id, ...s })), marks: LANDMARKS });

console.log(JSON.stringify(res));
await page.goto('https://spum.soonsoon.ai/studio/?section=map', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(13000);
process.exit(0);
