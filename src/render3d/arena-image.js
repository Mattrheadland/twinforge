// Painted arenas (Castle, Fishing Pier, Haunted Forest, Bog Shack) in the 3D
// stage: Astra's backdrop on a big card against the back, her floor tiled
// across the ground, and her props stood up as cut-out cards that hop when a
// big hit shakes the stage. Same interface as Room3D (group, excite,
// placeFront, update), so the stage swaps arenas freely.
//
// Art comes from public/arenas/<id>/ (scripts/build-arenas.py). Textures load
// in the background; until they arrive the floor and backdrop show flat colors.
import * as THREE from 'three';
import { WALL_Z } from './room.js';
import { getArenaLook } from '../data/arena-looks.js';

const CAM_Z = 870; // camera distance from z = 0 (stage3d: HERO_Z + DIST)
const FRONT_Z = 380;
const BACK_Z = WALL_Z + 70;

const loader = new THREE.TextureLoader();
const cache = new Map(); // url -> texture (kept for the session; arenas come back often)
function tex(url, onReady) {
  let t = cache.get(url);
  if (!t) {
    t = loader.load(url, () => { for (const fn of t.userData.waiting) fn(t); t.userData.waiting = []; });
    t.colorSpace = THREE.NoColorSpace;
    t.anisotropy = 4;
    t.userData.waiting = [];
    cache.set(url, t);
  }
  if (onReady) (t.image && t.image.width ? onReady(t) : t.userData.waiting.push(onReady));
  return t;
}

// A soft round glow (canvas gradient), shared by fireflies, light pools and mist.
let glowTex = null;
function glow() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.25, 'rgba(255,255,255,0.75)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}

