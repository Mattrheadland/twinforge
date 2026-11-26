// Set dressing for the campaign diorama: every prop kind, each world's
// landmark, the boardwalk bridges, docks, stilt shacks and sea pieces. All of
// it is our own low-poly design in the v5 '80s-toon palette, written into a
// Baker (board-kit.js), so a whole island bakes to a couple of draw calls.
// Each builder works in local space (feet at y = 0, facing +z) under a
// placement matrix. `glow` is a second Baker for unlit parts (lanterns,
// windows, glowing mushrooms) that stay bright at night.
import * as THREE from 'three';
import { place } from './board-kit.js';

const RED = 0xe84a3a, BLUE = 0x2456e0, GOLD = 0xffc914, GREEN = 0x3fc46a, PURPLE = 0x8a4ae0, ORANGE = 0xf46036, WHITE = 0xfaf6ee, TEAL = 0x1f8a8a;
const TOY = [RED, BLUE, GOLD, GREEN, PURPLE, ORANGE];
const WOOD = 0xa8723c, WOOD_D = 0x7a5030, WOOD_L = 0xc89a5c, STONE = 0xb8b0a8, STONE_D = 0x948a84, LEAF = 0x3f9a3a, LEAF_L = 0x6cc24a, LEAF_D = 0x2c7a34;
const pick = (arr, v) => arr[Math.floor(v * arr.length) % arr.length];

// a small helper bound to one placement: a(shape, color, [x,y,z], [sx,sy,sz], rot, o)
function at(bk, m) {
  return (shape, color, p, s, rot = null, o = {}) => bk.add(shape, color, p, s, rot, { ...o, parent: m });
}

// ---------------- generic nature ----------------
function tree(a, s, v, leaves = [LEAF, LEAF_L, LEAF_D]) {
  const h = 36 + v * 20;
  a('cyl5', WOOD_D, [0, h * 0.35, 0], [4.5, h * 0.7, 4.5], null, { ink: 1.2 });
  a('ico', pick(leaves, v), [0, h * 0.78, 0], [22, 19, 22], [v * 3, v * 5, 0]);
  a('ico', pick(leaves, v * 7.3), [8 - v * 16, h * 0.98, 4], [14, 13, 14], [v, v * 2, 0]);
}
function pine(a, v, cols = [LEAF_D, 0x2e8a4a]) {
  a('cyl5', WOOD_D, [0, 8, 0], [4, 16, 4], null, { ink: 1.2 });
  a('cone6', cols[0], [0, 30, 0], [22, 30, 22], [0, v * 3, 0]);
  a('cone6', cols[1], [0, 50, 0], [17, 26, 17], [0, v * 5, 0]);
  a('cone6', cols[0], [0, 67, 0], [11, 20, 11], [0, v * 7, 0]);
}
function bush(a, v, col = LEAF) {
  a('ico', col, [0, 9, 0], [14, 11, 14], [v * 4, v * 2, 0]);
  a('ico', LEAF_L, [10, 7, 4], [9, 8, 9], [v, 0, v]);
  if (v > 0.5) a('ico', RED, [4, 16, 8], [2.6, 2.6, 2.6], null, { ink: false });
}
function rock(a, v, cols = [STONE, STONE_D]) {
  a('ico', cols[0], [0, 6, 0], [14 + v * 6, 10 + v * 5, 12], [v * 3, v * 5, v * 2]);
  if (v > 0.4) a('ico', cols[1], [13, 4, 5], [7, 6, 7], [v, v * 2, 0]);
}
function flowers(a, v) {
  const cols = [RED, GOLD, WHITE, PURPLE, ORANGE];
  for (let k = 0; k < 3; k++) {
    const ang = k * 2.1 + v * 6, r = 4 + k * 3;
    a('oct', pick(cols, v + k * 0.21), [Math.cos(ang) * r, 3, Math.sin(ang) * r], [3.4, 2.6, 3.4], null, { ink: false });
  }
}
function grass(a, v, col = LEAF_D) {
  for (let k = 0; k < 3; k++) a('cone4', col, [k * 5 - 5, 4, (k % 2) * 4], [2.4, 8 + k * 2, 2.4], [0.2 * (k - 1), v * 3, 0.15 * (k - 1)], { ink: false });
}

