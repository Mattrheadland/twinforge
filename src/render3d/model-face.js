// Swappable eyes for imported models: a painted-eye decal pinned to the head
// bone, redrawn when the expression changes (open, angry, happy, squint,
// closed, dizzy swirl). Uses the same eye painter as the code-built toys, so
// expressions match across the roster. The mouth is the jaw bone (models.js).
//
// Config (characters.js → art.face), all in rig units (toy ~190 tall, faces +x):
//   pos   [x, y, z]  where the eyes go; the decal is shot forward from here onto
//                    the model's surface, so x only needs to be roughly right
//   size  [w, h]     decal size
//   yaw   turn around y (0 = facing +x); use ±0.6 for eyes on the sides of a snout
//   lift  gap off the surface (default 1.2)
//   style paintEyes style: { iris, lid, brow, sclera, glow, size, gap }  (sizes as fractions of the canvas)
import * as THREE from 'three';
import { faceCanvas, paintEyes, faceUpdater } from './roster-rigs.js';

// Finds the model's surface in front of `from` (rig space), looking back along
// the facing direction. Returns { point, normal } in rig space, or null.
function surfaceAt(root, model, from, dir) {
  const rc = new THREE.Raycaster();
  const o = from.clone().addScaledVector(dir, 400).applyMatrix4(root.matrixWorld);
  const d = dir.clone().negate().transformDirection(root.matrixWorld);
  rc.set(o, d);
  const hits = rc.intersectObject(model, true).filter((h) => h.object.isMesh && h.object.name !== 'ink' && h.object.name !== 'face');
  if (!hits.length) return null;
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const n = hits[0].face ? hits[0].face.normal.clone().transformDirection(hits[0].object.matrixWorld).transformDirection(inv) : dir.clone();
  return { point: hits[0].point.clone().applyMatrix4(inv), normal: n };
}

export function addFace(parent, root, cfg, model = parent) {
  const [w, h] = cfg.size || [34, 16];
  const CW = 128, CH = Math.max(32, Math.round((128 * h) / w));
  const fc = faceCanvas(CW, CH);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({
      map: fc.tex, transparent: true, alphaTest: 0.4, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    })
  );
  mesh.name = 'face';
  mesh.renderOrder = 2;
  // place in rig space, then re-express in the parent's (head bone's) space
  root.updateMatrixWorld(true);
  const turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), cfg.yaw || 0);
  const dir = new THREE.Vector3(1, 0, 0).applyQuaternion(turn);
  const at = new THREE.Vector3(...(cfg.pos || [90, 160, 0]));
  const hit = surfaceAt(root, model, at, dir);
  if (hit) at.copy(hit.point).addScaledVector(dir, cfg.lift ?? 1.2);
  const want = new THREE.Matrix4().compose(at, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2).premultiply(turn), new THREE.Vector3(1, 1, 1));
  want.premultiply(root.matrixWorld);
  const local = new THREE.Matrix4().copy(parent.matrixWorld).invert().multiply(want);
  local.decompose(mesh.position, mesh.quaternion, mesh.scale);
  parent.add(mesh);
  const st = cfg.style || {};
  const style = { ...st, size: (st.size ?? 0.32) * CH, gap: (st.gap ?? 0.27) * CW };
  const update = faceUpdater(fc, (g, W, H, eyes, mouth, t) => paintEyes(g, W, H, eyes, style, t));
  return { mesh, update };
}
