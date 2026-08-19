// 참조 그림을 테마 소스로 올려 44x36 으로 자른다. 타일 한 장 = 도면 한 칸.
import { chromium } from 'playwright';
const REF = 'C:\\Users\\user\\Documents\\who-ate-my-cheesecake\\docs\\reference-house.png';
const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = b.contexts()[0];
const page = ctx.pages().find(p => p.url().includes('spum.soonsoon.ai')) || ctx.pages()[0];
await page.bringToFront();
const ed = () => page.frames().find(f => f.url().includes('pixel')) || page.mainFrame();
const setVal = (f, sel, val) => f.evaluate(([s, v]) => {
  const el = document.querySelector(s); if (!el) return 'no:' + s;
  const proto = el.tagName === 'SELECT' ? HTMLSelectElement : (el.tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement);
  Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, v);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return 'ok';
}, [sel, val]);

// 격자를 도면과 같게 맞춘다
console.log('grid', await setVal(ed(), '#themeGridSelect', 'custom'));
await page.waitForTimeout(600);
console.log('cols', await setVal(ed(), '#themeCustomGridColumnsInput', '44'));
console.log('rows', await setVal(ed(), '#themeCustomGridRowsInput', '36'));
console.log('size', await setVal(ed(), '#themeTileSizeSelect', '32'));
console.log('guideC', await setVal(ed(), '#sourceGuideColumnsInput', '44'));
console.log('guideR', await setVal(ed(), '#sourceGuideRowsInput', '36'));
await page.waitForTimeout(1000);

// 참조 그림을 올린다
const input = await ed().$('#sourceImageFileInput');
if (!input) { console.log('파일칸을 못 찾았다'); process.exit(2); }
await input.setInputFiles(REF);
console.log('올렸다:', REF);
await page.waitForTimeout(9000);
await page.screenshot({ path: 'spum/screenshots/30-uploaded.png' });

const state = await ed().evaluate(() => ({
  refs: (document.body.innerText.match(/(\d+)\/(\d+)\s*refs/) || [''])[0],
  slice: /Ready to slice|Select a reference/.test(document.body.innerText) ? document.body.innerText.match(/Ready to slice|Select a reference/)[0] : '',
  tiles: (document.body.innerText.match(/(\d+)\s*tiles/) || [0, '0'])[1],
}));
console.log('상태:', JSON.stringify(state));
process.exit(0);
