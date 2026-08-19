// 지금 Studio 가 어떤 상태인지 점검한다. 아무것도 바꾸지 않는다.
import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = b.contexts()[0];
const page = ctx.pages().find(p => p.url().includes('spum.soonsoon.ai')) || ctx.pages()[0];
await page.bringToFront();
const r = await page.evaluate(async () => {
  const maps = JSON.parse(localStorage.getItem('sv_studio_maps_v1') || '[]');
  const smo = JSON.parse(localStorage.getItem('sv_studio_smo_v1') || '[]');
  const chars = JSON.parse(localStorage.getItem('sv_studio_characters_v1') || '[]');
  const me = await fetch('/api/me').then(r => r.json()).catch(() => ({}));
  const ours = maps.find(m => m.id === 'MAP_cheesecake_house');
  const theme = smo.find(o => (o.name || '').includes('Who Ate My'));
  const backNonZero = ours ? ours.layers.find(l => l.type === 'back').data.filter(Boolean).length : 0;
  return {
    url: location.href,
    로그인: !!me.user,
    맵: maps.map(m => `${m.name} ${m.width}x${m.height} v${m.version}`),
    우리맵: ours ? { 칸: ours.width * ours.height, 채운칸: backNonZero, 레이어: ours.layers.map(l => l.type),
                    타일셋: ours.tilesets.map(t => `${t.themeName} base=${t.tileIdBase} cols=${t.columns} props=${Object.keys(t.tileProperties).length}`) } : null,
    테마: theme ? { id: theme.id, 타일: (theme.mapTheme?.tiles || []).length, 격자: theme.mapTheme?.grid,
                    소스: theme.mapTheme?.source?.name } : null,
    SMO수: smo.length, 캐릭터수: Array.isArray(chars) ? chars.length : 'not-array',
    캐릭터: Array.isArray(chars) ? chars.map(c => c.name).slice(0, 12) : [],
  };
});
console.log(JSON.stringify(r, null, 1));
await page.screenshot({ path: 'spum/screenshots/60-state.png' });
process.exit(0);
