// Screens at laptop/desktop window sizes and the iPhone, with overlap checks.
// Usage: npm run build && node test/viewports.mjs [outDir]   (default scratch/desktop)
// ONLY=1280x700 limits it to one size.
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.argv[2] || 'scratch/desktop';
fs.mkdirSync(OUT, { recursive: true });
const root = path.resolve('dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
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

// [name, width, height, dpr, touch-first phone?]
let SIZES = [
  ['1280x700', 1280, 700, 1.5],
  ['1366x768', 1366, 768, 1],
  ['1536x864', 1536, 864, 1.25],
  ['1920x1080', 1920, 1080, 1],
  ['1024x768', 1024, 768, 1],
  ['21x9', 1720, 737, 1],
  ['iphone', 874, 402, 2, true],
];
if (process.env.ONLY) SIZES = SIZES.filter((s) => s[0] === process.env.ONLY);

const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); };

const browser = await puppeteer.launch({ executablePath: await chromium.executablePath(), args: [...chromium.args.filter((a) => a !== '--single-process'), '--disable-dev-shm-usage', '--disable-gpu-compositing'], headless: true });

// every visible tappable thing inside the window and not covered by another one
const layoutProblems = (sel) => `(() => {
  const W = innerWidth, H = innerHeight, out = [];
  const els = [...document.querySelectorAll(${JSON.stringify(sel)})].filter((e) => e.getClientRects().length && !e.closest('.hidden'));
  const rs = els.map((e) => e.getBoundingClientRect());
  rs.forEach((r, i) => {
    const name = els[i].className.toString().split(' ').slice(0, 2).join('.');
    if (r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1) out.push('off-screen ' + name);
    rs.forEach((q, j) => {
      if (j <= i || els[i].contains(els[j]) || els[j].contains(els[i])) return;
      const ox = Math.min(r.right, q.right) - Math.max(r.left, q.left), oy = Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top);
      if (ox > 2 && oy > 2) out.push('overlap ' + name + ' / ' + els[j].className.toString().split(' ').slice(0, 2).join('.'));
    });
  });
  return out;
})()`;

for (const [name, width, height, dpr, phone] of SIZES) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: dpr, isMobile: !!phone, hasTouch: !!phone, isLandscape: true });
  await page.evaluateOnNewDocument(() => { window.__TBB_TEST__ = true; window.__TBB_FORCE__ = { math: 'add' }; try { localStorage.clear(); } catch {} });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const click = async (sel) => {
    const el = await page.waitForSelector(sel, { visible: true, timeout: 15000 });
    await sleep(350);
    const b = await el.boundingBox();
    if (phone) await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
    else await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  };
  const phase = (p, t = 20000) => page.waitForFunction((p) => window.__tbb && window.__tbb.phase === p, { timeout: t }, p).then(() => true, () => false);
  const shot = (n) => page.screenshot({ path: `${OUT}/${name}-${n}.png` });
  const problems = async (label, sel) => {
    const p = await page.evaluate(layoutProblems(sel));
    check(`${name} ${label} fits`, p.length === 0, p.slice(0, 4).join('; '));
  };

  await page.goto(URL0, { waitUntil: 'load' });
  await page.waitForSelector('.title-screen .big-play', { timeout: 20000 });
  await sleep(1800);
  await shot('1-title');
  check(`${name} no rotate overlay`, await page.$eval('#rotate', (e) => getComputedStyle(e).display === 'none'));
  await problems('title', '.title-screen .big-play, .title-screen .gear, .star-count, .logo, .push-start');

  await page.evaluate(() => window.__tbb.app.goSelect(() => {}, () => {}));
  await sleep(1400);
  await click('.pick-card:nth-child(1)');
  await sleep(500);
  await shot('2-select');
  await problems('select', '.pick-card, .home-btn, .go-btn');

  await page.evaluate(() => window.__tbb.app.chooseMode('campaign'));
  await sleep(900);
  await click('.pick-card:nth-child(3)');
  await click('.go-btn');
  await sleep(2200);
  await shot('3-board');
  await problems('board', '.board-screen .home-btn, .board-stars, .board-die, .board-fight, .board-world-name');

  await page.evaluate(() => window.__tbb.app.startBattle('rex', 'tree'));
  await phase('choose');
  await sleep(900);
  await shot('4-battle');
  await problems('battle', '.panel, .pause-btn, .move'); // the K.O. badge is meant to sit where the two bars meet

  await click('.move-power');
  await page.waitForSelector('.challenge.in .opt', { visible: true, timeout: 15000 });
  await sleep(1100);
  await shot('5-question');
  await problems('question', '.ch-card, .opt, .ch-prompt');
  const ans = await page.evaluate(() => String(window.__tbb.app.battle.currentChallenge.answer));
  await click(`.opt[data-value="${ans}"]`);
  await phase('choose', 30000);
  await page.evaluate(() => { const a = window.__tbb.app; a.save.data.settings.learning = false; const b = a.battle; b.state.foe.hp = 1; b.hud.setHP('foe', 1, b.state.foe.maxHp, true); });
  await click('.move-quick');
  await page.waitForSelector('.overlay.result', { timeout: 30000 });
  await sleep(2600);
  await shot('6-result');
  await problems('result', '.result-card, .result-btns .round-btn');

  // tournament finale -> trophy
  await page.evaluate(() => {
    const a = window.__tbb.app;
    const path = ['tree', 'rockfish', 'arthur', 'witch', 'roo', 'bass', 'nightwing'].map((foeId, i) => ({ foeId, arenaId: 'castle', boss: i === 6 }));
    a.save.data.runs.tournament = { mode: 'tournament', heroId: 'rex', step: 6, wins: 6, stars: 15, path, done: false };
    a.onBattleEnd({ win: true, stars: 3, total: 20, state: { from: 'run', runMode: 'tournament', heroId: 'rex', foeId: 'nightwing' } });
  });
  await sleep(2200);
  await click('.result-btns .round-btn.again');
  await sleep(1500);
  await shot('7-trophy');
  await problems('trophy', '.trophy-card, .result-btns .round-btn, .overlay.trophy .round-btn');
  check(`${name} no page errors`, errors.length === 0, errors.slice(0, 3).join(' | '));
  await page.close();
}

// a tall desktop window never gets the rotate overlay; a phone held upright does
for (const [label, vp, want] of [
  ['tall desktop window', { width: 700, height: 1000, deviceScaleFactor: 1 }, 'none'],
  ['upright phone', { width: 402, height: 874, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, 'flex'],
]) {
  const page = await browser.newPage();
  await page.setViewport(vp);
  await page.evaluateOnNewDocument(() => { window.__TBB_TEST__ = true; });
  await page.goto(URL0, { waitUntil: 'load' });
  await sleep(1500);
  await page.screenshot({ path: `${OUT}/${label.replace(/ /g, '-')}.png` });
  check(`${label}: rotate overlay ${want === 'none' ? 'hidden' : 'shown'}`, (await page.$eval('#rotate', (e) => getComputedStyle(e).display)) === want);
  await page.close();
}

await browser.close();
server.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
