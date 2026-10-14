// Learning challenge overlay. Picture-first, no reading, no timer.
// 1st wrong: that choice drifts away + a gentle visual hint.
// 2nd wrong: only the right answer is left, glowing, with full support shown.
import { h, onTap } from './dom.js';
import { ICON } from './icons.js';
import { isCorrect, qualityFor } from '../logic/challenges.js';

const ITEM_SVG = {
  block: (c) => `<svg viewBox="0 0 60 60"><rect x="6" y="6" width="48" height="48" rx="6" fill="${c}" stroke="#14111A" stroke-width="5"/><path d="M54 22 L54 48 Q54 54 48 54 L22 54 Z" fill="#14111A" opacity=".28"/><path d="M12 17 L24 11 L30 12 L15 20 Z" fill="#fff" opacity=".9"/></svg>`,
  star: () => `<svg viewBox="0 0 60 60"><path d="M30 5 L37 22 L55 23 L41 34 L46 52 L30 42 L14 52 L19 34 L5 23 L23 22 Z" fill="#FFC914" stroke="#14111A" stroke-width="4.5" stroke-linejoin="round"/></svg>`,
  ball: (c) => `<svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="24" fill="${c}" stroke="#14111A" stroke-width="5"/><path d="M8 26 Q30 36 52 26" fill="none" stroke="#fff" stroke-width="5"/><path d="M52 30 A22 22 0 0 1 22 52 A26 26 0 0 0 52 30 Z" fill="#14111A" opacity=".28"/><path d="M14 22 L22 13 L26 14 L17 24 Z" fill="#fff" opacity=".9"/></svg>`,
  duck: () => `<svg viewBox="0 0 60 60"><path d="M10 34 Q10 52 30 52 Q52 52 52 36 Q52 28 44 28 Q46 12 32 10 Q20 10 20 22 Q20 28 26 30 Q16 30 10 34 Z" fill="#FFC914" stroke="#14111A" stroke-width="4.5" stroke-linejoin="round"/><path d="M42 18 L54 20 L44 25 Z" fill="#F46036" stroke="#14111A" stroke-width="3.5" stroke-linejoin="round"/><circle cx="35" cy="18" r="3" fill="#14111A"/></svg>`,
};
const ITEM_COLORS = ['#ef4b3c', '#3d7bf2', '#5cc95a', '#8e5cf2', '#F46036'];
const OPT_COLORS = ['#FF8A5C', '#6CC4F0', '#8FE07A'];

export class ChallengeUI {
  constructor(layer, audio, buzz) {
    this.layer = layer;
    this.audio = audio;
    this.buzz = buzz;
  }

  // Resolves with a quality ('indep' | 'hint' | 'support') once answered correctly.
  run(ch, actionKind) {
    return new Promise((resolve) => {
      let wrongs = 0;
      let busy = false;
      const items = [];
      let body;

      if (ch.kind === 'count') {
        const perRow = ch.n > 10 ? 5 : ch.n > 5 ? 5 : ch.n;
        const rows = [];
        for (let i = 0; i < ch.n; i++) {
          const color = ITEM_COLORS[(i + ch.n) % ITEM_COLORS.length];
          const it = h('span', { class: 'cnt-item', style: { '--d': i * 55 + 'ms' }, html: ITEM_SVG[ch.item](color) + `<b class="cnt-num">${i + 1}</b>` });
          items.push(it);
          if (i % perRow === 0) rows.push(h('div', { class: 'cnt-row' }));
          rows[rows.length - 1].appendChild(it);
        }
        body = h('div', { class: `cnt-tray ${ch.n > 10 ? 'many' : ''}` }, ...rows);
      } else {
        body = h('div', { class: 'ltr-target' },
          h('span', { class: 'ltr-card' }, ch.shown),
          h('span', { class: 'ltr-eq', html: '<i></i><i></i>' }));
      }

      const opts = ch.options.map((o, i) => {
        const b = h('button', {
          class: `opt ${ch.kind === 'letter' ? 'opt-letter' : 'opt-num'}`,
          style: { '--c': OPT_COLORS[i], '--d': 250 + i * 90 + 'ms' },
        }, String(o));
        b.dataset.value = String(o);
        onTap(b, () => choose(o, b), 200);
        return b;
      });

      const card = h('div', { class: `ch-card ch-${ch.kind}` },
        h('div', { class: `ch-badge ch-badge-${actionKind}`, html: actionKind === 'special' ? ICON.bolt : ICON.fist }),
        body,
        h('div', { class: 'ch-q', html: ch.kind === 'count' ? '<span>?</span>' : '' }),
        h('div', { class: 'ch-opts' }, ...opts));
      const root = h('div', { class: 'challenge' }, card);
      this.layer.appendChild(root);
      requestAnimationFrame(() => root.classList.add('in'));
      this.audio.sfx('pop');

      const finish = async (b) => {
        busy = true;
        const q = qualityFor(wrongs);
        b.classList.add('right');
        this.audio.sfx(q === 'support' ? 'supportCorrect' : 'correct');
        this.buzz('light');
        card.classList.add(q === 'indep' ? 'win-big' : 'win');
        if (ch.kind === 'count' && q !== 'support') await this.countAlong(items, Math.min(140, 1300 / items.length));
        await wait(q === 'indep' ? 650 : 520);
        root.classList.remove('in');
        root.classList.add('out');
        await wait(260);
        root.remove();
        resolve(q);
      };

      const choose = async (o, b) => {
        if (busy || b.classList.contains('gone')) return;
        if (isCorrect(ch, o)) return finish(b);
        busy = true;
        wrongs++;
        this.audio.sfx('tryAgain');
        b.classList.add('nope');
        await wait(420);
        b.classList.add('gone');
        if (wrongs === 1) {
          // hint: show the counting rhythm / wiggle the target letter
          if (ch.kind === 'count') await this.pulseItems(items);
          else card.querySelector('.ltr-card').classList.add('wiggle');
        } else {
          // support: only the answer is left; show the full count / matching glow
          const right = opts.find((x) => x.dataset.value === String(ch.answer));
          if (ch.kind === 'count') await this.countAlong(items, 260, true);
          right.classList.add('glow');
          card.classList.add('support');
        }
        busy = false;
      };
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
      it.classList.add(withNumbers ? 'counted' : 'pulse');
      this.audio.sfx('count', i + 1);
      await wait(step);
    }
  }
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
