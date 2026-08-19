import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('spum.soonsoon.ai'));
await page.bringToFront();
// NAV 끄기
for (let k = 0; k < 3; k++) {
  await page.evaluate(() => document.querySelectorAll('input[type=checkbox]').forEach(cb => {
    const row = cb.closest('div,li,tr');
    if (row && /NAV|워커블|장애물/.test(row.textContent || '') && cb.checked) cb.click();
  }));
  await page.waitForTimeout(400);
}
// VIEW 픽셀 크기를 줄여 전체가 보이게
const r = await page.evaluate(() => {
  const sels = [...document.querySelectorAll('select')];
  const view = sels.find(s => s.id === 'tp-sel') || sels.find(s => [...s.options].some(o => /px$/.test(o.textContent.trim())));
  if (!view) return 'no-view-select';
  const opts = [...view.options].map(o => o.value);
  const small = opts.find(v => v === '16') || opts[0];
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(view, small);
  view.dispatchEvent(new Event('change', { bubbles: true }));
  return 'set ' + small + ' of ' + opts.join(',');
});
console.log('VIEW:', r);
await page.waitForTimeout(3000);
await page.screenshot({ path: 'spum/screenshots/57-map-whole.png' });
process.exit(0);
