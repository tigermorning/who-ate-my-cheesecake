// Studio 에서 받아온 맵에서 **끊긴 구역을 잇는다**.
//   node spum/patch-map-doors.mjs [--dry]
//
// 사용자가 Studio 에서 만든 맵(house-map.json)은 걸을 수 있는 칸이 여러 섬으로 갈라져 있었다.
// 아래 칸만 통행 가능으로 바꾸면 전부 이어진다 (계산으로 뽑은 최소 개수다).
// Studio 에서 직접 문을 내면 이 파일은 필요 없어진다 — 그때 DOORS 를 비우면 된다.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = join(__dirname, 'house-map.json');

const DOORS = [
  [6, 5],            // 왼쪽 위 12칸 구역 → 본채
  [36, 8], [37, 8],  // 오른쪽 뜰(헛간·텃밭, 102칸) → 본채
  [25, 25],          // 서재(51칸) → 복도
];

const map = JSON.parse(readFileSync(FILE, 'utf8'));
const W = map.width, H = map.height;
const ob = map.layers.find(l => l.type === 'obstacle').data;
const wk = map.layers.find(l => l.type === 'walkable')?.data;

let opened = 0;
for (const [x, y] of DOORS) {
  const i = y * W + x;
  if (x < 0 || y < 0 || x >= W || y >= H) { console.error('맵 밖:', x, y); continue; }
  if (!ob[i]) continue;
  ob[i] = 0; if (wk) wk[i] = 1;
  opened++;
}

// 이어졌는지 확인한다
const seen = new Uint8Array(W * H);
let start = ob.findIndex(v => !v), reach = 0, free = 0;
for (let i = 0; i < W * H; i++) if (!ob[i]) free++;
const q = [start]; seen[start] = 1;
while (q.length) {
  const k = q.pop(); reach++;
  const x = k % W, y = (k / W) | 0;
  for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
    const kk = ny * W + nx;
    if (ob[kk] || seen[kk]) continue;
    seen[kk] = 1; q.push(kk);
  }
}
console.log(`문 ${opened}칸 열었다 · 걸을 수 있는 칸 ${free} 중 ${reach}칸이 이어짐 (${Math.round(reach / free * 100)}%)`);
if (!process.argv.includes('--dry')) {
  writeFileSync(FILE, JSON.stringify(map));
  console.log('spum/house-map.json 갱신');
}
