import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('spum.soonsoon.ai'));
const r = await page.evaluate(async () => {
  const res = await fetch('/api/studio/state');
  const j = await res.json();
  const st = j.state || j;
  const storage = j.storage || st.storage || {};
  const keys = Object.keys(storage);
  const readK = k => { try { return JSON.parse(storage[k]); } catch { return null; } };
  const chars = readK('sv_studio_characters_v1');
  const maps = readK('sv_studio_maps_v1');
  const smo = readK('sv_studio_smo_v1');
  return {
    storageKeys: keys.filter(k => /sv_studio/.test(k)),
    서버캐릭터: Array.isArray(chars) ? chars.map(c => c.id + ':' + c.name) : String(chars).slice(0, 60),
    서버맵: Array.isArray(maps) ? maps.map(m => m.name + ' ' + m.width + 'x' + m.height) : '?',
    서버SMO: Array.isArray(smo) ? smo.map(o => o.name).slice(0, 10) : '?',
    rev: st.revision ?? j.revision,
  };
});
console.log(JSON.stringify(r, null, 1).slice(0, 1200));
process.exit(0);
