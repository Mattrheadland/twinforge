// Full Campaign playthrough, start to finish, the way a child plays it: tap
// PLAY, CAMPAIGN, a hero, GO, then roll the die, tap the moves, answer the
// question cards (mostly right, sometimes wrong) through all five worlds to the
// giant final boss and the trophy. Records errors, 404s, stuck states,
// off-screen / covered buttons, sound + read-aloud coverage and timing.
//
// Usage: node test/campaign-run.mjs [hero@viewport ...]
//   viewport: iphone (874x402, touch) | desktop (1280x720, mouse only)
//   default: nightwing@iphone roo@iphone tree@desktop
//   env: OUT=scratch/campaign  NO_BUILD=1  SEED=<n>  EAGER=0..1 (chance a child taps FIGHT
//        before the auto-fight starts)  LOSE_ONCE=0 (skip the forced loss)
//
// Every input is a real touch tap / mouse click on the element's center.
// Internal reads (never writes, except where marked UNAVOIDABLE):
//  - the right answer of the question on screen (battle.currentChallenge): a child
//    knows it, a bot has to read it
//  - board.busy and window.__tbb.phase to know when an animation has finished
//  - UNAVOIDABLE write: one battle per run sets the hero's HP to 1 so the retry
//    (NAP TIME -> play again) flow gets exercised; a child mostly wins.
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { buildBoard, WORLDS } from '../src/game/campaign.js';
import { CHARACTERS } from '../src/data/characters.js';

const OUT = process.env.OUT || 'scratch/campaign';
const RUNS = (process.argv.slice(2).length ? process.argv.slice(2) : ['nightwing@iphone', 'roo@iphone', 'tree@desktop'])
  .map((s) => { const [hero, vp = 'iphone'] = s.split('@'); return { hero, vp }; });
const EAGER = process.env.EAGER != null ? +process.env.EAGER : 0.35;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const VIEWPORTS = {
  iphone: { width: 874, height: 402, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: true },
  desktop: { width: 1280, height: 720, deviceScaleFactor: 1, isMobile: false, hasTouch: false, isLandscape: true },
};
const IGNORE_CONSOLE = /GPU stall due to ReadPixels|GL_CLOSE_PATH_NV|Automatic fallback to software WebGL|WebGL.*performance warning/i;

