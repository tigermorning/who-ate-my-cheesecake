// 최소 확인용 맵을 Studio 에 만든다. 바닥·벽만 칠한다.
// 쓰기 방향은 반드시 로컬 -> 서버 (CLAUDE.md §3-1).
import { chromium } from 'playwright';
import fs from 'node:fs';
import { W, H, GRID, isWall, isFence, isDoor, buildBlocked, ZONES, SPOT, LANDMARKS, roomOf } from './house.mjs';

const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = b.contexts()[0];
const page = ctx.pages().find(p => p.url().includes('spum.soonsoon.ai')) || ctx.pages()[0];
await page.bringToFront();

const blocked = buildBlocked();
const grid = GRID.join('\n');

const res = await page.evaluate(async ({ W, H, grid, blocked, zones, spots, marks }) => {
  const out = { steps: [] };
  const smo = JSON.parse(localStorage.getItem('sv_studio_smo_v1') || '[]');
  const theme = smo.find(o => (o.name || '').includes('Who Ate My') && o.mapTheme);
  if (!theme) return { err: '테마 없음' };
  const tiles = theme.mapTheme.tiles || [];
  const COLS = 16, BASE = 2049;

  // 패킹 번호 = tileIdBase + 타일 id (기본맵에서 확인: smoTileId "1" -> 2050)
  const packed = t => (t && t.id != null && !isNaN(Number(t.id))) ? BASE + Number(t.id) : null;
  const byRole = r => tiles.filter(t => (t.role || '') === r && packed(t));
  const floors = byRole('floor'), walls = byRole('wall'), waters = byRole('water');
  out.steps.push(`타일 floor=${floors.length} wall=${walls.length} water=${waters.length}`);
  if (!floors.length || !walls.length) return { err: '바닥/벽 타일이 없다', out };

  const IN = packed(floors[0]);                    // 집 안 바닥
  const YARD = packed(floors[1] || floors[0]);     // 뜰 바닥
  const WALL = packed(walls[0]);
  const FENCE = packed(walls[1] || walls[0]);

  const rows = grid.split('\n');
  const back = new Array(W * H).fill(IN);
  const walkable = new Array(W * H).fill(1);
  const obstacle = new Array(W * H).fill(0);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ch = rows[y][x];
    const i = y * W + x;
    const fence = ch === '#' && (x === 0 || y === 0 || x === W - 1 || y === H - 1);
    back[i] = ch === '#' ? (fence ? FENCE : WALL) : (('.,WYVH'.includes(ch)) ? YARD : IN);
    obstacle[i] = blocked[i] ? 1 : 0;
    walkable[i] = blocked[i] ? 0 : 1;
  }

  // 타일 속성 — 맵이 그릴 수 있게 sourceCell 을 넣는다
  const tileProperties = {};
  tiles.forEach(t => {
    const p = packed(t); if (!p) return;
    const c = (t.cells || [])[0];
    tileProperties[String(p)] = {
      smoThemeId: theme.id, smoThemeName: theme.name, smoTileId: t.id, name: t.name,
      category: t.category, movement: t.movement, interaction: t.interaction || 'none',
      blocksMovement: !!(t.properties && t.properties.blocksMovement),
      blocksVision: !!(t.properties && t.properties.blocksVision),
      moveSpeed: (t.properties && t.properties.moveSpeed) ?? 1,
      sourceCell: c, sourceCells: t.cells,
    };
  });
  // 타일 목록도 그대로 실어 준다 — 기본맵 타일셋이 이걸 갖고 있다
  const tsTiles = tiles.filter(t => packed(t)).map(t => ({
    id: t.id, name: t.name, category: t.category, movement: t.movement,
    interaction: t.interaction || 'none', role: t.role, cells: t.cells,
    assetId: t.assetId, imageDataUrl: t.imageDataUrl || '', properties: t.properties || {},
  }));

  const now = new Date().toISOString();
  const map = {
    id: 'MAP_cheesecake_house', name: 'Who Ate My Cheesecake? · 집',
    description: '참조 그림 배치를 SPUM 타일로 다시 지은 집과 뜰',
    version: 1, width: W, height: H, tileSize: 32,
    tileSetAssetId: 'theme_' + theme.id, mapThemeId: theme.id, savedAt: now,
    layers: [
      { name: 'back_1', type: 'back', label: '바닥', data: back },
      { name: 'front_1', type: 'front', label: '위', data: new Array(W * H).fill(0) },
      { name: 'walkable', type: 'walkable', label: '', data: walkable },
      { name: 'obstacle', type: 'obstacle', label: '', data: obstacle },
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

  // ① 백업 ② 로컬 쓰기 ③ 알림 ④ 서버
  try { await window.spumStudioData.export(); out.steps.push('백업 완료'); } catch (e) { out.steps.push('백업 실패 ' + e.message); }
  const KEY = 'sv_studio_maps_v1';
  const maps = JSON.parse(localStorage.getItem(KEY) || '[]');
  const idx = maps.findIndex(m => m.id === map.id);
  if (idx >= 0) maps[idx] = map; else maps.push(map);
  localStorage.setItem(KEY, JSON.stringify(maps));
  window.dispatchEvent(new CustomEvent('spum:studio-storage-write', { detail: { key: KEY } }));
  out.steps.push(`맵 저장 (총 ${maps.length}개)`);
  try { await window.spumStudioData.saveServerSnapshot('manual'); out.steps.push('서버 저장 완료'); }
  catch (e) { out.steps.push('서버 저장 실패 ' + e.message); }
  out.picked = { IN, YARD, WALL, FENCE, tileCount: Object.keys(tileProperties).length };
  return out;
}, { W, H, grid, blocked: Array.from(blocked), zones: ZONES,
     spots: Object.entries(SPOT).map(([id, s]) => ({ id, ...s })), marks: LANDMARKS });

console.log(JSON.stringify(res, null, 1).slice(0, 900));
await page.goto('https://spum.soonsoon.ai/studio/?section=map', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(12000);
await page.screenshot({ path: 'spum/screenshots/40-map.png' });
console.log('맵 화면 스크린샷 저장');
process.exit(0);
