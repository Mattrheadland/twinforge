// Build: bundle src/ into ONE self-contained index.html (works offline, works as
// a preview), then copy public/ (manifest, service worker, icons, assets) to dist/.
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Imported toy models: assets/models/<id>/<id>.glb → shipped as-is, listed for
// the game with a content hash (cache-busting) so missing ones never 404.
const MODELS = {};
if (fs.existsSync('assets/models')) {
  for (const id of fs.readdirSync('assets/models')) {
    const f = path.join('assets/models', id, `${id}.glb`);
    if (fs.existsSync(f)) MODELS[id] = crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex').slice(0, 10);
  }
}

function* walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) yield* walk(p); else if (p.endsWith('.js')) yield p;
  }
}

const BUILD = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
const out = 'dist';
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

// three.js (and its loaders) go in their own file, dist/three-<hash>.js: it's
// the bulk of the code, it never changes between builds, and index.html has a
// 1 MB budget. The entry is generated from what src/ actually uses (THREE.X and
// named imports), so three stays tree-shaken; in the app bundle every
// `import ... from 'three'` then resolves to the globals that file sets up.
const used = { three: new Set() };
for (const f of walk('src')) {
  const code = fs.readFileSync(f, 'utf8');
  for (const m of code.matchAll(/\bTHREE\.([A-Za-z0-9_]+)/g)) used.three.add(m[1]);
  for (const m of code.matchAll(/import\s*\{([^}]*)\}\s*from\s*'(three\/[^']*)'/g)) {
    (used[m[2]] ||= new Set());
    for (const n of m[1].split(',')) { const name = n.trim().split(/\s+as\s+/)[0]; if (name) used[m[2]].add(name); }
  }
}
const vendorEntry = Object.entries(used).map(([mod, names], i) =>
  `import { ${[...names].sort().join(', ')} } from ${JSON.stringify(mod)}; const m${i} = { ${[...names].sort().join(', ')} };`).join('\n') +
  `\nglobalThis.__TF_THREE = { ${Object.keys(used).map((mod, i) => `${JSON.stringify(mod)}: m${i}`).join(', ')} };\n`;
const vendor = await build({
  stdin: { contents: vendorEntry, resolveDir: process.cwd(), loader: 'js' },
  bundle: true,
  minify: true,
  write: false,
  format: 'iife',
  target: ['safari15'],
  legalComments: 'none',
});
const vendorJs = vendor.outputFiles[0].text;
const VENDOR = `three-${crypto.createHash('sha1').update(vendorJs).digest('hex').slice(0, 10)}.js`;
const threeFromGlobals = {
  name: 'three-from-globals',
  setup(b) {
    b.onResolve({ filter: /^three(\/.*)?$/ }, (args) => ({ path: args.path, namespace: 'three-global' }));
    b.onLoad({ filter: /.*/, namespace: 'three-global' }, (args) => ({
      contents: `module.exports = globalThis.__TF_THREE[${JSON.stringify(args.path)}];`,
      loader: 'js',
    }));
  },
};

const js = await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  minify: true,
  write: false,
  format: 'iife',
  target: ['safari15'],
  define: { __BUILD__: JSON.stringify(BUILD), __MODELS__: JSON.stringify(MODELS) },
  legalComments: 'none',
  plugins: [threeFromGlobals],
});
const css = await build({ entryPoints: ['src/styles.css'], bundle: true, minify: true, write: false, loader: { '.css': 'css' } });

const appJs = js.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
let html = fs.readFileSync('src/index.html', 'utf8');
html = html.replace('/*CSS*/', () => css.outputFiles[0].text);
const pageHtml = html.replace('<script>/*JS*/</script>', () => `<script src="${VENDOR}"></script>\n<script>${appJs}</script>`);
fs.writeFileSync(path.join(out, 'index.html'), pageHtml);
fs.writeFileSync(path.join(out, VENDOR), vendorJs);

const copy = (src, dst) => {
  for (const f of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, f.name), d = path.join(dst, f.name);
    if (f.isDirectory()) {
      fs.mkdirSync(d, { recursive: true });
      copy(s, d);
    } else fs.copyFileSync(s, d);
  }
};
copy('public', out);
for (const id of Object.keys(MODELS)) {
  fs.mkdirSync(path.join(out, 'assets/models', id), { recursive: true });
  fs.copyFileSync(path.join('assets/models', id, `${id}.glb`), path.join(out, 'assets/models', id, `${id}.glb`));
}
const sw = path.join(out, 'sw.js');
fs.writeFileSync(sw, fs.readFileSync(sw, 'utf8').replace('__BUILD__', BUILD).replace('__VENDOR__', VENDOR));
fs.writeFileSync(path.join(out, '.nojekyll'), '');
// preview variant for a claude.ai artifact: one file, three.js inlined, no document wrapper
const preview = html
  .replace('<script>/*JS*/</script>', () => `<script>${vendorJs.replace(/<\/script/g, '<\\/script')}</script>\n<script>${appJs}</script>`)
  .replace(/<!doctype html>\s*<html[^>]*>\s*<head>/i, '')
  .replace(/<\/head>\s*<body>/i, '')
  .replace(/<\/body>\s*<\/html>\s*$/i, '')
  .replace(/<link rel="(manifest|apple-touch-icon|icon)"[^>]*>\n?/g, '');
fs.mkdirSync('preview', { recursive: true });
fs.writeFileSync('preview/twinforge.html', preview);
console.log(`built ${BUILD}: index.html ${(pageHtml.length / 1024).toFixed(0)} KB + ${VENDOR} ${(vendorJs.length / 1024).toFixed(0)} KB, models: ${Object.keys(MODELS).join(', ') || 'none'}`);
