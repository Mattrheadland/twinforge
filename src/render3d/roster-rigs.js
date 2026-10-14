// Low-poly 3D rigs for the roster (STYLE_GUIDE v5).
// Battle Rex, Spooky Tree, Ragin' Rockfish and Young Arthur are modeled from
// Matt's reference sheets; Wanda Wickwhistle and Gloomwing are original designs.
// Conventions: ~190 units tall, feet at y = 0, facing +x, camera side is +z.
// Every rig reads the same pose values the battle choreography animates
// (armF/armB, headBob, eyes, mouth, cannon, fly, pose, t).
import * as THREE from 'three';
import { toonMat, glowMat, part } from './toon.js';

const INK = '#14111A';
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const ico = (d = 1) => new THREE.IcosahedronGeometry(1, d);
const cyl = (rt, rb, h, s = 7) => new THREE.CylinderGeometry(rt, rb, h, s);
const cone = (r, h, s = 5) => new THREE.ConeGeometry(r, h, s);

export function maker(flash) {
  return (geo, color, o = {}) => part(geo, color, { ink: 3, flash, ...o, color });
}

export function group(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

// ---------------- painted faces ----------------
export function faceCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return { c, g: c.getContext('2d'), tex };
}

export function decal(parent, w, h, cw, ch, pos, rotY = Math.PI / 2) {
  const fc = faceCanvas(cw, ch);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({
    map: fc.tex, transparent: true, alphaTest: 0.4, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
  }));
  m.position.set(...pos);
  m.rotation.y = rotY;
  m.renderOrder = 2;
  parent.add(m);
  return fc;
}

