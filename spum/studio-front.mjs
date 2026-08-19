// 떠 있는 크롬 창을 앞으로 끌어내고 로그인 상태만 본다. 절대 닫지 않는다.
import { chromium } from 'playwright';
const b = await chromium.connectOverCDP(process.env.SPUM_CDP || 'http://127.0.0.1:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('spum.soonsoon.ai')) || b.contexts()[0].pages()[0];
await page.bringToFront();
const me = await page.evaluate(() => fetch('/api/me').then(r => r.json()).catch(e => ({ err: String(e) })));
console.log('주소:', page.url());
console.log('로그인:', JSON.stringify(me).slice(0, 140));
await page.screenshot({ path: 'spum/screenshots/16-front.png' });
process.exit(0);       // browser.close() 를 부르면 크롬이 닫힌다. 부르지 않는다.
