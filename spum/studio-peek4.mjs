import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('spum.soonsoon.ai'));
const r = await page.evaluate(() => {
  const t = JSON.parse(localStorage.getItem('sv_studio_smo_v1') || '[]').find(o => (o.name || '').includes('Who Ate My'));
  const mt = t.mapTheme, sr = mt.editorState?.resourceSliceResult || {};
  return {
    source: { id: mt.source?.id, name: mt.source?.name, w: mt.source?.width, h: mt.source?.height },
    reference: { id: mt.reference?.id, name: mt.reference?.name },
    aiInputs: (mt.aiInputs || []).map(a => a.label),
    slice: { w: sr.width, h: sr.height, cols: sr.sourceColumns, rows: sr.sourceRows, cells: sr.cellCount },
    sliceBaseAssetId: (mt.sliceBaseAssetId || '').slice(0, 24),
    selectedThemeSourceId: mt.editorState?.selectedThemeSourceId,
    selectedSliceResourceId: mt.editorState?.selectedSliceResourceId,
  };
});
console.log(JSON.stringify(r, null, 1));
process.exit(0);
