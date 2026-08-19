// 생성된 레퍼런스를 16x16 으로 자르고 분류한다.
import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = b.contexts()[0];
const page = ctx.pages().find(p => p.url().includes('spum.soonsoon.ai')) || ctx.pages()[0];
await page.bringToFront();
const ed = () => page.frames().find(f => f.url().includes('pixel')) || page.mainFrame();
const tiles = async () => { try { return Number((await ed().evaluate(() => (document.body.innerText.match(/(\d+)\s*tiles/) || [0,'0'])[1]))); } catch { return -1; } };

console.log('자르기 전 타일:', await tiles());
await ed().getByRole('button', { name: /^\s*Slice/i }).first().click();
for (let i = 0; i < 30; i++) {
  await page.waitForTimeout(5000);
  const n = await tiles();
  if (i % 3 === 0) console.log('  자르는 중… 타일', n);
  if (n > 0) { console.log('잘렸다. 타일', n); break; }
}
await page.screenshot({ path: 'spum/screenshots/27-sliced.png' });

console.log('Classify 간다');
await ed().getByRole('button', { name: /Classify/i }).first().click();
let last = -1;
for (let i = 0; i < 60; i++) {
  await page.waitForTimeout(6000);
  let st;
  try {
    st = await ed().evaluate(() => {
      const txt = document.body.innerText;
      return { busy: /진행중|분류/.test(txt), roles: (txt.match(/\b(floor|wall|water|prop)\s*\d+/g) || []).length,
               tiles: (txt.match(/(\d+)\s*tiles/) || [0,'0'])[1] };
    });
  } catch { continue; }
  if (st.roles !== last) { console.log(`  ${i*6}초 타일 ${st.tiles} · 분류된 것 ${st.roles}`); last = st.roles; }
  if (st.roles > 20 && !st.busy) break;
}
await page.screenshot({ path: 'spum/screenshots/28-classified.png' });
console.log('끝');
process.exit(0);
