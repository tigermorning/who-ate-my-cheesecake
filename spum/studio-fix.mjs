// 열린 대화상자를 닫고, 격자를 16x16 으로 되돌리고, 생성된 레퍼런스를 골라 자른다.
import { chromium } from 'playwright';
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

// 1) 대화상자 닫기
const closed = await ed().evaluate(() => {
  const dlg = document.querySelector('#sourceLibraryDialog');
  if (!dlg) return 'none';
  const x = dlg.querySelector('button[class*=close],button[aria-label*=lose]')
        || [...dlg.querySelectorAll('button')].find(b => /닫기|취소|Close|×/.test(b.textContent || ''));
  if (x) { x.click(); return 'clicked'; }
  dlg.remove(); return 'removed';
});
console.log('대화상자:', closed);
await page.keyboard.press('Escape').catch(() => {});
await page.waitForTimeout(1500);

// 2) 격자를 16x16 으로 — 생성 타일셋을 자를 격자다
console.log('grid', await setVal(ed(), '#themeGridSelect', '16x16'));
console.log('guideC', await setVal(ed(), '#sourceGuideColumnsInput', '16'));
console.log('guideR', await setVal(ed(), '#sourceGuideRowsInput', '16'));
await page.waitForTimeout(1200);

// 3) 생성된 레퍼런스(refs 목록의 gpt-image 항목) 고르기
const picked = await ed().evaluate(() => {
  const cards = [...document.querySelectorAll('[class*=card],li,button,div')]
    .filter(e => /gpt-image/.test(e.textContent || '') && e.querySelector('img'));
  const c = cards[0]; if (!c) return 'none';
  c.click(); return (c.textContent || '').trim().slice(0, 40);
});
console.log('레퍼런스 선택:', picked);
await page.waitForTimeout(2500);
await page.screenshot({ path: 'spum/screenshots/32-ready.png' });
const hint = await ed().evaluate(() => (document.body.innerText.match(/Slice[\s\S]{0,70}/) || [''])[0].replace(/\s+/g, ' '));
console.log('Slice 안내:', hint.slice(0, 90));
process.exit(0);
