// Code-built low-poly rigs for the four new original toys (handoff 2026-10-14):
// Capt'n Crookhook, Jack-Knife, Big Bad Wolfgang and Galactic Hunter (was Commander Payne).
// Conventions as in roster-rigs.js: ~190 units tall, feet at y = 0, facing +x,
// camera side is +z, posed by the same values the battle choreography animates
// (armF/armB, headBob, eyes, mouth, pose, t). They stand in until Astra's
// sheets come back and the Hunyuan models are imported (models.js).
import * as THREE from 'three';
import { glowMat } from './toon.js';
import { maker, group, faceCanvas, faceUpdater, paintEyes, paintMouth } from './roster-rigs.js';

const INK = '#14111A';
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const ico = (d = 1) => new THREE.IcosahedronGeometry(1, d);
const cyl = (rt, rb, h, s = 7) => new THREE.CylinderGeometry(rt, rb, h, s);
const cone = (r, h, s = 5) => new THREE.ConeGeometry(r, h, s);

// A painted face that hugs a round head: a patch of a sphere instead of a flat
// plane, so it never floats off the surface when the toy turns.
function sphereDecal(parent, r, arcW, arcH, cw, ch, pos, scale = [1, 1, 1]) {
  const fc = faceCanvas(cw, ch);
  const geo = new THREE.SphereGeometry(r, 14, 10, Math.PI - arcW / 2, arcW, Math.PI / 2 - arcH / 2, arcH);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    map: fc.tex, transparent: true, alphaTest: 0.4, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
  }));
  m.position.set(...pos);
  m.scale.set(...scale);
  m.renderOrder = 2;
  parent.add(m);
  return fc;
}

function baseApply(rig, p) {
  if (rig.armF) rig.armF.rotation.z = -(p.armF ?? -0.2) + (rig.armFRest || 0);
  if (rig.armB) rig.armB.rotation.z = -(p.armB ?? 0.25) + (rig.armBRest || 0);
  if (rig.head) rig.head.position.y = rig.headY + (p.headBob || 0);
  const tired = p.pose === 'tired';
  rig.root.rotation.z = tired ? 0.12 : 0;
  if (rig.head) rig.head.rotation.z = tired ? -0.18 : 0;
}

// eight-point star badge, extruded, facing +x
function starBadge(outer, inner, depth, points = 8) {
  const s = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer, a = Math.PI / 2 + (i * Math.PI) / points;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
  g.translate(0, 0, -depth / 2);
  g.rotateY(Math.PI / 2);
  return g;
}

