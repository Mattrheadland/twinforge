// Turns the GLB(s) an image-to-3D tool exports into one game-ready model.
//
//   node scripts/import-model.mjs <asset-id> <main.glb> [more-animations.glb ...]
//   node scripts/import-model.mjs battle-rex ~/Downloads/rex.glb ~/Downloads/rex_roar.glb
//
// - takes the mesh, skeleton and textures from the first file
// - copies every animation from the other files onto it (matched by bone name),
//   for tools that export one file per clip
// - decodes Draco / meshopt compression, drops unused data, shrinks textures to
//   at most 1024 px (the game renders ~400 px tall), resamples animations
// - writes assets/models/<asset-id>/<asset-id>.glb and prints what's inside
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, resample, textureCompress, unpartition } from '@gltf-transform/functions';
import { MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';

const [id, main, ...extra] = process.argv.slice(2);
if (!id || !main) {
  console.error('usage: node scripts/import-model.mjs <asset-id> <main.glb> [more.glb ...]');
  process.exit(1);
}
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
  console.error(`asset id "${id}" should be lowercase-with-hyphens, e.g. battle-rex`);
  process.exit(1);
}

await MeshoptDecoder.ready;
let draco = {};
try {
  const d3d = await import('draco3dgltf');
  draco = { 'draco3d.decoder': await d3d.default.createDecoderModule() };
} catch { /* only needed for Draco-compressed files */ }
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, ...draco });

const doc = await io.read(main);
const root = doc.getRoot();
const nodesByName = new Map(root.listNodes().map((n) => [n.getName(), n]));
const buffer = root.listBuffers()[0] || doc.createBuffer();

// clips from the other files, retargeted onto this file's bones by name
for (const file of extra) {
  const other = await io.read(file);
  for (const anim of other.getRoot().listAnimations()) {
    const name = uniqueName(anim.getName() || path.basename(file, '.glb'));
    const copy = doc.createAnimation(name);
    let kept = 0;
    for (const ch of anim.listChannels()) {
      const target = ch.getTargetNode() && nodesByName.get(ch.getTargetNode().getName());
      if (!target) continue;
      const s = ch.getSampler();
      const sampler = doc.createAnimationSampler()
        .setInterpolation(s.getInterpolation())
        .setInput(copyAccessor(s.getInput()))
        .setOutput(copyAccessor(s.getOutput()));
      copy.addSampler(sampler).addChannel(doc.createAnimationChannel().setTargetNode(target).setTargetPath(ch.getTargetPath()).setSampler(sampler));
      kept++;
    }
    if (!kept) { copy.dispose(); console.warn(`  skipped "${name}" from ${file}: no bones matched`); }
  }
}

function uniqueName(n) {
  const taken = new Set(root.listAnimations().map((a) => a.getName()));
  let out = n, i = 2;
  while (taken.has(out)) out = `${n}_${i++}`;
  return out;
}
function copyAccessor(a) {
  return doc.createAccessor().setType(a.getType()).setArray(a.getArray().slice()).setBuffer(buffer);
}

await doc.transform(
  dedup(),
  resample(),
  textureCompress({ encoder: sharp, resize: [1024, 1024] }),
  prune(),
  unpartition()
);
// keep the output plain (no compression extensions the game would need decoders for)
for (const ext of root.listExtensionsUsed()) if (/draco|meshopt|ktx|webp|avif/i.test(ext.extensionName)) ext.dispose();

const outDir = path.join('assets/models', id);
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, `${id}.glb`);
await io.write(out, doc);

// report
let tris = 0;
for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) {
  const idx = p.getIndices();
  tris += (idx ? idx.getCount() : p.getAttribute('POSITION').getCount()) / 3;
}
const bones = root.listSkins().reduce((n, s) => n + s.listJoints().length, 0);
const tex = root.listTextures().map((t) => `${t.getSize()?.join('×') || '?'} ${t.getMimeType()}`);
console.log(`wrote ${out} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
console.log(`  triangles: ${Math.round(tris)}   bones: ${bones}   textures: ${tex.join(', ') || 'none'}`);
console.log(`  clips: ${root.listAnimations().map((a) => a.getName()).join(', ') || 'none'}`);
