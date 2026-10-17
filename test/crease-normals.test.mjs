import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { creaseNormals } from '../src/render3d/crease-normals.js';

// corners of every triangle, as position triples, in order
function corners(position, index) {
  const out = [];
  const n = index ? index.length : position.length / 3;
  for (let c = 0; c < n; c++) {
    const v = index ? index[c] : c;
    out.push([position[v * 3], position[v * 3 + 1], position[v * 3 + 2]].map((x) => Math.round(x * 1e5)).join(','));
  }
  return out;
}

// unit cube, 8 shared corners, 12 triangles (outward winding)
const CUBE_P = new Float32Array([0,0,0, 1,0,0, 1,1,0, 0,1,0, 0,0,1, 1,0,1, 1,1,1, 0,1,1]);
const CUBE_I = new Uint16Array([0,2,1, 0,3,2, 4,5,6, 4,6,7, 0,1,5, 0,5,4, 2,3,7, 2,7,6, 1,2,6, 1,6,5, 0,4,7, 0,7,3]);

test('triangles keep their corners in order (geometry is unchanged)', () => {
  const r = creaseNormals({ position: CUBE_P, index: CUBE_I, creaseDeg: 55 });
  assert.deepEqual(corners(r.attributes.position.array, r.index), corners(CUBE_P, CUBE_I));
});

test('a cube is all hard edges at a 55 degree crease: 24 vertices, axis normals', () => {
  const r = creaseNormals({ position: CUBE_P, index: CUBE_I, creaseDeg: 55 });
  assert.equal(r.count, 24);
  for (let i = 0; i < r.count; i++) {
    const n = [...r.normal.slice(i * 3, i * 3 + 3)].map((x) => Math.abs(Math.round(x * 1000)));
    assert.deepEqual(n.sort(), [0, 0, 1000]);
  }
});

test('a crease above 90 degrees smooths the cube corners', () => {
  const r = creaseNormals({ position: CUBE_P, index: CUBE_I, creaseDeg: 100 });
  assert.equal(r.count, 8);
  for (let i = 0; i < r.count; i++) {
    const n = r.normal.slice(i * 3, i * 3 + 3);
    assert.ok(Math.abs(Math.hypot(...n) - 1) < 1e-5);
    assert.ok(Math.abs(Math.abs(n[0]) - Math.abs(n[1])) < 1e-3, 'corner normal points along the diagonal');
  }
});

// a gently curved strip (10 degree steps) split by a UV seam down the middle
function strip() {
  const P = [], UV = [], I = [];
  for (let s = 0; s < 2; s++) for (let i = 0; i <= 4; i++) for (const y of [0, 1]) {
    const a = ((s * 4 + i) * 10 * Math.PI) / 180 - 0.7; // seam: s=0 i=4 and s=1 i=0 share a position
    const ai = s === 1 ? (((4 + i) * 10) * Math.PI) / 180 - 0.7 : a;
    P.push(Math.sin(ai), y, Math.cos(ai));
    UV.push(s * 0.5 + i * 0.1, y);
  }
  for (let s = 0; s < 2; s++) for (let i = 0; i < 4; i++) {
    const b = s * 10 + i * 2;
    I.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
  }
  return { position: new Float32Array(P), uv: new Float32Array(UV), index: new Uint16Array(I) };
}

test('smooth across a UV seam: both sides of the seam get the same normal, UVs stay split', () => {
  const g = strip();
  const r = creaseNormals({ position: g.position, index: g.index, attributes: { uv: { array: g.uv, itemSize: 2 } }, creaseDeg: 55 });
  assert.deepEqual(corners(r.attributes.position.array, r.index), corners(g.position, g.index));
  // seam vertices: same position, different uv; their normals must match
  const byPos = new Map();
  for (let i = 0; i < r.count; i++) {
    const k = [...r.attributes.position.array.slice(i * 3, i * 3 + 3)].map((x) => Math.round(x * 1e4)).join(',');
    (byPos.get(k) || byPos.set(k, []).get(k)).push(i);
  }
  let seams = 0;
  for (const ids of byPos.values()) if (ids.length > 1) {
    seams++;
    const [a, b] = ids;
    for (let j = 0; j < 3; j++) assert.ok(Math.abs(r.normal[a * 3 + j] - r.normal[b * 3 + j]) < 1e-4);
    assert.notEqual(r.attributes.uv.array[a * 2], r.attributes.uv.array[b * 2]);
  }
  assert.equal(seams, 2);
  // no vertex beyond the source count: a 10 degree curve needs no crease split
  assert.equal(r.split, 0);
});

test('non-indexed input and degenerate triangles do not produce NaN normals', () => {
  const P = new Float32Array([0,0,0, 1,0,0, 0,1,0, 0,0,0, 0,0,0, 0,0,0]);
  const r = creaseNormals({ position: P, index: null });
  assert.ok([...r.normal].every(Number.isFinite));
  assert.equal(r.index.length, 6);
});

test('smoothGeometry unpacks interleaved glTF attributes (no scrambled vertices)', async () => {
  const THREE = await import('three');
  const { smoothGeometry } = await import('../src/render3d/models.js');
  // position + uv interleaved in one buffer, the way GLTFLoader hands them over
  const stride = 5;
  const n = CUBE_P.length / 3;
  const buf = new Float32Array(n * stride);
  for (let i = 0; i < n; i++) { buf.set(CUBE_P.slice(i * 3, i * 3 + 3), i * stride); buf[i * stride + 3] = i / n; buf[i * stride + 4] = 1 - i / n; }
  const ib = new THREE.InterleavedBuffer(buf, stride);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.InterleavedBufferAttribute(ib, 3, 0));
  geo.setAttribute('uv', new THREE.InterleavedBufferAttribute(ib, 2, 3));
  geo.setIndex(new THREE.BufferAttribute(CUBE_I, 1));
  const g = smoothGeometry(geo, 55);
  assert.deepEqual(corners(g.getAttribute('position').array, g.index.array), corners(CUBE_P, CUBE_I));
  assert.equal(g.getAttribute('uv').count, g.getAttribute('position').count);
  assert.equal(g.getAttribute('normal').count, 24);
});

test('imported toys smooth by default and can opt out per character', () => {
  const src = fs.readFileSync(new URL('../src/render3d/models.js', import.meta.url), 'utf8');
  assert.match(src, /art\.smooth !== false\) smoothModel/);
  assert.match(src, /smooth: art\.smooth !== false/);
});
