// SPUM Studio 의 저장 구조를 살펴본다. 쓰지 않는다 — 읽기만.
//   node spum/studio-probe.mjs      (Windows node 로. 프로필에 로그인이 붙어 있다)
import { chromium } from 'playwright';
import path from 'node:path';

const PROFILE = path.join(process.env.TEMP || process.env.LOCALAPPDATA, 'spum-chrome-profile');
const URL_ = process.env.STUDIO_URL || 'https://spum.soonsoon.ai/studio/';

const ctx = await chromium.launchPersistentContext(PROFILE, { headless: false, viewport: { width: 1400, height: 900 } });
const page = ctx.pages()[0] || await ctx.newPage();
await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);

const me = await page.evaluate(() => fetch('/api/me').then(r => r.json()).catch(e => ({ err: String(e) })));
console.log('로그인:', JSON.stringify(me).slice(0, 120));

const info = await page.evaluate(() => {
  const out = { keys: [], sizes: {}, api: [], maps: null, smo: null, draft: null };
  for (const k of Object.keys(localStorage)) {
    const v = localStorage.getItem(k) || '';
    out.keys.push(k);
    out.sizes[k] = v.length;
  }
  out.api = Object.keys(window.spumStudioData || {});
  const read = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
  const maps = read('sv_studio_maps_v1');
  if (Array.isArray(maps)) out.maps = { count: maps.length, first: Object.keys(maps[0] || {}), names: maps.map(m => m.name).slice(0, 8) };
  const smo = read('sv_studio_smo_v1');
  if (Array.isArray(smo)) out.smo = { count: smo.length, first: Object.keys(smo[0] || {}), keys: smo.map(o => o.key || o.id).slice(0, 12) };
  const d = read('sv_studio_draft_v1');
  if (d) out.draft = { type: Array.isArray(d) ? 'array' : 'object', keys: Object.keys(Array.isArray(d) ? (d[0] || {}) : d).slice(0, 30) };
  return out;
});
console.log('키:', info.keys.map(k => `${k}(${info.sizes[k]})`).join('\n     '));
console.log('spumStudioData:', info.api.join(', '));
console.log('maps:', JSON.stringify(info.maps));
console.log('smo:', JSON.stringify(info.smo));
console.log('draft:', JSON.stringify(info.draft));

// 맵 하나의 모양 (데이터는 빼고 뼈대만)
const shape = await page.evaluate(() => {
  const maps = JSON.parse(localStorage.getItem('sv_studio_maps_v1') || '[]');
  const m = maps[0]; if (!m) return null;
  const slim = JSON.parse(JSON.stringify(m));
  (slim.layers || []).forEach(l => { l.data = `[${(l.data || []).length}]`; });
  (slim.tilesets || []).forEach(t => {
    t.tileProperties = `{${Object.keys(t.tileProperties || {}).length}}`;
    t.tiles = `[${(t.tiles || []).length}]`;
    if (t.imageUrl) t.imageUrl = t.imageUrl.slice(0, 60) + '…';
  });
  return slim;
});
console.log('맵 뼈대:', JSON.stringify(shape).slice(0, 1800));
if (!process.argv.includes('--close')) { console.log('열어 둔다'); await new Promise(() => {}); }
await ctx.close();
