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


// v6 (Founder, 2026-10-16): "each of the new 4 needs a unique body shape and build".
// Astra's sheets drew all four on one blocky template; these rigs keep each costume but
// give every toy its own body plan, checked with scripts/silhouette-sheet.mjs:
// (body shapes from the Founder's references; outfits and colours from the poster):
//   Crookhook        stocky, broad-chested pirate on short sturdy legs, long open coat
//   Jack-Knife       very tall and thin, legs over half his height, long spidery arms
//   Wolfgang         lean, muscular upright wolf on long reverse-jointed legs, long arms
//   Galactic Hunter  walking fortress: huge spiked pauldrons, small sunken helmet, wide stance

const UP = new THREE.Vector3(0, 1, 0);
// a tapered limb from point a to point b (local to `parent`)
function seg(P, parent, a, b, r0, r1, color, o = {}) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const d = new THREE.Vector3().subVectors(B, A);
  const m = P(cyl(r1, r0, d.length(), o.sides || 6), color, { ink: o.ink, shiny: o.shiny });
  m.position.copy(A).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(UP, d.normalize());
  parent.add(m);
  return m;
}
// rig-space position of a point given in some part's local space (root is identity at build)
function anchorAt(root, obj, x = 0, y = 0, z = 0) {
  root.updateMatrixWorld(true);
  return obj.localToWorld(new THREE.Vector3(x, y, z));
}

