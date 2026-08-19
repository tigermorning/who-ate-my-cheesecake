// tilesheet -> 4x upscaled with grid + labels
import { chromium } from 'playwright';
import fs from 'node:fs';
const [png, out, scale=4] = process.argv.slice(2);
const b64 = fs.readFileSync(png).toString('base64');
const br = await chromium.launch();
const p = await br.newPage();
const data = await p.evaluate(async ({b64, scale}) => {
  const img = new Image(); img.src = 'data:image/png;base64,'+b64; await img.decode();
  const c = document.createElement('canvas');
  c.width = img.width*scale; c.height = img.height*scale;
  const g = c.getContext('2d');
  g.fillStyle='#2b2b33'; g.fillRect(0,0,c.width,c.height);
  g.imageSmoothingEnabled=false;
  g.drawImage(img,0,0,c.width,c.height);
  g.strokeStyle='rgba(255,0,255,.25)'; g.lineWidth=1;
  for(let x=0;x<=img.width;x+=16){g.beginPath();g.moveTo(x*scale,0);g.lineTo(x*scale,c.height);g.stroke();}
  for(let y=0;y<=img.height;y+=16){g.beginPath();g.moveTo(0,y*scale);g.lineTo(c.width,y*scale);g.stroke();}
  g.fillStyle='#ff0'; g.font='10px monospace';
  for(let x=0;x<img.width;x+=16) g.fillText(String(x/16), x*scale+2, 10);
  for(let y=0;y<img.height;y+=16) g.fillText(String(y/16), 2, y*scale+12);
  return c.toDataURL('image/png');
}, {b64, scale: Number(scale)});
fs.writeFileSync(out, Buffer.from(data.split(',')[1],'base64'));
await br.close();
