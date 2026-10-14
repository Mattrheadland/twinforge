// Arena 1: Bedroom Block Fortress as a low-poly 3D stage (STYLE_GUIDE v5).
// Faceted floorboards, blocky furniture and props, inked like the toys.
// The fight happens on a flat line across the rug; the room gives it depth.
// Animated bits: the teddy bear and rubber duck in the background bob along
// and jump when a big hit shakes the room (`excite`).
import * as THREE from 'three';
import { toonMat, glowMat, part } from './toon.js';
import { Rng } from '../logic/rng.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const P = (geo, color, opts = {}) => part(geo, color, { ink: 1.6, ...opts });

export const WALL_Z = -280;

export class Room3D {
  constructor() {
    this.group = new THREE.Group();
    this.excite = 0;
    this.build();
  }

  // Static pieces that share a color are merged into one mesh (fewer draw calls).
  batch(color, geo, pos, rot = [0, 0, 0]) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(1, 1, 1));
    const gg = geo.toNonIndexed ? geo.toNonIndexed() : geo;
    gg.deleteAttribute('uv');
    gg.deleteAttribute('normal');
    gg.applyMatrix4(m);
    (this.batches[color] ||= []).push(gg);
  }

  flush() {
    for (const [color, list] of Object.entries(this.batches)) {
      this.group.add(new THREE.Mesh(mergeGeometries(list), toonMat(+color)));
    }
    this.batches = {};
  }

  build() {
    const g = this.group;
    const r = new Rng(11);
    this.batches = {};

    // ---- floor: faceted planks running toward the back ----
    const plankW = 52;
    for (let i = -22; i <= 22; i++) {
      const x = i * plankW;
      // boards are split along z at staggered seams
      let z = 520;
      while (z > WALL_Z) {
        const len = 160 + Math.floor(r.next() * 4) * 60;
        const z1 = Math.max(WALL_Z, z - len);
        const col = [0xb8662f, 0xa5582a, 0xc2733a][(i + 30 + Math.floor(z / 100)) % 3];
        const tilt = (r.next() - 0.5) * 0.02;
        this.batch(col, box(plankW - 2.5, 6, z - z1 - 2.5), [x, -3 + r.next() * 1.4, (z + z1) / 2], [0, 0, tilt]);
        z = z1;
      }
    }
    // dark gaps between boards
    const under = new THREE.Mesh(new THREE.PlaneGeometry(2600, 900), glowMat(0x3a1c14));
    under.rotation.x = -Math.PI / 2;
    under.position.set(0, -5, 100);
    g.add(under);

    // ---- back wall with wallpaper panels and wainscot ----
    const wall = new THREE.Mesh(box(2600, 720, 10), toonMat(0x36307a));
    wall.position.set(0, 360, WALL_Z - 5);
    g.add(wall);
    for (let i = -16; i <= 16; i++) {
      this.batch(0x4b4498, box(30, 560, 4), [i * 80, 400, WALL_Z + 1]);
    }
    g.add(P(box(2600, 110, 12), 0x6a3fa0, { pos: [0, 55, WALL_Z + 4], ink: 1.2 }));
    g.add(P(box(2600, 14, 18), 0xffc914, { pos: [0, 112, WALL_Z + 6], ink: 1.2 }));
    g.add(P(box(2600, 18, 20), 0x2a2458, { pos: [0, 9, WALL_Z + 8], ink: 1.2 }));

    // ---- window: frame, night sky, moon ----
    const wx = 0, wy = 330, ww = 300, wh = 210;
    const sky = this.skyTexture();
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), new THREE.MeshBasicMaterial({ map: sky }));
    glass.position.set(wx, wy, WALL_Z + 2);
    g.add(glass);
    const frameCol = 0xf2e6c8;
    g.add(P(box(ww + 30, 16, 26), frameCol, { pos: [wx, wy + wh / 2 + 8, WALL_Z + 12] }));
    g.add(P(box(ww + 50, 18, 40), frameCol, { pos: [wx, wy - wh / 2 - 9, WALL_Z + 20] }));
    for (const s of [-1, 1]) g.add(P(box(16, wh + 30, 26), frameCol, { pos: [wx + s * (ww / 2 + 8), wy, WALL_Z + 12] }));
    g.add(P(box(8, wh, 10), frameCol, { pos: [wx, wy, WALL_Z + 6], ink: 1.2 }));
    g.add(P(box(ww, 8, 10), frameCol, { pos: [wx, wy, WALL_Z + 6], ink: 1.2 }));
    // pleated curtains (zig-zag folds = faceted)
    for (const s of [-1, 1]) g.add(this.curtain(wx + s * (ww / 2 + 60), wy + 10, s));
    g.add(P(new THREE.CylinderGeometry(4, 4, ww + 300, 6), 0x8a4a20, { pos: [wx, wy + wh / 2 + 40, WALL_Z + 40], rot: [0, 0, Math.PI / 2] }));

    // ---- shelves with props ----
    const shelf = (x, y) => g.add(P(box(260, 12, 60), 0x8a4a20, { pos: [x, y, WALL_Z + 30] }));
    shelf(-600, 300);
    const books = [0x1b4fd8, 0xffc914, 0x2e9e44, 0xd7263d, 0x6a3fa0, 0xf46036];
    books.forEach((c, i) => {
      const h = 60 + (i % 3) * 12;
      g.add(P(box(20, h, 46), c, { pos: [-700 + i * 24, 306 + h / 2, WALL_Z + 30] }));
    });
    g.add(P(new THREE.IcosahedronGeometry(26, 1), 0xf46036, { pos: [-520, 332, WALL_Z + 30], shiny: true }));
    shelf(600, 280);
    // toy rocket
    g.add(P(new THREE.CylinderGeometry(14, 14, 60, 8), 0xdddde8, { pos: [600, 316, WALL_Z + 30], shiny: true }));
    g.add(P(new THREE.ConeGeometry(14, 30, 8), 0xd7263d, { pos: [600, 361, WALL_Z + 30] }));
    for (const a of [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3]) {
      const f = P(box(4, 22, 18), 0xd7263d, { pos: [600 + Math.cos(a) * 16, 296, WALL_Z + 30 + Math.sin(a) * 16], rot: [0, -a, 0], ink: 1 });
      g.add(f);
    }
    g.add(P(box(34, 34, 34), 0x2e9e44, { pos: [690, 303, WALL_Z + 30] }));
    this.duck = this.makeDuck();
    this.duck.position.set(520, 286, WALL_Z + 32);
    g.add(this.duck);

    // ---- toy chest (back left) with the teddy on top ----
    const cx = -470, cz = -170;
    g.add(P(box(190, 100, 110), 0x6a3fa0, { pos: [cx, 50, cz] }));
    g.add(P(box(204, 26, 122), 0x8a5ad0, { pos: [cx, 112, cz] }));
    g.add(P(new THREE.ExtrudeGeometry(this.starShape(24, 10), { depth: 6, bevelEnabled: false }), 0xffc914, { pos: [cx, 56, cz + 56], shiny: true, ink: 1.2 }));
    this.teddy = this.makeTeddy();
    this.teddy.position.set(cx + 10, 125, cz);
    this.teddy.rotation.y = 0.3;
    g.add(this.teddy);

    // ---- nightstand + lamp (far left), glowing shade ----
    g.add(P(box(110, 120, 90), 0x8a4a20, { pos: [-760, 60, -150] }));
    g.add(P(new THREE.CylinderGeometry(10, 22, 70, 8), 0xffc914, { pos: [-760, 155, -150], shiny: true }));
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(34, 56, 56, 8, 1, true), glowMat(0xffe77a, { side: THREE.DoubleSide }));
    shade.position.set(-760, 216, -150);
    g.add(shade);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(260, 24), glowMat(0xffc46a, { transparent: true, opacity: 0.16, depthWrite: false }));
    glow.position.set(-760, 220, WALL_Z + 3);
    g.add(glow);

    // ---- block fortress (back right) ----
    const bc = [0xd7263d, 0x1b4fd8, 0xffc914, 0x2e9e44];
    const s = 44;
    const layout = [[-2, 0], [-1, 0], [0, 0], [3, 0], [4, 0], [5, 0], [-2, 1], [0, 1], [3, 1], [5, 1], [-2, 2], [-1, 2], [0, 2], [3, 2], [4, 2], [5, 2], [1, 0], [2, 0]];
    layout.forEach(([ix, iy], k) => {
      g.add(P(box(s - 2, s - 2, s - 2), bc[k % 4], { pos: [380 + ix * s, s / 2 + iy * s, -200], rot: [0, (r.next() - 0.5) * 0.12, 0], shiny: true }));
    });
    for (const fx of [380 - s, 380 + 4 * s]) {
      g.add(P(new THREE.CylinderGeometry(2.5, 2.5, 70, 5), 0x77708a, { pos: [fx, 3 * s + 35, -200], ink: 1 }));
      const fl = new THREE.Shape(); fl.moveTo(0, 0); fl.lineTo(36, -11); fl.lineTo(0, -22); fl.closePath();
      g.add(P(new THREE.ExtrudeGeometry(fl, { depth: 3, bevelEnabled: false }), 0xffc914, { pos: [fx + 2, 3 * s + 70, -201], ink: 1 }));
    }

    // ---- round rug = the arena ring ----
    const rug = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 4, 22), toonMat(0x1f8a8a));
    rug.scale.set(560, 1, 190);
    rug.position.set(0, 2, 10);
    g.add(rug);
    const rugIn = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 4.4, 22), toonMat(0x33afa4));
    rugIn.scale.set(420, 1, 128);
    rugIn.position.set(0, 2.2, 10);
    g.add(rugIn);
    for (let i = 0; i < 44; i++) {
      const a = (i / 44) * Math.PI * 2;
      this.batch(0xffc914, box(22, 2, 7), [Math.cos(a) * 500, 4.6, 10 + Math.sin(a) * 166], [0, -Math.atan2(Math.cos(a) * 166, -Math.sin(a) * 500), 0]);
    }

    this.flush();

    // ---- foreground props near the camera (bottom corners) ----
    this.front = new THREE.Group();
    g.add(this.front);
  }

  // Big blocks at the bottom corners, placed for the current screen width.
  placeFront(halfW) {
    const f = this.front;
    f.clear();
    f.add(P(box(110, 110, 110), 0x1b4fd8, { pos: [-halfW * 1.02, 30, 380], rot: [0, 0.35, 0], shiny: true, ink: 2.4 }));
    f.add(P(box(110, 110, 110), 0xffc914, { pos: [halfW * 1.05, 26, 370], rot: [0, -0.3, 0], shiny: true, ink: 2.4 }));
    f.add(P(new THREE.IcosahedronGeometry(38, 1), 0xd7263d, { pos: [halfW * 0.86, 36, 420], shiny: true, ink: 2.2 }));
  }

  starShape(outer, inner) {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 ? inner : outer, a = -Math.PI / 2 + (i * Math.PI) / 5;
      const x = Math.cos(a) * rr, y = -Math.sin(a) * rr;
      i ? s.lineTo(x, y) : s.moveTo(x, y);
    }
    s.closePath();
    return s;
  }

  curtain(x, y, side) {
    const folds = 6, w = 120, h = 280, depth = 14;
    const pos = [];
    const col = [];
    const g = new THREE.BufferGeometry();
    for (let i = 0; i < folds; i++) {
      const x0 = (i / folds) * w - w / 2, x1 = ((i + 1) / folds) * w - w / 2;
      const z0 = i % 2 ? depth : 0, z1 = i % 2 ? 0 : depth;
      // bottom flares outward a little
      const fl = (xx) => xx * 1.18;
      pos.push(x0, h / 2, z0, fl(x0), -h / 2, z0, x1, h / 2, z1, x1, h / 2, z1, fl(x0), -h / 2, z0, fl(x1), -h / 2, z1);
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const m = part(g, 0xd7263d, { ink: 1.4 });
    m.material.side = THREE.DoubleSide;
    m.position.set(x, y - 20, WALL_Z + 24);
    void col; void side;
    return m;
  }

  skyTexture() {
    const c = document.createElement('canvas');
    c.width = 150; c.height = 105;
    const x = c.getContext('2d');
    const gr = x.createLinearGradient(0, 0, 0, 105);
    gr.addColorStop(0, '#0b0a1e'); gr.addColorStop(1, '#2a3f8f');
    x.fillStyle = gr; x.fillRect(0, 0, 150, 105);
    const r = new Rng(4);
    x.fillStyle = '#fff';
    for (let i = 0; i < 18; i++) x.fillRect(Math.floor(r.next() * 150), Math.floor(r.next() * 70), 1 + (i % 3 === 0), 1 + (i % 3 === 0));
    x.fillStyle = '#FFF1C4'; x.beginPath(); x.arc(104, 30, 15, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#0d1640'; x.beginPath(); x.arc(112, 25, 13, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#121a45';
    x.beginPath(); x.moveTo(0, 105);
    for (let i = 0; i <= 10; i++) x.lineTo(i * 15, 82 - (i % 3) * 7), x.lineTo(i * 15 + 8, 88 - (i % 2) * 6);
    x.lineTo(150, 105); x.fill();
    x.fillStyle = '#ffc46a'; x.fillRect(30, 92, 2, 3); x.fillRect(96, 89, 2, 3);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    return t;
  }

  makeTeddy() {
    const t = new THREE.Group();
    const fur = 0x9a5f38, muz = 0xe0b98a;
    const S = (r, d = 1) => new THREE.IcosahedronGeometry(r, d);
    t.add(P(S(1), fur, { scale: [20, 24, 18], pos: [0, 24, 0] }));
    t.add(P(S(1), muz, { scale: [11, 13, 6], pos: [6, 22, 14], ink: 1 }));
    t.add(P(S(19), fur, { pos: [0, 62, 0] }));
    t.add(P(S(1), muz, { scale: [9, 7, 7], pos: [5, 57, 16], ink: 1 }));
    for (const z of [-14, 14]) t.add(P(S(8, 0), fur, { pos: [-2, 80, z] }));
    for (const z of [-20, 20]) t.add(P(S(1), fur, { scale: [8, 8, 12], pos: [8, 6, z] }));
    this.teddyArm = new THREE.Group();
    this.teddyArm.position.set(0, 38, 20);
    this.teddyArm.add(P(S(1), fur, { scale: [7, 15, 7], pos: [0, -10, 0] }));
    t.add(this.teddyArm);
    const eyeM = glowMat(0x14111a);
    for (const z of [-7, 7]) { const e = new THREE.Mesh(S(2.4, 0), eyeM); e.position.set(13, 67, z + 9); t.add(e); }
    const nose = new THREE.Mesh(S(3, 0), eyeM); nose.position.set(12, 59, 20); t.add(nose);
    return t;
  }

  makeDuck() {
    const d = new THREE.Group();
    d.add(P(new THREE.IcosahedronGeometry(1, 1), 0xffc914, { scale: [22, 15, 17], pos: [0, 15, 0], shiny: true }));
    d.add(P(new THREE.IcosahedronGeometry(12, 1), 0xffc914, { pos: [10, 38, 0], shiny: true }));
    d.add(P(new THREE.ConeGeometry(5, 14, 4), 0xf46036, { pos: [24, 36, 0], rot: [0, 0, -Math.PI / 2], ink: 1 }));
    const e = new THREE.Mesh(new THREE.IcosahedronGeometry(2, 0), glowMat(0x14111a)); e.position.set(16, 42, 9); d.add(e);
    return d;
  }

  update(t) {
    const ex = this.excite;
    const fast = ex > 0.05;
    this.teddy.position.y = 125 + Math.abs(Math.sin(t / (fast ? 90 : 420))) * (3 + ex * 22);
    this.teddyArm.rotation.z = 2.4 + Math.sin(t / (fast ? 80 : 260)) * 0.6;
    this.duck.position.y = 286 + Math.abs(Math.sin(t / (fast ? 85 : 360) + 1)) * (2 + ex * 18);
    this.duck.rotation.z = Math.sin(t / 300) * 0.08;
  }
}