// Two eyes in one canvas. style: { iris, glow, lid, brow, size, gap, pupil }
export function paintEyes(g, W, H, eyes, st, t) {
  g.clearRect(0, 0, W, H);
  const r = st.size || H * 0.3;
  const cy = H * 0.55;
  const blink = eyes === 'open' && t % 3900 < 120;
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (const side of [-1, 1]) {
    const x = W / 2 + side * (st.gap || W * 0.25);
    const inner = -side; // points toward the other eye
    g.strokeStyle = INK;
    if (eyes === 'open' || eyes === 'angry') {
      if (blink) { g.lineWidth = r * 0.3; g.beginPath(); g.moveTo(x - r, cy); g.lineTo(x + r, cy); g.stroke(); continue; }
      if (st.glow) {
        // glowing eye shape: a slanted almond, sharper when angry
        const k = eyes === 'angry' ? 0.75 : 0.45;
        g.fillStyle = st.glow;
        g.shadowColor = st.glow; g.shadowBlur = r * 0.6;
        g.beginPath();
        g.moveTo(x - inner * r, cy - r * (1 - k));
        g.lineTo(x + inner * r, cy - r * 0.15 + r * k * 0.6);
        g.quadraticCurveTo(x + inner * r * 0.4, cy + r * 0.9, x - inner * r, cy + r * 0.5);
        g.closePath(); g.fill();
        g.shadowBlur = 0;
        if (st.pupil) { g.fillStyle = INK; g.beginPath(); g.arc(x + inner * r * 0.15, cy + r * 0.2, r * 0.28, 0, Math.PI * 2); g.fill(); }
        continue;
      }
      g.fillStyle = st.sclera || '#ffffff';
      g.lineWidth = r * 0.18;
      g.beginPath(); g.ellipse(x, cy, r * 0.8, r, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = st.iris || '#3A6FD8';
      g.beginPath(); g.ellipse(x + inner * r * 0.12, cy + r * 0.12, r * 0.55, r * 0.68, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = INK;
      g.beginPath(); g.ellipse(x + inner * r * 0.12, cy + r * 0.16, r * 0.28, r * 0.36, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffffff';
      g.fillRect(x + inner * r * 0.02 - r * 0.22, cy - r * 0.3, r * 0.22, r * 0.22);
      // lid: covers the top in a V (inner end low) — determined, never sleepy
      const k = eyes === 'angry' ? 0.55 : 0.3;
      g.save();
      g.beginPath(); g.ellipse(x, cy, r * 0.85, r * 1.05, 0, 0, Math.PI * 2); g.clip();
      g.fillStyle = st.lid;
      g.beginPath();
      g.moveTo(x - r, cy - r * 1.2); g.lineTo(x + r, cy - r * 1.2);
      g.lineTo(x + inner * r, cy - r + r * 2 * k); g.lineTo(x - inner * r, cy - r + r * 2 * k * 0.25);
      g.closePath(); g.fill();
      g.restore();
      g.lineWidth = r * 0.16;
      g.beginPath(); g.moveTo(x - inner * r, cy - r + r * 2 * k * 0.25); g.lineTo(x + inner * r, cy - r + r * 2 * k); g.stroke();
    } else if (eyes === 'happy') {
      g.lineWidth = r * 0.3; g.strokeStyle = st.glow || INK;
      g.beginPath(); g.arc(x, cy + r * 0.3, r * 0.7, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    } else if (eyes === 'squint') {
      g.lineWidth = r * 0.3; g.strokeStyle = st.glow || INK;
      g.beginPath(); g.moveTo(x - inner * r * 0.6, cy - r * 0.6); g.lineTo(x + inner * r * 0.5, cy); g.lineTo(x - inner * r * 0.6, cy + r * 0.6); g.stroke();
    } else if (eyes === 'closed') {
      g.lineWidth = r * 0.26; g.strokeStyle = st.glow || INK;
      g.beginPath(); g.arc(x, cy - r * 0.1, r * 0.65, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
    } else if (eyes === 'swirl') {
      g.lineWidth = r * 0.18; g.strokeStyle = st.glow || '#FFC914';
      g.beginPath();
      for (let a = 0; a < 13; a += 0.35) {
        const rr = a * r * 0.075, px = x + Math.cos(a + t / 110) * rr, py = cy + Math.sin(a + t / 110) * rr;
        a ? g.lineTo(px, py) : g.moveTo(px, py);
      }
      g.stroke();
    }
    // brows (non-glow faces)
    if (st.brow && !st.glow && eyes !== 'swirl') {
      const lift = eyes === 'happy' || eyes === 'closed' ? -0.25 : eyes === 'angry' ? 0.35 : 0.1;
      g.strokeStyle = st.brow; g.lineWidth = r * 0.32;
      g.beginPath();
      g.moveTo(x - inner * r * 0.95, cy - r * 1.45);
      g.lineTo(x + inner * r * 0.8, cy - r * 1.45 + r * lift);
      g.stroke();
    }
  }
}

export function paintMouth(g, W, H, mouth, st) {
  const x0 = W * 0.3, x1 = W * 0.7, y = H * 0.5;
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = st.line || INK;
  g.lineWidth = H * 0.12;
  g.fillStyle = st.inside || '#5E1530';
  g.beginPath();
  if (mouth === 'smile') {
    g.moveTo(x0, y - H * 0.08); g.quadraticCurveTo(W / 2, y + H * 0.3, x1, y - H * 0.18); g.stroke();
  } else if (mouth === 'open') {
    g.moveTo(x0, y - H * 0.15); g.lineTo(x1, y - H * 0.15); g.quadraticCurveTo(W / 2, y + H * 0.5, x0, y - H * 0.15); g.fill(); g.stroke();
    if (st.fangs) fangs(g, W, y - H * 0.15, H);
  } else if (mouth === 'grit') {
    g.fillStyle = '#ffffff';
    g.rect(x0, y - H * 0.16, x1 - x0, H * 0.3); g.fill(); g.stroke();
    g.lineWidth = H * 0.05;
    for (let i = 1; i < 4; i++) { const xx = x0 + ((x1 - x0) * i) / 4; g.beginPath(); g.moveTo(xx, y - H * 0.16); g.lineTo(xx, y + H * 0.14); g.stroke(); }
  } else if (mouth === 'o') {
    g.ellipse(W / 2, y, W * 0.07, H * 0.18, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  } else {
    g.moveTo(x0 + W * 0.05, y); g.lineTo(x1 - W * 0.05, y); g.stroke();
  }
  if (st.fangs && (mouth === 'smile' || mouth === 'flat')) fangs(g, W, y - H * 0.02, H);
}

function fangs(g, W, y, H) {
  g.fillStyle = '#ffffff'; g.strokeStyle = INK; g.lineWidth = H * 0.04;
  for (const x of [W * 0.42, W * 0.58]) {
    g.beginPath(); g.moveTo(x - W * 0.03, y); g.lineTo(x, y + H * 0.22); g.lineTo(x + W * 0.03, y); g.closePath(); g.fill(); g.stroke();
  }
}

// Redraws a face canvas only when the expression changes (or it's animating).
export function faceUpdater(fc, draw) {
  let key = '';
  return (p) => {
    const t = p.t || 0;
    const anim = p.eyes === 'swirl' || (p.eyes === 'open' && t % 3900 < 120);
    const k = `${p.eyes}|${p.mouth}|${anim ? Math.floor(t / 50) : ''}`;
    if (k === key) return false;
    key = k;
    draw(fc.g, fc.c.width, fc.c.height, p.eyes || 'open', p.mouth || 'smile', t);
    fc.tex.needsUpdate = true;
    return true;
  };
}

function armPivot(parent, x, y, z) {
  return group(parent, x, y, z);
}

// shared idle: arms + head bob + tired slump
function baseApply(rig, p) {
  if (rig.armF) rig.armF.rotation.z = -(p.armF ?? -0.2);
  if (rig.armB) rig.armB.rotation.z = -(p.armB ?? 0.25);
  if (rig.head) rig.head.position.y = rig.headY + (p.headBob || 0);
  const tired = p.pose === 'tired';
  rig.root.rotation.z = tired ? 0.12 : 0;
  if (rig.head) rig.head.rotation.z = tired ? -0.18 : 0;
}

// ======================= Battle Rex =======================
function buildRex(flash) {
  const P = maker(flash);
  const root = new THREE.Group();
  const RED = 0xc8202e, RED2 = 0xa21a28, CREAM = 0xf0dcb0, GRAY = 0x9aa3b8, DGRAY = 0x6e7790, YEL = 0xffe08a, CLAW = 0xb81c2a;
  // legs
  for (const z of [-24, 24]) {
    const c = z < 0 ? RED2 : RED;
    root.add(P(ico(1), c, { scale: [24, 30, 18], pos: [-4, 64, z] }));
    root.add(P(box(16, 40, 16), c, { pos: [6, 30, z], rot: [0, 0, 0.2] }));
    root.add(P(box(36, 10, 22), c, { pos: [16, 5, z] }));
    for (const dz of [-7, 0, 7]) root.add(P(cone(4, 12, 4), CLAW, { pos: [36, 5, z + dz], rot: [0, 0, -Math.PI / 2], ink: 1.6 }));
  }
  // tail with stripes
  const tail = group(root, -46, 100, 0);
  const tg = cone(24, 120, 6); tg.rotateZ(Math.PI / 2); tg.translate(-56, 0, 0);
  tail.add(P(tg, RED));
  for (let i = 0; i < 3; i++) tail.add(P(box(5, 6, 30 - i * 6), 0x2b2f3a, { pos: [-28 - i * 22, 10 - i * 2, 0], rot: [0, 0, 0.25], ink: false }));
  tail.rotation.z = 0.18;
  // body + belly + claw marks
  root.add(P(ico(1), RED, { scale: [58, 46, 44], pos: [0, 100, 0], rot: [0, 0, 0.35] }));
  root.add(P(ico(1), CREAM, { scale: [36, 34, 34], pos: [26, 94, 10], ink: 2 }));
  for (let i = 0; i < 3; i++) root.add(P(box(3, 22, 2), 0x2e9e44, { pos: [-12 + i * 7, 76, 38], rot: [0, 0, 0.5], ink: false }));
  // armor harness
  root.add(P(box(46, 12, 58), GRAY, { pos: [6, 128, 0], rot: [0, 0, 0.35], shiny: true }));
  for (const z of [-30, 30]) root.add(P(box(30, 34, 6), GRAY, { pos: [4, 112, z], rot: [0, 0, 0.3], shiny: true, ink: 2 }));
  // tiny arms
  const arm = (z) => {
    const pv = armPivot(root, 44, 112, z);
    pv.add(P(box(10, 22, 10), z > 0 ? RED : RED2, { pos: [0, -11, 0] }));
    for (const dz of [-3, 3]) pv.add(P(cone(2.5, 8, 4), CLAW, { pos: [3, -25, dz], rot: [0, 0, Math.PI], ink: 1 }));
    return pv;
  };
  const armB = arm(-22), armF = arm(22);
  // head
  const head = group(root, 50, 138, 0);
  head.add(P(ico(1), RED, { scale: [36, 26, 30], pos: [18, 12, 0] }));
  head.add(P(box(40, 20, 30), RED, { pos: [44, 6, 0] }));
  for (let i = 0; i < 5; i++) head.add(P(cone(2.6, 8, 4), YEL, { pos: [30 + i * 8, -5, 15], rot: [Math.PI, 0, 0], ink: 1 }));
  for (let i = 0; i < 5; i++) head.add(P(cone(2.6, 8, 4), YEL, { pos: [30 + i * 8, -5, -15], rot: [Math.PI, 0, 0], ink: 1 }));
  const jaw = group(head, 18, -6, 0);
  const jg = box(46, 10, 26); jg.translate(23, -5, 0);
  jaw.add(P(jg, RED));
  jaw.add(P(box(40, 3, 20), 0x7a1426, { pos: [24, 0.5, 0], ink: false }));
  for (let i = 0; i < 4; i++) jaw.add(P(cone(2.4, 7, 4), YEL, { pos: [16 + i * 9, 3, 12], ink: 1 }));
  for (let i = 0; i < 4; i++) jaw.add(P(cone(2.4, 7, 4), YEL, { pos: [16 + i * 9, 3, -12], ink: 1 }));
  // helmet
  head.add(P(box(48, 16, 38), GRAY, { pos: [16, 28, 0], shiny: true }));
  head.add(P(box(32, 10, 10), GRAY, { pos: [20, 40, 0], shiny: true, ink: 2 }));
  for (const z of [-17, 17]) head.add(P(cone(6, 22, 4), GRAY, { pos: [-6, 34, z], rot: [0, 0, 1.0], ink: 2 }));
  head.add(P(cyl(9, 9, 12, 8), DGRAY, { pos: [-4, 44, 0], ink: 2 }));
  // eyes (under the helmet brow)
  const eyes = decal(head, 34, 16, 128, 60, [38.5, 22, 0]);
  const updEyes = faceUpdater(eyes, (g, W, H, e, m, t) => paintEyes(g, W, H, e, { iris: '#7A4A20', lid: '#C8202E', brow: INK, size: H * 0.32, gap: W * 0.27 }, t));
  // back cannon (swings forward for the special)
  const cannon = group(root, -14, 134, 0);
  cannon.add(P(box(20, 14, 20), DGRAY, { pos: [0, 4, 0] }));
  const barrel = group(cannon, 0, 16, 0);
  const bg = cyl(10, 12, 64, 8); bg.rotateZ(-Math.PI / 2); bg.translate(28, 0, 0);
  barrel.add(P(bg, GRAY, { shiny: true }));
  barrel.add(P(cyl(13, 13, 10, 8), DGRAY, { pos: [60, 0, 0], rot: [0, 0, Math.PI / 2] }));
  barrel.add(P(box(12, 6, 12), 0xf02a2a, { pos: [10, 12, 0], ink: 1.4 }));
  const muzzleLocal = new THREE.Vector3(68, 0, 0);
  const rig = { root, head, headY: 138, armF, armB, anchors: { head: new THREE.Vector3(70, 150, 0), top: new THREE.Vector3(40, 196, 0), center: new THREE.Vector3(12, 100, 0), muzzle: new THREE.Vector3() }, headR: 58 };
  rig.apply = (p) => {
    baseApply(rig, p);
    updEyes(p);
    jaw.rotation.z = { open: -0.62, o: -0.35, grit: -0.1, smile: -0.16, flat: -0.05 }[p.mouth || 'smile'] ?? -0.16;
    tail.rotation.y = Math.sin((p.t || 0) / 420) * 0.12;
    const c = p.cannon || 0;
    barrel.rotation.z = 0.85 * (1 - c) + 0.02 * c;
    cannon.updateMatrix(); barrel.updateMatrix();
    rig.anchors.muzzle.copy(muzzleLocal).applyMatrix4(barrel.matrix).applyMatrix4(cannon.matrix);
  };
  return rig;
}

// ======================= Spooky Tree =======================
function buildTree(flash) {
  const P = maker(flash);
  const root = new THREE.Group();
  const BARK = 0x2b2b36, BARK2 = 0x22222c, GLOW = 0xff8a1f;
  root.add(P(cyl(46, 74, 44, 7), BARK2, { pos: [0, 22, 0] }));
  root.add(P(cyl(34, 46, 150, 7), BARK, { pos: [0, 110, 0] }));
  root.add(P(cone(20, 56, 5), BARK, { pos: [6, 206, 0], rot: [0, 0, -0.15] }));
  root.add(P(cone(12, 32, 5), BARK, { pos: [-22, 194, 10], rot: [0, 0, 0.4] }));
  root.add(P(cone(10, 26, 5), BARK, { pos: [22, 192, -12], rot: [0, 0, -0.5] }));
  // glowing cracks
  const glow = glowMat(GLOW);
  for (const [x, y, z, r, h] of [[34, 70, 14, 0.3, 30], [18, 54, 36, -0.2, 26], [-6, 92, 38, 0.15, 24], [30, 150, -20, -0.3, 20], [-30, 40, 30, 0.2, 22]]) {
    const m = new THREE.Mesh(box(4, h, 4), glow);
    m.position.set(x, y, z); m.rotation.z = r;
    m.lookAt(x * 2, y, z * 2); m.rotateZ(r);
    root.add(m);
  }
  // branch arms
  const branch = (z, back) => {
    const pv = armPivot(root, 6, 138, z);
    const c = back ? BARK2 : BARK;
    const a = cyl(6, 9, 56, 5); a.translate(0, -26, 0);
    pv.add(P(a, c));
    const f1 = cyl(4, 6, 30, 5); f1.translate(0, -15, 0);
    pv.add(P(f1, c, { pos: [0, -50, 0], rot: [0, 0, 0.6] }));
    const f2 = cyl(4, 6, 26, 5); f2.translate(0, -13, 0);
    pv.add(P(f2, c, { pos: [0, -48, 0], rot: [0, 0, -0.5] }));
    return pv;
  };
  const armB = branch(-40, true), armF = branch(40, false);
  // carved, glowing face (no separate head: the trunk is the face)
  const head = group(root, 0, 0, 0);
  const face = decal(head, 60, 60, 160, 160, [35.2, 132, 0]);
  const updFace = faceUpdater(face, (g, W, H, e, m, t) => {
    g.clearRect(0, 0, W, H);
    g.save(); g.scale(1, 0.55);
    paintEyes(g, W, H, e, { glow: '#FF8A1F', size: H * 0.16, gap: W * 0.2 }, t);
    g.restore();
    g.save(); g.translate(0, H * 0.48); g.scale(1, 0.45);
    paintMouth(g, W, H, m === 'smile' ? 'open' : m, { inside: '#FF8A1F', line: '#FF8A1F' });
    g.restore();
  });
  const rig = { root, head, headY: 0, armF, armB, anchors: { head: new THREE.Vector3(30, 132, 0), top: new THREE.Vector3(0, 230, 0), center: new THREE.Vector3(0, 104, 0) }, headR: 62 };
  rig.apply = (p) => {
    baseApply(rig, p);
    head.position.y = 0;
    updFace(p);
  };
  return rig;
}

// ======================= Ragin' Rockfish =======================
function buildRockfish(flash) {
  const P = maker(flash);
  const root = new THREE.Group();
  const SILVER = 0xc9ced6, WHITE = 0xeef0f2, STRIPE = 0x2b2f3a, BLUE = 0x1b4fd8, ORANGE = 0xf46036, FIN = 0x8a8f78, GRAY = 0x6e7790;
  // legs, armored shins, fin feet
  for (const z of [-22, 22]) {
    root.add(P(ico(1), WHITE, { scale: [15, 22, 15], pos: [0, 66, z] }));
    root.add(P(box(26, 34, 26), BLUE, { pos: [2, 30, z], shiny: true }));
    root.add(P(box(6, 14, 12), ORANGE, { pos: [16, 34, z], ink: 1.6 }));
    root.add(P(cone(14, 30, 4), FIN, { pos: [14, 6, z], rot: [0, 0, -Math.PI / 2], scale: [1, 1, 0.45] }));
  }
  // tail fin
  root.add(P(cone(18, 44, 4), FIN, { pos: [-38, 44, 0], rot: [0, 0, 2.3], scale: [1, 1, 0.3] }));
  // torso with stripes on the back
  root.add(P(ico(1), SILVER, { scale: [40, 46, 38], pos: [0, 104, 0] }));
  root.add(P(ico(1), WHITE, { scale: [26, 36, 30], pos: [18, 98, 8], ink: 2 }));
  for (let i = 0; i < 4; i++) root.add(P(box(6, 4, 52), STRIPE, { pos: [-28, 128 - i * 14, 0], rot: [0, 0, 0.5], ink: false }));
  // belt + harness
  root.add(P(box(50, 10, 46), BLUE, { pos: [0, 70, 0], shiny: true }));
  root.add(P(box(8, 10, 14), ORANGE, { pos: [26, 70, 0], ink: 1.4 }));
  for (const z of [-16, 16]) root.add(P(box(8, 56, 8), BLUE, { pos: [22, 110, z], rot: [0, 0, -0.1], ink: 1.8 }));
  root.add(P(box(10, 12, 16), ORANGE, { pos: [30, 104, 0], ink: 1.6 }));
  // dorsal crest + side fins
  for (let i = 0; i < 5; i++) root.add(P(cone(7, 30 - i * 3, 4), FIN, { pos: [-6 - i * 9, 170 - i * 9, 0], rot: [0, 0, 0.35 + i * 0.12], scale: [1, 1, 0.35], ink: 1.6 }));
  for (const z of [-40, 40]) root.add(P(cone(10, 30, 4), FIN, { pos: [-14, 118, z], rot: [0, 0, 1.9], scale: [1, 1, 0.35], ink: 1.6 }));
  // head
  const head = group(root, 18, 146, 0);
  head.add(P(ico(1), SILVER, { scale: [34, 30, 30], pos: [4, 0, 0] }));
  head.add(P(ico(1), WHITE, { scale: [22, 16, 24], pos: [18, -12, 0], ink: 2 }));
  const jaw = group(head, 14, -16, 0);
  const jg = box(24, 8, 26); jg.translate(10, -4, 0);
  jaw.add(P(jg, WHITE));
  jaw.add(P(box(18, 3, 20), 0x8a2a3a, { pos: [12, 0.5, 0], ink: false }));
  const eyes = decal(head, 34, 16, 128, 60, [34.2, 6, 0]);
  const updEyes = faceUpdater(eyes, (g, W, H, e, m, t) => paintEyes(g, W, H, e, { iris: '#FFC914', lid: '#C9CED6', brow: STRIPE ? '#2B2F3A' : INK, size: H * 0.32, gap: W * 0.27 }, t));
  // arms with big gauntlets
  const arm = (z, back) => {
    const pv = armPivot(root, 0, 128, z);
    pv.add(P(ico(1), back ? SILVER : WHITE, { scale: [12, 18, 12], pos: [0, -14, 0] }));
    pv.add(P(box(28, 32, 28), BLUE, { pos: [0, -42, 0], shiny: true }));
    pv.add(P(box(6, 10, 30), ORANGE, { pos: [0, -32, 0], ink: 1.4 }));
    pv.add(P(box(20, 14, 20), GRAY, { pos: [2, -62, 0] }));
    return pv;
  };
  const armB = arm(-46, true), armF = arm(46, false);
  // twin shoulder cannons
  const muzzles = [];
  const cannons = [-28, 28].map((z) => {
    const pv = group(root, -16, 150, z);
    const bg = cyl(11, 11, 54, 8); bg.rotateZ(-Math.PI / 2); bg.translate(22, 0, 0);
    pv.add(P(bg, BLUE, { shiny: true }));
    pv.add(P(cyl(12.5, 12.5, 6, 8), ORANGE, { pos: [10, 0, 0], rot: [0, 0, Math.PI / 2], ink: 1.4 }));
    pv.add(P(cyl(12.5, 12.5, 8, 8), GRAY, { pos: [48, 0, 0], rot: [0, 0, Math.PI / 2] }));
    const v = new THREE.Vector3();
    muzzles.push(v);
    return pv;
  });
  const tipLocal = new THREE.Vector3(54, 0, 0);
  const rig = { root, head, headY: 146, armF, armB, anchors: { head: new THREE.Vector3(26, 146, 0), top: new THREE.Vector3(0, 196, 0), center: new THREE.Vector3(4, 104, 0), muzzle: muzzles[1], muzzle2: muzzles[0] }, headR: 56 };
  rig.apply = (p) => {
    baseApply(rig, p);
    updEyes(p);
    jaw.rotation.z = { open: -0.6, o: -0.35, grit: -0.08, smile: -0.04, flat: 0 }[p.mouth || 'smile'] ?? 0;
    const c = p.cannon || 0;
    cannons.forEach((pv, i) => {
      pv.rotation.z = 0.95 * (1 - c) + 0.05 * c;
      pv.updateMatrix();
      muzzles[i].copy(tipLocal).applyMatrix4(pv.matrix);
    });
  };
  return rig;
}

// ======================= Young Arthur =======================
function buildArthur(flash) {
  const P = maker(flash);
  const root = new THREE.Group();
  const BLUE = 0x2448c8, GOLD = 0xffc914, RED = 0xd7263d, CREAM = 0xe8dcc2, BROWN = 0x7a4a2a, SKIN = 0xf2c49b, HAIR = 0xe0b04a;
  for (const z of [-13, 13]) {
    root.add(P(cyl(7, 7, 44, 6), CREAM, { pos: [0, 56, z] }));
    root.add(P(box(22, 30, 22), BROWN, { pos: [2, 16, z] }));
    root.add(P(box(14, 10, 20), BROWN, { pos: [14, 5, z] }));
  }
  // cape (behind)
  const cape = P(box(6, 84, 62), RED, { pos: [-24, 90, 0], rot: [0, 0, 0.12] });
  root.add(cape);
  // tunic, belt, trims
  root.add(P(cyl(24, 32, 62, 8), BLUE, { pos: [0, 98, 0], scale: [1, 1, 0.82] }));
  root.add(P(cyl(32.5, 32.5, 4, 8), GOLD, { pos: [0, 69, 0], scale: [1, 1, 0.82], ink: 1.2 }));
  root.add(P(box(52, 8, 44), BROWN, { pos: [0, 86, 0], ink: 1.6 }));
  root.add(P(box(4, 10, 12), GOLD, { pos: [27, 86, 0], shiny: true, ink: 1.2 }));
  root.add(P(box(4, 40, 4), GOLD, { pos: [26, 108, 0], ink: false }));
  root.add(P(cyl(26, 22, 12, 8), RED, { pos: [-2, 128, 0], scale: [1, 1, 0.9] }));
  root.add(P(ico(1), GOLD, { scale: [6, 6, 4], pos: [22, 126, 0], shiny: true, ink: 1.4 }));
  // scabbard at the hip
  root.add(P(box(6, 40, 6), BROWN, { pos: [8, 64, 28], rot: [0, 0, -0.35], ink: 1.6 }));
  // head
  const head = group(root, 2, 150, 0);
  head.add(P(ico(1), SKIN, { scale: [24, 25, 24], pos: [0, 0, 0] }));
  for (const z of [-23, 23]) head.add(P(ico(0), SKIN, { scale: [5, 7, 4], pos: [-2, -2, z], ink: 1.4 }));
  const spikes = [[0, 22, 0], [-10, 18, 14], [-10, 18, -14], [8, 18, 14], [8, 18, -14], [-20, 8, 0], [-16, 10, 18], [-16, 10, -18], [14, 14, 0], [-4, 24, 8], [-4, 24, -8]];
  for (const [x, y, z] of spikes) head.add(P(cone(9, 22, 4), HAIR, { pos: [x, y, z], rot: [z * 0.03, 0, -x * 0.03 + (x > 8 ? -0.5 : 0)], ink: 1.6 }));
  head.add(P(ico(1), HAIR, { scale: [24, 14, 24], pos: [-4, 12, 0], ink: 1.6 }));
  const circ = new THREE.TorusGeometry(24.5, 2.6, 4, 14); circ.rotateX(Math.PI / 2);
  head.add(P(circ, GOLD, { pos: [0, 12, 0], shiny: true, ink: 1.2 }));
  head.add(P(new THREE.OctahedronGeometry(5), 0x1b4fd8, { pos: [25, 14, 0], scale: [0.6, 1.2, 1], shiny: true, ink: 1.2 }));
  const face = decal(head, 34, 28, 160, 132, [24.6, -3, 0]);
  const updFace = faceUpdater(face, (g, W, H, e, m, t) => {
    g.clearRect(0, 0, W, H);
    g.save(); g.scale(1, 0.62); paintEyes(g, W, H, e, { iris: '#3A6FD8', lid: '#F2C49B', brow: '#A0702A', size: H * 0.2, gap: W * 0.22 }, t); g.restore();
    g.save(); g.translate(0, H * 0.55); g.scale(1, 0.4); paintMouth(g, W, H, m, { inside: '#9A2E3A' }); g.restore();
  });
  // arms; the front hand holds the sword
  const arm = (z, back) => {
    const pv = armPivot(root, 0, 122, z);
    pv.add(P(ico(1), BLUE, { scale: [9, 12, 9], pos: [0, -6, 0] }));
    pv.add(P(cyl(5.5, 5.5, 26, 6), CREAM, { pos: [0, -24, 0] }));
    pv.add(P(cyl(7.5, 7.5, 14, 6), BROWN, { pos: [0, -34, 0], ink: 1.6 }));
    pv.add(P(ico(1), SKIN, { scale: [6, 6, 6], pos: [0, -44, 0], ink: 1.6 }));
    return pv;
  };
  const armB = arm(-30, true), armF = arm(30, false);
  const sword = group(armF, 0, -44, 0);
  const blade = box(4, 70, 9); blade.translate(0, 40, 0);
  sword.add(P(blade, 0xdde6f2, { shiny: true, ink: 1.4 }));
  sword.add(P(box(6, 5, 26), GOLD, { pos: [0, 4, 0], shiny: true, ink: 1.2 }));
  sword.add(P(box(5, 12, 5), BROWN, { pos: [0, -5, 0], ink: 1.2 }));
  sword.rotation.z = -1.25;
  const rig = { root, head, headY: 150, armF, armB, anchors: { head: new THREE.Vector3(4, 150, 0), top: new THREE.Vector3(0, 186, 0), center: new THREE.Vector3(0, 100, 0) }, headR: 46 };
  rig.apply = (p) => {
    baseApply(rig, p);
    updFace(p);
    cape.rotation.z = 0.12 + Math.sin((p.t || 0) / 500) * 0.05 + (p.fly ? 0.3 : 0);
  };
  return rig;
}

// ======================= Wanda Wickwhistle (original witch) =======================
function buildWitch(flash) {
  const P = maker(flash);
  const root = new THREE.Group();
  const PURPLE = 0x6a3fa0, DPURP = 0x3a2468, SKIN = 0xf5c7a9, TEAL = 0x33afa4, ORANGE = 0xf46036, GOLD = 0xffc914, BLACK = 0x2b2735, BROWN = 0x8a5a3c, STRAW = 0xe0b95a;
  // striped stockings + curly boots
  for (const z of [-11, 11]) {
    for (let i = 0; i < 4; i++) root.add(P(cyl(6, 6, 8, 6), i % 2 ? ORANGE : BLACK, { pos: [0, 22 + i * 8, z], ink: i === 0 || i === 3 ? 1.4 : false }));
    root.add(P(box(20, 12, 14), BLACK, { pos: [4, 8, z] }));
    root.add(P(cone(5, 16, 4), BLACK, { pos: [18, 12, z], rot: [0, 0, -1.1], ink: 1.4 }));
  }
  // dress with stars
  root.add(P(cyl(14, 40, 78, 8), PURPLE, { pos: [0, 82, 0] }));
  const starG = new THREE.ExtrudeGeometry((() => {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 2.4 : 6, a = -Math.PI / 2 + (i * Math.PI) / 5; const x = Math.cos(a) * r, y = -Math.sin(a) * r; i ? s.lineTo(x, y) : s.moveTo(x, y); }
    s.closePath(); return s;
  })(), { depth: 2, bevelEnabled: false });
  for (const [x, y, z, ry] of [[24, 70, 22, 0.8], [8, 94, 26, 0.3], [30, 54, 4, 1.4], [-6, 62, 36, 0]]) root.add(P(starG, GOLD, { pos: [x, y, z], rot: [0, ry, 0], ink: 1, shiny: true }));
  root.add(P(box(30, 8, 30), DPURP, { pos: [0, 120, 0], ink: 1.6 }));
  // head, curls, hat
  const head = group(root, 2, 140, 0);
  head.add(P(ico(1), SKIN, { scale: [22, 22, 22] }));
  head.add(P(ico(0), SKIN, { scale: [7, 6, 6], pos: [22, -2, 0], ink: 1.4 }));
  for (const [x, y, z] of [[-8, -4, 20], [-8, -4, -20], [-16, 0, 14], [-16, 0, -14], [-18, -12, 8], [-18, -12, -8], [-4, -14, 22], [-4, -14, -22]]) head.add(P(ico(1), TEAL, { scale: [8, 8, 8], pos: [x, y, z], ink: 1.4 }));
  head.add(P(cyl(44, 44, 4, 12), DPURP, { pos: [0, 14, 0], ink: 1.8 }));
  head.add(P(cyl(18, 24, 10, 10), ORANGE, { pos: [0, 21, 0], ink: 1.6 }));
  head.add(P(box(4, 8, 8), GOLD, { pos: [22, 21, 0], shiny: true, ink: 1.2 }));
  head.add(P(cone(22, 50, 8), PURPLE, { pos: [-2, 50, 0] }));
  head.add(P(cone(10, 30, 6), PURPLE, { pos: [-14, 80, 0], rot: [0, 0, 1.0] }));
  const face = decal(head, 30, 26, 160, 140, [21.6, -3, 0]);
  const updFace = faceUpdater(face, (g, W, H, e, m, t) => {
    g.clearRect(0, 0, W, H);
    g.save(); g.scale(1, 0.6); paintEyes(g, W, H, e, { iris: '#C8811A', lid: '#F5C7A9', brow: '#1F7A7A', size: H * 0.21, gap: W * 0.22 }, t); g.restore();
    g.fillStyle = 'rgba(255,110,140,.55)';
    for (const x of [W * 0.16, W * 0.84]) { g.beginPath(); g.ellipse(x, H * 0.62, W * 0.08, H * 0.06, 0, 0, Math.PI * 2); g.fill(); }
    g.save(); g.translate(0, H * 0.56); g.scale(1, 0.4); paintMouth(g, W, H, m, { inside: '#7A2040' }); g.restore();
  });
  // arms; the back hand holds her broom
  const arm = (z, back) => {
    const pv = armPivot(root, 0, 122, z);
    const sl = cyl(6, 11, 30, 6); sl.translate(0, -15, 0);
    pv.add(P(sl, back ? DPURP : PURPLE));
    pv.add(P(ico(1), SKIN, { scale: [6, 6, 6], pos: [0, -34, 0], ink: 1.4 }));
    return pv;
  };
  const armB = arm(-24, true), armF = arm(24, false);
  const broom = group(armB, 0, -34, 0);
  broom.add(P(cyl(2.2, 2.2, 110, 5), BROWN, { pos: [0, 10, 0], ink: 1.2 }));
  broom.add(P(cone(10, 30, 7), STRAW, { pos: [0, -54, 0], rot: [Math.PI, 0, 0], ink: 1.4 }));
  broom.rotation.z = 0.3;
  const rig = { root, head, headY: 140, armF, armB, anchors: { head: new THREE.Vector3(6, 142, 0), top: new THREE.Vector3(-10, 226, 0), center: new THREE.Vector3(0, 96, 0) }, headR: 44 };
  rig.apply = (p) => { baseApply(rig, p); updFace(p); };
  return rig;
}

// ======================= Gloomwing (original night creature) =======================
function buildNightwing(flash) {
  const P = maker(flash);
  const root = new THREE.Group();
  const NIGHT = 0x3b2f7a, NIGHT2 = 0x2c2360, BELLY = 0xb9a6ff, PINK = 0xe07ab0, WING = 0x6a3fa0, CLAW = 0xe8e0ff;
  for (const z of [-20, 20]) {
    root.add(P(ico(1), z < 0 ? NIGHT2 : NIGHT, { scale: [16, 20, 16], pos: [0, 22, z] }));
    for (const dz of [-6, 0, 6]) root.add(P(cone(3, 10, 4), CLAW, { pos: [16, 4, z + dz], rot: [0, 0, -Math.PI / 2], ink: 1 }));
  }
  root.add(P(cone(6, 34, 4), NIGHT2, { pos: [-46, 40, 0], rot: [0, 0, 2.1] }));
  root.add(P(ico(1), NIGHT, { scale: [50, 56, 46], pos: [0, 86, 0] }));
  root.add(P(ico(1), BELLY, { scale: [28, 38, 32], pos: [24, 80, 8], ink: 2 }));
  // starry belly specks
  for (const [x, y, z] of [[44, 92, 18], [40, 70, 24], [48, 80, 4], [36, 100, 26]]) {
    const s = new THREE.Mesh(new THREE.OctahedronGeometry(2.2), glowMat(0xfff6c8)); s.position.set(x, y, z); root.add(s);
  }
  // head is the top of the body; ears + tufts
  const head = group(root, 0, 0, 0);
  for (const z of [-20, 20]) {
    head.add(P(cone(11, 44, 4), NIGHT, { pos: [-4, 152, z], rot: [z * 0.012, 0, 0.12] }));
    head.add(P(cone(6, 28, 4), PINK, { pos: [0, 150, z * 1.08], rot: [z * 0.012, 0, 0.12], ink: false }));
  }
  head.add(P(cone(6, 16, 4), NIGHT, { pos: [10, 144, 0], rot: [0, 0, -0.3], ink: 1.6 }));
  const face = decal(head, 52, 46, 180, 160, [46.6, 108, 0]);
  const updFace = faceUpdater(face, (g, W, H, e, m, t) => {
    g.clearRect(0, 0, W, H);
    g.save(); g.scale(1, 0.62); paintEyes(g, W, H, e, { iris: '#FFC914', sclera: '#FFF6C8', lid: '#3B2F7A', brow: '#1C1540', size: H * 0.26, gap: W * 0.22 }, t); g.restore();
    g.save(); g.translate(0, H * 0.52); g.scale(1, 0.42); paintMouth(g, W, H, m, { inside: '#5E1530', fangs: true }); g.restore();
  });
  // wings are its arms
  const wing = (z, back) => {
    const pv = armPivot(root, -6, 118, z);
    const c = back ? NIGHT2 : NIGHT;
    const bone = cyl(4, 5, 46, 5); bone.translate(0, -23, 0);
    pv.add(P(bone, c, { ink: 2 }));
    for (const [a, len] of [[0.5, 44], [0.95, 40], [1.4, 34]]) {
      const f = cyl(2.2, 3, len, 4); f.translate(0, -len / 2, 0);
      pv.add(P(f, c, { pos: [0, -44, 0], rot: [0, 0, a], ink: 1.4 }));
    }
    // membrane between the fingers
    const pts = [[0, 0], [0, -44]];
    for (const [a, len] of [[0.5, 44], [0.95, 40], [1.4, 34]]) pts.push([Math.sin(a) * len, -44 - Math.cos(a) * len]);
    const pos = [];
    const add = (p, q, r) => pos.push(p[0], p[1], 0, q[0], q[1], 0, r[0], r[1], 0);
    add(pts[0], pts[1], pts[2]); add(pts[1], pts[2], pts[3]); add(pts[1], pts[3], pts[4]); add(pts[0], pts[2], [20, -20]);
    const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const mm = new THREE.Mesh(mg, toonMat(WING, { flash })); mm.material.side = THREE.DoubleSide;
    pv.add(mm);
    return pv;
  };
  const armB = wing(-46, true), armF = wing(46, false);
  const rig = { root, head, headY: 0, armF, armB, anchors: { head: new THREE.Vector3(30, 116, 0), top: new THREE.Vector3(0, 180, 0), center: new THREE.Vector3(6, 88, 0) }, headR: 60 };
  rig.apply = (p) => {
    baseApply(rig, p);
    head.position.y = p.headBob || 0;
    updFace(p);
    if (p.fly) {
      const f = Math.sin((p.t || 0) / 70) * 0.7;
      armF.rotation.z = -1.8 + f; armB.rotation.z = -1.8 + f;
    }
  };
  return rig;
}

export const ROSTER_BUILDERS = {
  rex: buildRex, tree: buildTree, rockfish: buildRockfish, arthur: buildArthur, witch: buildWitch, nightwing: buildNightwing,
};
