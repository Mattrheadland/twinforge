// Low-poly 3D rigs for the placeholder toys (STYLE_GUIDE v5).
// Units match the 2D layout (a toy is about 190 tall), feet at y = 0, the toy
// faces +x and its "camera side" is +z. Each rig reads the same pose values the
// battle choreography already animates (arms, head bob, antenna, tail, face).
import * as THREE from 'three';
import { toonMat, glowMat, part, inked } from './toon.js';
import { ROSTER_BUILDERS } from './roster-rigs.js';
import { buildRoo, buildBass } from './family-rigs.js';
import { buildModelRig, modelId, hasModel } from './models.js';

const C = {
  red: 0xd7263d, blue: 0x2456e0, yellow: 0xffc914, boot: 0x2a2f55, head: 0x4ea8de, steel: 0xc4cad8,
  dino: 0x2e9e44, dinoDark: 0x237f37, belly: 0xf2d07c, spike: 0xf46036, claw: 0xfff3d6,
};

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const ball = (r, detail = 1) => new THREE.IcosahedronGeometry(r, detail);
const lowSphere = (r, ws = 9, hs = 7) => new THREE.SphereGeometry(r, ws, hs);

function star(outer, inner, depth) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer, a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = Math.cos(a) * r, y = -Math.sin(a) * r;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
  g.translate(0, 0, -depth / 2);
  return g;
}

// ---------- face canvases ----------
function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return { c, g: c.getContext('2d'), tex };
}

const INK = '#14111A';

function screenFace(g, w, h, eyes, mouth, t) {
  g.clearRect(0, 0, w, h);
  g.fillStyle = '#0E1630';
  g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(160,220,255,.16)';
  g.beginPath(); g.moveTo(0, h * 0.62); g.lineTo(w * 0.34, 0); g.lineTo(w * 0.5, 0); g.lineTo(0, h * 0.95); g.closePath(); g.fill();
  const col = eyes === 'angry' ? '#FF5A4A' : '#5FF2FF';
  g.fillStyle = col; g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round';
  g.shadowColor = col; g.shadowBlur = 8;
  const blink = eyes === 'open' && t % 3600 < 120;
  const cy = h * 0.42, gap = w * 0.36;
  for (const side of [-1, 1]) {
    const x = w / 2 + (side * gap) / 2;
    const inner = -side;
    g.lineWidth = w * 0.06;
    g.beginPath();
    if (eyes === 'open' || eyes === 'angry') {
      if (blink) { g.moveTo(x - 8, cy + 3); g.lineTo(x + 8, cy + 3); g.stroke(); }
      else {
        const tilt = eyes === 'angry' ? 13 : 7;
        const yl = inner < 0 ? cy - 13 + tilt : cy - 13, yr = inner < 0 ? cy - 13 : cy - 13 + tilt;
        g.moveTo(x - 9, yl); g.lineTo(x + 9, yr); g.lineTo(x + 9, cy + 12); g.lineTo(x - 9, cy + 12); g.closePath(); g.fill();
      }
    } else if (eyes === 'happy') { g.moveTo(x - 10, cy + 6); g.lineTo(x, cy - 7); g.lineTo(x + 10, cy + 6); g.stroke(); }
    else if (eyes === 'squint') { g.moveTo(x - 9 * inner, cy - 10); g.lineTo(x + 9 * inner, cy); g.lineTo(x - 9 * inner, cy + 10); g.stroke(); }
    else if (eyes === 'closed') { g.moveTo(x - 10, cy + 3); g.lineTo(x + 10, cy + 3); g.stroke(); }
    else if (eyes === 'swirl') {
      for (let a = 0; a < 12; a += 0.4) {
        const r = a * 1.1, px = x + Math.cos(a + t / 120) * r, py = cy + Math.sin(a + t / 120) * r;
        a ? g.lineTo(px, py) : g.moveTo(px, py);
      }
      g.lineWidth = 3; g.stroke();
    }
  }
  g.lineWidth = w * 0.045;
  g.beginPath();
  const my = h * 0.76;
  if (mouth === 'smile') { g.moveTo(w * 0.36, my - 2); g.quadraticCurveTo(w * 0.52, my + 9, w * 0.66, my - 6); g.stroke(); }
  else if (mouth === 'open') { g.moveTo(w * 0.36, my - 4); g.lineTo(w * 0.66, my - 4); g.quadraticCurveTo(w * 0.51, my + 16, w * 0.36, my - 4); g.fill(); }
  else if (mouth === 'grit') { g.rect(w * 0.37, my - 7, w * 0.28, 12); g.stroke(); }
  else if (mouth === 'o') { g.arc(w * 0.51, my, 6, 0, Math.PI * 2); g.stroke(); }
  else { g.moveTo(w * 0.4, my); g.lineTo(w * 0.62, my); g.stroke(); }
  g.shadowBlur = 0;
}

