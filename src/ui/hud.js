// Battle HUD (DOM): portraits, health, energy, status, action buttons.
import { h, onTap } from './dom.js';
import { ICON } from './icons.js';
import { drawToy, HEAD } from '../render/toys.js';
import { RULES } from '../logic/battle.js';

export function portrait(def, size, px, bg) {
  const c = document.createElement('canvas');
  c.width = c.height = Math.round(size * px);
  c.style.width = c.style.height = size + 'px';
  const ctx = c.getContext('2d');
  const hd = HEAD[def.art?.draw] || HEAD.blocko;
  const k = (size * 0.5) / (hd.r * 0.92);
  ctx.scale(px, px);
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = bg || def.accent || '#fff';
  ctx.fill();
  ctx.clip();
  ctx.translate(size / 2 - hd.x * k, size / 2 - hd.y * k + size * 0.08);
  ctx.scale(k, k);
  drawToy(ctx, def, { t: 1000, eyes: 'open', mouth: 'smile' });
  return c;
}

export class Hud {
  constructor(layer, { heroDef, foeDef, px, toVirtual }) {
    this.layer = layer;
    this.toVirtual = toVirtual;
    this.heroDef = heroDef;
    this.foeDef = foeDef;
    this.handlers = {};
    this.el = h('div', { class: 'hud' });
    this.panels = {
      hero: this.panel('hero', heroDef, px),
      foe: this.panel('foe', foeDef, px),
    };
    this.pauseBtn = h('button', { class: 'pause-btn', 'aria-label': 'Pause', html: ICON.pause });
    onTap(this.pauseBtn, () => this.handlers.pause && this.handlers.pause());

    const mk = (kind, icon, cls) => {
      const b = h('button', { class: `act act-${kind} ${cls || ''}`, 'aria-label': kind, html: `<span class="ico">${icon}</span>` });
      onTap(b, () => this.handlers.action && this.handlers.action(kind), 400);
      return b;
    };
    this.btn = {
      attack: mk('attack', ICON.fist),
      defend: mk('defend', ICON.shield),
      special: mk('special', ICON.bolt),
    };
    this.ring = h('div', { class: 'special-ring' }, ...Array.from({ length: RULES.maxEnergy }, (_, i) => h('i', { style: { '--i': i } })));
    this.btn.special.appendChild(this.ring);
    this.actions = h('div', { class: 'actions hidden' }, this.btn.defend, this.btn.attack, this.btn.special);
    this.hand = h('div', { class: 'tut-hand hidden', html: ICON.hand });
    this.el.append(this.panels.hero.root, this.panels.foe.root, this.pauseBtn, this.actions, this.hand);
    layer.appendChild(this.el);
  }

  on(name, fn) {
    this.handlers[name] = fn;
  }

  panel(side, def, px) {
    const fill = h('div', { class: 'hp-fill' });
    const chip = h('div', { class: 'hp-chip' });
    const hp = h('div', { class: 'hp' }, h('span', { class: 'hp-heart', html: ICON.heart }), h('div', { class: 'hp-track' }, chip, fill));
    const pips = side === 'hero'
      ? h('div', { class: 'energy' }, ...Array.from({ length: RULES.maxEnergy }, () => h('span', { class: 'pip', html: ICON.bolt })))
      : null;
    const status = h('div', { class: 'status' });
    const root = h('div', { class: `panel panel-${side}` },
      h('div', { class: 'portrait' }, portrait(def, 62, px * 1.2)),
      h('div', { class: 'panel-body' }, h('div', { class: 'pname' }, def.name), hp, pips, status));
    return { root, fill, chip, pips, status };
  }

  setHP(side, hp, max, instant = false) {
    const p = this.panels[side];
    const pct = Math.max(0, Math.min(100, (hp / max) * 100));
    p.fill.style.width = pct + '%';
    p.root.classList.toggle('low', pct <= 30);
    p.root.classList.toggle('mid', pct > 30 && pct <= 60);
    if (instant) {
      p.chip.style.transition = 'none';
      p.fill.style.transition = 'none';
      p.chip.style.width = pct + '%';
      void p.chip.offsetWidth;
      p.chip.style.transition = '';
      p.fill.style.transition = '';
    } else {
      p.chip.style.width = pct + '%';
      p.root.classList.remove('hit');
      void p.root.offsetWidth;
      p.root.classList.add('hit');
    }
  }

  setEnergy(n, pulse = false) {
    const pips = this.panels.hero.pips.children;
    for (let i = 0; i < pips.length; i++) {
      const was = pips[i].classList.contains('on');
      pips[i].classList.toggle('on', i < n);
      if (pulse && !was && i < n) {
        pips[i].classList.remove('pop');
        void pips[i].offsetWidth;
        pips[i].classList.add('pop');
      }
    }
    [...this.ring.children].forEach((seg, i) => seg.classList.toggle('on', i < n));
    const full = n >= RULES.maxEnergy;
    this.btn.special.classList.toggle('ready', full);
    this.btn.special.classList.toggle('locked', !full);
  }

  setStatus(side, st) {
    const el = this.panels[side].status;
    el.innerHTML = '';
    if (st.shield) el.appendChild(h('span', { class: 'st st-shield', html: ICON.shield }));
    if (st.charged) el.appendChild(h('span', { class: 'st st-fire', html: ICON.fire }));
    if (st.dizzy) el.appendChild(h('span', { class: 'st st-dizzy', html: ICON.dizzy }));
  }

  showActions(on, opts = {}) {
    this.actions.classList.toggle('hidden', !on);
    this.btn.defend.classList.toggle('suggest', !!(on && opts.suggestDefend));
    this.btn.special.classList.toggle('suggest', !!(on && opts.suggestSpecial));
  }

  pointAt(kind) {
    clearTimeout(this._pt);
    if (!kind) {
      this.hand.classList.add('hidden');
      return;
    }
    // wait for the action bar to finish sliding in before measuring
    this._pt = setTimeout(() => this.placeHand(kind), 380);
  }

  placeHand(kind) {
    if (this.actions.classList.contains('hidden')) return;
    const r = this.toVirtual(this.btn[kind].getBoundingClientRect());
    this.hand.style.left = r.x + r.w * 0.55 + 'px';
    this.hand.style.top = r.y + r.h * 0.45 + 'px';
    this.hand.classList.remove('hidden');
  }

  energyAnchor(i) {
    const pips = this.panels.hero.pips.children;
    const pip = pips[Math.min(pips.length - 1, i)] || pips[0];
    const r = this.toVirtual(pip.getBoundingClientRect());
    return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  }

  setPauseVisible(on) {
    this.pauseBtn.classList.toggle('hidden', !on);
  }

  destroy() {
    this.el.remove();
  }
}
