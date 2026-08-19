// 집 도면을 글자로 찍고, 도면이 성립하는지 확인한다.  node spum/houseplan.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { W, H, GRID, PROPS, ONWALL, SPOT, ZONES, LANDMARKS, RUGS, INDOOR,
         at, roomOf, isDoor, isWall, isYard, sizeOf, PASSABLE, buildBlocked } from './house.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const blocked = buildBlocked();
const idx = (x, y) => y * W + x;
const err = [];
const warn = [];

// 0. 도면 자체가 반듯한가
GRID.forEach((row, y) => { if (row.length !== W) err.push(`${y}행 길이 ${row.length} (${W} 이어야 한다)`); });

// 0-1. smo.json 과 크기가 맞는가 — 도면이 아는 크기와 실제 그림이 어긋나면 다 어긋난다
let smo = null;
try { smo = JSON.parse(readFileSync(join(__dirname, 'smo.json'), 'utf8')); } catch { warn.push('smo.json 이 없다 — node spum/buildsmo.mjs 먼저'); }
if (smo) {
  const byKey = Object.fromEntries(smo.map(o => [o.key, o]));
  const used = new Set([...PROPS, ...ONWALL].map(p => p.key));
  for (const k of used) {
    const o = byKey[k];
    if (!o) { err.push(`smo.json 에 ${k} 가 없다`); continue; }
    const [cw, ch] = sizeOf(k);
    if (o.size.cols !== cw || o.size.rows !== ch)
      err.push(`${k} 크기가 어긋난다 — 도면 ${cw}×${ch}, 그림 ${o.size.cols}×${o.size.rows}`);
  }
  for (const [x1, y1, x2, y2, kind] of RUGS) if (!byKey[kind]) err.push(`깔개 ${kind} 가 smo.json 에 없다`);
}

// 가구가 놓인 칸
const solidAt = new Set();      // 길을 막는 칸
const anyAt = new Map();        // 칸 → 가구 이름 (겹침 검사)
for (const p of PROPS) {
  if (p.on) continue;
  const [cw, ch] = sizeOf(p.key);
  for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
    const k = idx(p.x + i, p.y + j);
    if (anyAt.has(k)) err.push(`(${p.x + i},${p.y + j}) 에 ${anyAt.get(k)} 와 ${p.key} 가 겹친다`);
    anyAt.set(k, p.key);
    if (!PASSABLE.has(p.key)) solidAt.add(k);
  }
}

// 그림: 가구가 놓인 칸은 소문자로 찍는다
console.log('   ' + Array.from({ length: W }, (_, i) => String(i % 10)).join(''));
for (let y = 0; y < H; y++) {
  let s = String(y).padStart(2, ' ') + ' ';
  for (let x = 0; x < W; x++) {
    const c = at(x, y);
    s += (solidAt.has(idx(x, y)) && !isWall(x, y)) ? c.toLowerCase() : c;
  }
  console.log(s);
}
console.log('   대문자 = 빈 바닥, 소문자 = 가구, # 벽·울타리, + 문, . 뜰, , 돌길');

// 1. 걸어서 어디든 닿는가
const start = SPOT.player;
const seen = new Uint8Array(W * H), q = [[start.x, start.y]];
seen[idx(start.x, start.y)] = 1;
while (q.length) {
  const [x, y] = q.pop();
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
    if (blocked[idx(nx, ny)] || seen[idx(nx, ny)]) continue;
    seen[idx(nx, ny)] = 1; q.push([nx, ny]);
  }
}
const ALL_ROOMS = ['부엌', '식당', '욕실', '거실', '서재', '복도', '데크', '운동장', '텃밭', '헛간', '현관앞'];
ALL_ROOMS.forEach(r => {
  let all = 0, hit = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (roomOf(x, y) !== r || blocked[idx(x, y)]) continue;
    all++; if (seen[idx(x, y)]) hit++;
  }
  if (!all) err.push(`${r} 에 걸을 칸이 없다`);
  else if (!hit) err.push(`${r} 에 걸어서 닿지 못한다`);
  else if (hit < all) err.push(`${r} 안에 못 닿는 칸 ${all - hit}개`);
});

// 2. A* — 이야기가 걸리는 자리마다 실제로 길이 있는가
function astar(sx, sy, ex, ey) {
  if (blocked[idx(sx, sy)] || blocked[idx(ex, ey)]) return null;
  const h = (x, y) => Math.abs(x - ex) + Math.abs(y - ey);
  const open = [{ x: sx, y: sy, g: 0, f: h(sx, sy) }], best = new Map([[idx(sx, sy), 0]]);
  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift();
    if (cur.x === ex && cur.y === ey) return cur.g;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cur.x + dx, ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || blocked[idx(nx, ny)]) continue;
      const g = cur.g + 1, k = idx(nx, ny);
      if (best.has(k) && best.get(k) <= g) continue;
      best.set(k, g); open.push({ x: nx, y: ny, g, f: g + h(nx, ny) });
    }
  }
  return null;
}
LANDMARKS.forEach(L => {
  if (blocked[idx(L.x, L.y)]) { err.push(`${L.name} 앞자리 (${L.x},${L.y}) 가 막혀 있다`); return; }
  const d = astar(SPOT.player.x, SPOT.player.y, L.x, L.y);
  if (d == null) err.push(`플레이어가 ${L.name} 까지 못 간다`);
});
Object.entries(SPOT).forEach(([a, A]) => Object.entries(SPOT).forEach(([b, B]) => {
  if (a >= b) return;
  if (astar(A.x, A.y, B.x, B.y) == null) err.push(`${a} 와 ${b} 사이에 길이 없다`);
}));

