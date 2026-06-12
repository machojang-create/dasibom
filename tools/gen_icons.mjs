/* PWA 아이콘 생성기 — 의존성 없이 PNG 인코딩(zlib). 민트 배경 + 흰 새싹.
   실행: node tools/gen_icons.mjs  → img/icon-192.png, img/icon-512.png */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = path.resolve(import.meta.dirname, '..');

// CRC32 (PNG 청크용)
const crcTable = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(w, h, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8bit RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// 회전 타원 포함 판정
function inEllipse(px, py, cx, cy, rx, ry, deg) {
  const th = deg * Math.PI / 180, dx = px - cx, dy = py - cy;
  const x = dx * Math.cos(th) + dy * Math.sin(th), y = -dx * Math.sin(th) + dy * Math.cos(th);
  return (x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1;
}

function drawIcon(S) {
  const buf = Buffer.alloc(S * S * 4);
  const BG = [14, 157, 125], LEAF = [255, 255, 255], DOT = [255, 244, 214];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let c = BG;
    const u = x / S, v = y / S;
    // 줄기 (살짝 곡선 느낌으로 두 구간)
    if (Math.abs(u - 0.5) < 0.028 && v > 0.40 && v < 0.80) c = LEAF;
    // 잎 두 장 (회전 타원)
    if (inEllipse(u, v, 0.375, 0.385, 0.155, 0.095, -38)) c = LEAF;
    if (inEllipse(u, v, 0.625, 0.385, 0.155, 0.095, 38)) c = LEAF;
    // 햇살 점
    if (inEllipse(u, v, 0.5, 0.205, 0.045, 0.045, 0)) c = DOT;
    const i = (y * S + x) * 4;
    buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = 255;
  }
  return encodePNG(S, S, buf);
}

for (const S of [192, 512]) {
  const out = path.join(ROOT, 'img', `icon-${S}.png`);
  fs.writeFileSync(out, drawIcon(S));
  console.log('✅', out, Math.round(fs.statSync(out).size / 1024) + 'KB');
}
