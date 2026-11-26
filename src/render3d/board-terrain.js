// Terrain for the campaign diorama: stepped low-poly islands (faceted rock
// cliffs, a ledge, a beach) baked into a Baker, plus the waterline foam and
// the pale shallows as cheap transparent rings. Built once per board.
import * as THREE from 'three';
import { radiusAt, rng, LEVEL } from './board-layout.js';

const INKC = new THREE.Color(0x14111a);
const tmp = new THREE.Color(), tmp2 = new THREE.Color();

// per world: top / alternate top / rock A / rock B / ledge / sand / wet sand / path
export const PAL = {
  bedroom: { top: 0xe0a860, alt: 0xcf9550, rockA: 0x9a6a3a, rockB: 0x86592f, ledge: 0xc08a4c, sand: 0xf3dca2, wet: 0xd9bd80, path: 0x2a9a9a, water: 0x2f86d8 },
  castle: { top: 0x6cc24a, alt: 0x5fb240, rockA: 0x8c7a6a, rockB: 0x75665a, ledge: 0x4f9a3a, sand: 0xf2dc94, wet: 0xd6bd78, path: 0xd8c08a, water: 0x2f86d8 },
  'fishing-pier': { top: 0xf2d27c, alt: 0xe6c46a, rockA: 0xb88a52, rockB: 0xa07444, ledge: 0x8cc04a, sand: 0xfbe6a8, wet: 0xdcc488, path: 0xa8723c, water: 0x2a7ad0 },
  'bog-shack': { top: 0x5d9a3a, alt: 0x518a32, rockA: 0x5c4630, rockB: 0x4c3a28, ledge: 0x3f6a2a, sand: 0x8a7a4a, wet: 0x6e6038, path: 0x7a5a36, water: 0x2f6a6a },
  'haunted-forest': { top: 0x4a3a6a, alt: 0x40335e, rockA: 0x3a2e52, rockB: 0x2e2440, ledge: 0x3a5a5a, sand: 0x7a6a8a, wet: 0x5e506e, path: 0x8a7aa0, water: 0x24204a },
  mountain: { top: 0x3a2e52, alt: 0x33284a, rockA: 0x2a1f44, rockB: 0x352a50, ledge: 0x3a3a5a, sand: 0x6a5a7a, wet: 0x54486a, path: 0x8a7aa0, water: 0x24204a },
  islet: { top: 0x6cc24a, alt: 0x60b444, rockA: 0x8c7a6a, rockB: 0x7a6a5e, ledge: 0x4f9a3a, sand: 0xf6e2a4, wet: 0xdac286, path: 0xd8c08a, water: 0x2f86d8 },
};
const BOOKS = [0xd7263d, 0x1b4fd8, 0xffc914, 0x2e9e44, 0x6a3fa0, 0xf46036];

// the cliff profile (outward offset from the rim, height); f = notch (0: full
// steps and beach, 1: a straight drop into the sea, for waterfalls and bridge ends)
function profile(f, j, top = LEVEL.top) {
  const k = 1 - f;
  if (top < -10) {
    // a low islet: a short rocky lip, then straight to the beach
    return [[0, top], [0.7, top - 3.5], [2 + j[0] * 0.5, top - 7], [3.5 + j[1] * 0.5, top - 10], [4.5, top - 11], [6 + j[3] * 0.5, -35], [7, -39], [10 + 22 * k, -43], [12 + 26 * k, -50]];
  }
  return [
    [0, top], // rim
    [0.7, top - 4.5], // ink band
    [2.5 + j[0], -7], // cliff
    [5 + j[1], -16],
    [5 + 12 * k + j[2] * 0.3, -18], // ledge
    [7 + 13 * k + j[3], -29], // lower cliff
    [8 + 15 * k, -39], // beach starts
    [10 + 30 * k, -43], // beach
    [12 + 34 * k, -50], // just under the waterline (the rest is hidden by the sea)
  ];
}
// band colours between profile rows (k -> k+1)
const BAND = ['ink', 'rock', 'rock', 'ledge', 'rock', 'rock', 'sand', 'wet'];

function notchAt(a, notches, r) {
  let f = 0;
  for (const n of notches) {
    let d = Math.abs(a - n.a);
    if (d > Math.PI) d = Math.PI * 2 - d;
    const w = n.w / r;
    if (d < w * 2) f = Math.max(f, d < w ? 1 : 1 - (d - w) / w);
  }
  return f;
}

