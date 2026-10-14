// Headless playthrough at iPhone 16 Pro landscape size (Chromium, not Safari).
// Usage: node test/e2e.mjs [shotsDir]
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const SHOTS = process.argv[2] || 'scratch/shots';
fs.mkdirSync(SHOTS, { recursive: true });
const root = path.resolve('dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
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
const check = (name, ok, extra = '') => { results.push({ name, ok: !!ok, extra }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: await chromium.executablePath(), args: [...chromium.args.filter((a) => a !== '--single-process'), '--disable-dev-shm-usage', '--disable-gpu-compositing'], headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 874, height: 402, deviceScaleFactor: +(process.env.DPR || 2), isMobile: true, hasTouch: true, isLandscape: true });
await page.evaluateOnNewDocument(() => { window.__TBB_TEST__ = true; window.__TBB_FORCE__ = { math: 'count' }; });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

async function tap(sel, { wait = 0 } = {}) {
  const el = await page.waitForSelector(sel, { visible: true, timeout: 15000 });
  // wait for slide-in animations to settle so the tap lands where the button ends up
  let b = await el.boundingBox();
  for (let i = 0; i < 20; i++) {
    await sleep(50);
    const nb = await el.boundingBox();
    if (nb && b && Math.abs(nb.x - b.x) < 0.5 && Math.abs(nb.y - b.y) < 0.5) { b = nb; break; }
    b = nb;
  }
  await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
  if (wait) await sleep(wait);
}
const phase = () => page.evaluate(() => window.__tbb.phase);
async function waitPhase(p, timeout = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if ((await phase()) === p) return true;
    await sleep(60);
  }
  return false;
}
const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png` });
async function answerChallenge({ wrong = 0 } = {}) {
  await page.waitForSelector('.challenge.in .opt', { visible: true });
  await sleep(700);
  const info = await page.evaluate(() => {
    const ch = window.__tbb.app.battle.currentChallenge;
    const opts = [...document.querySelectorAll('.opt')].map((o) => o.dataset.value);
    return { opts, answer: String(ch.answer), kind: ch.kind };
  });
  const wrongs = info.opts.filter((o) => o !== info.answer);
  for (let i = 0; i < wrong; i++) {
    await tap(`.opt[data-value="${wrongs[i]}"]`);
    await sleep(1400);
  }
  await tap(`.opt[data-value="${info.answer}"]`);
  return info;
}
// ---------- title ----------
await page.goto(URL0, { waitUntil: 'load' });
await page.waitForSelector('.title-screen .big-play', { timeout: 20000 }).catch(() => {});
await sleep(1600);
await shot('01-title');
check('title renders', await page.$('.title-screen .big-play'), errors.join(' | '));

// ---------- select ----------
await tap('.big-play', { wait: 700 });
check('audio unlocked by first tap', await page.evaluate(() => window.__tbb.app.audio.ctx && window.__tbb.app.audio.ctx.state), await page.evaluate(() => window.__tbb.app.audio.ctx?.state));
await shot('02a-modes');
check('five modes to pick', (await page.$$('.mode-card')).length === 5);
await tap('.mode-quick', { wait: 600 });
await shot('02-select');
const cards = await page.$$('.pick-card');
check('eight characters to pick', cards.length === 8);
await tap(`.pick-card:nth-child(${process.env.HERO || 2})`, { wait: 500 });
await shot('03-selected');
await tap('.go-btn', { wait: 300 });
await shot('03b-arenas');
check('arena pick shows four arenas, the bedroom and surprise', (await page.$$('.arena-card')).length === 6);
await tap('.arena-card:nth-child(2)', { wait: 300 });
await sleep(400);
await shot('04-vs');

// ---------- battle intro ----------
check('battle reaches player turn', await waitPhase('choose'));
await sleep(500);
await shot('05-battle-choose');
check('tutorial hand points at attack on first battle', await page.$eval('.tut-hand', (n) => !n.classList.contains('hidden')));

// locked special does nothing
await tap('.move-special', { wait: 400 });
check('locked special does not start a challenge', !(await page.$('.challenge')) && (await phase()) === 'choose');

// rapid repeated taps: only one challenge
const atk = await (await page.$('.move-power')).boundingBox();
for (let i = 0; i < 6; i++) await page.touchscreen.tap(atk.x + atk.width / 2, atk.y + atk.height / 2);
await sleep(500);
check('six fast taps open exactly one challenge', (await page.$$('.challenge')).length === 1);
await shot('06-count-challenge');

// wrong -> hint, wrong -> support, then correct
await page.waitForSelector('.challenge.in .opt', { visible: true });
await sleep(700);
const info1 = await page.evaluate(() => ({ n: document.querySelectorAll('.cnt-item').length, opts: [...document.querySelectorAll('.opt')].map((o) => o.dataset.value) }));
const wrong1 = info1.opts.filter((o) => o !== String(info1.n));
const foeHp0 = await page.evaluate(() => window.__tbb.app.battle.state.foe.hp);
await tap(`.opt[data-value="${wrong1[0]}"]`);
await sleep(1600);
await shot('07-after-one-wrong');
check('first wrong answer removes that choice', await page.$eval(`.opt[data-value="${wrong1[0]}"]`, (n) => n.classList.contains('gone')));
await tap(`.opt[data-value="${wrong1[1]}"]`);
await sleep(600 + info1.n * 300);
await shot('08-support');
check('second wrong answer leaves only the glowing answer + count-along', await page.$eval(`.opt[data-value="${info1.n}"]`, (n) => n.classList.contains('glow')) && (await page.$$('.cnt-item.counted')).length === info1.n);
await tap(`.opt[data-value="${info1.n}"]`);
await sleep(350);
await shot('09-hit');
await waitPhase('foe');
const st1 = await page.evaluate(() => window.__tbb.app.battle.state);
const bonus = await page.evaluate(() => ({ rex: 2, tree: 0, rockfish: 1, arthur: 2, witch: 3, nightwing: 0, roo: 2, bass: 2 })[window.__tbb.app.battle.state.heroId]);
check('supported answer still lands a modest hit (never a miss)', st1.foe.hp < foeHp0 && foeHp0 - st1.foe.hp === 14 + bonus, `${foeHp0}->${st1.foe.hp}`);
check('stats record a supported answer', st1.stats.support === 1);

// ---------- save / resume mid-battle ----------
check('reaches next player turn after foe', await waitPhase('choose', 20000));
await sleep(300);
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('tbb.save')).battle);
check('battle snapshot saved at turn start', saved && saved.turn === 'hero' && saved.foe.hp === st1.foe.hp);
await page.reload({ waitUntil: 'load' });
await sleep(1400);
check('title shows resume badge', await page.$('.big-play.resume'));
await tap('.big-play');
check('resumed battle reaches player turn', await waitPhase('choose'));
const st2 = await page.evaluate(() => window.__tbb.app.battle.state);
check('resumed with same HP', st2.foe.hp === st1.foe.hp && st2.hero.hp === saved.hero.hp, `foe ${st2.foe.hp}`);

// ---------- play to victory ----------
await page.evaluate(() => { window.__TBB_FORCE__ = {}; });
let turns = 0, specials = 0, defends = 0, sawCharge = false;
while (turns++ < 30) {
  const ph = await phase();
  if (ph === 'end') break;
  if (ph !== 'choose') { await sleep(100); continue; }
  const s = await page.evaluate(() => window.__tbb.app.battle.state);
  const foeCharged = s.foe.charged;
  if (foeCharged) sawCharge = true;
  if (s.hero.energy >= 3) {
    await tap('.move-special');
    await answerChallenge();
    specials++;
    if (specials === 1) { await sleep(900); await shot('11-special'); await sleep(900); await shot('11b-special'); }
  } else if (foeCharged && s.hero.lastSlot !== 'guard') {
    await shot('10-foe-charged');
    await tap('.move-guard');
    defends++;
  } else {
    await tap('.move-power');
    await answerChallenge();
  }
  await sleep(300);
  const t0 = Date.now();
  while (Date.now() - t0 < 25000) {
    const p = await phase();
    if (p === 'choose' || p === 'end') break;
    await sleep(80);
  }
}
check('used a special', specials > 0, `specials=${specials}`);
check('saw enemy telegraph and answered it (defend or special)', sawCharge && defends + specials > 0, `defends=${defends}`);
const endState = await page.evaluate(() => window.__tbb.app.battle.state);
check('battle won', endState.result === 'win', `hero ${endState.hero.hp}/${endState.hero.maxHp}`);
await page.waitForSelector('.overlay.result', { timeout: 15000 });
await sleep(2200);
await shot('12-victory');
const prog = await page.evaluate(() => JSON.parse(localStorage.getItem('tbb.save')));
check('stars saved and battle cleared', prog.progress.stars > 0 && prog.battle === null, `stars=${prog.progress.stars}`);
check('energy never above max', endState.hero.energy <= 3);

// ---------- retry + lose path ----------
await tap('.round-btn.again');
check('play again starts a fresh battle', await waitPhase('choose'));
await page.evaluate(() => { const b = window.__tbb.app.battle; b.state.hero.hp = 1; b.hud.setHP('hero', 1, b.state.hero.maxHp, true); });
await tap('.move-quick');
await page.waitForSelector('.overlay.result', { timeout: 30000 });
await sleep(1500);
await shot('13-nap');
check('losing shows friendly nap screen with retry', await page.$('.result-card.nap') && await page.$('.round-btn.again.pulse'));

// ---------- letter challenge screenshot ----------
await tap('.round-btn.again');
await waitPhase('choose');
await page.evaluate(() => { window.__TBB_FORCE__ = { reading: 'starts' }; const b = window.__tbb.app.battle; b.state.hero.energy = 3; b.hud.setEnergy(3); });
await tap('.move-special');
await page.waitForSelector('.challenge.in .opt-letter', { visible: true });
await sleep(900);
await shot('14-reading-challenge');
check('special asks a reading question', (await page.evaluate(() => window.__tbb.app.battle.currentChallenge.kind)) === 'starts');
await answerChallenge();
await waitPhase('choose', 30000);

// ---------- every challenge type renders ----------
const kinds = [['math', 'add'], ['math', 'sub'], ['math', 'compare'], ['math', 'pattern'], ['math', 'numeral'], ['math', 'shape'], ['reading', 'rhyme'], ['reading', 'word'], ['reading', 'letter']];
for (const [domain, kind] of kinds) {
  await waitPhase('choose', 30000);
  await page.evaluate((domain, kind) => { window.__TBB_FORCE__ = { [domain]: kind }; const b = window.__tbb.app.battle; b.state.hero.energy = 3; b.hud.setEnergy(3); for (const k of ['hero', 'foe']) { b.state[k].hp = b.state[k].maxHp; b.hud.setHP(k, b.state[k].hp, b.state[k].maxHp, true); } }, domain, kind);
  await tap(domain === 'math' ? '.move-power' : '.move-special');
  await page.waitForSelector('.challenge.in .opt', { visible: true });
  await sleep(800);
  await shot(`17-${kind}`);
  const ok = await page.evaluate(() => { const ch = window.__tbb.app.battle.currentChallenge; return !!document.querySelector(`.challenge .ch-${ch.kind}`) && document.querySelectorAll('.challenge .opt').length === 3; });
  check(`${kind} challenge renders`, ok);
  await answerChallenge();
}

// ---------- learning off: moves fire straight away ----------
await waitPhase('choose', 30000);
await page.evaluate(() => { const a = window.__tbb.app; a.save.data.settings.learning = false; a.applySettings(); });
await tap('.move-power');
await sleep(500);
check('learning off: no question, the move just happens', !(await page.$('.challenge')) && (await phase()) !== 'challenge');
await page.evaluate(() => { const a = window.__tbb.app; a.save.data.settings.learning = true; a.applySettings(); });

// ---------- pause / home ----------
await waitPhase('choose', 30000);
await tap('.pause-btn', { wait: 300 });
await shot('15-pause');
await tap('.overlay.pause .round-btn.home', { wait: 800 });
check('home from pause returns to title', await page.$('.title-screen'));

// ---------- story / tournament / gallery ----------
await page.evaluate(() => { const a = window.__tbb.app; a.save.data.battle = null; a.save.save(); a.goTitle(); });
await sleep(600);
await tap('.big-play', { wait: 700 });
await tap('.mode-story', { wait: 600 });
await tap('.pick-card:nth-child(1)', { wait: 500 });
await tap('.go-btn', { wait: 600 });
await shot('18-story-map');
check('story map: seven stops, the last a giant', (await page.$$('.ladder-node')).length === 7 && (await page.$$('.ladder-node.boss')).length === 1);
await tap('.ladder-screen .go-btn');
check('story battle starts on the first foe\'s home turf', await waitPhase('choose', 20000) && (await page.evaluate(() => { const a = window.__tbb.app; return a.stage.arenaId === a.save.data.run.path[0].arenaId && a.battle.state.inRun; })));
await shot('19-story-battle');
await page.evaluate(() => { const a = window.__tbb.app; a.save.data.settings.learning = false; const b = a.battle; b.state.foe.hp = 1; b.hud.setHP('foe', 1, b.state.foe.maxHp, true); });
await tap('.move-power');
await page.waitForSelector('.overlay.result', { timeout: 30000 });
await page.evaluate(() => { window.__tbb.app.save.data.settings.learning = true; });
await sleep(1500);
check('story win offers NEXT and saves progress', (await page.$('.round-btn.again.pulse')) && (await page.evaluate(() => window.__tbb.app.save.data.run.step === 1)));
await tap('.round-btn.again', { wait: 600 });
check('next goes back to the map with one stop done', (await page.$$('.ladder-node.done')).length === 1);
// a giant: jump to the last stop
await page.evaluate(() => { const a = window.__tbb.app; a.save.data.run.step = a.save.data.run.path.length - 1; a.showRunMap(); });
await tap('.ladder-screen .go-btn');
await waitPhase('choose', 20000);
check('the last story foe is a giant', await page.evaluate(() => { const b = window.__tbb.app.battle; return b.state.boss && b.stage.fighters.foe.big > 1 && b.state.foe.maxHp > b.chars[b.state.foeId].maxHp; }));
await shot('20-giant');
await tap('.pause-btn', { wait: 300 });
await tap('.overlay.pause .round-btn.home', { wait: 800 });
check('play resumes the paused giant fight', await page.$('.big-play.resume'));
await page.evaluate(() => { const a = window.__tbb.app; a.save.data.battle = null; a.save.save(); a.goTitle(); });
await sleep(600);
await tap('.big-play', { wait: 700 });
await tap('.mode-gallery', { wait: 900 });
await shot('21-gallery');
check('gallery shows a toy with its four moves', (await page.$$('.gal-moves .act')).length === 4 && (await page.evaluate(() => !!window.__tbb.app.stage.fighters.hero)));
await tap('.gal-arrow.right', { wait: 600 });
await tap('.gal-moves .move-special', { wait: 2600 });
await shot('22-gallery-special');
await tap('.home-btn', { wait: 600 });
check('home from the gallery returns to modes', !!(await page.$('.modes-screen')) && (await page.evaluate(() => !window.__tbb.app.stage.showcase)));
await tap('.home-btn', { wait: 600 });

// ---------- mute ----------
const muted = await page.evaluate(() => {
  const a = window.__tbb.app.audio;
  const s = window.__tbb.app.save.data.settings;
  s.sfx = 0; s.music = 0; window.__tbb.app.applySettings();
  return a.sfxBus.gain.value <= 0.05 || a.sfxVol === 0;
});
check('mute sets volumes to zero', muted);

// ---------- parent gate ----------
const gear = await (await page.$('.gear')).boundingBox();
await page.touchscreen.tap(gear.x + 20, gear.y + 20);
await sleep(300);
check('quick tap on gear does NOT open parent panel', !(await page.$('.overlay.parent')));
await page.evaluate(() => window.__tbb.app.openParent());
await sleep(300);
await shot('16-parent');
check('parent panel opens', await page.$('.overlay.parent'));

// ---------- learning report + preview ----------
const logLen = await page.evaluate(() => window.__tbb.app.save.data.learning.log.length);
check('every question was logged for the report', logLen >= 10, `log ${logLen}`);
await page.evaluate(() => document.querySelector('.rp-open').scrollIntoView());
await tap('.rp-open', { wait: 500 });
check('learning report opens with real numbers', await page.evaluate(() => {
  const rows = [...document.querySelectorAll('.overlay.report .rp-table tbody tr')];
  const counting = rows.find((r) => r.cells[0].textContent.startsWith('Counting'));
  return rows.length === 11 && counting && +counting.cells[1].textContent > 0;
}));
check('report lists the misses with what he tapped first', await page.evaluate(() => [...document.querySelectorAll('.rp-misses li')].some((li) => /tapped .* before the right one/.test(li.textContent))));
await shot('23-learning-report');
await page.evaluate(() => { const c = document.querySelector('.rp-card'); c.scrollTop = c.scrollHeight; });
await sleep(200);
await shot('23b-learning-report-bottom');
await page.evaluate(() => { const r = [...document.querySelectorAll('.rp-table tbody tr')].find((x) => x.cells[0].textContent.startsWith('Rhymes')); r.querySelector('input').click(); });
await sleep(200);
check('unticking a type switches it off', await page.evaluate(() => window.__tbb.app.save.data.settings.offKinds.includes('rhyme') && !!document.querySelector('.rp-table tr.off')));
await page.evaluate(() => { const r = [...document.querySelectorAll('.rp-table tbody tr')].find((x) => x.cells[0].textContent.startsWith('Rhymes')); r.querySelector('input').click(); });
await page.evaluate(() => document.querySelector('.rp-card').scrollTop = 0);
await page.evaluate(() => [...document.querySelectorAll('.rp-top .pbtn')].find((b) => b.textContent === 'Copy as text').click());
await sleep(300);
check('report copies as text', await page.evaluate(() => /TwinForge learning report/.test(document.querySelector('.overlay.textbox textarea')?.value || '')));
await page.evaluate(() => document.querySelector('.overlay.textbox .pbtn.primary').click());
await page.evaluate(() => [...document.querySelectorAll('.rp-top .pbtn')].find((b) => b.textContent === 'Preview questions').click());
await page.waitForSelector('.overlay.preview .challenge.in .opt', { visible: true, timeout: 5000 }).catch(() => {});
await sleep(800);
await shot('24-preview-mix');
check('preview shows a real question card', (await page.$$('.overlay.preview .opt')).length === 3);
await page.select('.pv-bar select:nth-of-type(1)', 'math');
await page.select('.pv-bar select:nth-of-type(2)', 'sub');
await sleep(900);
check('preview can force a type', await page.evaluate(() => document.querySelector('.overlay.preview').dataset.kind === 'sub' && !!document.querySelector('.overlay.preview .ch-sub')));
await shot('25-preview-sub');
const before = await page.evaluate(() => window.__tbb.app.save.data.learning.log.length);
const right = await page.evaluate(() => {
  const opts = [...document.querySelectorAll('.overlay.preview .opt')];
  const card = document.querySelector('.overlay.preview .ch-sub');
  const crossed = card.querySelectorAll('.cnt-item.crossed').length;
  const total = card.querySelectorAll('.cnt-item').length;
  return String(total - crossed);
});
await tap(`.overlay.preview .opt[data-value="${right}"]`, { wait: 1300 });
check('preview answers are not recorded', (await page.evaluate(() => window.__tbb.app.save.data.learning.log.length)) === before);
await page.evaluate(() => document.querySelector('.pv-bar .pbtn.primary').click());
await sleep(200);
check('closing preview goes back to the report', !(await page.$('.overlay.preview')) && !!(await page.$('.overlay.report')));

// ---------- perf sample (headless Chromium, not iPhone) ----------
const fps = await page.evaluate(() => window.__tbb.app.stage.fps);
console.log('headless fps sample', JSON.stringify(fps));

check('no page errors', errors.length === 0, errors.slice(0, 5).join(' | '));
await browser.close();
server.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
