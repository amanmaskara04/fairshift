// Generates the PWA icons with Node built-ins only (no image libraries).
// Design: brand-teal background, white clock face with hands at 9:00 (shift time).
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const TEAL = [15, 118, 110];
const WHITE = [255, 255, 255];

function crc32(buf) {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, safeZone) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  const c = size / 2;
  const r = (size / 2) * safeZone * 0.62;
  const ring = r * 0.14;
  const hand = r * 0.11;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const dx = x - c;
      const dy = y - c;
      const d = Math.hypot(dx, dy);
      const onRing = d <= r && d >= r - ring;
      const minuteHand = Math.abs(dx) <= hand && dy <= 0 && dy >= -r * 0.7;
      const hourHand = Math.abs(dy) <= hand && dx <= 0 && dx >= -r * 0.5;
      const color = onRing || minuteHand || hourHand ? WHITE : TEAL;
      const i = y * (size * 3 + 1) + 1 + x * 3;
      raw[i] = color[0];
      raw[i + 1] = color[1];
      raw[i + 2] = color[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

writeFileSync("public/icon-192.png", png(192, 1));
writeFileSync("public/icon-512.png", png(512, 1));
writeFileSync("public/icon-maskable-512.png", png(512, 0.8));
writeFileSync("public/apple-touch-icon.png", png(180, 1));
console.log("icons written to public/");