if (!process.env.NO_BUILD) execSync('node build.mjs', { stdio: 'inherit' });
const root = path.resolve('dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.glb': 'model/gltf-binary' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(0);
const URL0 = `http://localhost:${server.address().port}/`;

// small seeded rng so runs are repeatable
function rngFor(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const hash = (str) => [...str].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

// ---------------- page instrumentation (installed before the game loads) ----------------
function instrument() {
  window.__TBB_TEST__ = true;
  const R = (window.__run = { sfx: [], music: [], speak: [], nodes: 0, nodesRunning: 0, phases: [], downs: [] });
  // when each finger / mouse press actually reaches the page (taps are matched to sounds by this)
  addEventListener('pointerdown', () => R.downs.push(performance.now()), true);
  // raw Web Audio: every oscillator / buffer source the game creates
  const AC = window.AudioContext || window.webkitAudioContext;
  if (AC) {
    for (const m of ['createOscillator', 'createBufferSource']) {
      const orig = AC.prototype[m];
      AC.prototype[m] = function (...a) { R.nodes++; if (this.state === 'running') R.nodesRunning++; return orig.apply(this, a); };
    }
  }
  // read-aloud
  if (window.speechSynthesis) {
    const orig = window.speechSynthesis.speak.bind(window.speechSynthesis);
    window.speechSynthesis.speak = (u) => { R.speak.push({ text: u && u.text, t: performance.now() }); try { return orig(u); } catch (e) { R.speakErr = String(e); } };
  }
}

// game-level hooks once the app exists
async function hookApp(page) {
  await page.waitForFunction(() => window.__tbb && window.__tbb.app, { timeout: 20000 });
  await page.evaluate(() => {
    const R = window.__run;
    const a = window.__tbb.app;
    const au = a.audio;
    const where = () => {
      const b = a.battle;
      return b && b.phase !== 'gone' ? 'battle:' + b.phase : document.querySelector('.board-screen') ? 'board' : document.querySelector('.overlay.result') ? 'result' : 'menu';
    };
    const sfx = au.sfx.bind(au);
    au.sfx = (name, arg) => { R.sfx.push({ name, audible: !!(au.ready && au.sfxVol > 0), t: performance.now(), where: where() }); return sfx(name, arg); };
    const play = au.play.bind(au);
    au.play = (name) => { R.music.push({ name, unlocked: !!(au.ctx && au.unlocked), state: au.ctx && au.ctx.state, t: performance.now() }); return play(name); };
    // phase log with the game clock (game ms == real ms on a 60 fps phone)
    let phase = window.__tbb.phase;
    let n = 0;
    Object.defineProperty(window.__tbb, 'phase', {
      get: () => phase,
      set: (p) => {
        phase = p;
        if (p === 'intro') n++;
        R.phases.push({ p, n, t: performance.now(), g: a.stage.clock.time });
      },
    });
  });
}

// ---------------- one campaign ----------------
async function runCampaign(browser, { hero, vp }) {
  const name = `${hero}-${vp}`;
  const dir = path.join(OUT, name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const rnd = rngFor(process.env.SEED ? +process.env.SEED : hash(name));
  const touch = vp === 'iphone';
  const VW = VIEWPORTS[vp].width, VHt = VIEWPORTS[vp].height;
  const board = buildBoard(hero);
  const t0 = Date.now();
  const R = {
    name, hero, viewport: vp, pass: false, errors: [], warnings: [], http404: [], stuck: [], layout: [], tapMisses: [],
    battles: [], rolls: [], notes: [], shots: [], challengeNeverAppeared: [], doubleStart: [], taps: [], fps: [],
  };
  const log = (...a) => console.log(`[${name} ${((Date.now() - t0) / 1000).toFixed(0)}s]`, ...a);
  const page = await browser.newPage();
  await page.setViewport(VIEWPORTS[vp]);
  await page.evaluateOnNewDocument(instrument);
  page.on('pageerror', (e) => { R.errors.push({ at: (Date.now() - t0) / 1000, msg: e.message, stack: (e.stack || '').split('\n').slice(0, 4).join(' | ') }); log('PAGEERROR', e.message); });
  page.on('console', (m) => {
    const ty = m.type();
    if ((ty === 'error' || ty === 'warn' || ty === 'warning') && !IGNORE_CONSOLE.test(m.text())) {
      (ty === 'error' ? R.errors : R.warnings).push({ at: (Date.now() - t0) / 1000, msg: m.text().slice(0, 300) });
      log('console.' + ty, m.text().slice(0, 200));
    }
  });
  page.on('response', (r) => { if (r.status() >= 400) R.http404.push(`${r.status()} ${r.url().replace(URL0, '/')}`); });
  page.on('requestfailed', (r) => R.http404.push(`failed ${r.url().replace(URL0, '/')} ${r.failure()?.errorText}`));

  const shot = async (n) => {
    const f = path.join(dir, `${String(R.shots.length).padStart(2, '0')}-${n}.png`);
    await page.screenshot({ path: f });
    R.shots.push(f);
  };

  // layout audit: every visible button is fully on screen and nothing covers its center
  const seenLayout = new Set();
  const audit = async (label) => {
    const issues = await page.evaluate((VW, VH) => {
      const out = [];
      const desc = (n) => n ? n.tagName.toLowerCase() + (n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\s+/).join('.') : '') : 'nothing';
      for (const b of document.querySelectorAll('#ui button')) {
        const cs = getComputedStyle(b);
        if (b.closest('.hidden') || cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.05 || cs.pointerEvents === 'none') continue;
        const r = b.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        if (r.left < -1 || r.top < -1 || r.right > VW + 1 || r.bottom > VH + 1) out.push({ kind: 'offscreen', el: desc(b), rect: [r.left, r.top, r.right, r.bottom].map(Math.round) });
        const cx = Math.min(VW - 1, Math.max(0, r.left + r.width / 2)), cy = Math.min(VH - 1, Math.max(0, r.top + r.height / 2));
        const hit = document.elementFromPoint(cx, cy);
        const modal = document.querySelector('.challenge.in, .overlay.vs');
        if (modal && !modal.contains(b)) continue; // under a modal card on purpose
        if (hit && hit !== b && !b.contains(hit)) out.push({ kind: 'covered', el: desc(b), by: desc(hit), at: [cx, cy].map(Math.round) });
        if (r.width < 40 || r.height < 40) out.push({ kind: 'small-target', el: desc(b), size: [r.width, r.height].map(Math.round) });
      }
      return out;
    }, VW, VHt);
    for (const i of issues) {
      const key = label + '|' + i.kind + '|' + i.el + '|' + (i.by || '');
      if (seenLayout.has(key)) continue;
      seenLayout.add(key);
      R.layout.push({ screen: label, ...i });
      log('LAYOUT', label, JSON.stringify(i));
    }
  };

  // tap like a finger (or click like a mouse) on the element's center, once it stops moving
  const tap = async (sel, { timeout = 15000, label = sel, fast = false } = {}) => {
    const el = await page.waitForSelector(sel, { visible: true, timeout });
    let b = await el.boundingBox();
    for (let i = 0; i < (fast ? 0 : 20); i++) {
      await sleep(50);
      const nb = await el.boundingBox();
      if (nb && b && Math.abs(nb.x - b.x) < 0.5 && Math.abs(nb.y - b.y) < 0.5 && Math.abs(nb.width - b.width) < 0.5) { b = nb; break; }
      b = nb;
    }
    // still sliding in from off-screen? a child waits for it
    const inView = (bb) => bb && bb.x >= -1 && bb.y >= -1 && bb.x + bb.width <= VW + 1 && bb.y + bb.height <= VHt + 1;
    if (b && !inView(b)) {
      const tw = Date.now();
      while (Date.now() - tw < 6000 && !inView(b)) { await sleep(100); b = await el.boundingBox(); }
      if (Date.now() - tw > 1500) R.notes.push(`${label} took ${Date.now() - tw} ms to slide on screen`);
      await sleep(150);
      b = await el.boundingBox();
    }
    if (!b) throw new Error('no box for ' + sel);
    // tap the visible part
    const x0 = Math.max(0, b.x), y0 = Math.max(0, b.y), x1 = Math.min(VW, b.x + b.width), y1 = Math.min(VHt, b.y + b.height);
    if (x1 <= x0 || y1 <= y0) { R.tapMisses.push({ sel: label, why: 'entirely off-screen', box: b }); throw new Error('off-screen ' + sel); }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const hit = await el.evaluate((n, x, y) => { const t = document.elementFromPoint(x, y); return !t ? 'nothing' : t === n || n.contains(t) ? null : t.tagName.toLowerCase() + '.' + String(t.className).trim().replace(/\s+/g, '.'); }, cx, cy);
    if (hit) { R.tapMisses.push({ sel: label, why: 'covered by ' + hit }); log('TAP COVERED', label, hit); }
    const pt = await page.evaluate(() => performance.now());
    R.taps.push({ label, t: pt });
    if (touch) await page.touchscreen.tap(cx, cy);
    else await page.mouse.click(cx, cy);
  };

  const S = () => page.evaluate(() => {
    const a = window.__tbb.app;
    const q = (s) => { const n = document.querySelector(s); return !!n && !n.closest('.hidden') && n.getClientRects().length > 0; };
    const b = a.battle;
    const c = a.save.data.campaign;
    return {
      phase: window.__tbb.phase, battle: !!b && b.phase !== 'gone',
      vs: q('.overlay.vs'), result: q('.overlay.result'), trophy: q('.overlay.result.trophy'), nap: q('.result-card.nap'), win: q('.result-card.win'),
      board: q('.board-screen'), die: q('.board-die'), fight: q('.board-fight'), busy: a.boardView ? a.boardView.busy : null,
      modes: q('.modes-screen'), title: q('.title-screen'), select: q('.select-screen'), challenge: q('.challenge.in'), opts: document.querySelectorAll('.challenge.in .opt').length,
      camp: c ? { pos: c.pos, rolls: c.rolls, cleared: c.cleared.length, stars: c.stars, done: c.done } : null,
      bs: b ? { hero: b.state.hero.hp, heroMax: b.state.hero.maxHp, foe: b.state.foe.hp, foeMax: b.state.foe.maxHp, energy: b.state.hero.energy, charged: b.state.foe.charged, last: b.state.hero.lastSlot, foeId: b.state.foeId, arena: b.state.arenaId, boss: b.state.boss, at: b.state.at, result: b.state.result } : null,
      stageArena: a.stage.arenaId, ctx: a.audio.ctx ? a.audio.ctx.state : 'none', fps: a.stage.fps.value,
    };
  });

  // stuck watchdog: any visible change resets it
  let lastSig = '', lastChange = Date.now();
  const watch = (s) => {
    const sig = JSON.stringify([s.phase, s.vs, s.result, s.trophy, s.board, s.die, s.fight, s.busy, s.camp, s.bs && [s.bs.hero, s.bs.foe, s.bs.energy], s.challenge, s.opts]);
    if (sig !== lastSig) { lastSig = sig; lastChange = Date.now(); return false; }
    return Date.now() - lastChange > 20000;
  };

  try {
    // ---------- title -> modes -> hero -> board ----------
    await page.goto(URL0, { waitUntil: 'load' });
    await hookApp(page);
    await page.waitForSelector('.title-screen .big-play', { timeout: 20000 });
    await sleep(1800);
    await audit('title');
    await shot('title');
    await tap('.big-play');
    await page.waitForSelector('.mode-campaign', { visible: true });
    await sleep(900);
    await audit('modes');
    await tap('.mode-campaign');
    await page.waitForSelector('.select-screen .pick-card', { visible: true });
    await sleep(1400);
    await audit('select');
    const idx = await page.$$eval('.pick-card', (cs, n) => cs.findIndex((c) => c.getAttribute('aria-label') === n), CHARACTERS[hero].name);
    if (idx < 0) throw new Error('hero card not found: ' + hero);
    await tap(`.pick-card:nth-child(${idx + 1})`);
    await sleep(600);
    await shot('select');
    await tap('.go-btn');

    // ---------- the game loop ----------
    let cur = null; // current battle record
    let lastBattleN = 0;
    const worldBoardShot = new Set(), worldFightShot = new Set();
    let forcedLoss = process.env.LOSE_ONCE === '0';
    let sawMath = false, sawRead = false;
    let lastPos = -1;
    const deadline = Date.now() + 90 * 60 * 1000;
    while (Date.now() < deadline) {
      const s = await S();
      if (watch(s)) {
        R.stuck.push({ at: (Date.now() - t0) / 1000, state: s });
        log('STUCK >20s', JSON.stringify(s));
        await shot('STUCK');
        if (R.stuck.length > 2) throw new Error('stuck');
        lastChange = Date.now();
      }

      // ----- ending -----
      if (s.trophy) {
        await sleep(2500);
        await audit('trophy');
        await shot('ending-trophy');
        R.endedAt = (Date.now() - t0) / 1000;
        await tap('.overlay.result.trophy .round-btn.again');
        await page.waitForSelector('.modes-screen', { visible: true, timeout: 10000 });
        await sleep(800);
        await shot('after-trophy-modes');
        const after = await page.evaluate(() => ({ camp: window.__tbb.app.save.data.campaign, rec: window.__tbb.app.save.data.records }));
        R.after = after;
        R.pass = !after.camp && R.battles.length > 0 && R.battles.at(-1).final && R.battles.at(-1).result === 'win';
        break;
      }

      // ----- battle result -----
      if (s.result) {
        await sleep(s.win ? 2600 : 1800); // stars fill in; a child watches
        const label = s.win ? 'result-win' : 'result-nap';
        await audit(label);
        if (cur) {
          cur.result = s.win ? 'win' : 'lose';
          cur.wallMs = Date.now() - cur.wall0;
          cur.resultAt = Date.now();
          R.battles.push(cur);
          log(`battle ${R.battles.length}: ${cur.foeId}${cur.giant ? ' (GIANT)' : ''} @${cur.pos} w${cur.world + 1} -> ${cur.result} in ${cur.turns.length} turns, ${cur.questions} q, ${(cur.wallMs / 1000).toFixed(0)}s`);
          if (cur.final && s.win) await shot('final-win');
          else if (!s.win) await shot('nap');
          cur = null;
        }
        await tap('.overlay.result .round-btn.again');
        await sleep(400);
        continue;
      }

      if (s.vs) { await sleep(120); continue; }

      // ----- battle -----
      if (s.battle) {
        const n = await page.evaluate(() => window.__run.phases.filter((p) => p.p === 'intro').length);
        if (!cur || n !== lastBattleN) {
          if (cur && n !== lastBattleN && !cur.turns.length) {
            // a new battle replaced the one that just started (double start)
            R.doubleStart.push({ at: (Date.now() - t0) / 1000, pos: cur.pos, foeId: cur.foeId });
            log('BATTLE RESTARTED before the first turn (double start)');
          }
          lastBattleN = n;
          const sp = board[s.camp.pos];
          cur = {
            n, pos: s.camp.pos, world: sp.world, type: sp.type, foeId: s.bs.foeId, giant: !!sp.giant, final: !!sp.final,
            arena: s.bs.arena, expectArena: sp.arena, stageArena: null, turns: [], questions: 0, wrong: 0, wall0: Date.now(), retry: R.battles.some((b) => b.pos === s.camp.pos),
          };
          if (sp.foeId !== s.bs.foeId) R.notes.push(`space ${s.camp.pos}: board says ${sp.foeId}, battle has ${s.bs.foeId}`);
          if (s.bs.at !== s.camp.pos) R.notes.push(`battle.at ${s.bs.at} != campaign pos ${s.camp.pos}`);
        }
        if (s.phase !== 'choose') { await sleep(80); continue; }
        // ---- the child's turn ----
        await sleep(350);
        const st = await S();
        if (st.phase !== 'choose') continue;
        R.fps.push(st.fps);
        if (!cur.stageArena) {
          cur.stageArena = st.stageArena;
          if (st.stageArena !== cur.expectArena) R.notes.push(`wrong arena at space ${cur.pos}: ${st.stageArena} (expected ${cur.expectArena})`);
          await audit('battle');
          const tag = `w${cur.world + 1}`;
          if (cur.type === 'boss') await shot(`${tag}-boss-${cur.foeId}${cur.giant ? '-giant' : ''}${cur.final ? '-FINAL' : ''}`);
          else if (!worldFightShot.has(cur.world)) { worldFightShot.add(cur.world); await shot(`${tag}-fight-${cur.foeId}`); }
        }
        const b = st.bs;
        // UNAVOIDABLE: force one loss per run to exercise NAP TIME -> retry
        let loseMode = false;
        if (!forcedLoss && R.battles.length >= 1 && cur.type === 'fight' && !cur.retry) {
          forcedLoss = true;
          cur.forcedLoss = true;
          await page.evaluate(() => { const bt = window.__tbb.app.battle; bt.state.hero.hp = 1; bt.hud.setHP('hero', 1, bt.state.hero.maxHp, true); });
          R.notes.push(`forced hero HP to 1 at space ${cur.pos} (${cur.foeId}) to exercise the retry flow`);
        }
        if (cur.forcedLoss) loseMode = true;
        let slot;
        if (loseMode) slot = 'quick';
        else if (b.energy >= 3) slot = 'special';
        else if (b.charged && b.last !== 'guard' && rnd() < 0.8) slot = 'guard';
        else slot = rnd() < 0.78 ? 'power' : 'quick';
        const turn = { slot, g0: null };
        const ph0 = await page.evaluate(() => window.__run.phases.length);
        await tap(`.move-${slot}`, { label: 'move-' + slot });
        const tTap = Date.now();
        // a question for power (math) and special (reading)
        if (slot === 'power' || slot === 'special') {
          let appeared = false;
          const tw = Date.now();
          while (Date.now() - tw < 10000) {
            const ok = await page.evaluate(() => { const o = document.querySelectorAll('.challenge.in .opt'); return o.length > 0 && [...o].every((x) => x.getClientRects().length); });
            if (ok) { appeared = true; break; }
            await sleep(60);
          }
          if (!appeared) {
            const ctx = await S();
            R.challengeNeverAppeared.push({ at: (Date.now() - t0) / 1000, slot, battle: cur.foeId, pos: cur.pos, phase: ctx.phase, challenge: ctx.challenge, opts: ctx.opts });
            log('CHALLENGE .opt NEVER APPEARED', JSON.stringify(ctx));
            await shot('challenge-missing');
            throw new Error('challenge never appeared');
          }
          turn.qShownMs = Date.now() - tTap;
          await sleep(950); // answers pop in (taps < 800 ms are ignored by design)
          const info = await page.evaluate(() => {
            const ch = window.__tbb.app.battle.currentChallenge;
            return { kind: ch.kind, answer: String(ch.answer), steps: ch.steps ? ch.steps.map((x) => String(x.answer)) : null, opts: [...document.querySelectorAll('.challenge.in .opt')].map((o) => o.dataset.value) };
          });
          if (slot === 'power' && !sawMath) { sawMath = true; await audit('challenge-math'); await shot(`challenge-math-${info.kind}`); }
          if (slot === 'special' && !sawRead) { sawRead = true; await audit('challenge-reading'); await shot(`challenge-reading-${info.kind}`); }
          const r = rnd();
          const wrongN = r < 0.7 ? 0 : r < 0.9 ? 1 : 2;
          const first = info.steps ? info.steps[0] : info.answer;
          const wrongs = info.opts.filter((o) => o !== first);
          for (let i = 0; i < wrongN && i < wrongs.length; i++) {
            await tap(`.challenge.in .opt[data-value="${wrongs[i]}"]`, { label: 'opt-wrong' });
            await sleep(1500 + (i ? 1200 : 0));
          }
          for (const a of info.steps || [info.answer]) {
            const sel = `.challenge.in .opt[data-value="${CSS_ESC(a)}"]:not(.gone):not(.right)`;
            await page.waitForSelector(sel, { visible: true, timeout: 6000 });
            await sleep(info.steps ? 250 : 0);
            // after a wrong pick the card ignores taps while it pulses the items (150 ms each, ~3 s
            // for a level-5 count of 18): a child taps again, so does the bot, until it takes
            const el = await page.$(sel);
            for (let k = 0; k < 6; k++) {
              await tap(sel, { label: 'opt-right' });
              const took = await page.waitForFunction((n) => !n.isConnected || n.classList.contains('right') || !document.querySelector('.challenge.in'), { timeout: 1500, polling: 50 }, el).then(() => true, () => false);
              if (took) break;
            }
            if (info.steps) await sleep(450);
          }
          cur.questions++;
          cur.wrong += wrongN;
          turn.kind = info.kind;
          turn.wrong = wrongN;
          if (wrongN === 2) await shot(`second-try-support-${info.kind}`).catch(() => {});
        }
        // wait for the turn to resolve
        const tw = Date.now();
        let tapped = false;
        while (Date.now() - tw < 30000) {
          const p = await page.evaluate(() => window.__tbb.phase);
          if (p !== 'choose' && p !== 'challenge') tapped = true;
          if (tapped && (p === 'choose' || p === 'end' || p === 'gone')) break;
          await sleep(60);
        }
        if (!tapped) R.notes.push(`move ${slot} at space ${cur.pos}: no phase change after tap`);
        const phs = await page.evaluate((i) => window.__run.phases.slice(i), ph0);
        const anim0 = phs.find((x) => x.p === 'hero-anim');
        const anim1 = phs.find((x) => x.p === 'choose' || x.p === 'end');
        if (anim0 && anim1) turn.animGameMs = Math.round(anim1.g - anim0.g), turn.animWallMs = Math.round(anim1.t - anim0.t);
        cur.turns.push(turn);
        continue;
      }

      // ----- board -----
      if (s.board) {
        if (s.busy) { await sleep(100); continue; }
        const wi = board[s.camp.pos].world;
        if (s.fight) {
          // the space under the hero wants a fight: the auto-fight starts on its own after a roll,
          // or (coming back to the board) the child taps the fist
          await sleep(1500);
          const s2 = await S();
          if (s2.board && s2.fight && !s2.vs) await tap('.board-fight', { timeout: 2000 }).catch(() => {});
          await sleep(300);
          continue;
        }
        if (s.die) {
          await sleep(500);
          if (!worldBoardShot.has(wi)) {
            // first calm look at this world's board (not the moment a fight is about to start)
            worldBoardShot.add(wi);
            await sleep(700);
            await audit('board');
            await shot(`w${wi + 1}-board`);
          }
          const before = s.camp;
          const tr = Date.now();
          await tap('.board-die');
          // wait for the roll to finish
          let ev = null, s3;
          while (Date.now() - tr < 15000) {
            s3 = await S();
            if (s3.camp.rolls > before.rolls && s3.busy === false) break;
            await sleep(40);
          }
          const roll = { from: before.pos, to: s3.camp.pos, hops: s3.camp.pos - before.pos, wallMs: Date.now() - tr };
          const sp = board[s3.camp.pos];
          roll.landed = sp.type;
          ev = s3.fight ? 'fight' : sp.type === 'star' && s3.camp.stars > before.stars ? 'star' : sp.type === 'lucky' ? 'lucky' : null;
          roll.event = ev;
          R.rolls.push(roll);
          if (s3.camp.rolls === before.rolls) R.notes.push(`die tap at pos ${before.pos} did not roll`);
          // an eager child taps the big FIST before the auto-fight kicks in
          if (ev === 'fight' && rnd() < EAGER) {
            await sleep(200);
            roll.eagerFightTap = true;
            await tap('.board-fight', { label: 'board-fight (eager)', fast: true, timeout: 1000 }).catch(() => { roll.eagerFightTap = 'missed'; });
          }
          lastPos = s3.camp.pos;
          continue;
        }
        await sleep(100);
        continue;
      }

      if (s.modes && s.camp && !s.camp.done) { await tap('.mode-campaign'); await sleep(800); continue; }
      await sleep(100);
    }
    if (!R.endedAt) R.notes.push('did not reach the ending before the deadline');
  } catch (e) {
    R.fatal = String(e && e.stack || e).split('\n').slice(0, 3).join(' | ');
    log('FATAL', R.fatal);
    await shot('FATAL').catch(() => {});
  }
  const run = await page.evaluate(() => window.__run).catch(() => null);
  R.audio = run && { sfx: run.sfx, music: run.music, speak: run.speak, nodes: run.nodes, nodesRunning: run.nodesRunning, phases: run.phases, speakErr: run.speakErr, downs: run.downs };
  R.totalWallS = (Date.now() - t0) / 1000;
  await page.close();
  return R;
}
const CSS_ESC = (v) => String(v).replace(/["\\]/g, '\\$&');

// ---------------- summary ----------------
function summarize(R) {
  const a = R.audio || { sfx: [], music: [], speak: [] };
  const count = {};
  for (const e of a.sfx) {
    const k = e.name;
    count[k] ||= { calls: 0, audible: 0 };
    count[k].calls++;
    if (e.audible) count[k].audible++;
  }
  const tapSound = {};
  for (const tp of R.taps || []) {
    const k = tp.label.replace(/\.challenge\.in \.opt.*/, 'opt').replace(/:nth-child\(\d+\)/, '');
    tapSound[k] ||= { taps: 0, withSound: 0, sounds: {} };
    tapSound[k].taps++;
    const down = (a.downs || []).find((d) => d >= tp.t) ?? tp.t;
    const hits = a.sfx.filter((e) => e.t >= down && e.t <= down + 400);
    if (hits.length) tapSound[k].withSound++;
    for (const e of hits.slice(0, 2)) tapSound[k].sounds[e.name] = (tapSound[k].sounds[e.name] || 0) + 1;
  }
  const music = {};
  for (const m of a.music) music[m.name] = (music[m.name] || 0) + 1;
  const turns = R.battles.flatMap((b) => b.turns);
  const anim = turns.filter((t) => t.animGameMs != null).map((t) => t.animGameMs);
  const avg = (xs) => xs.length ? xs.reduce((p, c) => p + c, 0) / xs.length : 0;
  const intros = [];
  const ph = a.phases || [];
  for (let i = 0; i < ph.length; i++) if (ph[i].p === 'intro') { const c = ph.slice(i).find((x) => x.p === 'choose' && x.n === ph[i].n); if (c) intros.push(c.g - ph[i].g); }
  const ends = [];
  for (let i = 0; i < ph.length; i++) if (ph[i].p === 'end') ends.push(ph[i]);
  return {
    name: R.name, pass: R.pass && !R.fatal && R.errors.length === 0 && R.stuck.length === 0 && R.doubleStart.length === 0 && R.challengeNeverAppeared.length === 0 && R.http404.length === 0,
    battles: R.battles.length, wins: R.battles.filter((b) => b.result === 'win').length, losses: R.battles.filter((b) => b.result === 'lose').length,
    bosses: R.battles.filter((b) => b.type === 'boss' && b.result === 'win').map((b) => b.foeId + (b.giant ? '*' : '')),
    turns: turns.length, turnsPerBattle: +(turns.length / Math.max(1, R.battles.length)).toFixed(1),
    turnsPerBattleByType: { fight: +avg(R.battles.filter((b) => b.type === 'fight' && b.result === 'win').map((b) => b.turns.length)).toFixed(1), boss: +avg(R.battles.filter((b) => b.type === 'boss' && !b.final).map((b) => b.turns.length)).toFixed(1), final: R.battles.filter((b) => b.final).map((b) => b.turns.length) },
    questions: turns.filter((t) => t.kind).length, wrongTaps: turns.reduce((p, t) => p + (t.wrong || 0), 0),
    secondTries: turns.filter((t) => t.wrong === 1).length, fullSupport: turns.filter((t) => t.wrong === 2).length,
    moves: turns.reduce((o, t) => ((o[t.slot] = (o[t.slot] || 0) + 1), o), {}),
    rolls: R.rolls.length, rollAvgWallMs: Math.round(avg(R.rolls.map((r) => r.wallMs))), eagerFightTaps: R.rolls.filter((r) => r.eagerFightTap).length,
    animPerTurnGameMs: { avg: Math.round(avg(anim)), min: Math.min(...anim), max: Math.max(...anim), total: anim.reduce((p, c) => p + c, 0) },
    introGameMs: Math.round(avg(intros)),
    worlds: WORLDS.map((w, wi) => {
      const bs = R.battles.filter((b) => b.world === wi);
      const ts = bs.flatMap((b) => b.turns);
      return { world: w.arena, battles: bs.length, turns: ts.length, questions: ts.filter((t) => t.kind).length, wrong: ts.reduce((p, t) => p + (t.wrong || 0), 0), animMs: ts.reduce((p, t) => p + (t.animGameMs || 0), 0), rolls: R.rolls.filter((r) => board_world(R.hero, r.to) === wi).length };
    }),
    sfx: count, tapSound, music, speak: a.speak.length, speakSample: a.speak.slice(0, 3).map((s) => s.text), audioNodes: a.nodes, audioNodesRunning: a.nodesRunning,
    fps: { avg: Math.round(avg(R.fps)), min: Math.min(...R.fps) }, errors: R.errors, warnings: R.warnings, http404: [...new Set(R.http404)], stuck: R.stuck.length, layout: R.layout, tapMisses: R.tapMisses,
    challengeNeverAppeared: R.challengeNeverAppeared, doubleStart: R.doubleStart, notes: R.notes, fatal: R.fatal || null, totalWallS: Math.round(R.totalWallS),
  };
}
const boards = {};
function board_world(hero, pos) { return (boards[hero] ||= buildBoard(hero))[pos].world; }

// ---------------- main ----------------
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: await chromium.executablePath(), args: [...chromium.args.filter((a) => a !== '--single-process'), '--disable-dev-shm-usage', '--disable-gpu-compositing'], headless: true, protocolTimeout: 120000 });
const summaries = [];
for (const cfg of RUNS) {
  const R = await runCampaign(browser, cfg);
  fs.writeFileSync(path.join(OUT, `${R.name}`, 'report.json'), JSON.stringify(R, null, 1));
  const sum = summarize(R);
  summaries.push(sum);
  console.log(`\n${sum.pass ? 'PASS' : 'FAIL'} ${sum.name}: ${sum.battles} battles (${sum.losses} lost), ${sum.turns} turns, ${sum.questions} questions, ${sum.rolls} rolls, ${sum.totalWallS}s`);
}
fs.writeFileSync(path.join(OUT, `summary-${RUNS.map((r) => r.hero + '-' + r.vp).join('_')}.json`), JSON.stringify(summaries, null, 1));
await browser.close();
server.close();
console.log('\n' + summaries.map((s) => `${s.pass ? 'PASS' : 'FAIL'} ${s.name}`).join('\n'));
process.exit(summaries.every((s) => s.pass) ? 0 : 1);
