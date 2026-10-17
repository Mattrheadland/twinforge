// '80s action-cartoon shading for low-poly models (STYLE_GUIDE v5).
//   toonMat(color)  — faceted (per-face) normals, 3 hard steps: cool shadow /
//                     base / light patch; optional hard white glint on shiny
//                     plastic; hit-flash uniform
//   inked(mesh)     — inverted-hull ink outline around the silhouette
// Colors are used exactly as written (no color management), so the palette
// in the style guide is what ends up on screen.
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

THREE.ColorManagement.enabled = false;

export const INK = 0x14111a;
// light from the upper left and a little in front (view space)
const LIGHT = new THREE.Vector3(-0.55, 0.7, 0.45).normalize();

const VERT = /* glsl */ `
  varying vec3 vView;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }`;

const FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uLight;
  uniform float uFlash;
  uniform float uShiny;
  uniform float uOpacity;
  uniform float uBright;
  uniform vec3 uRim;
  uniform float uRimK;
  uniform vec3 uTint;
  varying vec3 vView;
  void main() {
    // faceted normal from screen-space derivatives: every polygon is flat
    vec3 n = normalize(cross(dFdx(vView), dFdy(vView)));
    float d = dot(n, uLight);
    vec3 base = uColor * uBright;
    // three hard steps; shadow is a cool multiply toward #3A2F5B
    vec3 shadow = base * vec3(0.56, 0.5, 0.78);
    vec3 light = mix(base, vec3(1.0), 0.24);
    vec3 c = d > 0.62 ? light : (d > 0.08 ? base : shadow);
    if (uShiny > 0.5) {
      vec3 v = normalize(-vView);
      float s = dot(reflect(-uLight, n), v);
      if (s > 0.94) c = vec3(1.0);
    }
    // v6 lighting: the arena's mood tint and a hard cel rim light on the toy's edges (setLighting)
    float rim = 1.0 - abs(dot(n, normalize(-vView)));
    if (uRimK > 0.0 && rim > 0.58) c = mix(c, uRim, uRimK * (rim > 0.8 ? 1.0 : 0.5));
    c *= uTint;
    c = mix(c, vec3(1.0), uFlash);
    gl_FragColor = vec4(c, uOpacity);
  }`;

const HULL_VERT = /* glsl */ `
  uniform float uThick;
  void main() {
    vec3 p = position + normal * uThick;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }`;
const HULL_FRAG = /* glsl */ `
  uniform vec3 uInk;
  void main() { gl_FragColor = vec4(uInk, 1.0); }`;

// Shared by every toy material, so one call relights the whole cast (arena mood, hit flashes).
const shared = {
  uLight: { value: LIGHT },
  uRim: { value: new THREE.Color(0xffffff) },
  uRimK: { value: 0 },
  uTint: { value: new THREE.Color(1, 1, 1) },
};
// rim: rim-light colour; rimK: 0 (off, the pre-v6 look) … 1; tint: a multiply for the arena's mood
export function setLighting({ rim = 0xffffff, rimK = 0, tint = 0xffffff } = {}) {
  shared.uRim.value.set(rim);
  shared.uRimK.value = rimK;
  shared.uTint.value.set(tint);
}
export const lighting = shared;

export function toonMat(color, opts = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uLight: shared.uLight,
      uRim: shared.uRim,
      uRimK: shared.uRimK,
      uTint: shared.uTint,
      uFlash: opts.flash || { value: 0 },
      uShiny: { value: opts.shiny ? 1 : 0 },
      uOpacity: { value: 1 },
      uBright: opts.bright || { value: 1 },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
  });
  m.isToon = true;
  return m;
}

// Unlit flat color (glowing things: lamp shade, moon, screens).
export function glowMat(color, opts = {}) {
  return new THREE.MeshBasicMaterial({ color, transparent: !!opts.transparent, opacity: opts.opacity ?? 1, depthWrite: opts.depthWrite ?? true, side: opts.side ?? THREE.FrontSide });
}

const hullGeoCache = new WeakMap();
function hullGeometry(geo) {
  if (hullGeoCache.has(geo)) return hullGeoCache.get(geo);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', geo.getAttribute('position').clone());
  if (geo.index) g.setIndex(geo.index.clone());
  const merged = mergeVertices(g, 1e-3);
  merged.computeVertexNormals();
  hullGeoCache.set(geo, merged);
  return merged;
}

const hullMats = new Map();
function hullMat(thick) {
  const k = thick.toFixed(3);
  if (!hullMats.has(k)) {
    hullMats.set(k, new THREE.ShaderMaterial({
      uniforms: { uThick: { value: thick }, uInk: { value: new THREE.Color(INK) } },
      vertexShader: HULL_VERT,
      fragmentShader: HULL_FRAG,
      side: THREE.BackSide,
    }));
  }
  return hullMats.get(k);
}

// Adds an ink outline `thick` world units wide. Call after the mesh's scale is set.
export function inked(mesh, thick = 2) {
  const s = mesh.scale;
  const avg = (Math.abs(s.x) + Math.abs(s.y) + Math.abs(s.z)) / 3 || 1;
  const hull = new THREE.Mesh(hullGeometry(mesh.geometry), hullMat(thick / avg));
  hull.name = 'ink';
  hull.raycast = () => {};
  mesh.add(hull);
  return mesh;
}

// ---------- imported models (GLB) ----------
// Same three-step look as toonMat, but the base color comes from the model's
// texture (times its material color), and it follows bones when skinned.
// The texture is posterized a little and pushed toward saturated so baked
// airbrush gradients from image-to-3D tools read as flat '80s paint.
const MODEL_VERT = /* glsl */ `
  #include <common>
  #include <skinning_pars_vertex>
  varying vec3 vView;
  varying vec3 vNormal;
  varying vec2 vUv;
  void main() {
    #include <beginnormal_vertex>
    #include <skinbase_vertex>
    #include <skinnormal_vertex>
    #include <begin_vertex>
    #include <skinning_vertex>
    vUv = uv;
    vNormal = normalize(normalMatrix * objectNormal);
    vec4 mv = modelViewMatrix * vec4(transformed, 1.0);
    vView = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }`;

const MODEL_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uLight;
  uniform float uFlash;
  uniform float uShiny;
  uniform float uHasMap;
  uniform float uSat;
  uniform float uSteps;
  uniform sampler2D uMap;
  uniform vec3 uRim;
  uniform float uRimK;
  uniform vec3 uTint;
  uniform float uSmooth;
  uniform float uSoft;
  uniform float uHasNormalMap;
  uniform sampler2D uNormalMap;
  uniform float uNormalK;
  varying vec3 vView;
  varying vec3 vNormal;
  varying vec2 vUv;
  // tangent-space normal map without tangents (cotangent frame from derivatives)
  vec3 perturb(vec3 n, vec3 p, vec2 uv, vec3 m) {
    vec3 dp1 = dFdx(p), dp2 = dFdy(p);
    vec2 du1 = dFdx(uv), du2 = dFdy(uv);
    vec3 dp2p = cross(dp2, n), dp1p = cross(n, dp1);
    vec3 T = dp2p * du1.x + dp1p * du2.x;
    vec3 B = dp2p * du1.y + dp1p * du2.y;
    float k = inversesqrt(max(dot(T, T), dot(B, B)));
    return normalize(mat3(T * k, B * k, n) * m);
  }
  void main() {
    vec3 fN = normalize(cross(dFdx(vView), dFdy(vView)));
    vec3 n = fN;
    if (uSmooth > 0.5) {
      n = normalize(vNormal);
      if (!gl_FrontFacing) n = -n;
    }
    if (uHasNormalMap > 0.5) {
      vec3 m = texture2D(uNormalMap, vUv).xyz * 2.0 - 1.0;
      m.xy *= uNormalK;
      n = perturb(n, vView, vUv, normalize(m));
    }
    float d = dot(n, uLight);
    vec4 tex = uHasMap > 0.5 ? texture2D(uMap, vUv) : vec4(1.0);
    if (tex.a < 0.4) discard;
    vec3 base = tex.rgb * uColor;
    float g = dot(base, vec3(0.299, 0.587, 0.114));
    base = clamp(mix(vec3(g), base, uSat), 0.0, 1.0);
    if (uSteps > 0.5) base = floor(base * uSteps + 0.5) / uSteps;
    vec3 shadow = base * vec3(0.56, 0.5, 0.78);
    vec3 light = mix(base, vec3(1.0), 0.24);
    vec3 c;
    if (uSoft > 0.5) {
      // soft toon: two bands with a narrow ramp between them, a gentler shadow
      vec3 sh = base * vec3(0.66, 0.6, 0.84);
      c = mix(sh, base, smoothstep(0.02, 0.14, d));
      c = mix(c, mix(base, vec3(1.0), 0.14), smoothstep(0.7, 0.8, d) * 0.6);
    } else {
      c = d > 0.62 ? light : (d > 0.08 ? base : shadow);
    }
    if (uShiny > 0.5) {
      vec3 v = normalize(-vView);
      if (dot(reflect(-uLight, n), v) > 0.94) c = vec3(1.0);
    }
    float rim = 1.0 - abs(dot(n, normalize(-vView)));
    if (uRimK > 0.0 && rim > 0.58) c = mix(c, uRim, uRimK * (rim > 0.8 ? 1.0 : 0.5));
    // soft toon carries its own thin cool rim so the silhouette reads without heavy ink
    if (uSoft > 0.5) c = mix(c, mix(base, vec3(0.85, 0.9, 1.0), 0.55), smoothstep(0.62, 0.78, rim) * 0.45);
    c *= uTint;
    c = mix(c, vec3(1.0), uFlash);
    gl_FragColor = vec4(c, 1.0);
  }`;

