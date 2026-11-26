// Learning-off skill input overlay (design fix 1). The rules live in
// logic/skill-input.js; this only shows the ring or the cheer star and measures the tap.
// Picture-first and spoken, like the question card, so a non-reader can play it.
import { h, onTap } from './dom.js';
import { ICON } from './icons.js';
import { say } from '../audio/speech.js';
import { RING, judgeRing, ringTimeout } from '../logic/skill-input.js';

const WORD = { indep: 'PERFECT!', hint: 'NICE!', support: 'GO!', cheer: 'YAY!' };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// taps this soon after the overlay opens are the move-button tap carrying on, not a try
const SETTLE_MS = 350;

export class SkillInputUI {
  constructor(layer, audio, buzz) {
    this.layer = layer;
    this.audio = audio;
    this.buzz = buzz;
  }

  // kind: 'ring' | 'cheer' (logic/skill-input.js offInputFor). Resolves to a quality.
  run(kind, actionKind = 'attack', move = null, ring = RING) {
    return new Promise((resolve) => {
      const t0 = performance.now();
      let done = false, timer = null;
      const color = (move && move.color) || '#FFC914';
      const target = h('button', {
        class: `si-target si-${kind}`, style: { '--mc': color }, 'aria-label': kind === 'ring' ? 'Tap when the ring lands' : 'Cheer',
        html: kind === 'cheer' ? ICON.star : actionKind === 'special' ? ICON.bolt : ICON.fist,
      });
      const ringEl = kind === 'ring' ? h('span', { class: 'si-ring', style: { '--beat': ring.beat + 'ms', '--mc': color } }) : null;
      const word = h('div', { class: 'si-word' });
      const root = h('div', { class: `skill-input si-${kind}-mode` }, h('div', { class: 'si-stage' }, ringEl, target, word));
      this.layer.appendChild(root);
      requestAnimationFrame(() => root.classList.add('in'));
      this.audio.sfx('pop');
      setTimeout(() => say(kind === 'ring' ? 'Tap when the ring lands!' : 'Tap the star to cheer!'), 200);

      const finish = async (q) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        root.classList.add('hit', `q-${q}`);
        word.textContent = WORD[q] || '';
        this.audio.sfx(q === 'support' ? 'select' : 'correct');
        this.buzz(q === 'indep' ? 'medium' : 'light');
        await wait(q === 'indep' ? 650 : 520);
        root.classList.remove('in');
        root.classList.add('out');
        await wait(240);
        root.remove();
        resolve(q);
      };

      onTap(target, () => {
        const ms = performance.now() - t0;
        if (ms < SETTLE_MS) return false;
        finish(kind === 'ring' ? judgeRing(ms, ring) : 'cheer');
      }, 150);
      // an untapped ring is a miss (base hit) once its beats run out; the cheer star waits
      if (kind === 'ring') timer = setTimeout(() => finish('support'), ringTimeout(ring));
    });
  }
}
