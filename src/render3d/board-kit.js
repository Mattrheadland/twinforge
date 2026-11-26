// Baking kit for the campaign diorama: hundreds of small low-poly pieces go
// into ONE merged mesh (vertex colours, faceted three-step toon shading) and
// ONE merged ink hull, so a whole island's dressing is two draw calls.
// Nothing here runs per frame: build once, then only uniforms change
// (uDark: the villain's gloom creeping over that island).
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { lighting, INK } from './toon.js';

// ---- shared primitive shapes (unit sized, low-poly on purpose) ----
const prim = {
  box: () => new THREE.BoxGeometry(1, 1, 1),
  cyl5: () => new THREE.CylinderGeometry(1, 1, 1, 5, 1, true), // open-ended: posts, trunks and stems never show their caps
  cyl6: () => new THREE.CylinderGeometry(1, 1, 1, 6),
  cyl8: () => new THREE.CylinderGeometry(1, 1, 1, 8),
  cone4: () => new THREE.ConeGeometry(1, 1, 4),
  cone5: () => new THREE.ConeGeometry(1, 1, 5),
  cone6: () => new THREE.ConeGeometry(1, 1, 6),
  cone8: () => new THREE.ConeGeometry(1, 1, 8),
  frust6: () => new THREE.CylinderGeometry(0.62, 1, 1, 6),
  ico: () => new THREE.IcosahedronGeometry(1, 0),
  ico1: () => new THREE.IcosahedronGeometry(1, 1),
  dodec: () => new THREE.DodecahedronGeometry(1, 0),
  oct: () => new THREE.OctahedronGeometry(1, 0),
  tetra: () => new THREE.TetrahedronGeometry(1, 0),
  disc8: () => new THREE.CylinderGeometry(1, 1, 1, 8),
  disc12: () => new THREE.CylinderGeometry(1, 1, 1, 12),
  torus: () => new THREE.TorusGeometry(1, 0.32, 3, 7),
  wedge: () => {
    // a ramp/roof prism: triangle in xy, extruded along z, unit box bounds
    const s = new THREE.Shape();
    s.moveTo(-0.5, -0.5); s.lineTo(0.5, -0.5); s.lineTo(0, 0.5); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
    g.translate(0, 0, -0.5);
    return g;
  },
};
const flat = new Map(); // non-indexed (faceted) positions
const smooth = new Map(); // welded positions + averaged normals, for the ink hull
function getFlat(k) {
  if (!flat.has(k)) {
    let g = prim[k]();
    g.deleteAttribute('uv');
    if (g.index) g = g.toNonIndexed();
    flat.set(k, g.getAttribute('position').array);
  }
  return flat.get(k);
}
function getSmooth(k) {
  if (!smooth.has(k)) {
    const src = prim[k]();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', src.getAttribute('position').clone());
    if (src.index) g.setIndex(src.index.clone());
    const m = mergeVertices(g, 1e-3);
    m.computeVertexNormals();
    const idx = m.index.array, p = m.getAttribute('position').array, n = m.getAttribute('normal').array;
    const P = new Float32Array(idx.length * 3), N = new Float32Array(idx.length * 3);
    for (let i = 0; i < idx.length; i++) for (let c = 0; c < 3; c++) { P[i * 3 + c] = p[idx[i] * 3 + c]; N[i * 3 + c] = n[idx[i] * 3 + c]; }
    smooth.set(k, { P, N });
  }
  return smooth.get(k);
}
export const PRIMS = Object.keys(prim);

// ---- the toon shader with vertex colours and a gloom mix ----
const VERT = /* glsl */ `
  attribute vec3 color;
  varying vec3 vView;
  varying vec3 vCol;
  void main() {
    vCol = color;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }`;
const FRAG = /* glsl */ `
  uniform vec3 uLight;
  uniform vec3 uTint;
  uniform float uDark;
  uniform vec3 uGloom;
  varying vec3 vView;
  varying vec3 vCol;
  void main() {
    vec3 n = normalize(cross(dFdx(vView), dFdy(vView)));
    float d = dot(n, uLight);
    vec3 base = vCol;
    // the villain's gloom: colours sink toward the forest's dusky purple, keeping their light/dark
    float g = dot(base, vec3(0.299, 0.587, 0.114));
    base = mix(base, uGloom * (0.45 + g * 1.1), uDark * 0.85);
    vec3 shadow = base * vec3(0.56, 0.5, 0.78);
    vec3 light = mix(base, vec3(1.0), 0.24);
    vec3 c = d > 0.62 ? light : (d > 0.08 ? base : shadow);
    gl_FragColor = vec4(c * uTint, 1.0);
  }`;
