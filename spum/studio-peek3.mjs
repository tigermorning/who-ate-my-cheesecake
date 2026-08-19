import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('spum.soonsoon.ai'));
const r = await page.evaluate(() => {
  const maps = JSON.parse(localStorage.getItem('sv_studio_maps_v1') || '[]');
  const base = maps.find(m => m.id !== 'MAP_cheesecake_house');
  const ts = base.tilesets.find(t => t.source === 'map-theme');
  const pairs = Object.entries(ts.tileProperties).slice(0, 10).map(([k, v]) => [Number(k), v.smoTileId, v.sourceCell]);
  const theme = JSON.parse(localStorage.getItem('sv_studio_smo_v1') || '[]').find(o => o.id === ts.themeId);
  const tiles = theme?.mapTheme?.tiles || [];
  const idxOf = id => tiles.findIndex(t => String(t.id) === String(id));
  return {
    tileIdBase: ts.tileIdBase, columns: ts.columns, themeTiles: tiles.length,
    pairs: pairs.map(([packed, id, cell]) => ({ packed, id, idx: idxOf(id), cell, diffId: packed - Number(id), diffIdx: packed - idxOf(id) })),
  };
});
console.log(JSON.stringify(r, null, 1).slice(0, 1200));
process.exit(0);
