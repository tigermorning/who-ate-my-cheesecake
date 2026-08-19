// 참조 그림을 소스로 지정하고, 그 구도대로 SPUM 이 레퍼런스를 생성하게 한다.
import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('spum.soonsoon.ai'));
await page.bringToFront();
const ed = () => page.frames().find(f => f.url().includes('pixel')) || page.mainFrame();
const click = async (re, label) => {
  const r = await ed().evaluate((pat) => {
    const rx = new RegExp(pat);
    const btn = [...document.querySelectorAll('button')].find(x => rx.test((x.textContent || '').replace(/\s+/g, ' ').trim()));
    if (!btn) return 'none';
    btn.click(); return 'ok';
  }, re);
  console.log(label, r);
  await page.waitForTimeout(2500);
  return r;
};

// 1375x1144 짜리 원본을 고른다
await click('reference-house 1375x1144', '원본 선택:');
await click('^Use Source$', 'Use Source:');
await page.waitForTimeout(3000);
await page.screenshot({ path: 'spum/screenshots/51-source-used.png' });

// 소스를 바탕으로 레퍼런스 생성
await click('Generate Reference', 'Generate Reference:');
const t0 = Date.now();
for (let i = 0; i < 90; i++) {
  await page.waitForTimeout(7000);
  let st;
  try {
    st = await ed().evaluate(() => {
      const t = document.body.innerText;
      return { busy: /진행중|Stop/.test(t), fail: (t.match(/generation failed[^\n]{0,60}/) || [''])[0],
               refs: (t.match(/(\d+)\/10\s*refs/) || [0, '?'])[1] };
    });
  } catch { continue; }
  if (st.fail) { console.log('실패:', st.fail); break; }
  if (!st.busy) { console.log(`${Math.round((Date.now() - t0) / 1000)}초 — 끝. refs=${st.refs}`); break; }
  if (i % 4 === 0) console.log(`  …${Math.round((Date.now() - t0) / 1000)}초 refs=${st.refs}`);
}
await page.screenshot({ path: 'spum/screenshots/52-ref-generated.png' });
process.exit(0);