// 3. 문은 양쪽이 뚫려 있어야 한다
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (!isDoor(x, y)) continue;
  if (blocked[idx(x, y)]) { err.push(`문 (${x},${y}) 위에 가구가 있다`); continue; }
  const open = (a, b) => !blocked[idx(x + a, y + b)];
  if (!((open(-1, 0) && open(1, 0)) || (open(0, -1) && open(0, 1))))
    err.push(`문 (${x},${y}) 이 막혀 있다`);
}

// 4. 가구는 벽 위가 아니라 바닥에 놓인다
PROPS.forEach(p => {
  const [cw, ch] = sizeOf(p.key);
  for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
    const x = p.x + i, y = p.y + j;
    if (isWall(x, y)) err.push(`${p.key} 의 (${x},${y}) 가 벽 위다`);
    else if (isDoor(x, y)) err.push(`${p.key} 의 (${x},${y}) 가 문 위다`);
  }
});
ONWALL.forEach(p => { if (!isWall(p.x, p.y)) err.push(`${p.key} (${p.x},${p.y}) 는 벽에 붙여야 한다`); });

// 5. 실내 가구는 실내에, 바깥 것은 바깥에
const OUTDOOR_OK = new Set(['tree', 'bush', 'flower_bed', 'mailbox', 'patio_set', 'deck_chair',
  'exercise_mat', 'weight_bench', 'dumbbell_rack', 'gym_machine', 'veg_bed', 'garden_tools',
  'watering_can', 'plant_pot', 'boxes', 'baskets', 'shelf']);
PROPS.forEach(p => {
  const r = roomOf(p.x, p.y);
  const outside = !r || !INDOOR.has(r);
  if (outside && !OUTDOOR_OK.has(p.key)) err.push(`${p.key} (${p.x},${p.y}) 가 집 밖에 있다`);
});

// 6. 서 있는 자리는 제 방 안이고 비어 있다
Object.entries(SPOT).forEach(([id, s]) => {
  if (roomOf(s.x, s.y) !== s.room) err.push(`${id} 자리 (${s.x},${s.y}) 가 ${s.room} 이 아니다 (${roomOf(s.x, s.y)})`);
  else if (blocked[idx(s.x, s.y)]) err.push(`${id} 자리 (${s.x},${s.y}) 가 막혀 있다`);
});
ZONES.forEach(z => { if (!roomOf(z.x, z.y)) err.push(`이름표 ${z.name} (${z.x},${z.y}) 가 방 밖이다`); });

// 7. 깔개는 방 안에만
RUGS.forEach(([x1, y1, x2, y2, kind]) => {
  for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) {
    const r = roomOf(x, y);
    if (r && INDOOR.has(r)) continue;
    if (kind === 'rug_cool' && r === '운동장') continue;
    warn.push(`깔개 ${kind} 의 (${x},${y}) 가 방 밖이다`);
  }
});

// 8. 실내에 5×5 가 통째로 비면 심심한 자리다
let bare = 0;
for (let y = 0; y + 4 < H; y++) for (let x = 0; x + 4 < W; x++) {
  let all = true;
  for (let j = 0; j < 5 && all; j++) for (let i = 0; i < 5; i++) {
    const r = roomOf(x + i, y + j);
    if (!r || !INDOOR.has(r) || r === '복도' || solidAt.has(idx(x + i, y + j)) || at(x + i, y + j) === '+') { all = false; break; }
  }
  if (all) { bare++; if (bare <= 6) err.push(`(${x},${y}) 부터 5×5 가 통째로 비어 있다`); }
}

// 셈
let floor = 0;
const perRoom = {};
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const r = roomOf(x, y); if (!r) continue;
  floor++;
  perRoom[r] ||= { all: 0, furn: 0 };
  perRoom[r].all++; if (solidAt.has(idx(x, y))) perRoom[r].furn++;
}
console.log(`\n방 칸 ${floor} · 가구 ${solidAt.size}칸 (${Math.round(solidAt.size / floor * 100)}%) · 놓인 것 ${PROPS.length}개`);
Object.entries(perRoom).sort((a, b) => b[1].all - a[1].all).forEach(([r, v]) =>
  console.log(`  ${r.padEnd(4)} ${String(v.all).padStart(3)}칸 · 가구 ${String(v.furn).padStart(3)} (${Math.round(v.furn / v.all * 100)}%)`));

if (warn.length) { console.log('\n귀띔 ' + warn.length); warn.slice(0, 10).forEach(e => console.log('  · ' + e)); }
if (err.length) { console.log('\n실패 ' + err.length); err.slice(0, 40).forEach(e => console.log('  · ' + e)); process.exit(1); }
console.log('\n도면 확인 — 실패 0');