// ---------------- bedroom (toys on a giant floor) ----------------
function block(a, v, s = 1) {
  const c = pick(TOY, v);
  a('box', c, [0, 13 * s, 0], [26 * s, 26 * s, 26 * s], [0, v * 3, 0]);
  a('box', WHITE, [0, 13 * s, 13.2 * s], [12 * s, 12 * s, 0.6], [0, v * 3, 0], { ink: false }); // the letter panel (rotates with it closely enough)
}
function blocks(a, v) {
  a('box', pick(TOY, v), [0, 15, 0], [30, 30, 30], [0, v * 2, 0]);
  a('box', pick(TOY, v + 0.33), [3, 43, 2], [26, 26, 26], [0, v * 5 + 0.4, 0]);
  if (v > 0.35) a('box', pick(TOY, v + 0.6), [-2, 67, 0], [22, 22, 22], [0, v * 7, 0]);
  if (v > 0.6) a('wedge', pick(TOY, v + 0.15), [-2, 87, 0], [22, 18, 22], [0, v * 7, 0]);
}
function toytree(a, v) {
  // a stacking-ring tree: a peg with coloured rings, getting smaller
  a('cyl6', WOOD_L, [0, 4, 0], [20, 8, 20]);
  a('cyl5', WOOD, [0, 38, 0], [3, 60, 3], null, { ink: 1 });
  for (let k = 0; k < 4; k++) a('cyl6', pick(TOY, v + k * 0.17), [0, 13 + k * 11, 0], [17 - k * 3, 9, 17 - k * 3]);
  a('ico', GOLD, [0, 70, 0], [7, 7, 7]);
}
function crayon(a, v) {
  const c = pick(TOY, v);
  a('cyl6', c, [0, 4, 0], [4, 34, 4], [Math.PI / 2, 0, 0]);
  a('cone6', 0xf0d8b0, [0, 4, 20], [4, 6, 4], [Math.PI / 2, 0, 0]);
  a('cone6', c, [0, 4, 23.5], [1.6, 2.2, 1.6], [Math.PI / 2, 0, 0], { ink: false });
  a('cyl6', WHITE, [0, 4, 4], [4.3, 12, 4.3], [Math.PI / 2, 0, 0], { ink: false });
}
function crayonCup(a, v) {
  a('cyl8', BLUE, [0, 14, 0], [16, 28, 16]);
  a('cyl8', GOLD, [0, 22, 0], [16.6, 4, 16.6], null, { ink: false });
  for (let k = 0; k < 5; k++) {
    const ang = k * 1.26, c = TOY[k];
    a('cyl6', c, [Math.cos(ang) * 8, 38, Math.sin(ang) * 8], [3.4, 26, 3.4], [Math.sin(ang) * 0.25, 0, -Math.cos(ang) * 0.25], { ink: 1 });
    a('cone6', c, [Math.cos(ang) * 11, 54, Math.sin(ang) * 11], [3.4, 6, 3.4], [Math.sin(ang) * 0.25, 0, -Math.cos(ang) * 0.25], { ink: 1 });
  }
}
function ringstack(a, v) {
  a('cyl8', RED, [0, 4, 0], [22, 8, 22]);
  a('cyl8', GOLD, [0, 12, 0], [17, 8, 17]);
  a('cyl8', GREEN, [0, 20, 0], [12, 8, 12]);
  a('cyl8', BLUE, [0, 28, 0], [7, 8, 7]);
  a('ico', PURPLE, [0, 37, 0], [6, 6, 6]);
}
function ball(a, v) {
  a('ico', pick([RED, BLUE, GOLD], v), [0, 18, 0], [18, 18, 18], [v, v * 3, 0]);
  a('torus', WHITE, [0, 18, 0], [18.3, 18.3, 6], [0, v * 3, 0], { ink: false });
}
function marbles(a, v) {
  for (let k = 0; k < 3; k++) a('ico', pick([BLUE, RED, GREEN, GOLD, TEAL], v + k * 0.23), [Math.cos(k * 2.1 + v * 6) * 9, 3.2, Math.sin(k * 2.1 + v * 6) * 9], [3.4, 3.4, 3.4], null, { ink: 0.8 });
}
function domino(a, v) {
  a('box', WHITE, [0, 9, 0], [10, 18, 4], [0.25, v * 3, 0]);
  a('box', 0x14111a, [0, 9, 0], [10.4, 1, 4.4], [0.25, v * 3, 0], { ink: false });
}
function spinTop(a, v) {
  a('cone8', pick(TOY, v), [0, 9, 0], [11, -14, 11]);
  a('cyl8', pick(TOY, v + 0.4), [0, 17, 0], [12, 4, 12]);
  a('cyl5', WOOD, [0, 23, 0], [1.6, 9, 1.6], null, { ink: 0.8 });
}

// ---------------- castle ----------------
function banner(a, v) {
  a('cyl5', WOOD_D, [0, 34, 0], [2, 68, 2], null, { ink: 1 });
  a('box', pick([RED, BLUE, GOLD], v), [0, 50, 2], [16, 26, 1.4]);
  a('cone4', pick([RED, BLUE, GOLD], v), [0, 34, 2], [8, 8, 1.4], [Math.PI, Math.PI / 4, 0], { ink: 1 });
  a('ico', GOLD, [0, 70, 0], [3, 3, 3], null, { ink: 0.8 });
}
function hay(a, v) {
  a('cyl8', 0xf2cc5c, [0, 9, 0], [12, 20, 12], [Math.PI / 2, v * 3, 0]);
  if (v > 0.5) a('cyl8', 0xe8bc4c, [14, 9, 6], [10, 18, 10], [Math.PI / 2, v * 3 + 1, 0]);
}
function target(a, v) {
  a('cyl5', WOOD, [-6, 13, -3], [1.6, 26, 1.6], [0.3, 0, 0], { ink: 0.8 });
  a('cyl5', WOOD, [6, 13, -3], [1.6, 26, 1.6], [0.3, 0, 0], { ink: 0.8 });
  a('disc12', WHITE, [0, 20, 1], [12, 2, 12], [Math.PI / 2 - 0.3, 0, 0]);
  a('disc12', RED, [0, 20, 2], [8, 2.2, 8], [Math.PI / 2 - 0.3, 0, 0], { ink: false });
  a('disc12', GOLD, [0, 20, 2.6], [3.5, 2.4, 3.5], [Math.PI / 2 - 0.3, 0, 0], { ink: false });
}
function tower(a, x, z, h, r, roof = RED, o = {}) {
  a('cyl8', STONE, [x, h / 2, z], [r, h, r]);
  a('cyl8', STONE_D, [x, h + 3, z], [r + 3, 6, r + 3]);
  for (let k = 0; k < 6; k++) { const an = (k / 6) * Math.PI * 2; a('box', STONE, [x + Math.cos(an) * (r + 1), h + 9, z + Math.sin(an) * (r + 1)], [6, 7, 6], [0, -an, 0], { ink: 1 }); }
  if (roof) a('cone8', roof, [x, h + 6 + r * 1.2, z], [r + 5, r * 2.4, r + 5]);
  for (let k = 0; k < (o.windows ?? 2); k++) a('box', 0x2a2440, [x, h * (0.45 + k * 0.25), z + r * 0.95], [4, 8, 1], null, { ink: false });
}
function wall(a, x0, z0, x1, z1, h = 28) {
  const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(z1 - z0, x1 - x0);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  a('box', STONE, [cx, h / 2, cz], [len, h, 12], [0, -ang, 0]);
  const n = Math.floor(len / 14);
  for (let k = 0; k < n; k++) {
    const u = (k + 0.5) / n - 0.5;
    a('box', STONE_D, [cx + Math.cos(ang) * u * len, h + 4, cz + Math.sin(ang) * u * len], [7, 8, 13], [0, -ang, 0], { ink: 1 });
  }
}

