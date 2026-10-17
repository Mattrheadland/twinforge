// Campaign board as a little 3D diorama (Matt's board references: chunky
// low-poly islands over water, octagon spaces, a dotted path, the hero's real
// toy as the game piece and the wild creatures standing on their spaces like
// cardboard standees). Logic stays in game/campaign.js and the HUD stays in
// ui/board-ui.js; this file only builds and animates the scene.
//
// The stage renders this scene instead of the arena while it's set
// (Stage3D.setBoard). Everything here is cheap: shared geometries, one draw
// call for all path pebbles, and foe standees are cached 3D snapshots.
import * as THREE from 'three';
import { part } from './toon.js';
import { buildRig } from './rigs.js';
import { modelReady } from './models.js';
import { buildFireDancer, buildShadowPeeker } from './night-crew.js';
import { WORLDS } from '../game/campaign.js';
import { VH } from '../render/stage.js';
import { layout, pathPoints, edgeDist, GAP, LEVEL } from './board-layout.js';
import { Baker, bakedMat } from './board-kit.js';
import { bakeIsland, bakeTier, shoreRings, PAL } from './board-terrain.js';
import { dressProp, landmark, castleWalls, boardwalk, dock, stiltShack, seaPiece, sailboat, rowboat } from './board-dress.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
const TOKEN_SCALE = 0.5;
const STANDEE = 140; // standee sprite size (a 250-unit snapshot frame)
const CAM = new THREE.Vector3(-40, 430, 560); // camera offset from the piece
const AHEAD = 110; // look a bit ahead of the piece

// Island colors per world: top, side, plus sky behind it
const LOOK = {
  bedroom: { top: 0xe0a860, side: 0x9a6a3a, sky: 0x9ad8ff, water: 0x2f86d8, props: 'blocks' },
  castle: { top: 0x6cc24a, side: 0x8c7a6a, sky: 0x9ad8ff, water: 0x2f86d8, props: 'castle' },
  'fishing-pier': { top: 0xf2d27c, side: 0xb88a52, sky: 0x8fd0ff, water: 0x2a7ad0, props: 'pier' },
  'bog-shack': { top: 0x5d9a3a, side: 0x5c4630, sky: 0x9cc7b0, water: 0x2f6a6a, props: 'bog' },
  'haunted-forest': { top: 0x4a3a6a, side: 0x2e2440, sky: 0x4a2a5a, water: 0x24204a, props: 'forest' },
};
const SPACE = { start: 0xffffff, fight: 0xe84a3a, star: 0xffc914, lucky: 0x3fc46a, boss: 0x8a4ae0 };
// "the villain is winning": islands nearest the mountain drift toward this palette
const GLOOM = { top: new THREE.Color(0x4a3a6a), side: new THREE.Color(0x2e2440), sky: new THREE.Color(0x3a2048), water: new THREE.Color(0x1c1838) };
const smooth = (k) => k * k * (3 - 2 * k); // ease in and out
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// standee pictures survive between visits (they're just canvases)
const shots = new Map();

const g = {
  disc: new THREE.CylinderGeometry(34, 38, 10, 8),
  top: new THREE.CircleGeometry(30, 8),
  pebble: new THREE.IcosahedronGeometry(6, 0),
  box: new THREE.BoxGeometry(1, 1, 1),
  cone: new THREE.ConeGeometry(1, 1, 6),
  cone4: new THREE.ConeGeometry(1, 1, 4),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 7),
  ball: new THREE.IcosahedronGeometry(1, 1),
};
for (const k of Object.keys(g)) g[k].userData.boardShared = true;

// little canvas pictures for the tops of the spaces
function topTexture(kind) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  x.lineJoin = 'round';
  x.lineWidth = 5;
  x.strokeStyle = '#14111A';
  const star = (cx, cy, r, fill) => {
    x.beginPath();
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 ? r * 0.45 : r, a = -Math.PI / 2 + (i * Math.PI) / 5;
      x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    x.closePath(); x.fillStyle = fill; x.fill(); x.stroke();
  };
  if (kind === 'star') star(32, 34, 24, '#FFF3B0');
  else if (kind === 'lucky') {
    x.fillStyle = '#fff'; x.beginPath(); x.roundRect(10, 10, 44, 44, 9); x.fill(); x.stroke();
    x.fillStyle = '#D7263D';
    for (const [px, py] of [[21, 21], [32, 32], [43, 43]]) { x.beginPath(); x.arc(px, py, 5, 0, 7); x.fill(); }
  } else if (kind === 'start') {
    x.fillStyle = '#FFC914'; x.beginPath(); x.moveTo(32, 8); x.lineTo(56, 30); x.lineTo(48, 30); x.lineTo(48, 54); x.lineTo(16, 54); x.lineTo(16, 30); x.lineTo(8, 30); x.closePath(); x.fill(); x.stroke();
  } else if (kind === 'boss') {
    x.fillStyle = '#FFC914'; x.beginPath(); x.moveTo(10, 48); x.lineTo(8, 18); x.lineTo(22, 30); x.lineTo(32, 12); x.lineTo(42, 30); x.lineTo(56, 18); x.lineTo(54, 48); x.closePath(); x.fill(); x.stroke();
  } else if (kind === 'check') {
    x.lineWidth = 12; x.beginPath(); x.moveTo(14, 34); x.lineTo(27, 47); x.lineTo(51, 19); x.stroke();
    x.lineWidth = 6; x.strokeStyle = '#5CE07A'; x.stroke();
  } else if (kind === 'fight') {
    x.fillStyle = '#fff'; x.beginPath(); x.arc(32, 32, 12, 0, 7); x.fill(); x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  return t;
}

export class Board3D {
  constructor(stage, { board, chars, heroDef, cleared = [], pos = 0, audio = null, clearedWorlds = 0, rounds = 0 }) {
    this.stage = stage;
    this.board = board;
    this.chars = chars;
    this.heroDef = heroDef;
    this.audio = audio;
    this.clearedWorlds = clearedWorlds; // how far Luca is: the storm over the mountain grows with it
    this.rounds = rounds; // rolls so far: the darkness creeps along the board with them
    this.gloom = gloomFor(clearedWorlds, rounds); // what the board shows now
    this.gloomTarget = this.gloom;
    // cinematics: a fly-over, the boss swoop and the villain scene drive the camera
    // instead of the follow view; `blend` eases the camera back afterwards
    this.cine = null;
    this.blend = null;
    this.camPos = new THREE.Vector3();
    this.camLook = new THREE.Vector3();
    // free look: pan (ox along the board, oz toward/away) and zoom, on top of the follow camera
    this.look = { ox: 0, oz: 0, oy: 0, zoom: 1, tx: 0, tz: 0, ty: 0, tzoom: 1, free: false };
    this.amb = { flags: [], beams: [], flies: [], embers: [], bolt: 4000 + Math.random() * 4000 };
    // Czernobog's night crew: fire dancers on the summit and the forest's dark
    // edge, shadow peekers rising near the path wherever the gloom has reached
    this.crew = { dancers: [], swirl: [], peekers: [], spots: [], extra: [], boost: 0, want: -1 };
    this.scene = new THREE.Scene();
    this.sky = new THREE.Color(LOOK.bedroom.sky);
    this.scene.background = this.sky;
    this.camera = new THREE.PerspectiveCamera(34, 2, 20, 6000);
    this.tex = {};
    this.fx = []; // little animations (star bursts)
    // the spaces: same positions and order as ever (board-layout.js pathPoints)
    this.pts = pathPoints(board).map((p) => new THREE.Vector3(p.x, 0, p.z));
    this.buildWorld();
    this.buildSpaces();
    this.buildPeekers();
    this.buildToken(pos);
    this.setCleared(cleared);
    this.camX = this.token.position.x;
    this.lastT = performance.now();
  }

