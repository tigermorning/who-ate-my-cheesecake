// 화면을 새로 고치고, refs 목록의 생성 레퍼런스를 정확히 눌러 고른다.
import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = b.contexts()[0];
const page = ctx.pages().find(p => p.url().includes('spum.soonsoon.ai')) || ctx.pages()[0];
await page.bringToFront();
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(11000);
const ed = () => page.frames().find(f => f.url().includes('pixel')) || page.mainFrame();

// 안내 창 닫기
for (const n of [/건너뛰기/, /확인/]) {
  const btn = page.getByRole('button', { name: n }).first();
  if (await btn.count().catch(() => 0)) { await btn.click().catch(() => {}); await page.waitForTimeout(600); }
}
// 우리 테마 열기
await page.evaluate(() => {
  const hit = [...document.querySelectorAll('[class*=card],li,button')].find(c => (c.textContent || '').includes('Who Ate My'));
  hit?.click();
});
await page.waitForTimeout(6000);

// refs 목록에서 생성물 고르기 — 썸네일을 직접 누른다
const r = await ed().evaluate(() => {
  const imgs = [...document.querySelectorAll('img')];
  const cand = imgs.filter(im => /^data:image|assets\/ai|reference/.test(im.src) && im.naturalWidth > 100);
  const info = cand.map(im => `${im.naturalWidth}x${im.naturalHeight} ${im.src.slice(0, 30)}`);
  const target = cand.find(im => Math.abs(im.naturalWidth - im.naturalHeight) < 40) || cand[0];
  if (target) target.click();
  return { info, picked: target ? `${target.naturalWidth}x${target.naturalHeight}` : 'none' };
});
console.log('refs 후보:', r.info.join(' | '));
console.log('고른 것:', r.picked);
await page.waitForTimeout(2500);
const hint = await ed().evaluate(() => (document.body.innerText.match(/Slice[\s\S]{0,50}/) || [''])[0].replace(/\s+/g, ' '));
console.log('Slice 안내:', hint.slice(0, 70));
await page.screenshot({ path: 'spum/screenshots/33-selected.png' });
process.exit(0);