// smooth: light with the mesh's vertex normals (crease-split, see crease-normals.js)
//         instead of one flat normal per triangle; default false (the faceted look)
// soft:   two softer bands + a thin rim instead of the three hard steps
// normalMap / normalK: optional tangent-space normal map and its strength
export function modelMat({ color = 0xffffff, map = null, flash, shiny = false, sat = 1.15, steps = 10, smooth = false, soft = false, normalMap = null, normalK = 1 } = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uLight: shared.uLight,
      uRim: shared.uRim,
      uRimK: shared.uRimK,
      uTint: shared.uTint,
      uFlash: flash || { value: 0 },
      uShiny: { value: shiny ? 1 : 0 },
      uHasMap: { value: map ? 1 : 0 },
      uMap: { value: map },
      uSat: { value: sat },
      uSteps: { value: steps },
      uSmooth: { value: smooth ? 1 : 0 },
      uSoft: { value: soft ? 1 : 0 },
      uHasNormalMap: { value: normalMap ? 1 : 0 },
      uNormalMap: { value: normalMap },
      uNormalK: { value: normalK },
    },
    vertexShader: MODEL_VERT,
    fragmentShader: MODEL_FRAG,
  });
  m.isToon = true;
  return m;
}

const MODEL_HULL_VERT = /* glsl */ `
  #include <common>
  #include <skinning_pars_vertex>
  uniform float uThick;
  void main() {
    #include <beginnormal_vertex>
    #include <skinbase_vertex>
    #include <skinnormal_vertex>
    #include <begin_vertex>
    #include <skinning_vertex>
    vec3 p = transformed + normalize(objectNormal) * uThick;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }`;

