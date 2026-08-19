// 집 안팎의 모든 것을 SPUM 오브젝트(SMO)로 뽑는다.
//   node spum/buildsmo.mjs   →  spum/smo.json
//
// 한 칸 = 16픽셀. cols×rows 칸을 차지하는 큰 가구도 낸다 (냉장고 2×3, 난로 4×2, 식탁 4×3 …).
// 빛은 늘 왼쪽 위에서 온다 — 윗면이 가장 밝고, 앞면이 중간, 테두리가 가장 어둡다. 3/4 부감.
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));

// ── 화판 ────────────────────────────────────────────────────
function canvas(cols, rows) {
  const w = cols * 16, h = rows * 16;
  const g = Array.from({ length: h }, () => new Array(w).fill(''));
  const ok = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
  const o = {
    w, h, cols, rows, g,
    px(x, y, c) { x |= 0; y |= 0; if (c && ok(x, y)) g[y][x] = c; return o; },
    rect(x, y, rw, rh, c) { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) o.px(x + i, y + j, c); return o; },
    frame(x, y, rw, rh, c) { o.rect(x, y, rw, 1, c); o.rect(x, y + rh - 1, rw, 1, c); o.rect(x, y, 1, rh, c); o.rect(x + rw - 1, y, 1, rh, c); return o; },
    ell(cx, cy, rx, ry, c) {
      for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++)
        if ((x * x) / (rx * rx || 1) + (y * y) / (ry * ry || 1) <= 1.05) o.px(cx + x, cy + y, c);
      return o;
    },
    ring(cx, cy, rx, ry, c) {
      for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
        const v = (x * x) / (rx * rx || 1) + (y * y) / (ry * ry || 1);
        if (v <= 1.05 && v >= 0.55) o.px(cx + x, cy + y, c);
      }
      return o;
    },
    // 3/4 덩어리 — 테두리 · 윗면 · 앞면
    box(x, y, rw, rh, topH, top, front, edge) {
      o.rect(x, y, rw, rh, edge);
      o.rect(x + 1, y + 1, rw - 2, topH, top);
      o.rect(x + 1, y + 1 + topH, rw - 2, rh - 2 - topH, front);
      o.rect(x + 1, y + topH, rw - 2, 1, edge);
      return o;
    },
    hstripe(x, y, rw, rh, step, c) { for (let j = 0; j < rh; j += step) o.rect(x, y + j, rw, 1, c); return o; },
    vstripe(x, y, rw, rh, step, c) { for (let i = 0; i < rw; i += step) o.rect(x + i, y, 1, rh, c); return o; },
    speck(x, y, rw, rh, c, n, seed = 3) {
      for (let k = 0; k < n; k++) o.px(x + ((k * 37 + seed * 11) % rw), y + ((k * 53 + seed * 7) % rh), c);
      return o;
    },
    leg(x, y, hh, c) { o.rect(x, y, 2, hh, c); return o; },
  };
  return o;
}

// ── 색 ──────────────────────────────────────────────────────
const K = {
  edge: '#6B5236', dark: '#4E3B27',
  woodT: '#E6C593', woodF: '#CDA265', woodD: '#A87C43',
  oakT: '#D6A468', oakF: '#B07E42', oakD: '#87582A',
  darkT: '#9A6B41', darkF: '#7B5230', darkD: '#59391F',
  creamT: '#FDF8EC', creamF: '#F0E6D2', creamD: '#D3C5A9',
  stoneT: '#E9E2D1', stoneF: '#D5CCB6', stoneD: '#B2A88F',
  greyT: '#D9DCDE', greyF: '#B7BCC0', greyD: '#8A9096',
  tileT: '#E2F0F5', tileF: '#C3DFE9', tileD: '#96BECE',
  steelT: '#EDF2F5', steelF: '#CBD5DB', steelD: '#94A2AC',
  grassT: '#8FD06B', grassF: '#75B854', grassD: '#579A3C',
  leafT: '#7FC25C', leafF: '#5FA344', leafD: '#3F7A2C',
  soilT: '#9A7048', soilF: '#7C5734', soilD: '#5C3F25',
  pathT: '#E7E1D0', pathF: '#D1CAB6', pathD: '#ADA48C',
  redT: '#E08F72', redF: '#C56A4C', redD: '#98492F',
  blueT: '#A9CFE0', blueF: '#83AEC4', blueD: '#5D8699',
  sageT: '#BFD4B4', sageF: '#9DB891', sageD: '#77916C',
  fireA: '#FFE79A', fireB: '#FFB648', fireC: '#F0722C',
  white: '#FFFFFF', glass: '#BFE3F2',
};

const ART = {};
const def = (key, o) => { ART[key] = o; };
const T = (key, name, draw) => def(key, { name, cat: 'terrain', layer: 'back', block: false, cols: 1, rows: 1, draw });
const F = (key, name, cols, rows, opt, draw) => def(key, { name, cat: opt.cat || 'furniture', layer: 'front', block: opt.block !== false, cols, rows, prompt: opt.prompt, on: !!opt.on, draw });

