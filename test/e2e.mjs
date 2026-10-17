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
page.on('pageerror', (e) => { errors.push(e.message); if (process.env.SHOW_ERRORS) console.log('PAGEERROR', e.message, e.stack); });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); else if (m.text().startsWith('[twinforge]')) console.log('NOTE', m.text()); });

// Headless Chromium renders the 3D stage in software. On a busy machine it can
// drop to 2–5 frames a second, and two things follow:
//  - CSS slide-ins only move when a frame is drawn, so sampling a button's box on
//    the wall clock can see a still-offscreen button as "settled";
//  - the game clock is capped at 50 ms a frame (render/stage.js), so turns take
//    several times longer than wall-clock timeouts expect.
// So taps wait across real frames until the finger point lands on the target, and
// waits count game time as well as wall time (with a hard wall-clock cap).
const frame = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
const gameNow = () => page.evaluate(() => window.__tbb?.app?.stage?.clock?.time ?? 0);
async function within(ms, test, { poll = 60, cap = 10 } = {}) {
  const w0 = Date.now(), g0 = await gameNow();
  for (;;) {
    const v = await test();
    if (v) return v;
    const wall = Date.now() - w0;
    if (wall > ms * cap || (wall > ms && (await gameNow()) - g0 > ms)) return null;
    if (poll) await sleep(poll);
  }
}
async function tap(sel, { wait = 0 } = {}) {
  let el = await page.waitForSelector(sel, { visible: true, timeout: 15000 });
  // the target must hold still between two drawn frames (pulsing/wiggling buttons
  // move a little; slide-ins move a lot) and the tap point must really hit it
  let last = null, at = null;
  const ok = await within(15000, async () => {
    await frame();
    let r = await el.evaluate((n) => {
      if (!n.isConnected) return 'gone';
      const b = n.getBoundingClientRect();
      const x = b.x + b.width / 2, y = b.y + b.height / 2;
      const hitEl = document.elementFromPoint(x, y);
      return { x, y, size: Math.min(b.width, b.height), hit: !!hitEl && n.contains(hitEl), at: hitEl ? `${hitEl.tagName}.${hitEl.getAttribute('class') || ''}` : null };
    });
    if (r === 'gone') { el = await page.waitForSelector(sel, { visible: true, timeout: 15000 }); r = null; }
    const still = r && last && Math.hypot(r.x - last.x, r.y - last.y) < Math.max(1, r.size * 0.1);
    last = r;
    return still && r.hit ? (at = r) : null;
  }, { poll: 0 });
  if (!ok) throw new Error(`tap: ${sel} never settled under the finger (${JSON.stringify(last)})`);
  await page.touchscreen.tap(at.x, at.y);
  if (wait) await sleep(wait);
}
const phase = () => page.evaluate(() => window.__tbb.phase);
async function waitPhase(p, timeout = 20000) {
  const want = [].concat(p);
  return !!(await within(timeout, async () => want.includes(await phase())));
}
const waitSel = async (sel, timeout) => {
  if (!(await within(timeout, () => page.$(sel)))) throw new Error(`waiting for ${sel} failed (${timeout} ms of game and wall time)`);
};
const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png` });
// ChallengeUI ignores answer taps for the first 800 ms a card is up (taps that
// started on the move button); the card is only visible after that clock starts.
const ANSWER_LOCK = 900;
async function answerChallenge({ wrong = 0 } = {}) {
  await page.waitForSelector('.challenge.in .opt', { visible: true });
  await sleep(ANSWER_LOCK);
  const info = await page.evaluate(() => {
    const ch = window.__tbb.app.battle.currentChallenge;
    const opts = [...document.querySelectorAll('.opt')].map((o) => o.dataset.value);
    return { opts, answer: String(ch.answer), kind: ch.kind, steps: ch.steps ? ch.steps.map((s) => String(s.answer)) : null };
  });
  const first = info.steps ? info.steps[0] : info.answer;
  const wrongs = info.opts.filter((o) => o !== first);
  for (let i = 0; i < wrong; i++) {
    await tap(`.opt[data-value="${wrongs[i]}"]`);
    await sleep(1400);
  }
  // spelling is answered one letter at a time
  for (const a of info.steps || [info.answer]) {
    await page.waitForSelector(`.challenge.in .opt[data-value="${a}"]:not(.gone):not(.right)`, { visible: true, timeout: 5000 });
    await tap(`.opt[data-value="${a}"]:not(.gone):not(.right)`);
    if (info.steps) await sleep(500);
  }
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
await tap('.profile-card.active', { wait: 700 });
check('audio unlocked by first tap', await page.evaluate(() => window.__tbb.app.audio.ctx && window.__tbb.app.audio.ctx.state), await page.evaluate(() => window.__tbb.app.audio.ctx?.state));
await shot('02a-modes');
check('four modes to pick', (await page.$$('.mode-card')).length === 4);
await tap('.mode-arcade', { wait: 600 });
await shot('02-select');
const cards = await page.$$('.pick-card');
check('twelve characters to pick', cards.length === 12);
await tap(`.pick-card:nth-child(${process.env.HERO || 2})`, { wait: 500 });
await shot('03-selected');
await tap('.go-btn', { wait: 300 });
await sleep(500);
await shot('03a-opponent');
check('arcade: pick the opponent from the other eleven or SURPRISE', (await page.$$('.pick-card')).length === 12 && !!(await page.$('.pick-card.surprise')));
await tap('.pick-card:nth-child(1)', { wait: 400 });
await tap('.go-btn', { wait: 300 });
await shot('03b-arenas');
{ // every arena (the original five, the new four's homes) plus SURPRISE; was a fixed 6 before the new arenas landed
  const names = await page.$$eval('.arena-card', (els) => els.map((e) => e.getAttribute('aria-label')));
  const want = ['Bedroom Block Fortress', 'Castle Courtyard', 'Fishing Pier', 'Haunted Forest', 'Bog Shack', 'Skull Cove', 'Midnight Pumpkin Patch', "Grandma's Woods", 'Star Fortress Bridge', 'Surprise me'];
  check('arena pick shows every arena and surprise', want.every((n) => names.includes(n)) && names.length === want.length, JSON.stringify(names));
}
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

// rapid repeated taps: only one challenge, and the hammering answers nothing (the
// card's right-hand answer sits where the power button was). The six taps go out
// back to back without waiting for each to be handled, so they stay a fast burst
// even when the machine is busy (awaited taps can end up a second apart).
const atk = await (await page.$('.move-power')).boundingBox();
const cdp = await page.createCDPSession();
const pt = { x: Math.round(atk.x + atk.width / 2), y: Math.round(atk.y + atk.height / 2), radiusX: 0.5, radiusY: 0.5, force: 0.5 };
await Promise.all(Array.from({ length: 6 }, (_, id) => ['touchStart', 'touchEnd'].map((type) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: [{ ...pt, id }] }))).flat());
await cdp.detach();
await sleep(500);
check('six fast taps open exactly one challenge', (await page.$$('.challenge')).length === 1);
await shot('06-count-challenge');

// wrong -> hint, wrong -> support, then correct
await page.waitForSelector('.challenge.in .opt', { visible: true });
await sleep(ANSWER_LOCK);
check('hammering the move button did not answer the question', await page.evaluate(() => window.__tbb.phase === 'challenge' && document.querySelectorAll('.challenge .opt').length === 3 && !document.querySelector('.challenge .opt.gone, .challenge .opt.right, .challenge .opt.nope')));
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
await tap('.profile-card.active');
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
  await waitPhase(['choose', 'end'], 25000);
}
check('used a special', specials > 0, `specials=${specials}`);
check('saw enemy telegraph and answered it (defend or special)', sawCharge && defends + specials > 0, `defends=${defends}`);
const endState = await page.evaluate(() => window.__tbb.app.battle.state);
check('battle won', endState.result === 'win', `hero ${endState.hero.hp}/${endState.hero.maxHp}`);
await waitSel('.overlay.result', 15000);
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
await waitSel('.overlay.result', 30000);
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
const kinds = [['math', 'add'], ['math', 'sub'], ['math', 'compare'], ['math', 'pattern'], ['math', 'numeral'], ['math', 'shape'],
  ['math', 'flash'], ['math', 'story'], ['math', 'oneMore'], ['math', 'seq'], ['math', 'bigger'], ['math', 'teen'],
  ['reading', 'rhyme'], ['reading', 'word'], ['reading', 'letter'], ['reading', 'pickStart'], ['reading', 'ends'], ['reading', 'missing'], ['reading', 'sight'], ['reading', 'spell']];
for (const [domain, kind] of kinds) {
  if (!(await waitPhase('choose', 30000))) throw new Error(`no player turn before the ${kind} question (phase ${await phase()})`);
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
await tap('.profile-card.active', { wait: 700 });
await tap('.mode-tournament', { wait: 600 });
await tap('.pick-card:nth-child(1)', { wait: 500 });
await tap('.go-btn', { wait: 600 });
await shot('18-story-map');
check('tournament map: seven stops, the last a giant', (await page.$$('.ladder-node')).length === 7 && (await page.$$('.ladder-node.boss')).length === 1);
await tap('.ladder-screen .go-btn');
check('tournament battle starts on the first foe\'s home turf', await waitPhase('choose', 20000) && (await page.evaluate(() => { const a = window.__tbb.app; return a.stage.arenaId === a.save.data.runs.tournament.path[0].arenaId && a.battle.state.from === 'run'; })));
await shot('19-story-battle');
await page.evaluate(() => { const a = window.__tbb.app; a.save.data.settings.learning = false; const b = a.battle; b.state.foe.hp = 1; b.hud.setHP('foe', 1, b.state.foe.maxHp, true); });
await tap('.move-power');
await waitSel('.overlay.result', 30000);
await page.evaluate(() => { window.__tbb.app.save.data.settings.learning = true; });
await sleep(1500);
check('tournament win offers NEXT and saves progress', (await page.$('.round-btn.again.pulse')) && (await page.evaluate(() => window.__tbb.app.save.data.runs.tournament.step === 1)));
await tap('.round-btn.again', { wait: 600 });
check('next goes back to the map with one stop done', (await page.$$('.ladder-node.done')).length === 1);
// a giant: jump to the last stop
await page.evaluate(() => { const a = window.__tbb.app; a.save.data.runs.tournament.step = a.save.data.runs.tournament.path.length - 1; a.showRunMap(); });
await tap('.ladder-screen .go-btn');
await waitPhase('choose', 20000);
check('the last tournament foe is a giant', await page.evaluate(() => { const b = window.__tbb.app.battle; return b.state.boss && b.stage.fighters.foe.big > 1 && b.state.foe.maxHp > b.chars[b.state.foeId].maxHp; }));
await shot('20-giant');
await tap('.pause-btn', { wait: 300 });
await tap('.overlay.pause .round-btn.home', { wait: 800 });
check('play resumes the paused giant fight', await page.$('.big-play.resume'));

// ---------- arcade beside a tournament, keyboard, safety net, lost GPU ----------
await page.evaluate(() => { const a = window.__tbb.app; a.save.data.battle = null; a.save.save(); a.goTitle(); });
await sleep(800);
await page.keyboard.press('Enter');
await sleep(700);
check('keyboard: Enter on the title asks who is playing', !!(await page.$('.profiles-screen')));
await sleep(400);
await page.keyboard.press('Enter');
await sleep(700);
check('keyboard: Enter on who is playing opens the modes', !!(await page.$('.modes-screen:not(.profiles-screen)')));
await page.keyboard.press('ArrowRight');
check('keyboard: arrows focus a mode card', await page.evaluate(() => document.activeElement.classList.contains('mode-card')));
await tap('.mode-arcade', { wait: 600 });
await tap('.pick-card:nth-child(4)', { wait: 400 });
await tap('.go-btn', { wait: 600 });
await tap('.pick-card:nth-child(1)', { wait: 400 });
await tap('.go-btn', { wait: 400 });
await tap('.arena-card:nth-child(2)', { wait: 300 });
await waitPhase('choose', 20000);
check('an arcade fight leaves the tournament in progress alone', await page.evaluate(() => {
  const a = window.__tbb.app, r = a.save.data.runs;
  return r.tournament && r.tournament.step === r.tournament.path.length - 1 && r.arcade && r.arcade.mode === 'arcade' && a.battle.state.runMode === 'arcade';
}));
await sleep(500);
await page.evaluate(() => {
  const a = window.__tbb.app; a.save.data.settings.learning = false;
  const d = a.battle.director, orig = d.attack;
  d.attack = function () { d.attack = orig; throw new Error('e2e-boom'); };
});
await page.keyboard.press('ArrowRight');
check('keyboard: arrows focus a move button', await page.evaluate(() => document.activeElement.classList.contains('move')));
await page.keyboard.press('Enter');
await sleep(400);
check('keyboard: Enter uses the focused move', await page.evaluate(() => window.__tbb.app.battle.log.includes('hero-anim')));
check('a battle step that throws is logged and the battle carries on to his next turn',
  (await waitPhase('choose', 20000)) && errors.some((e) => e.includes('e2e-boom')) && (await page.evaluate(() => window.__tbb.app.battle.log.slice(-3).includes('foe') && !document.querySelector('.actions.hidden'))));
const gpu = await page.evaluate(async () => {
  const st = window.__tbb.app.stage, ext = st.renderer.getContext().getExtension('WEBGL_lose_context');
  if (!ext) return 'no extension';
  ext.loseContext();
  await new Promise((r) => setTimeout(r, 400));
  const wasLost = st.lost;
  ext.restoreContext();
  await new Promise((r) => setTimeout(r, 800));
  return wasLost && !st.lost && !sessionStorage.getItem('tbb.no3d');
});
check('the 3D view comes back after the GPU context is lost', gpu === true, String(gpu));
await shot('20b-after-context-restore');
await page.keyboard.press('Escape');
await sleep(300);
check('keyboard: Escape pauses', !!(await page.$('.overlay.pause')));
await tap('.overlay.pause .round-btn.home', { wait: 800 });
check('pause -> home still works after a failed step', !!(await page.$('.title-screen')));
await page.evaluate(() => { window.__tbb.app.save.data.settings.learning = true; });
await page.evaluate(() => { const a = window.__tbb.app; a.save.data.battle = null; a.save.save(); a.goTitle(); });
await sleep(600);
await tap('.big-play', { wait: 700 });
await tap('.profile-card.active', { wait: 700 });

// campaign board
await tap('.mode-campaign', { wait: 600 });
await tap('.pick-card:nth-child(3)', { wait: 500 });
await tap('.go-btn', { wait: 1500 });
await shot('23-board');
const bd = await page.evaluate(() => {
  const st = window.__tbb.app.stage, b = st.board;
  return { spaces: +document.querySelector('.board-screen').dataset.spaces, is3D: !!document.querySelector('.board-3d'),
    standees: b ? b.spaces.filter((s) => s.standee).length : 0, islands: b ? b.worldX.length : 0, finalBig: b ? b.spaces.at(-1).standee.scale.x > b.spaces[1].standee.scale.x * 1.5 : false };
});
check('campaign board: a 3D island diorama, five worlds, Czernobog giant at the end', bd.is3D && bd.spaces > 25 && bd.islands === 5 && bd.standees > 15 && bd.finalBig);
// hold the auto-fight so this roll can't race the next step
await page.evaluate(() => { const a = window.__tbb.app; a._bf = a.boardFight; a.boardFight = () => { a._fought = true; }; });
await tap('.board-die', { wait: 3200 });
// the roll's auto-fight fires 650 ms after the hops end, which a slow box pushes past any fixed wait;
// so wait the roll out and keep the stub until goBoard() below has replaced this board (the stale
// timer then fails its boardView === api guard instead of starting a fight over the next step)
await within(15000, () => page.evaluate(() => !window.__tbb.app.boardView.busy));
await shot('24-board-rolled');
const after = await page.evaluate(() => window.__tbb.app.save.data.campaign);
check('rolling the die moves the token 1–3 spaces and saves', after.pos >= 1 && after.pos <= 3 && after.rolls === 1);
// stand on the first wild-creature fight and play it
await page.evaluate(() => { const a = window.__tbb.app; const c = a.save.data.campaign; c.pos = 1; c.cleared = [0]; a.goBoard(); a.boardFight = a._bf; });
await sleep(800);
{ const fb = await page.evaluate(() => ({ f: document.querySelector('.board-fight')?.className, d: document.querySelector('.board-die')?.className, n: document.querySelectorAll('.board-screen').length, c: JSON.stringify(window.__tbb.app.save.data.campaign) })); check('an unfought creature shows the FIGHT button instead of the die', fb.f === 'board-fight' && fb.d === 'board-die hidden', JSON.stringify(fb)); }
// The FIGHT tap is ignored while the board is still busy (hops/intro) or the button is hidden, and
// waitPhase() returns false silently, so a swallowed tap used to surface as a TypeError a step later.
// Wait for the new board to settle (FIGHT visible + enabled, not busy, no fight/VS already starting),
// tap, confirm the fight opened, and re-tap only if the state shows the tap did not register.
{
  let opened = false;
  for (let attempt = 0; attempt < 4 && !opened; attempt++) {
    const ready = await within(15000, () => page.evaluate(() => {
      const a = window.__tbb.app, b = document.querySelector('.board-fight');
      if (window.__tbb.phase === 'choose') return true; // an earlier tap did register, just slowly
      return !!b && !b.classList.contains('hidden') && !b.disabled && !!a.boardView && !a.boardView.busy && !a._boardFighting && !document.querySelector('.overlay.vs');
    }));
    if (!ready) throw new Error('board FIGHT button never became ready (visible, enabled, board settled)');
    if (await phase() === 'choose') { opened = true; break; }
    await tap('.board-fight');
    opened = await waitPhase('choose', attempt === 3 ? 20000 : 6000);
  }
  if (!opened) throw new Error('board FIGHT tap never opened the fight screen after 4 attempts');
}
check('the creature fight is on its world\'s arena', await page.evaluate(() => { const a = window.__tbb.app; return a.battle.state.from === 'campaign' && a.stage.arenaId === 'bedroom' && a.battle.chars[a.battle.state.foeId].minion; }));
await shot('25-minion-fight');
await page.evaluate(() => { const a = window.__tbb.app; a.save.data.settings.learning = false; const b = a.battle; b.state.foe.hp = 1; b.hud.setHP('foe', 1, b.state.foe.maxHp, true); });
await tap('.move-power');
await waitSel('.overlay.result', 30000);
await page.evaluate(() => { window.__tbb.app.save.data.settings.learning = true; });
await sleep(1500);
await tap('.round-btn.again', { wait: 1200 });
check('winning returns to the board with the space cleared', !!(await page.$('.board-screen')) && (await page.evaluate(() => window.__tbb.app.save.data.campaign.cleared.includes(1))) && (await page.evaluate(() => document.querySelector('.board-screen').dataset.cleared.split(',').includes('1') && !window.__tbb.app.stage.board.spaces[1].standee.visible)));
await shot('26-board-cleared');
await tap('.home-btn', { wait: 600 });
check('modes shows the campaign in progress', !!(await page.$('.mode-campaign .mode-badge')));
check('leaving the board drops the diorama scene', await page.evaluate(() => !window.__tbb.app.stage.board));
// races a child finds: tapping the FIST the moment it pops up after a roll (the auto-fight
// follows 650 ms later), and tapping Home while the die is still rolling onto a fight
await page.evaluate(() => {
  const a = window.__tbb.app;
  window.__rnd = Math.random; Math.random = () => 0; // the die shows 1: space 1 is a creature fight
  a._starts = 0; const sb = a.startBattle.bind(a); a.startBattle = (...x) => { a._starts++; return sb(...x); };
  const c = a.save.data.campaign; c.pos = 0; c.cleared = [0]; a.goBoard();
});
await sleep(800);
await tap('.board-die');
// The auto-fight runs 650 ms after the FIST shows, and its VS splash clears the board (FIST included).
// On a slow box that used to land between waitForSelector, page.$ and boundingBox (separate round
// trips), so the box came back null and the test crashed with a TypeError. Read the FIST's box in the
// same page call that sees it appear, and accept "the fight already started" as the other outcome.
{
  const seen = await within(8000, () => page.evaluate(() => {
    const a = window.__tbb.app, b = document.querySelector('.board-fight:not(.hidden)');
    if (a._starts > 0 || a._boardFighting || document.querySelector('.overlay.vs') || window.__tbb.phase === 'choose') return { started: true };
    if (!b || !b.isConnected || a.boardView?.busy) return null;
    const r = b.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
  }), { poll: 0 });
  if (!seen) throw new Error('board FIGHT button never popped up after the roll (and no fight started)');
  if (!seen.started) await page.touchscreen.tap(seen.x, seen.y);
  // the fight screen must really open, whichever of the tap and the auto-fight got there first
  if (!(await waitPhase('choose', 20000))) throw new Error(`board FIGHT: fight screen never opened (phase=${await phase()})`);
  await within(5000, () => page.evaluate(() => !window.__tbb.app._boardFighting));
}
await sleep(1500); // observation window: a second start would show up here
check('tapping FIGHT as it pops up starts one fight, not two', await page.evaluate(() => window.__tbb.app._starts === 1), `starts=${await page.evaluate(() => window.__tbb.app._starts)}`);
await page.evaluate(() => { const a = window.__tbb.app; a.endBattle(); a.save.data.battle = null; const c = a.save.data.campaign; c.pos = 0; c.cleared = [0]; a._starts = 0; a.goBoard(); });
await sleep(800);
await tap('.board-die');
await sleep(150);
await tap('.board-screen .home-btn');
await sleep(3000);
check('Home while the die rolls onto a fight stays home (no surprise battle)', await page.evaluate(() => window.__tbb.app._starts === 0 && !!document.querySelector('.modes-screen')));
await page.evaluate(() => { Math.random = window.__rnd; delete window.__tbb.app.startBattle; });
await tap('.home-btn', { wait: 600 });
await tap('.big-play', { wait: 700 });
await tap('.profile-card.active', { wait: 700 });
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
check('learning report opens with real numbers, all 22 question types listed', await page.evaluate(() => {
  const rows = [...document.querySelectorAll('.overlay.report .rp-table tbody tr')];
  const counting = rows.find((r) => r.cells[0].textContent.startsWith('Counting'));
  return rows.length === 22 && counting && +counting.cells[1].textContent > 0;
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

const realErrors = errors.filter((e) => !e.includes('e2e-boom'));
check('no page errors', realErrors.length === 0, realErrors.slice(0, 5).join(' | '));
await browser.close();
server.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
