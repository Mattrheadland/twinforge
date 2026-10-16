// Player profiles in a real browser: one player skips the picker, two players get
// "who's playing?", picking a player loads only their progress and survives a reload,
// the grown-up editor adds and deletes players. Run after `npm run build`:
//   node test/profiles-e2e.mjs [shots-dir]
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const SHOTS = process.argv[2] || 'scratch/shots-profiles';
fs.mkdirSync(SHOTS, { recursive: true });
const root = path.resolve('dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
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
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

const app = (fn, ...a) => page.evaluate(fn, ...a);
async function tap(sel) {
  const el = await page.waitForSelector(sel, { visible: true, timeout: 15000 });
  await sleep(450); // cards pop in; onTap ignores the very first frames
  await el.tap();
  await sleep(500);
}
const shot = (name) => page.screenshot({ path: path.join(SHOTS, name + '.png') });
const boot = async () => {
  await page.goto(URL0, { waitUntil: 'load' });
  await page.waitForSelector('.title-screen .big-play', { timeout: 30000 });
};

// 1. a first run (and every pre-profile save) is one player: Play goes straight to the modes
await boot();
await app(() => localStorage.clear());
await boot();
await tap('.big-play');
check('one player: Play opens the modes directly', await page.$('.modes-screen:not(.profiles-screen)'));

// 2. player 1 has progress; a grown-up adds Sam from settings
await app(() => { const a = window.__tbb.app; a.save.data.progress.stars = 5; a.save.save(); a.goTitle(); a.openParent(); });
await page.waitForSelector('.overlay.parent');
check('grown-up settings list the players', await app(() => /Players/.test(document.querySelector('.parent-card').textContent) && document.querySelectorAll('.parent-card button').length > 0));
await shot('1-settings-players');
const addBtn = await page.evaluateHandle(() => [...document.querySelectorAll('.parent-card .pbtn')].find((b) => b.textContent === 'Add player'));
await addBtn.click();
await page.waitForSelector('.profile-editor input[type=text]');
await page.type('.profile-editor input[type=text]', 'Sam');
await app(() => { const s = document.querySelectorAll('.profile-editor select'); s[0].value = 'witch'; s[1].value = 'growing'; });
await shot('2-new-player');
await (await page.evaluateHandle(() => [...document.querySelectorAll('.profile-editor .pbtn')].find((b) => b.textContent === 'Add player'))).click();
await sleep(400);
check('Sam was added with picture and pathway', await app(() => { const p = window.__tbb.app.save.index.profiles[1]; return p && p.name === 'Sam' && p.avatar === 'witch' && p.pathway === 'growing'; }));
check('settings reopened after adding', await page.$('.overlay.parent:not(.profile-editor)'));
await app(() => window.__tbb.app.goTitle());

// 3. two players: Play asks who's playing
await tap('.big-play');
check('two players: Play shows who’s playing', await page.$('.profiles-screen'));
check('picker shows two players and one open slot', await app(() => document.querySelectorAll('.profile-card:not(.empty)').length === 2 && document.querySelectorAll('.profile-card.empty').length === 1));
await sleep(600);
await shot('3-whos-playing');
await tap('.profile-card[aria-label="Play as Sam"]');
check('picking Sam opens the modes', await page.$('.modes-screen:not(.profiles-screen)'));
check('Sam starts with his own empty progress', await app(() => window.__tbb.app.save.slot === 1 && window.__tbb.app.save.data.progress.stars === 0));

// 4. Sam earns a star, reload: Sam is still the player, Player 1 still has 5
await app(() => { const a = window.__tbb.app; a.save.data.progress.stars = 1; a.save.save(); });
await boot();
check('after a reload Sam is still playing', await app(() => window.__tbb.app.save.slot === 1 && window.__tbb.app.save.data.progress.stars === 1));
check('Player 1 kept their 5 stars', await app(() => JSON.parse(localStorage.getItem('tbb.save')).progress.stars === 5));

// 5. a press-and-hold on the open slot starts a new player (grown-ups only)
await tap('.big-play');
const empty = await page.waitForSelector('.profile-card.empty', { visible: true });
await sleep(500);
const box = await empty.boundingBox();
await page.touchscreen.touchStart(box.x + box.width / 2, box.y + box.height / 2);
await sleep(400);
check('a quick touch on the open slot does nothing', !(await page.$('.profile-editor')));
await sleep(1500);
await page.touchscreen.touchEnd();
await sleep(300);
check('holding the open slot opens the grown-up editor', await page.$('.profile-editor'));
await (await page.evaluateHandle(() => [...document.querySelectorAll('.profile-editor .pbtn')].find((b) => b.textContent === 'Cancel'))).click();
await sleep(300);

// 6. delete Sam: the button stays off until his name is typed exactly
await app(() => { window.__tbb.app.goTitle(); window.__tbb.app.openParent(); });
await page.waitForSelector('.overlay.parent');
await (await page.evaluateHandle(() => [...document.querySelectorAll('.parent-card .row')].find((r) => r.textContent.startsWith('Sam')).querySelector('button:last-child'))).click();
await page.waitForSelector('.profile-editor');
await (await page.evaluateHandle(() => [...document.querySelectorAll('.profile-editor .pbtn')].find((b) => b.textContent === 'Delete player…'))).click();
await page.type('.del-confirm input', 'sam');
check('delete stays disabled for the wrong name', await app(() => document.querySelector('.del-confirm .pbtn.danger').disabled));
await app(() => { const i = document.querySelector('.del-confirm input'); i.value = ''; i.dispatchEvent(new Event('input')); });
await page.type('.del-confirm input', 'Sam');
await shot('4-delete-confirm');
check('delete unlocks for the exact name', await app(() => !document.querySelector('.del-confirm .pbtn.danger').disabled));
await page.click('.del-confirm .pbtn.danger');
await sleep(400);
check('Sam is gone, Player 1 is playing with 5 stars', await app(() => { const s = window.__tbb.app.save; return s.index.profiles[1] === null && s.slot === 0 && s.data.progress.stars === 5 && !localStorage.getItem('tbb.save.2'); }));

check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
server.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
