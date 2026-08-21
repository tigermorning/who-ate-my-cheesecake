// 참조 그림에서 뜬 44x36 타일을 칸마다 제자리에 깐다.
// 패킹 번호 = tileIdBase + (행 * 열수 + 열)  — 번호가 곧 시트 좌표다.
import { chromium } from 'playwright';
import { W, H, buildBlocked, ZONES, SPOT, LANDMARKS } from './house.mjs';

const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('spum.soonsoon.ai'));
await page.bringToFront();
const blocked = Array.from(buildBlocked());

const res = await page.evaluate(async ({ W, H, blocked, zones, spots, marks }) => {
  const out = { steps: [] };
  const smo = JSON.parse(localStorage.getItem('sv_studio_smo_v1') || '[]');
  const theme = smo.find(o => (o.name || '').includes('Who Ate My') && o.mapTheme);
  const mt = theme?.mapTheme;
  const tileMap = mt?.editorState?.resourceSliceResult?.tileMap;
  if (!tileMap) return { err: 'tileMap 이 없다' };
  if (tileMap.length !== H || tileMap[0].length !== W) return { err: `tileMap 크기가 ${tileMap[0].length}x${tileMap.length}` };
  const byId = new Map((mt.tiles || []).map(t => [String(t.id), t]));
  const BASE = 2049, COLS = W;

  const back = new Array(W * H).fill(0);
  const tileProperties = {};
  const tsTiles = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const packed = BASE + y * COLS + x;
    back[y * W + x] = packed;
    const t = byId.get(String(tileMap[y][x])) || {};
    const cell = { column: x + 1, row: y + 1 };
    tileProperties[String(packed)] = {
      smoThemeId: theme.id, smoThemeName: theme.name, smoTileId: String(tileMap[y][x]),
      name: t.name || ('tile ' + tileMap[y][x]), category: t.category || 'floor',
      movement: blocked[y * W + x] ? 'blocked' : 'passable', interaction: 'none',
      blocksMovement: !!blocked[y * W + x], blocksVision: !!blocked[y * W + x],
      moveSpeed: blocked[y * W + x] ? 0 : 1,
      sourceCell: cell, sourceCells: [cell],
    };
    tsTiles.push({ id: String(tileMap[y][x]), name: t.name || '', category: t.category || 'floor',
      movement: tileProperties[String(packed)].movement, interaction: 'none', role: t.role || '',
      cells: [cell], assetId: t.assetId || '', imageDataUrl: '', properties: {} });
  }
  out.steps.push(`칸 ${W * H} · 서로 다른 타일 ${new Set(tileMap.flat()).size}종`);

  const now = new Date().toISOString();
  const map = {
    id: 'MAP_cheesecake_house', name: 'Who Ate My Cheesecake? · 집',
    description: '참조 그림을 SPUM 맵 테마로 떠서 칸마다 제자리에 깐 집과 뜰',
    version: 3, width: W, height: H, tileSize: 32,
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
      tileWidth: 32, tileHeight: 32, tiles: tsTiles, columns: COLS, createdAt: now, updatedAt: now,
    }],
    spawnPoints: [
      ...spots.map(s => ({ id: 'start_' + s.id, name: s.id, x: s.x, y: s.y, tags: ['actor', s.room] })),
      ...marks.map(m => ({ id: 'spot_' + m.name, name: m.name, x: m.x, y: m.y, tags: ['landmark'] })),
    ],
    meta: { createdAt: now, updatedAt: now, tags: ['치즈케이크'] },
  };

  try { await window.spumStudioData.export(); out.steps.push('백업'); } catch {}
  const KEY = 'sv_studio_maps_v1';
  const maps = JSON.parse(localStorage.getItem(KEY) || '[]');
  const i = maps.findIndex(m => m.id === map.id);
  if (i >= 0) maps[i] = map; else maps.push(map);
  localStorage.setItem(KEY, JSON.stringify(maps));
  window.dispatchEvent(new CustomEvent('spum:studio-storage-write', { detail: { key: KEY } }));
  try { await window.spumStudioData.saveServerSnapshot('manual'); out.steps.push('서버 저장'); }
  catch (e) { out.steps.push('서버 저장 실패'); }
  return out;
}, { W, H, blocked, zones: ZONES, spots: Object.entries(SPOT).map(([id, s]) => ({ id, ...s })), marks: LANDMARKS });

console.log(JSON.stringify(res).slice(0, 400));
await page.goto('https://spum.soonsoon.ai/studio/?section=map', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(13000);
process.exit(0);
