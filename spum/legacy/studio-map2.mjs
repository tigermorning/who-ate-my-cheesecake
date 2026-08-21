// 44x36 타일을 칸마다 1:1 로 깔아 맵을 만든다. 통행은 도면(house.mjs)이 정한다.
import { chromium } from 'playwright';
import { W, H, GRID, buildBlocked, ZONES, SPOT, LANDMARKS } from './house.mjs';

const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('spum.soonsoon.ai'));
await page.bringToFront();
const blocked = Array.from(buildBlocked());

const res = await page.evaluate(async ({ W, H, blocked, zones, spots, marks }) => {
  const out = { steps: [] };
  const smo = JSON.parse(localStorage.getItem('sv_studio_smo_v1') || '[]');
  const theme = smo.find(o => (o.name || '').includes('Who Ate My') && o.mapTheme);
  if (!theme) return { err: '테마 없음' };
  const tiles = theme.mapTheme.tiles || [];
  const BASE = 2049, COLS = W;
  // 패킹 번호는 타일 id 가 아니라 **테마 타일 배열의 순서**를 따른다.
  // (기본맵은 id 가 1부터라 우연히 같았다. 이 테마는 45부터 시작해 45칸이 밀렸다.)
  const idxOf = new Map(tiles.map((t, i) => [t, i]));
  const packed = t => BASE + idxOf.get(t) + 1;

  // 칸 -> 타일. 한 타일이 여러 칸을 대표할 수 있다(같은 그림은 합쳐진다).
  const cell = new Array(W * H).fill(0);
  let filled = 0;
  tiles.forEach((t) => {
    const p = packed(t); if (!isFinite(p)) return;
    (t.cells || []).forEach(c => {
      const x = c.column - 1, y = c.row - 1;
      if (x >= 0 && y >= 0 && x < W && y < H && !cell[y * W + x]) { cell[y * W + x] = p; filled++; }
    });
  });
  out.steps.push(`타일 ${tiles.length}장 · 채운 칸 ${filled}/${W * H}`);

  const tileProperties = {};
  const tsTiles = [];
  tiles.forEach(t => {
    const p = packed(t); if (!isFinite(p)) return;
    // sourceCell 은 원본 그림 좌표가 아니라 **테마 시트 안의 자리**다.
    // 중복이 합쳐져 1584칸 -> 1385장이 됐으니, 순번으로 다시 계산한다.
    const i = idxOf.get(t);
    const c = { column: (i % COLS) + 1, row: Math.floor(i / COLS) + 1 };
    tileProperties[String(p)] = {
      smoThemeId: theme.id, smoThemeName: theme.name, smoTileId: t.id, name: t.name,
      category: t.category, movement: t.movement, interaction: t.interaction || 'none',
      blocksMovement: !!(t.properties && t.properties.blocksMovement),
      blocksVision: !!(t.properties && t.properties.blocksVision),
      moveSpeed: (t.properties && t.properties.moveSpeed) ?? 1,
      sourceCell: c, sourceCells: [c],
    };
    tsTiles.push({ id: t.id, name: t.name, category: t.category, movement: t.movement,
      interaction: t.interaction || 'none', role: t.role, cells: [c],
      assetId: t.assetId, imageDataUrl: t.imageDataUrl || '', properties: t.properties || {} });
  });

  const now = new Date().toISOString();
  const map = {
    id: 'MAP_cheesecake_house', name: 'Who Ate My Cheesecake? · 집',
    description: '참조 그림을 SPUM 맵 테마로 떠서 칸마다 깐 집과 뜰',
    version: 2, width: W, height: H, tileSize: 32,
    tileSetAssetId: 'theme_' + theme.id, mapThemeId: theme.id, savedAt: now,
    layers: [
      { name: 'back_1', type: 'back', label: '바닥', data: cell },
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

  try { await window.spumStudioData.export(); out.steps.push('백업 완료'); } catch (e) { out.steps.push('백업 실패'); }
  const KEY = 'sv_studio_maps_v1';
  const maps = JSON.parse(localStorage.getItem(KEY) || '[]');
  const i = maps.findIndex(m => m.id === map.id);
  if (i >= 0) maps[i] = map; else maps.push(map);
  localStorage.setItem(KEY, JSON.stringify(maps));
  window.dispatchEvent(new CustomEvent('spum:studio-storage-write', { detail: { key: KEY } }));
  try { await window.spumStudioData.saveServerSnapshot('manual'); out.steps.push('서버 저장 완료'); }
  catch (e) { out.steps.push('서버 저장 실패 ' + e.message); }
  return out;
}, { W, H, blocked, zones: ZONES, spots: Object.entries(SPOT).map(([id, s]) => ({ id, ...s })), marks: LANDMARKS });

console.log(JSON.stringify(res, null, 1).slice(0, 600));
await page.goto('https://spum.soonsoon.ai/studio/?section=map', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(13000);
await page.evaluate(() => {
  document.querySelectorAll('input[type=checkbox]').forEach(cb => {
    const row = cb.closest('div,li,tr');
    if (row && /NAV/.test(row.textContent || '') && cb.checked) cb.click();
  });
});
await page.waitForTimeout(2500);
await page.screenshot({ path: 'spum/screenshots/54-map-traced.png' });
console.log('찍었다');
process.exit(0);
