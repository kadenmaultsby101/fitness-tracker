#!/usr/bin/env node
/*
 * Tiny dependency-free PNG generator for the Trace app icon.
 *
 * Renders the same "T" mark as icon.svg into a raw RGBA buffer and
 * writes a valid PNG using only Node's built-in `zlib` for IDAT
 * compression and `fs` for output.
 *
 * Produces icon-192.png and icon-512.png at the project root.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// --- PNG encoder -----------------------------------------------------------

// CRC32 table per the PNG spec.
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  // Signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type: RGBA
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace
  // Filtered scanlines: a 0x00 (None filter) byte before each row.
  const stride = width * 4;
  const filtered = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    filtered[y * (stride + 1)] = 0;
    rgba.copy(filtered, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(filtered, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- T mark renderer -------------------------------------------------------

/*
 * Draws the T glyph at the given size. We keep proportions identical to
 * icon.svg (viewBox 512), so coordinates simply scale by `size / 512`.
 */
function renderT(size) {
  const rgba = Buffer.alloc(size * size * 4);
  // Fill black
  for (let i = 0; i < size * size; i++) {
    rgba[i * 4 + 0] = 0;
    rgba[i * 4 + 1] = 0;
    rgba[i * 4 + 2] = 0;
    rgba[i * 4 + 3] = 255;
  }
  const s = size / 512;
  // Crossbar: x=112, y=148, w=288, h=36
  const cb = { x: Math.round(112 * s), y: Math.round(148 * s), w: Math.round(288 * s), h: Math.round(36 * s) };
  // Stem: x=238, y=148, w=36, h=252
  const st = { x: Math.round(238 * s), y: Math.round(148 * s), w: Math.round(36 * s), h: Math.round(252 * s) };
  const drawRect = (r) => {
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) {
        const i = (y * size + x) * 4;
        rgba[i] = 255; rgba[i + 1] = 255; rgba[i + 2] = 255; rgba[i + 3] = 255;
      }
    }
  };
  drawRect(cb);
  drawRect(st);
  return rgba;
}

// --- Output ----------------------------------------------------------------

const outDir = path.resolve(__dirname, '..');
const targets = [192, 512];
for (const size of targets) {
  const png = encodePNG(size, size, renderT(size));
  const file = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(file, png);
  console.log(`wrote ${file} (${png.length} bytes)`);
}
