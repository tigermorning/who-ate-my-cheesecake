// 1024x1024 생성 레퍼런스를 골라 자른다.
import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = b.contexts()[0];
const page = ctx.pages().find(p => p.url().includes('spum.soonsoon.ai')) || ctx.pages()[0];
await page.bringToFront();
const ed = () => page.frames().find(f => f.url().includes('pixel')) || page.mainFrame();

const picked = await ed().evaluate(() => {
  const im = [...document.querySelectorAll('img')].find(i => i.naturalWidth === 1024 && i.naturalHeight === 1024);
  if (!im) return 'none';
  const host = im.closest('button,[role=button],li,[class*=card],[class*=item]') || im;
  host.click();
  return `${im.naturalWidth}x${im.naturalHeight} ${im.src.slice(0, 50)}`;
});
console.log('고른 것:', picked);
await page.waitForTimeout(2500);
let hint = await ed().evaluate(() => (document.body.innerText.match(/Slice[\s\S]{0,50}/) || [''])[0].replace(/\s+/g, ' '));
console.log('Slice 안내:', hint.slice(0, 70));

await ed().getByRole('button', { name: /^\s*Slice/i }).first().click({ timeout: 15000 });
console.log('Slice 눌렀다');
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(5000);
  let n = '0';
  try { n = await ed().evaluate(() => (document.body.innerText.match(/(\d+)\s*tiles/) || [0, '0'])[1]); } catch { continue; }
  if (i % 3 === 0) console.log('  타일', n);
  if (Number(n) > 50) { console.log('잘렸다. 타일', n); break; }
}
await page.screenshot({ path: 'spum/screenshots/34-sliced.png' });
process.exit(0);
