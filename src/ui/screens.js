// Menus and overlays. Kid-facing screens use pictures only; the parent panel
// (press-and-hold the gear) is the only place with real text.
import { h, onTap, onHold } from './dom.js';
import { ICON } from './icons.js';
import { portrait } from './hud.js';
import { drawToy } from '../render/toys.js';
import { bandFor, playLevel } from '../logic/difficulty.js';
import { levelBadge } from './level-badge.js';
import { noteLevel } from '../logic/learning-log.js';
import { pixelLabel, getArtScale, isPixel, pixelize } from '../render/pixel.js';
import { get3D } from '../render3d/stage3d.js';
import { onModelsChanged, modelId, modelReady, hasModel } from '../render3d/models.js';

// Select-card portraits, rendered once per toy + pose + size (and whether its
// imported model had loaded), then copied. Building a 3D toy and reading the
// pixels back is the slow part, so a tap only redraws the two cards that change.
const shots = new Map();
const CARD_W = 150, CARD_H = 128;

function cardPx(app) {
  return isPixel() ? getArtScale() : app.px * 1.1;
}

function cardKey(id, def, eyes, w, h, s3) {
  return `${id}|${eyes}|${w}x${h}|${isPixel()}|${s3 ? +modelReady(modelId(def)) : '2d'}`;
}

// One select-card picture, from the cache when it's there. Rendering goes
// through the 3D stage (build the toy, read the pixels back), which is the
// slow part; warmSelect() does it ahead of time so the select screen opens
// without a stall.
function cardShot(id, def, eyes, w, h, px) {
  const s3 = get3D();
  const key = cardKey(id, def, eyes, w, h, s3);
  let src = shots.get(key);
  if (src) return src;
  const pose = { t: 1000, eyes, mouth: eyes === 'happy' ? 'open' : 'smile', armF: eyes === 'happy' ? -2.5 : -0.2, armB: eyes === 'happy' ? 2.5 : 0.25 };
  if (s3) {
    src = s3.snapshot(def, { w, h, framing: 'full', pose });
  } else {
    src = document.createElement('canvas');
    src.width = w; src.height = h;
    const c = src.getContext('2d');
    c.setTransform(px * 0.78, 0, 0, px * 0.78, (CARD_W / 2 + (id === 'stompy' ? 14 : 0)) * px, (CARD_H - 6) * px);
    drawToy(c, def, pose);
    if (isPixel()) pixelize(c, w, h);
  }
  if (shots.size > 48) shots.clear();
  if (!(s3 && s3.lost)) shots.set(key, src); // never keep a blank frame from a lost GPU
  return src;
}


export class UI {
  constructor(root, app) {
    this.app = app;
    this.layer = root;
    this.toVirtual = (r) => {
      const base = this.layer.getBoundingClientRect();
      const s = this.app.scale;
      return { x: (r.left - base.left) / s, y: (r.top - base.top) / s, w: r.width / s, h: r.height / s };
    };
    this.screen = null;
  }

  clear() {
    this.layer.querySelectorAll('.screen, .overlay').forEach((n) => n.remove());
  }

  // Pre-render the select cards one toy per idle slice, so the first trip to
  // the select screen doesn't stall (measured 750 ms for 12 toys on the
  // laptop). Safe to call often: cached pictures are skipped, and it stops
  // the moment a battle or another heavy screen takes over.
  warmSelect(chars, roster) {
    if (this._warm) return;
    if (!this._warmHook) {
      // a model that lands later changes its card's cache key: warm that toy again
      this._warmHook = onModelsChanged(() => this.warmSelect(chars, roster));
    }
    // toys whose imported model is still on its way are left for the next round
    const queue = roster.filter((id) => { const m = modelId(chars[id]); return !m || !hasModel(m) || modelReady(m); });
    // idle time when the page has any, otherwise within 400 ms (a software-rendered
    // tab never reports idle time, and it needs the warm-up most)
    const idle = window.requestIdleCallback ? (fn) => requestIdleCallback(fn, { timeout: 400 }) : (fn) => setTimeout(fn, 120);
    const step = () => {
      this._warm = null;
      if (!queue.length || this.app.battle) return;
      const id = queue.shift();
      const def = chars[id];
      if (def) {
        const px = cardPx(this.app);
        try { cardShot(id, def, 'open', CARD_W * px, CARD_H * px, px); } catch (e) { /* a lost GPU: leave it for the select screen */ }
      }
      this._warm = idle(step);
    };
    this._warm = idle(step);
  }

