// In-game captures for art review: starts real battles in the built game and screenshots
// them once the player's turn comes up (the actual battle camera, arena and lighting).
//   npm run build && node scripts/battle-shot.mjs [out-dir] [hero:foe,hero:foe] [WxH]
// e.g. node scripts/battle-shot.mjs scratch/battle jackknife:wolfgang,rex:jackknife 874x402
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.argv[2] || 'scratch/battle';
const PAIRS = (process.argv[3] || 'jackknife:wolfgang').split(',').map((p) => p.split(':'));
const [VW, VH] = (process.argv[4] || '874x402').split('x').map(Number);
fs.mkdirSync(OUT, { recursive: true });
const root = path.resolve(process.env.DIST || 'dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(0);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: process.env.CHROME || (await chromium.executablePath()), args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'], headless: true });
const page = await browser.newPage();
await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: true });
await page.evaluateOnNewDocument(() => { window.__TBB_TEST__ = true; try { localStorage.clear(); } catch {} });
await page.goto(`http://localhost:${server.address().port}/`, { waitUntil: 'load' });
await page.waitForSelector('.title-screen', { timeout: 30000 });
await sleep(1500); // models load

for (const [hero, foe] of PAIRS) {
  await page.evaluate((h, f) => window.__tbb.app.startBattle(h, f), hero, foe);
  const t0 = Date.now();
  while (Date.now() - t0 < 30000 && (await page.evaluate(() => window.__tbb.phase)) !== 'choose') await sleep(200);
  await sleep(1200); // idle settles
  const file = path.join(OUT, `${hero}-vs-${foe}.png`);
  await page.screenshot({ path: file });
  console.log(file);
}
await browser.close();
server.close();