  texFor(kind) {
    return (this.tex[kind] ||= topTexture(kind));
  }

  P(geo, color, pos, scale, o = {}) {
    // scale goes in before the outline so the ink stays a few units thick
    const m = part(geo, color, { ink: o.ink ?? 2, ...o, pos, ...(scale ? { scale } : {}) });
    this.scene.add(m);
    return m;
  }

  // islands, bridges, water, props (v6 detail pass: stepped cliffs, beaches,
  // foam, waterfalls, boardwalks, landmarks and dense themed dressing; the
  // layout lives in board-layout.js, the shapes in board-terrain/board-dress.js).
  // Each island bakes into one lit mesh + one ink hull + one glow mesh, so the
  // whole board is a few dozen draw calls however much is on it.
  buildWorld() {
    const L = (this.layout = layout(this.board));
    const xMid = this.pts.at(-1).x / 2, xSpan = this.pts.at(-1).x + 4000;
    // the sea: a flat colour (lerped per world as before), a faint deep-water
    // pattern, and two scrolling ripple layers drifting in different directions
    this.waterMat = new THREE.MeshBasicMaterial({ color: LOOK.bedroom.water });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(xMid, LEVEL.water, 0);
    water.scale.set(xSpan, 3000, 1);
    this.scene.add(water);
    const rip = document.createElement('canvas');
    rip.width = rip.height = 128;
    const rx = rip.getContext('2d');
    rx.strokeStyle = 'rgba(255,255,255,0.55)';
    rx.lineWidth = 3;
    rx.lineCap = 'round';
    for (let k = 0; k < 9; k++) {
      const y = 8 + k * 14, x0 = (k * 37) % 128;
      rx.beginPath(); rx.moveTo(x0, y); rx.quadraticCurveTo(x0 + 14, y - 4, x0 + 26 + (k % 3) * 8, y); rx.stroke();
    }
    const rtex = new THREE.CanvasTexture(rip);
    rtex.wrapS = rtex.wrapT = THREE.RepeatWrapping;
    rtex.repeat.set(40, 18);
    rtex.magFilter = THREE.NearestFilter;
    this.rippleTex = rtex;
    for (const [t, y, op] of [[rtex, LEVEL.water + 0.3, 0.13]]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: op, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(xMid, y, 0);
      m.scale.copy(water.scale);
      this.scene.add(m);
    }
    // shared transparent materials for foam and shallows (alpha in vertex colours)
    this.foamMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.shallowMat = new THREE.MeshBasicMaterial({ color: 0x8ff0f0, vertexColors: true, transparent: true, depthWrite: false, opacity: 0.55, side: THREE.DoubleSide });
    this.amb.foam = [];
    this.amb.falls = [];
    this.amb.boats = [];
    this.worldX = [];
    this.detail = { islands: [] };
    let rnd = 7;
    const r = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
    // every shore ring on the board merges into three meshes (shallows, foam, the outer foam line)
    const rings = (this.rings = { shallow: [], foam: [], foamOuter: [] });
    const shore = (sh, rim, opts) => {
      const g = shoreRings(sh, rim, opts);
      for (const k of Object.keys(rings)) { g[k].translate(sh.cx, 0, sh.cz); rings[k].push(g[k]); }
    };
    WORLDS.forEach((w, wi) => {
      const look = LOOK[w.arena] || LOOK.bedroom;
      const sh = L.isles[wi];
      const pal = { ...(PAL[w.arena] || PAL.castle) };
      const x0 = sh.path[0].x - 90, x1 = sh.path.at(-1).x + 90;
      const cx = (x0 + x1) / 2, hx = (x1 - x0) / 2;
      // the gloom creeps over an island through one uniform shared by its baked meshes
      const darkU = { value: 0 };
      const W = { x0, x1, sky: new THREE.Color(look.sky), water: new THREE.Color(look.water), name: w.arena, base: { sky: new THREE.Color(look.sky), water: new THREE.Color(look.water), top: new THREE.Color(look.top), side: new THREE.Color(look.side) }, dark: 0, darkU };
      this.worldX.push(W);
      const bk = new Baker(), gk = new Baker();
      // terrain: notches (straight drops) where the waterfalls and bridges meet the sea
      const notches = [];
      for (const f of L.falls) if (f.w === wi && f.kind === 'sea') notches.push({ a: f.ang, w: 30 });
      for (const b of L.bridges) {
        if (b.from === wi) notches.push({ a: Math.atan2(b.a.z - sh.cz + 0, b.a.x + 60 - sh.cx), w: 34 });
        if (b.to === wi) notches.push({ a: Math.atan2(b.b.z - sh.cz, b.b.x - 60 - sh.cx), w: 34 });
      }
      const rim = bakeIsland(bk, sh, pal, { notches, floor: w.arena === 'bedroom' ? 'boards' : 'patch', seed: wi + 1 });
      for (const [k, t] of sh.tiers.entries()) bakeTier(bk, t, pal, wi * 3 + k);
      // the path: a worn trail under the pebbles (flat discs, no ink)
      for (let i = 0; i < sh.wpath.length - 1; i++) {
        const a = sh.wpath[i], b = sh.wpath[i + 1];
        const n = Math.max(2, Math.round(Math.hypot(b.x - a.x, b.z - a.z) / 22));
        for (let k = 0; k <= n; k++) {
          const x = a.x + ((b.x - a.x) * k) / n, z = a.z + ((b.z - a.z) * k) / n;
          if (edgeDist(sh, x, z) < 24) continue; // stop at the cliff (bridges carry on)
          bk.add('disc8', pal.path, [x, LEVEL.top + 0.15, z], [19, 0.3, 19], [0, k, 0], { ink: false, shade: 0.94 + ((i + k) % 3) * 0.04 });
        }
      }
      // landmark, set dressing, extras
      const lm = landmark(bk, gk, w.arena, sh.landmark);
      for (const f of lm.flags) this.flagAt(f[0], f[1], f[2], f[3]);
      if (lm.beam) this.beamAt(lm.beam);
      if (sh.wall) for (const f of castleWalls(bk, sh.wall)) this.flagAt(f[0], f[1], f[2], 0xd7263d);
      for (const d of sh.docks || []) dock(bk, gk, d);
      for (const st of sh.stilts || []) stiltShack(bk, gk, st, LEVEL.water);
      let props = 0;
      for (const p of L.props) if (p.w === wi) { dressProp(bk, gk, p); props++; }
      // waterfalls: a pool on the plateau, the falling sheet, splash foam below
      let falls = 0;
      for (const f of L.falls) {
        if (f.w !== wi) continue;
        this.waterfall(bk, f, pal);
        falls++;
      }
      // the sea around this island: rocks, sea stacks, buoys, little islets
      for (const q of L.sea) {
        if (q.w !== wi) continue;
        if (q.kind === 'islet') {
          const ish = { cx: q.x, cz: q.z, rx: 70 * q.s + 20, rz: 46 * q.s + 14, n: 2.2, seed: q.v * 9, lumpK: 0.12 };
          const irim = bakeIsland(bk, ish, PAL[q.v < 0.5 ? 'islet' : w.arena === 'haunted-forest' ? 'mountain' : 'islet'], { seed: q.v * 99, top: -20 });
          shore(ish, irim, { shallowW: 60, foamOut: 16 });
          // a tree or two and a rock on it
          dressProp(bk, gk, { kind: w.arena === 'haunted-forest' ? 'twisted' : w.arena === 'fishing-pier' ? 'palm' : w.arena === 'bog-shack' ? 'cypress' : 'tree', x: q.x - 10, y: -20, z: q.z - 6, rot: q.rot, s: 0.8, v: q.v });
          dressProp(bk, gk, { kind: 'rock', x: q.x + 26, y: -20, z: q.z + 8, rot: q.rot, s: 0.8, v: q.v });
          if (q.v > 0.5) dressProp(bk, gk, { kind: w.arena === 'bedroom' ? 'block' : 'bush', x: q.x + 4, y: -20, z: q.z + 18, rot: q.rot, s: 0.8, v: q.v });
        } else seaPiece(bk, gk, q, LEVEL.water);
      }
      shore(sh, rim);
      const lit = bk.build(bakedMat(darkU), { name: `island-${w.arena}`, chunk: 220 });
      const glow = gk.build(new THREE.MeshBasicMaterial({ vertexColors: true }), { name: `glow-${w.arena}`, chunk: 220 });
      for (const h of glow.children.filter((c) => c.name === 'ink')) glow.remove(h); // glowing bits have no ink
      this.scene.add(lit, glow);
      this.detail.islands.push({ name: w.arena, props, falls, tiers: sh.tiers.length, landmark: true, pieces: lit.userData.pieces + glow.userData.pieces, triangles: lit.userData.triangles + glow.userData.triangles });
      // the forest keeps Czernobog's mountain, the villain, his crew and the fireflies
      if (w.arena === 'haunted-forest') this.mountain(cx, hx, r);
    });
    const ringMesh = (list, mat, order) => { const m = new THREE.Mesh(mergeGeometries(list), mat); m.renderOrder = order; this.scene.add(m); for (const q of list) q.dispose(); return m; };
    this.outerFoamMat = this.foamMat.clone();
    // boardwalks on stilts between the islands, following the path exactly
    const bw = new Baker();
    for (const b of L.bridges) {
      const A = L.isles[b.from], B = L.isles[b.to];
      const over = (u) => {
        const x = b.a.x + (b.b.x - b.a.x) * u, z = b.a.z + (b.b.z - b.a.z) * u;
        return edgeDist(A, x, z) < 6 && edgeDist(B, x, z) < 6;
      };
      boardwalk(bw, b.a, b.b, over, { y: LEVEL.top + 3, arch: 14 });
    }
    this.scene.add(bw.build(bakedMat(), { name: 'boardwalks', chunk: 220 }));
    this.detail.bridges = L.bridges.length;
    // boats out at sea (each its own small baked mesh so it can bob and drift)
    for (const [k, b] of L.boats.entries()) {
      const bb = new Baker();
      const a = (shape, color, p, s, rot = null, o = {}) => bb.add(shape, color, p, s, rot, o);
      if (k % 2) rowboat(a, b.color); else sailboat(a, b.color);
      const m = bb.build(bakedMat(), { name: 'boat' });
      m.position.set(b.x, LEVEL.water, b.z);
      m.rotation.y = b.rot;
      m.userData.boat = b;
      this.scene.add(m);
      this.amb.boats.push(m);
    }
    this.detail.boats = L.boats.length;
    this.detail.sea = L.sea.length;
    ringMesh(rings.shallow, this.shallowMat, 1);
    ringMesh(rings.foam, this.foamMat, 2);
    this.amb.foam.push(ringMesh(rings.foamOuter, this.outerFoamMat, 2));
    this.rings = null;
    // the path: pebbles between spaces, one draw call
    const n = (this.pts.length - 1) * 2;
    const peb = new THREE.InstancedMesh(g.pebble, new THREE.MeshBasicMaterial({ color: 0xfff1c4 }), n);
    const m = new THREE.Matrix4();
    let k = 0;
    for (let i = 0; i < this.pts.length - 1; i++) {
      for (const f of [0.36, 0.64]) {
        const p = this.pts[i].clone().lerp(this.pts[i + 1], f);
        const bridge = this.board[i].world !== this.board[i + 1].world;
        m.makeScale(1, 0.5, 1).setPosition(p.x, bridge ? 9 + Math.sin(f * Math.PI) * 10 : 3, p.z);
        peb.setMatrixAt(k++, m);
      }
    }
    this.scene.add(peb);
  }

