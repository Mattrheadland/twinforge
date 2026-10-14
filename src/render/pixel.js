// '80s pixel-art helpers (STYLE_GUIDE v4).
// Art is drawn on a coarse grid (about 200 pixels tall on an iPhone) and
// scaled up with hard square pixels, but sprites, camera and effects move
// smoothly between those pixels, so it looks 8-bit and moves like a modern game.
//   crispAlpha  — removes soft anti-aliased fringes from a sprite (on/off alpha)
//   PALETTE     — one fixed, original 8-bit-style palette every pixel snaps to
//   pixelize    — crisp alpha + palette snap (sprites, portraits)
//   dither      — 4×4 Bayer ordered dither into the palette (backgrounds)
//   pixelWord   — lettering from a hand-made 5×7 bitmap font: banded colors,
//                 ink outline, hard drop shadow

import { INK, mix } from './draw.js';

// Art pixels per world unit, shared with the DOM UI so labels match the grid.
let artScale = 0.67;
let pixelOn = true;
export function setArtScale(px, on) {
  artScale = px;
  pixelOn = on;
}
export const getArtScale = () => artScale;
export const isPixel = () => pixelOn;

export function crispAlpha(ctx, w, h, cut = 110) {
  if (!w || !h) return;
  const im = ctx.getImageData(0, 0, w, h);
  const d = im.data;
  for (let i = 3; i < d.length; i += 4) {
    const a = d[i];
    if (a === 0 || a === 255) continue;
    if (a < cut) d[i] = 0;
    else {
      // un-premultiply the fringe so it keeps the sprite's real color
      const k = 255 / a;
      d[i - 3] = Math.min(255, d[i - 3] * k);
      d[i - 2] = Math.min(255, d[i - 2] * k);
      d[i - 1] = Math.min(255, d[i - 1] * k);
      d[i] = 255;
    }
  }
  ctx.putImageData(im, 0, 0);
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16 - 0.5);

// Original 8-bit-style palette (NES-era spirit: a few ramps per hue, deep night blues).
export const PALETTE = [
  '#000000', '#14111A', '#2B2735', '#4A4458', '#77708A', '#A9A3B8', '#DDD8E6', '#FFFFFF',
  '#0B0A1E', '#16153A', '#24205A', '#36307A', '#4B4498', '#6A63B8',
  '#1C1530', '#2C2248', '#3E3262', '#544680', '#2A1A28', '#46283A',
  '#4A0D1C', '#8E1430', '#D7263D', '#FF5A5A', '#FF9E9E',
  '#6A2210', '#B23E16', '#F46036', '#FF9A5C', '#FFCB9A',
  '#6E5000', '#B88600', '#FFC914', '#FFE77A', '#FFF6C8',
  '#0C3216', '#17602A', '#2E9E44', '#5CCB5F', '#A8EE8C',
  '#0B3236', '#1F7A7A', '#33AFA4', '#8BE6D8',
  '#0A1A55', '#1B4FD8', '#4EA8DE', '#9AD8FF',
  '#2A1450', '#4C2A84', '#6A3FA0', '#A777E0', '#D8BEFF',
  '#3A1C14', '#6B3B24', '#A0643C', '#D9A06A', '#F5D2A8',
  '#5C1A44', '#A8336E', '#FF7AB0',
].map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);

let LUT = null; // 32×32×32 → palette index
function lut() {
  if (LUT) return LUT;
  LUT = new Uint8Array(32768);
  for (let r = 0; r < 32; r++) for (let g = 0; g < 32; g++) for (let b = 0; b < 32; b++) {
    const R = r * 8 + 4, G = g * 8 + 4, B = b * 8 + 4;
    let best = 0, bd = Infinity;
    for (let i = 0; i < PALETTE.length; i++) {
      const p = PALETTE[i];
      // weighted distance: eyes care most about green, least about blue
      const d = (R - p[0]) ** 2 * 3 + (G - p[1]) ** 2 * 4 + (B - p[2]) ** 2 * 2;
      if (d < bd) { bd = d; best = i; }
    }
    LUT[(r << 10) | (g << 5) | b] = best;
  }
  return LUT;
}
const clamp8 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

