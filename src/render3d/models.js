// Imported toy models (option A): GLBs made from the turnaround sheets with an
// image-to-3D tool, saved as assets/models/<id>/<id>.glb.
//
// A model rig has the same shape as a code-built rig ({ root, apply, anchors,
// headR, flash }), so the stage, effects and portraits don't know the
// difference. If a model is missing or fails to load, the code-built rig is
// used instead (rigs.js).
//
// What happens to a loaded GLB:
//   - scaled to the toy's height (~190 units), feet on y = 0, turned to face +x
//   - every material swapped for the '80s toon shader (texture as base color,
//     faceted three-step light, hit flash) plus an inked outline hull
//   - animation clips matched to idle / attack / hit / guard / special / win /
//     tired by name (clipmap.js); actions without a clip are posed by moving
//     the bones from the same pose values the code rigs use
//   - anchors (head, top, center, muzzle) follow the head bone each frame
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { modelMat, inkModelMesh } from './toon.js';
import { matchClips, LOOPS } from './clipmap.js';
import { addFace } from './model-face.js';

// Built by build.mjs from assets/models/: { 'battle-rex': '<content hash>' }.
const MANIFEST = typeof __MODELS__ !== 'undefined' ? __MODELS__ : {};
const BASE = 'assets/models/';

const cache = new Map(); // id -> { status: 'loading'|'ready'|'failed', promise, gltf, info }
const listeners = new Set();

export const modelId = (def) => def?.art?.model || null;
export const hasModel = (id) => !!id && (id in MANIFEST || !!(typeof window !== 'undefined' && window.__TBB_MODELS__?.includes(id)));
export const modelReady = (id) => cache.get(id)?.status === 'ready';
export const onModelsChanged = (fn) => (listeners.add(fn), () => listeners.delete(fn));

export function modelUrl(id) {
  const v = MANIFEST[id];
  return `${BASE}${id}/${id}.glb${v ? `?v=${v}` : ''}`;
}

let loader = null;
function getLoader() {
  if (!loader) {
    loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
  }
  return loader;
}

export function loadModel(id) {
  if (cache.has(id)) return cache.get(id).promise;
  const entry = { status: 'loading' };
  entry.promise = getLoader().loadAsync(modelUrl(id)).then(
    (gltf) => {
      entry.gltf = gltf;
      entry.info = inspect(gltf);
      entry.status = 'ready';
      for (const fn of listeners) fn(id);
      return true;
    },
    (err) => {
      entry.status = 'failed';
      console.warn(`model ${id} unavailable, using the built-in toy`, err && err.message);
      return false;
    }
  );
  cache.set(id, entry);
  return entry.promise;
}

// Loads every model the roster has. Never rejects.
export function preloadModels(defs) {
  const ids = [...new Set(defs.map(modelId).filter(hasModel))];
  return Promise.all(ids.map(loadModel));
}

// ---------- bones ----------
const boneName = (b) => b.name.toLowerCase().replace(/^mixamorig:?/, '').replace(/[\s.:-]+/g, '_');
const isEnd = (n) => /(_end|end_?site|top_?end|nub)$/.test(n);

// Finds the bones we drive procedurally. Names vary by tool (Meshy, Tripo,
// Mixamo, Blender), so this matches loosely.
function findBones(root) {
  const bones = [];
  root.traverse((o) => o.isBone && bones.push(o));
  const by = (re, pred = () => true) => bones.find((b) => { const n = boneName(b); return re.test(n) && !isEnd(n) && pred(n); }) || null;
  const side = (n) => (/(^|_)(left|l)(_|$)|left|_l$|\.l$/.test(n) ? 'L' : /(^|_)(right|r)(_|$)|right|_r$|\.r$/.test(n) ? 'R' : '');
  const armRe = /(upper_?arm|^arm|_arm$|leftarm|rightarm|shoulder|clavicle|front_?leg_?(upper|1|01)?$)/;
  const arms = bones.filter((b) => { const n = boneName(b); return armRe.test(n) && !/fore|lower|hand|finger/.test(n) && !isEnd(n); });
  const pickArm = (s) => arms.filter((b) => side(boneName(b)) === s).sort((a, b) => depth(b) - depth(a))[0] || null;
  return {
    all: bones,
    head: by(/(^|_)head($|_|\d)/),
    neck: by(/neck/),
    jaw: by(/jaw|mouth/),
    spine: by(/spine|chest|torso/),
    hips: by(/hips|pelvis|root/),
    tail: bones.filter((b) => /tail/.test(boneName(b)) && !isEnd(boneName(b))).sort((a, b) => depth(a) - depth(b)),
    armL: pickArm('L'),
    armR: pickArm('R'),
  };
}
const depth = (o) => { let d = 0; while (o.parent) { d++; o = o.parent; } return d; };