// v6 arena atmosphere (def.look, data/arenas*.js): low mist banks drifting between the backdrop and the
// toys, fireflies wandering and blinking, coloured light pools on the floor under the lamps. Everything
// is additive and kept away from the toys' faces and the question card (the directive: no clutter).
function buildAtmosphere(group, look) {
  const out = { mist: [], flies: null, pools: [] };
  if (look.mist) {
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1500, 210), new THREE.MeshBasicMaterial({ map: glow(), color: look.mist, transparent: true, opacity: look.mistK ?? 0.3, depthWrite: false, blending: THREE.AdditiveBlending }));
      // low banks at three depths: behind the back props, mid-field, and just behind the toys' feet
      m.position.set((i - 1) * 700, 18 + i * 6, BACK_Z + 90 + i * 150);
      m.renderOrder = 3;
      group.add(m);
      out.mist.push({ m, x0: m.position.x, ph: i * 2.1, sp: 0.00006 + i * 0.00002 });
    }
  }
  if (look.fireflies) {
    const n = look.fireflies.count || 30, cols = (look.fireflies.colors || ['#C8FF6A']).map((c) => new THREE.Color(c));
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    const seeds = [];
    for (let i = 0; i < n; i++) {
      const c = cols[i % cols.length];
      col.set([c.r, c.g, c.b], i * 3);
      // spread across the arena, mostly behind and above the toys
      seeds.push({ x: (Math.random() * 2 - 1) * 900, y: 60 + Math.random() * 300, z: BACK_Z + Math.random() * 520, a: Math.random() * 6.28, b: Math.random() * 6.28, s: 0.4 + Math.random() * 0.8 });
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ map: glow(), size: look.fireflies.size || 22, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
    pts.renderOrder = 4;
    group.add(pts);
    out.flies = { pts, pos, col, base: col.slice(), seeds };
  }
  for (const p of look.pools || []) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(p.r * 2.6, p.r * 1.1), new THREE.MeshBasicMaterial({ map: glow(), color: p.color, transparent: true, opacity: p.k ?? 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.rotation.x = -Math.PI / 2;
    m.renderOrder = 2;
    group.add(m);
    out.pools.push({ m, slot: p.slot, k: p.k ?? 0.5, ph: Math.random() * 6 });
  }
  return out;
}

export class ImageArena3D {
  constructor(def) {
    this.def = def;
    this.group = new THREE.Group();
    this.excite = 0;
    const base = `arenas/${def.id}/`;
    // backdrop card: sized in placeFront once the screen shape is known
    this.backMat = new THREE.MeshBasicMaterial({ map: tex(base + 'backdrop.jpg'), color: 0xffffff });
    this.back = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.backMat);
    this.back.position.z = WALL_Z - 6;
    this.group.add(this.back);
    // floor: one big plane with the tile repeated
    const floorTex = tex(base + 'floor.jpg');
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    const W = 5200, D = 1200;
    floorTex.repeat.set(W / def.floorTile, D / def.floorTile);
    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshBasicMaterial({ map: floorTex, color: def.tint ?? 0xffffff }));
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.set(0, 0, WALL_Z - 6 + D / 2);
    this.group.add(this.floor);
    // a soft dark band where the floor meets the backdrop (sells the depth)
    const band = new THREE.Mesh(new THREE.PlaneGeometry(W, 70), new THREE.MeshBasicMaterial({ color: 0x0c0818, transparent: true, opacity: 0.22, depthWrite: false }));
    band.rotation.x = -Math.PI / 2;
    band.position.set(0, 0.5, WALL_Z + 30);
    this.group.add(band);
    // props
    const look = getArenaLook(def.id);
    this.props =(def.props || []).map(([n, slot, h], i) => {
      const card = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.5 }));
      card.visible = false;
      const holder = new THREE.Group();
      holder.add(card);
      this.group.add(holder);
      // size the card from the image's shape once it loads
      tex(`${base}prop-${n}.png`, (t) => {
        card.material.map = t;
        card.material.needsUpdate = true;
        card.scale.set((h * t.image.width) / t.image.height, h, 1);
        card.position.y = h / 2;
        card.visible = true;
      });
      return { card, holder, slot, h, phase: i * 1.7, sway: (look && look.sway || {})[n] || 0 };
    });
    this.atmos = look ? buildAtmosphere(this.group, look) : null;
  }

  // halfW = visible half-width at z = FRONT_Z for the current screen shape.
  placeFront(halfW) {
    const hw = (z) => (halfW * (CAM_Z - z)) / (CAM_Z - FRONT_Z);
    // backdrop: cover the view at the back wall with margin for shake and zoom,
    // and put the image's floor line on y = 0
    const f = this.def.horizon;
    const w = Math.max(hw(WALL_Z) * 2 * 1.18, (1.5 * 520) / f);
    const h = w / 1.5;
    this.back.scale.set(w, h, 1);
    this.back.position.y = f * h - h / 2;
    // props
    const slots = {
      backL: [-0.92, BACK_Z], backL2: [-0.66, BACK_Z + 40], backR: [0.92, BACK_Z], backR2: [0.66, BACK_Z + 40],
      frontL: [-1.0, FRONT_Z], frontR: [1.02, FRONT_Z - 10],
    };
    for (const p of this.props) {
      const [k, z] = slots[p.slot] || [0, BACK_Z];
      p.holder.position.set(k * hw(z), 0, z);
      p.base = 0;
      // face the camera
      p.holder.lookAt(p.holder.position.x * 0.15, 0, CAM_Z);
    }
    // light pools sit on the floor under their prop's slot
    for (const pl of (this.atmos && this.atmos.pools) || []) {
      const [k, z] = slots[pl.slot] || [0, BACK_Z];
      pl.m.position.set(k * hw(z), 1.2, z + 20);
    }
  }

  update(t) {
    const ex = this.excite;
    for (const p of this.props) {
      const hop = ex > 0.05 ? Math.abs(Math.sin(t / 85 + p.phase)) * ex * 16 : 0;
      p.holder.position.y = hop;
      // a gentle breeze for props that hang or stand tall (look.sway), plus the shake from big hits
      p.card.rotation.z = (ex > 0.05 ? Math.sin(t / 70 + p.phase) * ex * 0.08 : 0) + (p.sway ? Math.sin(t / 900 + p.phase) * p.sway : 0);
    }
    const a = this.atmos;
    if (!a) return;
    for (const m of a.mist) m.m.position.x = m.x0 + Math.sin(t * m.sp + m.ph) * 260;
    if (a.flies) {
      const { pos, col, base, seeds, pts } = a.flies;
      seeds.forEach((s, i) => {
        pos[i * 3] = s.x + Math.sin(t / 2100 * s.s + s.a) * 70;
        pos[i * 3 + 1] = s.y + Math.sin(t / 1300 * s.s + s.b) * 40;
        pos[i * 3 + 2] = s.z + Math.cos(t / 2500 * s.s + s.a) * 40;
        const blink = 0.35 + 0.65 * Math.max(0, Math.sin(t / 380 * s.s + s.b * 3));
        col[i * 3] = base[i * 3] * blink; col[i * 3 + 1] = base[i * 3 + 1] * blink; col[i * 3 + 2] = base[i * 3 + 2] * blink;
      });
      pts.geometry.attributes.position.needsUpdate = true;
      pts.geometry.attributes.color.needsUpdate = true;
    }
    for (const pl of a.pools) pl.m.material.opacity = pl.k * (0.8 + 0.2 * Math.sin(t / 420 + pl.ph)) * (1 + ex * 0.6);
  }

  dispose() {
    // textures stay cached for the next visit; geometry and materials go
    this.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  }
}
