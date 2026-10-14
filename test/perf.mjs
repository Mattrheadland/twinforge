// Rough frame-time check with a throttled CPU (headless Chromium, software GL,
// so absolute numbers are pessimistic; compare scenes against each other).
// Usage: npm run build && node test/perf.mjs [cpuThrottle=4]
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const THROTTLE = +(process.argv[2] || 4);
const root = path.resolve('dist');
const types = { '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(0);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: await chromium.executablePath(), args: chromium.args.filter((a) => a !== '--single-process'), headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 874, height: 402, deviceScaleFactor: 3, isMobile: true, hasTouch: true, isLandscape: true });
await page.evaluateOnNewDocument(() => { window.__TBB_TEST__ = true; });
await page.goto(`http://localhost:${server.address().port}/`, { waitUntil: 'load' });
await sleep(2500);
const cdp = await page.createCDPSession();
await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });

async function measure(label, setup) {
  await page.evaluate(setup);
  await sleep(2500);
  const r = await page.evaluate(() => new Promise((done) => {
    const times = [];
    let last = performance.now();
    const step = (t) => {
      times.push(t - last); last = t;
      if (times.length < 120) requestAnimationFrame(step);
      else {
        times.sort((a, b) => a - b);
        done({ median: times[60], p95: times[114], worst: times[119] });
      }
    };
    requestAnimationFrame(step);
  }));
  console.log(`${label.padEnd(34)} median ${r.median.toFixed(1)} ms · p95 ${r.p95.toFixed(1)} ms · worst ${r.worst.toFixed(1)} ms`);
  return r;
}

const fight = (hero, foe, arena, big = 1) => `(() => { const a = window.__tbb.app; a.ui.clear(); a.stage.dim = 0; a.stage.setArena('${arena}'); a.stage.setFighters(a.save.chars['${hero}'], a.save.chars['${foe}'], { foeBig: ${big} }); })()`;
await measure('bedroom, code toys (tree vs arthur)', fight('tree', 'arthur', 'bedroom'));
await measure('bedroom, Rex model vs arthur', fight('rex', 'arthur', 'bedroom'));
await measure('castle, Rex model vs arthur', fight('rex', 'arthur', 'castle'));
await measure('haunted forest, Rex vs giant tree', fight('rex', 'tree', 'haunted-forest', 1.22));
await measure('bog shack, Rex vs Bog Frog (minion)', fight('rex', 'frog', 'bog-shack', 1.2));
await measure('campaign board screen', `(() => { const a = window.__tbb.app; const { newCampaign } = window.__tbb.campaign || {}; a.save.data.campaign = a.save.data.campaign || { v: 1, heroId: 'rex', pos: 0, cleared: [0], stars: 0, rolls: 0, done: false }; a.goBoard(); })()`);

// leak check: switch arenas and fighters 20 times, GPU objects should come back down
const mem = () => page.evaluate(() => { const i = window.__tbb.app.stage.renderer.info.memory; return { g: i.geometries, t: i.textures }; });
// one warm-up lap fills the arena texture cache (kept on purpose)
for (const ar of ['castle', 'fishing-pier', 'haunted-forest', 'bog-shack']) { await page.evaluate((ar) => window.__tbb.app.stage.setArena(ar), ar); await sleep(600); }
await page.evaluate(() => { const a = window.__tbb.app; a.ui.clear(); a.stage.setArena('bedroom'); a.stage.setFighters(a.save.chars.rex, a.save.chars.tree); });
await sleep(1500);
const m0 = await mem();
const arenas = ['castle', 'fishing-pier', 'haunted-forest', 'bog-shack', 'bedroom'];
const foes = ['tree', 'frog', 'arthur', 'crab', 'nightwing'];
const lap = async () => {
  for (let i = 0; i < 20; i++) {
    // every fifth switch goes through the campaign board and back
    if (i % 5 === 4) {
      await page.evaluate(() => { const a = window.__tbb.app; a.save.data.campaign = { v: 1, heroId: 'rex', pos: 3, cleared: [0, 1, 2], stars: 1, rolls: 2, done: false }; a.goBoard(); });
      await sleep(500);
    }
    await page.evaluate((ar, foe) => { const a = window.__tbb.app; a.ui.clear(); a.stage.setArena(ar); a.stage.setFighters(a.save.chars.rex, a.save.chars[foe]); }, arenas[i % 5], foes[i % 5]);
    await sleep(300);
  }
  await page.evaluate(() => { const a = window.__tbb.app; a.stage.setArena('bedroom'); a.stage.setFighters(a.save.chars.rex, a.save.chars.tree); });
  await sleep(1500);
  return mem();
};
const m1 = await lap(); // first lap: every arena's art gets uploaded once (cached on purpose)
const m2 = await lap(); // second lap must not grow
const leak = m2.g - m1.g > 5 || m2.t - m1.t > 5;
console.log(`leak check: geometries ${m0.g} -> ${m1.g} -> ${m2.g}, textures ${m0.t} -> ${m1.t} -> ${m2.t} ${leak ? 'LEAK!' : 'ok (no growth after the first lap)'}`);

// asset sizes
const kb = (f) => Math.round(fs.statSync(f).size / 1024);
const dirKb = (d) => Math.round(fs.readdirSync(d).reduce((n, f) => n + fs.statSync(path.join(d, f)).size, 0) / 1024);
const sizes = [`index.html ${kb('dist/index.html')} KB`];
for (const id of fs.existsSync('dist/assets/models') ? fs.readdirSync('dist/assets/models') : []) sizes.push(`${id}.glb ${kb(`dist/assets/models/${id}/${id}.glb`)} KB`);
for (const id of fs.readdirSync('dist/arenas')) sizes.push(`arena ${id} ${dirKb(`dist/arenas/${id}`)} KB`);
console.log('sizes: ' + sizes.join(' · '));
await browser.close();
server.close();
