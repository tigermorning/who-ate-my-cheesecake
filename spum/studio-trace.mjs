// 참조 그림을 44x36 으로 잘라 타일로 만든다. 타일 한 장 = 도면 한 칸.
import { chromium } from 'playwright';
const REF = 'C:\\Users\\user\\Documents\\who-ate-my-cheesecake\\docs\\reference-house.png';
const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = b.contexts()[0];
const page = ctx.pages().find(p => p.url().includes('spum.soonsoon.ai')) || ctx.pages()[0];
await page.bringToFront();
await page.goto('https://spum.soonsoon.ai/studio/?section=object', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(11000);
for (const n of [/건너뛰기/, /확인/]) {
  const btn = page.getByRole('button', { name: n }).first();
  if (await btn.count().catch(() => 0)) { await btn.click().catch(() => {}); await page.waitForTimeout(600); }
}
await page.evaluate(() => {
  const hit = [...document.querySelectorAll('[class*=card],li,button')].find(c => (c.textContent || '').includes('Who Ate My'));
  hit?.click();
});
await page.waitForTimeout(7000);
const ed = () => page.frames().find(f => f.url().includes('pixel')) || page.mainFrame();
const setVal = (f, sel, val) => f.evaluate(([s, v]) => {
  const el = document.querySelector(s); if (!el) return 'no:' + s;
  const proto = el.tagName === 'SELECT' ? HTMLSelectElement : (el.tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement);
  Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, v);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return 'ok';
}, [sel, val]);

console.log('grid', await setVal(ed(), '#themeGridSelect', 'custom'));
await page.waitForTimeout(700);
console.log('cols', await setVal(ed(), '#themeCustomGridColumnsInput', '44'));
console.log('rows', await setVal(ed(), '#themeCustomGridRowsInput', '36'));
console.log('guideC', await setVal(ed(), '#sourceGuideColumnsInput', '44'));
console.log('guideR', await setVal(ed(), '#sourceGuideRowsInput', '36'));
await page.waitForTimeout(1200);

// 소스를 다시 올린다 (44x36 격자 기준으로)
const input = await ed().$('#sourceImageFileInput');
if (input) { await input.setInputFiles(REF); console.log('참조 그림 올렸다'); }
await page.waitForTimeout(9000);

// 자를 대상 고르기 — 소스 자체
const sel = await ed().evaluate(() => {
  const im = [...document.querySelectorAll('img')].find(i => i.naturalWidth === 1375);
  if (!im) return 'no-1375';
  (im.closest('button,[role=button],li,[class*=card],[class*=item]') || im).click();
  return 'clicked';
});
console.log('소스 선택:', sel);
await page.waitForTimeout(2500);
const hint = await ed().evaluate(() => (document.body.innerText.match(/Slice[\s\S]{0,80}/) || [''])[0].replace(/\s+/g, ' '));
console.log('Slice 안내:', hint.slice(0, 90));
await page.screenshot({ path: 'spum/screenshots/50-trace-ready.png' });
process.exit(0);
