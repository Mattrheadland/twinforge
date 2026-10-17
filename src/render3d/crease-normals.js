// Smooth vertex normals with hard creases, for imported (image-to-3D) toys.
//
// The toon shader used to light every triangle flat. On a decimated scan that
// turns simplification noise into jaggies on round parts (heads, bellies). With
// these normals, round parts shade smooth and the hard toon bands follow the
// real form, while edges sharper than `creaseDeg` stay hard (helmet rims,
// cannon barrels, fins), so the toy still reads as chunky plastic.
//
// Pure data in, pure data out (no three.js), so it is unit-tested in Node.
//   creaseNormals({ position, index, attributes, creaseDeg, weldEps })
//     position   Float32Array, xyz per vertex
//     index      Uint16/Uint32Array or null (non-indexed triangles)
//     attributes { name: { array, itemSize } } copied onto the new vertices
//     creaseDeg  faces meeting at more than this angle keep a hard edge
//     weldEps    positions closer than this are one point (welds UV seams);
//                default: 1e-4 of the bounding-box diagonal
//   → { index: Uint32Array, normal: Float32Array, attributes, count, split }
// Vertices are split only where a crease (or a UV seam) needs it, so the
// vertex count grows a little, not 3x as with fully flat shading.
export function creaseNormals({ position, index = null, attributes = {}, creaseDeg = 55, weldEps } = {}) {
  const nv = position.length / 3;
  const tri = index ? index.length : nv;
  const nf = tri / 3;
  const vi = (c) => (index ? index[c] : c);

  // weld by quantized position
  let eps = weldEps;
  if (!(eps > 0)) {
    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
    for (let i = 0; i < nv; i++) {
      const x = position[i * 3], y = position[i * 3 + 1], z = position[i * 3 + 2];
      if (x < x0) x0 = x; if (y < y0) y0 = y; if (z < z0) z0 = z;
      if (x > x1) x1 = x; if (y > y1) y1 = y; if (z > z1) z1 = z;
    }
    eps = Math.max(1e-9, Math.hypot(x1 - x0, y1 - y0, z1 - z0) * 1e-4);
  }
  const weldOf = new Int32Array(nv);
  const keyMap = new Map();
  for (let i = 0; i < nv; i++) {
    const k = `${Math.round(position[i * 3] / eps)},${Math.round(position[i * 3 + 1] / eps)},${Math.round(position[i * 3 + 2] / eps)}`;
    let w = keyMap.get(k);
    if (w === undefined) { w = keyMap.size; keyMap.set(k, w); }
    weldOf[i] = w;
  }
  const nw = keyMap.size;

  // unit face normals + corner angles (angle weighting avoids sliver bias)
  const fn = new Float32Array(nf * 3);
  const ang = new Float32Array(tri);
  for (let f = 0; f < nf; f++) {
    const a = vi(f * 3) * 3, b = vi(f * 3 + 1) * 3, c = vi(f * 3 + 2) * 3;
    const abx = position[b] - position[a], aby = position[b + 1] - position[a + 1], abz = position[b + 2] - position[a + 2];
    const acx = position[c] - position[a], acy = position[c + 1] - position[a + 1], acz = position[c + 2] - position[a + 2];
    const bcx = position[c] - position[b], bcy = position[c + 1] - position[b + 1], bcz = position[c + 2] - position[b + 2];
    let nx = aby * acz - abz * acy, ny = abz * acx - abx * acz, nz = abx * acy - aby * acx;
    const l = Math.hypot(nx, ny, nz);
    if (l > 0) { nx /= l; ny /= l; nz /= l; }
    fn[f * 3] = nx; fn[f * 3 + 1] = ny; fn[f * 3 + 2] = nz;
    const angle = (ux, uy, uz, vx, vy, vz) => {
      const d = Math.hypot(ux, uy, uz) * Math.hypot(vx, vy, vz);
      return d > 0 ? Math.acos(Math.max(-1, Math.min(1, (ux * vx + uy * vy + uz * vz) / d))) : 0;
    };
    ang[f * 3] = angle(abx, aby, abz, acx, acy, acz);
    ang[f * 3 + 1] = angle(-abx, -aby, -abz, bcx, bcy, bcz);
    ang[f * 3 + 2] = Math.max(0, Math.PI - ang[f * 3] - ang[f * 3 + 1]);
  }

  // corners around each welded point (CSR)
  const start = new Int32Array(nw + 1);
  for (let c = 0; c < tri; c++) start[weldOf[vi(c)] + 1]++;
  for (let w = 0; w < nw; w++) start[w + 1] += start[w];
  const fill = start.slice(0, nw);
  const ring = new Int32Array(tri);
  for (let c = 0; c < tri; c++) ring[fill[weldOf[vi(c)]]++] = c;

  // per-corner normal: faces around the point within the crease angle
  const cosK = Math.cos((creaseDeg * Math.PI) / 180);
  const cn = new Float32Array(tri * 3);
  for (let c = 0; c < tri; c++) {
    const f = (c / 3) | 0;
    const w = weldOf[vi(c)];
    const fx = fn[f * 3], fy = fn[f * 3 + 1], fz = fn[f * 3 + 2];
    let x = 0, y = 0, z = 0;
    for (let r = start[w]; r < start[w + 1]; r++) {
      const c2 = ring[r], g = (c2 / 3) | 0;
      const gx = fn[g * 3], gy = fn[g * 3 + 1], gz = fn[g * 3 + 2];
      if (g !== f && fx * gx + fy * gy + fz * gz < cosK) continue;
      const k = ang[c2];
      x += gx * k; y += gy * k; z += gz * k;
    }
    let l = Math.hypot(x, y, z);
    if (!(l > 0)) { x = fx; y = fy; z = fz; l = Math.hypot(x, y, z) || 1; }
    cn[c * 3] = x / l; cn[c * 3 + 1] = y / l; cn[c * 3 + 2] = z / l;
  }

  // new vertices: one per (source vertex, normal) pair
  const outIndex = new Uint32Array(tri);
  const src = [];
  const vmap = new Map();
  const outN = [];
  for (let c = 0; c < tri; c++) {
    const v = vi(c);
    const qx = Math.round(cn[c * 3] * 1000), qy = Math.round(cn[c * 3 + 1] * 1000), qz = Math.round(cn[c * 3 + 2] * 1000);
    const k = `${v},${qx},${qy},${qz}`;
    let id = vmap.get(k);
    if (id === undefined) {
      id = src.length;
      vmap.set(k, id);
      src.push(v);
      outN.push(cn[c * 3], cn[c * 3 + 1], cn[c * 3 + 2]);
    }
    outIndex[c] = id;
  }
  const count = src.length;
  const all = { position: { array: position, itemSize: 3 }, ...attributes };
  const outAttrs = {};
  for (const [name, { array, itemSize }] of Object.entries(all)) {
    if (name === 'normal') continue;
    const out = new array.constructor(count * itemSize);
    for (let i = 0; i < count; i++) for (let j = 0; j < itemSize; j++) out[i * itemSize + j] = array[src[i] * itemSize + j];
    outAttrs[name] = { array: out, itemSize };
  }
  return { index: outIndex, normal: new Float32Array(outN), attributes: outAttrs, count, split: count - nv };
}