// ======================= Capt'n Crookhook =======================
export function buildCrookhook(flash) {
  const P = maker(flash);
  const root = new THREE.Group();
  const TEAL = 0x1f8a8a, TEAL2 = 0x176b6b, GOLD = 0xffc914, RED = 0xd7263d, CREAM = 0xf0e2c0, SKIN = 0xe0a878;
  const SILVER = 0xc4cad8, HAT = 0x22202a, BOOT = 0x2a2430, PANTS = 0x5a3a24, STEEL = 0x7d8798;

  // boots + legs
  for (const z of [-14, 14]) {
    root.add(P(box(22, 30, 20), BOOT, { pos: [0, 15, z] }));
    root.add(P(box(16, 9, 18), BOOT, { pos: [14, 4.5, z] }));
    root.add(P(box(26, 9, 24), BOOT, { pos: [0, 33, z], ink: 2 }));
    root.add(P(box(4, 6, 8), GOLD, { pos: [11.5, 22, z], shiny: true, ink: 1.2 }));
    root.add(P(cyl(8, 8, 26, 6), PANTS, { pos: [0, 48, z] }));
  }
  // long coat skirt (open at the front over the pants), gold hem
  const skirt = P(cyl(30, 40, 50, 8), TEAL, { pos: [-2, 76, 0], scale: [1, 1, 0.8] });
  root.add(skirt);
  root.add(P(cyl(40.6, 40.6, 4, 8), GOLD, { pos: [-2, 52.5, 0], scale: [1, 1, 0.8], ink: 1.2 }));
  // the coat opens at the front over his pants
  root.add(P(box(8, 46, 15), PANTS, { pos: [32, 76, 0], rot: [0, 0, 0.17], ink: 1.6 }));
  // red sash with gold buckle
  root.add(P(cyl(31, 31, 11, 8), RED, { pos: [0, 100, 0], scale: [1, 1, 0.82] }));
  root.add(P(box(5, 11, 12), GOLD, { pos: [31, 100, 0], shiny: true, ink: 1.4 }));
  // chest: broad coat, open shirt front, two rows of brass buttons
  root.add(P(cyl(36, 29, 46, 8), TEAL, { pos: [0, 128, 0], scale: [1, 1, 0.84] }));
  root.add(P(box(6, 40, 18), CREAM, { pos: [31, 126, 0], rot: [0, 0, -0.12], ink: 1.4 }));
  for (const z of [-13, 13]) for (let i = 0; i < 4; i++) root.add(P(ico(0), GOLD, { scale: [2.6, 2.6, 2.6], pos: [30 - i * 0.6, 112 + i * 9, z], shiny: true, ink: 1 }));
  // lapels in gold trim
  for (const z of [-11, 11]) root.add(P(box(3, 40, 4), GOLD, { pos: [32, 128, z], rot: [z * 0.012, 0, -0.1], ink: false }));
  root.add(P(cyl(14, 16, 8, 7), TEAL2, { pos: [0, 152, 0] })); // collar

  // head
  const head = group(root, 4, 172, 0);
  const skull = P(ico(1), SKIN, { scale: [21, 23, 21] });
  head.add(skull);
  head.add(P(ico(1), SKIN, { scale: [7, 6.5, 8], pos: [22, -3, 0], ink: 1.6 })); // big round nose
  for (const z of [-21, 21]) head.add(P(ico(0), SKIN, { scale: [4, 6, 3], pos: [-2, -1, z], ink: 1.2 }));
  // silver hair tufts behind the ears
  for (const z of [-17, 17]) head.add(P(ico(0), SILVER, { scale: [10, 10, 7], pos: [-10, -2, z], ink: 1.6 }));
  // beard (poster): big, full and snow white, from the cheeks down over the chest, plus a bushy mustache
  const WHITE = 0xeef0f5;
  head.add(P(ico(1), WHITE, { scale: [19, 19, 24], pos: [12, -19, 0], ink: 2 }));
  const beard = group(head, 14, -30, 0);
  beard.add(P(ico(1), WHITE, { scale: [15, 17, 20], pos: [2, -6, 0], ink: 1.8 }));
  beard.add(P(cone(13, 26, 6), WHITE, { pos: [5, -26, 0], rot: [Math.PI, 0, 0.12], ink: 1.6 }));
  for (const z of [-1, 1]) head.add(P(ico(1), WHITE, { scale: [6, 5.5, 14], pos: [23, -8, z * 9], rot: [z * 0.45, 0, 0.1], ink: 1.4 }));
  const braids = [beard];
  // face: eyes + one patch, mouth under the beard line
  const face = sphereDecal(head, 21.6, 1.5, 1.3, 180, 160, [0, 2, 0]);
  const updFace = faceUpdater(face, (g, W, H, e, m, t) => {
    g.clearRect(0, 0, W, H);
    g.save(); g.translate(0, H * 0.06); g.scale(1, 0.62); paintEyes(g, W, H, e, { iris: '#2F8FD0', lid: '#E0A878', brow: '#C4CAD8', size: H * 0.31, gap: W * 0.17 }, t); g.restore();
    // eyepatch over the camera-side eye (canvas left = +z), big enough to hide the whole eye; strap runs across the brow
    g.strokeStyle = INK; g.lineWidth = H * 0.05; g.lineCap = 'round';
    g.beginPath(); g.moveTo(W * 0.0, H * 0.3); g.lineTo(W * 0.3, H * 0.36); g.lineTo(W * 1.0, H * 0.14); g.stroke();
    g.fillStyle = INK; g.beginPath(); g.ellipse(W * 0.33, H * 0.41, W * 0.15, H * 0.17, -0.15, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#4a4258'; g.beginPath(); g.ellipse(W * 0.29, H * 0.35, W * 0.045, H * 0.04, 0, 0, Math.PI * 2); g.fill();
    // thick scowling brows, angled down toward the nose
    g.strokeStyle = '#EEF0F5'; g.lineWidth = H * 0.085;
    g.beginPath(); g.moveTo(W * 0.16, H * 0.17); g.lineTo(W * 0.46, H * 0.24); g.stroke();
    g.beginPath(); g.moveTo(W * 0.54, H * 0.25); g.lineTo(W * 0.86, H * 0.15); g.stroke();
    g.save(); g.translate(0, H * 0.58); g.scale(1, 0.42); paintMouth(g, W, H, m, { inside: '#7A1E2A' }); g.restore();
  });

  // hat: black tricorn (a triangular prism brim pointing forward), gold edge, crown, plume, anchor badge
  const hat = group(head, -3, 23, 0);
  hat.scale.setScalar(1.3); // poster: a big, proud captain's hat
  const brim = cyl(38, 38, 5, 3); brim.rotateY(Math.PI / 2);
  hat.add(P(brim, HAT, { pos: [0, 0, 0], scale: [1, 1, 1] }));
  const brimTrim = cyl(39.5, 39.5, 2, 3); brimTrim.rotateY(Math.PI / 2);
  hat.add(P(brimTrim, GOLD, { pos: [0, -2.6, 0], ink: false }));
  // brim corners curl up
  for (const a of [Math.PI / 2, Math.PI / 2 + (2 * Math.PI) / 3, Math.PI / 2 - (2 * Math.PI) / 3]) {
    const x = Math.sin(a) * 31, z = Math.cos(a) * 31;
    hat.add(P(cone(8, 18, 4), HAT, { pos: [x, 7, z], rot: [z * -0.022, 0, -x * 0.022], ink: 1.6 }));
  }
  hat.add(P(cyl(17, 21, 20, 7), HAT, { pos: [-2, 11, 0] }));
  hat.add(P(cyl(17.6, 17.6, 3, 7), GOLD, { pos: [-2, 20, 0], ink: false }));
  // gold anchor badge
  const anchor = group(hat, 20, 10, 0);
  anchor.add(P(box(2, 10, 2.4), GOLD, { shiny: true, ink: 0.8 }));
  anchor.add(P(box(2, 2.4, 8), GOLD, { pos: [0, 3, 0], shiny: true, ink: 0.8 }));
  const ac = new THREE.TorusGeometry(4, 1.1, 3, 8, Math.PI); ac.rotateY(Math.PI / 2); ac.rotateX(Math.PI);
  anchor.add(P(ac, GOLD, { pos: [0, -3.5, 0], shiny: true, ink: 0.8 }));
  // teal plume sweeping off the back
  const plume = group(hat, -16, 16, 0);
  plume.add(P(ico(1), TEAL, { scale: [24, 7, 9], pos: [-6, 12, 4], rot: [0.2, 0, -0.85], ink: 1.6 }));
  plume.add(P(ico(1), 0x2fb5b5, { scale: [17, 5.5, 7], pos: [-20, 30, 6], rot: [0.2, 0, -1.15], ink: 1.4 }));
  plume.add(P(ico(1), 0x5fd6d0, { scale: [9, 3.5, 5], pos: [-28, 44, 7], rot: [0.2, 0, -1.4], ink: 1.2 }));

  // arms: coat sleeve, wide gold cuff; camera-side arm ends in the iron hook, the back hand holds the cutlass
  const arm = (z, back) => {
    const pv = group(root, 0, 144, z);
    pv.add(P(ico(1), TEAL, { scale: [12, 12, 11], pos: [0, -2, 0] }));
    pv.add(P(cyl(9, 8.5, 34, 6), back ? TEAL2 : TEAL, { pos: [0, -22, 0] }));
    pv.add(P(cyl(12, 11, 12, 6), GOLD, { pos: [0, -40, 0], ink: 1.6 }));
    // gold epaulet with a fringe
    pv.add(P(cyl(13, 14, 5, 8), GOLD, { pos: [2, 9, 0], shiny: true, ink: 1.2 }));
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; pv.add(P(cyl(1.4, 1.4, 8, 4), GOLD, { pos: [2 + Math.sin(a) * 13, 3, Math.cos(a) * 13], ink: 0.6 })); }
    return pv;
  };
  const armB = arm(-38, true), armF = arm(38, false);
  // the hook: big, bright and silver (poster)
  armF.add(P(cyl(8, 6.5, 10, 8), STEEL, { pos: [0, -51, 0], shiny: true, ink: 1.4 }));
  const hk = new THREE.TorusGeometry(13, 3, 5, 12, Math.PI * 1.35); hk.rotateZ(Math.PI * 0.9);
  armF.add(P(hk, SILVER, { pos: [7, -68, 0], shiny: true, ink: 1.4 }));
  armF.add(P(cone(3, 8, 4), SILVER, { pos: [18.5, -59, 0], rot: [0, 0, -0.4], shiny: true, ink: 1 }));
  // cutlass in the back hand
  armB.add(P(ico(1), SKIN, { scale: [7, 7, 7], pos: [0, -50, 0], ink: 1.4 }));
  const cut = group(armB, 0, -50, 0);
  cut.add(P(box(3, 30, 10), 0xdde6f2, { pos: [0, 21, 0], shiny: true, ink: 1.2 }));
  cut.add(P(box(3, 22, 10), 0xdde6f2, { pos: [-3, 45, 0], rot: [0, 0, 0.22], shiny: true, ink: 1.2 }));
  cut.add(P(cone(5, 12, 3), 0xdde6f2, { pos: [-6.5, 60, 0], rot: [0, 0, 0.4], scale: [0.5, 1, 1], shiny: true, ink: 1 }));
  cut.add(P(box(5, 4, 22), GOLD, { pos: [0, 5, 0], shiny: true, ink: 1.2 }));
  cut.add(P(box(4, 10, 4), 0x5a3a24, { pos: [0, -2, 0], ink: 1 }));
  cut.rotation.z = -1.15;

  const rig = { root, head, faceParts: [skull, hat], headY: 172, armF, armB, anchors: { head: new THREE.Vector3(10, 172, 0), top: new THREE.Vector3(2, 232, 0), center: new THREE.Vector3(0, 106, 0), muzzle: new THREE.Vector3(20, 168, 0) }, headR: 48 };
  rig.apply = (p) => {
    baseApply(rig, p);
    updFace(p);
    const t = p.t || 0;
    braids.forEach((b, i) => { b.rotation.z = Math.sin(t / 420 + i) * 0.06 + (p.fly ? -0.25 : 0); });
    plume.rotation.z = 0.5 + Math.sin(t / 360) * 0.08;
    skirt.rotation.z = p.fly ? 0.12 : 0;
  };
  return rig;
}

