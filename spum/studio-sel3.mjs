import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('spum.soonsoon.ai'));
const r = await page.evaluate(() => [...document.querySelectorAll('select')].map(s =>
  `${s.id || s.className.slice(0,20)} = ${s.value} [${[...s.options].map(o => o.value + ':' + o.textContent.trim()).slice(0,8).join(', ')}]`));
console.log(r.join('\n'));
process.exit(0);