// ══ 바닥 ════════════════════════════════════════════════════
T('wood_floor', '나무 바닥', c => {
  c.rect(0, 0, 16, 16, '#EDD3A8');
  c.hstripe(0, 0, 16, 16, 4, '#DDBE8C');
  [[5, 0], [11, 4], [2, 8], [9, 12]].forEach(([x, y]) => c.rect(x, y, 1, 4, '#DDBE8C'));
  [[1, 2], [7, 1], [12, 2], [3, 6], [9, 5], [14, 6], [4, 10], [10, 9], [13, 10], [2, 14], [7, 13], [12, 14]]
    .forEach(([x, y]) => c.rect(x, y, 2, 1, '#F5E0BC'));
});
T('deck_wood', '데크 널판', c => {
  c.rect(0, 0, 16, 16, '#D9B282');
  c.vstripe(0, 0, 16, 16, 5, '#BE9463');
  c.speck(0, 0, 16, 16, '#E3C296', 10, 4);
});
T('stone_floor', '돌 바닥', c => {
  c.rect(0, 0, 16, 16, '#EFE9DA');
  c.rect(0, 7, 16, 1, '#D8D0BB'); c.rect(0, 15, 16, 1, '#D8D0BB');
  c.rect(7, 0, 1, 16, '#D8D0BB'); c.rect(15, 0, 1, 16, '#D8D0BB');
  c.speck(1, 1, 6, 6, '#F7F2E6', 4, 2); c.speck(9, 9, 6, 6, '#F7F2E6', 4, 5);
});
T('tile_floor', '욕실 타일', c => {
  c.rect(0, 0, 16, 16, '#DCEFF6');
  c.rect(0, 7, 16, 1, '#B8D9E5'); c.rect(0, 15, 16, 1, '#B8D9E5');
  c.rect(7, 0, 1, 16, '#B8D9E5'); c.rect(15, 0, 1, 16, '#B8D9E5');
  c.px(3, 3, '#F3FAFD'); c.px(11, 11, '#F3FAFD');
});
T('grass', '잔디', c => {
  c.rect(0, 0, 16, 16, K.grassF);
  c.speck(0, 0, 16, 16, K.grassT, 22, 3);
  c.speck(0, 0, 16, 16, K.grassD, 14, 6);
});
T('grass_flower', '꽃핀 잔디', c => {
  c.rect(0, 0, 16, 16, K.grassF);
  c.speck(0, 0, 16, 16, K.grassT, 20, 2);
  [[3, 4], [11, 6], [6, 12], [13, 13]].forEach(([x, y], i) => {
    c.ell(x, y, 1, 1, i % 2 ? '#FFF3C4' : '#FFE0EC'); c.px(x, y, i % 2 ? '#FFC94A' : '#F58BA8');
  });
});
T('stone_path', '돌길', c => {
  c.rect(0, 0, 16, 16, K.pathF);
  c.ell(4, 4, 3, 3, K.pathT); c.ell(12, 5, 3, 2, K.pathT);
  c.ell(5, 12, 3, 2, K.pathT); c.ell(12, 12, 2, 3, K.pathT);
  c.speck(0, 0, 16, 16, K.pathD, 8, 5);
});
T('garden_soil', '텃밭 흙', c => {
  c.rect(0, 0, 16, 16, K.soilF);
  c.hstripe(0, 1, 16, 16, 4, K.soilD);
  c.speck(0, 0, 16, 16, K.soilT, 16, 4);
});
T('gym_floor', '운동 바닥', c => {
  c.rect(0, 0, 16, 16, '#9BA2A8');
  c.rect(0, 15, 16, 1, '#868D93'); c.rect(15, 0, 1, 16, '#868D93');
  c.speck(0, 0, 16, 16, '#AAB1B7', 18, 7);
});
T('rug_warm', '깔개', c => {
  c.rect(0, 0, 16, 16, '#E7D6BA');
  c.rect(0, 0, 16, 1, '#D8C2A0'); c.rect(0, 0, 1, 16, '#D8C2A0');
  [[4, 4], [12, 12]].forEach(([x, y]) => c.ell(x, y, 3, 3, '#DDC7A6'));
  [[12, 4], [4, 12]].forEach(([x, y]) => c.ell(x, y, 2, 2, '#D3B896'));
});
T('rug_cool', '푸른 깔개', c => {
  c.rect(0, 0, 16, 16, '#C6D3C0');
  c.rect(0, 0, 16, 1, '#A8BAA1'); c.rect(0, 0, 1, 16, '#A8BAA1');
  c.rect(8, 0, 1, 16, '#B5C5AE'); c.rect(0, 8, 16, 1, '#B5C5AE');
  [[4, 4], [12, 12]].forEach(([x, y]) => { c.ell(x, y, 3, 3, '#AEC0A6'); c.ell(x, y, 1, 1, '#E0EADB'); });
  [[12, 4], [4, 12]].forEach(([x, y]) => { c.ell(x, y, 2, 2, '#DCE7D7'); });
});
T('shed_floor', '헛간 바닥', c => {
  c.rect(0, 0, 16, 16, '#C9A97B');
  c.hstripe(0, 0, 16, 16, 5, '#AC8B5F');
  c.speck(0, 0, 16, 16, '#D8BC92', 8, 3);
});

