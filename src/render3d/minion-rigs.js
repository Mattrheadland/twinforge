// Wild creatures (campaign minions): cheap, chunky toys made of a handful of
// boxes, cones and low spheres each, about 120–150 units tall (smaller than the
// main toys). Same pose interface as roster-rigs.js; faces are a painted-eye
// decal. One builder per creature, all sharing the helpers below.
import * as THREE from 'three';
import { maker, group, decal, faceUpdater, paintEyes } from './roster-rigs.js';

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const ico = (d = 1) => new THREE.IcosahedronGeometry(1, d);
const cone = (r, h, s = 5) => new THREE.ConeGeometry(r, h, s);
const cyl = (rt, rb, h, s = 7) => new THREE.CylinderGeometry(rt, rb, h, s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Shared rig shell: arms swing, head bobs, tired slump, eye decal.
function rig({ root, head, headY, armF, armB, eyes, eyeStyle, anchors, headR, armK = 0.8, extra }) {
  const upd = eyes ? faceUpdater(eyes, (g, W, H, e, m, t) => paintEyes(g, W, H, e, eyeStyle, t)) : () => {};
  const r = { root, head, armF, armB, anchors, headR };
  r.apply = (p) => {
    if (armF) armF.rotation.z = clamp(-(p.armF ?? -0.2) * armK, -1.6, 1.6);
    if (armB) armB.rotation.z = clamp(-(p.armB ?? 0.25) * armK, -1.6, 1.6);
    if (head) head.position.y = headY + (p.headBob || 0);
    const tired = p.pose === 'tired';
    root.rotation.z = tired ? 0.14 : 0;
    if (head) head.rotation.z = tired ? -0.25 : 0;
    upd(p);
    extra && extra(p);
  };
  return r;
}
const A = (x, y, z = 0) => new THREE.Vector3(x, y, z);

// Rexlet: baby battle-dino in a hand-me-down helmet
function rexlet(flash) {
  const P = maker(flash);
  const root = new THREE.Group();
  const RED = 0xe0453a, CREAM = 0xf0dcb0, GRAY = 0x9aa3b8;
  for (const z of [-14, 14]) root.add(P(box(16, 34, 14), RED, { pos: [0, 17, z] }), P(box(24, 8, 16), RED, { pos: [6, 4, z] }));
  const tail = group(root, -26, 50, 0);
  const tg = cone(14, 56, 5); tg.rotateZ(Math.PI / 2); tg.translate(-24, 0, 0);
  tail.add(P(tg, RED));
  root.add(P(ico(1), RED, { scale: [34, 32, 28], pos: [0, 58, 0] }), P(ico(1), CREAM, { scale: [20, 22, 22], pos: [16, 54, 6], ink: 1.6 }));
  const arm = (z) => { const pv = group(root, 24, 66, z); pv.add(P(box(7, 16, 7), RED, { pos: [0, -8, 0] })); return pv; };
  const armB = arm(-16), armF = arm(16);
  const head = group(root, 22, 92, 0);
  head.add(P(ico(1), RED, { scale: [26, 22, 22], pos: [8, 6, 0] }), P(box(26, 12, 20), RED, { pos: [28, 0, 0] }));
  for (let i = 0; i < 3; i++) head.add(P(cone(2, 6, 4), 0xffe08a, { pos: [22 + i * 7, -7, 8], rot: [Math.PI, 0, 0], ink: 1 }));
  head.add(P(box(30, 10, 26), GRAY, { pos: [8, 24, 0], shiny: true }), P(cone(4, 14, 4), GRAY, { pos: [-6, 30, 0], rot: [0, 0, 1], ink: 1.4 }));
  const eyes = decal(head, 22, 11, 128, 64, [30.2, 14, 0]);
  tail.rotation.z = 0.25;
  return rig({ root, head, headY: 92, armF, armB, eyes, eyeStyle: { iris: '#7A4A20', lid: '#E0453A', brow: '#14111A', size: 20, gap: 30 },
    anchors: { head: A(40, 100), top: A(20, 128), center: A(6, 60), muzzle: A(56, 92) }, headR: 40,
    extra: (p) => { tail.rotation.y = Math.sin((p.t || 0) / 300) * 0.2; } });
}

// Spooky Sprout: a walking stump with a jack-o-lantern grin
function sprout(flash) {
  const P = maker(flash);
  const root = new THREE.Group();
  const BARK = 0x3a3346, BARK2 = 0x2b2735, GLOW = 0xff8a1f;
  for (const z of [-14, 14]) root.add(P(cone(10, 22, 4), BARK2, { pos: [4, 10, z], rot: [0, 0, -0.5] }));
  const head = group(root, 0, 0, 0);
  head.add(P(cyl(26, 34, 96, 7), BARK, { pos: [0, 62, 0] }));
  head.add(P(cyl(28, 28, 8, 7), 0x8a5a3c, { pos: [0, 114, 0], ink: 1.6 }));
  head.add(P(cone(6, 22, 4), BARK, { pos: [-8, 126, 6], rot: [0.2, 0, 0.3] }));
  // glowing grin and cracks (unlit-looking orange)
  head.add(P(box(3, 8, 26), GLOW, { pos: [30, 54, 0], ink: false }));
  head.add(P(box(3, 22, 4), GLOW, { pos: [-26, 70, 12], rot: [0, 0, 0.3], ink: false }));
  const branch = (z) => { const pv = group(root, 4, 84, z); const g = cone(5, 40, 4); g.translate(0, -20, 0); pv.add(P(g, BARK2, { rot: [0, 0, Math.PI] })); pv.add(P(cone(3, 14, 4), BARK2, { pos: [6, -30, 0], rot: [0, 0, -0.8], ink: 1.2 })); return pv; };
  const armB = branch(-30), armF = branch(30);
  const eyes = decal(head, 34, 16, 128, 60, [29.5, 80, 0]);
  return rig({ root, head, headY: 0, armF, armB, eyes, eyeStyle: { glow: '#FF8A1F', size: 18, gap: 30 },
    anchors: { head: A(24, 80), top: A(0, 132), center: A(4, 64) }, headR: 46 });
}

// Rock Minnow: a little armored fish bouncing on its tail
function minnow(flash) {
  const P = maker(flash);
  const root = new THREE.Group();
  const BLUE = 0x4e7be0, SILVER = 0xc4cad8, FIN = 0xe8b33a;
  const body = group(root, 0, 0, 0);
  body.add(P(ico(1), SILVER, { scale: [40, 30, 22], pos: [8, 66, 0] }), P(ico(1), BLUE, { scale: [34, 16, 20], pos: [4, 82, 0], ink: 1.6 }));
  body.add(P(cone(12, 40, 4), FIN, { pos: [-36, 36, 0], rot: [0, 0, 2.6], scale: [1, 1, 0.3] }));
  body.add(P(cone(9, 28, 4), FIN, { pos: [0, 102, 0], rot: [0, 0, 0.3], scale: [1, 1, 0.3], ink: 1.4 }));
  body.add(P(box(16, 6, 22), 0x2a1416, { pos: [44, 60, 0], ink: false }));
  const fin = (z) => { const pv = group(body, 14, 60, z); const g = cone(6, 22, 4); g.translate(0, -11, 0); pv.add(P(g, FIN, { scale: [1, 1, 0.35], ink: 1.2 })); return pv; };
  const armB = fin(-20), armF = fin(20);
  const eyes = decal(body, 24, 12, 128, 64, [38, 74, 0]);
  return rig({ root, head: body, headY: 0, armF, armB, eyes, eyeStyle: { iris: '#FFC914', lid: '#C4CAD8', brow: '#2B2F3A', size: 20, gap: 32 },
    anchors: { head: A(30, 74), top: A(4, 112), center: A(6, 64), muzzle: A(52, 62) }, headR: 36,
    extra: (p) => { body.position.y = Math.abs(Math.sin((p.t || 0) / 260)) * 6 + (p.headBob || 0); } });
}

// Tin Squire: wind-up tin soldier with a wooden sword
function squire(flash) {
  const P = maker(flash);
  const root = new THREE.Group();
  const TIN = 0x8e9aae, RED = 0xd7263d, WOOD = 0xc9a15a, SKIN = 0xf5c7a9;
  for (const z of [-10, 10]) root.add(P(box(12, 40, 12), TIN, { pos: [0, 20, z], shiny: true }));
  root.add(P(box(30, 40, 30), RED, { pos: [0, 60, 0] }), P(box(32, 6, 32), WOOD, { pos: [0, 44, 0], ink: 1.4 }));
  const key = group(root, -18, 64, 0);
  key.add(P(cyl(2, 2, 12, 5), TIN, { rot: [0, 0, Math.PI / 2], pos: [-6, 0, 0], ink: 1 }), P(box(3, 14, 10), TIN, { pos: [-13, 0, 0], ink: 1 }));
  const head = group(root, 0, 96, 0);
  head.add(P(box(22, 22, 22), SKIN, {}), P(cyl(14, 14, 18, 8), TIN, { pos: [0, 18, 0], shiny: true }), P(cone(3, 10, 4), RED, { pos: [0, 32, 0], ink: 1 }));
  const arm = (z, sword) => {
    const pv = group(root, 0, 76, z);
    pv.add(P(box(9, 26, 9), RED, { pos: [0, -13, 0] }));
    if (sword) pv.add(P(box(4, 40, 3), WOOD, { pos: [4, -40, 0], ink: 1.2 }), P(box(14, 3, 6), WOOD, { pos: [4, -22, 0], ink: 1 }));
    return pv;
  };
  const armB = arm(-20, false), armF = arm(20, true);
  const eyes = decal(head, 18, 8, 128, 56, [11.2, 2, 0]);
  return rig({ root, head, headY: 96, armF, armB, eyes, eyeStyle: { iris: '#3A6FD8', lid: '#F5C7A9', brow: '#5A3A20', size: 16, gap: 30 },
    anchors: { head: A(8, 98), top: A(0, 134), center: A(0, 60) }, headR: 30,
    extra: (p) => { key.rotation.x = (p.t || 0) / 300; } });
}

// Bog Frog: Wanda's hoppy helper
function frog(flash) {
  const P = maker(flash);
  const root = new THREE.Group();
  const GREEN = 0x2e9e44, BELLY = 0xc8e63c, PINK = 0xe07ab0;
  for (const z of [-20, 20]) root.add(P(ico(1), GREEN, { scale: [22, 12, 12], pos: [-4, 8, z] }), P(box(16, 4, 12), GREEN, { pos: [16, 2, z], ink: 1.2 }));
  const head = group(root, 0, 0, 0);
  head.add(P(ico(1), GREEN, { scale: [34, 30, 32], pos: [0, 40, 0] }), P(ico(1), BELLY, { scale: [20, 20, 24], pos: [14, 34, 0], ink: 1.6 }));
  for (const z of [-14, 14]) head.add(P(ico(1), GREEN, { scale: [11, 11, 11], pos: [12, 70, z] }));
  head.add(P(box(4, 3, 30), PINK, { pos: [32, 46, 0], ink: false }));
  const arm = (z) => { const pv = group(root, 16, 40, z); pv.add(P(box(6, 16, 6), GREEN, { pos: [0, -8, 0] })); return pv; };
  const armB = arm(-26), armF = arm(26);
  const eyes = decal(head, 30, 14, 128, 60, [22.6, 72, 0]);
  return rig({ root, head, headY: 0, armF, armB, eyes, eyeStyle: { iris: '#FFC914', lid: '#2E9E44', size: 20, gap: 30 },
    anchors: { head: A(22, 60), top: A(10, 86), center: A(4, 40), muzzle: A(36, 46) }, headR: 34,
    extra: (p) => { head.position.y = Math.abs(Math.sin((p.t || 0) / 340)) * 5 + (p.headBob || 0); } });
}

// Shadow Imp: a little horned shadow from Czernobog's mountain. Skinny arms,
// glowing pink eyes, and it never stops dancing.
function imp(flash) {
  const P = maker(flash);
  const root = new THREE.Group();
  const SHADOW = 0x3a2a6a, DEEP = 0x251a48, HORN = 0xff5a8a;
  const body = group(root, 0, 0, 0);
  for (const z of [-10, 10]) body.add(P(cyl(3, 4, 34, 5), DEEP, { pos: [0, 17, z] }), P(box(14, 5, 8), DEEP, { pos: [5, 2, z], ink: 1 }));
  body.add(P(cone(24, 60, 6), SHADOW, { pos: [0, 60, 0], rot: [Math.PI, 0, 0] })); // upside-down cone torso
  const tail = group(body, -14, 40, 0);
  const tg = cyl(1.5, 2.5, 40, 4); tg.rotateZ(1.1); tg.translate(-16, -6, 0);
  tail.add(P(tg, DEEP, { ink: 1 }), P(cone(5, 10, 3), HORN, { pos: [-34, -14, 0], rot: [0, 0, 2.2], ink: 1 }));
  const head = group(body, 4, 102, 0);
  head.add(P(ico(1), SHADOW, { scale: [24, 22, 22] }));
  for (const z of [-12, 12]) head.add(P(cone(5, 22, 4), HORN, { pos: [-2, 22, z], rot: [z > 0 ? -0.35 : 0.35, 0, -0.2], ink: 1.2 }));
  head.add(P(box(3, 4, 14), HORN, { pos: [23, -10, 0], ink: false })); // little grin
  const arm = (z) => {
    const pv = group(body, 6, 82, z);
    const g = cyl(2, 3, 34, 4); g.translate(0, -17, 0);
    pv.add(P(g, DEEP, { ink: 1 }), P(cone(4, 9, 3), DEEP, { pos: [0, -36, 0], rot: [Math.PI, 0, 0], ink: 1 }));
    return pv;
  };
  const armB = arm(-24), armF = arm(24);
  const eyes = decal(head, 26, 12, 128, 58, [22.5, 3, 0]);
  return rig({ root, head, headY: 102, armF, armB, eyes, eyeStyle: { glow: '#FF5A8A', size: 18, gap: 30 },
    anchors: { head: A(26, 104), top: A(4, 134), center: A(4, 62), muzzle: A(30, 92) }, headR: 34, armK: 1,
    extra: (p) => {
      const t = p.t || 0;
      body.position.y = Math.abs(Math.sin(t / 160)) * 8;
      body.rotation.y = Math.sin(t / 320) * 0.35; // the jig
      tail.rotation.z = Math.sin(t / 140) * 0.3;
    } });
}

// Jitterbones: a wobbly little skeleton who can't stop dancing. Chunky
// rounded bones so it reads as a toy, not a scary one.
function bones(flash) {
  const P = maker(flash);
  const root = new THREE.Group();
  const BONE = 0xe8e4f0, SHADE = 0xb8b0cc, BOW = 0xb98cff;
  const legs = [];
  for (const z of [-10, 10]) {
    const pv = group(root, 0, 40, z);
    pv.add(P(cyl(3.5, 3.5, 36, 5), BONE, { pos: [0, -18, 0] }), P(box(14, 6, 9), BONE, { pos: [5, -38, 0], ink: 1.2 }));
    legs.push(pv);
  }
  const body = group(root, 0, 0, 0);
  body.add(P(box(22, 8, 22), SHADE, { pos: [0, 44, 0] })); // hips
  body.add(P(cyl(3, 3, 26, 5), BONE, { pos: [0, 58, 0] })); // spine
  for (let k = 0; k < 3; k++) body.add(P(box(16 - k * 2, 4, 30 - k * 4), BONE, { pos: [2, 76 - k * 8, 0], ink: 1.2 })); // ribs
  body.add(P(box(8, 6, 8), BOW, { pos: [12, 86, 0], rot: [0, 0, 0.785], ink: 1.2 })); // a purple bow tie
  const head = group(body, 2, 104, 0);
  head.add(P(ico(1), BONE, { scale: [22, 20, 20] }), P(box(16, 8, 18), BONE, { pos: [8, -16, 0], ink: 1.2 }));
  for (const z of [-5, 0, 5]) head.add(P(box(2, 4, 3), 0x14111a, { pos: [16.5, -14, z], ink: false })); // teeth gaps
  const arm = (z) => {
    const pv = group(body, 2, 84, z);
    const g = cyl(2.5, 2.5, 32, 5); g.translate(0, -16, 0);
    pv.add(P(g, BONE, { ink: 1 }), P(ico(0), BONE, { scale: [6, 5, 5], pos: [0, -34, 0], ink: 1 }));
    return pv;
  };
  const armB = arm(-20), armF = arm(20);
  const eyes = decal(head, 26, 12, 128, 58, [22.6, 3, 0]);
  return rig({ root, head, headY: 104, armF, armB, eyes, eyeStyle: { iris: '#B98CFF', sclera: '#2A1F44', lid: '#E8E4F0', size: 20, gap: 30 },
    anchors: { head: A(24, 106), top: A(2, 128), center: A(4, 66), muzzle: A(28, 92) }, headR: 32, armK: 1,
    extra: (p) => {
      const t = p.t || 0;
      // rattle: each part jiggles a little out of step
      body.position.y = Math.abs(Math.sin(t / 150)) * 5;
      head.rotation.y = Math.sin(t / 110) * 0.25;
      legs[0].rotation.z = Math.sin(t / 150) * 0.25;
      legs[1].rotation.z = -Math.sin(t / 150) * 0.25;
    } });
}

// Sneaky Squirrel: the backyard squirrel Remy always chases
function squirrel(flash) {
  const P = maker(flash);
  const root = new THREE.Group();
  const FUR = 0xa8692e, LIGHT = 0xf2ede4;
  for (const z of [-12, 12]) root.add(P(ico(1), FUR, { scale: [18, 14, 10], pos: [-4, 14, z] }), P(box(16, 5, 9), FUR, { pos: [10, 3, z], ink: 1.2 }));
  const tail = group(root, -20, 30, 0);
  tail.add(P(ico(1), FUR, { scale: [16, 40, 14], pos: [-14, 36, 0], rot: [0, 0, 0.3] }), P(ico(1), LIGHT, { scale: [8, 14, 10], pos: [-12, 70, 0], ink: 1.2 }));
  root.add(P(ico(1), FUR, { scale: [20, 28, 18], pos: [2, 46, 0] }), P(ico(1), LIGHT, { scale: [12, 18, 14], pos: [12, 42, 4], ink: 1.4 }));
  const arm = (z) => { const pv = group(root, 14, 56, z); pv.add(P(box(5, 14, 5), FUR, { pos: [0, -7, 0] })); return pv; };
  const armB = arm(-12), armF = arm(12);
  const head = group(root, 10, 80, 0);
  head.add(P(ico(1), FUR, { scale: [18, 16, 16] }), P(ico(1), LIGHT, { scale: [9, 7, 9], pos: [14, -4, 0], ink: 1.2 }), P(ico(0), 0x3a1c14, { scale: [3, 3, 3], pos: [22, -2, 0], ink: false }));
  for (const z of [-8, 8]) head.add(P(cone(5, 12, 4), FUR, { pos: [-2, 16, z], ink: 1.2 }));
  const eyes = decal(head, 22, 10, 128, 58, [15.8, 4, 0]);
  return rig({ root, head, headY: 80, armF, armB, eyes, eyeStyle: { iris: '#3A1C14', lid: '#A8692E', size: 20, gap: 32 },
    anchors: { head: A(24, 82), top: A(10, 104), center: A(4, 46), muzzle: A(26, 56) }, headR: 28,
    extra: (p) => { tail.rotation.z = Math.sin((p.t || 0) / 200) * 0.2; } });
}

// Bubble Crab: a sideways-scuttling pier crab
function crab(flash) {
  const P = maker(flash);
  const root = new THREE.Group();
  const RED = 0xe8503a, DARK = 0xb83a2a;
  for (const z of [-24, -12, 12, 24]) root.add(P(cone(3, 26, 4), DARK, { pos: [0, 12, z], rot: [z > 0 ? -0.5 : 0.5, 0, 0], ink: 1.2 }));
  const head = group(root, 0, 0, 0);
  head.add(P(ico(1), RED, { scale: [30, 18, 36], pos: [0, 36, 0] }));
  for (const z of [-8, 8]) head.add(P(cyl(2, 2, 18, 5), RED, { pos: [16, 58, z], ink: 1 }), P(ico(1), 0xffffff, { scale: [5, 5, 5], pos: [16, 68, z], ink: 1.2 }));
  const claw = (z) => {
    const pv = group(root, 18, 40, z);
    pv.add(P(box(7, 18, 7), RED, { pos: [0, -2, 0] }), P(ico(1), RED, { scale: [12, 9, 8], pos: [10, -12, 0] }), P(cone(4, 12, 4), DARK, { pos: [20, -8, 0], rot: [0, 0, -1.4], ink: 1 }));
    return pv;
  };
  const armB = claw(-30), armF = claw(30);
  const eyes = decal(head, 26, 10, 128, 50, [30.2, 38, 0]);
  return rig({ root, head, headY: 0, armF, armB, eyes, eyeStyle: { iris: '#14111A', sclera: '#FFF6C8', lid: '#E8503A', size: 18, gap: 30 },
    anchors: { head: A(22, 50), top: A(10, 76), center: A(4, 36), muzzle: A(34, 40) }, headR: 30,
    extra: (p) => { root.position.z = Math.sin((p.t || 0) / 180) * 4; } });
}

export const MINION_BUILDERS = {
  'minion-rexlet': rexlet, 'minion-sprout': sprout, 'minion-minnow': minnow, 'minion-squire': squire,
  'minion-frog': frog, 'minion-imp': imp, 'minion-bones': bones, 'minion-squirrel': squirrel, 'minion-crab': crab,
};