// ---------------- fishing pier ----------------
function palm(a, v) {
  const lean = (v - 0.5) * 0.5;
  for (let k = 0; k < 4; k++) a('cyl5', k % 2 ? 0xb88a52 : 0x9a6e40, [Math.sin(lean) * k * 16, 8 + k * 16, 0], [4 - k * 0.3, 17, 4 - k * 0.3], [0, 0, -lean], { ink: 1 });
  const tx = Math.sin(lean) * 64, ty = 70;
  for (let k = 0; k < 5; k++) {
    const an = (k / 5) * Math.PI * 2 + v;
    a('box', k % 2 ? LEAF : LEAF_L, [tx + Math.cos(an) * 14, ty - 3, Math.sin(an) * 14], [28, 2, 8], [0, -an, -0.45], { ink: 1 });
  }
  a('ico', 0x7a5030, [tx + 3, ty - 6, 3], [4, 4, 4], null, { ink: 0.8 });
  a('ico', 0x7a5030, [tx - 3, ty - 7, -2], [4, 4, 4], null, { ink: 0.8 });
}
function hut(a, v, glow) {
  const c = pick([0x4ea8de, 0xe84a3a, 0xffc914, 0x3fc46a], v);
  for (const [px, pz] of [[-17, -12], [17, -12], [-17, 12], [17, 12]]) a('cyl5', WOOD_D, [px, 5, pz], [2.4, 10, 2.4], null, { ink: 1 });
  a('box', WOOD_L, [0, 11, 0], [40, 3, 30]);
  a('box', c, [0, 25, 0], [34, 26, 24]);
  a('wedge', WOOD_D, [0, 46, 0], [42, 18, 30]);
  a('box', WOOD_D, [6, 21, 12.3], [9, 16, 1], null, { ink: false });
  glow && glow('box', 0xfff0a0, [-9, 28, 12.3], [8, 7, 1]);
  a('cyl5', STONE_D, [12, 52, -6], [3, 14, 3], null, { ink: 1 });
}
function crates(a, v) {
  a('box', WOOD_L, [0, 8, 0], [16, 16, 16], [0, v * 2, 0]);
  a('box', WOOD, [17, 7, 3], [14, 14, 14], [0, v * 4, 0]);
  if (v > 0.4) a('box', WOOD_L, [6, 22, 1], [12, 12, 12], [0, v * 6, 0]);
}
function barrel(a, v) {
  a('cyl8', WOOD, [0, 10, 0], [8, 20, 8]);
  a('cyl8', 0x5a4a48, [0, 5, 0], [8.4, 2, 8.4], null, { ink: false });
  a('cyl8', 0x5a4a48, [0, 15, 0], [8.4, 2, 8.4], null, { ink: false });
}
function netRack(a, v) {
  a('cyl5', WOOD_D, [-18, 18, 0], [2, 36, 2], null, { ink: 1 });
  a('cyl5', WOOD_D, [18, 18, 0], [2, 36, 2], null, { ink: 1 });
  a('cyl5', WOOD_D, [0, 34, 0], [1.6, 38, 1.6], [0, 0, Math.PI / 2], { ink: 1 });
  a('box', 0x5a8a7a, [0, 23, 0], [34, 20, 1], [0.08, 0, 0]);
  for (let k = 0; k < 3; k++) a('ico', pick([RED, GOLD, WHITE], v + k * 0.3), [-10 + k * 10, 16, 1.5], [3, 3, 3], null, { ink: 0.6 });
}
function umbrella(a, v) {
  a('cyl5', WHITE, [0, 15, 0], [1.4, 30, 1.4], null, { ink: 0.8 });
  a('cone8', pick([RED, BLUE, GOLD, GREEN], v), [0, 31, 0], [20, 8, 20]);
  a('box', pick([RED, BLUE, GOLD], v + 0.5), [12, 1.2, 4], [16, 1.4, 26], [0, v, 0], { ink: 0.8 });
}
function buoyRing(a, v) {
  a('torus', v > 0.5 ? RED : ORANGE, [0, 2.5, 0], [8, 8, 8], [Math.PI / 2, 0, 0], { ink: 1 });
}
function shell(a, v) {
  a('cone5', pick([0xffb0c0, WHITE, 0xffd890], v), [0, 2, 0], [5, 4, 5], [0.3, v * 5, 0], { ink: 0.8 });
}

