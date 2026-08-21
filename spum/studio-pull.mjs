// 사용자 크롬 프로필(%TEMP%\spum-chrome-profile)로 Studio 를 열어
// 그 브라우저의 localStorage 에 있는 맵·테마를 훑는다. 목록만 본다 — 아무것도 안 고친다.
import { chromium } from 'playwright';
import path from 'node:path';
const PROFILE = path.join(process.env.TEMP || '/tmp', 'spum-chrome-profile');
const ctx = await chromium.launchPersistentContext(PROFILE, { headless: false, viewport: { width: 1500, height: 950 } });
const page = ctx.pages()[0] || await ctx.newPage();
await page.goto('https://spum.soonsoon.ai/studio/?section=map', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(9000);
const r = await page.evaluate(async () => {
  const L = k => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } };
  const maps = L('sv_studio_maps_v1'), smo = L('sv_studio_smo_v1'), cast = L('sv_studio_characters_v1');
  let server = null;
  try { const j = await (await fetch('/api/studio/state')).json(); server = j.ok === false ? j.error : (j.state?.revision ?? '?'); } catch (e) { server = 'ERR'; }
  return {
    server,
    maps: maps.map(m => `${m.id} | ${m.name} | ${m.width}x${m.height} | theme=${m.mapThemeId} | blocked=${m.layers.find(l=>l.type==='obstacle')?.data.reduce((a,b)=>a+b,0)} | ${m.savedAt}`),
    themes: smo.filter(o => o.category === 'map-theme').map(o =>
      `${o.id} | ${o.name} | tiles=${(o.mapTheme?.tiles||[]).length} | grid=${o.mapTheme?.grid} | src=${o.mapTheme?.source?.name || '-'} | ${o.mapTheme?.updatedAt || ''}`),
    cast: cast.length,
  };
});
console.log('서버 revision:', r.server, '· 캐스트', r.cast);
console.log('맵');   r.maps.forEach(m => console.log('  ' + m));
console.log('테마'); r.themes.forEach(t => console.log('  ' + t));
if (!process.argv.includes('--close')) { console.log('\n창은 열어 둔다 (닫으려면 --close)'); await new Promise(() => {}); }
await ctx.close(); process.exit(0);