// ══ 벽 · 문 · 창 ════════════════════════════════════════════
// 위에서 내려다본 벽의 윗면. 바닥(크림·나무)과 확실히 구분되는 회갈색 회벽으로 간다 —
// 예전엔 바닥과 같은 크림색이라 방 경계가 안 보였다.
def('house_wall', {
  name: '집 벽', cat: 'solid', layer: 'front', block: true, cols: 1, rows: 1, draw: c => {
    c.rect(0, 0, 16, 16, '#CBB99A');
    c.rect(0, 0, 16, 2, '#E4D6BA');          // 윗면 하이라이트
    c.rect(0, 2, 16, 12, '#C5B294');
    c.speck(0, 3, 16, 10, '#D2C1A4', 6, 2);
    c.rect(0, 14, 16, 2, '#9E8A6C');         // 아래 모서리 — 두께가 읽힌다
    c.rect(0, 0, 1, 16, '#B9A688'); c.rect(15, 0, 1, 16, '#B9A688');
  },
});
// 남쪽이 트인 벽 — 벽의 「앞면」이 보인다. 이게 있어야 집이 납작해 보이지 않는다.
def('house_wall_face', {
  name: '집 벽(앞면)', cat: 'solid', layer: 'front', block: true, cols: 1, rows: 1, draw: c => {
    c.rect(0, 0, 16, 5, '#D8C7A6');            // 벽 윗면 — 위에서 내려다본 두께
    c.rect(0, 0, 16, 1, '#EADCC2');
    c.rect(0, 4, 16, 1, '#A8946F');
    c.rect(0, 5, 16, 9, '#F3EADA');            // 앞면 — 빛을 받는다
    c.rect(0, 5, 16, 1, '#FCF6EA');
    c.speck(0, 6, 16, 7, '#E8DCC6', 6, 2);
    c.rect(0, 13, 16, 2, '#C6B18C');           // 굽도리
    c.rect(0, 15, 16, 1, '#9C8461');
  },
});
// 바깥벽 앞면 — 참조 그림처럼 아래를 돌로 받친다
def('house_wall_face_stone', {
  name: '집 바깥벽(앞면)', cat: 'solid', layer: 'front', block: true, cols: 1, rows: 1, draw: c => {
    c.rect(0, 0, 16, 5, '#D8C7A6');
    c.rect(0, 0, 16, 1, '#EADCC2');
    c.rect(0, 4, 16, 1, '#A8946F');
    c.rect(0, 5, 16, 6, '#F3EADA');
    c.rect(0, 11, 16, 5, '#BFBAB0');           // 돌 기단
    c.rect(0, 11, 16, 1, '#D6D2C8');
    [[1, 12], [6, 12], [11, 12], [3, 14], [9, 14]].forEach(([x, y]) => c.rect(x, y, 4, 1, '#AAA49A'));
    c.rect(0, 15, 16, 1, '#8F897E');
  },
});
def('fence', {
  name: '울타리', cat: 'solid', layer: 'front', block: true, cols: 1, rows: 1, draw: c => {
    c.rect(0, 0, 16, 16, K.grassF); c.speck(0, 0, 16, 16, K.grassT, 10, 3);
    c.rect(0, 4, 16, 3, '#F6F2E8'); c.rect(0, 6, 16, 1, '#D8D2C2');
    [1, 6, 11].forEach(x => { c.rect(x, 1, 4, 12, '#FBF8F0'); c.rect(x + 3, 1, 1, 12, '#D8D2C2'); c.px(x + 1, 0, '#FBF8F0'); c.px(x + 2, 0, '#FBF8F0'); });
    c.rect(0, 10, 16, 2, '#F6F2E8'); c.rect(0, 11, 16, 1, '#D8D2C2');
  },
});
def('window', {
  name: '창문', cat: 'prop', layer: 'front', block: false, cols: 1, rows: 1, draw: c => {
    c.rect(1, 3, 14, 11, '#F8F4EA');
    c.rect(2, 4, 12, 9, K.glass);
    c.rect(2, 4, 12, 3, '#DFF1FA');
    c.rect(7, 4, 1, 9, '#F8F4EA'); c.rect(2, 8, 12, 1, '#F8F4EA');
    c.frame(1, 3, 14, 11, '#E5DCC8'); c.rect(0, 13, 16, 2, K.oakF);
  },
});
def('wooden_door', {
  name: '나무 문', cat: 'solid', layer: 'front', block: false, cols: 1, rows: 1, prompt: '문을 지난다', draw: c => {
    c.rect(0, 0, 16, 16, K.oakD);
    c.rect(1, 1, 14, 14, K.oakF);
    c.rect(2, 2, 12, 5, K.oakT); c.rect(2, 9, 12, 5, K.oakT);
    c.frame(2, 2, 12, 5, K.oakD); c.frame(2, 9, 12, 5, K.oakD);
    c.px(12, 8, '#FFD98A'); c.px(12, 7, '#E8B24A');
  },
});
def('gate', {
  name: '대문', cat: 'solid', layer: 'front', block: false, cols: 1, rows: 1, draw: c => {
    c.rect(0, 0, 16, 16, K.pathF); c.ell(8, 8, 6, 5, K.pathT);
    c.rect(0, 2, 3, 12, '#FBF8F0'); c.rect(13, 2, 3, 12, '#FBF8F0');
    c.rect(2, 2, 1, 12, '#D8D2C2'); c.rect(15, 2, 1, 12, '#D8D2C2');
  },
});

// ══ 부엌 ════════════════════════════════════════════════════
F('fridge', '냉장고', 2, 3, { prompt: '냉장고를 연다' }, c => {
  c.box(1, 1, 30, 46, 11, K.steelT, K.steelF, K.steelD);
  c.rect(2, 12, 28, 1, K.steelD);
  c.rect(2, 26, 28, 1, K.steelD);
  c.rect(15, 13, 1, 33, K.steelD);
  c.rect(4, 3, 22, 6, '#FBFDFF');
  c.rect(12, 16, 2, 8, K.steelD); c.rect(17, 16, 2, 8, K.steelD);
  c.rect(12, 30, 2, 10, K.steelD); c.rect(17, 30, 2, 10, K.steelD);
  c.rect(2, 44, 28, 2, '#7F8C95');
  c.rect(24, 13, 1, 33, '#B9C4CB');
});
F('stove', '가스레인지', 2, 2, { prompt: '레인지를 살핀다' }, c => {
  c.box(1, 1, 30, 30, 12, K.creamT, K.creamF, '#9E9480');
  [[9, 6], [22, 6], [9, 11], [22, 11]].forEach(([x, y]) => { c.ell(x, y, 4, 3, '#6E6A62'); c.ell(x, y, 2, 1, '#3F3C36'); });
  c.rect(3, 17, 26, 11, '#EFE7D6');
  c.rect(4, 19, 24, 7, '#6E6A62'); c.rect(5, 20, 22, 5, '#F4A34A');
  c.rect(4, 15, 24, 1, '#9E9480');
  [7, 12, 20, 25].forEach(x => c.ell(x, 16, 1, 1, '#7E766A'));
});
F('sink_counter', '개수대', 2, 1, { prompt: '개수대를 본다' }, c => {
  c.box(1, 1, 30, 14, 6, K.creamT, K.sageF, K.sageD);
  c.rect(2, 2, 28, 6, '#F7F2E6');
  c.rect(8, 3, 16, 5, K.steelF); c.frame(8, 3, 16, 5, K.steelD);
  c.rect(15, 1, 2, 3, K.steelD); c.rect(15, 1, 5, 1, K.steelD);
  c.rect(2, 9, 28, 6, K.sageF); c.rect(2, 8, 28, 1, K.sageD);
  c.rect(14, 11, 4, 1, '#EFE7D6');
});
F('counter', '조리대', 2, 1, { prompt: '조리대를 본다' }, c => {
  c.box(1, 1, 30, 14, 6, K.creamT, K.sageF, K.sageD);
  c.rect(2, 2, 28, 6, '#F7F2E6');
  c.rect(2, 9, 28, 6, K.sageF); c.rect(2, 8, 28, 1, K.sageD);
  c.rect(15, 9, 1, 6, K.sageD);
  c.rect(6, 11, 4, 1, '#EFE7D6'); c.rect(21, 11, 4, 1, '#EFE7D6');
});
F('kitchen_island', '아일랜드 조리대', 3, 2, { prompt: '아일랜드를 살핀다' }, c => {
  c.box(1, 1, 46, 30, 14, '#F9F4E8', K.sageF, K.sageD);
  c.rect(2, 2, 44, 13, '#FBF7ED');
  c.rect(2, 16, 44, 14, K.sageF);
  c.rect(2, 22, 44, 1, K.sageD);
  [10, 24, 38].forEach(x => c.rect(x, 18, 6, 1, '#EFE7D6'));
  c.rect(4, 5, 12, 5, '#EDE6D6'); c.frame(4, 5, 12, 5, '#D6CDB8');
});
F('cupboard', '찬장', 2, 2, { prompt: '찬장을 연다' }, c => {
  c.box(1, 1, 30, 30, 8, K.oakT, K.oakF, K.oakD);
  c.rect(3, 10, 12, 8, '#E9D9B8'); c.rect(17, 10, 12, 8, '#E9D9B8');
  c.rect(3, 20, 12, 8, '#E9D9B8'); c.rect(17, 20, 12, 8, '#E9D9B8');
  c.frame(3, 10, 12, 8, K.oakD); c.frame(17, 10, 12, 8, K.oakD);
  c.frame(3, 20, 12, 8, K.oakD); c.frame(17, 20, 12, 8, K.oakD);
  [[13, 14], [19, 14], [13, 24], [19, 24]].forEach(([x, y]) => c.rect(x, y, 1, 2, '#8A6435'));
});

