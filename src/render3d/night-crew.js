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

// Fire dancer: a living flame. Three flattened teardrops stacked front to back
// (deep orange shell, yellow body, white-hot heart), each wavering on its own
// clock so the tips lick and lean independently; two little tongues of flame
// peel off the top and rise away; two teardrop arms flick. Two tiny bright eye
// slits and nothing else on the face. All glow (unlit basic materials), so they
// read in the storm. Hops at ~2 Hz (opts.hz) with a squash on landing.
// Geometry and materials are shared by every dancer (built once per module).
// The flame faces +z; turn root to face the camera for the best silhouette.
let FD = null;
function fireKit(THREE) {
  if (FD) return FD;
  // teardrop lathe: round belly low, a long point on top, height 1, max radius ~0.5
  const pts = [];
  for (let k = 0; k <= 9; k++) {
    const u = k / 9;
    pts.push(new THREE.Vector2(Math.max(0.001, 0.5 * Math.sin(Math.PI * Math.pow(u, 0.55)) * Math.pow(1 - u, 0.6)), u));
  }
  const tear = new THREE.LatheGeometry(pts, 7);
  const slit = new THREE.PlaneGeometry(1, 1);
  for (const g of [tear, slit]) g.userData.boardShared = true; // board3d.js leaves shared geometry alone on dispose
  const glow = (c) => new THREE.MeshBasicMaterial({ color: c });
  FD = { tear, slit, shell: glow(0xe8461e), body: glow(0xffb21e), heart: glow(0xfff3c4), tongue: glow(0xff7a24), arm: glow(0xff8a2a), eye: glow(0xfffde8) };
  return FD;
}

export function buildFireDancer(THREE, part, { height = 72, seed = Math.random() * 1000, hz = 2 } = {}) {
  const K = fireKit(THREE);
  const h = height;
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  // each layer sits in a pivot at its base so a z-rotation swings the tip
  const layer = (mat, w, hh, d, z, ink) => {
    const pivot = new THREE.Group();
    pivot.position.z = z;
    pivot.add(part(K.tear, null, { mat, scale: [w, hh, d], ink }));
    body.add(pivot);
    return pivot;
  };
  const shell = layer(K.shell, 0.56 * h, h, 0.16 * h, 0, 1.4);
  const mid = layer(K.body, 0.4 * h, 0.74 * h, 0.12 * h, 0.06 * h, false);
  const heart = layer(K.heart, 0.22 * h, 0.44 * h, 0.08 * h, 0.11 * h, false);
  // two tongues that peel off the top and rise away, shrinking
  const tongues = [0, 1].map((k) => {
    const m = part(K.tear, null, { mat: K.tongue, ink: false });
    body.add(m);
    return { m, off: k * 0.5, side: k ? 1 : -1 };
  });
  // arms: thin teardrops with the point outward, pivoted at the shoulder
  const arms = [-1, 1].map((d) => {
    const pivot = new THREE.Group();
    pivot.position.set(d * 0.2 * h, 0.36 * h, 0.03 * h);
    pivot.add(part(K.tear, null, { mat: K.arm, scale: [0.13 * h, 0.3 * h, 0.06 * h], rot: [0, 0, -d * 1.1], ink: 1 }));
    body.add(pivot);
    return { pivot, d };
  });
  // eye slits on the orange shell, above the yellow body's tip
  for (const d of [-1, 1]) body.add(part(K.slit, null, { mat: K.eye, pos: [d * 0.065 * h, 0.6 * h, 0.135 * h], scale: [0.055 * h, 0.018 * h, 1], rot: [0, 0, d * -0.25], ink: false }));
  const ph = seed % 6.283, sideDir = seed % 2 < 1 ? 1 : -1;
  const w = (Math.PI * 2 * hz) / 1000; // hop phase per ms (one hop per half sine)
  const animate = (t) => {
    const hop = t * w * 0.5 + ph;
    const air = Math.abs(Math.sin(hop));
    body.position.y = air * h * 0.22;
    body.position.x = Math.sin(hop * 0.5) * h * 0.12 * sideDir;
    const squash = 1 - 0.18 * Math.max(0, Math.cos(hop * 2)) * (1 - air);
    body.scale.set(1 / squash, squash, 1);
    body.rotation.z = Math.sin(hop) * 0.1 * sideDir;
    // three clocks: the tips never line up, so the outline keeps licking
    shell.rotation.z = Math.sin(t / 170 + ph) * 0.1;
    shell.scale.y = 1 + Math.sin(t / 90 + ph) * 0.07;
    mid.rotation.z = Math.sin(t / 125 + ph + 1) * 0.15;
    mid.scale.y = 1 + Math.sin(t / 70 + ph * 2) * 0.1;
    heart.rotation.z = Math.sin(t / 95 + ph + 2) * 0.12;
    heart.scale.y = 1 + Math.sin(t / 55 + ph * 3) * 0.13;
    for (const q of tongues) {
      const c = (((t / 430 + q.off + ph) % 1) + 1) % 1; // 0: just peeled off, 1: gone
      const s = 1 - c;
      q.m.position.set(q.side * 0.07 * h + Math.sin(c * 6 + ph) * 0.05 * h, 0.55 * h + c * 0.6 * h, 0.02 * h);
      q.m.scale.set(0.14 * h * s, 0.3 * h * (1 - c * 0.5), 0.05 * h);
      q.m.visible = s > 0.04;
    }
    // arm flicks: a lazy wave plus a quick snap every other hop
    for (const a of arms) {
      const snap = Math.pow(Math.max(0, Math.sin(hop * 0.5 + (a.d > 0 ? 1.6 : 0))), 8);
      a.pivot.rotation.z = a.d * (0.25 + Math.sin(t / 150 + ph + a.d) * 0.35 + snap * 0.9);
    }
  };
  animate(0);
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
    const k = ((((t + ph * 300) % period) + period) % period) / period;
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