// ======================= Capt'n Crookhook =======================
// Body (Founder's reference, 2026-10-16): a stocky, heavy-set pirate. Very broad chest
// and shoulders, thick arms held away from the body, big cuffs and hands, a long coat
// open at the front that flares below the hips, short sturdy legs in a wide stance, big
// boots. Outfit and colours from the poster: teal coat, gold epaulets and cuffs, red
// sash, cream shirt, big black tricorn with a teal plume, white beard, eyepatch, silver
// hook. He sways his weight from boot to boot and puffs his chest.
export function buildCrookhook(flash) {
  const P = maker(flash);
  const root = new THREE.Group();
  const TEAL = 0x1f8a8a, TEAL2 = 0x176b6b, GOLD = 0xffc914, RED = 0xd7263d, CREAM = 0xf0e2c0, SKIN = 0xe0a878;
  const SILVER = 0xc4cad8, HAT = 0x22202a, BOOT = 0x2a2430, PANTS = 0x3a2a24, STEEL = 0x7d8798, WHITE = 0xeef0f5;

  // legs: short, thick, wide apart; big cuffed boots
  for (const z of [-19, 19]) {
    const lg = group(root, 0, 0, z);
    lg.rotation.x = z > 0 ? -0.07 : 0.07;
    lg.add(P(box(26, 26, 22), BOOT, { pos: [1, 13, 0] }));
    lg.add(P(box(17, 11, 21), BOOT, { pos: [15, 5.5, 0] }));
    lg.add(P(box(30, 9, 26), BOOT, { pos: [0, 29, 0], ink: 1.8 })); // folded cuff
    lg.add(P(box(3, 7, 9), GOLD, { pos: [14, 18, 0], shiny: true, ink: 1 }));
    lg.add(P(cyl(12, 11, 30, 7), PANTS, { pos: [0, 47, 0] }));
  }
  root.add(P(ico(1), PANTS, { scale: [24, 12, 30], pos: [0, 64, 0] }));

  // `upper` carries everything from the hips up, so he can sway his weight
  const upper = group(root, 0, 62, 0);
  // long coat: open at the front, flaring out behind and at the sides down to the boot cuffs
  const OPEN = 0.62;
  const skirtG = new THREE.CylinderGeometry(30, 46, 46, 12, 1, false, Math.PI / 2 + OPEN, Math.PI * 2 - OPEN * 2); skirtG.translate(0, -23, 0);
  const skirt = group(upper, -2, 22, 0);
  skirt.add(P(skirtG, TEAL, { scale: [0.92, 1, 1] }));
  const hemG = new THREE.CylinderGeometry(46.5, 46.5, 4, 12, 1, true, Math.PI / 2 + OPEN, Math.PI * 2 - OPEN * 2); hemG.translate(0, -45, 0);
  const hem = new THREE.Mesh(hemG, new THREE.MeshBasicMaterial({ color: GOLD, side: THREE.DoubleSide })); hem.scale.set(0.92, 1, 1); skirt.add(hem);
  for (const s of [-1, 1]) skirt.add(P(box(3, 46, 4), GOLD, { pos: [Math.cos(OPEN) * 38 * 0.92, -23, s * Math.sin(OPEN) * 38], rot: [s * 0.2, 0, 0.32], ink: false })); // gold front edges
  // torso: a big chest, much wider at the shoulders than the waist
  const chest = group(upper, 0, 0, 0);
  chest.add(P(cyl(30, 31, 22, 9), TEAL, { pos: [0, 12, 0], scale: [0.9, 1, 1] })); // waist
  chest.add(P(cyl(46, 31, 50, 9), TEAL, { pos: [0, 47, 0], scale: [0.86, 1, 1] }));
  chest.add(P(new THREE.IcosahedronGeometry(1, 2), TEAL, { scale: [22, 20, 34], pos: [18, 54, 0], ink: false })); // deep chest
  chest.add(P(cyl(46.6, 46.6, 4, 9), TEAL2, { pos: [0, 72, 0], scale: [0.86, 1, 1], ink: 1 }));
  // cream shirt in a V down the front, two rows of brass buttons, gold lapels
  chest.add(P(box(6, 40, 20), CREAM, { pos: [34, 46, 0], rot: [0, 0, -0.32] }));
  for (const s of [-1, 1]) {
    chest.add(P(box(3.4, 46, 5), GOLD, { pos: [34, 44, s * 13], rot: [s * 0.16, 0, -0.3], ink: false }));
    for (let i = 0; i < 4; i++) chest.add(P(ico(0), GOLD, { scale: [3, 3, 3], pos: [30 + i * 2.7, 28 + i * 10, s * 21], shiny: true, ink: 0.9 }));
  }
  // red sash and gold buckle at the waist
  chest.add(P(cyl(31.5, 31.5, 11, 9), RED, { pos: [0, 10, 0], scale: [0.9, 1, 1] }));
  chest.add(P(box(6, 13, 15), GOLD, { pos: [28.5, 10, 0], shiny: true, ink: 1.2 }));
  for (const z of [-4, 4]) chest.add(P(box(3, 22, 6), RED, { pos: [26, -6, z + 10], rot: [0.2 * Math.sign(z), 0, -0.1], ink: 1 })); // sash ends
  chest.add(P(cyl(16, 20, 10, 8), TEAL2, { pos: [-2, 78, 0] })); // collar

  // head: on a short thick neck, big white beard down the chest
  const HEADY = 98; // in `upper` space
  const head = group(upper, 8, HEADY, 0);
  const skull = P(ico(1), SKIN, { scale: [19, 21, 19] });
  head.add(skull);
  head.add(P(ico(1), SKIN, { scale: [7.5, 7, 8.5], pos: [20, -3, 0], ink: 1.6 }));
  for (const z of [-19, 19]) head.add(P(ico(0), SKIN, { scale: [4, 6, 3], pos: [-2, -1, z], ink: 1.2 }));
  for (const z of [-16, 16]) head.add(P(ico(0), SILVER, { scale: [10, 10, 7], pos: [-10, -2, z], ink: 1.6 }));
  head.add(P(ico(1), WHITE, { scale: [18, 18, 24], pos: [11, -17, 0], ink: 2 }));
  const beard = group(head, 15, -27, 0);
  beard.add(P(ico(1), WHITE, { scale: [14, 19, 21], pos: [3, -8, 0], ink: 1.8 }));
  beard.add(P(cone(14, 28, 6), WHITE, { pos: [7, -30, 0], rot: [Math.PI, 0, 0.15], ink: 1.6 }));
  for (const z of [-1, 1]) head.add(P(ico(1), WHITE, { scale: [6, 5.5, 14], pos: [21, -8, z * 9], rot: [z * 0.45, 0, 0.1], ink: 1.4 }));
  const face = sphereDecal(head, 19.6, 1.5, 1.3, 180, 160, [0, 2, 0]);
  const updFace = faceUpdater(face, (g, W, H, e, m, t) => {
    g.clearRect(0, 0, W, H);
    g.save(); g.translate(0, H * 0.06); g.scale(1, 0.62); paintEyes(g, W, H, e, { iris: '#2F8FD0', lid: '#E0A878', brow: '#C4CAD8', size: H * 0.31, gap: W * 0.17 }, t); g.restore();
    g.strokeStyle = INK; g.lineWidth = H * 0.05; g.lineCap = 'round';
    g.beginPath(); g.moveTo(W * 0.0, H * 0.3); g.lineTo(W * 0.3, H * 0.36); g.lineTo(W * 1.0, H * 0.14); g.stroke();
    g.fillStyle = INK; g.beginPath(); g.ellipse(W * 0.33, H * 0.41, W * 0.15, H * 0.17, -0.15, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#4a4258'; g.beginPath(); g.ellipse(W * 0.29, H * 0.35, W * 0.045, H * 0.04, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#EEF0F5'; g.lineWidth = H * 0.085;
    g.beginPath(); g.moveTo(W * 0.16, H * 0.17); g.lineTo(W * 0.46, H * 0.24); g.stroke();
    g.beginPath(); g.moveTo(W * 0.54, H * 0.25); g.lineTo(W * 0.86, H * 0.15); g.stroke();
    g.save(); g.translate(0, H * 0.58); g.scale(1, 0.42); paintMouth(g, W, H, m, { inside: '#7A1E2A' }); g.restore();
  });
  const hat = group(head, -3, 20, 0);
  hat.scale.setScalar(1.38);
  const brim = cyl(38, 38, 5, 3); brim.rotateY(Math.PI / 2);
  hat.add(P(brim, HAT));
  const brimTrim = cyl(39.5, 39.5, 2, 3); brimTrim.rotateY(Math.PI / 2);
  hat.add(P(brimTrim, GOLD, { pos: [0, -2.6, 0], ink: false }));
  for (const a of [Math.PI / 2, Math.PI / 2 + (2 * Math.PI) / 3, Math.PI / 2 - (2 * Math.PI) / 3]) {
    const x = Math.sin(a) * 31, z = Math.cos(a) * 31;
    hat.add(P(cone(8, 18, 4), HAT, { pos: [x, 7, z], rot: [z * -0.022, 0, -x * 0.022], ink: 1.6 }));
  }
  hat.add(P(cyl(17, 21, 20, 7), HAT, { pos: [-2, 11, 0] }));
  hat.add(P(cyl(17.6, 17.6, 3, 7), GOLD, { pos: [-2, 20, 0], ink: false }));
  const anchor = group(hat, 20, 10, 0);
  anchor.add(P(box(2, 10, 2.4), GOLD, { shiny: true, ink: 0.8 }));
  anchor.add(P(box(2, 2.4, 8), GOLD, { pos: [0, 3, 0], shiny: true, ink: 0.8 }));
  const ac = new THREE.TorusGeometry(4, 1.1, 3, 8, Math.PI); ac.rotateY(Math.PI / 2); ac.rotateX(Math.PI);
  anchor.add(P(ac, GOLD, { pos: [0, -3.5, 0], shiny: true, ink: 0.8 }));
  const plume = group(hat, -16, 16, 0);
  plume.add(P(ico(1), TEAL, { scale: [24, 7, 9], pos: [-6, 12, 4], rot: [0.2, 0, -0.85], ink: 1.6 }));
  plume.add(P(ico(1), 0x2fb5b5, { scale: [17, 5.5, 7], pos: [-20, 30, 6], rot: [0.2, 0, -1.15], ink: 1.4 }));
  plume.add(P(ico(1), 0x5fd6d0, { scale: [9, 3.5, 5], pos: [-28, 44, 7], rot: [0.2, 0, -1.4], ink: 1.2 }));

  // arms: thick, from big rounded shoulders; huge gold cuffs; hook and cutlass
  const arm = (z, back) => {
    const pv = group(upper, 0, 70, z);
    const c = back ? TEAL2 : TEAL;
    pv.add(P(ico(1), c, { scale: [16, 16, 15] }));
    pv.add(P(cyl(18, 19, 5, 8), GOLD, { pos: [1, 11, 0], shiny: true, ink: 1.2 }));
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; pv.add(P(cyl(1.6, 1.6, 10, 4), GOLD, { pos: [1 + Math.sin(a) * 18, 4, Math.cos(a) * 18], ink: 0.6 })); }
    pv.add(P(cyl(13, 12, 28, 7), c, { pos: [0, -18, 0] }));
    pv.add(P(cyl(13.5, 12.5, 18, 7), c, { pos: [1, -40, 0] }));
    pv.add(P(cyl(17, 15, 14, 7), GOLD, { pos: [2, -52, 0], ink: 1.6 })); // big turned-back cuff
    return pv;
  };
  const armB = arm(-52, true), armF = arm(52, false);
  armF.add(P(cyl(9, 7.5, 11, 8), STEEL, { pos: [2, -63, 0], shiny: true, ink: 1.4 }));
  const hk = new THREE.TorusGeometry(15, 3.6, 5, 12, Math.PI * 1.35); hk.rotateZ(Math.PI * 0.9);
  armF.add(P(hk, SILVER, { pos: [10, -82, 0], shiny: true, ink: 1.4 }));
  armF.add(P(cone(3.6, 9, 4), SILVER, { pos: [23, -72, 0], rot: [0, 0, -0.4], shiny: true, ink: 1 }));
  armB.add(P(ico(1), SKIN, { scale: [10, 9, 10], pos: [2, -64, 0], ink: 1.4 })); // big fist
  const cut = group(armB, 2, -64, 0);
  cut.add(P(box(3, 32, 11), 0xdde6f2, { pos: [0, 22, 0], shiny: true, ink: 1.2 }));
  cut.add(P(box(3, 24, 11), 0xdde6f2, { pos: [-3, 48, 0], rot: [0, 0, 0.22], shiny: true, ink: 1.2 }));
  cut.add(P(cone(5.5, 13, 3), 0xdde6f2, { pos: [-7, 64, 0], rot: [0, 0, 0.4], scale: [0.5, 1, 1], shiny: true, ink: 1 }));
  cut.add(P(box(5, 4, 24), GOLD, { pos: [0, 5, 0], shiny: true, ink: 1.2 }));
  cut.add(P(box(4, 10, 4), PANTS, { pos: [0, -2, 0], ink: 1 }));
  cut.rotation.z = -1.15;

  const rig = {
    root, head, faceParts: [skull, hat], headY: HEADY, armF, armB, armFRest: 0.05, armBRest: 0.05,
    anchors: {
      head: anchorAt(root, head, 6, 0, 0), top: anchorAt(root, hat, -2, 34, 0),
      center: anchorAt(root, chest, 0, 38, 0), muzzle: anchorAt(root, head, 22, -6, 0),
    },
    headR: 50,
  };
  rig.apply = (p) => {
    baseApply(rig, p);
    updFace(p);
    const t = p.t || 0;
    const hurt = p.hurt ? Math.sin(t / 30) * 0.05 * Math.min(1, p.hurt) : 0;
    upper.rotation.x = Math.sin(t / 800) * 0.025; // weight from boot to boot
    upper.rotation.z = (p.pose === 'victory' ? -0.12 : 0) + hurt;
    upper.position.y = 62 + Math.sin(t / 400) * 0.8;
    chest.scale.set(1 + Math.sin(t / 420) * 0.012, 1, 1 + Math.sin(t / 420) * 0.018);
    armF.rotation.x = -0.24; armB.rotation.x = 0.24; // thick arms held away from the body
    beard.rotation.z = Math.sin(t / 420) * 0.06 + (p.fly ? -0.25 : 0);
    plume.rotation.z = 0.5 + Math.sin(t / 360) * 0.08;
    skirt.rotation.z = Math.sin(t / 380) * 0.03 - (p.fly ? 0.25 : 0) - Math.min(0.3, Math.abs(p.lunge || 0) / 250);
  };
  return rig;
}

