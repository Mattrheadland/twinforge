// 3D stage (STYLE_GUIDE v5): low-poly cel-shaded toys and bedroom rendered
// with WebGL, plus a transparent 2D canvas on top for hit effects, words,
// shields and status icons. It keeps the same interface as the 2D Stage, so
// the battle choreography, HUD and effects don't change.
//
// Coordinates: the choreography works in the 2D world (450 units tall, x from
// 0 to W). Toys live in 3D; their 2D positions (x, y, head(), center()) are
// projections of their 3D anchors, so effects land on the right spot.
// Screen shake and zoom are applied identically to both layers (view offset
// on the 3D camera, a transform on the 2D canvas).
import * as THREE from 'three';
import { Stage, VH } from '../render/stage.js';
import { Fighter } from '../render/fighter.js';
import { setArtScale } from '../render/pixel.js';
import { buildRig } from './rigs.js';
import { modelReady, modelInfo } from './models.js';
import { Room3D } from './room.js';
import { ImageArena3D } from './arena-image.js';
import { ARENAS } from '../data/arenas.js';

export const RETRO_H = 400; // 3D render height in retro mode (chunky, early-3D)
const FOV = 30;
const DIST = 840; // camera to hero distance: 1 world unit ≈ 1 screen unit at the hero
const HERO_Z = 30, FOE_Z = -30;
const CAM_Y = 205, LOOK_Y = 150;
const TURN = 0.92; // toys turn toward the camera (3/4 view)
const SHOW_Z = -130; // toy gallery turntable: a step back so the whole toy fits above the buttons

let active = null;
export const get3D = () => active;

class Fighter3D extends Fighter {
  constructor(def, side, home3, stage) {
    super(def, side, stage.spotOf(home3));
    this.stage3 = stage;
    this.home3 = home3.clone();
    this.k3 = 1 / this.scale;
    this.lastT = 0;
    this.rig = buildRig(def);
    this.root = new THREE.Group();
    this.facing = new THREE.Group();
    this.facing.add(this.rig.root);
    this.root.add(this.facing);
    stage.scene.add(this.root);
    // hard floor shadow
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 18), new THREE.MeshBasicMaterial({ color: 0x0c0818, transparent: true, opacity: 0.5, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.renderOrder = 1;
    stage.scene.add(this.shadow);
    // power-up aura: flame rays behind the toy
    this.auraMesh = makeAura();
    stage.scene.add(this.auraMesh);
  }

  setPx(px) { this.px = px; }

  setHome(home3) {
    this.home3.copy(home3);
    const s = this.stage3.spotOf(home3);
    this.home = { ...s };
    this.x = s.x; this.y = s.y; this.scale = s.scale;
    this.k3 = 1 / s.scale;
  }

  // the imported model finished loading after this toy was built: swap it in
  upgradeRig() {
    const old = this.rig;
    if (!old.wantsModel || !modelReady(old.wantsModel)) return;
    const rig = buildRig(this.def);
    if (rig.wantsModel) { old.wantsModel = null; return; }
    this.facing.remove(old.root);
    disposeTree(old.root);
    this.facing.add(rig.root);
    this.rig = rig;
  }

  sync(t) {
    this.lastT = t;
    if (this.rig.wantsModel) this.upgradeRig();
    const p = this.pose(t);
    this.rig.apply(p);
    const r = this.root;
    const show = this.stage3.showcase && this.side === 'hero' ? this.stage3.showcase : null;
    if (show && !this.showSpot) {
      this.showSpot = this.stage3.spotOf(new THREE.Vector3(0, 0, SHOW_Z));
      this.x = this.showSpot.x;
      this.y = this.showSpot.y;
    }
    const big = this.big || 1;
    const z = show ? SHOW_Z : this.home3.z;
    r.position.set((show ? 0 : this.home3.x) + (this.ox + (this.jitter || 0)) * this.k3, -this.oy * this.k3, z);
    r.rotation.z = -this.rot * this.flip;
    r.scale.set(this.sx * big, this.sy * big, this.sx * big);
    this.facing.rotation.y = show ? show.yaw : this.side === 'hero' ? -TURN : TURN;
    this.facing.scale.x = this.flip;
    this.rig.flash.value = Math.min(1, this.flash) * 0.85;
    // shadow shrinks as the toy leaves the floor
    const lift = Math.max(0, -this.oy * this.k3);
    const k = Math.max(0.35, 1 - lift / 260);
    this.shadow.position.set(r.position.x, 5.4, z);
    this.shadow.position.x = r.position.x;
    this.shadow.scale.set(78 * k * this.sx * big, 30 * k * big, 1);
    // aura
    const a = this.aura;
    this.auraMesh.visible = a > 0.01;
    if (this.auraMesh.visible) {
      const c = this.rig.anchors.center;
      this.auraMesh.position.set(r.position.x + c.x * 0.2 * this.flip, r.position.y + c.y, z - 70);
      const s = 135 * (1 + 0.06 * Math.sin(t / 90));
      this.auraMesh.scale.set(s, s, 1);
      this.auraMesh.rotation.z = t / 900;
      this.auraMesh.material.opacity = 0.8 * Math.min(1, a);
      this.auraMesh.material.color.set(this.auraColor);
      this.auraMesh.children[0].material.opacity = 0.85 * Math.min(1, a);
    }
  }

  project(local) {
    this.sync(this.lastT);
    this.root.updateMatrixWorld(true);
    return this.stage3.project(local.clone().applyMatrix4(this.rig.root.matrixWorld));
  }

  point(name) {
    const a = this.rig.anchors[name];
    return a ? this.project(a) : null;
  }

  head() {
    const h = this.project(this.rig.anchors.head);
    const top = this.project(this.rig.anchors.top);
    return { x: h.x, y: h.y, top: top.y, r: this.rig.headR * this.scale };
  }

  center() {
    return this.project(this.rig.anchors.center);
  }

  draw() {}
  drawShadow() {}
  drawAura() {}

  dispose() {
    for (const o of [this.root, this.shadow, this.auraMesh]) {
      this.stage3.scene.remove(o);
      disposeTree(o);
    }
  }
}

// Frees a toy's GPU data. Geometry and textures shared with the model cache
// (userData.shared) and the outline hulls stay.
function disposeTree(o) {
  o.traverse((m) => {
    if (m.isSkinnedMesh && m.skeleton) m.skeleton.dispose(); // each rig has its own bone texture
    if (m.userData.shared) return;
    if (m.geometry) m.geometry.dispose(); // includes code-built toys' outline hulls
    if (m.material && m.material.map) m.material.map.dispose();
  });
}

export { modelInfo };

function makeAura() {
  const rays = 12, pos = [], core = [];
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2, w = 0.07;
    const L = i % 2 ? 1.05 : 0.9;
    const ca = Math.cos(a), sa = Math.sin(a);
    const pt = (r, da) => [Math.cos(a + da) * r, Math.sin(a + da) * r, 0];
    pos.push(...pt(0.38, -w), ...pt(L, 0), ...pt(0.38, w));
    core.push(...pt(0.42, -w * 0.35), ...pt(L * 0.78, 0), ...pt(0.42, w * 0.35));
    void ca; void sa;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xf46036, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  const cg = new THREE.BufferGeometry();
  cg.setAttribute('position', new THREE.Float32BufferAttribute(core, 3));
  m.add(new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, side: THREE.DoubleSide })));
  m.visible = false;
  return m;
}

