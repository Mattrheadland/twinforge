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

const shared = { uLight: { value: LIGHT } };

export function toonMat(color, opts = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uLight: shared.uLight,
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

// Convenience: toon-shaded, inked mesh.
export function part(geo, color, opts = {}) {
  const m = new THREE.Mesh(geo, opts.mat || toonMat(color, opts));
  if (opts.scale) m.scale.set(...opts.scale);
  if (opts.pos) m.position.set(...opts.pos);
  if (opts.rot) m.rotation.set(...opts.rot);
  if (opts.ink !== false) inked(m, opts.ink ?? 2);
  return m;
}