export function bakedMat(dark = { value: 0 }) {
  const m = new THREE.ShaderMaterial({
    uniforms: { uLight: lighting.uLight, uTint: lighting.uTint, uDark: dark, uGloom: { value: new THREE.Color(0x4a3a6a) } },
    vertexShader: VERT,
    fragmentShader: FRAG,
  });
  m.isToon = true;
  return m;
}
let inkMat = null;
export function bakedInk() {
  return (inkMat ||= new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide }));
}

const M = new THREE.Matrix4(), NM = new THREE.Matrix3(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3(), T = new THREE.Vector3(), V = new THREE.Vector3(), NV = new THREE.Vector3();
const C = new THREE.Color();

// A Baker collects pieces and builds { mesh, ink }.
export class Baker {
  constructor() {
    this.pos = []; this.col = [];
    this.ipos = [];
    this.pieces = 0;
  }

  // shape: a PRIMS key; color: hex; at: [x,y,z]; size: [sx,sy,sz]; rot: [rx,ry,rz] (XYZ euler)
  // o.ink: outline width in world units (false: none); o.parent: a Matrix4 applied after
  add(shape, color, at, size, rot = null, o = {}) {
    E.set(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0);
    Q.setFromEuler(E);
    M.compose(T.set(at[0], at[1], at[2]), Q, S.set(size[0], size[1], size[2]));
    if (o.parent) M.premultiply(o.parent);
    C.set(color);
    if (o.shade) C.multiplyScalar(o.shade);
    const src = getFlat(shape);
    for (let i = 0; i < src.length; i += 3) {
      V.set(src[i], src[i + 1], src[i + 2]).applyMatrix4(M);
      this.pos.push(V.x, V.y, V.z);
      this.col.push(C.r, C.g, C.b);
    }
    // tiny pieces get no outline (they read fine without, and it halves their cost)
    const ink = Math.max(Math.abs(size[0]), Math.abs(size[1]), Math.abs(size[2])) * (o.parent ? o.parent.getMaxScaleOnAxis() : 1) < 11 ? 0 : o.ink ?? 1.6;
    if (ink) {
      const { P, N } = getSmooth(shape);
      NM.getNormalMatrix(M);
      for (let i = 0; i < P.length; i += 3) {
        V.set(P[i], P[i + 1], P[i + 2]).applyMatrix4(M);
        NV.set(N[i], N[i + 1], N[i + 2]).applyMatrix3(NM).normalize();
        this.ipos.push(V.x + NV.x * ink, V.y + NV.y * ink, V.z + NV.z * ink);
      }
    }
    this.pieces++;
    return this;
  }

  // raw triangles (terrain): positions [x,y,z,...] and one colour per vertex
  tris(pos, col) {
    for (const v of pos) this.pos.push(v);
    for (const c of col) this.col.push(c);
  }
  inkTris(pos) { for (const v of pos) this.ipos.push(v); }

  get triangles() { return this.pos.length / 9; }

  // One mesh (+ one ink hull) per `chunk`-wide slice along x, so the follow
  // camera only draws the slices it can see (three.js frustum culling).
  build(mat, { name = 'baked', chunk = 0 } = {}) {
    const out = new THREE.Group();
    out.name = name;
    const split = (arr) => {
      if (!chunk) return new Map([[0, arr]]);
      const m = new Map();
      for (let i = 0; i < arr.length; i += 9) {
        const k = Math.floor((arr[i] + arr[i + 3] + arr[i + 6]) / 3 / chunk);
        let a = m.get(k);
        if (!a) m.set(k, (a = []));
        for (let j = 0; j < 9; j++) a.push(arr[i + j]);
      }
      return m;
    };
    if (this.pos.length) {
      // colours ride along with their positions
      const P = split(this.pos), Cm = new Map();
      if (chunk) for (let i = 0; i < this.pos.length; i += 9) {
        const k = Math.floor((this.pos[i] + this.pos[i + 3] + this.pos[i + 6]) / 3 / chunk);
        let a = Cm.get(k);
        if (!a) Cm.set(k, (a = []));
        for (let j = 0; j < 9; j++) a.push(this.col[i + j]);
      } else Cm.set(0, this.col);
      for (const [k, pos] of P) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute('color', new THREE.Float32BufferAttribute(Cm.get(k), 3));
        g.computeBoundingSphere();
        const m = new THREE.Mesh(g, mat);
        m.name = name;
        out.add(m);
      }
    }
    if (this.ipos.length) {
      for (const pos of split(this.ipos).values()) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.computeBoundingSphere();
        const h = new THREE.Mesh(g, bakedInk());
        h.name = 'ink';
        h.raycast = () => {};
        out.add(h);
      }
    }
    out.userData.pieces = this.pieces;
    out.userData.triangles = this.triangles;
    this.pos = this.col = this.ipos = null; // free the arrays
    return out;
  }
}

// a Matrix4 for a group transform (props are built in local space then placed)
export function place(x, y, z, rotY = 0, s = 1) {
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY, 0)), new THREE.Vector3(s, s, s));
}