  // A waterfall: the sheet is a scrolling striped texture on a thin bent strip
  // (one shared texture for all of them), with white splash at the foot.
  waterfall(bk, f, pal) {
    if (!this.fallTex) {
      const c = document.createElement('canvas');
      c.width = 32; c.height = 64;
      const x = c.getContext('2d');
      x.fillStyle = '#5ac8f0'; x.fillRect(0, 0, 32, 64);
      x.fillStyle = '#9ae6ff';
      for (let k = 0; k < 7; k++) x.fillRect((k * 11) % 28, (k * 23) % 64, 3, 18);
      x.fillStyle = '#ffffff';
      for (let k = 0; k < 5; k++) x.fillRect((k * 7 + 3) % 30, (k * 29) % 64, 2, 10);
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.magFilter = THREE.NearestFilter;
      this.fallTex = t;
      this.fallMat = new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide });
    }
    const out = f.kind === 'sea' ? 1 : -1; // tier falls spill toward the front too (outward from the tier)
    const ca = Math.cos(f.ang), sa = Math.sin(f.ang);
    const width = f.kind === 'sea' ? 30 : 24;
    // strip: from the lip, a little out, then straight down
    const prof = f.kind === 'sea' ? [[-4, f.top + 1], [6, f.top - 2], [12, f.top - 14], [16, f.bottom + 1]] : [[-4, f.top + 1], [5, f.top - 2], [9, f.top - 14], [11, f.bottom + 1]];
    const pos = [], uv = [];
    const nx = -sa, nz = ca;
    for (let k = 0; k < prof.length; k++) {
      const [d, y] = prof[k];
      for (const s of [-1, 1]) {
        pos.push(f.x + ca * d + nx * s * width / 2, y, f.z + sa * d + nz * s * width / 2);
        uv.push((s + 1) / 2, k / (prof.length - 1) * 2);
      }
    }
    const idx = [];
    for (let k = 0; k < prof.length - 1; k++) { const a = k * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    const sheet = new THREE.Mesh(geo, this.fallMat);
    this.scene.add(sheet);
    // the stream: a pool on the plateau feeding the lip, ink-free
    const sp = f.kind === 'sea' ? f.pool : f.spring;
    if (sp) {
      bk.add('disc12', 0x3a2a1e, [sp.x, f.top + 0.2, sp.z], [26, 0.8, 26], null, { ink: false });
      bk.add('disc12', 0x4ec0e8, [sp.x, f.top + 0.6, sp.z], [22, 0.8, 22], null, { ink: false });
      const dx = f.x - sp.x, dz = f.z - sp.z, len = Math.hypot(dx, dz);
      bk.add('box', 0x4ec0e8, [(f.x + sp.x) / 2, f.top + 0.5, (f.z + sp.z) / 2], [len, 0.8, width * 0.8], [0, -Math.atan2(dz, dx), 0], { ink: false });
      for (let k = 0; k < 4; k++) bk.add('dodec', 0x948a84, [sp.x + Math.cos(k * 1.7) * 24, f.top + 2, sp.z + Math.sin(k * 1.7) * 24], [6, 4, 5], [k, k * 2, 0], { ink: 0.8 });
    }
    // splash at the foot: a ring of foam blobs that puff in update()
    const foot = { x: f.x + ca * (prof.at(-1)[0] + 4), z: f.z + sa * (prof.at(-1)[0] + 4), y: f.bottom + 1 };
    const puffs = [];
    for (let k = 0; k < 5; k++) {
      const p = new THREE.Mesh(g.ball, this.splashMat ||= new THREE.MeshBasicMaterial({ color: 0xffffff }));
      p.userData = { x: foot.x + nx * (k - 2) * width * 0.22, z: foot.z + nz * (k - 2) * width * 0.22, y: foot.y, ph: k * 1.3 };
      this.scene.add(p);
      puffs.push(p);
    }
    if (f.kind === 'tier') bk.add('disc12', 0x4ec0e8, [foot.x, LEVEL.top + 0.5, foot.z], [20, 0.8, 16], null, { ink: false });
    this.amb.falls.push({ sheet, puffs, out });
  }

  // a waving flag (no pole: the landmark builds its own)
  flagAt(x, y, z, color) {
    const f = this.P(g.box, color, [x + 10, y, z], [20, 12, 1.6], { ink: 1.2 });
    f.userData.baseY = y;
    this.amb.flags.push(f);
  }

  // the Beacon's sweeping light
  beamAt([x, y, z]) {
    const beam = new THREE.Mesh(g.cone, new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 0.3, depthWrite: false }));
    beam.rotation.z = Math.PI / 2;
    beam.scale.set(30, 380, 30);
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    beam.position.set(-190, 0, 0);
    pivot.add(beam);
    this.scene.add(pivot);
    this.amb.beams.push(pivot);
  }

  // Czernobog's mountain behind the last space (unchanged from v5.1, now on a rocky base)
  mountain(cx, hx, r) {
    {
      const b = this.pts.at(-1);
      // a craggy base so the mountain rises out of the sea like the islands do
      const mb = new Baker();
      const msh = { cx: b.x + 60, cz: -420, rx: 300, rz: 170, n: 2.2, seed: 5, lumpK: 0.08 };
      const mrim = bakeIsland(mb, msh, PAL.mountain, { seed: 77 });
      for (let k = 0; k < 7; k++) mb.add('frust6', k % 2 ? 0x2a1f44 : 0x352a50, [b.x + 60 + Math.cos(k * 0.9) * 210, 20, -420 + Math.sin(k * 0.9) * 120], [40 + (k % 3) * 14, 70 + (k % 4) * 26, 40], [0, k, 0]);
      const mm = mb.build(bakedMat(this.worldX.at(-1).darkU), { name: 'mountain-base' });
      this.scene.add(mm);
      const gs = shoreRings(msh, mrim);
      for (const k of Object.keys(this.rings)) { gs[k].translate(msh.cx, 0, msh.cz); this.rings[k].push(gs[k]); }
      this.P(g.cone, 0x2a1f44, [b.x + 60, 190, -420], [320, 400, 260], { ink: 3 });
      this.peakGlow = this.P(g.cone, 0xff4a3a, [b.x + 60, 370, -420], [70, 50, 56], { ink: 2 });
      // the villain himself, alive on the summit (his real toy, bigger than life)
      const v = this.chars.nightwing;
      if (v) {
        this.villain = { rig: buildRig(v), group: new THREE.Group() };
        this.villain.group.position.set(b.x + 60, 392, -420);
        this.villain.group.scale.setScalar(1.15);
        this.villain.group.rotation.y = -0.85;
        this.villain.group.add(this.villain.rig.root);
        this.scene.add(this.villain.group);
      }
      // fire dancers: five swirl around the summit below Czernobog's feet (small,
      // so he stays the focal point), each on its own height, pace and hop beat;
      // three more dance along the island's dark back edge
      const mx = b.x + 60, mz = -420;
      for (let k = 0; k < 5; k++) {
        const y = 262 + ((k * 2) % 5) * 12; // 262..310, mixed so neighbours differ
        const f = ((390 - y) / 400) * 0.96; // cone radius fraction at that height (peak y = 390); feet sink a touch
        const d = this.dancer(0, y - 4, 0, 0.9, k * 1.9 + 0.4, 1.75 + (k % 3) * 0.25);
        this.crew.swirl.push({ d, cx: mx, cz: mz, rx: 320 * f, rz: 260 * f, a0: (k / 5) * Math.PI * 2 + (k % 2) * 0.3, w: 0.00022 + (k % 3) * 0.00004 });
      }
      for (let k = 0; k < 3; k++) this.dancer(cx - hx * 0.45 + k * hx * 0.26, 2, -206 + (k % 2) * 12, 1.1, 7 + k * 2.3, 1.8 + k * 0.2);
      // embers drifting up from the summit
      const emberMat = new THREE.MeshBasicMaterial({ color: 0xff8a3a });
      for (let k = 0; k < 14; k++) {
        const e = new THREE.Mesh(g.ball, emberMat);
        e.scale.setScalar(3 + Math.random() * 3);
        e.userData = { x: b.x + 60 + (Math.random() - 0.5) * 120, z: -420 + (Math.random() - 0.5) * 80, phase: Math.random() * 5, speed: 0.6 + Math.random() * 0.6 };
        this.scene.add(e);
        this.amb.embers.push(e);
      }
      // fireflies in the forest
      const flyMat = new THREE.MeshBasicMaterial({ color: 0xd6ff5a });
      for (let k = 0; k < 10; k++) {
        const f = new THREE.Mesh(g.ball, flyMat);
        f.scale.setScalar(2.4);
        f.userData = { x: cx - hx + 40 + r() * (hx * 2 - 80), z: -120 - r() * 160, y: 30 + r() * 60, phase: r() * 6 };
        this.scene.add(f);
        this.amb.flies.push(f);
      }
    }
  }

  // one fire dancer (night-crew.js), feet at y, hopping on its own beat
  dancer(x, y, z, scale, seed, hz = 2) {
    const d = buildFireDancer(THREE, part, { seed, hz });
    d.root.position.set(x, y, z);
    d.root.scale.setScalar(scale);
    this.scene.add(d.root);
    this.crew.dancers.push(d);
    return d;
  }

  // Shadow peekers wait buried beside the path (behind it, so the piece is
  // never covered) and rise where the gloom has reached: round(gloom * 6) of
  // them, taken from the mountain end first. Two more sit by the piece for the
  // villain scene. Built once; nothing is allocated per frame.
  buildPeekers() {
    const C = this.crew;
    let rnd = 11;
    const r = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
    // candidate spots: the midpoint between two spaces of one world, pushed back from the path
    for (let i = 0; i < this.pts.length - 1; i++) {
      if (this.board[i].world !== this.board[i + 1].world) continue; // not on a bridge
      const a = this.pts[i], b = this.pts[i + 1];
      C.spots.push({ x: (a.x + b.x) / 2 + (r() - 0.5) * 20, z: (a.z + b.z) / 2 - 74 - r() * 30, world: this.board[i].world, order: r() });
    }
    // dealt round-robin from the mountain end, so six peekers spread over the
    // dark islands instead of piling into the forest; random within a world
    const by = {};
    for (const s of C.spots) (by[s.world] ||= []).push(s);
    const worlds = Object.keys(by).map(Number).sort((a, b) => b - a);
    for (const w of worlds) by[w].sort((p, q) => p.order - q.order);
    C.spots = [];
    for (let round = 0; C.spots.length < 28 && worlds.some((w) => by[w][round]); round++) for (const w of worlds) if (by[w][round]) C.spots.push(by[w][round]);
    for (let k = 0; k < 6; k++) C.peekers.push(this.peeker(r() * 1000, 3600 + r() * 1800));
    for (let k = 0; k < 2; k++) C.extra.push(this.peeker(k * 2, 2600));
  }

  peeker(seed, period) {
    const s = buildShadowPeeker(THREE, part, { seed, period });
    const pivot = new THREE.Group(); // the island top; the rig rises out of it
    pivot.add(s.root);
    pivot.scale.setScalar(1.25); // reads at the follow camera's distance
    pivot.visible = false;
    this.scene.add(pivot);
    return { rig: s, pivot, ph: seed % 6.283, period };
  }

  // the villain scene's two extra peekers: one behind each shoulder of the
  // piece (behind its space, never on it), one rise-look-sink cycle, then gone
  crewSurge() {
    const tp = this.token.position, now = performance.now();
    this.crew.extra.forEach((e, k) => {
      const x = tp.x + (k ? 92 : -84);
      let z = tp.z - 62;
      // step back until clear of every space disc (the path wiggles)
      for (let n = 0; n < 6 && this.pts.some((p) => Math.hypot(p.x - x, p.z - z) < 76); n++) z -= 22;
      e.pivot.position.set(x, 2, z);
      e.t0 = now + k * 260;
    });
  }

  buildSpaces() {
    this.spaces = this.board.map((sp, i) => {
      const p = this.pts[i];
      const disc = this.P(g.disc, SPACE[sp.type] || 0xffffff, [p.x, 5, p.z], sp.type === 'boss' ? [1.35, 1, 1.35] : null);
      const face = new THREE.Mesh(g.top, new THREE.MeshBasicMaterial({ map: this.texFor(sp.type), transparent: true, alphaTest: 0.3 }));
      face.rotation.x = -Math.PI / 2;
      face.position.set(p.x, 10.5, p.z);
      if (sp.type === 'boss') face.scale.setScalar(1.3);
      this.scene.add(face);
      let standee = null;
      if (sp.foeId) {
        const def = this.chars[sp.foeId];
        if (!shots.has(def.id)) shots.set(def.id, this.stage.snapshot(def, { w: 128, h: 128, framing: 'full' }));
        const tex = new THREE.CanvasTexture(shots.get(def.id));
        tex.magFilter = THREE.NearestFilter;
        standee = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, alphaTest: 0.5 }));
        standee.center.set(0.5, 0.084);
        const big = sp.final ? 1.7 : sp.giant ? 1.35 : sp.type === 'boss' ? 1.2 : 1;
        standee.scale.setScalar(STANDEE * big);
        standee.position.set(p.x + 16, 10, p.z - 14);
        standee.userData.y = 10;
        standee.userData.big = big;
        standee.userData.phase = (i * 1.37) % 4; // so they don't all hop at once
        this.scene.add(standee);
      }
      return { disc, face, standee, type: sp.type, cleared: false };
    });
  }

  buildToken(pos) {
    this.token = new THREE.Group();
    this.facing = new THREE.Group();
    this.facing.rotation.y = -0.55; // 3/4 toward the camera
    this.token.add(this.facing);
    this.token.scale.setScalar(TOKEN_SCALE);
    this.rig = buildRig(this.heroDef);
    this.facing.add(this.rig.root);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(40, 12), new THREE.MeshBasicMaterial({ color: 0x0c0818, transparent: true, opacity: 0.4, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 22;
    this.token.add(shadow);
    this.scene.add(this.token);
    this.place(pos);
  }

  spot(i) {
    const p = this.pts[i];
    return new THREE.Vector3(p.x - 14, 10, p.z + 12);
  }

  place(i) {
    this.at = i;
    this.hop = null;
    this.token.position.copy(this.spot(i));
  }

  // hop to space i; resolves when it lands
  moveTo(i) {
    return new Promise((resolve) => {
      this.hop = { from: this.token.position.clone(), to: this.spot(i), t0: performance.now(), dur: 260, resolve };
      this.at = i;
    });
  }

  // ---- free look (pinch / drag / wheel from board-ui.js) ----
  pan(dx, dy) {
    const k = 1.1 / this.look.zoom;
    const maxX = this.pts.at(-1).x + 300;
    this.look.tx = Math.max(-this.token.position.x - 200, Math.min(maxX - this.token.position.x, this.look.tx - dx * k));
    // dragging down tilts the camera up (to see the mountain top); dragging up looks down the path
    this.look.ty = Math.max(0, Math.min(360, this.look.ty + dy * k * 0.4));
    this.look.tz = Math.max(-200, Math.min(240, this.look.tz + dy * k * 0.25));
    this.look.free = true;
  }

  zoomBy(f) {
    this.look.tzoom = Math.max(0.55, Math.min(2.4, this.look.tzoom * f));
    this.look.free = true;
  }

  recenter() {
    this.look.tx = 0;
    this.look.tz = 0;
    this.look.ty = 0;
    this.look.tzoom = 1;
    this.look.free = false;
  }

  // ---- cinematics (camera key frames; everything else keeps animating) ----
  // keys: [{ at: 0..1, pos, look }], eased between neighbours. `hold` keeps the
  // last key until endCine(); otherwise the camera blends back when it's over.
  startCine(kind, dur, keys, { hold = false, onTick = null } = {}) {
    this.endCine(false);
    const first = keys[0];
    first.pos = first.pos || this.camPos.clone();
    first.look = first.look || this.camLook.clone();
    this.cine = { kind, dur, keys, hold, onTick, t0: performance.now(), done: false };
    return new Promise((resolve) => { this.cine.resolve = resolve; });
  }

  // where a cinematic puts the camera at time k (0..1)
  cineAt(c, k) {
    const ks = c.keys;
    let i = 0;
    while (i < ks.length - 2 && k > ks[i + 1].at) i++;
    const a = ks[i], b = ks[i + 1];
    const u = smooth(Math.max(0, Math.min(1, (k - a.at) / Math.max(1e-3, b.at - a.at))));
    return { pos: a.pos.clone().lerp(b.pos, u), look: a.look.clone().lerp(b.look, u) };
  }

  // stop the current cinematic; the camera eases back to the follow view
  endCine(blend = true) {
    const c = this.cine;
    if (!c) return;
    this.cine = null;
    if (this.villain) this.villain.stir = 0;
    if (blend) this.blend = { pos: this.camPos.clone(), look: this.camLook.clone(), t0: performance.now(), dur: 700 };
    if (!c.done) { c.done = true; c.resolve && c.resolve(); }
  }

  // a tap during any cinematic: jump to its end
  skipCine() {
    const c = this.cine;
    if (!c) return;
    if (c.kind === 'villain') { this.gloom = this.gloomTarget; if (!this.crew.extra[0].t0) this.crewSurge(); }
    if (c.hold) {
      const end = this.cineAt(c, 1);
      this.camPos.copy(end.pos); this.camLook.copy(end.look);
      c.t0 = -1e9; // sit on the last key
      if (!c.done) { c.done = true; c.resolve && c.resolve(); }
    } else this.endCine(true);
  }

  // the top of the follow view (no free look), for cinematics to land on
  followView(x = this.token.position.x) {
    return { pos: V3(x + CAM.x, CAM.y, CAM.z), look: V3(x + AHEAD, 0, -30) };
  }

  // Opening fly-over: high over the first island, along the path to the mountain,
  // then down into the follow view behind the piece. ~3.5 s, any tap skips it.
  flyOver() {
    const p0 = this.pts[0], pN = this.pts.at(-1);
    const end = this.followView();
    const keys = [
      { at: 0, pos: V3(p0.x - 260, 820, 980), look: V3(p0.x + 180, 40, -60) },
      { at: 0.55, pos: V3(pN.x - 520, 760, 1150), look: V3(pN.x + 40, 240, -380) },
      { at: 1, pos: end.pos, look: end.look },
    ];
    this.camPos.copy(keys[0].pos); this.camLook.copy(keys[0].look);
    return this.startCine('fly', 3500, keys, {});
  }

  // Boss swoop: frame the boss standee on space i and hold there (endCine() lets go).
  frameBoss(i, dur = 900) {
    const s = this.spaces[i];
    const p = this.pts[i];
    const big = s && s.standee ? s.standee.scale.x / STANDEE : 1;
    const keys = [
      { at: 0 },
      { at: 1, pos: V3(p.x + 90, 150 * big + 70, 330 * big + 90), look: V3(p.x + 24, 62 * big + 24, p.z - 14) },
    ];
    return this.startCine('boss', dur, keys, { hold: true });
  }

  // "The villain is winning": glide to the summit, Czernobog stirs, the darkness
  // spreads one notch, and the camera comes back. ~4 s, tap skips.
  villainScene(rounds) {
    this.rounds = rounds;
    this.gloomTarget = gloomFor(this.clearedWorlds, rounds);
    if (!this.villain) { this.gloom = this.gloomTarget; return Promise.resolve(); }
    const m = this.villain.group.position;
    const back = this.followView();
    const keys = [
      { at: 0 },
      { at: 0.3, pos: V3(m.x - 360, m.y + 170, m.z + 640), look: V3(m.x, m.y + 100, m.z) },
      { at: 0.7, pos: V3(m.x - 250, m.y + 140, m.z + 500), look: V3(m.x, m.y + 105, m.z) },
      { at: 0.86, pos: V3(m.x - 700, 720, 1000), look: V3(m.x - 300, 160, -200) }, // pull back over the board, not through the mountain
      { at: 1, pos: back.pos, look: back.look },
    ];
    const self = this;
    let struck = false, rose = false;
    return this.startCine('villain', 4200, keys, {
      onTick(k) {
        // he stirs while the camera is on him, and the storm cracks once
        self.villain.stir = k > 0.2 && k < 0.8 ? Math.min(1, (k - 0.2) / 0.15) : 0;
        if (k > 0.42 && !struck) {
          struck = true;
          self.stage.flash(0.5, '#D8C8FF');
          self.stage.shake(0.3);
          self.audio && self.audio.sfx('thunder');
          self.amb.emberBurst = performance.now();
        }
        // as the camera swings back to the piece, two shadow peekers rise beside it
        if (k > 0.8 && !rose) { rose = true; self.crewSurge(); }
        self.gloom += (self.gloomTarget - self.gloom) * (k > 0.4 ? 0.06 : 0);
      },
    });
  }

  setCleared(list) {
    this.spaces.forEach((s, i) => {
      const c = i > 0 && list.includes(i);
      if (c === s.cleared) return;
      s.cleared = c;
      if (s.standee) s.standee.visible = !c;
      if (c && (s.type === 'fight' || s.type === 'boss')) s.face.material.map = this.texFor('check');
      if (c) s.disc.material.uniforms.uColor.value.multiplyScalar(0.6);
    });
  }

  // a star space pops its star
  burst(i) {
    const p = this.pts[i];
    const m = new THREE.Mesh(g.top, new THREE.MeshBasicMaterial({ map: this.texFor('star'), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }));
    m.position.set(p.x, 30, p.z);
    this.scene.add(m);
    this.fx.push({ m, t0: performance.now() });
  }

  // 2D world position (the UI's 450-unit space) above space i
  project(i, up = 120) {
    const v = this.pts[i].clone();
    v.y = up;
    v.project(this.camera);
    return { x: ((v.x + 1) / 2) * this.stage.W, y: ((1 - v.y) / 2) * VH };
  }

  update() {
    const now = performance.now();
    const dt = Math.min(50, now - this.lastT);
    this.lastT = now;
    // swap in the real model once it's loaded
    if (this.rig.wantsModel && modelReady(this.rig.wantsModel)) {
      const rig = buildRig(this.heroDef);
      if (!rig.wantsModel) { this.facing.remove(this.rig.root); disposeTree(this.rig.root); this.facing.add(rig.root); this.rig = rig; }
    }
    // hop arc
    let air = 0;
    if (this.hop) {
      const h = this.hop;
      const k = Math.min(1, (now - h.t0) / h.dur);
      this.token.position.lerpVectors(h.from, h.to, k);
      air = Math.sin(k * Math.PI);
      this.token.position.y += air * 46;
      if (k >= 1) { this.hop = null; h.resolve(); }
    }
    this.rig.apply({ t: now, eyes: 'open', mouth: 'smile', action: air > 0 ? 'win' : 'idle', headBob: air * 4 });
    // standees breathe a little, and every few seconds one does a little hop
    this.spaces.forEach((s, i) => {
      if (!s.standee || !s.standee.visible) return;
      const u = s.standee.userData;
      const cyc = (now / 1000 + u.phase) % 4.6; // one hop (0.42 s) every 4.6 s
      const hop = cyc < 0.42 ? Math.sin((cyc / 0.42) * Math.PI) * 16 : 0;
      s.standee.position.y = u.y + Math.abs(Math.sin(now / 420 + i)) * 4 + hop;
      const sq = 1 + hop / 160; // a bit of stretch on the way up
      s.standee.scale.set(STANDEE * u.big / sq, STANDEE * u.big * sq, 1);
    });
    // star bursts
    this.fx = this.fx.filter((f) => {
      const k = (now - f.t0) / 700;
      f.m.position.y = 30 + k * 120;
      f.m.rotation.y = k * 12;
      f.m.material.opacity = 1 - k;
      if (k < 1) return true;
      this.scene.remove(f.m); f.m.material.dispose();
      return false;
    });
    // ---- ambient life ----
    const A = this.amb;
    for (const f of A.flags) { f.scale.x = 28 * (0.85 + 0.15 * Math.sin(now / 160 + f.position.x)); f.position.y = f.userData.baseY + Math.sin(now / 300 + f.position.z) * 1.5; }
    for (const p of A.beams) p.rotation.y = now / 1400;
    for (const f of A.flies) { const u = f.userData; f.position.set(u.x + Math.sin(now / 900 + u.phase) * 30, u.y + Math.sin(now / 600 + u.phase * 2) * 14, u.z + Math.cos(now / 1100 + u.phase) * 24); f.visible = Math.sin(now / 350 + u.phase * 3) > -0.3; }
    // embers drift up; a burst (the villain scene) throws them faster and bigger for a moment
    const burst = A.emberBurst ? Math.max(0, 1 - (now - A.emberBurst) / 1400) : 0;
    for (const e of A.embers) {
      const u = e.userData;
      const k = ((now / 1000) * u.speed * (1 + burst * 1.5) + u.phase) % 1;
      e.position.set(u.x + Math.sin(k * 9 + u.phase) * (14 + burst * 30), 395 + k * (180 + burst * 120), u.z);
      const sc = (1 - k) * (3 + u.phase) * (1 + burst);
      e.scale.setScalar(Math.max(0.5, sc));
    }
    // ---- night crew ----
    const C = this.crew;
    const stir = this.villain?.stir || 0;
    C.boost += ((stir > 0 ? 1 : 0) - C.boost) * Math.min(1, dt / 350);
    // the summit ring circles the peak (it passes behind the mountain and comes round again)
    for (const q of C.swirl) {
      const a = q.a0 + now * q.w;
      q.d.root.position.x = q.cx + Math.cos(a) * q.rx;
      q.d.root.position.z = q.cz + Math.sin(a) * q.rz;
    }
    const cp = this.camera.position;
    for (const d of C.dancers) {
      d.animate(now);
      d.body.position.y *= 1 + C.boost * 1.6; // the villain scene: they leap
      d.root.rotation.y = Math.atan2(cp.x - d.root.position.x, cp.z - d.root.position.z); // flames face the camera
    }
    // peekers come out as the gloom spreads: round(gloom * 6), mountain end first
    const want = Math.min(C.peekers.length, Math.round(this.gloom * 6));
    if (want !== C.want) {
      C.want = want;
      // only on islands the darkness has actually reached
      const open = C.spots.filter((sp) => this.worldX[sp.world].dark > 0.05);
      C.live = 0;
      C.peekers.forEach((p, k) => {
        const spot = k < want ? open[k] : null;
        p.pivot.visible = !!spot;
        if (spot) { p.pivot.position.set(spot.x, 2, spot.z); C.live = k + 1; }
      });
    }
    for (let k = 0; k < C.live; k++) { const p = C.peekers[k]; peekAt(p, now + p.ph * 1000); }
    // the two by the piece run one rise-look-sink cycle after the storm cracks
    for (const e of C.extra) {
      if (!e.t0) continue;
      const s = now - e.t0;
      if (s < 0) continue; // the second one comes up a beat later
      if (s > e.period - 20) { e.pivot.visible = false; e.t0 = 0; continue; }
      e.pivot.visible = true;
      peekAt(e, s);
    }
    if (this.rippleTex) { this.rippleTex.offset.x = now / 9000; this.rippleTex.offset.y = Math.sin(now / 4000) * 0.02; }
    // foam breathes in and out at the waterline; waterfalls scroll and splash; boats bob
    if (this.outerFoamMat) this.outerFoamMat.opacity = 0.45 + 0.4 * Math.sin(now / 900);
    if (this.fallTex) this.fallTex.offset.y = (now / 700) % 1;
    for (const f of A.falls) {
      for (const p of f.puffs) {
        const u = p.userData, k = ((now / 600 + u.ph) % 1);
        p.position.set(u.x, u.y + k * 6, u.z);
        p.scale.setScalar(3 + Math.sin(k * Math.PI) * 4);
      }
    }
    for (const b of A.boats) {
      const u = b.userData.boat;
      b.position.y = LEVEL.water + Math.sin(now / 700 + u.ph) * 1.6;
      b.position.x = u.x + Math.sin(now / 9000 + u.ph) * u.drift;
      b.rotation.z = Math.sin(now / 800 + u.ph) * 0.06;
      b.rotation.x = Math.sin(now / 1100 + u.ph) * 0.04;
    }
    if (this.peakGlow) this.peakGlow.scale.setScalar(1 + 0.12 * Math.sin(now / 260) + (this.villain?.stir || 0) * 0.3);
    // Czernobog on the summit: breathing idle, slow turn, wings in the wind; angrier the further Luca gets
    if (this.villain) {
      const anger = Math.min(1, this.clearedWorlds / 4 + this.gloom * 0.5);
      const v = this.villain;
      const stir = v.stir || 0; // the villain scene: big sway, wings up, angry
      v.rig.apply({ t: now, eyes: anger > 0.6 || stir > 0 ? 'angry' : 'open', mouth: stir > 0.5 ? 'open' : anger > 0.6 ? 'grit' : 'flat', action: 'idle', armF: -0.4 + Math.sin(now / 700) * 0.25 - stir * 0.9, armB: 0.3 + Math.sin(now / 820) * 0.25 + stir * 0.9, headBob: Math.sin(now / 900) * 3 + Math.sin(now / 140) * 4 * stir });
      v.group.rotation.y = -0.85 + Math.sin(now / (2200 - anger * 900)) * (0.18 + anger * 0.2) + Math.sin(now / 330) * 0.35 * stir;
      v.group.rotation.z = Math.sin(now / 260) * 0.12 * stir;
      v.group.position.y = 392 + Math.sin(now / 1100) * 4 + stir * 14;
      // lightning over the mountain now and then (more often as the storm grows)
      A.bolt -= dt;
      if (A.bolt <= 0) {
        A.bolt = (3500 + Math.random() * 5000) * (1 - anger * 0.5) * (1 - this.gloom * 0.4);
        this.stage.flash(0.22 + anger * 0.15, '#D8C8FF');
        this.stage.shake(0.08 + anger * 0.1);
        this.audio && this.audio.sfx('thunder');
      }
    }
    // the darkness creeps along the board from the mountain end: each island
    // lerps toward the forest palette by how far the gloom has reached it
    if (this.gloomShown !== this.gloom) {
      this.gloomShown = this.gloom;
      const n = this.worldX.length;
      this.worldX.forEach((w, i) => {
        const d = Math.max(0, Math.min(1, this.gloom * 1.6 - (n - 1 - i) * 0.3));
        if (d === w.dark) return;
        w.dark = d;
        w.sky.copy(w.base.sky).lerp(GLOOM.sky, d);
        w.water.copy(w.base.water).lerp(GLOOM.water, d);
        w.darkU.value = d; // every baked mesh on the island (terrain, props, landmark) sinks toward the forest palette
      });
      this.crew.want = -1; // re-place the peekers on the newly dark islands
    }
    // camera follows the piece, with the free-look pan/zoom on top; the sky shifts with the world
    const x = this.token.position.x;
    this.camX += (x - this.camX) * Math.min(1, dt / 220);
    const L = this.look, ease = Math.min(1, dt / 160);
    L.ox += (L.tx - L.ox) * ease; L.oz += (L.tz - L.oz) * ease; L.oy += (L.ty - L.oy) * ease; L.zoom += (L.tzoom - L.zoom) * ease;
    const zf = 1 / L.zoom;
    const cx = this.camX + L.ox;
    const pos = this.camPos, look = this.camLook;
    const c = this.cine;
    if (c) {
      // a cinematic owns the camera
      const k = Math.min(1, (now - c.t0) / c.dur);
      const at = this.cineAt(c, k);
      pos.copy(at.pos); look.copy(at.look);
      c.onTick && c.onTick(k);
      if (k >= 1 && !c.done) { c.done = true; c.resolve && c.resolve(); }
      if (k >= 1 && !c.hold) this.endCine(true);
    } else {
      pos.set(cx + CAM.x * zf, CAM.y * zf + L.oy * 0.35, CAM.z * zf + L.oz);
      look.set(cx + AHEAD * zf, L.oy, -30 + L.oz * 0.55 - L.oy * 0.6);
      const b = this.blend;
      if (b) {
        // easing back from where the cinematic left the camera
        const k = Math.min(1, (now - b.t0) / b.dur);
        pos.lerpVectors(b.pos, pos, smooth(k)); look.lerpVectors(b.look, look, smooth(k));
        if (k >= 1) this.blend = null;
      }
    }
    this.camera.aspect = this.stage.W / VH;
    this.camera.position.copy(pos);
    this.camera.lookAt(look);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(true);
    const w = this.worldX.find((q) => x <= q.x1 + GAP / 2) || this.worldX.at(-1);
    const wSky = c && c.kind === 'villain' ? this.worldX.at(-1) : w; // the summit scene shows the forest sky
    this.sky.lerp(wSky.sky, Math.min(1, dt / 600));
    this.waterMat.color.lerp(wSky.water, Math.min(1, dt / 600));
    this.world = w.name;
  }

  dispose() {
    disposeTree(this.scene);
    for (const t of Object.values(this.tex)) t.dispose();
  }
}

// Drive a shadow peeker so its rise-look-sink cycle sits at ms into the cycle
// (the rig offsets its own clock by ph * 300).
function peekAt(p, ms) {
  p.rig.animate(ms - p.ph * 300);
}

// how far the villain's darkness has spread: by worlds beaten and rolls taken
export function gloomFor(clearedWorlds = 0, rounds = 0) {
  return Math.min(1, clearedWorlds / 4 + rounds / 30);
}

function disposeTree(o) {
  o.traverse((m) => {
    if (m.isSkinnedMesh && m.skeleton) m.skeleton.dispose(); // each rig has its own bone texture
    if (m.userData.shared) return; // imported model data stays cached
    if (m.geometry && !m.isSprite && !m.geometry.userData.boardShared) m.geometry.dispose();
    if (m.material && m.material.map) m.material.map.dispose(); // standees, painted eyes, space tops
  });
}