  // ---------------- title ----------------
  showTitle({ stars, player = null, hasBattle, onPlay, onParent, showInstallTip }) {
    this.clear();
    const logoTop = h('div', { class: 'logo-row' }, pixelLabel('TWINFORGE', 66, '#FFC914', { chunk: 3, cls: 'logo-word' }));
    const banner = h('div', { class: 'logo-banner' }, pixelLabel('TOY BOX TACTICS', 25, '#ffffff', { chunk: 1, ramp: ['#ffffff', '#ffffff', '#FFE7A0', '#FFC914'] }));
    const push = h('div', { class: 'push-start' }, pixelLabel('PUSH START', 18, '#FFC914'));
    const play = h('button', { class: `big-play ${hasBattle ? 'resume' : ''}`, 'aria-label': 'Play', html: ICON.play });
    onTap(play, onPlay, 600);
    const gear = h('button', { class: 'gear', 'aria-label': 'Grown-ups: press and hold', html: ICON.gear + '<i class="hold-ring"></i>' });
    onHold(gear, 1500, onParent);
    const starBox = h('div', { class: 'star-count' }, h('span', { html: ICON.star }), pixelLabel(String(stars).padStart(2, '0'), 20, '#FFC914'));
    const kids = [h('div', { class: 'logo' }, logoTop, banner), play, push, starBox, gear];
    if (player) kids.push(levelBadge(player, { size: 'big', cls: 'title-lvl' }));
    if (showInstallTip) {
      const tip = h('div', { class: 'install-tip' },
        h('b', {}, 'Grown-ups: '), 'tap Share, then “Add to Home Screen” so TwinForge opens full-screen and keeps its save.');
      const x = h('button', { class: 'tip-x', 'aria-label': 'Dismiss' }, '×');
      onTap(x, () => tip.remove());
      tip.appendChild(x);
      kids.push(tip);
    }
    const scr = h('div', { class: 'screen title-screen' }, ...kids);
    this.layer.appendChild(scr);
    return scr;
  }

