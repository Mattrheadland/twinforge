// Look at an imported toy model in the real game (headless Chromium).
// Usage: npm run build && node test/model-check.mjs [characterId] [shotsDir]
// Prints what the loader found (triangles, clips → actions, bones) and saves
// screenshots: select screen, a big portrait, and the toy in each action.
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { ROSTER } from '../src/data/characters.js';

const CHAR = process.argv[2] || 'rex';
const SHOTS = process.argv[3] || 'scratch/model';
fs.mkdirSync(SHOTS, { recursive: true });
const root = path.resolve('dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.glb': 'model/gltf-binary', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(0);
const URL0 = `http://localhost:${server.address().port}/`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: await chromium.executablePath(), args: [...chromium.args.filter((a) => a !== '--single-process'), '--disable-dev-shm-usage'], headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 874, height: 402, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: true });
await page.evaluateOnNewDocument(() => { window.__TBB_TEST__ = true; });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warn') errors.push(m.text()); });

async function tap(sel) {
  const el = await page.waitForSelector(sel, { visible: true, timeout: 15000 });
  await sleep(500);
  const b = await el.boundingBox();
  await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
}

await page.goto(URL0, { waitUntil: 'load' });
await page.waitForSelector('.title-screen .big-play', { timeout: 20000 });
await sleep(1500);
await tap('.big-play');
await sleep(800);
await tap('.profile-card.active');
await sleep(800);
await tap('.mode-arcade');
await sleep(900);
await page.screenshot({ path: `${SHOTS}/select.png` });
await tap(`.pick-card:nth-child(${ROSTER.indexOf(CHAR) + 1})`);
await tap('.go-btn');
await sleep(600);
// opponent: FOE=<id> or a surprise
await tap(process.env.FOE ? `.pick-card:nth-child(${ROSTER.filter((id) => id !== CHAR).indexOf(process.env.FOE) + 1})` : '.pick-card.surprise');
await tap('.go-btn');
await sleep(600);
await tap(`.arena-card:nth-child(${+(process.env.ARENA || 1)})`);
const t0 = Date.now();
while (Date.now() - t0 < 20000 && (await page.evaluate(() => window.__tbb.phase)) !== 'choose') await sleep(100);
await sleep(600);

const info = await page.evaluate(() => {
  const f = window.__tbb.app.stage.fighters.hero;
  return { isModel: !!f.rig.isModel, info: f.rig.info || null, anchors: Object.fromEntries(Object.entries(f.rig.anchors).map(([k, v]) => [k, [v.x, v.y, v.z].map(Math.round)])) };
});
console.log(JSON.stringify(info, null, 1));
await page.screenshot({ path: `${SHOTS}/battle-idle.png` });

// big portrait straight from the stage
const png = await page.evaluate(() => {
  const st = window.__tbb.app.stage;
  return st.snapshot(st.fighters.hero.def, { w: 600, h: 600, framing: 'full' }).toDataURL('image/png');
});
fs.writeFileSync(`${SHOTS}/portrait.png`, Buffer.from(png.split(',')[1], 'base64'));

// hold each action for a moment (pokes fighter state the way the moves do)
const poses = {
  attack: { ox: 60 }, hit: { flash: 0.9, eyes: 'squint', mouth: 'o' }, guard: { shield: 1 },
  special: { aura: 1, cannon: 1, eyes: 'angry', mouth: 'open' }, win: { cheer: true }, tired: { tired: true },
};
for (const [name, set] of Object.entries(poses)) {
  await page.evaluate((set) => {
    const f = window.__tbb.app.stage.fighters.hero;
    f._saved = { ox: f.ox, flash: f.flash, eyes: f.eyes, mouth: f.mouth, shield: f.shield, aura: f.aura, cannon: f.cannon, cheer: f.cheer, tired: f.tired };
    Object.assign(f, set);
    f._hold = setInterval(() => Object.assign(f, set), 16);
  }, set);
  await sleep(700);
  await page.screenshot({ path: `${SHOTS}/battle-${name}.png` });
  await page.evaluate(() => {
    const f = window.__tbb.app.stage.fighters.hero;
    clearInterval(f._hold);
    Object.assign(f, f._saved);
  });
  await sleep(250);
}
// the same toy on the opponent's side (mirrored)
await page.evaluate(() => {
  const st = window.__tbb.app.stage;
  st.setFighters(st.fighters.foe.def, st.fighters.hero.def);
  st.fighters.foe._hold = setInterval(() => { st.fighters.foe.cheer = true; }, 16);
});
await sleep(700);
await page.screenshot({ path: `${SHOTS}/foe-side-win.png` });

console.log(errors.length ? `console:\n  ${errors.join('\n  ')}` : 'no console errors');
console.log(`shots in ${SHOTS}/`);
await browser.close();
server.close();