// ---------------- bog ----------------
function cypress(a, v) {
  // a swamp tree on mangrove roots, with hanging moss
  for (let k = 0; k < 4; k++) { const an = k * 1.57 + v; a('cyl5', WOOD_D, [Math.cos(an) * 8, 5, Math.sin(an) * 8], [2.2, 14, 2.2], [Math.sin(an) * 0.6, 0, -Math.cos(an) * 0.6], { ink: 1 }); }
  a('frust6', 0x6a5236, [0, 30, 0], [7, 50, 7]);
  a('ico', 0x4f8a2e, [0, 64, 0], [26, 14, 26], [0, v * 3, 0]);
  a('ico', 0x6aa63a, [10, 76, 6], [16, 10, 16], [0, v, 0]);
  for (let k = 0; k < 4; k++) { const an = k * 1.6 + v * 2; a('box', 0x8aa860, [Math.cos(an) * 18, 50, Math.sin(an) * 18], [3, 16, 1], [0, -an, 0], { ink: false }); }
}
function reeds(a, v, n = 6, h = 30) {
  for (let k = 0; k < n; k++) {
    const an = k * 2.4 + v * 5, r = 3 + (k % 3) * 4;
    const x = Math.cos(an) * r, z = Math.sin(an) * r, hh = h * (0.7 + ((k * 7) % 5) * 0.08);
    a('cone4', k % 2 ? 0x3f7a2a : 0x5a9a3a, [x, hh / 2, z], [2.2, hh, 2.2], [0.1 * Math.sin(an), 0, 0.1 * Math.cos(an)], { ink: false });
    if (k % 2 === 0) a('cyl5', 0x7a4a2a, [x, hh * 0.86, z], [1.8, 6, 1.8], null, { ink: false });
  }
}
function mushroom(a, v, cap = RED, glow = null) {
  a('cyl6', 0xf2e8d0, [0, 8, 0], [4, 16, 4], null, { ink: 1 });
  (glow || a)('cone8', cap, [0, 19, 0], [13, 9, 13]);
  a('ico', WHITE, [5, 20, 4], [2, 1.2, 2], null, { ink: false });
  a('ico', WHITE, [-4, 21, -3], [1.6, 1, 1.6], null, { ink: false });
}
function pool(a, v, col = 0x2f8a9a, r = 22) {
  a('disc12', 0x3a2a1e, [0, 0.4, 0], [r + 3, 1.2, r + 3], null, { ink: false });
  a('disc12', col, [0, 1.2, 0], [r, 1, r], null, { ink: false });
  for (let k = 0; k < 3; k++) { const an = k * 2.2 + v * 4; a('disc8', 0x4fae3a, [Math.cos(an) * r * 0.5, 1.9, Math.sin(an) * r * 0.5], [5, 0.6, 5], null, { ink: 0.6 }); }
  a('oct', 0xffb0d0, [Math.cos(v * 9) * r * 0.5, 3, Math.sin(v * 9) * r * 0.5], [2.2, 1.8, 2.2], null, { ink: 0.6 });
}
function log(a, v) {
  a('cyl6', 0x6a4a2e, [0, 5, 0], [5, 30, 5], [0, v * 3, Math.PI / 2]);
  a('ico', 0x4fae3a, [4, 9, 0], [5, 3, 5], null, { ink: false });
}

// ---------------- haunted forest (spooky-cute, never scary) ----------------
function twisted(a, v) {
  const lean = (v - 0.5) * 0.6;
  a('frust6', 0x4a3a3a, [0, 16, 0], [8, 32, 8], [0, 0, lean * 0.4]);
  a('cyl5', 0x4a3a3a, [Math.sin(lean) * 14, 40, 0], [5, 24, 5], [0, 0, -lean], { ink: 1.2 });
  a('cyl5', 0x4a3a3a, [8, 34, 0], [2.4, 18, 2.4], [0, v * 3, -1.0], { ink: 1 });
  a('ico', pick([0x3a6a5a, 0x5a4a8a, 0x2c5a4a], v), [Math.sin(lean) * 22, 60, 0], [22, 17, 22], [v * 2, v * 4, 0]);
  a('ico', pick([0x6a5aa0, 0x3a7a6a], v + 0.5), [Math.sin(lean) * 22 + 12, 52, 6], [12, 10, 12], [v, 0, 0]);
}
function pineDark(a, v) { pine(a, v, [0x2c4a3a, 0x3a5a4a]); }
function crystal(a, v, glow) {
  const c = pick([0x7ad8ff, 0xc08aff, 0x7affc8], v);
  (glow || a)('oct', c, [0, 16, 0], [7, 18, 7], [0, v * 3, 0.15]);
  (glow || a)('oct', c, [9, 9, 3], [4, 10, 4], [0, v, -0.4]);
  (glow || a)('oct', c, [-7, 8, -2], [3.5, 8, 3.5], [0, v * 2, 0.5]);
  a('ico', 0x3a2e52, [0, 2, 0], [10, 4, 8], null, { ink: 1 });
}
function pumpkin(a, v, glow) {
  a('ico', ORANGE, [0, 8, 0], [11, 8, 11], [0, v * 3, 0]);
  a('cyl5', LEAF_D, [0, 17, 0], [1.6, 5, 1.6], null, { ink: 0.8 });
  if (v > 0.5 && glow) { glow('box', 0xfff060, [-3.5, 10, 10.5], [3, 3, 0.6]); glow('box', 0xfff060, [3.5, 10, 10.5], [3, 3, 0.6]); glow('box', 0xfff060, [0, 5.5, 10.6], [7, 2, 0.6]); }
}
function lantern(a, glow, x, y, z, c = 0xffd860) {
  a('cyl5', 0x3a2e2a, [x, y / 2, z], [1.4, y, 1.4], null, { ink: 0.8 });
  a('box', 0x3a2e2a, [x + 4, y, z], [9, 1.4, 1.4], null, { ink: false });
  glow('oct', c, [x + 8, y - 5, z], [4, 6, 4]);
}

