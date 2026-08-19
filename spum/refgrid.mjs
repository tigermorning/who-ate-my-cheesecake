// 참조 그림에 격자를 얹어 방·가구 좌표를 읽는다.
//   node spum/refgrid.mjs <cols> <rows> [out] [x0 y0 x1 y1]
import { chromium } from 'playwright';
import fs from 'node:fs';
const [C = 48, R = 48, out = 'docs/ref-grid.png', ...crop] = process.argv.slice(2);
const b64 = fs.readFileSync('docs/reference-house.png').toString('base64');
const br = await chromium.launch();
const p = await br.newPage();
const data = await p.evaluate(async (a) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + a.b64; await img.decode();
  const [sx, sy, sw, sh] = a.crop.length === 4 ? a.crop.map(Number) : [0, 0, img.width, img.height];
  const cell = img.width / a.C;                    // 원본 기준 한 칸
  const S = Math.min(3, 1900 / sw);
  const c = document.createElement('canvas');
  c.width = Math.round(sw * S); c.height = Math.round(sh * S);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
  g.lineWidth = 1;
  for (let i = 0; i <= a.C; i++) {
    const x = (i * cell - sx) * S; if (x < 0 || x > c.width) continue;
    g.strokeStyle = i % 5 === 0 ? 'rgba(255,0,0,.85)' : 'rgba(255,255,255,.3)';
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, c.height); g.stroke();
  }
  for (let j = 0; j <= a.R; j++) {
    const y = (j * cell - sy) * S; if (y < 0 || y > c.height) continue;
    g.strokeStyle = j % 5 === 0 ? 'rgba(255,0,0,.85)' : 'rgba(255,255,255,.3)';
    g.beginPath(); g.moveTo(0, y); g.lineTo(c.width, y); g.stroke();
  }
  g.font = 'bold 12px monospace';
  for (let i = 0; i <= a.C; i += 5) { const x = (i * cell - sx) * S; if (x < 0 || x > c.width) continue;
    g.fillStyle = '#000'; g.fillRect(x, 0, 22, 14); g.fillStyle = '#ff0'; g.fillText(String(i), x + 2, 11); }
  for (let j = 0; j <= a.R; j += 5) { const y = (j * cell - sy) * S; if (y < 0 || y > c.height) continue;
    g.fillStyle = '#000'; g.fillRect(0, y, 22, 14); g.fillStyle = '#0ff'; g.fillText(String(j), 2, y + 11); }
  return c.toDataURL('image/png');
}, { b64, C: +C, R: +R, crop });
fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
await br.close();
