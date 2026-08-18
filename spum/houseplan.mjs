// 집 도면을 글자로 찍고, 도면이 성립하는지 확인한다.  node spum/houseplan.mjs
import { W, H, GRID, DECOR, PROPS, SPOT, ZONES, SOLID,
         at, roomOf, isDoor, isWall, isOutside, buildBlocked } from './house.mjs';

const blocked = buildBlocked();
const idx = (x, y) => y * W + x;
const err = [];

// 0. 도면 자체가 반듯한가
GRID.forEach((row, y) => { if (row.length !== W) err.push(`${y}행 길이 ${row.length} (${W} 이어야 한다)`); });

// 그림: 가구가 놓인 칸은 소문자로 찍는다
const solidAt = new Set();
DECOR.forEach(([k, x, y]) => { if (SOLID.has(k)) solidAt.add(idx(x, y)); });
PROPS.forEach(p => {
  for (let j = 0; j < (p.h || 1); j++) for (let i = 0; i < (p.w || 1); i++) solidAt.add(idx(p.x + i, p.y + j));
});
console.log('   ' + Array.from({ length: W }, (_, i) => String(i % 10)).join(''));
for (let y = 0; y < H; y++) {
  let s = String(y).padStart(2, ' ') + ' ';
  for (let x = 0; x < W; x++) {
    const c = at(x, y);
    s += (solidAt.has(idx(x, y)) && !isWall(x, y) && !isOutside(x, y)) ? c.toLowerCase() : c;
  }
  console.log(s);
}
console.log('   대문자 = 빈 바닥, 소문자 = 가구, # 벽, + 문, . 뜰');

// 1. 걸어서 다섯 방에 다 닿는가
const start = Object.values(SPOT)[0];
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
['부엌', '거실', '화원', '서재', '침실'].forEach(r => {
  let all = 0, hit = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (roomOf(x, y) !== r || blocked[idx(x, y)]) continue;
    all++; if (seen[idx(x, y)]) hit++;
  }
  if (!all) err.push(`${r} 에 걸을 칸이 없다`);
  else if (!hit) err.push(`${r} 에 걸어서 닿지 못한다`);
  else if (hit < all) err.push(`${r} 안에 못 닿는 칸 ${all - hit}개`);
});

// 2. 문은 양쪽이 뚫려 있어야 한다
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (!isDoor(x, y)) continue;
  if (blocked[idx(x, y)]) { err.push(`문 (${x},${y}) 위에 가구가 있다`); continue; }
  // 안쪽 문은 양쪽이 뚫려야 하고, 바깥 문은 한쪽이 뚫린 채 반대쪽이 뜰이면 된다
  const open = (a, b) => !blocked[idx(x + a, y + b)];
  const out = (a, b) => isOutside(x + a, y + b);
  const ok = (open(-1, 0) && open(1, 0)) || (open(0, -1) && open(0, 1))
    || (open(-1, 0) && out(1, 0)) || (open(1, 0) && out(-1, 0))
    || (open(0, -1) && out(0, 1)) || (open(0, 1) && out(0, -1));
  if (!ok) err.push(`문 (${x},${y}) 이 막혀 있다`);
}

// 3. 가구는 방 안에만. 벽에 거는 것(창·배너)만 벽 위에 놓는다
const ONWALL = new Set(['window', 'banner']);
const OUTOK = new Set(['tree', 'barrel', 'sack']);
DECOR.forEach(([k, x, y]) => {
  if (ONWALL.has(k)) { if (!isWall(x, y)) err.push(`${k} (${x},${y}) 는 벽에 걸어야 한다`); return; }
  if (isWall(x, y)) err.push(`${k} 이 벽 (${x},${y}) 위에 있다`);
  else if (isOutside(x, y) && !OUTOK.has(k)) err.push(`${k} 이 집 밖 (${x},${y}) 에 있다`);
});
PROPS.forEach(p => {
  for (let j = 0; j < (p.h || 1); j++) for (let i = 0; i < (p.w || 1); i++) {
    const x = p.x + i, y = p.y + j;
    if (!roomOf(x, y)) err.push(`${p.key} 의 (${x},${y}) 가 방 밖이다`);
  }
});

// 4. 가구끼리 겹치지 않는다
const once = new Set();
const mark = (k, x, y) => {
  if (once.has(idx(x, y))) err.push(`(${x},${y}) 에 가구가 둘 겹친다 — ${k}`);
  once.add(idx(x, y));
};
DECOR.forEach(([k, x, y]) => { if (!ONWALL.has(k)) mark(k, x, y); });
once.delete(idx(6, 6));   // 빈 접시는 식탁 위에 놓인다
PROPS.forEach(p => { for (let j = 0; j < (p.h || 1); j++) for (let i = 0; i < (p.w || 1); i++) mark(p.key, p.x + i, p.y + j); });

// 5. 서 있는 자리는 제 방 안이고 비어 있다
Object.entries(SPOT).forEach(([id, s]) => {
  if (roomOf(s.x, s.y) !== s.room) err.push(`${id} 자리 (${s.x},${s.y}) 가 ${s.room} 이 아니다 (${roomOf(s.x, s.y)})`);
  else if (blocked[idx(s.x, s.y)]) err.push(`${id} 자리 (${s.x},${s.y}) 가 막혀 있다`);
  else if (!seen[idx(s.x, s.y)]) err.push(`${id} 자리 (${s.x},${s.y}) 에 걸어서 못 간다`);
});

// 6. 구역 이름표는 방 안에
ZONES.forEach(z => { if (!roomOf(z.x, z.y)) err.push(`이름표 ${z.name} (${z.x},${z.y}) 가 방 밖이다`); });

// 7. 빈 바닥이 넓게 남지 않는다 — 5×5 가 통째로 비면 심심한 자리다
let bare = 0;
for (let y = 0; y + 4 < H; y++) for (let x = 0; x + 4 < W; x++) {
  let all = true;
  for (let j = 0; j < 5 && all; j++) for (let i = 0; i < 5; i++) {
    if (!roomOf(x + i, y + j) || solidAt.has(idx(x + i, y + j)) || at(x + i, y + j) === '+') { all = false; break; }
  }
  if (all) { bare++; if (bare <= 5) err.push(`(${x},${y}) 부터 5×5 가 통째로 비어 있다`); }
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
console.log(`\n방 칸 ${floor} · 가구 ${solidAt.size}칸 (${Math.round(solidAt.size / floor * 100)}%)`);
Object.entries(perRoom).forEach(([r, v]) =>
  console.log(`  ${r} ${String(v.all).padStart(3)}칸 · 가구 ${String(v.furn).padStart(3)} (${Math.round(v.furn / v.all * 100)}%)`));

if (err.length) { console.log('\n실패 ' + err.length); err.slice(0, 40).forEach(e => console.log('  · ' + e)); process.exit(1); }
console.log('\n도면 확인 — 실패 0');
