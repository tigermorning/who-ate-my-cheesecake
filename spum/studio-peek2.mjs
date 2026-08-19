import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('spum.soonsoon.ai'));
const r = await page.evaluate(() => {
  const t = JSON.parse(localStorage.getItem('sv_studio_smo_v1') || '[]').find(o => (o.name || '').includes('Who Ate My'));
  const mt = t.mapTheme, tiles = mt.tiles || [];
  const keys = Object.keys(tiles[0] || {});
  const es = mt.editorState || {};
  const sr = es.resourceSliceResult || {};
  return {
    tileKeys: keys,
    first3: tiles.slice(0, 3).map(x => ({ id: x.id, order: x.order, count: x.count, cells: x.cells, asset: (x.assetId || '').slice(0, 16) })),
    sortMode: es.sliceSortMode, grid: mt.grid, tileSize: mt.tileSize,
    sliceKeys: Object.keys(sr),
    sheet: JSON.stringify(sr.resourceSheet).slice(0, 300),
    srcCols: sr.sourceColumns, srcRows: sr.sourceRows,
    tileMapType: Array.isArray(sr.tileMap) ? 'array' : typeof sr.tileMap,
    tileMapLen: sr.tileMap ? (sr.tileMap.length || Object.keys(sr.tileMap).length) : 0,
    tileMapHead: JSON.stringify(Array.isArray(sr.tileMap) ? sr.tileMap.slice(0, 12) : Object.entries(sr.tileMap || {}).slice(0, 6)),
    groupsLen: (sr.resourceGroups || []).length,
    group0: JSON.stringify((sr.resourceGroups || [])[0] || {}).slice(0, 240),
    esKeys: Object.keys(es),
  };
});
console.log(JSON.stringify(r, null, 1).slice(0, 1500));
process.exit(0);
