// Code-built low-poly rigs for the four new original toys (handoff 2026-10-14):
// Capt'n Crookhook, Jack-Knife, Big Bad Wolfgang and Commander Payne.
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
  // beard: full under the chin, then two thick braids with gold beads
  head.add(P(ico(1), SILVER, { scale: [17, 17, 21], pos: [14, -20, 0], ink: 2 }));
  head.add(P(ico(1), SILVER, { scale: [9, 7, 19], pos: [20, -9, 0], ink: 1.6 }));
  const braids = [];
  for (const z of [-9, 9]) {
    const br = group(head, 27, -34, z);
    for (let i = 0; i < 3; i++) br.add(P(ico(0), SILVER, { scale: [7 - i * 0.8, 7.5, 7 - i * 0.8], pos: [3 * i, -i * 11, 0], ink: 1.4 }));
    br.add(P(cyl(4, 4, 5, 7), GOLD, { pos: [8, -31, 0], shiny: true, ink: 1 }));
    br.add(P(cone(4.4, 9, 5), SILVER, { pos: [8.5, -39, 0], rot: [Math.PI, 0, 0], ink: 1.2 }));
    braids.push(br);
  }
  // face: eyes + one patch, mouth under the beard line
  const face = sphereDecal(head, 21.6, 1.5, 1.3, 180, 160, [0, 2, 0]);
  const updFace = faceUpdater(face, (g, W, H, e, m, t) => {
    g.clearRect(0, 0, W, H);
    g.save(); g.translate(0, H * 0.06); g.scale(1, 0.62); paintEyes(g, W, H, e, { iris: '#2F8FD0', lid: '#E0A878', brow: '#C4CAD8', size: H * 0.31, gap: W * 0.17 }, t); g.restore();
    // eyepatch over his right eye (viewer's left), strap running up and back
    g.strokeStyle = INK; g.lineWidth = H * 0.04; g.lineCap = 'round';
    g.beginPath(); g.moveTo(W * 0.0, H * 0.12); g.lineTo(W * 0.62, H * 0.06); g.stroke();
    g.fillStyle = INK; g.beginPath(); g.ellipse(W * 0.33, H * 0.42, W * 0.12, H * 0.13, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#4a4258'; g.beginPath(); g.ellipse(W * 0.31, H * 0.38, W * 0.035, H * 0.035, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#C4CAD8'; g.lineWidth = H * 0.06;
    g.beginPath(); g.moveTo(W * 0.2, H * 0.24); g.lineTo(W * 0.44, H * 0.27); g.stroke();
    g.save(); g.translate(0, H * 0.58); g.scale(1, 0.42); paintMouth(g, W, H, m, { inside: '#7A1E2A' }); g.restore();
  });

  // hat: black tricorn (a triangular prism brim pointing forward), gold edge, crown, plume, anchor badge
  const hat = group(head, -2, 18, 0);
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
  plume.add(P(ico(1), TEAL, { scale: [20, 6, 8], pos: [-8, 8, 0], rot: [0, 0, -0.6], ink: 1.6 }));
  plume.add(P(ico(1), 0x2fb5b5, { scale: [13, 4.5, 6], pos: [-26, 20, 0], rot: [0, 0, -0.95], ink: 1.4 }));

  // arms: coat sleeve, wide gold cuff; camera-side arm ends in the iron hook, the back hand holds the cutlass
  const arm = (z, back) => {
    const pv = group(root, 0, 144, z);
    pv.add(P(ico(1), TEAL, { scale: [12, 12, 11], pos: [0, -2, 0] }));
    pv.add(P(cyl(9, 8.5, 34, 6), back ? TEAL2 : TEAL, { pos: [0, -22, 0] }));
    pv.add(P(cyl(12, 11, 12, 6), GOLD, { pos: [0, -40, 0], ink: 1.6 }));
    return pv;
  };
  const armB = arm(-38, true), armF = arm(38, false);
  // the hook
  armF.add(P(cyl(6, 5, 8, 8), STEEL, { pos: [0, -50, 0], shiny: true, ink: 1.4 }));
  const hk = new THREE.TorusGeometry(9, 2.4, 5, 10, Math.PI * 1.35); hk.rotateZ(Math.PI * 0.9);
  armF.add(P(hk, 0x5d6676, { pos: [5, -62, 0], shiny: true, ink: 1.4 }));
  armF.add(P(cone(2.4, 6, 4), 0x5d6676, { pos: [13, -55, 0], rot: [0, 0, -0.4], shiny: true, ink: 1 }));
  // cutlass in the back hand
  armB.add(P(ico(1), SKIN, { scale: [7, 7, 7], pos: [0, -50, 0], ink: 1.4 }));
  const cut = group(armB, 0, -50, 0);
  cut.add(P(box(3, 30, 10), 0xdde6f2, { pos: [0, 21, 0], shiny: true, ink: 1.2 }));
  cut.add(P(box(3, 22, 10), 0xdde6f2, { pos: [-3, 45, 0], rot: [0, 0, 0.22], shiny: true, ink: 1.2 }));
  cut.add(P(cone(5, 12, 3), 0xdde6f2, { pos: [-6.5, 60, 0], rot: [0, 0, 0.4], scale: [0.5, 1, 1], shiny: true, ink: 1 }));
  cut.add(P(box(5, 4, 22), GOLD, { pos: [0, 5, 0], shiny: true, ink: 1.2 }));
  cut.add(P(box(4, 10, 4), 0x5a3a24, { pos: [0, -2, 0], ink: 1 }));
  cut.rotation.z = -1.15;

  const rig = { root, head, faceParts: [skull, hat], headY: 172, armF, armB, anchors: { head: new THREE.Vector3(10, 172, 0), top: new THREE.Vector3(2, 222, 0), center: new THREE.Vector3(0, 106, 0), muzzle: new THREE.Vector3(20, 168, 0) }, headR: 46 };
  rig.apply = (p) => {
    baseApply(rig, p);
    updFace(p);
    const t = p.t || 0;
    braids.forEach((b, i) => { b.rotation.z = Math.sin(t / 420 + i) * 0.06 + (p.fly ? -0.25 : 0); });
    plume.rotation.z = Math.sin(t / 360) * 0.08;
    skirt.rotation.z = p.fly ? 0.12 : 0;
  };
  return rig;
}