// ======================= Jack-Knife face =======================
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

// ======================= Jack-Knife =======================
// Body (Founder's reference, 2026-10-16): very tall and very thin. Legs are well over half
// his height, a short narrow torso, narrow shoulders, long thin arms with long spidery
// fingers held a little out from the body, a slight stoop, the head on a thin neck.
// Outfit and colours from the poster: carved pumpkin head, gold vest with buttons over
// the ribs, vine belt, long purple cape with a tall collar, green-and-purple striped
// socks, black buckled boots. Loose, dangly movement; Fold Up folds the long legs.
export function buildJackKnife(flash) {
  const P = maker(flash);
  const root = new THREE.Group();
  const BONE = 0xede6d2, BONE2 = 0xd2c8ae, PUMP = 0xe8762b, PUMP2 = 0xd0601e, STEM = 0x2e7a3a, BURLAP = 0xd9a03a, BURLAP2 = 0xa8742a, PURPLE = 0x6a3fa0, VINE = 0x2e9e44, BOOT = 0x24202c;
  const HIP = 124, THIGH = 62, SHIN = 56, REST = 0.06;

  // legs: very long and thin; striped socks up the shins, pointed buckled boots
  const legs = [];
  for (const z of [-8, 8]) {
    const back = z < 0, c = back ? BONE2 : BONE;
    const hip = group(root, 0, HIP, z);
    hip.add(P(ico(0), c, { scale: [4.6, 4.6, 4.6], ink: 1.1 }));
    hip.add(P(cyl(2.6, 2.2, THIGH - 7, 6), c, { pos: [0, -THIGH / 2, 0] }));
    const knee = group(hip, 0, -THIGH, 0);
    knee.add(P(ico(0), c, { scale: [5, 4.6, 5], ink: 1.2 }));
    knee.add(P(cyl(2.2, 1.9, 14, 6), c, { pos: [0, -9, 0] }));
    for (let i = 0; i < 7; i++) knee.add(P(cyl(3.3, 3.1, 5, 6), i % 2 ? PURPLE : VINE, { pos: [0, -19 - i * 5, 0], ink: i === 0 || i === 6 ? 1 : false }));
    const boot = group(knee, 0, -SHIN, 0);
    boot.add(P(box(12, 12, 11), BOOT, { pos: [-1, 4, 0] }));
    boot.add(P(box(16, 6, 10), BOOT, { pos: [8, -1, 0] }));
    boot.add(P(cone(5, 12, 4), BOOT, { pos: [19, 1, 0], rot: [0, 0, -Math.PI / 2 - 0.45], scale: [1, 1, 0.9], ink: 1.2 }));
    boot.add(P(box(2, 5, 7), 0xffc914, { pos: [5, 6, 0], shiny: true, ink: 0.8 }));
    hip.rotation.x = back ? -0.05 : 0.05; // feet a little apart
    legs.push({ hip, knee, boot, back });
  }

  // short narrow torso
  const body = group(root, 0, HIP, 0);
  for (const z of [-5, 5]) body.add(P(ico(0), BONE, { scale: [5.5, 4.5, 4], pos: [0, 2, z], rot: [z > 0 ? 0.5 : -0.5, 0, 0], ink: 1.1 }));
  body.add(P(box(5, 7, 5), BONE2, { pos: [-2, 1, 0], ink: 1 }));
  const vb = new THREE.TorusGeometry(8.5, 1.7, 4, 12); vb.rotateX(Math.PI / 2);
  body.add(P(vb, VINE, { pos: [0, 5, 0], scale: [0.85, 1, 1], ink: 1 }));
  for (const [x, z, r] of [[8, 4, 0.4], [6, -7, -0.5], [-2, 8, 1.2]]) body.add(P(cone(3.2, 8, 4), 0x46c25a, { pos: [x, 3, z], rot: [Math.PI / 2 + r, 0, -0.3], scale: [1, 1, 0.4], ink: 1 }));
  for (let i = 0; i < 3; i++) body.add(P(box(4, 3.2, 4), i % 2 ? BONE2 : BONE, { pos: [-2, 9 + i * 4, 0], ink: 0.9 }));
  const chest = group(body, -1, 20, 0);
  const RIB = [[9, 30], [10, 25], [10, 20], [9, 15], [7.5, 10]];
  RIB.forEach(([r, y], i) => {
    const rib = new THREE.TorusGeometry(r, 1.2, 4, 14, Math.PI * 2 - 0.8);
    rib.rotateX(Math.PI / 2); rib.rotateY(0.4);
    chest.add(P(rib, i % 2 ? BONE2 : BONE, { pos: [1, y, 0], scale: [0.7, 1, 1], ink: 0.9 }));
  });
  chest.add(P(box(2.4, 22, 3.2), BONE, { pos: [7.5, 21, 0], ink: 0.9 }));
  for (let i = 0; i < 6; i++) chest.add(P(box(3.8, 2.8, 3.8), BONE2, { pos: [-6, 6 + i * 5, 0], ink: false }));
  // the poster's gold vest: open front panels with buttons, a back panel
  for (const s of [-1, 1]) {
    chest.add(P(box(3, 28, 7), BURLAP, { pos: [4.5, 21, s * 10], rot: [s * 0.12, 0, -0.04] }));
    chest.add(P(box(3.4, 28, 1.6), BURLAP2, { pos: [6, 21, s * 6.6], ink: 0.8 }));
    for (let i = 0; i < 3; i++) chest.add(P(ico(0), 0xffc914, { scale: [1.8, 1.8, 1.8], pos: [6.8, 13 + i * 7, s * 8.6], shiny: true, ink: 0.7 }));
  }
  chest.add(P(box(3, 30, 20), BURLAP2, { pos: [-9, 21, 0] }));
  for (const s of [-1, 1]) chest.add(P(cyl(1.5, 1.5, 15, 5), BONE, { pos: [1, 35, s * 8], rot: [Math.PI / 2, 0, 0], ink: 0.8 }));
  const neck = group(chest, 3, 37, 0);
  for (let i = 0; i < 3; i++) neck.add(P(cyl(2.2, 2.6, 3.4, 6), BONE, { pos: [i * 1.4, i * 4.2, 0], ink: 0.8 }));

  // long purple cape with a tall collar, ragged hem; hangs behind the legs
  const CAPE2 = 0x4a2a78, BACK = Math.PI * 1.5;
  const cape = group(chest, -5, 36, 0);
  const collar = new THREE.CylinderGeometry(24, 9, 34, 8, 1, true, BACK - 1.35, 2.7); collar.translate(0, 17, 0);
  cape.add(P(collar, PURPLE, { scale: [0.6, 1, 1] }));
  const collarIn = new THREE.CylinderGeometry(23, 8.5, 33, 8, 1, true, BACK - 1.3, 2.6); collarIn.translate(0, 17, 0);
  const ci = new THREE.Mesh(collarIn, new THREE.MeshBasicMaterial({ color: CAPE2, side: THREE.BackSide })); ci.scale.set(0.6, 1, 1); cape.add(ci);
  const LEN = 86;
  const drape = new THREE.CylinderGeometry(12, 15, LEN, 10, 1, false, BACK - 1.3, 2.6); drape.translate(0, -LEN / 2, 0);
  cape.add(P(drape, PURPLE, { scale: [0.5, 1, 1] }));
  const dIn = new THREE.CylinderGeometry(11.2, 14.2, LEN - 1, 10, 1, true, BACK - 1.27, 2.54); dIn.translate(0, -LEN / 2, 0);
  const di = new THREE.Mesh(dIn, new THREE.MeshBasicMaterial({ color: CAPE2, side: THREE.BackSide })); di.scale.set(0.5, 1, 1); cape.add(di);
  for (let i = 0; i < 7; i++) {
    const a = BACK - 1.2 + (i / 6) * 2.4;
    cape.add(P(cone(3.6, 9 + (i % 2) * 6, 4), PURPLE, { pos: [Math.sin(a) * 15 * 0.5, -LEN - 4 - (i % 2) * 2, Math.cos(a) * 15], rot: [Math.PI, 0, 0], ink: 1 }));
  }
  for (const z of [-10, 10]) chest.add(P(ico(1), PURPLE, { scale: [5, 3.5, 5], pos: [-2, 36, z], ink: 1.1 }));
  chest.add(P(ico(0), 0xffc914, { scale: [3.4, 3.2, 3.4], pos: [6, 37, 0], shiny: true, ink: 1 })); // clasp

  // pumpkin head
  const HEADY = 34;
  const head = group(neck, 5, HEADY, 0);
  const R = 29;
  for (let k = 0; k < 6; k++) head.add(P(ico(1), k % 2 ? PUMP2 : PUMP, { scale: [R * 1.06, R * 0.88, R * 0.48], rot: [0, (k * Math.PI) / 6, 0], ink: 2.2 }));
  head.add(P(ico(1), PUMP, { scale: [R, R * 0.86, R], ink: false }));
  const stem = cyl(3.2, 4.8, 15, 5); stem.translate(0, 7.5, 0);
  head.add(P(stem, STEM, { pos: [-2, R * 0.82, 0], rot: [0, 0, 0.35], ink: 1.3 }));
  head.add(P(cone(5.5, 15, 4), 0x46c25a, { pos: [-11, R * 0.82 + 8, 5], rot: [0.4, 0, 1.2], scale: [1, 1, 0.3], ink: 1 }));
  const curl = new THREE.TorusGeometry(4.5, 1.1, 3, 8, Math.PI * 1.5);
  head.add(P(curl, STEM, { pos: [-6, R * 0.82 + 14, 0], ink: 0.8 }));
  const face = sphereDecal(head, R + 0.7, 1.75, 1.7, 220, 200, [0, -1, 0], [1, 0.86, 1]);
  const updFace = faceUpdater(face, paintPumpkinFace);

  // arms: long and thin; spidery fingers
  const arm = (z, back) => {
    const pv = group(chest, 1, 34, z);
    const c = back ? BONE2 : BONE;
    pv.add(P(ico(0), c, { scale: [4.2, 4.2, 4.2], ink: 1.1 }));
    pv.add(P(cyl(2.1, 1.8, 40, 6), c, { pos: [0, -22, 0] }));
    const elbow = group(pv, 0, -44, 0);
    elbow.add(P(ico(0), c, { scale: [3.8, 3.8, 3.8], ink: 1.1 }));
    for (const dz of [-1.5, 1.5]) elbow.add(P(cyl(1.1, 1, 36, 5), c, { pos: [0, -20, dz], ink: 0.8 }));
    elbow.add(P(box(5, 5, 5.5), c, { pos: [1, -40, 0], ink: 1 }));
    // long spidery fingers, splayed
    for (const [dz, len, sp] of [[-3, 18, -0.25], [-1, 21, -0.08], [1, 21, 0.08], [3, 17, 0.25]]) elbow.add(P(box(1.3, len, 1.3), c, { pos: [3, -43 - len / 2, dz + sp * 10], rot: [sp, 0, -0.22], ink: 0.7 }));
    elbow.add(P(box(1.3, 12, 1.3), c, { pos: [5, -46, back ? -4 : 4], rot: [back ? -0.6 : 0.6, 0, -0.5], ink: 0.7 })); // thumb
    pv.userData.elbow = elbow;
    return pv;
  };
  const armB = arm(-12, true), armF = arm(12, false);

  // rest pose: a slight stoop, head a little forward
  const STOOP = -0.12;
  chest.rotation.z = STOOP;
  neck.rotation.z = -0.1;
  head.rotation.z = -STOOP * 1.4;
  const rig = { root, head, headY: HEADY, armF, armB, armFRest: 0.05, armBRest: 0.0 };
  for (const L of legs) { L.hip.rotation.z = REST; L.knee.rotation.z = -2 * REST; L.boot.rotation.z = REST; }
  rig.anchors = {
    head: anchorAt(root, head, 6, 0, 0), top: anchorAt(root, head, -2, R * 0.82 + 18, 0),
    center: anchorAt(root, chest, 0, 10, 0), muzzle: anchorAt(root, head, R * 0.9, -6, 0),
  };
  rig.headR = R * 1.45;
  rig.apply = (p) => {
    baseApply(rig, p);
    updFace(p);
    const t = p.t || 0;
    const fold = Math.max(0, Math.min(1, p.shield || 0));
    const hurt = p.hurt ? Math.sin(t / 22) * 0.14 * Math.min(1, p.hurt) : 0;
    const a = REST + Math.sin(t / 300) * 0.02 + fold * 1.05;
    const kick = Math.max(0, Math.min(1, ((p.lunge || 0) - 15) / 60));
    for (const L of legs) {
      const k = !L.back ? kick : 0;
      L.hip.rotation.z = a + k * 1.3;
      L.knee.rotation.z = -2 * a + k * (2 * a + 0.1);
      L.boot.rotation.z = a - k * 0.3;
    }
    body.position.y = HIP - (THIGH + SHIN) * (1 - Math.cos(a));
    for (const L of legs) L.hip.position.y = body.position.y;
    body.rotation.z = -fold * 0.3 + (p.pose === 'victory' ? Math.sin(t / 140) * 0.08 : 0);
    chest.rotation.z = STOOP + Math.sin(t / 650) * 0.03 - fold * 0.35 + hurt * 0.5;
    head.rotation.z = -STOOP * 1.4 + Math.sin(t / 520) * 0.05;
    head.rotation.x = Math.sin(t / 410) * 0.07 + hurt;
    head.position.y -= fold * 16;
    // long arms hang a little out from the body and swing loose
    for (const [pv, ph] of [[armF, 0], [armB, 2.1]]) {
      const sw = Math.sin(t / 470 + ph);
      pv.rotation.x = (pv === armF ? -0.2 : 0.2) + sw * 0.06 + hurt * (ph ? -1 : 1) + fold * (pv === armF ? 0.7 : -0.7);
      pv.userData.elbow.rotation.z = 0.1 + Math.sin(t / 470 + ph - 0.7) * 0.08 + fold * 1.4;
      pv.userData.elbow.rotation.x = pv === armF ? -0.12 : 0.12;
    }
    cape.rotation.z = Math.sin(t / 460) * 0.04 + (p.fly ? 0.35 : 0) + fold * 0.3 - STOOP;
  };
  return rig;
}

