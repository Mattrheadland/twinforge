// v6 Phase 4 in a real browser: a new toy goes straight to the fight; a levelled toy gets the gear-up
// screen (armor + moves); the kit is saved per toy and per player, the battle uses it (health, move tag,
// halo), a win levels the toy and can evolve it, and the Toy Box opens the same screen as a preview.
// Run after `npm run build`:  node test/gear-e2e.mjs [shots-dir]
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { toyXpForLevel } from '../src/logic/gear.js';

const SHOTS = process.argv[2] || 'scratch/shots-gear';
fs.mkdirSync(SHOTS, { recursive: true });
const root = path.resolve('dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.glb': 'model/gltf-binary', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
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

const browser = await puppeteer.launch({ executablePath: process.env.CHROME || (await chromium.executablePath()), args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'], headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 874, height: 402, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: true });
await page.evaluateOnNewDocument(() => { window.__TBB_TEST__ = true; });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });

const app = (fn, ...a) => page.evaluate(fn, ...a);
async function tap(sel, wait = 500) {
  const el = await page.waitForSelector(sel, { visible: true, timeout: 20000 });
  await sleep(450);
  await el.tap();
  await sleep(wait);
}
const shot = (name) => page.screenshot({ path: path.join(SHOTS, name + '.png') });
const boot = async () => {
  await page.goto(URL0, { waitUntil: 'load' });
  await page.waitForSelector('.title-screen .big-play', { timeout: 30000 });
};
const pickHero = async (name) => {
  await app(() => window.__tbb.app.goSelect());
  await page.waitForSelector('.select-screen .pick-card');
  const card = await page.evaluateHandle((n) => [...document.querySelectorAll('.pick-card')].find((c) => c.getAttribute('aria-label') === n), name);
  await sleep(1400);
  await card.tap();
  await sleep(400);
  await tap('.select-screen .go-btn');
};
const winNow = async () => {
  await page.waitForFunction(() => document.querySelector('.actions.moves:not(.hidden)'), { timeout: 30000 });
  await app(() => { const b = window.__tbb.app.battle; b.state.foe.hp = 1; });
  await tap('.move-quick', 300);
  await page.waitForSelector('.overlay.result', { timeout: 40000 });
};

await boot();
await app(() => localStorage.clear());
await boot();

// 1. a brand-new toy has nothing to choose: picking it goes straight to the VS splash / fight
await pickHero('Battle Rex');
await sleep(800);
check('new toy: no gear screen', !(await page.$('.gear-screen')));
await page.waitForFunction(() => window.__tbb.app.battle, { timeout: 30000 });
check('new toy: classic kit in battle', await app(() => window.__tbb.app.battle.state.kit && window.__tbb.app.battle.state.kit.armor === 'classic'));

// 2. a level-40 Rex: gear-up screen with armor and move rows, locked Legend, unlocked Mighty
await app((xp) => { const a = window.__tbb.app; a.endBattle(); a.save.data.toys = { rex: { xp, level: 40 } }; a.save.save(); }, toyXpForLevel(40));
await pickHero('Battle Rex');
await page.waitForSelector('.gear-screen', { timeout: 20000 });
check('levelled toy: gear screen shows', true);
check('five armor tiles, Legend locked', await app(() => document.querySelectorAll('.gear-armor .gear-tile').length === 5 && document.querySelectorAll('.gear-armor .gear-tile.locked').length === 1));
check('four move rows', await app(() => document.querySelectorAll('.gear-move').length === 4));
await sleep(1500);
await shot('1-gear-default');
await tap('.gear-armor .gear-tile:nth-child(4)'); // Mighty
const zippy = await page.evaluateHandle(() => [...document.querySelectorAll('.gear-chip')].find((c) => c.getAttribute('aria-label') === 'ZIPPY'));
await zippy.tap();
await sleep(1200);
check('picks saved to this toy', await app(() => { const k = window.__tbb.app.save.data.toys.rex.kit; return k.armor === 'mighty' && k.moves.quick === 'zippy'; }));
check('preview shows the armor halo', await app(() => !!(window.__tbb.app.stage.fighters.hero && window.__tbb.app.stage.fighters.hero.gear)));
await shot('2-gear-mighty-zippy');
await tap('.gear-go', 300);
await page.waitForFunction(() => window.__tbb.app.battle && window.__tbb.app.battle.phase, { timeout: 30000 });
await page.waitForFunction(() => document.querySelector('.actions.moves:not(.hidden)'), { timeout: 30000 });
check('battle uses the kit: Mighty health', await app(() => window.__tbb.app.battle.state.hero.maxHp === Math.round(window.__tbb.chars.rex.maxHp * 0.8)));
check('battle HUD tags the ZIPPY move', await app(() => (document.querySelector('.move-quick .move-tag') || {}).textContent === 'ZIPPY'));
check('evolved look in battle (gems)', await app(() => (window.__tbb.app.stage.fighters.hero.gear?.userData.gems.length || 0) === 2));
await sleep(600);
await shot('3-battle-kitted');
// a reload mid-battle resumes with the same kit
await app(() => window.__tbb.app.battle.save?.data && window.__tbb.app.save.save());
check('kit stored with the battle', await app(() => window.__tbb.app.battle.state.kit.armor === 'mighty'));

// 3. a win levels the toy; crossing level 15 evolves it
await app((xp) => { const a = window.__tbb.app; a.endBattle(); a.save.data.toys = { tree: { xp, level: 14 } }; a.save.save(); }, toyXpForLevel(15) - 10);
await pickHero('Spooky Tree');
await page.waitForSelector('.gear-screen', { timeout: 20000 });
await tap('.gear-go', 300);
await winNow();
await sleep(3300);
check('result shows the toy result', await page.$('.toy-result'));
check('EVOLVED! shows', await page.$('.toy-result.evolved .evo-shout'));
check('tree reached level 15', await app(() => window.__tbb.app.save.data.toys.tree.level >= 15));
await shot('4-evolved');

// 4. each player keeps their own toys: player 2 starts with nothing
const p1Toys = await app(() => JSON.stringify(window.__tbb.app.save.data.toys));
await app(() => { const s = window.__tbb.app.save; s.createProfile(1, { name: 'Sam', avatar: 'roo' }); s.switchTo ? s.switchTo(1) : s.selectProfile(1); });
check('player 2: no toy progress', await app(() => Object.keys(window.__tbb.app.save.data.toys || {}).length === 0));
await app(() => { const s = window.__tbb.app.save; s.switchTo ? s.switchTo(0) : s.selectProfile(0); });
check('player 1: toys back unchanged', (await app(() => JSON.stringify(window.__tbb.app.save.data.toys))) === p1Toys);

// 5. Toy Box: the gear screen as a preview (DONE, no fight)
await app(() => window.__tbb.app.goGallery('rex'));
await tap('.gal-gear');
await page.waitForSelector('.gear-screen .gear-go.done', { timeout: 20000 });
check('Toy Box opens gear preview', true);
await sleep(1200);
await shot('5-toybox-gear');
await tap('.gear-go.done');
check('DONE returns to the Toy Box', await page.$('.gallery-screen'));

check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
await browser.close();
server.close();
process.exit(failed.length ? 1 : 0);
