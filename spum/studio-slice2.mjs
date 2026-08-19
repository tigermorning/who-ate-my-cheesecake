// 올린 참조 그림(SOURCE)을 골라 44x36 으로 자른다.
import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = b.contexts()[0];
const page = ctx.pages().find(p => p.url().includes('spum.soonsoon.ai')) || ctx.pages()[0];
await page.bringToFront();
const ed = () => page.frames().find(f => f.url().includes('pixel')) || page.mainFrame();

// 어떤 소스를 고를 수 있는지 본다
const opts = await ed().evaluate(() => {
  const imgs = [...document.querySelectorAll('img')].filter(i => i.naturalWidth > 60);
  return imgs.map((im, k) => ({ k, w: im.naturalWidth, h: im.naturalHeight, src: im.src.slice(0, 46),
    label: (im.closest('[class*=card],li,button,div')?.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40) }));
});
console.log('고를 수 있는 그림:'); opts.forEach(o => console.log(`  [${o.k}] ${o.w}x${o.h} ${o.label} ${o.src}`));

// 참조 그림 비율(1375x1144 ≈ 1.2)에 가까운 것을 고른다
const pick = opts.find(o => Math.abs(o.w / o.h - 1.2) < 0.06) || opts[opts.length - 1];
console.log('고른 것:', JSON.stringify(pick));
await ed().evaluate((k) => {
  const imgs = [...document.querySelectorAll('img')].filter(i => i.naturalWidth > 60);
  const im = imgs[k]; if (!im) return;
  (im.closest('button,[role=button],li,div[class*=card]') || im).click();
}, pick.k);
await page.waitForTimeout(2500);

const before = await ed().evaluate(() => document.body.innerText.match(/Slice[\s\S]{0,60}/)?.[0]?.replace(/\s+/g, ' ') || '');
console.log('Slice 안내:', before.slice(0, 80));
await ed().getByRole('button', { name: /^\s*Slice/i }).first().click();
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(5000);
  let n = '0';
  try { n = await ed().evaluate(() => (document.body.innerText.match(/(\d+)\s*tiles/) || [0, '0'])[1]); } catch { continue; }
  if (i % 3 === 0) console.log('  타일', n);
  if (Number(n) > 100) { console.log('잘렸다. 타일', n); break; }
}
await page.screenshot({ path: 'spum/screenshots/31-sliced44.png' });
process.exit(0);