// kind -> builder (a: lit, g: glow, v: 0..1 variety)
const KINDS = {
  tree: (a, g, v) => tree(a, 1, v), pine: (a, g, v) => pine(a, v), bush: (a, g, v) => bush(a, v), 'bush-dark': (a, g, v) => bush(a, v, 0x2c5a4a),
  rock: (a, g, v) => rock(a, v), flowers: (a, g, v) => flowers(a, v), grass: (a, g, v) => grass(a, v),
  block: (a, g, v) => block(a, v), blocks: (a, g, v) => blocks(a, v), toytree: (a, g, v) => toytree(a, v), crayon: (a, g, v) => crayon(a, v),
  'crayon-cup': (a, g, v) => crayonCup(a, v), ringstack: (a, g, v) => ringstack(a, v), ball: (a, g, v) => ball(a, v), marbles: (a, g, v) => marbles(a, v), domino: (a, g, v) => domino(a, v), top: (a, g, v) => spinTop(a, v),
  banner: (a, g, v) => banner(a, v), hay: (a, g, v) => hay(a, v), target: (a, g, v) => target(a, v),
  palm: (a, g, v) => palm(a, v), hut: (a, g, v) => hut(a, v, g), crates: (a, g, v) => crates(a, v), barrel: (a, g, v) => barrel(a, v), 'net-rack': (a, g, v) => netRack(a, v), umbrella: (a, g, v) => umbrella(a, v), 'buoy-ring': (a, g, v) => buoyRing(a, v), shell: (a, g, v) => shell(a, v),
  cypress: (a, g, v) => cypress(a, v), reeds: (a, g, v) => reeds(a, v), 'reeds-small': (a, g, v) => reeds(a, v, 3, 16), mushroom: (a, g, v) => mushroom(a, v), pool: (a, g, v) => pool(a, v), 'lily-pool': (a, g, v) => pool(a, v, 0x3a8a6a, 16), log: (a, g, v) => log(a, v),
  twisted: (a, g, v) => twisted(a, v), 'pine-dark': (a, g, v) => pineDark(a, v), crystal: (a, g, v) => crystal(a, v, g), 'mushroom-glow': (a, g, v) => mushroom(a, v, pick([0x7ad8ff, 0xc08aff, 0x7affc8], v), g), pumpkin: (a, g, v) => pumpkin(a, v, g), 'mushroom-tiny': (a, g, v) => { a('cyl5', 0xf2e8d0, [0, 3, 0], [1.6, 6, 1.6], null, { ink: false }); g('cone6', pick([0x7ad8ff, 0xc08aff], v), [0, 7, 0], [5, 4, 5]); },
};
export const PROP_KINDS = Object.keys(KINDS);

// bake one prop (layout entry) into bk / gk
export function dressProp(bk, gk, p) {
  const m = place(p.x, p.y, p.z, p.rot, p.s);
  const a = at(bk, m), g = at(gk, m);
  (KINDS[p.kind] || KINDS.rock)(a, g, p.v);
}