// ══ 식탁 · 의자 ═════════════════════════════════════════════
F('dining_table', '큰 식탁', 4, 3, { prompt: '식탁을 살핀다' }, c => {
  c.rect(3, 30, 5, 16, K.darkD); c.rect(56, 30, 5, 16, K.darkD);
  c.box(1, 2, 62, 30, 20, K.woodT, K.woodF, K.darkD);
  c.hstripe(3, 4, 58, 18, 5, '#DCB783');
  c.rect(2, 22, 60, 1, K.darkD);
  c.rect(2, 23, 60, 8, K.oakF);
  c.rect(6, 32, 4, 13, K.darkF); c.rect(54, 32, 4, 13, K.darkF);
});
const chair = (dx, dy) => c => {
  const bx = 3, by = 3, w = 10, h = 10;
  c.box(bx, by, w, h, 5, K.oakT, K.oakF, K.oakD);      // 앉는 자리
  if (dy < 0) { c.rect(bx, by - 2, w, 3, K.darkF); c.rect(bx + 1, by - 2, w - 2, 1, K.oakT); }
  if (dy > 0) { c.rect(bx, by + h - 1, w, 3, K.darkF); c.rect(bx + 1, by + h + 1, w - 2, 1, K.oakT); }
  if (dx < 0) { c.rect(bx - 2, by, 3, h, K.darkF); c.rect(bx - 2, by + 1, 1, h - 2, K.oakT); }
  if (dx > 0) { c.rect(bx + w - 1, by, 3, h, K.darkF); c.rect(bx + w + 1, by + 1, 1, h - 2, K.oakT); }
  c.rect(bx + 1, by + h, 2, 3, K.darkD); c.rect(bx + w - 3, by + h, 2, 3, K.darkD);
};
F('chair_up', '의자(위)', 1, 1, { prompt: '의자에 앉는다' }, chair(0, -1));
F('chair_down', '의자(아래)', 1, 1, { prompt: '의자에 앉는다' }, chair(0, 1));
F('chair_left', '의자(왼쪽)', 1, 1, { prompt: '의자에 앉는다' }, chair(-1, 0));
F('chair_right', '의자(오른쪽)', 1, 1, { prompt: '의자에 앉는다' }, chair(1, 0));

