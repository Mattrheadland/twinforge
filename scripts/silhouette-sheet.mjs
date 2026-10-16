// Silhouette gate for character design (v6 acceptance: "unmistakably unique anatomy").
// Renders each toy's code rig (the same snapshot the select cards use) at three angles,
// as colour and as a black silhouette, and scores how much any two silhouettes overlap
// once both are scaled to the same height and stood on the same spot (IoU, 0..1).
// High overlap = the two toys read as the same body in different paint.
//
//   npm run build && node scripts/silhouette-sheet.mjs [out-dir] [ids]
//   ids default: crookhook,jackknife,wolfgang,payne
// Writes <out>/silhouettes.png and <out>/silhouettes.json.
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.argv[2] || 'scratch/silhouettes';
const IDS = (process.argv[3] || 'crookhook,jackknife,wolfgang,payne').split(',');
fs.mkdirSync(OUT, { recursive: true });
const root = path.resolve('dist');
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200);
  fs.createReadStream(f).pipe(res);
}).listen(0);

const browser = await puppeteer.launch({ executablePath: process.env.CHROME || (await chromium.executablePath()), args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'], headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 500, deviceScaleFactor: 1 });
await page.evaluateOnNewDocument(() => { window.__TBB_TEST__ = true; });
await page.goto(`http://localhost:${server.address().port}/`, { waitUntil: 'load' });
await page.waitForSelector('.title-screen', { timeout: 30000 });

const TILE = (process.env.TILE || '220x260').split('x').map(Number);
const POSE = JSON.parse(process.env.POSE || '{}'); // e.g. POSE='{"shield":1}' to check a guard pose
const result = await page.evaluate((ids, TILE, POSE) => {
  const { app, chars } = window.__tbb;
  const stage = app.stage;
  if (!stage.snapshot) return { error: 'no 3D stage' };
  const VIEWS = [['3/4', -0.95], ['side', 0], ['front', -Math.PI / 2]];
  const [W, H] = TILE, G = 64; // tile size; G = normalised grid for scoring
  const sheet = document.createElement('canvas');
  sheet.width = W * VIEWS.length * 2;
  sheet.height = H * ids.length + 30;
  const sg = sheet.getContext('2d');
  sg.fillStyle = '#ffffff';
  sg.fillRect(0, 0, sheet.width, sheet.height);
  sg.fillStyle = '#14111A';
  sg.font = 'bold 16px sans-serif';
  VIEWS.forEach(([v], i) => { sg.fillText(v + ' colour', i * W * 2 + 8, 20); sg.fillText(v + ' silhouette', i * W * 2 + W + 8, 20); });
  const masks = {};
  ids.forEach((id, row) => {
    const def = chars[id];
    masks[id] = [];
    VIEWS.forEach(([, yaw], vi) => {
      const c = stage.snapshot(def, { w: W, h: H, framing: 'full', yaw, pose: { eyes: 'open', ...POSE } });
      const g = c.getContext('2d');
      const im = g.getImageData(0, 0, W, H).data;
      // silhouette tile
      const sil = document.createElement('canvas'); sil.width = W; sil.height = H;
      const sgc = sil.getContext('2d'); const out = sgc.createImageData(W, H);
      let x0 = W, x1 = -1, y0 = H, y1 = -1;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const a = im[(y * W + x) * 4 + 3] > 40;
        const o = (y * W + x) * 4;
        out.data[o] = out.data[o + 1] = out.data[o + 2] = a ? 20 : 255; out.data[o + 3] = 255;
        if (a) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      sgc.putImageData(out, 0, 0);
      sg.drawImage(c, vi * W * 2, 30 + row * H);
      sg.drawImage(sil, vi * W * 2 + W, 30 + row * H);
      // normalised mask: same height, centred on the feet
      const m = new Uint8Array(G * G);
      if (x1 >= 0) {
        const hh = y1 - y0 + 1, s = (G - 2) / hh, cx = (x0 + x1) / 2;
        for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) {
          const sx = Math.round(cx + (gx - G / 2) / s), sy = Math.round(y1 - (G - 1 - gy) / s);
          if (sx >= 0 && sx < W && sy >= 0 && sy < H && im[(sy * W + sx) * 4 + 3] > 40) m[gy * G + gx] = 1;
        }
      }
      masks[id].push({ m: Array.from(m), aspect: x1 >= 0 ? (x1 - x0 + 1) / (y1 - y0 + 1) : 0, fill: 0 });
    });
    sg.fillStyle = '#14111A';
    sg.fillText(def.name, 8, 30 + row * H + H - 10);
  });
  const iou = (a, b) => { let i = 0, u = 0; for (let k = 0; k < a.length; k++) { i += a[k] & b[k]; u += a[k] | b[k]; } return u ? i / u : 0; };
  const pairs = [];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const per = VIEWS.map((v, vi) => +iou(masks[ids[i]][vi].m, masks[ids[j]][vi].m).toFixed(3));
    pairs.push({ a: ids[i], b: ids[j], iou: per, max: Math.max(...per), mean: +(per.reduce((s, x) => s + x, 0) / per.length).toFixed(3) });
  }
  const aspects = Object.fromEntries(ids.map((id) => [id, masks[id].map((v) => +v.aspect.toFixed(2))]));
  return { png: sheet.toDataURL('image/png'), pairs, aspects, views: VIEWS.map((v) => v[0]) };
}, IDS, TILE, POSE);

await browser.close();
server.close();
if (result.error) { console.error(result.error); process.exit(1); }
fs.writeFileSync(path.join(OUT, 'silhouettes.png'), Buffer.from(result.png.split(',')[1], 'base64'));
const { png, ...data } = result;
fs.writeFileSync(path.join(OUT, 'silhouettes.json'), JSON.stringify({ ids: IDS, ...data }, null, 2));
console.log('views', data.views.join(' / '));
for (const p of data.pairs.sort((x, y) => y.max - x.max)) console.log(`${p.a.padEnd(10)} vs ${p.b.padEnd(10)} IoU ${p.iou.join(' / ')}  (max ${p.max})`);
console.log('width/height', JSON.stringify(data.aspects));
