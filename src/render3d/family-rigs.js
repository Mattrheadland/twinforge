// Code-built 3D rigs for Remy Roo (the family dog) and Billy Bass (the talking
// wall fish), modeled from their turnaround sheets. They stand in until the
// imported models arrive (models.js), and stay as the fallback after that.
// Conventions as in roster-rigs.js: ~190 units, feet at y = 0, facing +x,
// camera side is +z, posed by the same values the battle choreography animates.
import * as THREE from 'three';
import { maker, group, decal, faceUpdater, paintEyes } from './roster-rigs.js';

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const ico = (d = 1) => new THREE.IcosahedronGeometry(1, d);
const cyl = (rt, rb, h, s = 7) => new THREE.CylinderGeometry(rt, rb, h, s);
const cone = (r, h, s = 5) => new THREE.ConeGeometry(r, h, s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ======================= Remy Roo =======================
export function buildRoo(flash) {
  const P = maker(flash);
  const root = new THREE.Group();
  const TAN = 0xc9822e, TAN2 = 0xa8691f, WHITE = 0xf2ede4, NOSE = 0x7a3434, COLLAR = 0xe6d9a8, TAG = 0xb0782a, PAD = 0x5a3a2a;

  // back legs (static): haunch, shin, white sock, paw
  for (const z of [-17, 17]) {
    const c = z < 0 ? TAN2 : TAN;
    root.add(P(ico(1), c, { scale: [24, 30, 14], pos: [-50, 84, z] }));
    root.add(P(box(13, 46, 13), c, { pos: [-56, 44, z], rot: [0, 0, -0.18] }));
    root.add(P(box(12, 22, 12), WHITE, { pos: [-52, 14, z] }));
    root.add(P(box(20, 8, 15), WHITE, { pos: [-48, 4, z] }));
  }
  // tail (wags)
  const tail = group(root, -70, 106, 0);
  const tg = cone(6, 52, 5); tg.rotateZ(Math.PI / 2 + 0.2); tg.translate(-22, -10, 0);
  tail.add(P(tg, TAN));
  tail.add(P(cone(4, 12, 5), WHITE, { pos: [-46, -21, 0], rot: [0, 0, Math.PI / 2 + 0.6], ink: 1.6 }));
  // body: tan back, white chest and belly
  root.add(P(ico(1), TAN, { scale: [66, 30, 25], pos: [-4, 94, 0] }));
  root.add(P(ico(1), WHITE, { scale: [44, 16, 20], pos: [10, 76, 4], ink: 2 }));
  root.add(P(ico(1), WHITE, { scale: [24, 30, 21], pos: [46, 96, 3], ink: 2 }));
  // front legs (pivot at the shoulder; armF is the camera-side leg)
  const leg = (z, back) => {
    const pv = group(root, 44, 92, z);
    pv.add(P(box(14, 44, 14), back ? TAN2 : TAN, { pos: [0, -26, 0] }));
    pv.add(P(box(13, 30, 13), WHITE, { pos: [1, -66, 0] }));
    pv.add(P(box(22, 9, 16), WHITE, { pos: [5, -86, 0] }));
    pv.add(P(box(4, 3, 14), PAD, { pos: [16, -88, 0], ink: false }));
    return pv;
  };
  const armB = leg(-15, true), armF = leg(15, false);
  // collar + tag
  root.add(P(new THREE.TorusGeometry(19, 5, 5, 10), COLLAR, { pos: [66, 120, 0], rot: [0, Math.PI / 2, 0.5], ink: 1.6 }));
  root.add(P(box(5, 6, 8), 0xa9b0bc, { pos: [80, 110, 18], shiny: true, ink: 1.2 }));
  root.add(P(cyl(5, 5, 3, 8), TAG, { pos: [82, 100, 18], rot: [Math.PI / 2, 0, 0], shiny: true, ink: 1.2 }));
  // neck + head
  root.add(P(ico(1), TAN, { scale: [20, 24, 18], pos: [62, 120, 0], rot: [0, 0, -0.5] }));
  const head = group(root, 74, 136, 0);
  head.add(P(ico(1), TAN, { scale: [24, 22, 21], pos: [6, 8, 0] }));
  head.add(P(box(4, 20, 9), WHITE, { pos: [24, 12, 0], rot: [0, 0, -0.35], ink: false })); // white blaze
  head.add(P(box(26, 15, 18), WHITE, { pos: [30, -2, 0] })); // muzzle
  head.add(P(ico(1), NOSE, { scale: [6, 5, 7], pos: [44, 3, 0], shiny: true, ink: 1.4 }));
  // floppy ears
  for (const z of [-1, 1]) {
    const ear = group(head, -2, 22, z * 17);
    ear.add(P(box(16, 26, 4), z > 0 ? TAN : TAN2, { pos: [4, -10, 0], rot: [z * 0.25, 0, 0.35] }));
    ear.rotation.x = z * 0.35;
  }
  const jaw = group(head, 18, -10, 0);
  const jg = box(24, 6, 15); jg.translate(12, -3, 0);
  jaw.add(P(jg, WHITE));
  jaw.add(P(box(18, 2, 11), 0xd9707a, { pos: [12, 0.5, 0], ink: false }));
  const eyes = decal(head, 30, 13, 128, 56, [24.6, 12, 0]);
  const updEyes = faceUpdater(eyes, (g, W, H, e, m, t) => paintEyes(g, W, H, e, { iris: '#9A5A12', lid: '#C9822E', brow: '#7A4A14', size: H * 0.3, gap: W * 0.29 }, t));

  const rig = { root, head, headY: 136, armF, armB, anchors: { head: new THREE.Vector3(92, 140, 0), top: new THREE.Vector3(78, 172, 0), center: new THREE.Vector3(6, 92, 0), muzzle: new THREE.Vector3(96, 132, 0) }, headR: 48 };
  rig.apply = (p) => {
    const t = p.t || 0;
    // legs swing a fraction of the arm values (a dog can't throw its arms up)
    armF.rotation.z = clamp(-(p.armF ?? -0.2) * 0.45, -0.7, 1.1);
    armB.rotation.z = clamp(-(p.armB ?? 0.25) * 0.3, -0.5, 0.6);
    head.position.y = rig.headY + (p.headBob || 0);
    const tired = p.pose === 'tired', happy = p.eyes === 'happy' || p.pose === 'victory';
    head.rotation.z = tired ? -0.35 : happy ? 0.15 : 0;
    root.rotation.z = tired ? 0.06 : 0;
    tail.rotation.y = Math.sin(t / (happy ? 70 : 160)) * (happy ? 0.6 : 0.3);
    tail.rotation.z = tired ? -0.6 : 0;
    jaw.rotation.z = { open: -0.55, o: -0.3, grit: -0.05, smile: -0.18, flat: 0 }[p.mouth || 'smile'] ?? -0.18;
    updEyes(p);
  };
  return rig;
}

// ======================= Billy Bass =======================
export function buildBass(flash) {
  const P = maker(flash);
  const root = new THREE.Group();
  const DARK = 0x1f5a28, GREEN = 0x3e8e2e, LIME = 0xb8cc3a, STRIPE = 0x16401c, LIP = 0xe8dcae, FIN = 0xe8b33a, MOUTH = 0xd47f8a;
  // he swims in the air, so everything hangs off a body that bobs
  const body = group(root, 0, 0, 0);
  // tail fin (wags)
  const tail = group(body, -70, 102, 0);
  const tf = new THREE.Shape();
  tf.moveTo(0, 0); tf.lineTo(-50, 40); tf.lineTo(-38, 0); tf.lineTo(-50, -40); tf.closePath();
  const tfg = new THREE.ExtrudeGeometry(tf, { depth: 6, bevelEnabled: false }); tfg.translate(4, 0, -3);
  tail.add(P(tfg, FIN, { ink: 2 }));
  tail.add(P(ico(1), DARK, { scale: [16, 18, 13], pos: [-2, 0, 0] }));
  // body: dark back, lime belly, stripe along the side, dotted lateral line
  body.add(P(ico(1), GREEN, { scale: [70, 46, 28], pos: [0, 104, 0] }));
  body.add(P(ico(1), DARK, { scale: [58, 26, 24], pos: [-6, 124, 0], ink: 2 }));
  body.add(P(ico(1), LIME, { scale: [56, 22, 24], pos: [10, 82, 2], ink: 2 }));
  for (const z of [-1, 1]) {
    body.add(P(box(70, 6, 2), STRIPE, { pos: [-6, 104, z * 26.5], rot: [0, 0, 0.05], ink: false }));
    for (let i = 0; i < 3; i++) body.add(P(cyl(2.5, 2.5, 2, 6), 0x0d1a10, { pos: [-30 + i * 16, 118 - i, z * 25], rot: [Math.PI / 2, 0, 0], ink: false }));
  }
  // dorsal and belly fins
  for (let i = 0; i < 4; i++) body.add(P(cone(7, 26, 4), FIN, { pos: [-24 + i * 12, 150 - i * 2, 0], rot: [0, 0, 0.25 - i * 0.05], scale: [1, 1, 0.3], ink: 1.6 }));
  for (const [x, y] of [[-20, 62], [20, 64]]) body.add(P(cone(8, 24, 4), FIN, { pos: [x, y, 0], rot: [0, 0, Math.PI + 0.3], scale: [1, 1, 0.35], ink: 1.6 }));
  // pectoral fins = arms (camera-side one is armF)
  const fin = (z) => {
    const pv = group(body, 34, 92, z);
    const fg = cone(9, 30, 4); fg.translate(0, -15, 0);
    pv.add(P(fg, FIN, { scale: [1, 1, 0.35], ink: 1.6 }));
    return pv;
  };
  const armB = fin(-24), armF = fin(24);
  // head: big lips, wide-open mouth (jaw drops)
  const head = group(body, 50, 106, 0);
  head.add(P(ico(1), GREEN, { scale: [24, 32, 26], pos: [0, 0, 0] }));
  head.add(P(box(10, 12, 30), 0x2a1416, { pos: [22, -6, 0], ink: false })); // mouth cave
  head.add(P(new THREE.TorusGeometry(13, 4.5, 5, 10, Math.PI), LIP, { pos: [24, -4, 0], rot: [0, Math.PI / 2, 0], ink: 1.6 })); // upper lip
  const jaw = group(head, 12, -10, 0);
  const jg = box(20, 8, 26); jg.translate(10, -4, 0);
  jaw.add(P(jg, LIME));
  jaw.add(P(box(16, 3, 20), MOUTH, { pos: [10, 0.5, 0], ink: false }));
  jaw.add(P(new THREE.TorusGeometry(12, 4.5, 5, 10, Math.PI), LIP, { pos: [16, -2, 0], rot: [Math.PI, Math.PI / 2, 0], ink: 1.6 })); // lower lip
  // one big round eye on each side of the head (one canvas, each decal shows half)
  const eyes = decal(head, 24, 24, 128, 64, [6, 14, 24.5], 0);
  eyes.tex.repeat.set(0.5, 1);
  const far = decal(head, 24, 24, 8, 8, [6, 14, -24.5], Math.PI);
  far.tex.dispose();
  const farTex = new THREE.CanvasTexture(eyes.c);
  farTex.magFilter = eyes.tex.magFilter; farTex.minFilter = eyes.tex.minFilter; farTex.generateMipmaps = false;
  farTex.offset.set(0.5, 0);
  far.tex = farTex;
  head.children[head.children.length - 1].material.map = farTex;
  const paintBoth = faceUpdater(eyes, (g, W, H, e, m, t) => paintEyes(g, W, H, e, { iris: '#2B1A0E', lid: '#3E8E2E', size: H * 0.36, gap: W * 0.25 }, t));
  const updEyes = (p) => { if (paintBoth(p)) farTex.needsUpdate = true; };

  const rig = { root, head, armF, armB, anchors: { head: new THREE.Vector3(66, 110, 0), top: new THREE.Vector3(30, 160, 0), center: new THREE.Vector3(6, 100, 0), muzzle: new THREE.Vector3(92, 104, 0) }, headR: 50 };
  rig.apply = (p) => {
    const t = p.t || 0;
    // pectoral fins paddle; big arm swings become flaps
    armF.rotation.z = clamp(-(p.armF ?? -0.2) * 0.5, -1, 1.2) + Math.sin(t / 140) * 0.15;
    armB.rotation.z = clamp(-(p.armB ?? 0.25) * 0.5, -1, 1.2) - Math.sin(t / 140) * 0.15;
    const tired = p.pose === 'tired', happy = p.pose === 'victory';
    body.position.y = tired ? -28 : Math.sin(t / 320) * 5 + (p.headBob || 0);
    body.rotation.z = tired ? -0.35 : happy ? Math.sin(t / 110) * 0.18 : 0;
    // the classic move: head turns out toward you when he sings
    const singing = p.mouth === 'open' || happy;
    head.rotation.y = singing ? 0.45 : 0;
    tail.rotation.y = Math.sin(t / (singing ? 90 : 200)) * (singing ? 0.55 : 0.3);
    jaw.rotation.z = { open: -0.7, o: -0.45, grit: -0.1, smile: -0.25, flat: -0.05 }[p.mouth || 'smile'] ?? -0.25;
    updEyes(p);
  };
  return rig;
}
