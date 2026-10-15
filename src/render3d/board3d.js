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
    // shimmer: a second, lighter plane with a scrolling ripple texture
    const rip = document.createElement('canvas');
    rip.width = rip.height = 128;
    const rx = rip.getContext('2d');
    rx.strokeStyle = 'rgba(255,255,255,0.55)';
    rx.lineWidth = 3;
    rx.lineCap = 'round';
    for (let k = 0; k < 9; k++) {
      const y = 8 + k * 14, x0 = (k * 37) % 128;
      rx.beginPath(); rx.moveTo(x0, y); rx.lineTo(x0 + 22 + (k % 3) * 8, y); rx.stroke();
    }
    const rtex = new THREE.CanvasTexture(rip);
    rtex.wrapS = rtex.wrapT = THREE.RepeatWrapping;
    rtex.repeat.set(40, 18);
    rtex.magFilter = THREE.NearestFilter;
    this.rippleTex = rtex;
    const shimmer = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: rtex, transparent: true, opacity: 0.1, depthWrite: false }));
    shimmer.rotation.x = -Math.PI / 2;
    shimmer.position.set(water.position.x, -33, 0);
    shimmer.scale.copy(water.scale);
    this.scene.add(shimmer);
    this.worldX = [];
    let rnd = 7;
    const r = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
    WORLDS.forEach((w, wi) => {
      const look = LOOK[w.arena] || LOOK.bedroom;
      const idx = this.board.map((s, i) => (s.world === wi ? i : -1)).filter((i) => i >= 0);
      const x0 = this.pts[idx[0]].x - 90, x1 = this.pts[idx.at(-1)].x + 90;
      const cx = (x0 + x1) / 2, hx = (x1 - x0) / 2;
      const W = { x0, x1, sky: new THREE.Color(look.sky), water: new THREE.Color(look.water), name: w.arena, base: { sky: new THREE.Color(look.sky), water: new THREE.Color(look.water), top: new THREE.Color(look.top), side: new THREE.Color(look.side) }, dark: 0 };
      this.worldX.push(W);
      // chunky island: dirt sides, a thin top slab a little larger
      const side = new THREE.CylinderGeometry(1, 0.86, 1, 11, 1);
      const pos = side.attributes.position;
      for (let k = 0; k < pos.count; k++) {
        const a = Math.atan2(pos.getZ(k), pos.getX(k));
        const j = 1 + Math.sin(a * 3 + wi) * 0.05 + Math.cos(a * 5 + wi * 2) * 0.04;
        pos.setX(k, pos.getX(k) * j); pos.setZ(k, pos.getZ(k) * j);
      }
      side.computeVertexNormals();
      W.sideMesh = this.P(side, look.side, [cx, -26, 0], [hx + 40, 52, 230], { ink: 3 });
      const top = side.clone();
      W.topMesh = this.P(top, look.top, [cx, -2, 0], [hx + 52, 8, 242], { ink: 3 });
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

  // a little flag on a pole, waving (the pole is drawn by the caller)
  flag(x, y, z, color) {
    const f = this.P(g.box, color, [x + 14, y, z], [28, 16, 2], { ink: 1.2 });
    f.userData.baseY = y;
    this.amb.flags.push(f);
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
      for (const dx of [-110, 30]) { this.P(g.cyl, 0xb8b0a8, [b.x + dx, 80, -250], [30, 160, 30]); this.P(g.cone, 0xd7263d, [b.x + dx, 182, -250], [38, 50, 38]); this.flag(b.x + dx, 207, -250, 0xffc914); }
    }
    if (kind === 'blocks') {
      // a pennant on the block fortress
      const b = this.pts[idx.at(-1)];
      this.P(g.cyl, 0xffffff, [b.x + 40, 50, -200], [4, 100, 4], { ink: 1 });
      this.flag(b.x + 40, 96, -200, 0x3fc46a);
    }
    if (kind === 'pier') {
      // a lighthouse
      const b = this.pts[idx.at(-1)];
      this.P(g.cyl, 0xffffff, [b.x - 60, 80, -260], [26, 160, 26]);
      this.P(g.cyl, 0xe84a3a, [b.x - 60, 120, -260], [27, 30, 27], { ink: 1 });
      this.P(g.cone, 0xe84a3a, [b.x - 60, 186, -260], [32, 40, 32]);
      // the beam sweeps around
      const beam = new THREE.Mesh(g.cone, new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 0.35, depthWrite: false }));
      beam.rotation.z = Math.PI / 2;
      beam.scale.set(36, 420, 36);
      const pivot = new THREE.Group();
      pivot.position.set(b.x - 60, 136, -260);
      beam.position.set(-210, 0, 0);
      pivot.add(beam);
      this.scene.add(pivot);
      this.amb.beams.push(pivot);
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
    if (c.kind === 'villain') this.gloom = this.gloomTarget;
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
    let struck = false;
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
    if (this.rippleTex) { this.rippleTex.offset.x = now / 9000; this.rippleTex.offset.y = Math.sin(now / 4000) * 0.02; }
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
        w.topMesh.material.uniforms.uColor.value.copy(w.base.top).lerp(GLOOM.top, d);
        w.sideMesh.material.uniforms.uColor.value.copy(w.base.side).lerp(GLOOM.side, d);
      });
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
