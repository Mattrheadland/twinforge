// Czernobog's night crew as tiny 3D rigs for the campaign board (and anywhere
// else a few extra bodies help): a fire dancer and a shadow peeker, each about
// 20 triangles before the ink hulls and 60–90 units tall. Our own designs: a
// grinning teardrop flame with stubby arms, and a flat rounded shade with two
// pale eyes. No faces or shapes borrowed from any film or game.
//
// Usage (board3d.js or any three.js scene using the toon shader):
//   import { buildFireDancer, buildShadowPeeker } from './night-crew.js';
//   import { maker } from './roster-rigs.js';     // or { part } from './toon.js'
//   const P = maker(flashUniform);                // part(geo, color, opts) with ink hulls
//   const d = buildFireDancer(THREE, P);          // d.root is a THREE.Group, feet at y = 0
//   scene.add(d.root); d.root.position.set(x, groundY, z);
//   const s = buildShadowPeeker(THREE, P);        // s.root rises out of y = 0 and sinks back
//   scene.add(s.root);
//   // every frame, with t in milliseconds:
//   d.animate(t); s.animate(t);
//   // when done: scene.remove(root) and dispose the geometries as for any rig.
// The peeker never shows more than its top half above y = 0; place it where the
// ground mesh hides what is below (the board islands do), or it will poke
// through underneath. Both rigs are self-contained: no textures, no decals.

const INK = 0x14111a;

// Fire dancer: five-sided flame cone (open bottom), a yellow core cone, two
// three-sided arm spikes, two flat ink eyes and a grin plate. Hops at 2 Hz and
// sways side to side at 1 Hz; the tip flickers.
export function buildFireDancer(THREE, part, { height = 72, seed = Math.random() * 1000 } = {}) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const h = height * 0.8, r = height * 0.28;
  const flame = part(new THREE.ConeGeometry(r, h, 5, 1, true), 0xf46036, { pos: [0, h / 2, 0], ink: 2 });
  const core = part(new THREE.ConeGeometry(r * 0.52, h * 0.6, 5, 1, true), 0xffc914, { pos: [0, h * 0.3, r * 0.5], ink: false });
  core.scale.set(1, 1, 0.6);
  body.add(flame, core);
  // arms: little three-sided spikes stuck to the sides, pivoted at the shoulder
  const arms = [];
  for (const d of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(d * r * 0.85, h * 0.45, 0);
    const spike = part(new THREE.ConeGeometry(r * 0.18, r * 0.9, 3, 1, true), 0xf46036, { pos: [d * r * 0.4, 0, 0], rot: [0, 0, -d * Math.PI / 2], ink: 1.2 });
    pivot.add(spike);
    body.add(pivot);
    arms.push(pivot);
  }
  // face: two ink dots and a grin plate on the front (+z)
  const eyeGeo = new THREE.PlaneGeometry(r * 0.22, r * 0.22);
  for (const d of [-1, 1]) {
    const e = part(eyeGeo, INK, { pos: [d * r * 0.3, h * 0.5, r * 0.7], ink: false });
    body.add(e);
  }
  const grin = part(new THREE.PlaneGeometry(r * 0.9, r * 0.16), INK, { pos: [0, h * 0.36, r * 0.66], ink: false });
  body.add(grin);
  const ph = seed % 6.283, sideDir = seed % 2 < 1 ? 1 : -1;
  const animate = (t) => {
    const hop = (t / 1000) * Math.PI * 4 + ph;
    const air = Math.abs(Math.sin(hop));
    body.position.y = air * height * 0.22;
    body.position.x = Math.sin(hop * 0.5) * height * 0.28 * sideDir;
    const squash = 1 - 0.16 * Math.max(0, Math.cos(hop * 2)) * (1 - air);
    body.scale.set(1 / squash, squash, 1);
    body.rotation.z = Math.sin(hop) * 0.12 * sideDir;
    // tip flicker: the flame cone leans and stretches a little
    flame.rotation.z = Math.sin(t / 60 + ph) * 0.08;
    flame.scale.y = 1 + Math.sin(t / 110 + ph * 2) * 0.08;
    core.rotation.z = Math.sin(t / 50 + ph + 1) * 0.1;
    const swing = Math.sin(hop) * 0.9;
    arms[0].rotation.z = -swing * 0.6 - 0.3;
    arms[1].rotation.z = -swing * 0.6 + 0.3;
  };
  return { root, body, animate, height };
}

// Shadow peeker: a flat rounded shade (a 2D shape, so it reads as a silhouette
// from the front) with two pale round eyes. Rises out of the ground to half
// height, glances left then right, sinks back, waits, repeats.
export function buildShadowPeeker(THREE, part, { height = 80, seed = Math.random() * 1000, period = 4200 } = {}) {
  const root = new THREE.Group();
  const w = height * 0.36, h = height;
  const shape = new THREE.Shape();
  shape.moveTo(-w, -h);
  shape.lineTo(-w, h - w * 1.1);
  shape.quadraticCurveTo(-w, h, -w * 0.15, h);
  shape.quadraticCurveTo(w, h, w, h - w * 1.1);
  shape.lineTo(w, -h);
  shape.closePath();
  const shade = part(new THREE.ShapeGeometry(shape, 4), INK, { ink: false });
  shade.material.side = THREE.DoubleSide;
  root.add(shade);
  const eyes = new THREE.Group();
  const eyeGeo = new THREE.CircleGeometry(w * 0.17, 6);
  for (const d of [-1, 1]) eyes.add(part(eyeGeo, 0xe6d8ff, { pos: [d * w * 0.42, h - w * 0.85, 1], ink: false }));
  root.add(eyes);
  const ease = (x) => x * x * (3 - 2 * x);
  const ph = seed % 6.283, first = seed % 2 < 1 ? 1 : -1;
  const animate = (t) => {
    const k = (((t + ph * 300) % period) + period) / period;
    const up = k < 0.3 ? ease(k / 0.3) : k > 0.72 ? ease(Math.max(0, 1 - (k - 0.72) / 0.28)) : 1;
    // the shape spans y = -h..h; at rest the top sits at y = 0 (fully buried),
    // fully up the top sits at h * 0.5 (half of it showing)
    root.position.y = -h + h * 0.5 * up;
    root.visible = up > 0.01;
    const g = k < 0.3 || k > 0.72 ? 0 : Math.sin(((k - 0.3) / 0.42) * Math.PI * 2);
    eyes.position.x = first * Math.max(-1, Math.min(1, g * 1.6)) * w * 0.3;
    root.rotation.z = Math.sin(t / 420 + ph) * 0.03;
  };
  animate(0);
  return { root, eyes, animate, height };
}