export class Stage3D extends Stage {
  constructor(overlay) {
    super(overlay);
    const gl = document.createElement('canvas');
    gl.id = 'stage3d';
    gl.className = 'stage3d';
    this.renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    overlay.parentNode.insertBefore(gl, overlay);
    this.glCanvas = gl;
    // GPU reset (driver update, sleep, too many tabs): three.js rebuilds its
    // state on restore; until then only the 3D draw is skipped
    gl.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.lost = true;
      this.onContextLost && this.onContextLost();
    });
    gl.addEventListener('webglcontextrestored', () => {
      this.lost = false;
      this.onContextRestored && this.onContextRestored();
    });
    overlay.classList.add('overlay2d');
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0a1e);
    this.camera = new THREE.PerspectiveCamera(FOV, 2, 10, 4000);
    this.rcam = this.camera.clone();
    this.room = new Room3D();
    this.arenaId = 'bedroom';
    this.scene.add(this.room.group);
    this.arena = { excite: 0, spots: (W) => this.spots(W) };
    this.homes = { hero: new THREE.Vector3(-240, 0, HERO_Z), foe: new THREE.Vector3(240, 0, FOE_Z) };
    this.is3D = true;
    active = this;
  }

  // 2D world position of a 3D point (no shake/zoom).
  project(v) {
    const p = v.clone().project(this.camera);
    return { x: ((p.x + 1) / 2) * this.W, y: ((1 - p.y) / 2) * VH };
  }

  spotOf(v) {
    const a = this.project(v);
    const b = this.project(v.clone().add(new THREE.Vector3(0, 100, 0)));
    return { x: a.x, y: a.y, scale: (a.y - b.y) / 100 };
  }

  spots() {
    return { hero: this.spotOf(this.homes.hero), foe: this.spotOf(this.homes.foe) };
  }

  resize(cssW, cssH, dpr) {
    const s = cssH / VH;
    const r = Math.min(dpr || 1, 3);
    this.scale = s;
    this.W = cssW / s;
    this.full = s * r;
    const k = this.pixel ? Math.max(1, Math.round((cssH * r) / RETRO_H)) : 1;
    this.renderer.setPixelRatio(r / k);
    this.renderer.setSize(cssW, cssH, false);
    for (const c of [this.glCanvas, this.canvas]) {
      c.style.width = cssW + 'px';
      c.style.height = cssH + 'px';
      c.classList.toggle('pixel', this.pixel);
    }
    this.canvas.width = Math.round((cssW * r) / k);
    this.canvas.height = Math.round((cssH * r) / k);
    this.px = this.canvas.height / VH;
    this.ctx.imageSmoothingEnabled = false;
    setArtScale(this.px, true);
    // camera
    const aspect = cssW / cssH;
    this.camera.aspect = aspect;
    this.camera.position.set(0, CAM_Y, HERO_Z + DIST);
    this.camera.lookAt(0, LOOK_Y, 0);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(true);
    const tanH = Math.tan((FOV * Math.PI) / 360);
    const halfW = DIST * tanH * aspect;
    this.homes.hero.set(-halfW * 0.5, 0, HERO_Z);
    this.homes.foe.set(halfW * 0.5, 0, FOE_Z);
    this.frontHalfW = (HERO_Z + DIST - 380) * tanH * aspect;
    this.room.placeFront(this.frontHalfW);
    for (const side of ['hero', 'foe']) {
      const f = this.fighters[side];
      if (f) f.setHome(this.homes[side]);
    }
  }

  // Switch the arena ('bedroom' or an id from data/arenas.js).
  setArena(id) {
    const def = ARENAS[id] || ARENAS.bedroom;
    if (def.id === this.arenaId) return;
    this.scene.remove(this.room.group);
    this.room.dispose && this.room.dispose();
    this.room = def.built ? new Room3D() : new ImageArena3D(def);
    this.arenaId = def.id;
    this.scene.add(this.room.group);
    if (this.frontHalfW) this.room.placeFront(this.frontHalfW);
  }

  // The campaign diorama (render3d/board3d.js) replaces the arena while set.
  // It goes away by itself once its screen leaves the page.
  setBoard(board, owner = null) {
    if (this.board) this.board.dispose();
    this.board = board;
    this.boardOwner = owner;
  }

  // opts.foeBig: scale for a GIANT foe (game/modes.js)
  setFighters(heroDef, foeDef, opts = {}) {
    for (const f of Object.values(this.fighters)) f && f.dispose();
    this.fighters.hero = heroDef ? new Fighter3D(heroDef, 'hero', this.homes.hero, this) : null;
    this.fighters.foe = foeDef ? new Fighter3D(foeDef, 'foe', this.homes.foe, this) : null;
    if (this.fighters.foe) this.fighters.foe.big = opts.foeBig || 1;
    for (const f of Object.values(this.fighters)) f && f.setPx(this.px);
  }

  render() {
    const ctx = this.ctx;
    const t = this.clock.time;
    const W = this.W;
    const cam = this.cam;
    const tr = cam.trauma * cam.trauma;
    const view = {
      x: tr * 22 * (Math.random() * 2 - 1) + (cam.drift ? Math.sin(t / 3000) * 10 * cam.drift : 0),
      y: tr * 16 * (Math.random() * 2 - 1),
    };
    if (this.board && this.boardOwner && !this.boardOwner.isConnected) this.setBoard(null);
    const fs = [this.fighters.foe, this.fighters.hero].filter(Boolean);
    this.room.excite = this.arena.excite || 0;
    this.room.update(t);
    for (const f of fs) f.sync(t);

    // 3D: the same pan/zoom as the 2D layer, as a crop of the camera image
    const z = cam.zoom, fx = cam.fx * W, fy = cam.fy * VH;
    this.rcam.copy(this.camera);
    this.rcam.setViewOffset(W, VH, fx - fx / z - view.x, fy - fy / z - view.y, W / z, VH / z);
    if (this.board) {
      this.board.update(t);
      if (!this.lost) this.renderer.render(this.board.scene, this.board.camera);
    } else if (!this.lost) this.renderer.render(this.scene, this.rcam);

    // 2D overlay: effects, words, shields, status
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.px, 0, 0, this.px, 0, 0);
    ctx.translate(fx, fy);
    ctx.scale(z, z);
    ctx.translate(-fx, -fy);
    ctx.save();
    ctx.translate(view.x, view.y);
    this.fx.drawUnder && this.fx.drawUnder(ctx);
    this.fx.draw(ctx);
    for (const f of fs) f.drawOverlay(ctx, t);
    ctx.restore();
    ctx.setTransform(this.px, 0, 0, this.px, 0, 0);
    if (this.dim > 0) {
      ctx.fillStyle = `rgba(10,8,30,${this.dim})`;
      ctx.fillRect(0, 0, W, VH);
    }
    if (this.vignette > 0) {
      // Czernobog's storm: dark purple closing in from the edges
      const g = ctx.createRadialGradient(W / 2, VH * 0.45, VH * 0.35, W / 2, VH * 0.45, W * 0.72);
      g.addColorStop(0, 'rgba(30,10,50,0)');
      g.addColorStop(1, `rgba(30,10,50,${this.vignette})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, VH);
    }
    if (this.flashA > 0) {
      ctx.globalAlpha = this.flashA;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, W, VH);
      ctx.globalAlpha = 1;
    }
  }

  // Renders a toy on a transparent background (portraits, select cards).
  // framing: 'head' or 'full'. Returns a canvas `w`×`h` art pixels.
  snapshot(def, { w, h, framing = 'full', pose = {} }) {
    if (this.lost) return blank(w, h);
    const rig = buildRig(def);
    rig.apply({ t: 1000, eyes: 'open', mouth: 'smile', action: pose.eyes === 'happy' ? 'win' : 'idle', ...pose });
    const scene = new THREE.Scene();
    const holder = new THREE.Group();
    holder.rotation.y = -0.95;
    holder.add(rig.root);
    scene.add(holder);
    holder.updateMatrixWorld(true);
    const camera = new THREE.PerspectiveCamera(22, w / h, 10, 3000);
    // art.portrait = { x, y, r } nudges the head frame (rig units) for toys whose
    // head anchor isn't where the face reads best (a fish, a tall hat, a dome)
    const nudge = (framing === 'head' && def.art?.portrait) || {};
    const local = framing === 'head' ? rig.anchors.head.clone().add(new THREE.Vector3(nudge.x || 0, nudge.y || 0, 0)) : new THREE.Vector3(10, 104, 0);
    const target = local.applyMatrix4(rig.root.matrixWorld);
    const span = framing === 'head' ? (nudge.r || rig.headR) * 2.1 : 250;
    const d = span / 2 / Math.tan((22 * Math.PI) / 360);
    camera.position.set(target.x, target.y + 12, target.z + d);
    camera.lookAt(target);
    const rt = new THREE.WebGLRenderTarget(w, h);
    const prevClear = this.renderer.getClearColor(new THREE.Color());
    const prevAlpha = this.renderer.getClearAlpha();
    this.renderer.setRenderTarget(rt);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.clear();
    this.renderer.render(scene, camera);
    const buf = new Uint8Array(w * h * 4);
    this.renderer.readRenderTargetPixels(rt, 0, 0, w, h, buf);
    this.renderer.setRenderTarget(null);
    this.renderer.setClearColor(prevClear, prevAlpha);
    rt.dispose();
    disposeTree(scene);
    const c = blank(w, h);
    const g = c.getContext('2d');
    const im = g.createImageData(w, h);
    for (let y = 0; y < h; y++) im.data.set(buf.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
    g.putImageData(im, 0, 0);
    return c;
  }
}

// For tooling: where a toy's head frame sits (rig units) and how big the toy is.
export function headFrame(def) {
  const rig = buildRig(def);
  rig.apply({ t: 1000, eyes: 'open', mouth: 'smile', action: 'idle' });
  rig.root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(rig.root);
  return { head: rig.anchors.head.toArray().map(Math.round), headR: Math.round(rig.headR), box: [box.min.toArray().map(Math.round), box.max.toArray().map(Math.round)] };
}

function blank(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// Prefer 3D; fall back to the 2D stage if WebGL isn't available (or the GPU
// was lost and never came back this session, see main.js).
export function createStage(canvas) {
  let no3d = false;
  try { no3d = !!sessionStorage.getItem('tbb.no3d'); } catch {}
  if (no3d) return new Stage(canvas);
  try {
    const probe = document.createElement('canvas');
    if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) throw new Error('no webgl');
    return new Stage3D(canvas);
  } catch (e) {
    console.warn('3D unavailable, using 2D stage', e && e.message);
    return new Stage(canvas);
  }
}
