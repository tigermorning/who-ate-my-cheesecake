// 생성이 진짜 끝날 때까지 기다린다. 신호는 「진행중」이 사라지고 Stop 이 Generate 로 돌아오는 것.
import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = b.contexts()[0];
const page = ctx.pages().find(p => p.url().includes('spum.soonsoon.ai')) || ctx.pages()[0];
const ed = () => page.frames().find(f => f.url().includes('pixel')) || page.mainFrame();
const t0 = Date.now();
let last = null;
for (let i = 0; i < 200; i++) {
  let st;
  try {
    st = await ed().evaluate(() => {
      const txt = document.body.innerText;
      const cards = [...document.querySelectorAll('img')].map(im => ({ w: im.naturalWidth, src: im.src.slice(0, 80) }))
        .filter(x => x.w > 200);
      return { busy: /진행중/.test(txt), stop: /Stop/.test(txt),
               status: (document.body.innerText.match(/reference generation[^\n]*/) || [''])[0].slice(0, 90),
               imgs: cards.map(c => c.src) };
    });
  } catch { await page.waitForTimeout(6000); continue; }
  const gen = st.imgs.filter(s => !s.includes('/assets/map-theme/base'));
  const line = `busy=${st.busy} stop=${st.stop} 생성물=${gen.length}`;
  if (line !== last) { console.log(`  ${Math.round((Date.now() - t0) / 1000)}초 ${line} ${st.status}`); last = line; }
  if (!st.busy && !st.stop && gen.length) { console.log('생성 끝. 생성물:', gen[0]); break; }
  await page.waitForTimeout(6000);
}
await page.screenshot({ path: 'spum/screenshots/25-gen-done.png' });
process.exit(0);