// ══ 거실 ════════════════════════════════════════════════════
F('hearth', '난로', 4, 2, { prompt: '난로를 쬔다' }, c => {
  c.box(0, 0, 64, 30, 9, K.stoneT, K.stoneF, '#9A9077');
  // 돌 쌓기
  [[2, 11], [14, 11], [26, 11], [38, 11], [50, 11], [8, 17], [20, 17], [32, 17], [44, 17], [56, 17]]
    .forEach(([x, y]) => { c.rect(x, y, 10, 5, K.stoneT); c.frame(x, y, 10, 5, '#B2A88F'); });
  c.rect(0, 0, 64, 4, '#C9BFA4'); c.rect(0, 3, 64, 1, '#9A9077');
  // 아궁이
  c.rect(20, 12, 24, 17, '#3B2E22');
  c.rect(22, 20, 20, 9, K.fireC); c.rect(24, 23, 16, 6, K.fireB); c.rect(27, 26, 10, 3, K.fireA);
  c.rect(21, 27, 22, 2, '#5A4030');
  [24, 30, 36].forEach((x, i) => c.rect(x, 25 - i, 2, 3, '#7A5230'));
  c.rect(19, 11, 26, 1, '#8B7E63');
});
F('sofa_long', '긴 소파', 4, 2, { prompt: '소파에 앉는다' }, c => {
  c.rect(2, 2, 60, 9, '#EFE2C8'); c.frame(2, 2, 60, 9, '#9A8B6E');       // 등받이
  c.rect(4, 4, 56, 4, '#FAF3E2');
  c.rect(1, 10, 7, 17, '#F2E7D0'); c.frame(1, 10, 7, 17, '#9A8B6E');     // 팔걸이
  c.rect(56, 10, 7, 17, '#F2E7D0'); c.frame(56, 10, 7, 17, '#9A8B6E');
  c.rect(2, 11, 5, 4, '#FBF6E8'); c.rect(57, 11, 5, 4, '#FBF6E8');
  [9, 27, 45].forEach(x => {                                             // 방석 셋
    c.rect(x, 11, 17, 15, '#A9C295'); c.frame(x, 11, 17, 15, '#7C9A6B');
    c.rect(x + 1, 12, 15, 4, '#BFD5AB');
  });
  [[13, 4], [33, 4], [50, 4]].forEach(([x, y]) => {                      // 쿠션
    c.rect(x, y, 9, 6, '#D99E7C'); c.frame(x, y, 9, 6, '#B0755A');
  });
  c.rect(2, 26, 60, 3, '#E5D8BC'); c.rect(2, 28, 60, 1, '#9A8B6E');
  c.rect(5, 29, 4, 3, '#6E5A3C'); c.rect(55, 29, 4, 3, '#6E5A3C');
});
F('sofa_side', '소파(옆)', 2, 3, { prompt: '소파에 앉는다' }, c => {
  c.rect(21, 2, 9, 44, '#EFE2C8'); c.frame(21, 2, 9, 44, '#9A8B6E');     // 등받이(오른쪽)
  c.rect(23, 4, 5, 40, '#FAF3E2');
  c.rect(2, 1, 19, 7, '#F2E7D0'); c.frame(2, 1, 19, 7, '#9A8B6E');
  c.rect(2, 40, 19, 7, '#F2E7D0'); c.frame(2, 40, 19, 7, '#9A8B6E');
  [9, 25].forEach(y => {
    c.rect(3, y, 17, 15, '#A9C295'); c.frame(3, y, 17, 15, '#7C9A6B');
    c.rect(4, y + 1, 15, 4, '#BFD5AB');
  });
  [[22, 12], [22, 30]].forEach(([x, y]) => { c.rect(x, y, 7, 9, '#D99E7C'); c.frame(x, y, 7, 9, '#B0755A'); });
  c.rect(2, 47, 19, 1, '#9A8B6E');
  c.rect(4, 47, 4, 1, '#6E5A3C');
});
F('armchair', '안락의자', 2, 2, { prompt: '의자에 앉는다' }, c => {
  c.rect(3, 2, 26, 9, '#EFE2C8'); c.frame(3, 2, 26, 9, '#9A8B6E');       // 등받이
  c.rect(5, 4, 22, 4, '#FAF3E2');
  c.rect(2, 10, 7, 16, '#F2E7D0'); c.frame(2, 10, 7, 16, '#9A8B6E');     // 팔걸이
  c.rect(23, 10, 7, 16, '#F2E7D0'); c.frame(23, 10, 7, 16, '#9A8B6E');
  c.rect(3, 11, 5, 3, '#FBF6E8'); c.rect(24, 11, 5, 3, '#FBF6E8');
  c.rect(9, 11, 14, 15, '#A9C295'); c.frame(9, 11, 14, 15, '#7C9A6B');   // 방석
  c.rect(10, 12, 12, 4, '#BFD5AB');
  c.rect(12, 4, 8, 6, '#D99E7C'); c.frame(12, 4, 8, 6, '#B0755A');       // 쿠션
  c.rect(9, 26, 14, 3, '#E5D8BC'); c.rect(9, 28, 14, 1, '#9A8B6E');
  c.rect(5, 29, 3, 3, '#6E5A3C'); c.rect(24, 29, 3, 3, '#6E5A3C');
});
F('coffee_table', '탁자', 3, 2, { prompt: '탁자를 살핀다' }, c => {
  c.box(2, 3, 44, 22, 14, K.woodT, K.oakF, K.darkD);
  c.frame(6, 6, 36, 9, '#DCB783');
  c.rect(4, 25, 4, 5, K.darkD); c.rect(40, 25, 4, 5, K.darkD);
});
F('side_table', '작은 탁자', 1, 1, { prompt: '탁자를 본다' }, c => {
  c.box(2, 3, 12, 9, 5, K.woodT, K.oakF, K.darkD);
  c.rect(3, 12, 2, 3, K.darkD); c.rect(11, 12, 2, 3, K.darkD);
});
F('shelf', '선반', 2, 1, { prompt: '선반을 뒤진다' }, c => {
  c.box(1, 1, 30, 14, 5, K.oakT, K.oakF, K.oakD);
  c.rect(3, 8, 26, 6, '#E9D9B8'); c.frame(3, 8, 26, 6, K.oakD);
  c.rect(15, 8, 1, 6, K.oakD);
  [5, 8, 19, 22, 25].forEach((x, i) => c.rect(x, 9, 2, 4, [K.redF, K.blueF, K.leafF, '#C9A06A', K.sageF][i % 5]));
});
F('cabinet', '수납장', 1, 2, { prompt: '수납장을 연다' }, c => {
  c.box(1, 1, 14, 30, 7, K.oakT, K.oakF, K.oakD);
  c.rect(3, 10, 10, 8, '#E9D9B8'); c.rect(3, 20, 10, 8, '#E9D9B8');
  c.frame(3, 10, 10, 8, K.oakD); c.frame(3, 20, 10, 8, K.oakD);
  c.rect(7, 13, 2, 1, '#8A6435'); c.rect(7, 23, 2, 1, '#8A6435');
});
F('lamp', '등', 1, 2, { prompt: '등을 켠다' }, c => {
  c.rect(3, 2, 10, 9, '#FFE7A8'); c.frame(3, 2, 10, 9, '#E8C36A');
  c.rect(4, 3, 8, 3, '#FFF3D2');
  c.rect(7, 11, 2, 13, '#9A7A4A');
  c.ell(8, 26, 5, 3, '#B08A55'); c.ell(8, 25, 4, 2, '#C9A06A');
});
F('bookshelf_large', '큰 책장', 2, 2, { prompt: '책장을 살핀다' }, c => {
  c.box(0, 0, 32, 32, 4, K.darkT, K.darkF, K.dark);
  const spines = ['#C56A4C', '#5FA344', '#5D8699', '#C9A06A', '#98492F', '#77916C', '#E0B05A', '#7B5230'];
  [5, 12, 19, 26].forEach((sy, r) => {
    c.rect(2, sy, 28, 6, '#4E3B27');
    let x = 3;
    let i = r * 3;
    while (x < 29) {
      const w = 2 + ((i * 7 + r) % 3);
      c.rect(x, sy + 1 - ((i % 2)), Math.min(w, 29 - x), 5 + (i % 2), spines[(i + r) % spines.length]);
      x += w + 1; i++;
    }
    c.rect(2, sy + 6, 28, 1, K.dark);
  });
});
F('desk', '책상', 3, 2, { prompt: '책상을 들여다본다' }, c => {
  c.box(1, 2, 46, 22, 13, K.woodT, K.oakF, K.darkD);
  c.rect(3, 16, 20, 7, '#C9A06A'); c.frame(3, 16, 20, 7, K.darkD);
  c.rect(11, 19, 4, 1, '#7B5230');
  c.rect(26, 16, 20, 7, '#C9A06A'); c.frame(26, 16, 20, 7, K.darkD);
  c.rect(34, 19, 4, 1, '#7B5230');
  c.rect(3, 24, 4, 6, K.darkD); c.rect(41, 24, 4, 6, K.darkD);
});

