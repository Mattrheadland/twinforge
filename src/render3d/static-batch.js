// Merges the static toon parts of a set (render3d/room.js) into a few meshes, with no change to the
// picture: one mesh per paint (colour, shiny, side) and a single mesh for every ink outline.
//
// Why it looks the same: the toon shader takes its faceted normal from screen-space derivatives, so a
// body only needs positions, and those are baked into the set's space with the part's own matrix. The
// ink hull is the part's own hull geometry pushed out along its smoothed normals by exactly the width
// the hull shader would have used (inked() in toon.js), then baked the same way; the merged hull is
// drawn with a zero-width hull material.
//
// Why it's faster: the bedroom drew about 150 meshes a frame (each part plus its outline). Every draw
// costs the phone CPU and GPU setup time; the merged set draws in about 50.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toonMat, inkHullMat } from './toon.js';

const _n = new THREE.Vector3(), _p = new THREE.Vector3();

// Body positions in `root` space, non-indexed, position only.
function bakedBody(mesh, toRoot) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', mesh.geometry.getAttribute('position').clone());
  if (mesh.geometry.index) g.setIndex(mesh.geometry.index.clone());
  const out = g.index ? g.toNonIndexed() : g;
  out.applyMatrix4(toRoot);
  return out;
}

// The hull exactly as the hull shader draws it (p + n * thick, in the part's object space), in root space.
function bakedHull(hull, toRoot) {
  const src = hull.geometry, thick = hull.material.uniforms.uThick.value;
  const pos = src.getAttribute('position'), nrm = src.getAttribute('normal');
  const out = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    _p.fromBufferAttribute(pos, i).addScaledVector(_n.fromBufferAttribute(nrm, i), thick).applyMatrix4(toRoot);
    out[i * 3] = _p.x; out[i * 3 + 1] = _p.y; out[i * 3 + 2] = _p.z;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(out, 3));
  if (src.index) g.setIndex(src.index.clone());
  return g.index ? g.toNonIndexed() : g;
}

// Merges every toon part under `root` that isn't inside one of `keep` (animated or rebuilt groups).
// Returns how many draws it saved.
export function batchStatic(root, keep = []) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const skip = new Set(keep);
  const bodies = new Map(), hulls = [], gone = [];
  const walk = (o) => {
    if (skip.has(o)) return;
    for (const c of [...o.children]) walk(c);
    if (o === root || !o.isMesh || !o.material || !o.material.isToon || o.isSkinnedMesh) return;
    const toRoot = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    const u = o.material.uniforms;
    if (u.uOpacity.value !== 1 || o.material.transparent) return;
    const key = `${u.uColor.value.getHex()}|${u.uShiny.value}|${o.material.side}`;
    (bodies.get(key) || bodies.set(key, { color: u.uColor.value.getHex(), shiny: u.uShiny.value > 0.5, side: o.material.side, list: [] }).get(key)).list.push(bakedBody(o, toRoot));
    for (const c of o.children) if (c.name === 'ink' && c.isMesh) hulls.push(bakedHull(c, new THREE.Matrix4().multiplyMatrices(inv, c.matrixWorld)));
    gone.push(o);
  };
  walk(root);
  let before = 0;
  for (const o of gone) { before += 1 + o.children.filter((c) => c.name === 'ink').length; o.parent.remove(o); }
  let after = 0;
  for (const b of bodies.values()) {
    const m = new THREE.Mesh(mergeGeometries(b.list), toonMat(b.color, { shiny: b.shiny }));
    m.material.side = b.side;
    m.name = 'batch';
    root.add(m);
    after++;
  }
  if (hulls.length) {
    const ink = new THREE.Mesh(mergeGeometries(hulls), inkHullMat(0));
    ink.name = 'ink-batch';
    ink.raycast = () => {};
    root.add(ink);
    after++;
  }
  for (const o of gone) o.traverse((c) => c.geometry && !c.userData.shared && c.geometry.dispose());
  return before - after;
}
