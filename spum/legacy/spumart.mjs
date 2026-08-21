// SPUM 유니티 타일셋에서 그림을 오려다 붙인다.
// 재료 목록은 materials.mjs, 도면은 house.mjs, 합치는 것은 compose.mjs 가 한다.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePNG } from '../png.mjs';
import { SHEETS, MAT, RUG9, OBJ } from '../materials.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CELL = 16;                                   // SPUM 타일 원본 한 칸

let sheets = null;
export function loadSheets() {
  if (sheets) return sheets;
  sheets = {};
  for (const [k, f] of Object.entries(SHEETS))
    sheets[k] = decodePNG(readFileSync(join(__dirname, 'spum-tiles', f)));
  return sheets;
}

// 원본 (sx,sy,sw,sh) 화소를 대상 (dx,dy,dw,dh) 로 최근접 확대해 알파 합성한다.
export function blit(sf, sheet, sx, sy, sw, sh, dx, dy, dw, dh, tint, clip) {
  const im = loadSheets()[sheet];
  if (!im) throw new Error('없는 시트: ' + sheet);
  const [tr, tg, tb, ta] = tint
    ? [parseInt(tint[0].slice(1, 3), 16), parseInt(tint[0].slice(3, 5), 16), parseInt(tint[0].slice(5, 7), 16), tint[1]]
    : [0, 0, 0, 0];
  for (let j = 0; j < dh; j++) {
    const py = dy + j; if (py < 0 || py >= sf.h) continue;
    if (clip && (py < clip[0] || py >= clip[1])) continue;
    const oy = sy + Math.min(sh - 1, Math.floor(j * sh / dh));
    if (oy < 0 || oy >= im.h) continue;
    for (let i = 0; i < dw; i++) {
      const px = dx + i; if (px < 0 || px >= sf.w) continue;
      const ox = sx + Math.min(sw - 1, Math.floor(i * sw / dw));
      if (ox < 0 || ox >= im.w) continue;
      const s = (oy * im.w + ox) * 4;
      const a = im.px[s + 3] / 255; if (a < 0.02) continue;
      let r = im.px[s], gg = im.px[s + 1], b = im.px[s + 2];
      if (ta) { r = r * (1 - ta) + tr * ta; gg = gg * (1 - ta) + tg * ta; b = b * (1 - ta) + tb * ta; }
      const d = (py * sf.w + px) * 4;
      sf.px[d]     = sf.px[d]     * (1 - a) + r  * a;
      sf.px[d + 1] = sf.px[d + 1] * (1 - a) + gg * a;
      sf.px[d + 2] = sf.px[d + 2] * (1 - a) + b  * a;
      sf.px[d + 3] = 255;
    }
  }
}

// 바닥 재료 한 칸
export function drawMat(sf, key, tx, ty, TS) {
  const m = MAT[key]; if (!m) throw new Error('없는 재료: ' + key);
  blit(sf, m.s, m.c * CELL, m.r * CELL, CELL, CELL, tx * TS, ty * TS, TS, TS, m.tint);
}

// 물건 하나 — (tx,ty) 부터 cw×ch 칸에 그린다
// rows = [처음, 끝) 을 주면 그 칸 줄만 그린다 — 깊이(front/back) 나눌 때 쓴다
export function drawObj(sf, key, tx, ty, cw, ch, TS, rows) {
  const spec = OBJ[key]; if (!spec) return false;
  const clip = rows ? [(ty + rows[0]) * TS, (ty + rows[1]) * TS] : null;
  // rep:'x' 조각은 좌·우 조각이 먹고 남은 폭을 나눠 가진다
  const fixed = spec.filter(p => p.rep !== 'x').reduce((n, p) => n + (p.w ?? 0), 0);
  let cursor = 0;
  for (const p of spec) {
    let w = p.rep === 'x' ? Math.max(1, cw - fixed) : (p.w ?? cw);
    let h = p.h ?? ch;
    const x = p.x ?? (p.w !== undefined || p.rep === 'x' ? cursor : 0);
    const y = p.y ?? 0;
    w = Math.max(0, Math.min(w, cw - x));            // 물건 상자를 넘지 않게 자른다
    h = Math.max(0, Math.min(h, ch - y));
    if (w === 0 || h === 0) continue;
    if (p.rep === 'xy') {                            // 가로·세로로 결을 깐다
      for (let ky = 0; ky < h; ky += p.ch) for (let kx = 0; kx < w; kx += p.cw)
        blit(sf, p.s, p.c * CELL, p.r * CELL, p.cw * CELL, p.ch * CELL,
             (tx + x + kx) * TS, (ty + y + ky) * TS,
             Math.min(p.cw, w - kx) * TS, Math.min(p.ch, h - ky) * TS, p.tint, clip);
      continue;
    }
    if (p.rep === 'x') {
      const unit = Math.max(1, p.cw);
      for (let k = 0; k < w; k += unit)
        blit(sf, p.s, p.c * CELL, p.r * CELL, p.cw * CELL, p.ch * CELL,
             (tx + x + k) * TS, (ty + y) * TS, Math.min(unit, w - k) * TS, h * TS, p.tint, clip);
    } else if (p.rep === 'y') {
      const unit = Math.max(1, p.ch);
      for (let k = 0; k < h; k += unit)
        blit(sf, p.s, p.c * CELL, p.r * CELL, p.cw * CELL, p.ch * CELL,
             (tx + x) * TS, (ty + y + k) * TS, w * TS, Math.min(unit, h - k) * TS, p.tint, clip);
    } else {
      blit(sf, p.s, p.c * CELL, p.r * CELL, p.cw * CELL, p.ch * CELL,
           (tx + x) * TS, (ty + y) * TS, w * TS, h * TS, p.tint, clip);
    }
    if (p.x === undefined) cursor += w;
  }
  return true;
}

// 깔개 — 9칸 한 벌을 사각형에 늘려 깐다
export function drawRug(sf, key, x1, y1, x2, y2, TS) {
  const r = RUG9[key]; if (!r) return;
  const w = x2 - x1 + 1, h = y2 - y1 + 1;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const cx = i === 0 ? 0 : (i === w - 1 ? 2 : 1);
    const cy = j === 0 ? 0 : (j === h - 1 ? 2 : 1);
    blit(sf, r.s, (r.c + cx) * CELL, (r.r + cy) * CELL, CELL, CELL,
         (x1 + i) * TS, (y1 + j) * TS, TS, TS);
  }
}