// ---------------- landmarks (one per world) ----------------
// returns { flags: [[x,y,z,color]], beam: [x,y,z] } for the animated bits board3d.js adds
export function landmark(bk, gk, name, L) {
  const m = place(L.x, L.y, L.z, 0, 1);
  const a = at(bk, m), g = at(gk, m);
  const out = { flags: [], beam: null };
  const W = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(m).toArray();
  if (name === 'bedroom') {
    // a toy castle built from blocks: block walls, cylinder towers with cone roofs, an arch gate
    for (let k = -3; k <= 3; k++) if (k !== 0) a('box', TOY[(k + 6) % 6], [k * 22, 11, 30], [22, 22, 22]);
    a('wedge', RED, [0, 11, 30], [22, 22, 22], [0, 0, Math.PI]); // the arch block (upside-down ramp)
    a('box', GOLD, [0, 33, 30], [66, 22, 22]);
    for (const x of [-77, 77]) { a('cyl8', BLUE, [x, 35, 30], [16, 70, 16]); a('cone8', RED, [x, 86, 30], [20, 32, 20]); out.flags.push([...W(x, 118, 30), GOLD]); a('cyl5', WHITE, [x, 108, 30], [1.4, 20, 1.4], null, { ink: 0.8 }); }
    for (let k = -2; k <= 2; k++) a('box', TOY[(k + 8) % 6], [k * 30, 33, -20], [28, 66, 28]);
    a('cyl8', GREEN, [0, 92, -20], [20, 52, 20]);
    a('cone8', PURPLE, [0, 136, -20], [26, 38, 26]);
    a('cyl5', WHITE, [0, 166, -20], [1.6, 24, 1.6], null, { ink: 0.8 });
    out.flags.push([...W(0, 176, -20), GREEN]);
    for (const x of [-48, 48]) a('box', TOY[x > 0 ? 3 : 0], [x, 76, -20], [24, 20, 24]);
    // alphabet blocks tumbling down the front steps
    for (let k = 0; k < 4; k++) block(at(bk, place(L.x - 140 + k * 18, L.y, L.z + 46 - k * 6, k * 0.7, 0.7)), k * 0.21);
    // a giant pencil lying across the shelf
    const pm = place(L.x + 150, L.y + 6, L.z + 20, 0.5, 1), pa = at(bk, pm);
    pa('cyl6', GOLD, [0, 0, 0], [7, 110, 7], [0, 0, Math.PI / 2]);
    pa('cone6', 0xf0d8b0, [-63, 0, 0], [7, 16, 7], [0, 0, Math.PI / 2]);
    pa('cone6', 0x14111a, [-69, 0, 0], [2.6, 5, 2.6], [0, 0, Math.PI / 2], { ink: false });
    pa('cyl6', 0xffa0b0, [60, 0, 0], [7.2, 12, 7.2], [0, 0, Math.PI / 2]);
  } else if (name === 'castle') {
    // the keep on its crag, four towers, a curtain wall and a gate with banners
    a('box', STONE, [0, 50, 0], [96, 100, 64]);
    for (let k = 0; k < 7; k++) a('box', STONE_D, [-42 + k * 14, 106, 32], [8, 10, 4], null, { ink: 1 });
    a('box', 0x2a2440, [0, 60, 32.5], [12, 18, 1], null, { ink: false });
    g('box', 0xffd860, [-26, 70, 32.6], [6, 9, 1]);
    g('box', 0xffd860, [26, 70, 32.6], [6, 9, 1]);
    for (const [x, z] of [[-56, -34], [56, -34], [-56, 34], [56, 34]]) tower(a, x, z, 120, 18, RED);
    tower(a, 0, -30, 160, 16, BLUE);
    for (const [x, z] of [[-56, -34], [56, 34], [0, -30]]) out.flags.push([...W(x, z === -30 ? 200 : 168, z), GOLD]);
    for (const [x, z] of [[-56, -34], [56, 34]]) a('cyl5', WHITE, [x, 160, z], [1.4, 26, 1.4], null, { ink: 0.8 });
    a('cyl5', WHITE, [0, 192, -30], [1.4, 26, 1.4], null, { ink: 0.8 });
    // banners on the keep's face
    for (const x of [-34, 34]) { a('box', x < 0 ? RED : BLUE, [x, 70, 33], [14, 34, 1]); a('ico', GOLD, [x, 72, 34], [4, 4, 1], null, { ink: false }); }
  } else if (name === 'fishing-pier') {
    // the Beacon: our own design — a squat octagonal tower in yellow and blue
    // bands with a wrap-around gallery, a round lantern room and a fish weathervane
    for (let k = 0; k < 5; k++) a('cyl8', k % 2 ? BLUE : GOLD, [0, 14 + k * 26, 0], [26 - k * 2.2, 26, 26 - k * 2.2]);
    a('cyl8', WOOD_D, [0, 140, 0], [26, 4, 26]);
    for (let k = 0; k < 10; k++) { const an = (k / 10) * Math.PI * 2; a('cyl5', WHITE, [Math.cos(an) * 24, 147, Math.sin(an) * 24], [1, 12, 1], null, { ink: 0.6 }); }
    a('torus', WHITE, [0, 153, 0], [24, 24, 6], [Math.PI / 2, 0, 0], { ink: 0.8 });
    g('cyl8', 0xfff3b0, [0, 160, 0], [13, 22, 13]);
    a('cone8', RED, [0, 182, 0], [18, 22, 18]);
    a('cyl5', 0x14111a, [0, 198, 0], [1, 14, 1], null, { ink: false });
    a('cone4', GOLD, [0, 206, 0], [6, 12, 3], [0, 0, Math.PI / 2], { ink: 0.8 }); // the fish
    a('cone4', GOLD, [8, 206, 0], [4, 5, 2], [0, 0, -Math.PI / 2], { ink: 0.8 });
    a('box', WOOD_D, [0, 30, 25.5], [12, 22, 1], null, { ink: false });
    g('box', 0xffd860, [0, 80, 21], [7, 9, 1]);
    // a keeper's cottage beside it
    hut(at(bk, place(L.x - 74, L.y, L.z + 18, 0.3, 1.1)), 0.1, at(gk, place(L.x - 74, L.y, L.z + 18, 0.3, 1.1)));
    out.beam = W(0, 160, 0);
  } else if (name === 'bog-shack') {
    // a big crooked stilt shack: tilted roof, stove pipe, a porch with lanterns, a wash line
    for (const [x, z] of [[-40, -26], [40, -26], [-40, 26], [40, 26], [0, 30]]) a('cyl5', WOOD_D, [x, 14, z], [3.4, 28, 3.4], [0.05 * Math.sign(x), 0, 0], { ink: 1 });
    a('box', WOOD_L, [0, 29, 6], [104, 5, 76]);
    a('box', 0x6a4a2e, [0, 56, -4], [84, 50, 54], [0, 0, 0.04]);
    a('box', 0x5a8a4a, [-24, 54, 23.3], [20, 26, 1], null, { ink: false });
    g('box', 0xffd860, [22, 62, 23.4], [16, 14, 1]);
    a('wedge', 0x4a6a3a, [2, 94, -4], [98, 34, 64], [0, 0, -0.08]);
    a('cyl5', 0x5a5a6a, [30, 114, -12], [5, 30, 5], [0, 0, 0.12], { ink: 1 });
    a('cone5', 0x5a5a6a, [32, 131, -12], [7, 6, 7], [Math.PI, 0, 0], { ink: 1 });
    for (const x of [-46, 46]) lantern(a, g, x, 54, 40, 0xc8ff7a);
    for (let k = 0; k < 6; k++) a('cyl5', WOOD, [-40 + k * 16, 37, 42], [1.4, 12, 1.4], null, { ink: 0.6 });
    a('box', WOOD, [0, 43, 42], [92, 2, 2], null, { ink: false });
    // steps down to the plateau
    for (let k = 0; k < 4; k++) a('box', WOOD_L, [58 + k * 8, 24 - k * 7, 30], [12, 3, 20], null, { ink: 0.8 });
    // wash line
    a('cyl5', WOOD_D, [-78, 22, 10], [1.4, 44, 1.4], null, { ink: 0.6 });
    for (let k = 0; k < 3; k++) a('box', pick([RED, GOLD, WHITE], k * 0.34), [-70 + k * 9, 36, 10], [7, 9, 0.6], null, { ink: false });
  } else if (name === 'haunted-forest') {
    // the Great Hollow Tree: a fat friendly old tree with a round glowing door,
    // window eyes that are just windows, a lantern ring and a mushroom circle
    a('frust6', 0x5a4038, [0, 50, 0], [48, 100, 48]);
    for (let k = 0; k < 5; k++) { const an = (k / 5) * Math.PI * 2 + 0.3; a('cyl5', 0x5a4038, [Math.cos(an) * 44, 8, Math.sin(an) * 44], [8, 30, 8], [Math.sin(an) * 0.9, 0, -Math.cos(an) * 0.9], { ink: 1.2 }); }
    g('disc12', 0xffc860, [0, 22, 46], [13, 1, 18], [Math.PI / 2 - 0.25, 0, 0]);
    a('torus', WOOD_D, [0, 22, 46], [14, 18, 6], [-0.25, 0, 0], { ink: 0.8 });
    g('box', 0xffe080, [-15, 66, 39], [9, 11, 1], [-0.2, 0, 0]);
    g('box', 0xffe080, [14, 72, 39], [8, 9, 1], [-0.2, 0, 0]);
    for (const [x, y, z, s] of [[0, 120, 0, 60], [-38, 104, 14, 34], [36, 110, -8, 38], [10, 150, -6, 36]]) a('ico', pick([0x5a4a8a, 0x3a7a6a, 0x6a5aa0], (x + 50) / 100), [x, y, z], [s, s * 0.75, s], [x, y, 0]);
    for (const [x, z] of [[-42, 30], [44, 26], [-70, -4], [72, -6]]) lantern(a, g, x, 34, z, 0xffb84a);
    for (let k = 0; k < 9; k++) { const an = (k / 9) * Math.PI * 2; mushroom(at(bk, place(L.x + Math.cos(an) * 92, L.y, L.z + Math.sin(an) * 60 + 10, an, 0.6 + (k % 3) * 0.2)), k / 9, pick([0x7ad8ff, 0xc08aff, 0xff8ad8], k / 9), at(gk, place(L.x + Math.cos(an) * 92, L.y, L.z + Math.sin(an) * 60 + 10, an, 0.6 + (k % 3) * 0.2))); }
  }
  return out;
}