// ======================= Big Bad Wolfgang =======================
// Body (Founder's reference, 2026-10-16): a lean, muscular upright wolf. Long
// reverse-jointed wolf legs (he stands on his toes, heel high), a broad chest over a
// narrow waist, a slight forward lean with the head and long muzzle ahead of the chest,
// long arms that reach mid-thigh ending in big clawed hands, pointed ears, a bushy tail.
// Outfit and colours from the poster: grey fur, cream chest ruff, red long coat open at
// the front with black lapels and gold buttons, dark ragged trousers, toothy snarl.
export function buildWolfgang(flash) {
  const P = maker(flash);
  const root = new THREE.Group();
  const FUR = 0x7f838d, FUR2 = 0x63676f, CREAM = 0xeceae4, RED = 0xc81e32, RED2 = 0x9e1628, BLACK = 0x24222c, PANTS = 0x34323e, PANTS2 = 0x2a2832, CLAW = 0xfff3d6, GOLD = 0xffc914;
  const HIP = 102;

  // legs: thigh forward to the knee, long shin back to the high hock, long foot down to the toes
  const legs = [];
  for (const z of [-13, 13]) {
    const back = z < 0, f = back ? FUR2 : FUR, pc = back ? PANTS2 : PANTS;
    const hip = group(root, 0, HIP, z);
    const K = [16, -36, 0], H = [-10, -72, 0], B = [6, -97, 0];
    seg(P, hip, [0, 3, 0], K, 12, 9, pc); // muscular thigh in dark trousers
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; hip.add(P(cone(2.4, 7, 3), pc, { pos: [K[0] + Math.cos(a) * 8, K[1] - 4, Math.sin(a) * 9], rot: [Math.PI, 0, 0], ink: 0.8 })); }
    seg(P, hip, K, H, 7.5, 5, f);
    hip.add(P(ico(0), f, { scale: [6, 6, 6], pos: H, ink: 1.1 }));
    seg(P, hip, H, B, 5, 4.5, f);
    const paw = group(hip, B[0], B[1], 0);
    paw.add(P(ico(1), f, { scale: [13, 5.5, 9], pos: [5, 0, 0] }));
    for (const dz of [-5, 0, 5]) paw.add(P(cone(2.4, 8, 4), CLAW, { pos: [18, -1, dz], rot: [0, 0, -Math.PI / 2], ink: 0.9 }));
    legs.push({ hip, back });
  }
  root.add(P(ico(1), PANTS, { scale: [15, 13, 20], pos: [0, HIP + 2, 0] }));

  const tail = group(root, -14, HIP + 2, 0);
  tail.add(P(ico(1), FUR, { scale: [20, 9, 10], pos: [-14, -8, 0], rot: [0, 0, 0.5] }));
  tail.add(P(ico(1), FUR, { scale: [18, 11, 12], pos: [-30, -22, 0], rot: [0, 0, 0.8] }));
  tail.add(P(ico(1), CREAM, { scale: [10, 9, 9], pos: [-40, -36, 0], rot: [0, 0, 1.0], ink: 1.6 }));

  // torso: lean V, a slight forward lean
  const LEAN = -0.18;
  const torso = group(root, 0, HIP + 4, 0);
  torso.rotation.z = LEAN;
  torso.add(P(cyl(15, 15, 7, 8), BLACK, { pos: [0, 4, 0], ink: 1 }));
  torso.add(P(box(4, 7, 8), GOLD, { pos: [15, 4, 0], shiny: true, ink: 1 }));
  const chest = P(cyl(30, 15, 62, 8), RED, { pos: [0, 38, 0], scale: [0.85, 1, 1] });
  torso.add(chest);
  torso.add(P(new THREE.IcosahedronGeometry(1, 1), CREAM, { scale: [9, 26, 15], pos: [21, 46, 0], ink: 1.4 })); // furry chest showing through the open coat
  for (const s of [-1, 1]) {
    torso.add(P(box(4, 50, 8), BLACK, { pos: [19, 40, s * 14], rot: [s * 0.22, 0, -0.24], ink: 1.2 }));
    for (let i = 0; i < 3; i++) torso.add(P(ico(0), GOLD, { scale: [2.6, 2.6, 2.6], pos: [14 + i * 2.6, 20 + i * 11, s * 19], shiny: true, ink: 0.9 }));
  }
  // long coat skirt: open at the front so the wolf legs show, long tails behind
  const OPEN = 0.95;
  const skirtG = new THREE.CylinderGeometry(16, 30, 64, 10, 1, false, Math.PI / 2 + OPEN, Math.PI * 2 - OPEN * 2); skirtG.translate(0, -32, 0);
  const skirt = group(torso, -2, 8, 0);
  skirt.add(P(skirtG, RED2, { scale: [0.9, 1, 1] }));
  torso.add(P(ico(1), CREAM, { scale: [11, 12, 15], pos: [20, 66, 0], ink: 1.6 })); // ruff
  torso.add(P(cyl(22, 15, 16, 8, 1, false), RED2, { pos: [-6, 70, 0], scale: [0.7, 1, 1.1] })); // collar
  seg(P, torso, [5, 64, 0], [18, 80, 0], 11, 9.5, FUR);

  const HEADY = 86;
  const head = group(torso, 26, HEADY, 0);
  head.rotation.z = -LEAN * 0.8;
  const wskull = P(ico(1), FUR, { scale: [20, 19, 20] });
  head.add(wskull);
  for (const z of [-15, 15]) head.add(P(ico(1), CREAM, { scale: [9, 9, 5.5], pos: [6, -9, z], ink: 1.4 }));
  const snout = cyl(7.5, 12.5, 38, 6); snout.rotateZ(-Math.PI / 2);
  const snoutM = P(snout, FUR, { pos: [28, -4, 0], scale: [1, 0.85, 1] });
  head.add(snoutM);
  head.add(P(ico(1), CREAM, { scale: [15, 6, 9.5], pos: [32, -10, 0], ink: 1.6 }));
  head.add(P(ico(1), 0x14111a, { scale: [5.5, 4.5, 7], pos: [48, 0, 0], shiny: true, ink: 1.2 }));
  const ears = [];
  for (const z of [-1, 1]) {
    const ear = group(head, -6, 14, z * 11);
    ear.add(P(cone(7.5, 28, 4), FUR, { pos: [0, 11, 0], rot: [z * -0.22, 0, 0.2] }));
    ear.add(P(cone(4, 17, 4), CREAM, { pos: [3, 8, 0], rot: [z * -0.22, 0, 0.2], ink: false, scale: [0.6, 1, 1] }));
    ears.push(ear);
  }
  head.add(P(cone(4.5, 11, 4), FUR2, { pos: [-4, 20, 0], rot: [0, 0, 0.5], ink: 1.2 }));
  const jaw = group(head, 18, -14, 0);
  jaw.add(P(ico(1), CREAM, { scale: [15, 4.2, 8], pos: [13, -2, 0], ink: 1.6 }));
  for (const z of [-4, 4]) jaw.add(P(cone(1.5, 5, 3), 0xffffff, { pos: [22, 3, z], ink: 0.6 }));
  const eyes = sphereDecal(head, 20.4, 1.45, 0.62, 180, 76, [0, 6, 0], [1, 1, 1]);
  const mouthD = sphereDecal(head, 10.5, 1.7, 1.2, 120, 72, [35, -10, 0], [1, 0.8, 1]);
  const updEyes = faceUpdater(eyes, (g, W, H, e, m, t) => paintEyes(g, W, H, e === 'open' ? 'angry' : e, { iris: '#FFC914', lid: '#7F838D', brow: '#2A2832', size: H * 0.32, gap: W * 0.26 }, t));
  const updMouth = faceUpdater(mouthD, (g, W, H, e, m) => { g.clearRect(0, 0, W, H); paintMouth(g, W, H, m === 'smile' || m === 'flat' ? 'grit' : m, { inside: '#7A2030', fangs: true }); });

  // arms: long, lean sleeves to black cuffs, big clawed hands down by mid-thigh
  const arm = (z, back) => {
    const pv = group(torso, 2, 62, z);
    const c = back ? RED2 : RED;
    pv.add(P(ico(1), c, { scale: [12, 12, 11] }));
    pv.add(P(cyl(9, 8, 42, 6), c, { pos: [0, -23, 0] }));
    pv.add(P(cyl(8, 7.5, 30, 6), c, { pos: [2, -56, 0] }));
    pv.add(P(cyl(10.5, 10, 8, 6), BLACK, { pos: [2, -72, 0], ink: 1.4 }));
    pv.add(P(cyl(6.5, 6, 6, 6), back ? FUR2 : FUR, { pos: [2, -78, 0] }));
    pv.add(P(ico(1), back ? FUR2 : FUR, { scale: [9, 11, 10], pos: [3, -87, 0] }));
    for (const dz of [-5, -1.7, 1.7, 5]) pv.add(P(cone(1.9, 12, 4), CLAW, { pos: [7, -100, dz], rot: [0, 0, -2.9], ink: 0.8 })); // long claws
    return pv;
  };
  const armB = arm(-32, true), armF = arm(32, false);

  const rig = { root, head, faceParts: [wskull, snoutM], headY: HEADY, armF, armB, armFRest: -LEAN * 0.5, armBRest: -LEAN * 0.5 };
  rig.anchors = {
    head: anchorAt(root, head, 14, 0, 0), top: anchorAt(root, head, -4, 44, 0),
    center: anchorAt(root, torso, 0, 30, 0), muzzle: anchorAt(root, head, 50, -4, 0),
  };
  rig.headR = 50;
  rig.apply = (p) => {
    baseApply(rig, p);
    updEyes(p); updMouth(p);
    const t = p.t || 0;
    const puff = p.puff || 0;
    const heave = Math.sin(t / 520);
    torso.rotation.z = LEAN + heave * 0.02 + (p.pose === 'victory' ? 0.22 : 0);
    torso.position.y = HIP + 4 + heave * 1.0;
    chest.scale.set(0.85 + puff * 0.18 + heave * 0.01, 1 + puff * 0.1, 1 + puff * 0.16 + heave * 0.012);
    const sniff = (t % 4200) < 500 ? Math.sin(((t % 4200) / 500) * Math.PI * 4) * 0.05 : 0;
    head.rotation.z = -LEAN * 0.8 - (p.pose === 'victory' ? 0.5 : 0) + sniff;
    ears.forEach((e, i) => { e.rotation.z = (p.hurt ? 0.5 : 0) + Math.sin(t / 900 + i) * 0.05; });
    tail.rotation.z = Math.sin(t / 300) * 0.14 + (p.tail || 0) + (p.hurt ? -0.4 : 0);
    tail.rotation.x = Math.sin(t / 450) * 0.15;
    jaw.rotation.z = p.mouth === 'open' ? -0.4 : p.mouth === 'o' ? -0.22 : 0;
    armF.rotation.x = -0.14; armB.rotation.x = 0.14;
    skirt.rotation.z = -(p.fly ? 0.3 : 0) - Math.min(0.3, Math.abs(p.lunge || 0) / 250);
    const spring = Math.max(0, Math.min(1, Math.abs(p.lunge || 0) / 70));
    for (const L of legs) L.hip.rotation.z = L.back ? -spring * 0.5 : spring * 0.35;
  };
  return rig;
}

