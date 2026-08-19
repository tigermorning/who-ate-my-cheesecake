// 소스 라이브러리 대화상자를 열어 무엇이 있는지 본다.
import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = b.contexts()[0].pages().find(p => p.url().includes('spum.soonsoon.ai'));
await page.bringToFront();
const ed = () => page.frames().find(f => f.url().includes('pixel')) || page.mainFrame();

const r = await ed().evaluate(() => {
  const out = { fileInputs: [], refArea: '', dialogs: [] };
  document.querySelectorAll('input[type=file]').forEach(i => out.fileInputs.push(`${i.id || i.name} accept=${i.accept}`));
  const refBox = [...document.querySelectorAll('div,section')].find(e => /refs\b/.test(e.textContent || '') && e.children.length < 30);
  out.refArea = (refBox?.textContent || '').replace(/\s+/g, ' ').slice(0, 160);
  document.querySelectorAll('[id*=ialog],[class*=modal]').forEach(d => out.dialogs.push(`${d.id || d.className} vis=${d.getBoundingClientRect().height > 0}`));
  const btns = [...document.querySelectorAll('button')].map(x => (x.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
  out.btns = [...new Set(btns)].filter(t => /추가|add|upload|올리|Source|Ref|가져/i.test(t)).slice(0, 20);
  return out;
});
console.log(JSON.stringify(r, null, 1).slice(0, 1200));
process.exit(0);
