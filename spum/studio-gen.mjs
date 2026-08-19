// 레퍼런스 이미지를 만든다. 504 가 나면 프롬프트를 줄여 가며 다시 시도한다.
import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = b.contexts()[0];
const page = ctx.pages().find(p => p.url().includes('spum.soonsoon.ai')) || ctx.pages()[0];
await page.bringToFront();
const ed = () => page.frames().find(f => f.url().includes('pixel')) || page.mainFrame();
const setVal = (f, sel, val) => f.evaluate(([s, v]) => {
  const el = document.querySelector(s); if (!el) return 'no';
  const proto = el.tagName === 'SELECT' ? HTMLSelectElement : (el.tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement);
  Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, v);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return 'ok';
}, [sel, val]);

// 짧을수록 잘 통과한다. 길이를 줄여 가며 시도한다.
const TRIES = [
  'top-down 3/4 tileset sheet, 16x16 grid, bright cozy house and garden: oak plank floor, stone kitchen floor, blue bath tile, wool rugs, lawn grass, stone path, garden soil, cream plaster walls with wood trim, white picket fence, windows, wooden doors, fridge, stove, counters, dining table, chairs, stone fireplace, sofas, bookshelves, desk, bathtub, potted plants, vegetable beds, deck boards. painterly pixel art, sunny, no text',
  'top-down 3/4 tileset sheet, 16x16 grid, cozy house and garden: wood floor, stone floor, bath tile, rugs, grass, stone path, soil, cream walls, fence, windows, doors, fridge, stove, table, chairs, fireplace, sofa, bookshelf, desk, bathtub, plants, vegetable beds, deck. pixel art, sunny, no text',
  'top-down tileset sheet 16x16 grid, cozy house and garden, wood and stone floors, cream walls, fence, furniture, plants. pixel art, no text',
];

for (let t = 0; t < TRIES.length; t++) {
  console.log(`\n[${t + 1}번째] 프롬프트 ${TRIES[t].length}자`);
  await setVal(ed(), '#resourcePromptInput', TRIES[t]);
  await page.waitForTimeout(1200);
  await ed().getByRole('button', { name: /Generate/i }).first().click();
  const t0 = Date.now();
  let verdict = null;
  for (let i = 0; i < 90; i++) {
    await page.waitForTimeout(6000);
    let st;
    try {
      st = await ed().evaluate(() => {
        const txt = document.body.innerText;
        return { busy: /진행중/.test(txt), stop: /Stop/.test(txt),
                 fail: /generation failed[^\n]*/.exec(txt)?.[0]?.slice(0, 80) || '',
                 imgs: [...document.querySelectorAll('img')].filter(im => im.naturalWidth > 200)
                        .map(im => im.src).filter(s => !s.includes('/assets/map-theme/base')) };
      });
    } catch { continue; }
    if (st.imgs.length) { verdict = 'ok'; console.log(`  ${Math.round((Date.now()-t0)/1000)}초 — 이미지 나왔다:`, st.imgs[0].slice(0, 60)); break; }
    if (!st.busy && !st.stop) {
      if (st.fail) { verdict = 'fail'; console.log(`  ${Math.round((Date.now()-t0)/1000)}초 — 실패:`, st.fail); }
      else { verdict = 'idle'; console.log(`  ${Math.round((Date.now()-t0)/1000)}초 — 멈췄는데 결과가 없다`); }
      break;
    }
    if (i % 5 === 0) console.log(`  …${Math.round((Date.now()-t0)/1000)}초`);
  }
  await page.screenshot({ path: `spum/screenshots/26-gen-try${t + 1}.png` });
  if (verdict === 'ok') { console.log('성공'); process.exit(0); }
  await page.waitForTimeout(4000);
}
console.log('세 번 다 실패했다');
process.exit(4);
