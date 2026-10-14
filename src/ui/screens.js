// Menus and overlays. Kid-facing screens use pictures only; the parent panel
// (press-and-hold the gear) is the only place with real text.
import { h, onTap, onHold } from './dom.js';
import { ICON } from './icons.js';
import { portrait } from './hud.js';
import { drawToy } from '../render/toys.js';
import { MIN_LEVEL, MAX_LEVEL } from '../logic/difficulty.js';
import { pixelLabel, getArtScale, isPixel, pixelize } from '../render/pixel.js';
import { get3D } from '../render3d/stage3d.js';
import { onModelsChanged } from '../render3d/models.js';


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

  // ---------------- title ----------------
  showTitle({ stars, hasBattle, onPlay, onParent, showInstallTip }) {
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
  showSelect({ chars, roster, lastHero, onPick, onHome }) {
    this.clear();
    let chosen = null;
    const go = h('button', { class: 'go-btn hidden', 'aria-label': 'Go', html: ICON.play });
    const cards = roster.map((id, i) => {
      const def = chars[id];
      const cv = document.createElement('canvas');
      const W = 150, H = 128, px = isPixel() ? getArtScale() : this.app.px * 1.1;
      cv.width = W * px; cv.height = H * px;
      if (isPixel()) cv.classList.add('pxl');
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      const draw = (eyes) => {
        const c = cv.getContext('2d');
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.clearRect(0, 0, cv.width, cv.height);
        c.setTransform(px * 0.78, 0, 0, px * 0.78, (W / 2 + (id === 'stompy' ? 14 : 0)) * px, (H - 6) * px);
        const pose = { t: 1000, eyes, mouth: eyes === 'happy' ? 'open' : 'smile', armF: eyes === 'happy' ? -2.5 : -0.2, armB: eyes === 'happy' ? 2.5 : 0.25 };
        const s3 = get3D();
        if (s3) {
          c.setTransform(1, 0, 0, 1, 0, 0);
          c.drawImage(s3.snapshot(def, { w: cv.width, h: cv.height, framing: 'full', pose }), 0, 0);
          return;
        }
        drawToy(c, def, pose);
        if (isPixel()) pixelize(c, cv.width, cv.height);
      };
      draw('open');
      const statRow = (icon, n) => h('div', { class: 'stat' }, ...Array.from({ length: n }, () => h('span', { html: icon })));
      const card = h('button', { class: 'pick-card', style: { '--c': def.color, '--d': i * 120 + 'ms' }, 'aria-label': def.name },
        h('span', { class: 'p1-tag' }, pixelLabel('1P', 20, '#FF4A3A')),
        h('div', { class: 'pick-art' }, cv),
        h('div', { class: 'pick-name' }, pixelLabel(def.name, 15, '#FFC914', { maxW: 178 })),
        h('div', { class: 'pick-moves' }, ...(def.moves || []).map((m) => h('span', { class: `pm pm-${m.slot}`, style: { '--mc': m.color }, html: ICON[m.icon] || ICON.fist }))));
      void statRow;
      card._draw = draw;
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
    onTap(go, () => chosen && onPick(chosen), 800);
    const home = h('button', { class: 'corner-btn home-btn', 'aria-label': 'Home', html: ICON.home });
    onTap(home, onHome, 500);
    const scr = h('div', { class: 'screen select-screen' }, h('div', { class: 'pick-grid' }, ...cards), go, home);
    this.layer.appendChild(scr);
    // an imported model finished loading: redraw the cards with it
    const off = onModelsChanged(() => {
      if (!scr.isConnected) return off();
      cards.forEach((c, i) => c._draw(roster[i] === chosen ? 'happy' : 'open'));
    });
    if (lastHero) {
      const i = roster.indexOf(lastHero);
      if (i >= 0) cards[i].classList.add('last');
    }
  }

  // ---------------- VS splash ----------------
  showVS(heroDef, foeDef) {
    this.clear();
    const px = this.app.px;
    const scr = h('div', { class: 'overlay vs' },
      h('div', { class: 'vs-bg vs-bg-hero', style: { '--c': heroDef.color } }),
      h('div', { class: 'vs-bg vs-bg-foe', style: { '--c': foeDef.color } }),
      h('div', { class: 'vs-slash' }),
      h('div', { class: 'vs-col vs-hero' }, h('div', { class: 'vs-side', style: { '--c': heroDef.color } }, portrait(heroDef, 156, px * 1.2)), pixelLabel(heroDef.name, 22, '#FFC914')),
      h('div', { class: 'vs-mid' }, pixelLabel('VS', 104, '#FFC914', { chunk: 3 })),
      h('div', { class: 'vs-col vs-foe' }, h('div', { class: 'vs-side', style: { '--c': foeDef.color } }, portrait(foeDef, 156, px * 1.2)), pixelLabel(foeDef.name, 22, '#FFC914')));
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
  showParent({ save, onChange, onExport, onImport, onReset, onClose, build, storageOk }) {
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
    const level = (label, domain, desc) => {
      const sk = d.skills[domain];
      const val = h('b', {}, String(sk.level));
      const auto = h('input', { type: 'checkbox' });
      auto.checked = sk.auto;
      auto.addEventListener('change', () => { sk.auto = auto.checked; onChange(); });
      const bump = (n) => {
        sk.level = Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, sk.level + n));
        sk.streak = 0; sk.recent = [];
        val.textContent = String(sk.level);
        desc_.textContent = desc[sk.level];
        onChange();
      };
      const minus = h('button', { class: 'mini' }, '–');
      const plus = h('button', { class: 'mini' }, '+');
      minus.addEventListener('click', () => bump(-1));
      plus.addEventListener('click', () => bump(1));
      const desc_ = h('small', {}, desc[sk.level]);
      return h('div', { class: 'row level' },
        h('span', {}, label, desc_),
        h('div', { class: 'stepper' }, minus, val, plus),
        h('label', { class: 'auto' }, auto, 'Auto'));
    };
    const MATH = { 1: 'Count 1–5', 2: 'Count 3–8', 3: 'Count 5–10', 4: 'Count 8–15', 5: 'Count 10–20' };
    const LET = { 1: 'Match capitals (very different shapes)', 2: 'Match any capitals', 3: 'Match lowercase', 4: 'Capital → lowercase partner', 5: 'Tricky lowercase (b d p q…)' };
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
        resetBtn.textContent = 'Tap again to erase stars & progress';
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
        h('section', {}, h('h3', {}, 'Sound'), slider('Music', 'music'), slider('Effects', 'sfx')),
        h('section', {}, h('h3', {}, 'Learning'),
          toggle('Learning questions', 'learning', 'On: power moves ask a math question, specials ask a reading one. Off: just battle.'),
          level('Counting (Attack)', 'math', MATH),
          level('Letters (Special)', 'letters', LET),
          h('p', { class: 'note' }, 'Auto moves up after 3 independent answers in a row, and down if he needs full help twice in his last 4. Answers with a hint never move it up.')),
        h('section', {}, h('h3', {}, 'Comfort'),
          toggle('Reduced motion', 'reducedMotion', 'No screen shake or big flashes'),
          toggle('Haptics', 'haptics', 'Light taps on iPhone (iOS 18+), where supported'),
          toggle('Retro resolution', 'pixelArt', 'Chunky low-res 3D like an early arcade game (off = sharp)'),
          toggle('TV look', 'tvLook', 'Scanlines, like an old arcade screen'),
          toggle('Show FPS', 'showFps', 'Frame-rate readout for testing')),
        h('section', {}, h('h3', {}, 'Progress'),
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

  showTextBox(title, text) {
    const ta = h('textarea', { readonly: true }, text);
    const done = h('button', { class: 'pbtn primary' }, 'Close');
    const scr = h('div', { class: 'overlay parent' }, h('div', { class: 'parent-card' }, h('h2', {}, title), h('p', { class: 'note' }, 'Copy this text and keep it somewhere safe (Notes works). Import it later with “Import backup”.'), ta, done));
    done.addEventListener('click', () => scr.remove());
    this.layer.appendChild(scr);
    setTimeout(() => { ta.focus(); ta.select(); }, 100);
  }
}
