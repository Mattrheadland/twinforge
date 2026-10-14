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
    this.props = (def.props || []).map(([n, slot, h], i) => {
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
      return { card, holder, slot, h, phase: i * 1.7 };
    });
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
  }

  update(t) {
    const ex = this.excite;
    for (const p of this.props) {
      const hop = ex > 0.05 ? Math.abs(Math.sin(t / 85 + p.phase)) * ex * 16 : 0;
      p.holder.position.y = hop;
      p.card.rotation.z = ex > 0.05 ? Math.sin(t / 70 + p.phase) * ex * 0.08 : 0;
    }
  }

  dispose() {
    // textures stay cached for the next visit; geometry and materials go
    this.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  }
}