// ======================= Jack-Knife =======================
function paintPumpkinFace(g, W, H, eyes, mouth, t) {
  g.clearRect(0, 0, W, H);
  const glow = '#5CF2A0', core = '#E9FFF2';
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

export function buildJackKnife(flash) {
  const P = maker(flash);
  const root = new THREE.Group();
  const BONE = 0xede6d2, BONE2 = 0xd2c8ae, PUMP = 0xe8762b, PUMP2 = 0xd0601e, STEM = 0x2e7a3a, BURLAP = 0xc9a15a, PURPLE = 0x6a3fa0, VINE = 0x2e9e44;

  // legs: knobby bones, one striped sock on the back leg
  for (const z of [-13, 13]) {
    const back = z < 0, c = back ? BONE2 : BONE;
    root.add(P(ico(1), c, { scale: [13, 6, 9], pos: [8, 5, z] }));
    root.add(P(ico(0), c, { scale: [6, 6, 6], pos: [0, 11, z], ink: 1.4 }));
    root.add(P(cyl(4, 4.5, 40, 6), c, { pos: [-1, 32, z], rot: [0, 0, 0.06] }));
    if (back) for (let i = 0; i < 4; i++) root.add(P(cyl(6, 6, 6, 6), i % 2 ? VINE : PURPLE, { pos: [0, 17 + i * 6, z], ink: i === 0 || i === 3 ? 1.4 : false }));
    root.add(P(ico(0), c, { scale: [8, 8, 8], pos: [-2, 54, z], ink: 1.6 })); // knobby knee
    root.add(P(cyl(5, 4.5, 34, 6), c, { pos: [0, 74, z], rot: [0, 0, -0.08] }));
  }
  // pelvis + spine
  root.add(P(ico(1), BONE, { scale: [14, 9, 20], pos: [0, 92, 0] }));
  for (let i = 0; i < 3; i++) root.add(P(cyl(5, 5, 5, 6), BONE, { pos: [2, 101 + i * 6.5, 0], ink: 1.2 }));
  // vine belt with leaves
  const vb = new THREE.TorusGeometry(19, 2.6, 4, 12); vb.rotateX(Math.PI / 2);
  root.add(P(vb, VINE, { pos: [0, 99, 0], scale: [1, 1, 0.86], ink: 1.2 }));
  for (const [x, z, r] of [[18, 6, 0.4], [16, -9, -0.5], [12, 14, 1.0]]) root.add(P(cone(4, 10, 4), 0x46c25a, { pos: [x, 96, z], rot: [Math.PI / 2 + r, 0, -0.3], scale: [1, 1, 0.4], ink: 1 }));
  // ribcage peeking out + burlap vest (open at the front)
  root.add(P(cyl(16, 13, 34, 7), BONE2, { pos: [0, 126, 0], scale: [1, 1, 0.9] }));
  for (let i = 0; i < 3; i++) root.add(P(box(3, 3.2, 20 - i * 2), BONE, { pos: [16 - i * 0.8, 136 - i * 9, 0], ink: 1 }));
  root.add(P(box(3, 30, 4), BONE, { pos: [17, 126, 0], ink: 1 }));
  for (const z of [-1, 1]) {
    root.add(P(box(28, 42, 9), BURLAP, { pos: [-3, 124, z * 11], rot: [z * -0.08, 0, 0] }));
    root.add(P(box(10, 40, 10), BURLAP, { pos: [10, 124, z * 13], rot: [0, z * 0.5, 0] }));
  }
  root.add(P(box(26, 42, 14), BURLAP, { pos: [-8, 124, 0] }));
  root.add(P(box(1.5, 10, 9), PURPLE, { pos: [15.5, 116, 15], rot: [0, 0.5, 0.15], ink: 1 }));
  root.add(P(box(1.5, 8, 8), VINE, { pos: [-9, 134, 18.5], rot: [Math.PI / 2, 0, 0], ink: 1 }));
  // tattered purple cape with ragged points + gold pumpkin clasp
  const cape = group(root, -26, 146, 0);
  cape.add(P(box(5, 58, 54), PURPLE, { pos: [-2, -28, 0], rot: [0, 0, 0.1] }));
  for (let i = 0; i < 4; i++) cape.add(P(cone(6.5, 16 + (i % 2) * 6, 4), PURPLE, { pos: [-7, -62 - (i % 2) * 3, -20 + i * 13.3], rot: [Math.PI, 0, -0.1], ink: 1.4 }));
  root.add(P(ico(0), 0xffc914, { scale: [5, 4.5, 5], pos: [16, 148, 0], shiny: true, ink: 1.2 }));
  // neck
  root.add(P(cyl(4.5, 5, 12, 6), BONE, { pos: [2, 153, 0] }));

  // head: ridged pumpkin from overlapping lobes, curly stem and a leaf, glowing carved face
  const head = group(root, 4, 178, 0);
  for (let k = 0; k < 6; k++) head.add(P(ico(1), k % 2 ? PUMP2 : PUMP, { scale: [27, 23, 12], rot: [0, (k * Math.PI) / 6, 0], ink: 2.2 }));
  head.add(P(ico(1), PUMP, { scale: [25, 22, 25], ink: false }));
  const stem = cyl(3, 4.5, 14, 5); stem.translate(0, 7, 0);
  head.add(P(stem, STEM, { pos: [-2, 19, 0], rot: [0, 0, 0.35], ink: 1.4 }));
  head.add(P(cone(5, 14, 4), 0x46c25a, { pos: [-10, 26, 4], rot: [0.4, 0, 1.2], scale: [1, 1, 0.3], ink: 1 }));
  const curl = new THREE.TorusGeometry(4, 1, 3, 8, Math.PI * 1.5);
  head.add(P(curl, STEM, { pos: [-6, 31, 0], ink: 0.8 }));
  const face = sphereDecal(head, 27.6, 1.75, 1.7, 220, 200, [0, -1, 0], [1, 0.86, 1]);
  const updFace = faceUpdater(face, paintPumpkinFace);

  // arms: shoulder knob, bone, elbow knob, bone, long fingers
  const arm = (z, back) => {
    const pv = group(root, 0, 142, z);
    const c = back ? BONE2 : BONE;
    pv.add(P(ico(0), c, { scale: [7, 7, 7] }));
    pv.add(P(cyl(3.8, 3.5, 28, 6), c, { pos: [0, -17, 0] }));
    pv.add(P(ico(0), c, { scale: [6, 6, 6], pos: [0, -32, 0], ink: 1.4 }));
    pv.add(P(cyl(3.4, 3, 26, 6), c, { pos: [0, -46, 0] }));
    pv.add(P(box(8, 6, 8), c, { pos: [1, -61, 0], ink: 1.2 }));
    for (const dz of [-3, 0, 3]) pv.add(P(box(2.2, 14, 2.2), c, { pos: [3, -70, dz], rot: [dz * 0.08, 0, -0.25], ink: 0.8 }));
    return pv;
  };
  const armB = arm(-26, true), armF = arm(26, false);

  const rig = { root, head, headY: 178, armF, armB, anchors: { head: new THREE.Vector3(10, 178, 0), top: new THREE.Vector3(4, 214, 0), center: new THREE.Vector3(0, 108, 0), muzzle: new THREE.Vector3(30, 172, 0) }, headR: 44 };
  rig.apply = (p) => {
    baseApply(rig, p);
    updFace(p);
    const t = p.t || 0;
    cape.rotation.z = Math.sin(t / 460) * 0.06 + (p.fly ? 0.35 : 0);
    head.rotation.y = Math.sin(t / 900) * 0.05;
  };
  return rig;
}

// ======================= Big Bad Wolfgang =======================
export function buildWolfgang(flash) {
  const P = maker(flash);
  const root = new THREE.Group();
  const FUR = 0x6b7a99, FUR2 = 0x56637f, CREAM = 0xf2e6c8, RED = 0xd7263d, RED2 = 0xb01e30, BLACK = 0x22202a, DENIM = 0x1b4fd8, DENIM2 = 0x163fae, BROWN = 0x7a4a22, CLAW = 0xfff3d6, PATCH = 0xf46036;

  // big bare paws + furry shins
  for (const z of [-16, 16]) {
    const back = z < 0;
    root.add(P(box(36, 12, 24), back ? FUR2 : FUR, { pos: [10, 6, z] }));
    for (const dz of [-7, 0, 7]) root.add(P(cone(3.4, 9, 4), CLAW, { pos: [30, 5, z + dz], rot: [0, 0, -Math.PI / 2], ink: 1 }));
    root.add(P(cyl(9, 11, 30, 6), back ? FUR2 : FUR, { pos: [2, 26, z] }));
    // cut-off overall legs, frayed edge, knee patch on the camera-side leg
    root.add(P(cyl(14, 15, 26, 7), back ? DENIM2 : DENIM, { pos: [0, 54, z] }));
    for (let i = 0; i < 5; i++) root.add(P(cone(2.6, 6, 3), back ? DENIM2 : DENIM, { pos: [Math.cos(i * 1.25) * 13, 40, z + Math.sin(i * 1.25) * 13], rot: [Math.PI, 0, 0], ink: 0.8 }));
    if (!back) root.add(P(box(2, 10, 10), PATCH, { pos: [14.5, 52, z + 3], rot: [0, 0.35, 0], ink: 1 }));
  }
  // overall hips + bib
  root.add(P(cyl(30, 32, 26, 8), DENIM, { pos: [0, 76, 0], scale: [1, 1, 0.86] }));
  // barrel chest in red buffalo plaid
  const chest = P(cyl(36, 30, 54, 8), RED, { pos: [0, 114, 0], scale: [1, 1, 0.86] });
  root.add(chest);
  for (const y of [100, 124]) root.add(P(cyl(30 + (y - 87) * 0.111 + 0.7, 30 + (y - 91) * 0.111 + 0.7, 7, 8), BLACK, { pos: [0, y, 0], scale: [1, 1, 0.86], ink: false }));
  for (let k = 0; k < 8; k += 2) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    root.add(P(box(7, 52, 1.5), BLACK, { pos: [Math.sin(a) * 31.5, 114, Math.cos(a) * 27.2], rot: [0, a, 0], ink: false }));
  }
  // bib + suspenders + gold buttons
  root.add(P(box(6, 30, 32), DENIM, { pos: [30, 100, 0], rot: [0, 0, -0.1] }));
  for (const z of [-12, 12]) {
    root.add(P(box(5, 52, 6), BROWN, { pos: [33, 122, z], rot: [0, 0, -0.18], ink: 1.2 }));
    root.add(P(box(5, 52, 6), BROWN, { pos: [-32, 118, z], rot: [0, 0, 0.18], ink: 1.2 }));
    root.add(P(ico(0), 0xffc914, { scale: [3, 3, 3], pos: [33.5, 114, z], shiny: true, ink: 1 }));
  }
  // chest pocket with a piece of straw
  root.add(P(box(3, 12, 12), RED2, { pos: [33, 134, 14], rot: [0, 0.3, -0.18], ink: 1 }));
  for (const [dz, r] of [[-2, 0.2], [1, -0.1], [3, 0.35]]) root.add(P(cyl(0.9, 0.9, 20, 4), 0xffd84a, { pos: [34, 143, 14 + dz], rot: [r, 0, -0.2], ink: 0.6 }));
  // cream chest fluff at the collar + shoulders
  root.add(P(ico(1), CREAM, { scale: [14, 12, 18], pos: [24, 142, 0], ink: 1.6 }));
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
  const updEyes = faceUpdater(eyes, (g, W, H, e, m, t) => paintEyes(g, W, H, e, { iris: '#FFC914', lid: '#6B7A99', brow: '#2E3550', size: H * 0.32, gap: W * 0.26 }, t));
  const updMouth = faceUpdater(mouthD, (g, W, H, e, m) => { g.clearRect(0, 0, W, H); paintMouth(g, W, H, m, { inside: '#7A2030', fangs: true }); });

  // arms: plaid sleeve rolled to the elbow, furry forearm, big paw
  const arm = (z, back) => {
    const pv = group(root, 0, 140, z);
    pv.add(P(ico(1), back ? RED2 : RED, { scale: [14, 14, 13] }));
    pv.add(P(cyl(11, 10, 26, 6), back ? RED2 : RED, { pos: [0, -16, 0] }));
    pv.add(P(cyl(12, 12, 6, 6), BLACK, { pos: [0, -24, 0], ink: false }));
    pv.add(P(cyl(13, 12, 8, 6), back ? RED2 : RED, { pos: [0, -31, 0], ink: 1.6 }));
    pv.add(P(cyl(8.5, 8, 22, 6), back ? FUR2 : FUR, { pos: [0, -45, 0] }));
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
    chest.scale.set(1 + (p.puff || 0) * 0.18, 1 + (p.puff || 0) * 0.1, 0.86 + (p.puff || 0) * 0.16);
  };
  return rig;
}