function snapData(d, w, h, ditherAmt) {
  const L = lut();
  for (let y = 0; y < h; y++) {
    const row = (y & 3) * 4;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] === 0) continue;
      const t = ditherAmt ? BAYER[row + (x & 3)] * ditherAmt : 0;
      const p = PALETTE[L[((clamp8(d[i] + t) >> 3) << 10) | ((clamp8(d[i + 1] + t) >> 3) << 5) | (clamp8(d[i + 2] + t) >> 3)]];
      d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2];
    }
  }
}

// Sprite pass: hard alpha + palette snap.
export function pixelize(ctx, w, h) {
  if (!w || !h) return;
  crispAlpha(ctx, w, h);
  const im = ctx.getImageData(0, 0, w, h);
  snapData(im.data, w, h, 0);
  ctx.putImageData(im, 0, 0);
}

// Background pass: ordered dither into the palette.
export function dither(ctx, w, h, amount = 40) {
  const im = ctx.getImageData(0, 0, w, h);
  snapData(im.data, w, h, amount);
  ctx.putImageData(im, 0, 0);
}

// ---------- 5×7 bitmap font (hand-made, original) ----------
const GLYPHS = {
  A: '.###.#...##...#######...##...##...#', B: '####.#...##...#####.#...##...#####.', C: '.###.#...##....#....#....#...#.###.',
  D: '####.#...##...##...##...##...#####.', E: '######....#....####.#....#....#####', F: '######....#....####.#....#....#....',
  G: '.###.#...##....#.####...##...#.####', H: '#...##...##...#######...##...##...#', I: '.###...#....#....#....#....#...###.',
  J: '..###...#....#....#.#..#.#..#..##..', K: '#...##..#.#.#..##...#.#..#..#.#...#', L: '#....#....#....#....#....#....#####',
  M: '#...###.###.#.##.#.##...##...##...#', N: '#...###..##.#.##..###...##...##...#', O: '.###.#...##...##...##...##...#.###.',
  P: '####.#...##...#####.#....#....#....', Q: '.###.#...##...##...##.#.##..#..##.#', R: '####.#...##...#####.#.#..#..#.#...#',
  S: '.#####....#.....###.....#....#####.', T: '#####..#....#....#....#....#....#..', U: '#...##...##...##...##...##...#.###.',
  V: '#...##...##...##...##...#.#.#...#..', W: '#...##...##...##.#.##.#.##.#.#.#.#.', X: '#...##...#.#.#...#...#.#.#...##...#',
  Y: '#...##...#.#.#...#....#....#....#..', Z: '#####....#...#...#...#...#....#####',
  0: '.###.#...##..###.#.###..##...#.###.', 1: '..#...##....#....#....#....#...###.', 2: '.###.#...#....#...#...#...#...#####',
  3: '####.....#....#.###.....#....#####.', 4: '...#...##..#.#.#..#.#####...#....#.', 5: '######....####.....#....##...#.###.',
  6: '.###.#....#....####.#...##...#.###.', 7: '#####....#...#...#...#....#....#...', 8: '.###.#...##...#.###.#...##...#.###.',
  9: '.###.#...##...#.####....#....#.###.',
  '!': '..#....#....#....#....#.........#..', '?': '.###.#...#....#...#...#.........#..', '.': '................................#..',
  "'": '..#....#...#........................', '-': '...............###.................', ':': '.......#...................#.......',
  ' ': '...................................',
};
const GW = 5, GH = 7;
function glyphBits(ch, bold) {
  const g = GLYPHS[ch] || GLYPHS[' '];
  const bits = [];
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW + (bold ? 1 : 0); x++) {
    const on = (x < GW && g[y * GW + x] === '#') || (bold && x > 0 && g[y * GW + x - 1] === '#');
    bits.push(on ? 1 : 0);
  }
  return bits;
}

// ---------- lettering ----------
const wordCache = new Map();