// ══ 욕실 ════════════════════════════════════════════════════
F('bathtub', '욕조', 3, 2, { prompt: '욕조를 들여다본다' }, c => {
  c.rect(1, 3, 46, 26, '#F6FAFC'); c.frame(1, 3, 46, 26, '#BFD0D8');
  c.ell(24, 16, 20, 10, '#CFE9F4'); c.ring(24, 16, 20, 10, '#F1F8FB');
  c.ell(24, 16, 17, 8, '#AFDCEE');
  c.ell(14, 12, 5, 2, '#E8F6FC');
  c.rect(44, 8, 3, 5, K.steelD); c.rect(41, 8, 5, 2, K.steelD);
  c.rect(1, 29, 46, 2, '#BFD0D8');
});
F('toilet', '변기', 1, 2, { prompt: '변기를 본다' }, c => {
  c.rect(3, 2, 10, 8, '#FAFDFE'); c.frame(3, 2, 10, 8, '#C3D2D9');
  c.rect(4, 3, 8, 3, '#E9F4F8');
  c.ell(8, 17, 6, 7, '#FAFDFE'); c.ring(8, 17, 6, 7, '#C3D2D9');
  c.ell(8, 17, 4, 5, '#DDEDF3');
  c.rect(6, 24, 5, 4, '#E4EEF2');
});
F('bath_sink', '세면대', 1, 1, { prompt: '세면대를 본다' }, c => {
  c.rect(2, 4, 12, 10, '#FAFDFE'); c.frame(2, 4, 12, 10, '#C3D2D9');
  c.ell(8, 9, 4, 3, '#CFE9F4');
  c.rect(7, 2, 2, 3, K.steelD); c.rect(7, 2, 4, 1, K.steelD);
});
F('bath_cabinet', '욕실장', 1, 2, { prompt: '욕실장을 연다' }, c => {
  c.box(2, 2, 12, 27, 6, '#F2F7F9', '#DCE8ED', '#AFC0C8');
  c.rect(4, 10, 8, 7, '#EAF3F6'); c.rect(4, 19, 8, 7, '#EAF3F6');
  c.frame(4, 10, 8, 7, '#AFC0C8'); c.frame(4, 19, 8, 7, '#AFC0C8');
  c.px(11, 13, '#8FA3AC'); c.px(11, 22, '#8FA3AC');
});
F('mirror', '거울', 1, 1, { cat: 'prop', block: false, prompt: '거울을 본다' }, c => {
  c.rect(3, 2, 10, 12, '#D9EEF7'); c.frame(3, 2, 10, 12, '#C9A06A');
  c.rect(4, 3, 4, 10, '#EAF7FC');
});

// ══ 데크 ════════════════════════════════════════════════════
F('patio_set', '파라솔 탁자', 3, 3, { prompt: '탁자에 앉는다' }, c => {
  c.box(10, 26, 28, 14, 8, K.woodT, K.oakF, K.darkD);          // 둥근 탁자 (파라솔 아래)
  c.ell(24, 30, 13, 7, K.woodT); c.ring(24, 30, 13, 7, K.darkD);
  // 파라솔
  c.ell(24, 18, 22, 13, '#F4E7C8'); c.ring(24, 18, 22, 13, '#DCC79A');
  for (let a = 0; a < 8; a++) {
    const t = a * Math.PI / 4;
    for (let r = 4; r < 22; r++) c.px(24 + Math.cos(t) * r, 18 + Math.sin(t) * r * 0.6, '#E6D2A6');
  }
  c.ell(24, 18, 6, 4, '#FBF3DF');
  c.rect(23, 6, 2, 26, '#9A7A4A');
  c.px(24, 4, '#C9A06A'); c.px(23, 5, '#C9A06A'); c.px(25, 5, '#C9A06A');
});
F('deck_chair', '데크 의자', 1, 1, { prompt: '의자에 앉는다' }, c => {
  c.box(2, 4, 12, 9, 4, K.woodT, K.oakF, K.darkD);
  c.rect(2, 1, 12, 4, K.darkF); c.rect(3, 1, 10, 1, K.oakT);
  c.rect(3, 13, 2, 2, K.darkD); c.rect(11, 13, 2, 2, K.darkD);
});

// ══ 운동 ════════════════════════════════════════════════════
F('exercise_mat', '운동 매트', 3, 2, { cat: 'prop', block: false }, c => {
  c.rect(1, 3, 46, 26, '#5E86A8'); c.frame(1, 3, 46, 26, '#436A8A');
  c.rect(3, 5, 42, 22, '#6E97B8');
  c.hstripe(4, 7, 40, 19, 5, '#5E86A8');
});
F('weight_bench', '벤치', 3, 2, { prompt: '벤치에 눕는다' }, c => {
  c.rect(4, 8, 40, 12, '#3C4149'); c.frame(4, 8, 40, 12, '#23272D');
  c.rect(6, 9, 36, 5, '#4E545D');
  c.rect(2, 4, 6, 20, '#5A616B'); c.rect(40, 4, 6, 20, '#5A616B');
  c.rect(6, 24, 4, 6, '#23272D'); c.rect(38, 24, 4, 6, '#23272D');
  c.rect(1, 2, 46, 3, '#8E959E');                                // 바벨
  c.ell(6, 3, 5, 4, '#2C3036'); c.ell(42, 3, 5, 4, '#2C3036');
});
F('dumbbell_rack', '아령 거치대', 2, 1, { prompt: '아령을 든다' }, c => {
  c.rect(1, 6, 30, 8, '#5A616B'); c.frame(1, 6, 30, 8, '#2C3036');
  [5, 13, 21].forEach(x => {
    c.rect(x, 3, 6, 3, '#8E959E');
    c.ell(x, 4, 2, 3, '#2C3036'); c.ell(x + 6, 4, 2, 3, '#2C3036');
  });
  c.rect(2, 14, 3, 2, '#2C3036'); c.rect(27, 14, 3, 2, '#2C3036');
});
F('gym_machine', '운동 기구', 2, 3, { prompt: '기구를 써 본다' }, c => {
  c.rect(4, 2, 24, 8, '#4E545D'); c.frame(4, 2, 24, 8, '#23272D');
  c.rect(6, 3, 20, 3, '#646B75');
  c.rect(12, 10, 8, 26, '#5A616B'); c.frame(12, 10, 8, 26, '#2C3036');
  [12, 18, 24, 30].forEach(y => c.rect(13, y, 6, 3, '#8E959E'));
  c.rect(2, 36, 28, 6, '#3C4149'); c.frame(2, 36, 28, 6, '#23272D');
  c.rect(6, 42, 4, 4, '#23272D'); c.rect(22, 42, 4, 4, '#23272D');
  c.rect(15, 6, 2, 6, '#8E959E');
});