// waterline radius offset for a profile (where the slope crosses the sea level)
function waterOff(p) {
  const a = p[7], b = p[8];
  const u = (LEVEL.water - a[1]) / (b[1] - a[1]);
  return a[0] + (b[0] - a[0]) * u;
}

// An island (or islet / mountain base). shape: { cx, cz, rx, rz, n, seed, lumpK };
// pal: PAL entry; notches: [{ a, w }]; opts.floor: 'boards' (bedroom planks) or 'patch'.
// Returns rim samples for the foam/shallows.
export function bakeIsland(bk, sh, pal, { notches = [], floor = 'patch', seed = 1, top = LEVEL.top } = {}) {
  const r = rng(seed * 977 + 13);
  const per = 2 * Math.PI * Math.sqrt((sh.rx * sh.rx + sh.rz * sh.rz) / 2);
  const segs = Math.max(16, Math.min(72, Math.round(per / 40)));
  const rows = [];
  const rim = [];
  for (let s = 0; s < segs; s++) {
    const a = (s / segs) * Math.PI * 2;
    const R = radiusAt(sh, a);
    const f = notchAt(a, notches, R);
    const j = [r() * 4, r() * 5 - 1, r() * 4 - 2, r() * 5 - 1];
    const p = profile(f, j, top);
    const ca = Math.cos(a), sa = Math.sin(a);
    rows.push(p.map(([dr, y], k) => [sh.cx + ca * (R + dr), y + (k >= 2 && k <= 5 ? (r() - 0.5) * 3 : 0), sh.cz + sa * (R + dr)]));
    rim.push({ a, R, w: waterOff(p), f });
  }
  const pos = [], col = [];
  const tri = (A, B, Cc, c) => { pos.push(...A, ...Cc, ...B); for (let q = 0; q < 3; q++) col.push(c.r, c.g, c.b); };
  const quad = (A, B, Cc, D, c) => { tri(A, B, Cc, c); tri(A, Cc, D, c); };
  const colorOf = (band, s, k) => {
    if (band === 'ink') return INKC;
    if (band === 'rock') return tmp.set(((s * 7 + k * 3) % 5 < 2) ^ (r() < 0.3) ? pal.rockA : pal.rockB);
    if (band === 'ledge') return tmp.set(pal.ledge).multiplyScalar(0.92 + r() * 0.16);
    if (band === 'sand') return tmp.set(pal.sand);
    return tmp.set(pal.wet);
  };
  for (let s = 0; s < segs; s++) {
    const A = rows[s], B = rows[(s + 1) % segs];
    for (let k = 0; k < A.length - 1; k++) quad(A[k], A[k + 1], B[k + 1], B[k], colorOf(BAND[k], s, k).clone());
  }
  // the top: a polar grid of patches (floorboards on the bedroom)
  const fr = [0, 0.45, 0.75, 1];
  const ringPt = (s, u) => {
    const { a, R } = rim[s % segs];
    return [sh.cx + Math.cos(a) * R * u, top, sh.cz + Math.sin(a) * R * u];
  };
  for (let s = 0; s < segs; s++) {
    for (let q = 0; q < fr.length - 1; q++) {
      const A = ringPt(s, fr[q]), B = ringPt(s, fr[q + 1]), Cc = ringPt(s + 1, fr[q + 1]), D = ringPt(s + 1, fr[q]);
      const mx = (A[0] + Cc[0]) / 2, mz = (A[2] + Cc[2]) / 2;
      let c;
      if (floor === 'boards') {
        const plank = Math.floor((mz + 1000) / 30);
        c = tmp2.set(plank % 2 ? pal.top : pal.alt).multiplyScalar(0.97 + ((plank * 37) % 7) * 0.01);
      } else {
        const n = Math.sin(mx * 0.013 + seed) * Math.cos(mz * 0.021 + seed * 2) + Math.sin((mx + mz) * 0.031) * 0.4;
        c = tmp2.set(n > 0.15 ? pal.alt : pal.top);
      }
      c = c.clone();
      if (q === 0) tri(A, B, Cc, c);
      else quad(A, B, Cc, D, c);
    }
  }
  bk.tris(pos, col);
  return rim;
}

