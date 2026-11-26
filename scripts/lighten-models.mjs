// Makes the phone-weight toys from the detailed ones without touching their textures.
//
//   node scripts/lighten-models.mjs [--tris 12000] [asset-id ...]
//
// The detailed 25k-triangle imports (v6/toys-25k) are over the iPhone budget of
// 5k-15k triangles per hero (two toys share the screen). This welds and simplifies
// each model's mesh to about --tris triangles with meshoptimizer, keeps the same
// texture bytes, materials and node layout (so the rig joint boxes in
// data/characters.js still fit), and writes the GLB back in place.
// The full-detail files stay in git history on the v6/toys-25k branch.
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, simplify, weld } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';

const args = process.argv.slice(2);
const ti = args.indexOf('--tris');
const TARGET = ti >= 0 ? +args.splice(ti, 2)[1] : 12000;
const ids = args.length ? args : fs.readdirSync('assets/models').filter((d) => fs.existsSync(path.join('assets/models', d, `${d}.glb`)));

await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const tris = (doc) => {
  let n = 0;
  for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) {
    const idx = p.getIndices();
    n += (idx ? idx.getCount() : p.getAttribute('POSITION').getCount()) / 3;
  }
  return Math.round(n);
};

for (const id of ids) {
  const file = path.join('assets/models', id, `${id}.glb`);
  const doc = await io.read(file);
  if (doc.getRoot().listSkins().length) { console.log(`${id}: skinned, left alone`); continue; }
  const before = tris(doc), kb0 = fs.statSync(file).size / 1024;
  if (before <= TARGET) { console.log(`${id}: ${before} triangles, already light`); continue; }
  await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: TARGET / before, error: 0.01, lockBorder: false }), prune());
  await io.write(file, doc);
  console.log(`${id}: ${before} -> ${tris(doc)} triangles, ${kb0.toFixed(0)} -> ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
}
