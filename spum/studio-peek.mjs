import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('spum.soonsoon.ai'));
const r = await page.evaluate(() => {
  const maps = JSON.parse(localStorage.getItem('sv_studio_maps_v1') || '[]');
  const base = maps.find(m => m.id !== 'MAP_cheesecake_house');
  const ts = (base.tilesets || []).find(t => t.source === 'map-theme');
  const back = base.layers.find(l => l.type === 'back').data;
  return {
    name: base.name, tileIdBase: ts.tileIdBase, columns: ts.columns,
    tilesLen: (ts.tiles || []).length,
    tile0keys: Object.keys((ts.tiles || [])[0] || {}),
    tile0: JSON.stringify((ts.tiles || [])[0] || {}).slice(0, 260),
    propKeys: Object.keys(ts.tileProperties || {}).slice(0, 4),
    prop0: JSON.stringify(ts.tileProperties[Object.keys(ts.tileProperties)[0]]).slice(0, 300),
    backUniq: [...new Set(back)].slice(0, 8),
  };
});
console.log(JSON.stringify(r, null, 1).slice(0, 1400));
process.exit(0);
