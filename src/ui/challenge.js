// Learning challenge overlay. Picture-first, no timer. A small prompt line is
// there for a grown-up to read aloud; every challenge works without it.
// 1st wrong: that choice drifts away + a gentle visual hint.
// 2nd wrong: only the right answer is left, glowing, with full support shown.
import { h, onTap } from './dom.js';
import { ICON } from './icons.js';
import { qualityFor, PICS, wordLabel } from '../logic/challenges.js';
import { say, speechOn } from '../audio/speech.js';
import { answerGate } from './answer-gate.js';

const INK = '#14111A';
const ITEM_SVG = {
  block: (c) => `<svg viewBox="0 0 60 60"><rect x="6" y="6" width="48" height="48" rx="6" fill="${c}" stroke="${INK}" stroke-width="5"/><path d="M54 22 L54 48 Q54 54 48 54 L22 54 Z" fill="${INK}" opacity=".28"/><path d="M12 17 L24 11 L30 12 L15 20 Z" fill="#fff" opacity=".9"/></svg>`,
  star: () => `<svg viewBox="0 0 60 60"><path d="M30 5 L37 22 L55 23 L41 34 L46 52 L30 42 L14 52 L19 34 L5 23 L23 22 Z" fill="#FFC914" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/></svg>`,
  ball: (c) => `<svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="24" fill="${c}" stroke="${INK}" stroke-width="5"/><path d="M8 26 Q30 36 52 26" fill="none" stroke="#fff" stroke-width="5"/><path d="M52 30 A22 22 0 0 1 22 52 A26 26 0 0 0 52 30 Z" fill="${INK}" opacity=".28"/><path d="M14 22 L22 13 L26 14 L17 24 Z" fill="#fff" opacity=".9"/></svg>`,
  duck: () => `<svg viewBox="0 0 60 60"><path d="M10 34 Q10 52 30 52 Q52 52 52 36 Q52 28 44 28 Q46 12 32 10 Q20 10 20 22 Q20 28 26 30 Q16 30 10 34 Z" fill="#FFC914" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/><path d="M42 18 L54 20 L44 25 Z" fill="#F46036" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><circle cx="35" cy="18" r="3" fill="${INK}"/></svg>`,
};
const ITEM_COLORS = ['#D7263D', '#1B4FD8', '#2E9E44', '#6A3FA0', '#F46036'];
const OPT_COLORS = ['#FF8A5C', '#6CC4F0', '#8FE07A'];
const TOKEN_HEX = { red: '#D7263D', blue: '#1B4FD8', yellow: '#FFC914', green: '#2E9E44', purple: '#6A3FA0' };

const SHAPE_PATH = {
  circle: '<circle cx="30" cy="30" r="22"/>',
  square: '<rect x="9" y="9" width="42" height="42" rx="3"/>',
  triangle: '<path d="M30 7 L54 51 L6 51 Z"/>',
  star: '<path d="M30 5 L37 22 L55 23 L41 34 L46 52 L30 42 L14 52 L19 34 L5 23 L23 22 Z"/>',
  heart: '<path d="M30 52 C10 38 4 28 7 19 C10 10 23 8 30 19 C37 8 50 10 53 19 C56 28 50 38 30 52 Z"/>',
  diamond: '<path d="M30 5 L53 30 L30 55 L7 30 Z"/>',
};
const shapeSvg = (shape, color) =>
  `<svg viewBox="0 0 60 60"><g fill="${color}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round">${SHAPE_PATH[shape]}</g></svg>`;
const tokenSvg = (tok) => {
  const [shape, color] = tok.split(':');
  return shapeSvg(shape, TOKEN_HEX[color] || color);
};

const MATH_KINDS = new Set(['count', 'flash', 'add', 'sub', 'story', 'numeral', 'compare', 'shape', 'pattern', 'oneMore', 'seq', 'bigger', 'teen']);
// dice faces on a 3×3 grid (cells 0–8), for the quick-look dots
const DICE = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

export class ChallengeUI {
  constructor(layer, audio, buzz) {
    this.layer = layer;
    this.audio = audio;
    this.buzz = buzz;
  }

  item(ch, i, extraClass = '') {
    const color = ITEM_COLORS[(i + (ch.n || 0)) % ITEM_COLORS.length];
    return h('span', { class: `cnt-item ${extraClass}`, style: { '--d': i * 55 + 'ms' }, html: ITEM_SVG[ch.item](color) + `<b class="cnt-num">${i + 1}</b>` });
  }

