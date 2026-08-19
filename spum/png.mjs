// 의존성 없이 PNG 를 쓴다. 도면을 눈으로 확인할 때 쓰인다.
import { deflateSync } from 'node:zlib';

const TAB = (() => { const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return t; })();
const crc32 = b => { let c = -1; for (const x of b) c = TAB[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

export function encodePNG(w, h, rgba) {
  const stride = w * 4, raw = Buffer.alloc(h * (stride + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

// 그림판 — 색은 '#RRGGBB' 문자열, 빈 문자열은 건너뛴다.
export function surface(w, h, bg = '#00000000') {
  const px = new Uint8Array(w * h * 4);
  const parse = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16),
                      s.length > 7 ? parseInt(s.slice(7, 9), 16) : 255];
  if (bg) { const [r, g, b, a] = parse(bg); for (let i = 0; i < w * h; i++) { px[i*4]=r; px[i*4+1]=g; px[i*4+2]=b; px[i*4+3]=a; } }
  const o = {
    px, w, h,
    set(x, y, col) {
      x |= 0; y |= 0;
      if (!col || x < 0 || y < 0 || x >= w || y >= h) return o;
      const [r, g, b] = parse(col), i = (y * w + x) * 4;
      px[i] = r; px[i+1] = g; px[i+2] = b; px[i+3] = 255; return o;
    },
    fill(x, y, rw, rh, col) { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) o.set(x + i, y + j, col); return o; },
    // 반투명 덧칠 (깔개·그림자)
    wash(x, y, rw, rh, col, a) {
      const [r, g, b] = parse(col);
      for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) {
        const cx = (x + i) | 0, cy = (y + j) | 0;
        if (cx < 0 || cy < 0 || cx >= w || cy >= h) continue;
        const k = (cy * w + cx) * 4;
        px[k] = px[k] * (1 - a) + r * a; px[k+1] = px[k+1] * (1 - a) + g * a; px[k+2] = px[k+2] * (1 - a) + b * a; px[k+3] = 255;
      }
      return o;
    },
    png() { return encodePNG(w, h, px); },
  };
  return o;
}

// ── 읽기 ────────────────────────────────────────────────────
// 8bit RGBA(colortype 6) · 인터레이스 없음. SPUM 유니티 타일시트를 읽으려고 넣었다.
import { inflateSync } from 'node:zlib';

export function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504E47) throw new Error('PNG 가 아니다');
  let o = 8; const idat = []; let w = 0, h = 0, depth = 0, type = 0;
  while (o < buf.length) {
    const len = buf.readUInt32BE(o), tag = buf.toString('ascii', o + 4, o + 8);
    const body = buf.subarray(o + 8, o + 8 + len);
    if (tag === 'IHDR') {
      w = body.readUInt32BE(0); h = body.readUInt32BE(4); depth = body[8]; type = body[9];
      if (body[12] !== 0) throw new Error('인터레이스 PNG 는 못 읽는다');
    } else if (tag === 'IDAT') idat.push(body);
    else if (tag === 'IEND') break;
    o += 12 + len;
  }
  if (depth !== 8 || (type !== 6 && type !== 2))
    throw new Error(`8bit RGB/RGBA 만 읽는다 (depth ${depth}, type ${type})`);
  const chan = type === 6 ? 4 : 3;                 // 2 = RGB(알파 없음)
  const raw = inflateSync(Buffer.concat(idat));
  const bpp = chan, stride = w * bpp;
  const px = new Uint8Array(w * h * 4);
  let prev = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const cur = new Uint8Array(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      cur[i] = v & 255;
    }
    if (chan === 4) px.set(cur, y * stride);
    else for (let x = 0; x < w; x++) {
      const d = (y * w + x) * 4;
      px[d] = cur[x * 3]; px[d + 1] = cur[x * 3 + 1]; px[d + 2] = cur[x * 3 + 2]; px[d + 3] = 255;
    }
    prev = cur;
  }
  return { w, h, px };
}