// ══ 텃밭 · 헛간 · 뜰 ═══════════════════════════════════════
F('veg_bed', '채소 화단', 2, 2, { prompt: '채소를 살핀다' }, c => {
  c.box(0, 0, 32, 32, 3, K.oakT, K.oakF, K.oakD);
  c.rect(3, 4, 26, 25, K.soilF); c.hstripe(3, 5, 26, 24, 4, K.soilD);
  [[8, 9], [20, 9], [8, 18], [20, 18], [14, 25]].forEach(([x, y]) => {
    c.ell(x, y, 4, 3, K.leafF); c.ell(x - 1, y - 1, 2, 2, K.leafT); c.px(x + 2, y + 1, K.leafD);
  });
});
F('garden_tools', '농기구', 1, 2, { prompt: '농기구를 본다' }, c => {
  c.rect(4, 4, 2, 26, '#B08A55'); c.rect(10, 6, 2, 24, '#B08A55');
  c.rect(2, 1, 6, 4, '#9AA2A8'); c.frame(2, 1, 6, 4, '#6E767C');
  c.rect(8, 3, 6, 3, '#9AA2A8'); c.px(9, 6, '#6E767C'); c.px(11, 6, '#6E767C'); c.px(13, 6, '#6E767C');
});
F('watering_can', '물뿌리개', 1, 1, { cat: 'prop', block: false, prompt: '물뿌리개를 본다' }, c => {
  c.rect(4, 6, 8, 8, K.blueF); c.frame(4, 6, 8, 8, K.blueD);
  c.rect(5, 7, 6, 3, '#BFE0EE');
  c.rect(12, 4, 3, 2, K.blueD); c.rect(1, 8, 3, 1, K.blueD); c.rect(1, 8, 1, 3, K.blueD);
  c.rect(6, 4, 4, 2, K.blueD);
});
F('boxes', '상자', 1, 1, { prompt: '상자를 열어 본다' }, c => {
  c.box(2, 5, 12, 10, 4, K.woodT, K.oakF, K.oakD);
  c.rect(2, 9, 12, 1, K.oakD); c.rect(7, 9, 2, 6, K.oakD);
  c.rect(1, 1, 10, 5, K.woodF); c.frame(1, 1, 10, 5, K.oakD);
});
F('baskets', '바구니', 1, 1, { cat: 'prop', block: false, prompt: '바구니를 들여다본다' }, c => {
  c.ell(8, 10, 6, 5, '#D6A968'); c.ring(8, 10, 6, 5, '#A57A3E');
  c.hstripe(3, 7, 11, 8, 2, '#C09253');
  c.rect(2, 6, 12, 1, '#A57A3E');
});
F('tree', '나무', 2, 2, { cat: 'nature', prompt: '나무를 올려다본다' }, c => {
  c.rect(13, 21, 6, 11, '#8A5F35');
  c.rect(13, 21, 2, 11, '#A5763F'); c.rect(17, 21, 2, 11, '#6E4A28');
  c.ell(16, 14, 15, 12, K.leafD);
  c.ell(15, 12, 14, 11, K.leafF);
  c.ell(11, 8, 9, 7, K.leafT); c.ell(22, 10, 6, 5, K.leafT);
  c.speck(4, 4, 24, 16, K.leafT, 12, 5);
  c.speck(6, 12, 20, 10, K.leafD, 10, 9);
  c.ell(16, 21, 12, 4, K.leafD);
});
F('bush', '덤불', 1, 1, { cat: 'nature', block: false }, c => {
  c.ell(8, 10, 7, 5, K.leafF); c.ell(5, 8, 3, 3, K.leafT); c.ell(11, 9, 3, 2, K.leafT);
  c.ell(8, 13, 6, 2, K.leafD);
  [[4, 7], [12, 11], [8, 6]].forEach(([x, y]) => c.px(x, y, '#FFE9A8'));
});
F('flower_bed', '꽃밭', 2, 1, { cat: 'nature', block: false }, c => {
  c.ell(8, 10, 7, 5, K.leafF); c.ell(23, 10, 7, 5, K.leafF);
  c.ell(16, 9, 6, 4, K.leafT);
  [[5, 7, '#F58BA8'], [11, 9, '#FFD35A'], [16, 6, '#FFF3C4'], [21, 8, '#E98BD0'], [27, 10, '#FFD35A']]
    .forEach(([x, y, col]) => { c.ell(x, y, 2, 2, col); c.px(x, y, '#FFFDF0'); });
});
F('mailbox', '우편함', 1, 1, { cat: 'prop', prompt: '우편함을 본다' }, c => {
  c.rect(7, 9, 3, 7, '#9A7A4A'); c.rect(7, 9, 1, 7, '#B4915C');
  c.rect(2, 2, 12, 8, K.redF); c.frame(2, 2, 12, 8, K.redD);
  c.rect(3, 3, 10, 2, K.redT);
  c.rect(13, 4, 2, 4, '#E8C36A');
  c.px(4, 7, '#FBEBD2'); c.px(5, 7, '#FBEBD2'); c.px(6, 7, '#FBEBD2');
});

