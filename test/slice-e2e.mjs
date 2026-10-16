// v6 Phase 1 slice in a real browser: the Pumpkin Patch's atmosphere and lighting come and go with the arena,
// a hit lights the toys in its colour, and the narrator reads a sum as words, in phrases, with the music
// dipping while it talks and coming back after. The phone's voice is stubbed so the test can hear it.
// Run after `npm run build`:  node test/slice-e2e.mjs [shots-dir]
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const SHOTS = process.argv[2] || 'scratch/shots-slice';
fs.mkdirSync(SHOTS, { recursive: true });
const root = path.resolve('dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.glb': 'model/gltf-binary', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(0);
const URL0 = `http://localhost:${server.address().port}/`;
const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: process.env.CHROME || (await chromium.executablePath()), args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'], headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 874, height: 402, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: true });
await page.evaluateOnNewDocument(() => {
  window.__TBB_TEST__ = true;
  window.__TBB_FORCE__ = { math: 'add' };
  // a stand-in phone voice: records what it is asked to say, finishes each phrase after 120 ms
  window.__said = [];
  class U { constructor(t) { this.text = t; } }
  window.SpeechSynthesisUtterance = U;
  const q = [];
  const next = () => { const u = q[0]; if (!u) return; setTimeout(() => { q.shift(); u.onend && u.onend(); next(); }, 120); };
  Object.defineProperty(window, 'speechSynthesis', { value: {
    speak(u) { window.__said.push(u.text); q.push(u); if (q.length === 1) next(); },
    cancel() { q.length = 0; }, getVoices() { return []; }, onvoiceschanged: null,
  } });
});
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
const app = (fn, ...a) => page.evaluate(fn, ...a);

await page.goto(URL0, { waitUntil: 'load' });
await page.waitForSelector('.title-screen .big-play', { timeout: 30000 });
await app(() => localStorage.clear());
await page.goto(URL0, { waitUntil: 'load' });
await page.waitForSelector('.title-screen .big-play', { timeout: 30000 });
await (await page.$('.big-play')).tap(); // unlocks audio and the voice like a real first tap
await sleep(800);

// 1. arena look on and off
await app(() => { const a = window.__tbb.app; a.startBattle('jackknife', 'wolfgang', null, { arenaId: 'pumpkin-patch' }); });
await page.waitForFunction(() => window.__tbb.phase === 'choose', { timeout: 40000 });
check('Pumpkin Patch has mist, fireflies and light pools', await app(() => { const r = window.__tbb.app.stage.room; return !!(r.atmos && r.atmos.mist.length === 3 && r.atmos.flies && r.atmos.pools.length >= 1); }));
await sleep(1200);
await page.screenshot({ path: path.join(SHOTS, 'slice-pumpkin-patch.png') });

// 2. a power move asks a sum: spoken as words, in phrases; the music dips while it talks
await app(() => { window.__said.length = 0; window.__duck = []; const au = window.__tbb.app.audio; const d = au.duck.bind(au); au.duck = (on) => { window.__duck.push(on); d(on); }; });
await (await page.waitForSelector('.move-power', { visible: true })).tap();
await page.waitForFunction(() => window.__tbb.phase === 'challenge', { timeout: 20000 });
await sleep(1500);
const said = await app(() => window.__said.slice());
check('the question was read aloud', said.length >= 1, JSON.stringify(said));
check('no digits or symbols reach the voice', said.every((t) => !/[0-9+=_]/.test(t)), JSON.stringify(said));
const duck = await app(() => window.__duck.slice());
check('music dipped while the narrator talked, then came back', duck[0] === true && duck.at(-1) === false, JSON.stringify(duck));
check('music is not left ducked', await app(() => window.__tbb.app.audio.ducked === false));
await page.screenshot({ path: path.join(SHOTS, 'slice-question.png') });

// 3. back home: the bedroom keeps the classic look
await app(() => { const a = window.__tbb.app; a.endBattle(); a.goModes(); a.startBattle('rex', 'roo', null, { arenaId: 'bedroom' }); });
await page.waitForFunction(() => window.__tbb.phase === 'choose', { timeout: 40000 });
check('bedroom: no atmosphere layer', await app(() => !window.__tbb.app.stage.room.atmos));

check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
await browser.close();
server.close();
process.exit(failed.length ? 1 : 0);
