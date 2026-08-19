// 에디터 붓으로 한 칸 칠하고, 저장된 숫자를 읽어 타일 번호 규칙을 알아낸다.
import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = b.contexts()[0];
const page = ctx.pages().find(p => p.url().includes('spum.soonsoon.ai')) || ctx.pages()[0];
await page.bringToFront();

const before = await page.evaluate(() => {
  const m = JSON.parse(localStorage.getItem('sv_studio_maps_v1') || '[]').find(x => x.id === 'MAP_cheesecake_house');
  const back = m.layers.find(l => l.type === 'back').data;
  return { w: m.width, h: m.height, sample: back.slice(0, 6), uniq: [...new Set(back)].slice(0, 8) };
});
console.log('칠하기 전:', JSON.stringify(before));

// 팔레트에서 타일 하나 고르기
const pal = await page.evaluate(() => {
  const cands = [...document.querySelectorAll('[class*=tile],[class*=palette] *')].filter(e => e.querySelector?.('img') || e.tagName === 'IMG');
  const el = cands.find(e => e.getBoundingClientRect().width > 10);
  if (!el) return 'none';
  el.click();
  return (el.getAttribute('title') || el.textContent || 'clicked').trim().slice(0, 40);
});
console.log('팔레트 선택:', pal);
await page.waitForTimeout(1200);

// 캔버스 한가운데 찍기
const cv = await page.$('canvas');
const box = await cv.boundingBox();
await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
await page.waitForTimeout(2500);

const after = await page.evaluate(() => {
  const m = JSON.parse(localStorage.getItem('sv_studio_maps_v1') || '[]').find(x => x.id === 'MAP_cheesecake_house');
  const back = m.layers.find(l => l.type === 'back').data;
  const uniq = [...new Set(back)];
  return { uniq: uniq.slice(0, 10), counts: uniq.map(u => [u, back.filter(v => v === u).length]).slice(0, 6) };
});
console.log('칠한 뒤:', JSON.stringify(after));

const theme = await page.evaluate(() => {
  const t = JSON.parse(localStorage.getItem('sv_studio_smo_v1') || '[]').find(o => (o.name || '').includes('Who Ate My'));
  const tiles = t.mapTheme.tiles;
  return { first: tiles.slice(0, 5).map(x => ({ id: x.id, role: x.role, cells: x.cells })), n: tiles.length };
});
console.log('테마 타일 앞부분:', JSON.stringify(theme));
process.exit(0);