  tray(ch, n, items, startIndex = 0, crossFrom = Infinity) {
    const perRow = n > 5 ? 5 : n;
    const rows = [];
    for (let i = 0; i < n; i++) {
      const crossed = startIndex + i >= crossFrom;
      const it = this.item(ch, startIndex + i, crossed ? 'crossed' : '');
      if (!crossed) items.push(it);
      if (i % perRow === 0) rows.push(h('div', { class: 'cnt-row' }));
      rows[rows.length - 1].appendChild(it);
    }
    return h('div', { class: `cnt-tray ${n > 10 ? 'many' : ''}` }, ...rows);
  }

  dots(n) {
    const per = n > 6 ? 4 : 3;
    return h('span', { class: 'dots', style: { '--per': per } },
      ...Array.from({ length: n }, (_, i) => h('i', { style: { '--c': ITEM_COLORS[i % ITEM_COLORS.length] } })));
  }

  // Quick-look dots: dice faces (two dice past 6) that hide after a moment.
  flashBox(n) {
    const die = (k) => h('span', { class: 'die' }, ...Array.from({ length: 9 }, (_, i) => h('i', { class: DICE[k].includes(i) ? 'on' : '' })));
    const dice = n <= 6 ? [die(n)] : [die(5), die(n - 5)];
    return h('div', { class: 'flash-box' }, ...dice, h('span', { class: 'flash-cover' }, '?'));
  }

  tenFrame(k) {
    return h('span', { class: 'ten-frame' }, ...Array.from({ length: 10 }, (_, i) => h('i', { class: i < k ? 'on' : '' })));
  }

  // Builds the "question" part of the card. Returns { body, items, target }.
  buildBody(ch) {
    const items = [];
    let body, target;
    switch (ch.kind) {
      case 'count':
        body = this.tray(ch, ch.n, items);
        break;
      case 'add':
        body = h('div', { class: 'math-row' },
          this.tray(ch, ch.a, items, 0),
          h('span', { class: 'math-op' }, '+'),
          this.tray(ch, ch.b, items, ch.a));
        break;
      case 'sub':
        body = this.tray(ch, ch.a, items, 0, ch.a - ch.b);
        break;
      case 'story':
        body = ch.op === 'add'
          ? h('div', { class: 'math-row' }, this.tray(ch, ch.a, items, 0), h('span', { class: 'math-op' }, '+'), this.tray(ch, ch.b, items, ch.a))
          : this.tray(ch, ch.a, items, 0, ch.a - ch.b);
        break;
      case 'flash':
        body = target = this.flashBox(ch.n);
        break;
      case 'teen':
        body = target = h('div', { class: 'ten-frames' }, this.tenFrame(10), this.tenFrame(ch.n - 10));
        break;
      case 'oneMore':
        body = target = h('div', { class: 'num-row' },
          h('span', { class: 'num-tile' }, String(ch.n)),
          h('span', { class: `step-badge ${ch.dir}` }, ch.dir === 'more' ? '+1' : '−1'),
          h('span', { class: 'num-tile tile-q' }, '?'));
        break;
      case 'seq':
        body = target = h('div', { class: `num-row seq ${ch.dir}` },
          ...ch.seq.map((x, i) => h('span', { class: `num-tile ${x == null ? 'tile-q' : ''}`, style: { '--d': i * 60 + 'ms' } }, x == null ? '?' : String(x))));
        break;
      case 'bigger':
        body = target = h('span', { class: `cmp-card cmp-${ch.mode === 'biggest' ? 'most' : 'fewest'}`, html: ch.mode === 'biggest' ? ICON.most : ICON.fewest });
        break;
      case 'numeral':
        body = target = h('span', { class: 'ltr-card num-card' }, String(ch.n));
        break;
      case 'compare':
        body = target = h('span', { class: `cmp-card cmp-${ch.mode}`, html: ch.mode === 'most' ? ICON.most : ICON.fewest });
        break;
      case 'shape':
        body = target = h('span', { class: 'pic-card shape-card', html: shapeSvg(ch.target, TOKEN_HEX[ch.color]) });
        break;
      case 'pattern':
        body = target = h('div', { class: 'pattern-row' },
          ...ch.seq.map((t, i) => h('span', { class: 'tok', style: { '--d': i * 70 + 'ms' }, html: tokenSvg(t) })),
          h('span', { class: 'tok tok-q' }, '?'));
        break;
      case 'letter':
        body = h('div', { class: 'ltr-target' },
          target = h('span', { class: 'ltr-card' }, ch.shown),
          h('span', { class: 'ltr-eq', html: '<i></i><i></i>' }));
        break;
      case 'starts':
        body = target = h('span', { class: 'pic-card' }, h('span', { class: 'emoji' }, ch.pic), h('b', { class: 'pic-word' }, wordLabel(ch.word)));
        break;
      case 'rhyme':
        body = h('div', { class: 'ltr-target' },
          target = h('span', { class: 'pic-card' }, h('span', { class: 'emoji' }, ch.pic), h('b', { class: 'pic-word show' }, wordLabel(ch.word))),
          h('span', { class: 'rhyme-note', html: ICON.note }));
        break;
      case 'word':
        body = target = h('span', { class: 'word-card' }, ch.word);
        break;
      case 'pickStart':
        body = target = h('span', { class: 'ltr-card' }, ch.letter);
        break;
      case 'ends':
        body = h('div', { class: 'ltr-target' },
          target = h('span', { class: 'pic-card' }, h('span', { class: 'emoji' }, ch.pic), h('b', { class: 'pic-word' }, wordLabel(ch.word))),
          h('span', { class: 'sound-pos end' }, h('i'), h('i'), h('i')));
        break;
      case 'missing':
      case 'spell': {
        const slots = [...ch.word].map((c, i) => h('span', { class: `slot ${ch.kind === 'missing' && i === ch.pos ? 'slot-q' : ''} ${ch.kind === 'spell' ? 'empty' : ''}` },
          ch.kind === 'spell' ? '' : i === ch.pos ? '?' : c));
        body = h('div', { class: 'ltr-target' },
          h('span', { class: 'pic-card' }, h('span', { class: 'emoji' }, ch.pic)),
          target = h('div', { class: 'slots' }, ...slots));
        this.slots = slots;
        break;
      }
      case 'sight':
        body = target = h('button', { class: 'hear-btn', 'aria-label': 'Hear the word again', html: ICON.sound });
        onTap(body, () => say(ch.say), 300);
        break;
    }
    return { body, items, target };
  }