// ======================= Commander Payne =======================
export function buildPayne(flash) {
  const P = maker(flash);
  const root = new THREE.Group();
  const GUN = 0x4a5262, GUN2 = 0x2e333f, GOLD = 0xffc914, CYAN = 0x4ee8ff, VISOR = 0x8a6410;

  // boots, shins, knees, thighs
  for (const z of [-16, 16]) {
    const back = z < 0, c = back ? GUN2 : GUN;
    root.add(P(box(34, 14, 26), c, { pos: [6, 7, z] }));
    root.add(P(box(24, 30, 24), c, { pos: [0, 28, z] }));
    root.add(P(box(26, 5, 26), GOLD, { pos: [0, 44, z], ink: 1.2 }));
    root.add(P(ico(0), GOLD, { scale: [7, 7, 7], pos: [8, 52, z], shiny: true, ink: 1.4 }));
    root.add(P(cyl(11, 10, 30, 7), GUN2, { pos: [0, 66, z] }));
  }
  // belt, waist, abs
  root.add(P(cyl(28, 28, 10, 8), GOLD, { pos: [0, 84, 0], scale: [1, 1, 0.85], shiny: true }));
  root.add(P(box(8, 12, 14), GUN2, { pos: [25, 84, 0], ink: 1.4 }));
  root.add(P(cyl(22, 25, 20, 8), GUN2, { pos: [0, 98, 0], scale: [1, 1, 0.85] }));
  for (const y of [94, 101]) root.add(P(box(3, 2, 22), GUN, { pos: [22, y, 0], ink: false }));
  // chest: wide armored torso with gold trim and the star emblem
  root.add(P(cyl(42, 27, 46, 8), GUN, { pos: [0, 130, 0], scale: [1, 1, 0.82], shiny: true }));
  root.add(P(cyl(42.6, 42.6, 4, 8), GOLD, { pos: [0, 151, 0], scale: [1, 1, 0.82], ink: 1.2 }));
  root.add(P(starBadge(13, 5.5, 4), GOLD, { pos: [36, 132, 0], rot: [0, 0, -0.32], shiny: true, ink: 1.4 }));
  // backpack + shoulder rockets
  root.add(P(box(18, 40, 46), GUN2, { pos: [-36, 132, 0] }));
  const flames = [];
  for (const z of [-17, 17]) {
    root.add(P(cyl(7, 8.5, 24, 8), GUN, { pos: [-44, 150, z], rot: [0, 0, -0.35], shiny: true }));
    root.add(P(cyl(9, 9, 3, 8), GOLD, { pos: [-40, 160, z], rot: [0, 0, -0.35], ink: 1 }));
    const fl = new THREE.Mesh(new THREE.ConeGeometry(6, 16, 7), glowMat(CYAN));
    fl.position.set(-49, 135, z); fl.rotation.z = Math.PI - 0.35;
    root.add(fl); flames.push(fl);
  }
  // neck
  root.add(P(cyl(11, 13, 12, 8), GUN2, { pos: [0, 158, 0] }));

  // head: round dome helmet, single wraparound visor band (gold glow), side fins, gold ridge
  const head = group(root, 4, 180, 0);
  head.add(P(new THREE.SphereGeometry(24, 10, 8), GUN, { shiny: true }));
  head.add(P(box(48, 5, 7), GOLD, { pos: [-2, 18, 0], rot: [0, 0, 0], ink: 1.2, scale: [1, 1, 1] }));
  for (const z of [-1, 1]) head.add(P(box(22, 10, 3), GUN2, { pos: [-14, 8, z * 23], rot: [0, 0, 0.4], ink: 1.4 }));
  const band = new THREE.Mesh(new THREE.CylinderGeometry(24.6, 24.6, 11, 12, 1, true, Math.PI / 2 - 1.45, 2.9), glowMat(VISOR, { side: THREE.DoubleSide }));
  band.position.set(0, 2, 0); head.add(band);
  // chin guard
  head.add(P(box(16, 12, 26), GUN2, { pos: [16, -14, 0], ink: 1.6 }));
  for (let i = 0; i < 3; i++) head.add(P(box(1, 7, 2), CYAN, { pos: [24.2, -14, -6 + i * 6], ink: false }));
  const eyes = sphereDecal(head, 24.9, 1.9, 0.48, 220, 60, [0, 2, 0]);
  const updEyes = faceUpdater(eyes, (g, W, H, e, m, t) => {
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,216,74,0.28)'; g.fillRect(0, H * 0.18, W, H * 0.64);
    paintEyes(g, W, H, e, { glow: '#FFE88A', size: H * 0.36, gap: W * 0.2 }, t);
  });

  // arms: big pauldrons, gauntlets with gold knuckles
  const arm = (z, back) => {
    const pv = group(root, 0, 146, z);
    const c = back ? GUN2 : GUN;
    pv.add(P(ico(1), c, { scale: [20, 16, 18], pos: [0, 2, 0], shiny: true }));
    const rim = new THREE.TorusGeometry(17, 2, 4, 10); rim.rotateX(Math.PI / 2);
    pv.add(P(rim, GOLD, { pos: [0, -6, 0], ink: 1 }));
    pv.add(P(cyl(9, 8.5, 26, 7), GUN2, { pos: [0, -20, 0] }));
    pv.add(P(ico(0), GOLD, { scale: [7, 7, 7], pos: [0, -34, 0], shiny: true, ink: 1.2 }));
    pv.add(P(box(18, 24, 18), c, { pos: [0, -48, 0], shiny: true }));
    pv.add(P(box(16, 12, 16), GUN2, { pos: [2, -64, 0] }));
    pv.add(P(box(5, 6, 14), GOLD, { pos: [10, -64, 0], shiny: true, ink: 1 }));
    return pv;
  };
  const armB = arm(-46, true), armF = arm(46, false);
  // plasma halberd in the camera-side hand
  const hal = group(armF, 2, -64, 0);
  const shaft = cyl(2.8, 2.8, 196, 6); shaft.translate(0, 46, 0);
  hal.add(P(shaft, GUN2, { shiny: true, ink: 1.2 }));
  for (const y of [-46, -6, 6, 100]) hal.add(P(cyl(4, 4, 4, 6), GOLD, { pos: [0, y, 0], shiny: true, ink: 0.8 }));
  hal.add(P(cone(4.5, 24, 5), GOLD, { pos: [0, 156, 0], shiny: true, ink: 1 }));
  hal.add(P(box(9, 12, 9), GUN, { pos: [0, 138, 0], ink: 1 }));
  // crescent energy blade (a half moon of cyan light, white-hot core)
  const blade = new THREE.Group(); blade.position.set(-4, 132, 0); hal.add(blade);
  const arcG = new THREE.TorusGeometry(24, 6.5, 4, 16, Math.PI); arcG.rotateZ(-Math.PI / 2);
  blade.add(new THREE.Mesh(arcG, glowMat(CYAN, { transparent: true, opacity: 0.9 })));
  const coreG = new THREE.TorusGeometry(24, 2.4, 3, 16, Math.PI); coreG.rotateZ(-Math.PI / 2);
  const core = new THREE.Mesh(coreG, glowMat(0xeaffff)); blade.add(core);
  blade.position.set(3, 136, 0);
  blade.scale.set(0.8, 1, 1);
  hal.rotation.z = -0.12;

  const rig = { root, head, headY: 180, armF, armB, anchors: { head: new THREE.Vector3(10, 180, 0), top: new THREE.Vector3(4, 212, 0), center: new THREE.Vector3(0, 112, 0), muzzle: new THREE.Vector3(30, 140, 0) }, headR: 46 };
  rig.apply = (p) => {
    baseApply(rig, p);
    updEyes(p);
    const t = p.t || 0;
    const f = 1 + Math.sin(t / 60) * 0.12 + (p.fly ? 0.8 : 0);
    flames.forEach((fl) => fl.scale.set(1, f, 1));
    blade.children[0].material.opacity = 0.75 + Math.sin(t / 90) * 0.15;
  };
  return rig;
}

export const VILLAIN_BUILDERS = { crookhook: buildCrookhook, jackknife: buildJackKnife, wolfgang: buildWolfgang, payne: buildPayne };
