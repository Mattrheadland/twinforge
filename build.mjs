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

const BUILD = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
const out = 'dist';
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const js = await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  minify: true,
  write: false,
  format: 'iife',
  target: ['safari15'],
  define: { __BUILD__: JSON.stringify(BUILD), __MODELS__: JSON.stringify(MODELS) },
  legalComments: 'none',
});
const css = await build({ entryPoints: ['src/styles.css'], bundle: true, minify: true, write: false, loader: { '.css': 'css' } });

let html = fs.readFileSync('src/index.html', 'utf8');
html = html.replace('/*CSS*/', () => css.outputFiles[0].text).replace('/*JS*/', () => js.outputFiles[0].text.replace(/<\/script/g, '<\\/script'));
fs.writeFileSync(path.join(out, 'index.html'), html);

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
fs.writeFileSync(sw, fs.readFileSync(sw, 'utf8').replace('__BUILD__', BUILD));
fs.writeFileSync(path.join(out, '.nojekyll'), '');
// preview variant for a claude.ai artifact: page content without the document wrapper
const preview = html
  .replace(/<!doctype html>\s*<html[^>]*>\s*<head>/i, '')
  .replace(/<\/head>\s*<body>/i, '')
  .replace(/<\/body>\s*<\/html>\s*$/i, '')
  .replace(/<link rel="(manifest|apple-touch-icon|icon)"[^>]*>\n?/g, '');
fs.mkdirSync('preview', { recursive: true });
fs.writeFileSync('preview/twinforge.html', preview);
console.log(`built ${BUILD}: index.html ${(html.length / 1024).toFixed(0)} KB, models: ${Object.keys(MODELS).join(', ') || 'none'}`);