  optionContent(ch, o) {
    switch (ch.optType) {
      case 'num':
      case 'letter':
      case 'word':
        return { text: String(o) };
      case 'pic':
        return { html: `<span class="emoji">${PICS[o]}</span>` };
      case 'group':
        return { node: this.dots(o) };
      case 'shape':
        return { html: shapeSvg(o, '#ffffff') };
      case 'token':
        return { html: tokenSvg(o) };
    }
    return { text: String(o) };
  }

  // Resolves with a quality ('indep' | 'hint' | 'support') once answered correctly.
  // Afterwards this.lastStats = { wrongPicks, firstMs, totalMs } for the learning report.
  // Spelling is answered in steps (one letter at a time); everything else is one step.
  run(ch, actionKind, move) {
    return new Promise((resolve) => {
      let wrongs = 0; // across all steps
      let stepWrongs = 0;
      let busy = false;
      const t0 = performance.now();
      let firstMs = null;
      const wrongPicks = [];
      this.lastStats = null;
      this.slots = null;
      const steps = ch.steps || [{ answer: ch.answer, options: ch.options }];
      let si = 0;
      const { body, items, target } = this.buildBody(ch);
      const slots = this.slots;
      const optsBox = h('div', { class: 'ch-opts' });
      let opts = [];
      const isMath = MATH_KINDS.has(ch.kind);
      const badge = h('div', { class: `ch-badge ch-badge-${actionKind}`, style: move ? { '--mc': move.color } : null, html: actionKind === 'special' ? ICON.bolt : ICON.fist });
      // the grown-up line; the sight-word target is only printed when nobody can hear it
      const promptText = !speechOn() && ch.reveal ? ch.reveal : ch.prompt;
      const speak = h('button', { class: `ch-speak ${speechOn() ? '' : 'hidden'}`, 'aria-label': 'Say it again', html: ICON.sound });
      onTap(speak, () => say(ch.say || ch.prompt), 300);
      const card = h('div', { class: `ch-card ch-${ch.kind} ${isMath ? 'ch-math' : 'ch-read'}` },
        badge, speak,
        h('div', { class: 'ch-prompt' }, promptText),
        h('div', { class: 'ch-body' }, body),
        optsBox);
      const root = h('div', { class: 'challenge' }, card);
      // the card covers the whole screen, so every tap while it is up lands here
      // first (capture) and the gate sees the whole burst, not just answer taps
      const gate = answerGate(t0);
      let mayAnswer = false;
      root.addEventListener('pointerdown', () => { mayAnswer = gate.down(performance.now()); }, true);
      this.layer.appendChild(root);
      requestAnimationFrame(() => root.classList.add('in'));
      this.audio.sfx('pop');
      setTimeout(() => say(ch.say || ch.prompt), 250);

      const countable = ch.kind === 'count' || ch.kind === 'add' || ch.kind === 'sub' || ch.kind === 'story';
      // quick look: the dots hide after a moment; a wrong tap shows them again briefly
      let coverTimer = null;
      const flashFor = (ms) => {
        if (ch.kind !== 'flash') return;
        target.classList.remove('covered');
        clearTimeout(coverTimer);
        coverTimer = setTimeout(() => { if (!card.classList.contains('support') && !card.classList.contains('solved')) target.classList.add('covered'); }, ms);
      };
      flashFor(ch.ms + 400);

      const showStep = () => {
        stepWrongs = 0;
        opts = steps[si].options.map((o, i) => {
          const c = this.optionContent(ch, o);
          const b = h('button', {
            class: `opt opt-${ch.optType}`,
            style: { '--c': OPT_COLORS[i], '--d': (si ? 60 : 250) + i * 90 + 'ms' },
            html: c.html,
          }, c.text || null, c.node || null);
          b.dataset.value = String(o);
          onTap(b, () => choose(o, b), 200);
          return b;
        });
        optsBox.replaceChildren(...opts);
        if (slots) slots.forEach((sl, k) => sl.classList.toggle('now', ch.kind === 'spell' && k === si));
      };

      const finish = async (b) => {
        busy = true;
        clearTimeout(coverTimer);
        const q = qualityFor(Math.min(2, wrongs));
        this.lastStats = { wrongPicks, firstMs, totalMs: performance.now() - t0 };
        b.classList.add('right');
        card.classList.remove('support');
        card.classList.add('solved');
        if (ch.kind === 'flash') target.classList.remove('covered');
        this.audio.sfx(q === 'support' ? 'supportCorrect' : 'correct');
        this.buzz('light');
        card.classList.add(q === 'indep' ? 'win-big' : 'win');
        if (ch.kind === 'spell' || ch.kind === 'missing') say(ch.word);
        if (countable && q !== 'support') await this.countAlong(items, Math.min(140, 1300 / Math.max(1, items.length)));
        await wait(q === 'indep' ? 650 : 560);
        root.classList.remove('in');
        root.classList.add('out');
        await wait(260);
        root.remove();
        resolve(q);
      };

      const choose = async (o, b) => {
        // answers pop in first, and hammering that started on the move button never answers (ui/answer-gate.js)
        if (busy || b.classList.contains('gone') || !mayAnswer) return;
        if (firstMs == null) firstMs = performance.now() - t0;
        const step = steps[si];
        if (String(o) === String(step.answer)) {
          if (slots && ch.kind === 'spell') { slots[si].textContent = String(o); slots[si].classList.remove('empty'); slots[si].classList.add('filled'); }
          if (slots && ch.kind === 'missing') { slots[ch.pos].textContent = String(o); slots[ch.pos].classList.add('filled'); }
          if (si < steps.length - 1) {
            busy = true;
            b.classList.add('right');
            this.audio.sfx('select');
            card.classList.remove('support');
            await wait(320);
            si++;
            showStep();
            busy = false;
            return;
          }
          return finish(b);
        }
        busy = true;
        wrongs++;
        stepWrongs++;
        wrongPicks.push(o);
        this.audio.sfx('tryAgain');
        b.classList.add('nope');
        await wait(420);
        b.classList.add('gone');
        if (stepWrongs === 1) {
          if (countable) await this.pulseItems(items);
          else if (ch.kind === 'flash') flashFor(ch.ms);
          else if (target) {
            target.classList.remove('wiggle');
            void target.offsetWidth;
            target.classList.add('wiggle');
          }
          if (ch.say && !countable && ch.kind !== 'flash') say(ch.say);
        } else {
          const right = opts.find((x) => x.dataset.value === String(step.answer));
          if (countable) await this.countAlong(items, 260, true);
          if (ch.kind === 'flash') { clearTimeout(coverTimer); target.classList.remove('covered'); }
          right.classList.add('glow');
          card.classList.add('support');
        }
        busy = false;
      };

      showStep();
    });
  }

  async pulseItems(items) {
    for (const it of items) {
      it.classList.remove('pulse');
      void it.offsetWidth;
      it.classList.add('pulse');
      await wait(150);
    }
  }

  async countAlong(items, step, withNumbers = true) {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      it.querySelector('.cnt-num').textContent = String(i + 1);
      it.classList.add(withNumbers ? 'counted' : 'pulse');
      this.audio.sfx('count', i + 1);
      await wait(step);
    }
  }
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
