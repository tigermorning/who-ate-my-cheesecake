// Studio 화면에서 무엇을 누를 수 있는지 훑는다. 쓰지 않는다.
//   node spum/studio-explore.mjs [section]     section: object | map | world
import { chromium } from 'playwright';
import path from 'node:path';
const PROFILE = path.join(process.env.TEMP || process.env.LOCALAPPDATA, 'spum-chrome-profile');
const SECTION = process.argv[2] || 'object';
const ctx = await chromium.launchPersistentContext(PROFILE, { headless: false, viewport: { width: 1500, height: 950 } });
const page = ctx.pages()[0] || await ctx.newPage();
await page.goto(`https://spum.soonsoon.ai/studio/?section=${SECTION}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(7000);

const dump = async (frame, tag) => {
  const r = await frame.evaluate(() => {
    const vis = el => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
    const txt = el => (el.textContent || el.value || el.placeholder || el.title || '').trim().replace(/\s+/g, ' ').slice(0, 42);
    const btns = [...document.querySelectorAll('button,[role=button],a.btn')].filter(vis).map(txt).filter(Boolean);
    const inputs = [...document.querySelectorAll('input,textarea,select')].filter(vis).map(e =>
      `${e.tagName.toLowerCase()}[${e.type || ''}] ${e.id || e.name || ''} "${txt(e)}"` +
      (e.tagName === 'SELECT' ? ' {' + [...e.options].map(o => o.value).slice(0, 8).join('|') + '}' : ''));
    const files = [...document.querySelectorAll('input[type=file]')].map(e => e.id || e.name || e.accept || 'file');
    const tabs = [...document.querySelectorAll('[role=tab],.tab,.nav-item')].filter(vis).map(txt).filter(Boolean);
    return { btns: [...new Set(btns)], inputs, files, tabs: [...new Set(tabs)], iframes: [...document.querySelectorAll('iframe')].map(f => f.src.slice(-60)) };
  });
  console.log(`── ${tag} ──`);
  console.log('탭:', r.tabs.join(' | '));
  console.log('버튼:', r.btns.join(' | '));
  console.log('입력:', r.inputs.join('\n      '));
  console.log('파일칸:', r.files.join(', '), '| iframe:', r.iframes.join(', '));
};
await dump(page, SECTION);
for (const f of page.frames()) if (f !== page.mainFrame()) await dump(f, 'iframe ' + f.url().slice(-50));
if (!process.argv.includes('--close')) { console.log('열어 둔다'); await new Promise(() => {}); }
await ctx.close();