function inspect(gltf) {
  const meshes = [];
  gltf.scene.traverse((o) => o.isMesh && meshes.push(o));
  let tris = 0;
  for (const m of meshes) tris += (m.geometry.index ? m.geometry.index.count : m.geometry.getAttribute('position').count) / 3;
  return { tris: Math.round(tris), meshes: meshes.length, skinned: meshes.some((m) => m.isSkinnedMesh), clips: gltf.animations.map((c) => c.name) };
}

// Rotates `bone` by `angle` about an axis given in rig space, on top of `rest`.
const _q = new THREE.Quaternion(), _qp = new THREE.Quaternion(), _ax = new THREE.Vector3();
function turnBone(bone, rest, axisRig, angle, rigInv) {
  bone.parent.getWorldQuaternion(_qp);
  _qp.premultiply(rigInv).invert();
  _ax.copy(axisRig).applyQuaternion(_qp).normalize();
  _q.setFromAxisAngle(_ax, angle);
  bone.quaternion.copy(rest).premultiply(_q);
}

const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);

// Builds a fresh rig instance from a loaded model. `def.art` options:
//   model    asset id (folder and file name)
//   height   target height in rig units (default 190)
//   yaw      extra turn in radians if the model doesn't face the camera in its file
//   clips    { attack: 'Exact_Clip_Name', ... } to pin a clip to an action
//   anchors  { muzzle: [x, y, z], ... } extra effect points in rig units
//   face     painted-eye decal on the head bone (model-face.js); omit to keep the texture's face
//   shiny    glints on the whole model (default false)
export function buildModelRig(def, flash) {
  const entry = cache.get(modelId(def));
  if (!entry || entry.status !== 'ready') return null;
  const art = def.art || {};
  const src = entry.gltf;
  const model = cloneSkinned(src.scene);
  model.updateMatrixWorld(true);

  const root = new THREE.Group();
  root.name = `model:${art.model}`;
  const norm = new THREE.Group();
  norm.rotation.y = Math.PI / 2 + (art.yaw || 0); // glTF faces +z; toys face +x
  norm.add(model);
  root.add(norm);
  norm.updateMatrixWorld(true);
  const poseSkins = () => model.traverse((o) => o.isSkinnedMesh && o.skeleton.update());
  poseSkins(); // bounds and raycasts read the bone matrices
  const box = new THREE.Box3().setFromObject(norm, true);
  const size = box.getSize(new THREE.Vector3());
  const H = art.height || 190;
  const s = H / Math.max(1e-6, size.y);
  const c = box.getCenter(new THREE.Vector3());
  norm.scale.setScalar(s);
  norm.position.set(-c.x * s, -box.min.y * s, -c.z * s);
  root.updateMatrixWorld(true);

  // materials + ink
  const ws = new THREE.Vector3();
  const meshes = [];
  model.traverse((o) => { if (o.isMesh) meshes.push(o); });
  for (const mesh of meshes) {
    const swap = (m) => {
      const map = m.map || null;
      if (map) { map.colorSpace = THREE.NoColorSpace; map.needsUpdate = true; }
      return modelMat({ color: m.color ? m.color.getHex() : 0xffffff, map, flash, shiny: !!art.shiny });
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
    mesh.userData.shared = true; // geometry belongs to the cache
    mesh.frustumCulled = false;
    mesh.getWorldScale(ws);
    inkModelMesh(mesh, art.ink || 3, (Math.abs(ws.x) + Math.abs(ws.y) + Math.abs(ws.z)) / 3);
  }

  // animation
  const mixer = new THREE.AnimationMixer(model);
  const clipFor = matchClips(src.animations.map((a) => a.name), art.clips);
  const actions = {};
  for (const [act, name] of Object.entries(clipFor)) {
    const clip = src.animations.find((a) => a.name === name);
    const a = mixer.clipAction(clip);
    if (!LOOPS[act]) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
    actions[act] = a;
  }

  // bones for procedural motion
  const B = findBones(model);
  const rest = new Map(B.all.map((b) => [b, b.quaternion.clone()]));
  const rigInv = new THREE.Quaternion();

  // anchors in rig space
  const headPos = new THREE.Vector3();
  const front = Math.max((box.max.x - c.x) * s, 1); // nose / front edge, rig units
  const fixedHead = new THREE.Vector3(front * 0.55, H * 0.78, 0);
  const anchors = {
    head: fixedHead.clone(),
    top: new THREE.Vector3(front * 0.3, H, 0),
    center: new THREE.Vector3(front * 0.1, H * 0.52, 0),
  };
  for (const [k, v] of Object.entries(art.anchors || {})) anchors[k] = new THREE.Vector3(...v);
  if (!anchors.muzzle) anchors.muzzle = new THREE.Vector3(front * 0.9, H * 0.72, 0);
  const headOffset = new THREE.Vector3();
  if (B.head) {
    B.head.getWorldPosition(headPos);
    root.worldToLocal(headPos);
    headOffset.subVectors(fixedHead, headPos); // keep the anchor on the face, not the neck joint
    headOffset.y = Math.max(headOffset.y, 0);
  }

  // which arm is on the camera side (+z in rig space) — that one plays armF
  const zOf = (b) => (b ? root.worldToLocal(b.getWorldPosition(new THREE.Vector3())).z : 0);
  const near = B.armL && B.armR ? (zOf(B.armL) >= zOf(B.armR) ? B.armL : B.armR) : B.armL || B.armR;
  const far = near === B.armL ? B.armR : B.armL;

  root.updateMatrixWorld(true);
  poseSkins();
  const face = art.face ? addFace(B.head || model, root, art.face, model) : null;

  let current = null, lastT = null;
  const rig = {
    root,
    anchors,
    headR: art.headR || H * 0.3,
    isModel: true,
    info: { ...entry.info, clipFor, bones: Object.fromEntries(['head', 'neck', 'jaw', 'spine', 'armL', 'armR'].map((k) => [k, B[k]?.name || null])) },
    play(act) {
      const next = actions[act] || null;
      if (next === current) return;
      if (next) {
        next.reset().setEffectiveWeight(1).play();
        if (current) next.crossFadeFrom(current, act === 'hit' ? 0.06 : 0.18, false);
      } else if (current) current.fadeOut(0.18);
      current = next;
    },
    apply(p) {
      const t = p.t || 0;
      const dt = lastT == null ? 0 : Math.min(0.1, Math.max(0, (t - lastT) / 1000));
      lastT = t;
      const act = p.action || 'idle';
      rig.play(act);
      // reset driven bones, let the clip pose them, then add our layers on top
      for (const b of [B.armL, B.armR, B.head, B.jaw, ...B.tail]) if (b) b.quaternion.copy(rest.get(b));
      mixer.update(dt);
      root.updateMatrixWorld(true);
      root.getWorldQuaternion(rigInv).invert();
      const clip = !!actions[act];
      if (!clip) {
        // no clip for this action: same arm swings and head bob as the code rigs
        if (near) turnBone(near, near.quaternion.clone(), Z, -(p.armF ?? -0.2) * 0.8, rigInv);
        if (far) turnBone(far, far.quaternion.clone(), Z, -(p.armB ?? 0.25) * 0.8, rigInv);
        if (B.head) turnBone(B.head, B.head.quaternion.clone(), Z, (p.headBob || 0) * 0.01 + (p.pose === 'tired' ? -0.25 : 0), rigInv);
        for (let i = 0; i < B.tail.length; i++) turnBone(B.tail[i], B.tail[i].quaternion.clone(), Y, Math.sin(t / 420 - i * 0.6) * 0.08, rigInv);
        root.rotation.z = p.pose === 'tired' ? 0.12 : 0;
      } else root.rotation.z = 0;
      // jaw follows the mouth on top of any clip
      if (B.jaw) {
        const open = { open: 0.5, o: 0.3, grit: 0.06, smile: 0.12, flat: 0.02 }[p.mouth || 'smile'] ?? 0.12;
        turnBone(B.jaw, B.jaw.quaternion.clone(), Z, -open * (art.jaw ?? 1), rigInv);
      }
      root.updateMatrixWorld(true);
      if (B.head) {
        B.head.getWorldPosition(headPos);
        root.worldToLocal(headPos);
        anchors.head.copy(headPos).add(headOffset);
        anchors.top.set(anchors.head.x - front * 0.25, Math.max(H, anchors.head.y + H * 0.2), anchors.head.z);
      }
      if (face) face.update(p);
    },
  };
  rig.apply({ t: 0, action: 'idle', eyes: 'open', mouth: 'smile' });
  return rig;
}

// For tests and the debug console: what the loader saw in a model.
export function modelInfo(id) {
  const e = cache.get(id);
  return e ? { status: e.status, ...(e.info || {}) } : null;
}