// A raised tier (a plateau on the island). kind: 'rock' | 'moss' | 'sandstone' | 'dark' | 'books'
export function bakeTier(bk, t, pal, seed = 1) {
  const r = rng(seed * 131 + 7);
  const segs = Math.max(14, Math.min(64, Math.round((2 * Math.PI * Math.sqrt((t.rx * t.rx + t.rz * t.rz) / 2)) / 22)));
  const books = t.kind === 'books';
  const H = t.top;
  const rowsY = books ? [H, H - 4.5, ...Array.from({ length: Math.ceil((H - 2) / 10) }, (_, k) => Math.max(0, H - 4.5 - (k + 1) * 10))] : [H, H - 4, H * 0.62, H * 0.3, 0];
  const pos = [], col = [];
  const tri = (A, B, Cc, c) => { pos.push(...A, ...Cc, ...B); for (let q = 0; q < 3; q++) col.push(c.r, c.g, c.b); };
  const rows = [];
  const rim = [];
  for (let s = 0; s < segs; s++) {
    const a = (s / segs) * Math.PI * 2;
    const R = radiusAt(t, a);
    rim.push(R);
    const ca = Math.cos(a), sa = Math.sin(a);
    rows.push(rowsY.map((y, k) => {
      const dr = k === 0 ? 0 : k === 1 ? 0.7 : books ? (k % 2) * 3 + 1 : 1 + k * 2.4 + r() * 4;
      return [t.cx + ca * (R + dr), y + (books || k < 2 ? 0 : (r() - 0.5) * 3), t.cz + sa * (R + dr)];
    }));
  }
  for (let s = 0; s < segs; s++) {
    const A = rows[s], B = rows[(s + 1) % segs];
    for (let k = 0; k < A.length - 1; k++) {
      const c = k === 0 ? INKC.clone() : books ? new THREE.Color(BOOKS[(k + Math.floor(seed)) % BOOKS.length]) : new THREE.Color((s + k) % 3 ? pal.rockA : pal.rockB);
      tri(A[k], A[k + 1], B[k + 1], c); tri(A[k], B[k + 1], B[k], c);
    }
  }
  // top
  const topC = books ? new THREE.Color(0xfff3d6) : null;
  for (let s = 0; s < segs; s++) {
    const a0 = (s / segs) * Math.PI * 2, a1 = ((s + 1) / segs) * Math.PI * 2;
    for (const [u0, u1] of [[0, 0.6], [0.6, 1]]) {
      const P = (a, R, u) => [t.cx + Math.cos(a) * R * u, H, t.cz + Math.sin(a) * R * u];
      const c = topC || new THREE.Color((s % 4 < 2) === u0 > 0 ? pal.top : pal.alt);
      const A = P(a0, rim[s], u0), B = P(a0, rim[s], u1), Cc = P(a1, rim[(s + 1) % segs], u1), D = P(a1, rim[(s + 1) % segs], u0);
      tri(A, B, Cc, c);
      if (u0 > 0) tri(A, Cc, D, c);
    }
  }
  bk.tris(pos, col);
}

// foam (white band at the waterline) and shallows (pale water fading out):
// one geometry each, with alpha in the vertex colour
export function shoreRings(sh, rim, { foamW = 9, shallowW = 80, foamOut = 22 } = {}) {
  const ring = (inner, outer, aIn, aOut, y, dash = 0) => {
    const pos = [], col = [];
    const n = rim.length;
    for (let s = 0; s < n; s++) {
      const p = rim[s], q = rim[(s + 1) % n];
      const pt = (e, o) => [sh.cx + Math.cos(e.a) * (e.R + e.w + o), y, sh.cz + Math.sin(e.a) * (e.R + e.w + o)];
      const A = pt(p, inner), B = pt(p, outer), Cc = pt(q, outer), D = pt(q, inner);
      const ai = dash ? aIn * (s % 3 ? 1 : 0.15) : aIn;
      const ao = dash ? aOut * (s % 3 ? 1 : 0.15) : aOut;
      pos.push(...A, ...B, ...Cc, ...A, ...Cc, ...D);
      col.push(1, 1, 1, ai, 1, 1, 1, ao, 1, 1, 1, ao, 1, 1, 1, ai, 1, 1, 1, ao, 1, 1, 1, ai);
    }
    // relative to the island centre (the mesh sits there), so a ring can pulse in scale
    for (let i = 0; i < pos.length; i += 3) { pos[i] -= sh.cx; pos[i + 2] -= sh.cz; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
    return g;
  };
  return {
    foam: ring(-5, foamW, 1, 0.85, LEVEL.water + 1.6),
    foamOuter: ring(foamOut - 4, foamOut + 3, 0, 0.9, LEVEL.water + 1.3, 1),
    shallow: ring(-2, shallowW, 0.75, 0, LEVEL.water + 0.5),
  };
}