// Sphere-decal coordinates: canvas x = u (around the sphere), y = theta (from top).
const U = (phi, w) => (phi / (Math.PI * 2)) * w;
const V = (theta, h) => (theta / Math.PI) * h;

function dinoEyes(g, w, h, eyes, t) {
  g.clearRect(0, 0, w, h);
  const blink = eyes === 'open' && t % 4100 < 130;
  const list = [
    { phi: Math.PI - 0.72, th: 1.12, r: 15, near: true },
    { phi: Math.PI - 0.12, th: 1.1, r: 12, near: false },
  ];
  for (const e of list) {
    const x = U(e.phi, w), y = V(e.th, h), rx = e.r, ry = e.r * 1.15;
    g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = INK;
    if (eyes === 'open' || eyes === 'angry') {
      if (blink) { g.lineWidth = 5; g.beginPath(); g.moveTo(x - rx, y); g.lineTo(x + rx, y); g.stroke(); continue; }
      g.fillStyle = '#ffffff'; g.lineWidth = 4;
      g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = INK; g.beginPath(); g.ellipse(x + rx * 0.35, y + 2, rx * 0.42, ry * 0.5, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.fillRect(x + rx * 0.4, y - ry * 0.15, 3, 3);
      // heavy lid in a V (inner ends low) reads determined
      const inner = e.near ? 1 : -1;
      const k = eyes === 'angry' ? 0.62 : 0.42;
      const yIn = y - ry + ry * 2 * k, yOut = y - ry + ry * 2 * k * 0.15;
      const xIn = x + inner * (rx + 2), xOut = x - inner * (rx + 2);
      g.save(); g.beginPath(); g.ellipse(x, y, rx + 1, ry + 1, 0, 0, Math.PI * 2); g.clip();
      g.fillStyle = '#2E9E44';
      g.beginPath(); g.moveTo(xOut, y - ry - 4); g.lineTo(xIn, y - ry - 4); g.lineTo(xIn, yIn); g.lineTo(xOut, yOut); g.closePath(); g.fill();
      g.restore();
      g.lineWidth = 4; g.beginPath(); g.moveTo(xOut, yOut); g.lineTo(xIn, yIn); g.stroke();
      g.lineWidth = 7; g.beginPath(); g.moveTo(xOut - inner * 2, yOut - 8); g.quadraticCurveTo((xIn + xOut) / 2, (yIn + yOut) / 2 - 12, xIn + inner * 3, yIn - 6); g.stroke();
    } else if (eyes === 'happy') {
      g.lineWidth = 5; g.beginPath(); g.arc(x, y + 5, rx * 0.8, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    } else if (eyes === 'squint') {
      g.lineWidth = 5; g.beginPath(); g.moveTo(x - rx * 0.7, y - 7); g.lineTo(x + rx * 0.5, y); g.lineTo(x - rx * 0.7, y + 7); g.stroke();
    } else if (eyes === 'closed') {
      g.lineWidth = 5; g.beginPath(); g.arc(x, y - 3, rx * 0.75, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
    } else if (eyes === 'swirl') {
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill();
      g.lineWidth = 3; g.beginPath();
      for (let a = 0; a < 13; a += 0.4) {
        const r = a * rx * 0.075, px = x + Math.cos(a + t / 110) * r, py = y + Math.sin(a + t / 110) * r;
        a ? g.lineTo(px, py) : g.moveTo(px, py);
      }
      g.stroke();
    }
  }
}

function dinoMouth(g, w, h, mouth) {
  g.clearRect(0, 0, w, h);
  g.fillStyle = INK;
  for (const ph of [Math.PI - 0.12, Math.PI + 0.12]) { g.beginPath(); g.ellipse(U(ph, w), V(0.95, h), 4, 3, 0, 0, Math.PI * 2); g.fill(); }
  const x0 = U(Math.PI - 1.35, w), x1 = U(Math.PI + 0.35, w), y = V(1.78, h);
  g.strokeStyle = INK; g.lineWidth = 5; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath();
  if (mouth === 'smile') {
    g.moveTo(x0, y - 12); g.quadraticCurveTo((x0 + x1) / 2, y + 10, x1, y - 2); g.stroke();
    g.fillStyle = '#fff';
    for (const fx of [0.55, 0.75]) {
      const tx = x0 + (x1 - x0) * fx, ty = y + 2;
      g.beginPath(); g.moveTo(tx - 5, ty - 3); g.lineTo(tx, ty + 9); g.lineTo(tx + 5, ty - 3); g.closePath(); g.fill();
      g.lineWidth = 2; g.stroke();
    }
  } else if (mouth === 'open' || mouth === 'grit') {
    g.fillStyle = '#5E1530';
    g.moveTo(x0, y - 12); g.quadraticCurveTo((x0 + x1) / 2, y + (mouth === 'open' ? 40 : 22), x1, y - 2); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x0 + 10, y - 9); g.lineTo(x1 - 6, y); g.lineTo(x1 - 8, y + 7); g.lineTo(x0 + 12, y - 2); g.closePath(); g.fill();
    g.lineWidth = 2; g.stroke();
  } else if (mouth === 'o') {
    g.fillStyle = '#5E1530'; g.ellipse((x0 + x1) / 2 + 20, y + 4, 9, 8, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  } else { g.moveTo(x0 + 20, y); g.lineTo(x1, y - 3); g.stroke(); }
}

function decalMat(tex) {
  return new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
}

// ---------- Captain Blocko ----------
function buildBlocko(flash) {
  const o = { flash };
  const root = new THREE.Group();
  const T = (c, x = {}) => ({ ink: 3, ...o, ...x, color: c });
  const P = (geo, c, x = {}) => part(geo, c, T(c, x));

  // legs and boots (left/right along z)
  for (const z of [-20, 20]) {
    root.add(P(box(26, 48, 26), C.blue, { pos: [0, 40, z] }));
    root.add(P(box(40, 16, 30), C.boot, { pos: [5, 8, z], shiny: true }));
  }
  // body
  const body = P(box(100, 80, 78), C.red, { pos: [0, 88, 0], shiny: true });
  root.add(body);
  const st = P(star(22, 9, 8), C.yellow, { pos: [50, 90, 6], rot: [0, Math.PI / 2, 0], shiny: true, ink: 1.6 });
  root.add(st);
  for (const [y, z] of [[118, -30], [118, 30], [58, -30], [58, 30]]) root.add(P(box(4, 6, 6), 0xffe08a, { pos: [50, y, z], ink: false }));

  // head (bobs)
  const head = new THREE.Group();
  root.add(head);
  head.add(P(box(82, 66, 78), C.head, { pos: [0, 157, 0], shiny: true }));
  for (const z of [-42, 42]) head.add(P(new THREE.CylinderGeometry(9, 9, 8, 8), C.steel, { pos: [-6, 160, z], rot: [Math.PI / 2, 0, 0], shiny: true, ink: 1.4 }));
  // face screen on the front (+x) face
  const face = canvas(128, 96);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(64, 46), new THREE.MeshBasicMaterial({ map: face.tex }));
  screen.position.set(45.2, 158, 2);
  screen.rotation.y = Math.PI / 2;
  head.add(screen);
  head.add(P(box(4, 52, 72), 0x0b0a1e, { pos: [42.5, 158, 2], ink: 1.2 }));
  // antenna
  const ant = new THREE.Group();
  ant.position.set(0, 190, 0);
  head.add(ant);
  ant.add(P(new THREE.CylinderGeometry(2.4, 2.4, 22, 6), 0x77708a, { pos: [0, 11, 0], ink: 1.2 }));
  const bulbMat = toonMat(C.yellow, { flash, shiny: true });
  const bulb = P(ball(9, 0), C.yellow, { pos: [0, 26, 0], mat: bulbMat, ink: 1.4 });
  ant.add(bulb);

  // arms: shoulder pivots at the body sides; front arm on the camera side (+z)
  const arm = (z) => {
    const pv = new THREE.Group();
    pv.position.set(0, 118, z);
    pv.add(P(box(22, 44, 22), C.blue, { pos: [0, -22, 0] }));
    pv.add(P(ball(15, 1), C.yellow, { pos: [0, -50, 0], shiny: true }));
    root.add(pv);
    return pv;
  };
  const armB = arm(-52), armF = arm(52);

  let faceKey = '';
  return {
    root,
    anchors: { head: new THREE.Vector3(0, 157, 0), top: new THREE.Vector3(0, 226, 0), center: new THREE.Vector3(0, 100, 0) },
    headR: 60,
    apply(p) {
      armF.rotation.z = -(p.armF ?? -0.2);
      armB.rotation.z = -(p.armB ?? 0.25);
      head.position.y = p.headBob || 0;
      ant.rotation.z = -(p.antenna || 0) * 0.03;
      bulbMat.uniforms.uColor.value.set(p.glow ? 0xf46036 : C.yellow);
      const t = p.t || 0;
      const animated = p.eyes === 'swirl' || (p.eyes === 'open' && t % 3600 < 120);
      const key = `${p.eyes}|${p.mouth}|${animated ? Math.floor(t / 50) : ''}`;
      if (key !== faceKey) {
        faceKey = key;
        screenFace(face.g, 128, 96, p.eyes || 'open', p.mouth || 'smile', t);
        face.tex.needsUpdate = true;
      }
      root.rotation.z = p.pose === 'tired' ? 0.12 : 0;
      head.rotation.z = p.pose === 'tired' ? -0.15 : 0;
    },
  };
}

// ---------- Stompy ----------
function buildStompy(flash) {
  const o = { flash };
  const root = new THREE.Group();
  const P = (geo, c, x = {}) => part(geo, c, { ink: 3, ...o, ...x, color: c });

  // tail (sways)
  const tail = new THREE.Group();
  tail.position.set(-40, 52, 0);
  root.add(tail);
  const tg = new THREE.ConeGeometry(30, 92, 6);
  tg.rotateZ(Math.PI / 2);
  tg.translate(-40, 0, 0);
  tail.add(P(tg, C.dino, { rot: [0, 0, 0.42] }));
  // back arm (behind body)
  const armPivot = (z, color) => {
    const pv = new THREE.Group();
    pv.position.set(26, 104, z);
    const ag = new THREE.CylinderGeometry(9, 11, 36, 6);
    ag.translate(0, -16, 0);
    pv.add(P(ag, color));
    for (const dz of [-5, 0, 5]) pv.add(P(new THREE.ConeGeometry(3, 9, 4), C.claw, { pos: [3, -38, dz], rot: [0, 0, Math.PI], ink: 1 }));
    root.add(pv);
    return pv;
  };
  const armB = armPivot(-44, C.dinoDark);
  // legs
  for (const z of [-28, 28]) {
    const leg = P(lowSphere(1, 8, 6), z < 0 ? C.dinoDark : C.dino, { scale: [27, 20, 23], pos: [-2, 18, z] });
    root.add(leg);
    for (const dz of [-8, 0, 8]) root.add(P(new THREE.ConeGeometry(3.5, 9, 4), C.claw, { pos: [24, 6, z + dz], rot: [0, 0, -Math.PI / 2], ink: 1 }));
  }
  // body + belly
  root.add(P(new THREE.IcosahedronGeometry(1, 1), C.dino, { scale: [58, 62, 52], pos: [0, 76, 0] }));
  root.add(P(new THREE.IcosahedronGeometry(1, 1), C.belly, { scale: [28, 44, 38], pos: [32, 68, 10], ink: 1.6 }));
  // back spikes
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * 0.62 + i * 0.27;
    const sx = Math.cos(a) * 60, sy = 76 + Math.sin(a) * 64;
    root.add(P(new THREE.ConeGeometry(11, 26, 4), C.spike, { pos: [sx, sy, 0], rot: [0, 0, a - Math.PI / 2], ink: 1.6 }));
  }
  // head
  const head = new THREE.Group();
  root.add(head);
  const hs = lowSphere(44, 10, 8);
  const headMesh = P(hs, C.dino, { pos: [28, 142, 0] });
  head.add(headMesh);
  const sn = lowSphere(1, 10, 8);
  const snout = P(sn, C.dino, { scale: [34, 24, 28], pos: [66, 126, 4] });
  head.add(snout);
  // face decals (same geometry, slightly larger)
  const eyesC = canvas(512, 256);
  const eyeDecal = new THREE.Mesh(lowSphere(44.6, 10, 8), decalMat(eyesC.tex));
  eyeDecal.position.copy(headMesh.position);
  head.add(eyeDecal);
  const mouthC = canvas(512, 256);
  const mouthDecal = new THREE.Mesh(sn, decalMat(mouthC.tex));
  mouthDecal.scale.set(34.6, 24.6, 28.6);
  mouthDecal.position.copy(snout.position);
  head.add(mouthDecal);
  // front arm (camera side)
  const armF = armPivot(44, C.dino);

  let eyeKey = '', mouthKey = '';
  return {
    root,
    anchors: { head: new THREE.Vector3(36, 140, 0), top: new THREE.Vector3(30, 192, 0), center: new THREE.Vector3(6, 96, 0) },
    headR: 62,
    apply(p) {
      const t = p.t || 0;
      armF.rotation.z = -(p.armF ?? -0.3);
      armB.rotation.z = -(p.armB ?? 0.3);
      head.position.y = p.headBob || 0;
      tail.rotation.y = Math.sin(t / 380) * 0.12 + (p.tail || 0);
      const anim = p.eyes === 'swirl' || (p.eyes === 'open' && t % 4100 < 130);
      const ek = `${p.eyes}|${anim ? Math.floor(t / 50) : ''}`;
      if (ek !== eyeKey) { eyeKey = ek; dinoEyes(eyesC.g, 512, 256, p.eyes || 'open', t); eyesC.tex.needsUpdate = true; }
      if (p.mouth !== mouthKey) { mouthKey = p.mouth; dinoMouth(mouthC.g, 512, 256, p.mouth || 'smile'); mouthC.tex.needsUpdate = true; }
      root.rotation.z = p.pose === 'tired' ? 0.14 : 0;
      head.rotation.z = p.pose === 'tired' ? -0.2 : 0;
    },
  };
}

const BUILDERS = { blocko: buildBlocko, stompy: buildStompy, ...ROSTER_BUILDERS, roo: buildRoo, bass: buildBass };

// Returns { root, apply(pose), anchors, headR, flash } for a character def.
// Uses the imported model when it's loaded (models.js); otherwise the
// code-built toy. A code rig that's waiting on a model says so in
// `wantsModel`, and the stage swaps it in once the model arrives.
export function buildRig(def) {
  const flash = { value: 0 };
  let rig = null;
  try {
    rig = buildModelRig(def, flash);
  } catch (e) {
    console.warn('model rig failed, using the built-in toy', e);
  }
  if (!rig) {
    rig = (BUILDERS[def.art?.draw] || buildBlocko)(flash);
    const id = modelId(def);
    if (hasModel(id)) rig.wantsModel = id;
  }
  rig.flash = flash;
  return rig;
}

export { inked };