  // ---------------- character select ----------------
  // surprise: add a SURPRISE! card (onPick(null) picks at random); vs: label the
  // cards as the opponent (red 'CPU' tag) instead of the player
  showSelect({ chars, roster, lastHero, onPick, onHome, surprise = false, vs = false }) {
    this.clear();
    let chosen = null;
    const go = h('button', { class: 'go-btn hidden', 'aria-label': 'Go', html: ICON.play });
    const cards = roster.map((id, i) => {
      const def = chars[id];
      const cv = document.createElement('canvas');
      const W = CARD_W, H = CARD_H, px = cardPx(this.app);
      cv.width = W * px; cv.height = H * px;
      if (isPixel()) cv.classList.add('pxl');
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      const draw = (eyes) => {
        const src = cardShot(id, def, eyes, cv.width, cv.height, px);
        const c = cv.getContext('2d');
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.clearRect(0, 0, cv.width, cv.height);
        c.drawImage(src, 0, 0);
        cv._eyes = eyes;
      };
      draw('open');
      const card = h('button', { class: 'pick-card', style: { '--c': def.color, '--d': i * 120 + 'ms' }, 'aria-label': def.name },
        h('span', { class: 'p1-tag' }, pixelLabel(vs ? 'VS' : '1P', 20, vs ? '#FFC914' : '#FF4A3A')),
        h('div', { class: 'pick-art' }, cv),
        h('div', { class: 'pick-name' }, pixelLabel(def.name, 15, '#FFC914', { maxW: 156 })),
        h('div', { class: 'pick-moves' }, ...(def.moves || []).map((m) => h('span', { class: `pm pm-${m.slot}`, style: { '--mc': m.color }, html: ICON[m.icon] || ICON.fist }))));
      card._draw = (eyes, force) => (force || cv._eyes !== eyes) && draw(eyes);
      card._model = modelId(def);
      onTap(card, () => {
        chosen = id;
        cards.forEach((c) => {
          c.classList.toggle('chosen', c === card);
          c._draw(c === card ? 'happy' : 'open');
        });
        go.classList.remove('hidden');
        this.app.audio.sfx('select');
        this.app.buzz('light');
      }, 300);
      return card;
    });
    if (surprise) {
      const card = h('button', { class: 'pick-card surprise', style: { '--c': '#6A3FA0', '--d': cards.length * 120 + 'ms' }, 'aria-label': 'Surprise me' },
        h('span', { class: 'p1-tag' }, pixelLabel(vs ? 'VS' : '1P', 20, '#FFC914')),
        h('div', { class: 'pick-art surprise-art', html: ICON.shuffle }),
        h('div', { class: 'pick-name' }, pixelLabel('SURPRISE!', 15, '#FFC914', { maxW: 156 })));
      card._draw = () => {};
      onTap(card, () => {
        chosen = '?';
        cards.forEach((c) => { c.classList.toggle('chosen', c === card); c._draw('open'); });
        go.classList.remove('hidden');
        this.app.audio.sfx('select');
      }, 300);
      cards.push(card);
    }
    onTap(go, () => { if (!chosen) return; this.app.audio.sfx('select'); onPick(chosen === '?' ? null : chosen); }, 800);
    const home = h('button', { class: 'corner-btn home-btn', 'aria-label': 'Home', html: ICON.home });
    onTap(home, onHome, 500);
    const grid = h('div', { class: 'pick-grid' }, ...cards);
    const scr = h('div', { class: 'screen select-screen' }, grid, go, home);
    this.layer.appendChild(scr);
    // More than 8 toys: two rows, as many across as it takes, shrunk to fit
    // between the home corner and the GO button (the 4 x 2 grid is never touched).
    if (cards.length > 8) {
      const cols = Math.ceil(cards.length / 2);
      grid.classList.add('wide');
      grid.style.gridTemplateColumns = `repeat(${cols}, 170px)`;
      const fit = () => {
        if (!scr.isConnected) return removeEventListener('resize', fit);
        const cs = getComputedStyle(this.layer);
        const sl = parseFloat(cs.getPropertyValue('--sl')) || 10, sr = parseFloat(cs.getPropertyValue('--sr')) || 10;
        const gw = cols * 170 + (cols - 1) * 12, gh = 2 * 194 + 14;
        const left = sl + 12, right = sr + 136; // GO button + its pulse
        const availW = (this.app.W || 976) - left - right, availH = (this.app.H || 450) - 28;
        const k = Math.min(1, availW / gw, availH / gh);
        grid.style.left = left + availW / 2 + 'px';
        grid.style.transform = `translate(-50%, -50%) scale(${k.toFixed(3)})`;
      };
      fit();
      addEventListener('resize', fit);
    }
    // an imported model finished loading: redraw the cards with it
    const off = onModelsChanged((mid) => {
      if (!scr.isConnected) return off();
      cards.forEach((c, i) => roster[i] && c._model === mid && c._draw(roster[i] === chosen ? 'happy' : 'open', true));
    });
    if (lastHero) {
      const i = roster.indexOf(lastHero);
      if (i >= 0) cards[i].classList.add('last');
    }
  }