// Outline geometry for an imported mesh: same vertices (and skin weights), with
// normals averaged across UV seams so the inflated hull doesn't crack open.
const modelHullCache = new WeakMap();
function modelHullGeometry(geo) {
  if (modelHullCache.has(geo)) return modelHullCache.get(geo);
  const pos = geo.getAttribute('position');
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', pos);
  for (const a of ['skinIndex', 'skinWeight']) if (geo.getAttribute(a)) g.setAttribute(a, geo.getAttribute(a));
  if (geo.index) g.setIndex(geo.index);
  const n = pos.count;
  const box = geo.boundingBox || (geo.computeBoundingBox(), geo.boundingBox);
  const q = Math.max(1e-6, box.getSize(new THREE.Vector3()).length() * 1e-4);
  const keys = new Array(n), acc = new Map();
  for (let i = 0; i < n; i++) keys[i] = `${Math.round(pos.getX(i) / q)},${Math.round(pos.getY(i) / q)},${Math.round(pos.getZ(i) / q)}`;
  const idx = geo.index ? geo.index.array : null;
  const tris = idx ? idx.length : n;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), fn = new THREE.Vector3();
  for (let t = 0; t < tris; t += 3) {
    const i0 = idx ? idx[t] : t, i1 = idx ? idx[t + 1] : t + 1, i2 = idx ? idx[t + 2] : t + 2;
    a.fromBufferAttribute(pos, i0); b.fromBufferAttribute(pos, i1); c.fromBufferAttribute(pos, i2);
    fn.subVectors(c, b).cross(a.sub(b)); // area-weighted face normal
    for (const i of [i0, i1, i2]) {
      const k = keys[i];
      const v = acc.get(k) || acc.set(k, new THREE.Vector3()).get(k);
      v.add(fn);
    }
  }
  const nrm = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const v = acc.get(keys[i]);
    if (v) { const l = v.length() || 1; nrm[i * 3] = v.x / l; nrm[i * 3 + 1] = v.y / l; nrm[i * 3 + 2] = v.z / l; }
  }
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  modelHullCache.set(geo, g);
  return g;
}

const modelHullMats = new Map();
function modelHullMat(thick) {
  const k = thick.toPrecision(4);
  if (!modelHullMats.has(k)) {
    modelHullMats.set(k, new THREE.ShaderMaterial({
      uniforms: { uThick: { value: thick }, uInk: { value: new THREE.Color(INK) } },
      vertexShader: MODEL_HULL_VERT,
      fragmentShader: HULL_FRAG,
      side: THREE.BackSide,
    }));
  }
  return modelHullMats.get(k);
}

// Ink outline for an imported (possibly skinned) mesh. `worldScale` is how many
// rig units one unit of the mesh's own space spans, so `thick` stays in rig units.
export function inkModelMesh(mesh, thick, worldScale) {
  const geo = modelHullGeometry(mesh.geometry);
  const mat = modelHullMat(thick / (worldScale || 1));
  let hull;
  if (mesh.isSkinnedMesh) {
    hull = new THREE.SkinnedMesh(geo, mat);
    hull.bind(mesh.skeleton, mesh.bindMatrix);
    hull.bindMode = mesh.bindMode;
  } else {
    hull = new THREE.Mesh(geo, mat);
  }
  hull.name = 'ink';
  hull.userData.shared = true;
  hull.frustumCulled = false;
  hull.raycast = () => {};
  mesh.add(hull);
  return hull;
}

// Convenience: toon-shaded, inked mesh.
export function part(geo, color, opts = {}) {
  const m = new THREE.Mesh(geo, opts.mat || toonMat(color, opts));
  if (opts.scale) m.scale.set(...opts.scale);
  if (opts.pos) m.position.set(...opts.pos);
  if (opts.rot) m.rotation.set(...opts.rot);
  if (opts.ink !== false) inked(m, opts.ink ?? 2);
  return m;
}
