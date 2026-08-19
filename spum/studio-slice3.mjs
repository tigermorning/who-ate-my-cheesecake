import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('spum.soonsoon.ai'));
await page.bringToFront();
const ed = () => page.frames().find(f => f.url().includes('pixel')) || page.mainFrame();
await ed().getByRole('button', { name: /^\s*Slice/i }).first().click({ timeout: 20000 });
console.log('Slice 눌렀다');
for (let i = 0; i < 30; i++) {
  await page.waitForTimeout(5000);
  let st;
  try { st = await ed().evaluate(() => (document.body.innerText.match(/(\d+)\s*resources|Sliced reference:[^\n]{0,60}/g) || []).slice(-2).join(' | ')); } catch { continue; }
  if (i % 2 === 0) console.log(' ', st.slice(0, 110));
  if (/resources/.test(st)) break;
}
await page.screenshot({ path: 'spum/screenshots/53-sliced-ref.png' });
const info = await page.evaluate(() => {
  const t = JSON.parse(localStorage.getItem('sv_studio_smo_v1') || '[]').find(o => (o.name || '').includes('Who Ate My'));
  const tiles = t?.mapTheme?.tiles || [];
  const roles = {}; tiles.forEach(x => roles[x.role || '?'] = (roles[x.role || '?'] || 0) + 1);
  return { grid: t?.mapTheme?.grid, n: tiles.length, roles, sample: tiles.slice(0, 3).map(x => ({ id: x.id, cells: x.cells })) };
});
console.log('테마:', JSON.stringify(info).slice(0, 400));
process.exit(0);
