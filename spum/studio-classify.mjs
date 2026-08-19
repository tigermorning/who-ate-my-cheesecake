// 잘린 리소스에 역할을 붙인다(Classify). 끝나면 타일 목록을 뽑는다.
import { chromium } from 'playwright';
import fs from 'node:fs';
const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = b.contexts()[0];
const page = ctx.pages().find(p => p.url().includes('spum.soonsoon.ai')) || ctx.pages()[0];
await page.bringToFront();
const ed = () => page.frames().find(f => f.url().includes('pixel')) || page.mainFrame();

await ed().getByRole('button', { name: /Classify/i }).first().click({ timeout: 20000 });
console.log('Classify 눌렀다');
let last = '';
for (let i = 0; i < 70; i++) {
  await page.waitForTimeout(6000);
  let st;
  try {
    st = await ed().evaluate(() => {
      const t = document.body.innerText;
      return { busy: /진행중|분류 중|Classifying/.test(t),
               line: (t.match(/Slice[\s\S]{0,90}/) || [''])[0].replace(/\s+/g, ' ').slice(0, 90),
               roles: (t.match(/\b(floor|wall|water|prop|door|rug)\s*\d+/gi) || []).length };
    });
  } catch { continue; }
  if (st.line !== last) { console.log(`  ${i * 6}초 역할 ${st.roles} · ${st.line}`); last = st.line; }
  if (st.roles > 30 && !st.busy) { console.log('분류 끝'); break; }
}
await page.screenshot({ path: 'spum/screenshots/35-classified.png' });

// 테마에 실제로 들어간 타일을 저장소에서 뽑는다
const info = await page.evaluate(() => {
  const smo = JSON.parse(localStorage.getItem('sv_studio_smo_v1') || '[]');
  const t = smo.find(o => (o.name || '').includes('Who Ate My'));
  if (!t || !t.mapTheme) return { err: '테마를 못 찾았다', names: smo.map(o => o.name) };
  const tiles = t.mapTheme.tiles || [];
  const byRole = {};
  tiles.forEach(x => { byRole[x.role || x.category || '?'] = (byRole[x.role || x.category || '?'] || 0) + 1; });
  return { id: t.id, grid: t.mapTheme.grid, tileSize: t.mapTheme.tileSize, count: tiles.length, byRole,
           sample: tiles.slice(0, 6).map(x => ({ id: x.id, name: x.name, role: x.role, cells: x.cells?.length, cat: x.category })) };
});
console.log('테마:', JSON.stringify(info, null, 1).slice(0, 900));
fs.writeFileSync('spum/theme-report.json', JSON.stringify(info, null, 1));
process.exit(0);