// castle extras on the main plateau: a curtain wall with corner towers along the tier
export function castleWalls(bk, w) {
  const a = at(bk, place(0, w.y, 0));
  wall(a, w.x0, w.z, w.x1, w.z, 26);
  tower(a, w.x0, w.z, 46, 12, BLUE, { windows: 1 });
  tower(a, w.x1, w.z, 46, 12, BLUE, { windows: 1 });
  a('box', 0x2a2440, [(w.x0 + w.x1) / 2, 11, w.z + 6.2], [18, 22, 1], null, { ink: false }); // the gate
  return [[w.x0, w.y + 76, w.z], [w.x1, w.y + 76, w.z]];
}

// ---------------- links and water things ----------------
// A boardwalk on stilts from a to b (both {x,z}); `over` says where the deck
// is over water (stilts go down to the sea there). deck y follows a gentle arch.
export function boardwalk(bk, a, b, over, { y = 4, arch = 12, width = 50 } = {}) {
  const len = Math.hypot(b.x - a.x, b.z - a.z), ang = Math.atan2(b.z - a.z, b.x - a.x);
  const dx = Math.cos(ang), dz = Math.sin(ang), nx = -dz, nz = dx;
  const n = Math.max(6, Math.round(len / 11));
  const deckY = (u) => y + Math.sin(u * Math.PI) * arch * (over(u) ? 1 : 0.4);
  for (let k = 0; k < n; k++) {
    const u = (k + 0.5) / n, x = a.x + dx * len * u, z = a.z + dz * len * u;
    bk.add('box', k % 2 ? WOOD : WOOD_L, [x, deckY(u), z], [len / n - 2, 3, width], [0, -ang, 0], { ink: 0.9 });
  }
  // rails and stilts
  const posts = Math.max(3, Math.round(len / 34));
  for (let k = 0; k <= posts; k++) {
    const u = k / posts, x = a.x + dx * len * u, z = a.z + dz * len * u, yy = deckY(u);
    for (const s of [-1, 1]) {
      const px = x + nx * s * (width / 2 + 1), pz = z + nz * s * (width / 2 + 1);
      bk.add('cyl5', WOOD_D, [px, yy + 9, pz], [2, 18, 2], null, { ink: 0.8 });
      if (over(u)) bk.add('cyl5', WOOD_D, [px, (yy - 50) / 2, pz], [3, yy + 50, 3], null, { ink: 0.9 });
    }
    if (over(u)) bk.add('box', WOOD_D, [x, yy - 6, z], [4, 3, width + 4], [0, -ang, 0], { ink: 0.6 });
  }
  for (const s of [-1, 1]) {
    for (let k = 0; k < posts; k++) {
      const u0 = k / posts, u1 = (k + 1) / posts, um = (u0 + u1) / 2;
      const x = a.x + dx * len * um + nx * s * (width / 2 + 1), z = a.z + dz * len * um + nz * s * (width / 2 + 1);
      const tilt = Math.atan2(deckY(u1) - deckY(u0), len / posts);
      bk.add('box', WOOD_L, [x, deckY(um) + 17, z], [len / posts + 2, 2.6, 2.6], [0, -ang, tilt], { ink: 0.6 });
    }
  }
}

