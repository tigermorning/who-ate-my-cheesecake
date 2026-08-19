// 유니티 Ultimate 번들의 16bit PNG 타일시트를 8bit RGBA 로 다시 굽는다 (그림은 그대로).
//   node spum/topng8.mjs <src> <dst> [<src> <dst> ...]
import { chromium } from 'playwright';
import fs from 'node:fs';
const br = await chromium.launch();
const p = await br.newPage();
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) {
  const b64 = fs.readFileSync(args[i]).toString('base64');
  const out = await p.evaluate(async (b64) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    c.getContext('2d').drawImage(img, 0, 0);
    return c.toDataURL('image/png');
  }, b64);
  fs.writeFileSync(args[i + 1], Buffer.from(out.split(',')[1], 'base64'));
  console.log(args[i + 1], fs.statSync(args[i + 1]).size);
}
await br.close();