// ======================= Galactic Hunter (was Commander Payne) =======================
// A walking fortress (Matt, 2026-10-15 + v6): enormous layered, spiked pauldrons that
// make him nearly as wide as he is tall, a small horned helmet sunk deep between them
// behind a high armored collar, a massive chest with the cyan reactor, gauntlets the size
// of his head, short thick legs planted wide, crimson cape, jet pack, a halberd taller
// than he is. Moves like a machine: stepped, servo-snapping idle.
export function buildPayne(flash) {
  const P = maker(flash);
  const root = new THREE.Group();
  const GUN = 0x3a3358, GUN2 = 0x221d36, TRIM = 0xb8c2d8, CYAN = 0x4ee8ff, VISOR = 0xff2a44, CAPE = 0x9a1430, CAPE2 = 0x5e0c20;

  // legs: short, thick, planted wide
  for (const z of [-27, 27]) {
    const back = z < 0, c = back ? GUN2 : GUN;
    const lg = group(root, 0, 0, z);
    lg.rotation.x = back ? 0.06 : -0.06;
    lg.add(P(box(44, 16, 34), c, { pos: [6, 8, 0] }));
    lg.add(P(box(16, 9, 30), TRIM, { pos: [26, 6, 0], ink: 1 }));
    lg.add(P(box(32, 34, 30), c, { pos: [0, 33, 0] }));
    lg.add(P(box(34, 5, 32), TRIM, { pos: [0, 51, 0], ink: 1.2 }));
    lg.add(P(box(2, 22, 3), CYAN, { pos: [16.2, 33, 0], ink: false }));
    const knee = new THREE.Mesh(new THREE.OctahedronGeometry(7), glowMat(CYAN)); knee.position.set(16, 60, 0); lg.add(knee);
    lg.add(P(box(12, 16, 22), GUN, { pos: [11, 60, 0], ink: 1.2 }));
    lg.add(P(box(28, 22, 28), GUN2, { pos: [0, 70, 0] }));
  }
  // waist
  root.add(P(cyl(32, 32, 10, 8), TRIM, { pos: [0, 84, 0], scale: [1, 1, 0.95], shiny: true }));
  root.add(P(box(10, 14, 16), GUN2, { pos: [29, 84, 0], ink: 1.4 }));
  root.add(P(box(1.5, 6, 9), VISOR, { pos: [34.2, 84, 0], ink: false }));

  // upper body on `hull`, for the stepped machine motion
  const hull = group(root, 0, 0, 0);
  hull.add(P(cyl(26, 29, 18, 8), GUN2, { pos: [0, 97, 0], scale: [1, 1, 0.95] }));
  for (const y of [93, 100]) hull.add(P(box(3, 2, 24), GUN, { pos: [27, y, 0], ink: false }));
  // massive chest: wide top, heavy plate
  hull.add(P(cyl(52, 30, 50, 8), GUN, { pos: [0, 130, 0], scale: [0.9, 1, 1], shiny: true }));
  hull.add(P(cyl(52.6, 52.6, 4, 8), TRIM, { pos: [0, 154, 0], scale: [0.9, 1, 1], ink: 1.2 }));
  for (const z of [-1, 1]) hull.add(P(box(3, 36, 4), TRIM, { pos: [40, 136, z * 13], rot: [z * 0.5, 0, -0.32], ink: 1 }));
  const ring = cyl(12, 12, 4, 10); ring.rotateZ(Math.PI / 2);
  hull.add(P(ring, TRIM, { pos: [39, 130, 0], shiny: true, ink: 1.2 }));
  const reactor = new THREE.Mesh(new THREE.IcosahedronGeometry(8.5, 1), glowMat(CYAN)); reactor.position.set(41, 130, 0); hull.add(reactor);
  // high armored collar the helmet sits down inside
  for (const s of [-1, 1]) hull.add(P(box(22, 26, 8), GUN2, { pos: [2, 166, s * 21], rot: [s * -0.25, 0, 0], ink: 1.4 }));
  hull.add(P(box(8, 22, 34), GUN2, { pos: [-16, 166, 0], ink: 1.4 }));
  // jet pack + thrusters
  hull.add(P(box(20, 44, 50), GUN2, { pos: [-40, 132, 0] }));
  const flames = [];
  for (const z of [-18, 18]) {
    hull.add(P(cyl(7.5, 9, 26, 8), GUN, { pos: [-49, 152, z], rot: [0, 0, -0.35], shiny: true }));
    hull.add(P(cyl(9.5, 9.5, 3, 8), TRIM, { pos: [-45, 163, z], rot: [0, 0, -0.35], ink: 1 }));
    const fl = new THREE.Mesh(new THREE.ConeGeometry(6.5, 18, 7), glowMat(CYAN));
    fl.position.set(-54, 136, z); fl.rotation.z = Math.PI - 0.35;
    hull.add(fl); flames.push(fl);
  }
  // crimson cape: wide, from under the pauldrons to the ankles
  const cape = group(hull, -28, 158, 0);
  const BACK = Math.PI * 1.5;
  const drape = new THREE.CylinderGeometry(42, 58, 150, 12, 1, false, BACK - 1.35, 2.7); drape.translate(0, -75, 0);
  cape.add(P(drape, CAPE, { pos: [24, 0, 0], scale: [0.7, 1, 1] }));
  const lining = new THREE.CylinderGeometry(40.5, 56.5, 148, 12, 1, true, BACK - 1.32, 2.64); lining.translate(0, -75, 0);
  const lm = new THREE.Mesh(lining, new THREE.MeshBasicMaterial({ color: CAPE2, side: THREE.BackSide })); lm.position.x = 24; lm.scale.set(0.7, 1, 1); cape.add(lm);

  // head: small helmet sunk between the collar plates; swept horns, crest, red visor
  const HEADY = 170;
  const head = group(hull, 6, HEADY, 0);
  head.scale.setScalar(0.72);
  head.add(P(new THREE.SphereGeometry(24, 10, 8), GUN, { shiny: true, scale: [1, 1.05, 1] }));
  const crest = new THREE.Shape(); crest.moveTo(16, 18); crest.lineTo(-30, 50); crest.lineTo(-26, 24); crest.lineTo(-6, 22); crest.closePath();
  const crestG = new THREE.ExtrudeGeometry(crest, { depth: 4, bevelEnabled: false }); crestG.translate(0, 0, -2);
  head.add(P(crestG, GUN2, { ink: 1.4 }));
  head.add(P(box(30, 1.6, 4.6), VISOR, { pos: [-8, 32, 0], rot: [0, 0, 0.55], ink: false }));
  for (const s of [-1, 1]) {
    const horn = cone(7, 52, 4); horn.translate(0, 26, 0);
    head.add(P(horn, GUN2, { pos: [-4, 14, s * 20], rot: [s * -0.5, 0, 0.7], ink: 1.4 }));
  }
  for (const s of [-1, 1]) head.add(P(box(8, 5, 24), GUN2, { pos: [21, 12, s * 10], rot: [s * 0.32, s * 0.5, 0], ink: 1.2 }));
  const jawG = new THREE.ConeGeometry(14, 22, 4); jawG.rotateZ(Math.PI); jawG.rotateY(Math.PI / 4);
  head.add(P(jawG, GUN2, { pos: [14, -14, 0], scale: [1.1, 1, 1.25], ink: 1.6 }));
  const eyes = sphereDecal(head, 24.9, 1.4, 0.4, 200, 56, [0, 4, 0]);
  const updEyes = faceUpdater(eyes, (g, W, H, e, m, t) => {
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,42,68,0.22)'; g.fillRect(0, H * 0.22, W, H * 0.6);
    paintEyes(g, W, H, e === 'open' ? 'angry' : e, { glow: '#FF4A60', size: H * 0.4, gap: W * 0.17 }, t);
  });

  // pauldrons: the silhouette. Three layered plates per side, three spikes, a cyan seam
  const pauldron = (z) => {
    const s = Math.sign(z);
    const pd = group(hull, 0, 158, z);
    pd.add(P(new THREE.IcosahedronGeometry(1, 1), GUN, { scale: [34, 22, 30], shiny: true }));
    for (let i = 0; i < 3; i++) pd.add(P(box(52 - i * 6, 7, 28), i % 2 ? GUN2 : GUN, { pos: [0, -14 - i * 7, s * (10 + i * 5)], rot: [s * (0.35 + i * 0.12), 0, 0], ink: 1.2 }));
    pd.add(P(box(54, 3, 3), CYAN, { pos: [0, -9, s * 24], rot: [s * 0.35, 0, 0], ink: false }));
    for (const [dx, h, lean] of [[-14, 30, 0.35], [2, 38, 0.5], [16, 26, 0.65]]) pd.add(P(cone(6, h, 4), GUN2, { pos: [dx, 18 + h * 0.3, s * 12], rot: [s * -lean, 0, 0], ink: 1.3 }));
    const rim = new THREE.TorusGeometry(30, 2.2, 4, 12); rim.rotateX(Math.PI / 2);
    pd.add(P(rim, TRIM, { pos: [0, -4, 0], scale: [1.1, 1, 1], ink: 1 }));
    return pd;
  };
  const pdB = pauldron(-50), pdF = pauldron(50);

  // arms under the pauldrons: short upper arm, huge gauntlet, big fist
  const arm = (z, back) => {
    const pv = group(hull, 0, 144, z);
    const c = back ? GUN2 : GUN;
    pv.add(P(cyl(11, 10, 24, 7), GUN2, { pos: [0, -12, 0] }));
    pv.add(P(ico(0), TRIM, { scale: [9, 9, 9], pos: [0, -26, 0], shiny: true, ink: 1.2 }));
    pv.add(P(box(28, 36, 28), c, { pos: [0, -46, 0], shiny: true }));
    pv.add(P(box(30, 5, 30), TRIM, { pos: [0, -30, 0], ink: 1 }));
    pv.add(P(box(1.5, 22, 3), CYAN, { pos: [14.2, -46, 0], ink: false }));
    pv.add(P(box(22, 18, 22), GUN2, { pos: [3, -71, 0] }));
    pv.add(P(box(6, 7, 18), TRIM, { pos: [14, -71, 0], shiny: true, ink: 1 }));
    return pv;
  };
  const armB = arm(-60, true), armF = arm(60, false);
  // plasma halberd: taller than he is, held upright
  const hal = group(armF, 4, -71, 0);
  const shaft = cyl(3.2, 3.2, 240, 6); shaft.translate(0, 60, 0);
  hal.add(P(shaft, GUN2, { shiny: true, ink: 1.2 }));
  for (const y of [-56, -10, 10, 130]) hal.add(P(cyl(4.5, 4.5, 4, 6), TRIM, { pos: [0, y, 0], shiny: true, ink: 0.8 }));
  hal.add(P(cone(5, 28, 5), TRIM, { pos: [0, 194, 0], shiny: true, ink: 1 }));
  hal.add(P(box(10, 14, 10), GUN, { pos: [0, 174, 0], ink: 1 }));
  const blade = new THREE.Group(); hal.add(blade);
  const arcG = new THREE.TorusGeometry(26, 7, 4, 16, Math.PI); arcG.rotateZ(-Math.PI / 2);
  blade.add(new THREE.Mesh(arcG, glowMat(CYAN, { transparent: true, opacity: 0.9 })));
  const coreG = new THREE.TorusGeometry(26, 2.6, 3, 16, Math.PI); coreG.rotateZ(-Math.PI / 2);
  blade.add(new THREE.Mesh(coreG, glowMat(0xeaffff)));
  blade.position.set(3, 172, 0);
  blade.scale.set(0.8, 1, 1);

  const rig = { root, head, headY: HEADY, armF, armB, armFRest: -0.12, armBRest: 0.05 };
  rig.anchors = {
    head: anchorAt(root, head, 6, 4, 0), top: anchorAt(root, head, -10, 60, 0),
    center: anchorAt(root, hull, 0, 122, 0), muzzle: anchorAt(root, hull, 44, 130, 0),
  };
  rig.headR = 52;
  rig.apply = (p) => {
    baseApply(rig, p);
    updEyes(p);
    const t = p.t || 0;
    // a machine: motion in steps, the helmet snaps between scan angles
    const step = Math.floor(t / 450);
    const bob = [0, 0.8, 1.2, 0.8, 0, -0.4][step % 6];
    hull.position.y = bob;
    head.position.y = HEADY + bob * 0.3 + (p.headBob || 0) * 0.3;
    head.rotation.y = [0, 0, 0.22, 0.22, 0, -0.18, -0.18, 0][Math.floor(t / 700) % 8];
    pdF.rotation.x = pdB.rotation.x = 0;
    pdF.position.y = pdB.position.y = 158 + bob * 0.6;
    hal.rotation.z = -0.1 + ((p.armF ?? -0.2) + 0.2) * 0.4; // stays near upright at rest, still swings on attacks
    const f = 1 + Math.sin(t / 60) * 0.12 + (p.fly ? 0.8 : 0);
    flames.forEach((fl) => fl.scale.set(1, f, 1));
    blade.children[0].material.opacity = 0.75 + Math.sin(t / 90) * 0.15;
    reactor.scale.setScalar(1 + (step % 2 ? 0.1 : 0) + (p.charge || 0) * 0.3);
    reactor.rotation.y = t / 700;
    cape.rotation.z = Math.sin(t / 520) * 0.03 + (p.fly ? 0.35 : 0);
  };
  return rig;
}

export const VILLAIN_BUILDERS = { crookhook: buildCrookhook, jackknife: buildJackKnife, wolfgang: buildWolfgang, payne: buildPayne };