// ======================= Jack-Knife =======================
function paintPumpkinFace(g, W, H, eyes, mouth, t) {
  g.clearRect(0, 0, W, H);
  const glow = '#FFB21A', core = '#FFF6C8'; // poster: warm candle-orange glow
  g.lineJoin = 'round'; g.lineCap = 'round';
  const fillGlow = (path) => {
    g.save();
    g.shadowColor = glow; g.shadowBlur = H * 0.08;
    g.fillStyle = glow; path(); g.fill();
    g.shadowBlur = 0;
    g.strokeStyle = '#3A1A08'; g.lineWidth = H * 0.035; path(); g.stroke();
    g.restore();
  };
  const ey = H * 0.3, er = H * 0.13;
  for (const side of [-1, 1]) {
    const x = W / 2 + side * W * 0.2, inner = -side;
    if (eyes === 'open' || eyes === 'angry') {
      const ang = eyes === 'angry';
      fillGlow(() => {
        g.beginPath();
        g.moveTo(x - er, ey + er * 0.8);
        g.lineTo(x + er, ey + er * 0.8);
        if (ang) { g.lineTo(x + inner * er, ey - er * 0.05); g.lineTo(x - inner * er, ey - er * 0.95); }
        else g.lineTo(x, ey - er * 1.05);
        g.closePath();
      });
      g.fillStyle = core; g.beginPath(); g.arc(x - (ang ? inner * er * 0.2 : 0), ey + er * 0.35, er * 0.22, 0, Math.PI * 2); g.fill();
    } else if (eyes === 'happy') {
      fillGlow(() => { g.beginPath(); g.moveTo(x - er, ey + er * 0.4); g.quadraticCurveTo(x, ey - er * 1.3, x + er, ey + er * 0.4); g.quadraticCurveTo(x, ey - er * 0.3, x - er, ey + er * 0.4); g.closePath(); });
    } else if (eyes === 'squint') {
      fillGlow(() => { g.beginPath(); g.moveTo(x - inner * er, ey - er * 0.8); g.lineTo(x + inner * er * 0.9, ey); g.lineTo(x - inner * er, ey + er * 0.8); g.lineTo(x - inner * er * 0.6, ey); g.closePath(); });
    } else if (eyes === 'closed') {
      fillGlow(() => { g.beginPath(); g.moveTo(x - er, ey); g.quadraticCurveTo(x, ey + er * 0.9, x + er, ey); g.quadraticCurveTo(x, ey + er * 0.4, x - er, ey); g.closePath(); });
    } else if (eyes === 'swirl') {
      g.save(); g.shadowColor = glow; g.shadowBlur = H * 0.06; g.strokeStyle = glow; g.lineWidth = H * 0.03;
      g.beginPath();
      for (let a = 0; a < 13; a += 0.35) { const rr = a * er * 0.075, px = x + Math.cos(a + t / 110) * rr, py = ey + Math.sin(a + t / 110) * rr; a ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.stroke(); g.restore();
    }
  }
  // nose: little triangle
  fillGlow(() => { g.beginPath(); g.moveTo(W / 2 - W * 0.04, H * 0.5); g.lineTo(W / 2 + W * 0.04, H * 0.5); g.lineTo(W / 2, H * 0.42); g.closePath(); });
  // mouth: carved zig-zag grin in different shapes
  const mx0 = W * 0.2, mx1 = W * 0.8, my = H * 0.66;
  if (mouth === 'o') {
    fillGlow(() => { g.beginPath(); g.ellipse(W / 2, my + H * 0.04, W * 0.07, H * 0.1, 0, 0, Math.PI * 2); });
  } else if (mouth === 'flat') {
    fillGlow(() => { g.beginPath(); g.moveTo(W * 0.32, my); g.lineTo(W * 0.68, my); g.lineTo(W * 0.68, my + H * 0.05); g.lineTo(W * 0.32, my + H * 0.05); g.closePath(); });
  } else {
    const open = mouth === 'open' ? 0.2 : mouth === 'grit' ? 0.12 : 0.1;
    const lift = mouth === 'smile' ? H * 0.08 : 0;
    fillGlow(() => {
      g.beginPath();
      g.moveTo(mx0, my - lift);
      // top edge with teeth notches
      const n = 6;
      for (let i = 1; i <= n; i++) {
        const x = mx0 + ((mx1 - mx0) * i) / n;
        const curve = Math.sin((Math.PI * i) / n) * lift;
        g.lineTo(x - (mx1 - mx0) / n / 2, my - lift + curve + (i % 2 ? H * 0.06 : 0));
        g.lineTo(x, my - lift + Math.sin((Math.PI * i) / n) * lift * 0 + (i === n ? 0 : curve * 0.2));
      }
      g.quadraticCurveTo(W / 2, my + H * open + lift * 2.2, mx0, my - lift);
      g.closePath();
    });
    if (mouth === 'grit') {
      g.strokeStyle = '#3A1A08'; g.lineWidth = H * 0.03;
      g.beginPath(); g.moveTo(mx0 + W * 0.06, my + H * 0.06); g.lineTo(mx1 - W * 0.06, my + H * 0.06); g.stroke();
    }
  }
}

// v6 rebuild (directive: "never a square human body with skeleton textures"): a tall,
// lanky skeleton you can see through. Bones are thin and separated (open ribcage, bare
// spine between ribs and pelvis, twin forearm bones, long fingers), the pumpkin is
// oversized, and the cape is ragged strips behind him rather than a solid drape, so the
// silhouette is a big round head on a stick-thin frame. Built ~240 tall, scaled 0.9.
// Moves: loose dangling arms and bobbing head at idle, a real high kick on Rattle Kick
// (lunge), a bone rattle when hit, and Fold Up (guard): knees buckle, the body drops,
// arms wrap in and the pumpkin sinks into the collar.
export function buildJackKnife(flash) {
  const P = maker(flash);
  const root = new THREE.Group();
  const S = 0.9;
  const sk = group(root);
  sk.scale.setScalar(S);
  const BONE = 0xede6d2, BONE2 = 0xd2c8ae, PUMP = 0xe8762b, PUMP2 = 0xd0601e, STEM = 0x2e7a3a, BURLAP = 0xc9a15a, PURPLE = 0x6a3fa0, VINE = 0x2e9e44, BOOT = 0x24202c;
  const HIP = 100, THIGH = 44, SHIN = 42;

  // legs: hip pivot > thigh > knee pivot > shin > striped sock > buckled boot.
  // The knee pivot lets him buckle (Fold Up) and kick (Rattle Kick) with bones, not a slab.
  const legs = [];
  for (const z of [-11, 11]) {
    const back = z < 0, c = back ? BONE2 : BONE;
    const hip = group(sk, 0, HIP, z);
    hip.add(P(ico(0), c, { scale: [5.5, 5.5, 5.5], ink: 1.2 })); // ball joint
    hip.add(P(cyl(3.6, 3.1, THIGH - 6, 6), c, { pos: [0, -THIGH / 2, 0] }));
    const knee = group(hip, 0, -THIGH, 0);
    knee.add(P(ico(0), c, { scale: [6.5, 6, 6.5], ink: 1.4 })); // knobby knee
    knee.add(P(cyl(3.1, 2.7, SHIN - 14, 6), c, { pos: [0, -14, 0] }));
    for (let i = 0; i < 3; i++) knee.add(P(cyl(4.1, 4.1, 4, 6), i % 2 ? PURPLE : VINE, { pos: [0, -30 - i * 4, 0], ink: i !== 1 ? 1 : false }));
    const boot = group(knee, 0, -SHIN, 0);
    boot.add(P(box(13, 10, 11), BOOT, { pos: [-1, 3, 0] }));
    boot.add(P(box(16, 6, 10), BOOT, { pos: [6, -1, 0] }));
    boot.add(P(cone(5, 10, 4), BOOT, { pos: [16, 0, 0], rot: [0, 0, -Math.PI / 2 - 0.35], scale: [1, 1, 0.9], ink: 1.2 })); // curled toe
    boot.add(P(box(2, 4, 6), 0xffc914, { pos: [5, 5, 0], shiny: true, ink: 0.8 }));
    legs.push({ hip, knee, boot, back });
  }

  // everything above the hips hangs off `body`, so Fold Up can drop it as one piece
  const body = group(sk, 0, HIP, 0);
  // pelvis: two flared hip blades and a sacrum, small and open
  for (const z of [-7, 7]) body.add(P(ico(0), BONE, { scale: [7, 6, 5], pos: [0, 2, z], rot: [z > 0 ? 0.5 : -0.5, 0, 0], ink: 1.2 }));
  body.add(P(box(6, 9, 6), BONE2, { pos: [-2, 1, 0], ink: 1 }));
  // vine belt cinched round the pelvis, with leaves
  const vb = new THREE.TorusGeometry(10.5, 1.8, 4, 12); vb.rotateX(Math.PI / 2);
  body.add(P(vb, VINE, { pos: [0, 5, 0], scale: [0.9, 1, 1], ink: 1 }));
  for (const [x, z, r] of [[10, 4, 0.4], [7, -8, -0.5]]) body.add(P(cone(3.5, 9, 4), 0x46c25a, { pos: [x, 2, z], rot: [Math.PI / 2 + r, 0, -0.3], scale: [1, 1, 0.4], ink: 1 }));
  // bare lumbar spine: the gap between pelvis and ribs is what makes him read as a skeleton
  for (let i = 0; i < 5; i++) body.add(P(box(5, 3.4, 5), i % 2 ? BONE2 : BONE, { pos: [-3, 11 + i * 4.6, 0], ink: 0.9 }));
  // open ribcage: separate curved ribs round a sternum, light shows between them
  const RIB = [[12.5, 52], [13.5, 46], [13.5, 40], [12.5, 34], [10.5, 28]];
  RIB.forEach(([r, y], i) => {
    const rib = new THREE.TorusGeometry(r, 1.5, 4, 14, Math.PI * 2 - 0.7);
    rib.rotateX(Math.PI / 2); rib.rotateY(0.35); // the gap faces front, the sternum fills it
    body.add(P(rib, i % 2 ? BONE2 : BONE, { pos: [-1, y, 0], scale: [0.72, 1, 1], ink: 1 }));
  });
  body.add(P(box(3, 26, 4), BONE, { pos: [8.5, 41, 0], ink: 1 })); // sternum
  for (let i = 0; i < 6; i++) body.add(P(box(4.5, 3, 4.5), BONE2, { pos: [-9, 28 + i * 5, 0], ink: false })); // thoracic spine behind the ribs
  // poster vest, kept as a short open bolero: two thin front panels and a back panel,
  // so it reads as clothing without boxing in the ribs
  const VTRIM = 0x8a6a34;
  for (const s of [-1, 1]) {
    body.add(P(box(3, 24, 7), BURLAP, { pos: [6, 45, s * 12], rot: [s * 0.12, 0, -0.05] }));
    body.add(P(box(3.4, 24, 1.6), VTRIM, { pos: [7.5, 45, s * 8.6], ink: 0.8 }));
  }
  body.add(P(box(3, 26, 22), BURLAP, { pos: [-12, 45, 0] }));
  for (let i = 0; i < 3; i++) body.add(P(ico(0), 0xffc914, { scale: [1.8, 1.8, 1.8], pos: [8.5, 38 + i * 7, 9.5], shiny: true, ink: 0.7 }));
  // collarbones out to knobby shoulders
  for (const s of [-1, 1]) body.add(P(cyl(1.9, 1.9, 20, 5), BONE, { pos: [1, 57, s * 11], rot: [Math.PI / 2, 0, 0], ink: 0.9 }));
  // neck: three vertebrae
  for (let i = 0; i < 3; i++) body.add(P(cyl(2.8, 3.2, 3.5, 6), BONE, { pos: [1, 60 + i * 4.6, 0], ink: 0.9 }));

  // cape: a tall flared vampire collar framing the pumpkin, then ragged strips that hang
  // apart and sway on their own clocks
  const CAPE2 = 0x4a2a78, BACK = Math.PI * 1.5;
  const cape = group(body, -6, 58, 0);
  const collar = new THREE.CylinderGeometry(30, 13, 30, 10, 1, true, BACK - 1.35, 2.7); collar.translate(0, 15, 0);
  cape.add(P(collar, PURPLE, { scale: [0.75, 1, 1] }));
  const collarIn = new THREE.CylinderGeometry(29, 12.5, 29, 10, 1, true, BACK - 1.3, 2.6); collarIn.translate(0, 15, 0);
  cape.add(new THREE.Mesh(collarIn, new THREE.MeshBasicMaterial({ color: CAPE2, side: THREE.BackSide })));
  const strips = [];
  const STRIP = [[-17, 58, -0.22], [-8, 74, -0.08], [0, 64, 0.02], [8, 78, 0.1], [17, 56, 0.24]];
  for (const [z, len, fan] of STRIP) {
    const st = group(cape, -3, 0, z);
    const sg = box(2, len, 9); sg.translate(0, -len / 2, 0);
    st.add(P(sg, z % 2 ? CAPE2 : PURPLE, { ink: 1 }));
    st.add(P(cone(3.6, 9, 3), PURPLE, { pos: [0, -len - 3, 0], rot: [Math.PI, 0, 0], scale: [0.6, 1, 1], ink: 0.9 })); // torn tip
    st.rotation.x = fan;
    st.rotation.z = -0.12;
    strips.push(st);
  }
  for (const z of [-15, 15]) body.add(P(ico(1), PURPLE, { scale: [6, 4, 6], pos: [-2, 57, z], ink: 1.2 })); // shoulder pads where the cape pins on
  body.add(P(ico(0), 0xffc914, { scale: [4, 3.6, 4], pos: [8, 59, 0], shiny: true, ink: 1 })); // clasp

  // head: an oversized ridged pumpkin from overlapping lobes, curly stem, a leaf and the
  // glowing carved face
  const HEADY = 94; // in body space (old rig: 178 in root space)
  const head = group(body, 4, HEADY, 0);
  for (let k = 0; k < 6; k++) head.add(P(ico(1), k % 2 ? PUMP2 : PUMP, { scale: [33, 28, 15], rot: [0, (k * Math.PI) / 6, 0], ink: 2.4 }));
  head.add(P(ico(1), PUMP, { scale: [31, 27, 31], ink: false }));
  const stem = cyl(3.6, 5.4, 17, 5); stem.translate(0, 8.5, 0);
  head.add(P(stem, STEM, { pos: [-2, 23, 0], rot: [0, 0, 0.35], ink: 1.4 }));
  head.add(P(cone(6, 17, 4), 0x46c25a, { pos: [-12, 31, 5], rot: [0.4, 0, 1.2], scale: [1, 1, 0.3], ink: 1 }));
  const curl = new THREE.TorusGeometry(5, 1.2, 3, 8, Math.PI * 1.5);
  head.add(P(curl, STEM, { pos: [-7, 38, 0], ink: 0.8 }));
  const face = sphereDecal(head, 33.8, 1.75, 1.7, 220, 200, [0, -1, 0], [1, 0.86, 1]);
  const updFace = faceUpdater(face, paintPumpkinFace);

  // arms: long and loose. Shoulder knob, humerus, elbow knob, the two forearm bones side
  // by side, a bony hand and four long fingers that reach his knees
  const arm = (z, back) => {
    const pv = group(body, 0, 56, z);
    const c = back ? BONE2 : BONE;
    pv.add(P(ico(0), c, { scale: [5.5, 5.5, 5.5], ink: 1.2 }));
    pv.add(P(cyl(2.8, 2.5, 30, 6), c, { pos: [0, -18, 0] }));
    const elbow = group(pv, 0, -35, 0);
    elbow.add(P(ico(0), c, { scale: [4.6, 4.6, 4.6], ink: 1.2 }));
    for (const dz of [-1.8, 1.8]) elbow.add(P(cyl(1.4, 1.3, 30, 5), c, { pos: [0, -17, dz], ink: 0.8 }));
    elbow.add(P(box(6, 5, 6), c, { pos: [1, -35, 0], ink: 1 }));
    for (const [dz, len] of [[-2.6, 13], [-0.9, 15], [0.9, 15], [2.6, 12]]) elbow.add(P(box(1.6, len, 1.6), c, { pos: [2.5, -38 - len / 2, dz], rot: [dz * 0.05, 0, -0.2], ink: 0.7 }));
    pv.userData.elbow = elbow;
    return pv;
  };
  const armB = arm(-23, true), armF = arm(23, false);

  const v = (x, y, z) => new THREE.Vector3(x, y, z).multiplyScalar(S);
  const rig = {
    root, head, headY: HEADY, armF, armB, armFRest: 0.1, armBRest: -0.08,
    anchors: { head: v(10, HIP + HEADY, 0), top: v(4, HIP + HEADY + 44, 0), center: v(0, 116, 0), muzzle: v(36, HIP + HEADY - 6, 0) },
    headR: 52 * S,
  };
  rig.apply = (p) => {
    baseApply(rig, p);
    updFace(p);
    const t = p.t || 0;
    const fold = Math.max(0, Math.min(1, p.shield || 0));
    const hurt = p.hurt ? Math.sin(t / 22) * 0.12 * Math.min(1, p.hurt) : 0; // bones rattle
    // legs: Fold Up buckles both knees (thigh forward, shin back keeps the feet planted);
    // Rattle Kick swings the camera-side leg up straight
    const a = fold * 1.15;
    const kick = Math.max(0, Math.min(1, ((p.lunge || 0) - 15) / 60));
    for (const L of legs) {
      const k = !L.back ? kick : 0;
      L.hip.rotation.z = a + k * 1.25;
      L.knee.rotation.z = -2 * a + k * 0.15;
      L.boot.rotation.z = a - k * 0.3;
    }
    body.position.y = HIP - (THIGH + SHIN) * (1 - Math.cos(a));
    for (const L of legs) L.hip.position.y = body.position.y; // hips come down with him, feet stay planted
    body.rotation.z = -fold * 0.35 + (p.pose === 'victory' ? Math.sin(t / 140) * 0.06 : 0);
    // head: a loose bob, sinks into the collar when folded
    head.rotation.y = Math.sin(t / 900) * 0.05;
    head.rotation.x = Math.sin(t / 610) * 0.05 + hurt;
    head.position.y -= fold * 18;
    // arms dangle and sway, elbows soft; folded, they wrap across the ribs
    for (const [pv, ph] of [[armF, 0], [armB, 1.7]]) {
      pv.rotation.x = (pv === armF ? -0.13 : 0.13) + Math.sin(t / 520 + ph) * 0.07 + hurt * (ph ? -1 : 1) + fold * (pv === armF ? 0.9 : -0.9);
      pv.userData.elbow.rotation.z = 0.18 + Math.sin(t / 380 + ph) * 0.06 + fold * 1.6;
    }
    cape.rotation.z = Math.sin(t / 460) * 0.05 + (p.fly ? 0.35 : 0) + fold * 0.3;
    strips.forEach((st, i) => { st.rotation.z = -0.12 + Math.sin(t / (300 + i * 47) + i) * 0.07 - (p.fly ? 0.4 : 0); });
  };
  return rig;
}

// ======================= Big Bad Wolfgang =======================
export function buildWolfgang(flash) {
  const P = maker(flash);
  const root = new THREE.Group();
  // poster: grey wolf in a long red coat with black lapels, dark trousers, snarling
  const FUR = 0x7f838d, FUR2 = 0x63676f, CREAM = 0xeceae4, RED = 0xc81e32, RED2 = 0x9e1628, BLACK = 0x24222c, PANTS = 0x34323e, PANTS2 = 0x2a2832, CLAW = 0xfff3d6, GOLD = 0xffc914;

  // big bare paws + furry ankles, ragged dark trousers
  for (const z of [-16, 16]) {
    const back = z < 0;
    root.add(P(box(36, 12, 24), back ? FUR2 : FUR, { pos: [10, 6, z] }));
    for (const dz of [-7, 0, 7]) root.add(P(cone(3.4, 9, 4), CLAW, { pos: [30, 5, z + dz], rot: [0, 0, -Math.PI / 2], ink: 1 }));
    root.add(P(cyl(9, 11, 22, 6), back ? FUR2 : FUR, { pos: [2, 22, z] }));
    root.add(P(cyl(13, 14, 46, 7), back ? PANTS2 : PANTS, { pos: [0, 54, z] }));
    for (let i = 0; i < 5; i++) root.add(P(cone(2.6, 6, 3), back ? PANTS2 : PANTS, { pos: [Math.cos(i * 1.25) * 12.5, 30, z + Math.sin(i * 1.25) * 12.5], rot: [Math.PI, 0, 0], ink: 0.8 }));
  }
  root.add(P(cyl(28, 30, 18, 8), PANTS, { pos: [0, 80, 0], scale: [1, 1, 0.86] }));
  // long coat tails: open at the front, hanging to the knees
  const tailsG = new THREE.CylinderGeometry(33, 40, 46, 10, 1, false, Math.PI / 2 + 0.55, Math.PI * 2 - 1.1);
  const coatTails = P(tailsG, RED, { pos: [-2, 70, 0], scale: [1, 1, 0.86] });
  root.add(coatTails);
  // barrel chest in the red coat, dark shirt showing down the front
  const chest = P(cyl(36, 31, 54, 8), RED, { pos: [0, 114, 0], scale: [1, 1, 0.86] });
  root.add(chest);
  root.add(P(box(6, 50, 20), BLACK, { pos: [29, 112, 0], rot: [0, 0, -0.1] }));
  // wide black lapels, gold buttons, black belt
  for (const z of [-1, 1]) {
    root.add(P(box(4, 46, 10), BLACK, { pos: [31, 120, z * 13], rot: [z * 0.18, 0, -0.12], ink: 1.2 }));
    for (let i = 0; i < 3; i++) root.add(P(ico(0), GOLD, { scale: [2.8, 2.8, 2.8], pos: [30.5 - i * 0.6, 92 + i * 11, z * 19], shiny: true, ink: 1 }));
  }
  root.add(P(cyl(31.5, 31.5, 6, 8), BLACK, { pos: [0, 90, 0], scale: [1, 1, 0.86], ink: 1 }));
  root.add(P(box(4, 7, 9), GOLD, { pos: [30, 90, 0], shiny: true, ink: 1 }));
  // turned-up coat collar behind the neck, cream chest fluff in front
  root.add(P(cyl(24, 20, 16, 8, 1, false), RED2, { pos: [-6, 150, 0], scale: [0.8, 1, 1.1] }));
  root.add(P(ico(1), CREAM, { scale: [13, 12, 16], pos: [24, 140, 0], ink: 1.6 }));
  root.add(P(cyl(18, 24, 12, 7), FUR, { pos: [0, 146, 0] }));
  // bushy tail
  const tail = group(root, -26, 78, 0);
  tail.add(P(ico(1), FUR, { scale: [28, 13, 14], pos: [-16, -16, 0], rot: [0, 0, 1.0] }));
  tail.add(P(ico(1), CREAM, { scale: [10, 9, 10], pos: [-30, -38, 0], rot: [0, 0, 1.0], ink: 1.6 }));

  // head: skull, long snout, cream muzzle, black nose, tall ears with a tuft
  const head = group(root, 8, 168, 0);
  const wskull = P(ico(1), FUR, { scale: [24, 22, 23] });
  head.add(wskull);
  for (const z of [-17, 17]) head.add(P(ico(1), CREAM, { scale: [10, 10, 6], pos: [8, -10, z], ink: 1.4 })); // cheek ruffs
  const snout = cyl(9, 14, 32, 6); snout.rotateZ(-Math.PI / 2);
  const snoutM = P(snout, FUR, { pos: [30, -2, 0], scale: [1, 0.9, 1.05] });
  head.add(snoutM);
  head.add(P(ico(1), CREAM, { scale: [14, 7, 11], pos: [34, -9, 0], ink: 1.6 }));
  head.add(P(ico(1), 0x14111a, { scale: [6, 5, 8], pos: [47, 2, 0], shiny: true, ink: 1.2 }));
  for (const z of [-1, 1]) {
    const ear = group(head, -4, 18, z * 13);
    ear.add(P(cone(9, 26, 4), FUR, { pos: [0, 10, 0], rot: [z * -0.2, 0, 0.12] }));
    ear.add(P(cone(5, 16, 4), CREAM, { pos: [4, 8, 0], rot: [z * -0.2, 0, 0.12], ink: false, scale: [0.6, 1, 1] }));
  }
  head.add(P(cone(5, 12, 4), FUR2, { pos: [-2, 24, 0], rot: [0, 0, 0.3], ink: 1.2 })); // tuft
  const jaw = group(head, 22, -14, 0);
  jaw.add(P(ico(1), CREAM, { scale: [13, 4.5, 9], pos: [12, -2, 0], ink: 1.6 }));
  // eyes on the brow, mouth decal on the front of the muzzle
  const eyes = sphereDecal(head, 23.4, 1.45, 0.62, 180, 76, [0, 8, 0], [1, 1, 1]);
  const mouthD = sphereDecal(head, 11.5, 1.7, 1.2, 120, 72, [36, -9, 0], [1, 0.85, 1]);
  const updEyes = faceUpdater(eyes, (g, W, H, e, m, t) => paintEyes(g, W, H, e === 'open' ? 'angry' : e, { iris: '#FFC914', lid: '#7F838D', brow: '#2A2832', size: H * 0.32, gap: W * 0.26 }, t));
  const updMouth = faceUpdater(mouthD, (g, W, H, e, m) => { g.clearRect(0, 0, W, H); paintMouth(g, W, H, m === 'smile' || m === 'flat' ? 'grit' : m, { inside: '#7A2030', fangs: true }); }); // poster: always a toothy snarl

  // arms: red coat sleeve to the wrist, black turned-back cuff, furry paw
  const arm = (z, back) => {
    const pv = group(root, 0, 140, z);
    pv.add(P(ico(1), back ? RED2 : RED, { scale: [14, 14, 13] }));
    pv.add(P(cyl(11, 10.5, 40, 6), back ? RED2 : RED, { pos: [0, -22, 0] }));
    pv.add(P(cyl(13, 12.5, 9, 6), BLACK, { pos: [0, -44, 0], ink: 1.4 }));
    pv.add(P(cyl(8.5, 8, 8, 6), back ? FUR2 : FUR, { pos: [0, -51, 0] }));
    pv.add(P(ico(1), back ? FUR2 : FUR, { scale: [11, 10, 11], pos: [2, -60, 0] }));
    for (const dz of [-5, 0, 5]) pv.add(P(cone(2.4, 7, 4), CLAW, { pos: [10, -64, dz], rot: [0, 0, -2.4], ink: 0.8 }));
    return pv;
  };
  const armB = arm(-40, true), armF = arm(40, false);

  const rig = { root, head, faceParts: [wskull, snoutM], headY: 168, armF, armB, anchors: { head: new THREE.Vector3(20, 168, 0), top: new THREE.Vector3(6, 214, 0), center: new THREE.Vector3(0, 106, 0), muzzle: new THREE.Vector3(56, 160, 0) }, headR: 50 };
  rig.apply = (p) => {
    baseApply(rig, p);
    updEyes(p); updMouth(p);
    const t = p.t || 0;
    tail.rotation.z = Math.sin(t / 300) * 0.12 + (p.tail || 0);
    jaw.rotation.z = p.mouth === 'open' ? -0.35 : p.mouth === 'o' ? -0.2 : 0;
    coatTails.rotation.z = p.fly ? 0.15 : 0;
    chest.scale.set(1 + (p.puff || 0) * 0.18, 1 + (p.puff || 0) * 0.1, 0.86 + (p.puff || 0) * 0.16);
  };
  return rig;
}

// ======================= Galactic Hunter (was Commander Payne) =======================
// Space villain (Matt, 2026-10-15): dark violet starship armor, crimson cape with a
// tall collar, swept-back helmet horns and crest, angry red V-visor, cyan reactor
// core in the chest, jet pack. An original design: no black dome, no breathing grille.
export function buildPayne(flash) {
  const P = maker(flash);
  const root = new THREE.Group();
  const GUN = 0x3a3358, GUN2 = 0x221d36, TRIM = 0xb8c2d8, CYAN = 0x4ee8ff, VISOR = 0xff2a44, CAPE = 0x9a1430, CAPE2 = 0x5e0c20;

  // boots, shins, knees, thighs
  for (const z of [-16, 16]) {
    const back = z < 0, c = back ? GUN2 : GUN;
    root.add(P(box(34, 14, 26), c, { pos: [6, 7, z] }));
    root.add(P(box(24, 30, 24), c, { pos: [0, 28, z] }));
    root.add(P(box(26, 5, 26), TRIM, { pos: [0, 44, z], ink: 1.2 }));
    const knee = new THREE.Mesh(new THREE.OctahedronGeometry(6), glowMat(CYAN)); knee.position.set(12, 52, z); root.add(knee);
    root.add(P(box(10, 14, 20), GUN, { pos: [8, 52, z], ink: 1.2 }));
    root.add(P(cyl(11, 10, 30, 7), GUN2, { pos: [0, 66, z] }));
    root.add(P(box(2, 22, 3), CYAN, { pos: [12.5, 28, z], ink: false }));
  }
  // belt, waist, abs
  root.add(P(cyl(28, 28, 10, 8), TRIM, { pos: [0, 84, 0], scale: [1, 1, 0.85], shiny: true }));
  root.add(P(box(8, 12, 14), GUN2, { pos: [25, 84, 0], ink: 1.4 }));
  root.add(P(box(1.5, 5, 8), VISOR, { pos: [29.2, 84, 0], ink: false }));
  root.add(P(cyl(22, 25, 20, 8), GUN2, { pos: [0, 98, 0], scale: [1, 1, 0.85] }));
  for (const y of [94, 101]) root.add(P(box(3, 2, 22), GUN, { pos: [22, y, 0], ink: false }));
  // chest: wide armored torso, V of silver trim, glowing reactor core
  root.add(P(cyl(42, 27, 46, 8), GUN, { pos: [0, 130, 0], scale: [1, 1, 0.82], shiny: true }));
  root.add(P(cyl(42.6, 42.6, 4, 8), TRIM, { pos: [0, 151, 0], scale: [1, 1, 0.82], ink: 1.2 }));
  for (const z of [-1, 1]) root.add(P(box(3, 34, 4), TRIM, { pos: [34, 136, z * 11], rot: [z * 0.5, 0, -0.3], ink: 1 }));
  const ring = cyl(11, 11, 4, 10); ring.rotateZ(Math.PI / 2);
  root.add(P(ring, TRIM, { pos: [35, 128, 0], shiny: true, ink: 1.2 }));
  const reactor = new THREE.Mesh(new THREE.IcosahedronGeometry(7.5, 1), glowMat(CYAN)); reactor.position.set(37, 128, 0); root.add(reactor);
  // jet pack + twin thrusters
  root.add(P(box(18, 40, 46), GUN2, { pos: [-36, 132, 0] }));
  const flames = [];
  for (const z of [-17, 17]) {
    root.add(P(cyl(7, 8.5, 24, 8), GUN, { pos: [-44, 150, z], rot: [0, 0, -0.35], shiny: true }));
    root.add(P(cyl(9, 9, 3, 8), TRIM, { pos: [-40, 160, z], rot: [0, 0, -0.35], ink: 1 }));
    const fl = new THREE.Mesh(new THREE.ConeGeometry(6, 16, 7), glowMat(CYAN));
    fl.position.set(-49, 135, z); fl.rotation.z = Math.PI - 0.35;
    root.add(fl); flames.push(fl);
  }
  // crimson cape from the shoulders, with a tall collar standing up behind the head
  const cape = group(root, -24, 156, 0);
  const BACK = Math.PI * 1.5;
  const drape = new THREE.CylinderGeometry(30, 44, 128, 12, 1, false, BACK - 1.4, 2.8); drape.translate(0, -64, 0);
  cape.add(P(drape, CAPE, { pos: [20, 0, 0], scale: [0.75, 1, 1] }));
  const lining = new THREE.CylinderGeometry(28.5, 42.5, 126, 12, 1, true, BACK - 1.37, 2.74); lining.translate(0, -64, 0);
  const lm = new THREE.Mesh(lining, new THREE.MeshBasicMaterial({ color: CAPE2, side: THREE.BackSide })); lm.position.x = 20; lm.scale.set(0.75, 1, 1); cape.add(lm);
  for (const s of [-1, 1]) {
    cape.add(P(box(4, 38, 26), GUN2, { pos: [14, 18, s * 18], rot: [s * 0.45, 0, -0.12], ink: 1.6 }));
    cape.add(P(box(3, 32, 20), CAPE, { pos: [17, 16, s * 16], rot: [s * 0.45, 0, -0.12], ink: false }));
  }
  // neck
  root.add(P(cyl(11, 13, 12, 8), GUN2, { pos: [0, 158, 0] }));

  // head: angular helmet, swept-back horns, crest fin, red V-visor, sharp faceplate
  const head = group(root, 4, 180, 0);
  head.add(P(new THREE.SphereGeometry(24, 10, 8), GUN, { shiny: true, scale: [1, 1.05, 1] }));
  const crest = new THREE.Shape(); crest.moveTo(16, 18); crest.lineTo(-30, 46); crest.lineTo(-26, 24); crest.lineTo(-6, 22); crest.closePath();
  const crestG = new THREE.ExtrudeGeometry(crest, { depth: 4, bevelEnabled: false }); crestG.translate(0, 0, -2);
  head.add(P(crestG, GUN2, { ink: 1.4 }));
  head.add(P(box(30, 1.6, 4.6), VISOR, { pos: [-8, 32, 0], rot: [0, 0, 0.55], ink: false }));
  for (const s of [-1, 1]) {
    const horn = cone(6.5, 42, 4); horn.translate(0, 21, 0);
    head.add(P(horn, GUN2, { pos: [-4, 14, s * 20], rot: [s * -0.45, 0, 0.75], ink: 1.4 }));
    head.add(P(box(18, 9, 3), TRIM, { pos: [-10, 4, s * 23.5], rot: [0, 0, 0.35], ink: 1 }));
  }
  // brow ridge over the visor
  for (const s of [-1, 1]) head.add(P(box(8, 5, 24), GUN2, { pos: [21, 12, s * 10], rot: [s * 0.32, s * 0.5, 0], ink: 1.2 }));
  // sharp faceplate / jaw with two thin cyan slits
  const jaw = new THREE.ConeGeometry(14, 22, 4); jaw.rotateZ(Math.PI); jaw.rotateY(Math.PI / 4);
  head.add(P(jaw, GUN2, { pos: [14, -14, 0], scale: [1.1, 1, 1.25], ink: 1.6 }));
  const eyes = sphereDecal(head, 24.9, 1.4, 0.4, 200, 56, [0, 4, 0]);
  const updEyes = faceUpdater(eyes, (g, W, H, e, m, t) => {
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,42,68,0.22)'; g.fillRect(0, H * 0.22, W, H * 0.6);
    paintEyes(g, W, H, e === 'open' ? 'angry' : e, { glow: '#FF4A60', size: H * 0.4, gap: W * 0.17 }, t);
  });

  // arms: angular pauldrons with spikes, gauntlets with silver knuckles
  const arm = (z, back) => {
    const pv = group(root, 0, 146, z);
    const c = back ? GUN2 : GUN;
    pv.add(P(ico(1), c, { scale: [20, 15, 18], pos: [0, 2, 0], shiny: true }));
    const rim = new THREE.TorusGeometry(17, 2, 4, 10); rim.rotateX(Math.PI / 2);
    pv.add(P(rim, TRIM, { pos: [0, -6, 0], ink: 1 }));
    for (const [dx, h] of [[-8, 20], [4, 15]]) pv.add(P(cone(4.5, h, 4), GUN2, { pos: [dx, 16, 0], rot: [0, 0, 0.55], ink: 1.2 }));
    pv.add(P(cyl(9, 8.5, 26, 7), GUN2, { pos: [0, -20, 0] }));
    pv.add(P(ico(0), TRIM, { scale: [7, 7, 7], pos: [0, -34, 0], shiny: true, ink: 1.2 }));
    pv.add(P(box(18, 24, 18), c, { pos: [0, -48, 0], shiny: true }));
    pv.add(P(box(1.5, 16, 3), CYAN, { pos: [9.4, -48, 0], ink: false }));
    pv.add(P(box(16, 12, 16), GUN2, { pos: [2, -64, 0] }));
    pv.add(P(box(5, 6, 14), TRIM, { pos: [10, -64, 0], shiny: true, ink: 1 }));
    return pv;
  };
  const armB = arm(-46, true), armF = arm(46, false);
  // plasma halberd in the camera-side hand
  const hal = group(armF, 2, -64, 0);
  const shaft = cyl(2.8, 2.8, 196, 6); shaft.translate(0, 46, 0);
  hal.add(P(shaft, GUN2, { shiny: true, ink: 1.2 }));
  for (const y of [-46, -6, 6, 100]) hal.add(P(cyl(4, 4, 4, 6), TRIM, { pos: [0, y, 0], shiny: true, ink: 0.8 }));
  hal.add(P(cone(4.5, 24, 5), TRIM, { pos: [0, 156, 0], shiny: true, ink: 1 }));
  hal.add(P(box(9, 12, 9), GUN, { pos: [0, 138, 0], ink: 1 }));
  // crescent energy blade (a half moon of cyan light, white-hot core)
  const blade = new THREE.Group(); hal.add(blade);
  const arcG = new THREE.TorusGeometry(24, 6.5, 4, 16, Math.PI); arcG.rotateZ(-Math.PI / 2);
  blade.add(new THREE.Mesh(arcG, glowMat(CYAN, { transparent: true, opacity: 0.9 })));
  const coreG = new THREE.TorusGeometry(24, 2.4, 3, 16, Math.PI); coreG.rotateZ(-Math.PI / 2);
  blade.add(new THREE.Mesh(coreG, glowMat(0xeaffff)));
  blade.position.set(3, 136, 0);
  blade.scale.set(0.8, 1, 1);
  hal.rotation.z = -0.12;

  const rig = { root, head, headY: 180, armF, armB, anchors: { head: new THREE.Vector3(10, 180, 0), top: new THREE.Vector3(-4, 226, 0), center: new THREE.Vector3(0, 112, 0), muzzle: new THREE.Vector3(30, 140, 0) }, headR: 48 };
  rig.apply = (p) => {
    baseApply(rig, p);
    updEyes(p);
    const t = p.t || 0;
    const f = 1 + Math.sin(t / 60) * 0.12 + (p.fly ? 0.8 : 0);
    flames.forEach((fl) => fl.scale.set(1, f, 1));
    blade.children[0].material.opacity = 0.75 + Math.sin(t / 90) * 0.15;
    reactor.scale.setScalar(1 + Math.sin(t / 140) * 0.08);
    reactor.rotation.y = t / 700;
    cape.rotation.z = Math.sin(t / 520) * 0.04 + (p.fly ? 0.35 : 0);
  };
  return rig;
}

export const VILLAIN_BUILDERS = { crookhook: buildCrookhook, jackknife: buildJackKnife, wolfgang: buildWolfgang, payne: buildPayne };