  // ---------------- VS splash ----------------
  showVS(heroDef, foeDef, { boss = false } = {}) {
    this.clear();
    const px = this.app.px;
    const scr = h('div', { class: 'overlay vs' },
      h('div', { class: 'vs-bg vs-bg-hero', style: { '--c': heroDef.color } }),
      h('div', { class: 'vs-bg vs-bg-foe', style: { '--c': foeDef.color } }),
      h('div', { class: 'vs-slash' }),
      h('div', { class: 'vs-col vs-hero' }, h('div', { class: 'vs-side', style: { '--c': heroDef.color } }, portrait(heroDef, 156, px * 1.2)), pixelLabel(heroDef.name, 22, '#FFC914')),
      h('div', { class: 'vs-mid' }, pixelLabel('VS', 104, '#FFC914', { chunk: 3 })),
      h('div', { class: `vs-col vs-foe ${boss ? 'giant' : ''}` }, boss ? h('span', { class: 'vs-crown', html: ICON.crown }) : null, h('div', { class: 'vs-side', style: { '--c': foeDef.color } }, portrait(foeDef, 156, px * 1.2)), pixelLabel(boss ? 'GIANT ' + foeDef.name : foeDef.name, 22, boss ? '#FF5A4A' : '#FFC914')));
    this.layer.appendChild(scr);
    return new Promise((r) => setTimeout(() => {
      scr.classList.add('out');
      setTimeout(() => {
        scr.remove();
        r();
      }, 350);
    }, 1350));
  }

  // ---------------- results ----------------
  showResult({ win, stars, total, onAgain, onHome }) {
    this.clear();
    const again = h('button', { class: 'round-btn again', 'aria-label': 'Play again', html: ICON.retry });
    const home = h('button', { class: 'round-btn home', 'aria-label': 'Home', html: ICON.home });
    let busy = false;
    onTap(again, () => { if (!busy) { busy = true; onAgain(); } }, 800);
    onTap(home, () => { if (!busy) { busy = true; onHome(); } }, 800);
    let body;
    if (win) {
      const slots = [0, 1, 2].map((i) => h('span', { class: 'star-slot', html: ICON.starEmpty }));
      body = h('div', { class: 'result-card win' },
        h('div', { class: 'result-title' }, pixelLabel('YOU WIN!', 72, '#FFC914', { chunk: 2 })),
        h('div', { class: 'star-slots' }, ...slots),
        h('div', { class: 'star-total' }, h('span', { html: ICON.star }), h('b', { class: 'total-num' }, String(total - stars))));
      setTimeout(() => this.fillStars(slots, stars, body.querySelector('.total-num'), total - stars), 700);
    } else {
      body = h('div', { class: 'result-card nap' },
        h('div', { class: 'nap-moon', html: ICON.moon }),
        h('div', { class: 'result-title small' }, pixelLabel('NAP TIME!', 52, '#9FD0FF', { chunk: 2 })),
        h('div', { class: 'nap-sub' }, pixelLabel('TRY AGAIN?', 18, '#ffffff')));
      again.classList.add('pulse');
    }
    const scr = h('div', { class: 'overlay result' }, body, h('div', { class: 'result-btns' }, home, again));
    this.layer.appendChild(scr);
  }

  async fillStars(slots, n, totalEl, start) {
    for (let i = 0; i < n; i++) {
      slots[i].innerHTML = ICON.star;
      slots[i].classList.add('got');
      this.app.audio.sfx('star', i);
      this.app.buzz('light');
      totalEl.textContent = String(start + i + 1);
      totalEl.parentElement.classList.remove('bump');
      void totalEl.offsetWidth;
      totalEl.parentElement.classList.add('bump');
      await new Promise((r) => setTimeout(r, 380));
    }
  }

  // ---------------- pause ----------------
  showPause({ onResume, onHome }) {
    const resume = h('button', { class: 'big-play', 'aria-label': 'Resume', html: ICON.play });
    const home = h('button', { class: 'round-btn home small', 'aria-label': 'Home', html: ICON.home });
    const scr = h('div', { class: 'overlay pause' }, resume, home);
    onTap(resume, () => { scr.remove(); onResume(); }, 500);
    onTap(home, () => { scr.remove(); onHome(); }, 500);
    this.layer.appendChild(scr);
  }

