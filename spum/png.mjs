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
