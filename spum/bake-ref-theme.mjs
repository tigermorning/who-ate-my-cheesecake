// Studio 맵과 같은 구성으로 게임용 테마를 굽는다.
//   칸마다 참조 그림의 어느 자리를 쓸지 정한다:
//     · 벽·울타리, 가구가 놓인 칸 -> 그 칸 자신
//     · 나머지 바닥 -> 그 방의 재료 표본 칸 (samples.json)
// 결과: spum/house-theme.png · spum/house-theme.json · spum/house-map.json
import { chromium } from 'playwright';
import fs from 'node:fs';
import { W, H, GRID, buildBlocked, sizeOf, PROPS, ZONES, SPOT, LANDMARKS, roomOf } from './house.mjs';

const picked = JSON.parse(fs.readFileSync(new URL('./samples.json', import.meta.url), 'utf8'));
const blocked = Array.from(buildBlocked());

// 가구가 덮는 칸
const propCells = new Uint8Array(W * H);
for (const p of PROPS) {
  const [cw, ch] = sizeOf(p.key);
  for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
    const x = p.x + i, y = p.y + j;
    if (x >= 0 && y >= 0 && x < W && y < H) propCells[y * W + x] = 1;
  }
}

// 칸 -> 참조 그림에서 가져올 자리
const src = new Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const ch = GRID[y][x];
  const border = x === 0 || y === 0 || x === W - 1 || y === H - 1;
  if (ch === '#' || propCells[y * W + x]) { src[y * W + x] = [x, y]; continue; }
  const s = picked[ch] || picked['.'];
  src[y * W + x] = [s.x, s.y];
}

const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = b.contexts()[0];
const page = await ctx.newPage();
await page.goto('http://127.0.0.1:8790/spum/play.html', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);

const COLS = 32;
const out = await page.evaluate(async ({ W, H, src, COLS }) => {
  const img = new Image();
  img.src = '/docs/reference-house.png';
  await img.decode();
  const big = document.createElement('canvas');
  big.width = W * 32; big.height = H * 32;
  const bg = big.getContext('2d');
  bg.imageSmoothingEnabled = true;
  bg.drawImage(img, 0, 0, big.width, big.height);

  const index = new Map(), tiles = [], layer = new Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const key = src[i][0] + ',' + src[i][1];
    if (!index.has(key)) { index.set(key, tiles.length); tiles.push(src[i]); }
    layer[i] = index.get(key);
  }
  const rows = Math.ceil(tiles.length / COLS);
  const sheet = document.createElement('canvas');
  sheet.width = COLS * 32; sheet.height = rows * 32;
  const sg = sheet.getContext('2d');
  sg.imageSmoothingEnabled = false;
  tiles.forEach(([sx, sy], i) => {
    sg.drawImage(big, sx * 32, sy * 32, 32, 32, (i % COLS) * 32, Math.floor(i / COLS) * 32, 32, 32);
  });
  return { png: sheet.toDataURL('image/png'), layer, count: tiles.length, rows,
           tiles: tiles.map(([x, y]) => ({ x, y })) };
}, { W, H, src, COLS });

fs.writeFileSync(new URL('./house-theme.png', import.meta.url),
  Buffer.from(out.png.split(',')[1], 'base64'));
fs.writeFileSync(new URL('../docs/house-theme.png', import.meta.url),
  Buffer.from(out.png.split(',')[1], 'base64'));

const tileDefs = out.tiles.map((t, i) => {
  const bl = !!blocked[t.y * W + t.x];
  return {
    tileId: String(i + 1),
    name: (roomOf(t.x, t.y) || '뜰') + ' ' + String(i + 1).padStart(3, '0'),
    category: bl ? 'obstacle_blocking' : 'floor',
    movement: bl ? 'blocked' : 'passable', interaction: 'none',
    blocksMovement: bl, blocksVision: GRID[t.y][t.x] === '#',
    moveSpeed: bl ? 0 : 1,
    sourceCell: { column: (i % COLS) + 1, row: Math.floor(i / COLS) + 1 },
    from: { x: t.x, y: t.y, char: GRID[t.y][t.x] },
  };
});
fs.writeFileSync(new URL('./house-theme.json', import.meta.url), JSON.stringify({
  name: 'Who Ate My Cheesecake? · 집',
  tileSize: 32, columns: COLS, rows: out.rows, count: out.count,
  width: W, height: H, tiles: tileDefs, layer: out.layer,
  walkable: blocked.map(v => v ? 0 : 1), obstacle: blocked.slice(),
}));
console.log(`타일 ${out.count}개 (${COLS}×${out.rows}) · 시트 ${COLS * 32}×${out.rows * 32}`);
await page.close();
process.exit(0);
