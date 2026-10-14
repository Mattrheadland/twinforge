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
import { WORLDS } from '../game/campaign.js';
import { VH } from '../render/stage.js';

const STEP = 130; // between spaces
const GAP = 120; // extra water between worlds
const WAVE = 70; // how far the path wiggles toward/away from the camera
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
  constructor(stage, { board, chars, heroDef, cleared = [], pos = 0 }) {
    this.stage = stage;
    this.board = board;
    this.chars = chars;
    this.heroDef = heroDef;
    this.scene = new THREE.Scene();
    this.sky = new THREE.Color(LOOK.bedroom.sky);
    this.scene.background = this.sky;
    this.camera = new THREE.PerspectiveCamera(34, 2, 20, 6000);
    this.tex = {};
    this.fx = []; // little animations (star bursts)
    this.pts = board.map((sp, i) => new THREE.Vector3(i * STEP + sp.world * GAP, 0, Math.sin(i * 0.85) * WAVE));
    this.buildWorld();
    this.buildSpaces();
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

  // islands, bridges, water, props
  buildWorld() {
    this.waterMat = new THREE.MeshBasicMaterial({ color: LOOK.bedroom.water });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(this.pts.at(-1).x / 2, -34, 0);
    water.scale.set(this.pts.at(-1).x + 4000, 3000, 1);
    this.scene.add(water);
    this.worldX = [];
    let rnd = 7;
    const r = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
    WORLDS.forEach((w, wi) => {
      const look = LOOK[w.arena] || LOOK.bedroom;
      const idx = this.board.map((s, i) => (s.world === wi ? i : -1)).filter((i) => i >= 0);
      const x0 = this.pts[idx[0]].x - 90, x1 = this.pts[idx.at(-1)].x + 90;
      const cx = (x0 + x1) / 2, hx = (x1 - x0) / 2;
      this.worldX.push({ x0, x1, sky: new THREE.Color(look.sky), water: new THREE.Color(look.water), name: w.arena });
      // chunky island: dirt sides, a thin top slab a little larger
      const side = new THREE.CylinderGeometry(1, 0.86, 1, 11, 1);
      const pos = side.attributes.position;
      for (let k = 0; k < pos.count; k++) {
        const a = Math.atan2(pos.getZ(k), pos.getX(k));
        const j = 1 + Math.sin(a * 3 + wi) * 0.05 + Math.cos(a * 5 + wi * 2) * 0.04;
        pos.setX(k, pos.getX(k) * j); pos.setZ(k, pos.getZ(k) * j);
      }
      side.computeVertexNormals();
      this.P(side, look.side, [cx, -26, 0], [hx + 40, 52, 230], { ink: 3 });
      const top = side.clone();
      this.P(top, look.top, [cx, -2, 0], [hx + 52, 8, 242], { ink: 3 });
      // bridge to the next world
      if (wi < WORLDS.length - 1) {
        const a = this.pts[idx.at(-1)], b = this.pts[idx.at(-1) + 1];
        const mid = a.clone().add(b).multiplyScalar(0.5);
        const len = a.distanceTo(b);
        const ang = Math.atan2(b.z - a.z, b.x - a.x);
        for (let k = -2; k <= 2; k++) {
          const p = mid.clone().add(new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang)).multiplyScalar(k * (len / 6)));
          this.P(g.box, 0xa8723c, [p.x, 0, p.z], [len / 6 - 4, 6, 58], { rot: [0, -ang, 0], ink: false });
        }
      }
      this.props(look.props, cx, hx, r, idx);
    });
    // the path: pebbles between spaces, one draw call
    const n = (this.pts.length - 1) * 2;
    const peb = new THREE.InstancedMesh(g.pebble, new THREE.MeshBasicMaterial({ color: 0xfff1c4 }), n);
    const m = new THREE.Matrix4();
    let k = 0;
    for (let i = 0; i < this.pts.length - 1; i++) {
      for (const f of [0.36, 0.64]) {
        const p = this.pts[i].clone().lerp(this.pts[i + 1], f);
        m.makeScale(1, 0.5, 1).setPosition(p.x, 2, p.z);
        peb.setMatrixAt(k++, m);
      }
    }
    this.scene.add(peb);
  }

  // a few cheap low-poly props per world, kept off the path
  props(kind, cx, hx, r, idx) {
    const spots = [];
    for (let k = 0; k < Math.round(hx / 70); k++) {
      const x = cx - hx + 30 + r() * (hx * 2 - 60);
      const tall = kind === 'castle' || kind === 'forest';
      const zs = tall || r() < 0.55 ? -1 : 1;
      spots.push([x, zs * (130 + r() * 70)]);
    }
    const C = [0xe84a3a, 0x2456e0, 0xffc914, 0x3fc46a];
    for (const [x, z] of spots) {
      const s = 0.8 + r() * 0.5;
      if (kind === 'blocks') {
        const c = C[Math.floor(r() * 4)];
        this.P(g.box, c, [x, 20 * s, z], [40 * s, 40 * s, 40 * s], { rot: [0, r() * 3, 0] });
        if (r() < 0.4) this.P(g.box, C[Math.floor(r() * 4)], [x, 50 * s, z], [30 * s, 26 * s, 30 * s], { rot: [0, r() * 3, 0] });
      } else if (kind === 'castle') {
        this.P(g.cyl, 0xb8b0a8, [x, 50 * s, z], [22 * s, 100 * s, 22 * s]);
        this.P(g.cone, 0x2456e0, [x, 118 * s, z], [28 * s, 40 * s, 28 * s]);
      } else if (kind === 'pier') {
        if (r() < 0.5) this.P(g.cyl, 0x8a5a32, [x, 24 * s, z], [8, 60 * s, 8]);
        else { this.P(g.box, 0xe84a3a, [x, 10, z], [60 * s, 18, 26 * s]); this.P(g.box, 0xffffff, [x, 30, z], [8, 30 * s, 20 * s]); }
      } else if (kind === 'bog') {
        for (let q = 0; q < 3; q++) this.P(g.cone4, 0x3f7a2a, [x + q * 9, 22 * s, z + (q % 2) * 8], [5, 46 * s, 5], { ink: 1.2 });
        if (r() < 0.3) this.P(g.cyl, 0x6fbf4a, [x + 30, 1, z], [18, 2, 18], { ink: 1 });
      } else if (kind === 'forest') {
        this.P(g.cyl, 0x3a2b2a, [x, 14 * s, z], [7, 28 * s, 7], { ink: 1.5 });
        this.P(g.cone, 0x2c4a3a, [x, 60 * s, z], [36 * s, 70 * s, 36 * s]);
      }
    }
    if (kind === 'castle') {
      // the keep behind the boss space
      const b = this.pts[idx.at(-1)];
      this.P(g.box, 0xb8b0a8, [b.x - 40, 60, -250], [150, 120, 70]);
      for (const dx of [-110, 30]) { this.P(g.cyl, 0xb8b0a8, [b.x + dx, 80, -250], [30, 160, 30]); this.P(g.cone, 0xd7263d, [b.x + dx, 182, -250], [38, 50, 38]); }
    }
    if (kind === 'pier') {
      // a lighthouse
      const b = this.pts[idx.at(-1)];
      this.P(g.cyl, 0xffffff, [b.x - 60, 80, -260], [26, 160, 26]);
      this.P(g.cyl, 0xe84a3a, [b.x - 60, 120, -260], [27, 30, 27], { ink: 1 });
      this.P(g.cone, 0xe84a3a, [b.x - 60, 186, -260], [32, 40, 32]);
    }
    if (kind === 'bog') {
      const b = this.pts[idx.at(-1)];
      this.P(g.box, 0x6a4a2e, [b.x - 30, 40, -250], [110, 80, 80]);
      this.P(g.cone4, 0x3a2a2a, [b.x - 30, 110, -250], [92, 60, 70], { rot: [0, Math.PI / 4, 0] });
    }
    if (kind === 'forest') {
      // Czernobog's mountain behind the last space, glowing at the peak
      const b = this.pts.at(-1);
      this.P(g.cone, 0x2a1f44, [b.x + 60, 190, -420], [320, 400, 260], { ink: 3 });
      this.P(g.cone, 0xff4a3a, [b.x + 60, 370, -420], [70, 50, 56], { ink: 2 });
    }
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
    // standees breathe a little
    this.spaces.forEach((s, i) => { if (s.standee && s.standee.visible) s.standee.position.y = s.standee.userData.y + Math.abs(Math.sin(now / 420 + i)) * 4; });
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
    // camera follows the piece; the sky shifts with the world
    const x = this.token.position.x;
    this.camX += (x - this.camX) * Math.min(1, dt / 220);
    this.camera.aspect = this.stage.W / VH;
    this.camera.position.set(this.camX + CAM.x, CAM.y, CAM.z);
    this.camera.lookAt(this.camX + AHEAD, 0, -30);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(true);
    const w = this.worldX.find((q) => x <= q.x1 + GAP / 2) || this.worldX.at(-1);
    this.sky.lerp(w.sky, Math.min(1, dt / 600));
    this.waterMat.color.lerp(w.water, Math.min(1, dt / 600));
    this.world = w.name;
  }

  dispose() {
    disposeTree(this.scene);
    for (const t of Object.values(this.tex)) t.dispose();
  }
}

function disposeTree(o) {
  o.traverse((m) => {
    if (m.isSkinnedMesh && m.skeleton) m.skeleton.dispose(); // each rig has its own bone texture
    if (m.userData.shared) return; // imported model data stays cached
    if (m.geometry && !m.isSprite && !m.geometry.userData.boardShared) m.geometry.dispose();
    if (m.material && m.material.map) m.material.map.dispose(); // standees, painted eyes, space tops
  });
}
