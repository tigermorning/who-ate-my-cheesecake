// 에디터 붓으로 한 칸 칠하고 저장값을 읽어 번호 규칙을 확정한다.
import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('spum.soonsoon.ai'));
await page.bringToFront();

const brush = await page.evaluate(() => (document.body.innerText.match(/(detail|floor|wall|water|object)\s*\d+/) || [''])[0]);
console.log('현재 붓:', brush);

const cvs = await page.$$('canvas');
console.log('캔버스 개수:', cvs.length);
let target = null, box = null;
for (const c of cvs) { const bb = await c.boundingBox(); if (bb && bb.width > 300 && bb.height > 300) { target = c; box = bb; break; } }
if (!target) { console.log('큰 캔버스를 못 찾았다'); process.exit(2); }
console.log('캔버스', JSON.stringify(box));

const before = await page.evaluate(() => {
  const m = JSON.parse(localStorage.getItem('sv_studio_maps_v1')).find(x => x.id === 'MAP_cheesecake_house');
  const d = m.layers.find(l => l.type === 'back').data;
  return { at0: d[0], at100: d[100] };
});
console.log('칠하기 전:', JSON.stringify(before));

// 캔버스 왼쪽 위 근처를 정확히 누른다
const px = box.x + 20, py = box.y + 20;
await page.mouse.move(px, py);
await page.mouse.down();
await page.mouse.move(px + 2, py + 2);
await page.mouse.up();
await page.waitForTimeout(2500);

const after = await page.evaluate(() => {
  const m = JSON.parse(localStorage.getItem('sv_studio_maps_v1')).find(x => x.id === 'MAP_cheesecake_house');
  const d = m.layers.find(l => l.type === 'back').data;
  const changed = [];
  return { first20: d.slice(0, 20) };
});
console.log('칠한 뒤 앞 20칸:', JSON.stringify(after.first20));
process.exit(0);