// ══ 작은 소품 (가구 위에 놓인다) ═══════════════════════════
F('cheesecake', '치즈케이크', 1, 1, { cat: 'prop', block: false, on: true, prompt: '치즈케이크를 본다' }, c => {
  c.ell(8, 10, 6, 4, '#FAF3DC'); c.ring(8, 10, 6, 4, '#E4D3A4');
  c.ell(8, 9, 5, 3, '#F6E7BE');
  c.rect(4, 5, 8, 5, '#F7E3B0'); c.frame(4, 5, 8, 5, '#D9BE85');
  c.rect(5, 4, 6, 2, '#FFF6DE');
  c.px(7, 3, '#E8746A'); c.px(9, 3, '#E8746A');
});
F('empty_plate', '빈 접시', 1, 1, { cat: 'prop', block: false, on: true, prompt: '빈 접시를 들여다본다' }, c => {
  c.ell(8, 9, 7, 5, '#FBF8F1'); c.ring(8, 9, 7, 5, '#DCD4C4');
  c.ell(8, 9, 4, 3, '#F2ECDD');
  c.px(6, 8, '#E4D3A4'); c.px(10, 10, '#E4D3A4');
});
F('plates', '접시 더미', 1, 1, { cat: 'prop', block: false, on: true, prompt: '접시를 본다' }, c => {
  [12, 9, 6].forEach((y, i) => { c.ell(8, y, 6 - i, 3, '#FBF8F1'); c.ring(8, y, 6 - i, 3, '#D6CDBA'); });
});
F('cooking_pot', '냄비', 1, 1, { cat: 'prop', block: false, on: true, prompt: '냄비를 들여다본다' }, c => {
  c.ell(8, 10, 6, 5, '#8E959E'); c.ring(8, 10, 6, 5, '#5A616B');
  c.ell(8, 9, 5, 4, '#B4BAC1');
  c.rect(3, 6, 10, 2, '#6E767C'); c.rect(7, 4, 2, 2, '#6E767C');
  c.px(1, 9, '#5A616B'); c.px(14, 9, '#5A616B');
});
F('books', '책 더미', 1, 1, { cat: 'prop', block: false, on: true, prompt: '책을 본다' }, c => {
  c.rect(3, 11, 11, 3, K.redF); c.rect(3, 11, 11, 1, K.redT);
  c.rect(4, 8, 10, 3, '#5D8699'); c.rect(4, 8, 10, 1, '#8FB4C6');
  c.rect(3, 5, 11, 3, K.leafF); c.rect(3, 5, 11, 1, K.leafT);
});
F('note', '쪽지', 1, 1, { cat: 'prop', block: false, on: true, prompt: '쪽지를 읽는다' }, c => {
  c.rect(3, 5, 11, 8, '#FCF6E4'); c.frame(3, 5, 11, 8, '#D6CBAC');
  [7, 9, 11].forEach(y => c.rect(5, y, 7, 1, '#BFB393'));
});
F('diary', '일기장', 1, 1, { cat: 'prop', block: false, on: true, prompt: '일기장을 펼친다' }, c => {
  c.rect(2, 4, 12, 10, '#8B4513'); c.frame(2, 4, 12, 10, '#5C2E0C');
  c.rect(3, 5, 10, 8, '#FCF6E4');
  c.rect(8, 4, 1, 10, '#C9A06A');
  [7, 9, 11].forEach(y => { c.rect(4, y, 3, 1, '#C4B79A'); c.rect(10, y, 3, 1, '#C4B79A'); });
});
F('plant_pot', '화분', 1, 1, { cat: 'nature', block: false, prompt: '화분을 본다' }, c => {
  c.ell(8, 6, 6, 5, K.leafF); c.ell(6, 4, 3, 3, K.leafT); c.ell(11, 6, 3, 2, K.leafT);
  c.rect(4, 10, 9, 5, K.redF); c.frame(4, 10, 9, 5, K.redD);
  c.rect(3, 9, 11, 2, K.redT);
});

// ── 키우기 ──────────────────────────────────────────────────
// 참조 그림(docs/reference-house.png)에서 이 가구들이 차지하는 비중에 맞춘다.
// 원래 그림을 최근접으로 늘린다 — 픽셀아트라 결이 유지된다.
const GROW = {
  fridge: [3, 4], stove: [3, 2], sink_counter: [3, 1], counter: [3, 1], kitchen_island: [5, 3],
  cupboard: [3, 2], dining_table: [7, 5], hearth: [5, 3], sofa_long: [6, 2], sofa_side: [2, 5],
  coffee_table: [4, 2], shelf: [3, 1], bookshelf_large: [3, 2], desk: [5, 3], bathtub: [4, 2],
  patio_set: [5, 5], exercise_mat: [5, 3], weight_bench: [4, 2], gym_machine: [3, 4],
  veg_bed: [4, 3], tree: [3, 3],
};

// ── 뽑기 ────────────────────────────────────────────────────
const now = new Date().toISOString();
const out = Object.entries(ART).map(([key, a]) => {
  let cols = a.cols || 1, rows = a.rows || 1;
  let c = canvas(cols, rows);
  a.draw(c);
  if (GROW[key]) {
    const [c2, r2] = GROW[key];
    const src = c, dst = canvas(c2, r2);
    for (let y = 0; y < dst.h; y++) for (let x = 0; x < dst.w; x++) {
      const sx = Math.min(src.w - 1, Math.floor(x * src.w / dst.w));
      const sy = Math.min(src.h - 1, Math.floor(y * src.h / dst.h));
      dst.g[y][x] = src.g[sy][sx];
    }
    c = dst; cols = c2; rows = r2;
  }
  const pixels = [];
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const v = c.g[y][x];
    pixels.push(typeof v === 'string' && v.startsWith('#') ? v : '');
  }
  if (pixels.length !== c.w * c.h) throw new Error(key + ' pixels=' + pixels.length);
  return {
    id: 'SMO_CHZ_' + key.toUpperCase(), key, name: a.name, category: a.cat, layerHint: a.layer,
    size: { cols, rows },
    visual: {
      kind: 'pixel', width: c.w, height: c.h, tileSize: 16,
      color: pixels.find(Boolean) || '#CCCCCC', symbol: key.slice(0, 2).toUpperCase(),
      pixels, palette: [], imageDataUrl: '', imageUrl: '', referenceImageDataUrl: '', referenceName: '',
    },
    collision: { blocksMovement: !!a.block, blocksVision: a.cat === 'solid' },
    terrain: { type: a.cat === 'terrain' ? key : 'floor', moveSpeed: 1, staminaCost: 0, footstep: 'soft', damagePerSecond: 0 },
    interaction: { kind: a.prompt ? 'inspect' : 'none', prompt: a.prompt || '' },
    tags: ['치즈케이크', a.cat, ...(a.on ? ['ontop'] : [])],
    mapTheme: null, builtin: false,
    meta: { createdAt: now, updatedAt: now },
  };
});
writeFileSync(join(__dirname, 'smo.json'), JSON.stringify(out), 'utf8');
console.error(`SMO ${out.length}개 · ${out.filter(o => o.size.cols > 1 || o.size.rows > 1).length}개는 여러 칸`);