// Three hard color bands from top to bottom of the letters.
export function rampFor(fill) {
  return [mix(fill, '#ffffff', 0.5), fill, mix(fill, '#D7263D', 0.42)];
}

// Returns a canvas where 1 canvas pixel = 1 art pixel. `px` = wanted letter
// height in art pixels; the font scales by whole steps (7, 14, 21… tall).
export function pixelWord(text, px, fill = '#FFC914', opts = {}) {
  const s = Math.max(1, Math.round(px / GH));
  const bold = opts.bold ?? false;
  const outline = opts.outline ?? Math.max(1, Math.round(s / 2));
  const drop = opts.drop ?? Math.max(1, Math.round(s / 2));
  const key = `${text}|${s}|${fill}|${outline}|${drop}|${bold}|${(opts.ramp || []).join()}`;
  if (wordCache.has(key)) return wordCache.get(key);
  const adv = GW + (bold ? 1 : 0) + 1;
  const chars = [...String(text).toUpperCase()];
  const pad = outline + drop + 1;
  const W = chars.length * adv * s - s + pad * 2, H = GH * s + pad * 2;
  const mask = new Uint8Array(W * H), rowOf = new Int8Array(W * H);
  chars.forEach((ch, ci) => {
    const bits = glyphBits(ch, bold);
    const gw = GW + (bold ? 1 : 0);
    for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < gw; gx++) {
      if (!bits[gy * gw + gx]) continue;
      for (let yy = 0; yy < s; yy++) for (let xx = 0; xx < s; xx++) {
        const x = pad + (ci * adv + gx) * s + xx, y = pad + gy * s + yy;
        mask[y * W + x] = 1;
        rowOf[y * W + x] = gy;
      }
    }
  });
  const ring = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!mask[y * W + x]) continue;
    for (let dy = -outline; dy <= outline; dy++) for (let dx = -outline; dx <= outline; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < W && yy < H) ring[yy * W + xx] = 1;
    }
  }
  const out = document.createElement('canvas');
  out.width = W; out.height = H;
  const o = out.getContext('2d');
  const im = o.createImageData(W, H);
  const d = im.data;
  const ramp = (opts.ramp || rampFor(fill)).map(hexRgb);
  const ink = hexRgb(opts.ink || INK);
  const shadow = hexRgb(opts.shadow || '#000000');
  const put = (i, c, a = 255) => { d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = a; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (mask[i]) {
      const r = rowOf[i];
      put(i, ramp[Math.min(ramp.length - 1, Math.floor((r / GH) * ramp.length))]);
    } else if (ring[i]) put(i, ink);
    else {
      const sx = x - drop, sy = y - drop;
      if (sx >= 0 && sy >= 0 && ring[sy * W + sx]) put(i, shadow, opts.dropAlpha ?? 190);
    }
  }
  o.putImageData(im, 0, 0);
  out.mid = pad + (GH * s) / 2;
  out.baseline = pad + GH * s;
  wordCache.set(key, out);
  if (wordCache.size > 200) wordCache.delete(wordCache.keys().next().value);
  return out;
}

function hexRgb(c) {
  const n = parseInt(c.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// DOM label: a pixelWord canvas sized in world units so its pixels match the
// game's pixel grid. `size` = letter height in world units; `chunk` = how many
// art pixels each letter pixel spans (bigger = blockier).
export function pixelLabel(text, size, fill = '#FFC914', opts = {}) {
  const chunk = opts.chunk || 1;
  const scale = pixelOn ? artScale / chunk : Math.max(1, artScale / 3) / chunk;
  const px = Math.max(7, Math.round(size * scale));
  const cv = pixelWord(String(text).toUpperCase(), px, fill, opts);
  const c = document.createElement('canvas');
  c.width = cv.width; c.height = cv.height;
  c.getContext('2d').drawImage(cv, 0, 0);
  c.className = 'px-label ' + (opts.cls || '');
  let w = cv.width / scale, hh = cv.height / scale;
  if (opts.maxW && w > opts.maxW) { hh *= opts.maxW / w; w = opts.maxW; }
  c.style.width = w + 'px';
  c.style.height = hh + 'px';
  return c;
}