  // ---------------- parent panel ----------------
  showParent({ save, players, onChange, onExport, onImport, onReset, onClose, onReport, onPreview, build, storageOk }) {
    const d = save.data;
    const st = d.settings;
    const slider = (label, key) => {
      const input = h('input', { type: 'range', min: 0, max: 100, value: Math.round(st[key] * 100) });
      input.addEventListener('input', () => { st[key] = input.value / 100; onChange(); });
      return h('label', { class: 'row' }, h('span', {}, label), input);
    };
    const toggle = (label, key, note) => {
      const input = h('input', { type: 'checkbox' });
      input.checked = !!st[key];
      input.addEventListener('change', () => { st[key] = input.checked; onChange(); });
      return h('label', { class: 'row' }, h('span', {}, label, note ? h('small', {}, note) : null), input);
    };
    // the level shown and stepped is the one played on this player's pathway
    const pathway = save.pathway;
    const band = bandFor(pathway);
    const level = (label, domain, desc) => {
      const sk = d.skills[domain];
      const val = h('b', {}, String(playLevel(sk, pathway)));
      const auto = h('input', { type: 'checkbox' });
      auto.checked = sk.auto;
      auto.addEventListener('change', () => { sk.auto = auto.checked; onChange(); });
      const bump = (n) => {
        const from = playLevel(sk, pathway);
        sk.level = Math.max(band.min, Math.min(band.max, from + n));
        if (d.learning) noteLevel(d.learning, domain, from, sk.level, 'manual');
        sk.streak = 0; sk.recent = [];
        val.textContent = String(sk.level);
        desc_.textContent = desc[sk.level];
        onChange();
      };
      const minus = h('button', { class: 'mini' }, '–');
      const plus = h('button', { class: 'mini' }, '+');
      minus.addEventListener('click', () => bump(-1));
      plus.addEventListener('click', () => bump(1));
      const desc_ = h('small', {}, desc[playLevel(sk, pathway)]);
      return h('div', { class: 'row level' },
        h('span', {}, label, desc_),
        h('div', { class: 'stepper' }, minus, val, plus),
        h('label', { class: 'auto' }, auto, 'Auto'));
    };
    // what each level actually mixes in (logic/challenges.js MATH_KINDS / READ_KINDS)
    const MATH = {
      1: 'Count 1–5 · quick look (1–4 dots) · same shape · which has more',
      2: 'Count 3–8 · quick look to 5 · shapes · more · AB patterns · find the group',
      3: 'Count 5–10 · adding to 5 · one more · missing number · ABB patterns · most & fewest',
      4: 'Count 8–15 · add to 10 · take away from 5 · one more/less · bigger number · toy stories · ABC patterns',
      5: 'Count 10–20 · add & take away to 10 · teen numbers · count back · smallest/biggest · toy stories',
    };
    const LET = {
      1: 'Match capitals (very different shapes)',
      2: 'Match capitals · first sounds (easy letters) · which picture starts with… · copy a 3-letter word',
      3: 'Match lowercase · first sounds · rhymes · missing first letter (_at) · copy a 3–4 letter word',
      4: 'Capital → lowercase · all first sounds · last sounds · rhymes · read a word · sight words · missing letter · peek, then spell',
      5: 'Tricky lowercase (b d p q…) · last sounds · longer words · sight words · missing vowel · spell 3–5 letter words from sound',
    };
    const reportBtn = h('button', { class: 'pbtn rp-open' }, 'Learning report');
    const previewBtn = h('button', { class: 'pbtn pv-open' }, 'Preview questions');
    reportBtn.addEventListener('click', () => onReport && onReport());
    previewBtn.addEventListener('click', () => onPreview && onPreview());
    const exportBtn = h('button', { class: 'pbtn' }, 'Export backup');
    const importBtn = h('button', { class: 'pbtn' }, 'Import backup');
    const resetBtn = h('button', { class: 'pbtn danger' }, 'Reset progress…');
    const file = h('input', { type: 'file', accept: 'application/json,.json,.txt', style: { display: 'none' } });
    exportBtn.addEventListener('click', onExport);
    importBtn.addEventListener('click', () => file.click());
    file.addEventListener('change', async () => {
      const f = file.files && file.files[0];
      if (f) onImport(await f.text());
      file.value = '';
    });
    resetBtn.addEventListener('click', () => {
      if (resetBtn.dataset.armed) {
        onReset();
        close();
      } else {
        resetBtn.dataset.armed = '1';
        resetBtn.textContent = 'Tap again to erase this player’s stars & progress';
        setTimeout(() => { delete resetBtn.dataset.armed; resetBtn.textContent = 'Reset progress…'; }, 4000);
      }
    });
    const done = h('button', { class: 'pbtn primary' }, 'Done');
    const close = () => { scr.remove(); onClose(); };
    done.addEventListener('click', close);
    const p = d.progress;
    const scr = h('div', { class: 'overlay parent' },
      h('div', { class: 'parent-card' },
        h('h2', {}, 'Grown-up settings'),
        players || null,
        h('section', {}, h('h3', {}, 'Sound'), slider('Music', 'music'), slider('Effects', 'sfx')),
        h('section', {}, h('h3', {}, 'Learning'),
          toggle('Learning questions', 'learning', 'On: power moves ask a math question, specials ask a reading one. Off: just battle.'),
          toggle('Read questions aloud', 'readAloud', 'The phone reads each question to him (tap the speaker on the card to hear it again)'),
          level('Math (power moves)', 'math', MATH),
          level('Reading (specials)', 'letters', LET),
          h('p', { class: 'note' }, 'Auto moves up after 3 right-first-try answers in a row, and down if he needs full help twice in his last 4. Answers with a hint never move it up.'),
          h('p', { class: 'note' }, `Math and reading move on their own: doing well at one never changes the other. The learning pathway (${pathway === 'growing' ? 'Growing learner' : 'Early learner'}, set under Players → Edit) keeps both between level ${band.min} and ${band.max}; changing it never erases progress. Player level ${d.player?.level || 1} (${d.player?.xp || 0} XP) comes from right answers, wins and campaign spaces.`),
          h('div', { class: 'pbtns' }, reportBtn, previewBtn)),
        h('section', {}, h('h3', {}, 'Comfort'),
          toggle('Reduced motion', 'reducedMotion', 'No screen shake or big flashes'),
          toggle('Haptics', 'haptics', 'Light taps on iPhone (iOS 18+), where supported'),
          toggle('Retro resolution', 'pixelArt', 'Chunky low-res 3D like an early arcade game (off = sharp)'),
          toggle('TV look', 'tvLook', 'Scanlines, like an old arcade screen'),
          toggle('Show FPS', 'showFps', 'Frame-rate readout for testing')),
        h('section', {}, h('h3', {}, save.profile ? `Progress: ${save.profile.name}` : 'Progress'),
          h('p', { class: 'note' }, `${p.stars} stars · ${p.wins} wins · ${p.battles} battles`),
          storageOk ? null : h('p', { class: 'note warn' }, 'Storage is unavailable here (private browsing?). Progress won’t be kept.'),
          h('div', { class: 'pbtns' }, exportBtn, importBtn, resetBtn), file),
        h('p', { class: 'note build' }, `Build ${build}`),
        done));
    this.layer.appendChild(scr);
  }

  toast(text, ms = 2600) {
    const t = h('div', { class: 'toast' }, text);
    this.layer.appendChild(t);
    setTimeout(() => t.classList.add('out'), ms);
    setTimeout(() => t.remove(), ms + 400);
  }

  showTextBox(title, text, note = 'Copy this text and keep it somewhere safe (Notes works). Import it later with “Import backup”.') {
    const ta = h('textarea', { readonly: true }, text);
    const done = h('button', { class: 'pbtn primary' }, 'Close');
    const scr = h('div', { class: 'overlay parent textbox' }, h('div', { class: 'parent-card' }, h('h2', {}, title), h('p', { class: 'note' }, note), ta, done));
    done.addEventListener('click', () => scr.remove());
    this.layer.appendChild(scr);
    setTimeout(() => { ta.focus(); ta.select(); }, 100);
  }
}
