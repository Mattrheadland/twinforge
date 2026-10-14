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
await browser.close();
server.close();
