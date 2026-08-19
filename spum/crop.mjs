// 타일시트 일부를 확대해 격자·좌표를 얹어 낸다.
//   node spum/crop.mjs <png> <out> <col0> <row0> <cols> <rows> [scale]
import { chromium } from 'playwright';
import fs from 'node:fs';
const [png, out, c0, r0, cw, ch, sc = 8] = process.argv.slice(2);
const b64 = fs.readFileSync(png).toString('base64');
const br = await chromium.launch();
const p = await br.newPage();
const data = await p.evaluate(async (a) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + a.b64; await img.decode();
  const S = a.sc, T = 16;
  const c = document.createElement('canvas');
  c.width = a.cw * T * S; c.height = a.ch * T * S;
  const g = c.getContext('2d');
  g.fillStyle = '#2b2b33'; g.fillRect(0, 0, c.width, c.height);
  g.imageSmoothingEnabled = false;
  g.drawImage(img, a.c0 * T, a.r0 * T, a.cw * T, a.ch * T, 0, 0, c.width, c.height);
  g.strokeStyle = 'rgba(255,0,255,.35)';
  for (let x = 0; x <= a.cw; x++) { g.beginPath(); g.moveTo(x * T * S, 0); g.lineTo(x * T * S, c.height); g.stroke(); }
  for (let y = 0; y <= a.ch; y++) { g.beginPath(); g.moveTo(0, y * T * S); g.lineTo(c.width, y * T * S); g.stroke(); }
  g.font = 'bold 13px monospace'; g.fillStyle = '#ff0';
  for (let x = 0; x < a.cw; x++) for (let y = 0; y < a.ch; y++) {
    g.fillText(`${a.c0 + x},${a.r0 + y}`, x * T * S + 2, y * T * S + 13);
  }
  return c.toDataURL('image/png');
}, { b64, c0: +c0, r0: +r0, cw: +cw, ch: +ch, sc: +sc });
fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
await br.close();