// a pier dock reaching out to sea from (x, z) toward +z, with a moored rowboat
export function dock(bk, gk, d) {
  const a = at(bk, place(d.x, 0, d.z));
  const n = Math.round(d.len / 12);
  for (let k = 0; k < n; k++) a('box', k % 2 ? WOOD : WOOD_L, [0, 3, 6 + k * 12], [d.w, 3, 10], null, { ink: 0.8 });
  for (let k = 0; k <= 4; k++) for (const s of [-1, 1]) a('cyl5', WOOD_D, [s * (d.w / 2 + 1), -20 + (k ? 0 : 6), 4 + (k / 4) * (d.len - 4)], [3, 52, 3], null, { ink: 0.8 });
  a('box', WOOD_L, [d.w / 2 + 4, 6, d.len - 10], [6, 3, 12], null, { ink: 0.6 });
  // crates and a lamp at the end
  a('box', WOOD_L, [-d.w / 2 + 7, 10, d.len - 14], [10, 10, 10], [0, 0.4, 0]);
  a('cyl5', 0x3a2e2a, [d.w / 2 - 4, 18, d.len - 4], [1.4, 30, 1.4], null, { ink: 0.6 });
  at(gk, place(d.x, 0, d.z))('oct', 0xffd860, [d.w / 2 - 4, 35, d.len - 4], [3.4, 5, 3.4]);
  // a buoy-ring on a post and a coiled rope
  a('torus', RED, [-d.w / 2 - 1, 12, d.len * 0.5], [6, 6, 6], [0, Math.PI / 2, 0], { ink: 0.8 });
  rowboat(at(bk, place(d.x + d.w / 2 + 24, -46, d.z + d.len * 0.6, 0.15)), RED);
}

// a little rowboat, hull at y = 0 (waterline), bow toward +z
export function rowboat(a, col = RED) {
  a('box', col, [0, 4, 0], [20, 8, 40]);
  a('wedge', col, [0, 4, 26], [20, 8, 12], [Math.PI / 2, 0, 0]);
  a('box', WOOD_L, [0, 8.4, 0], [16, 1, 34], null, { ink: false });
  a('box', WOOD_D, [0, 10, 4], [18, 2, 5], null, { ink: false });
  a('cyl5', WOOD_D, [12, 10, -2], [1, 26, 1], [0.4, 0, 1.2], { ink: 0.6 });
}
// a sailboat for the open sea (hull at y = 0)
export function sailboat(a, col = BLUE, sail = WHITE) {
  a('box', col, [0, 5, 0], [24, 10, 52]);
  a('wedge', col, [0, 5, 33], [24, 10, 14], [Math.PI / 2, 0, 0]);
  a('box', WOOD_L, [0, 10.5, 0], [20, 1, 46], null, { ink: false });
  a('cyl5', WOOD_D, [0, 40, 4], [1.6, 62, 1.6], null, { ink: 0.8 });
  a('wedge', sail, [0, 42, 0], [3, 50, 34], [0, Math.PI / 2, 0], { ink: 1 });
  a('box', GOLD, [0, 72, 4], [0.8, 6, 10], null, { ink: 0.6 });
}

// a bog stilt shack standing in the shallows (feet at y = water)
export function stiltShack(bk, gk, s, water) {
  const m = place(s.x, water, s.z, s.rot, 0.8);
  const a = at(bk, m), g = at(gk, m);
  for (const [x, z] of [[-16, -12], [16, -12], [-16, 12], [16, 12]]) a('cyl5', WOOD_D, [x, 16, z], [2.4, 34, 2.4], null, { ink: 0.8 });
  a('box', WOOD_L, [0, 34, 0], [44, 3, 36]);
  a('box', 0x6a4a2e, [0, 50, -2], [32, 28, 26], [0, 0, 0.05]);
  a('wedge', 0x4a6a3a, [0, 72, -2], [40, 18, 32], [0, 0, -0.06]);
  g('box', 0xc8ff7a, [6, 52, 11.2], [8, 8, 1]);
  a('box', WOOD_D, [-7, 46, 11.1], [8, 16, 1], null, { ink: false });
  rowboat(at(bk, place(s.x + 20, water, s.z + 24, s.rot + 1.2, 0.8)), 0x7a9a5a);
  // mangrove roots around the feet
  for (let k = 0; k < 5; k++) { const an = k * 1.3; a('cyl5', 0x5a4030, [Math.cos(an) * 30, 4, Math.sin(an) * 26], [2, 14, 2], [Math.sin(an) * 0.7, 0, -Math.cos(an) * 0.7], { ink: 0.6 }); }
}

// sea pieces (feet at the water level y)
export function seaPiece(bk, gk, q, water) {
  const m = place(q.x, water, q.z, q.rot, q.s);
  const a = at(bk, m), g = at(gk, m);
  if (q.kind === 'sea-rock') {
    a('ico', STONE_D, [0, 2, 0], [18, 12, 14], [q.v * 3, q.v, 0]);
    if (q.v > 0.5) a('ico', STONE, [16, 0, 6], [9, 8, 9], [q.v, 0, q.v]);
  } else if (q.kind === 'stack') {
    a('frust6', 0x8c7a6a, [0, 22, 0], [26, 54, 26], [0, q.v, 0]);
    a('frust6', 0x75665a, [2, 58, 0], [17, 22, 17], [0, q.v * 3, 0]);
    a('cyl6', LEAF_L, [2, 70, 0], [12, 4, 12], [0, q.v * 3, 0]);
    if (q.v > 0.4) tree(at(bk, new THREE.Matrix4().multiplyMatrices(m, place(2, 72, 0, q.v, 0.5))), 0.5, q.v);
    a('ico', WHITE, [-10, 66, 6], [3, 3, 3], null, { ink: 0.6 }); // a seagull resting
  } else if (q.kind === 'buoy') {
    a('cone8', q.v > 0.5 ? RED : GOLD, [0, 10, 0], [8, 20, 8]);
    a('cyl8', WHITE, [0, 7, 0], [6.4, 4, 6.4], null, { ink: false });
    g('ico', 0xfff3b0, [0, 22, 0], [2.6, 2.6, 2.6]);
  }
}
