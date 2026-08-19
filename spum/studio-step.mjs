// Studio 를 한 걸음씩 몬다. 브라우저는 닫지 않는다.
//   node spum/studio-step.mjs <step> [--close]
// step: new | dump | theme | generate | slice | classify | save
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const PROFILE = path.join(process.env.TEMP || process.env.LOCALAPPDATA, 'spum-chrome-profile');
const STEP = process.argv[2] || 'dump';
const SHOTS = path.join(DIR, 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

const ctx = await chromium.launchPersistentContext(PROFILE, { headless: false, viewport: { width: 1500, height: 950 } });
const page = ctx.pages()[0] || await ctx.newPage();
if (!page.url().includes('spum.soonsoon.ai/studio')) {
  await page.goto('https://spum.soonsoon.ai/studio/?section=object', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(7000);
}
const ed = () => page.frames().find(f => f.url().includes('pixel')) || page.mainFrame();

const dump = async (f, tag) => {
  const r = await f.evaluate(() => {
    const vis = el => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
    const t = el => (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    return {
      btns: [...new Set([...document.querySelectorAll('button')].filter(vis).map(t).filter(Boolean))].slice(0, 60),
      dlg: [...document.querySelectorAll('dialog[open],.modal,[role=dialog]')].filter(vis).map(t).slice(0, 4),
    };
  });
  console.log(`[${tag}] 버튼:`, r.btns.join(' | '));
  if (r.dlg.length) console.log(`[${tag}] 창:`, r.dlg.join(' /// ').slice(0, 600));
};

if (STEP === 'new') {
  await page.getByRole('button', { name: /New SMO/i }).first().click();
  await page.waitForTimeout(2500);
  await dump(page, 'main');
  await page.screenshot({ path: path.join(SHOTS, '10-newsmo.png') });
} else {
  await dump(page, 'main');
  await dump(ed(), 'editor');
  await page.screenshot({ path: path.join(SHOTS, '10-studio.png') });
}
console.log('스크린샷:', SHOTS);
if (process.argv.includes('--close')) await ctx.close(); else { console.log('열어 둔다'); await new Promise(() => {}); }
