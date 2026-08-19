import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('spum.soonsoon.ai'));
await page.bringToFront();
await page.goto('https://spum.soonsoon.ai/studio/?section=cast', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(12000);
const names = await page.evaluate(() => [...document.querySelectorAll('[class*=card],li')]
  .map(e => (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 24)).filter(t => /하루|미나|코코|루루|피치|루비|요루|혀누|훈훈|순순/.test(t)).slice(0, 14));
console.log('화면의 캐릭터:', names.join(' | ').slice(0, 300));
await page.screenshot({ path: 'spum/screenshots/61-cast.png' });
process.exit(0);
