// Battle HUD (DOM): portraits, health, energy, status, action buttons.
import { h, onTap } from './dom.js';
import { ICON } from './icons.js';
import { drawToy, HEAD } from '../render/toys.js';
import { mix } from '../render/draw.js';
import { pixelLabel, getArtScale, isPixel, pixelize } from '../render/pixel.js';
import { get3D } from '../render3d/stage3d.js';
import { RULES } from '../logic/battle.js';

export function portrait(def, size, px, bg) {
  // In arcade mode the portrait is drawn on the game's pixel grid and scaled up.
  if (isPixel()) px = getArtScale();
  const c = document.createElement('canvas');
  if (isPixel()) c.classList.add('pxl');
  c.width = c.height = Math.round(size * px);
  c.style.width = c.style.height = size + 'px';
  const ctx = c.getContext('2d');
  const hd = HEAD[def.art?.draw] || HEAD.blocko;
  const k = (size * 0.5) / (hd.r * 0.92);
  ctx.scale(px, px);
  // comic-panel backdrop: two-tone burst rays behind the head
  const base = bg || def.accent || '#1B4FD8';
  ctx.fillStyle = mix(base, '#14111A', 0.35);
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = mix(base, '#ffffff', 0.08);
  const cx = size * 0.5, cy = size * 0.42;
  for (let i = 0; i < 14; i += 2) {
    const a0 = (i / 14) * Math.PI * 2, a1 = ((i + 1) / 14) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a0) * size, cy + Math.sin(a0) * size);
    ctx.lineTo(cx + Math.cos(a1) * size, cy + Math.sin(a1) * size);
    ctx.closePath();
    ctx.fill();
  }
  ctx.translate(size / 2 - hd.x * k, size / 2 - hd.y * k + size * 0.08);
  const s3 = get3D();
  if (s3) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(s3.snapshot(def, { w: c.width, h: c.height, framing: 'head' }), 0, 0);
    return c;
  }
  ctx.scale(k, k);
  drawToy(ctx, def, { t: 1000, eyes: 'open', mouth: 'smile' });
  if (isPixel()) pixelize(ctx, c.width, c.height);
  return c;
}

export class Hud {
  constructor(layer, { heroDef, foeDef, px, toVirtual, ...opts }) {
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
    this.ko = h('div', { class: 'ko-badge' }, pixelLabel('K.O.', 20, '#FF4A3A', { cls: 'ko-txt' }));
    this.pauseBtn = h('button', { class: 'pause-btn', 'aria-label': 'Pause', html: ICON.pause });
    onTap(this.pauseBtn, () => this.handlers.pause && this.handlers.pause());

    // 2×2 move menu (quick · power / guard · special), Pokémon-style.
    const learning = opts.learning !== false;
    const mk = (move) => {
      const slot = move.slot;
      const q = learning ? (slot === 'power' ? '123' : slot === 'special' ? 'ABC' : '') : '';
      const b = h('button', {
        class: `move move-${slot}`,
        style: { '--mc': move.color || '#FFC914' },
        'aria-label': move.name,
      },
      h('span', { class: 'move-ico', html: ICON[move.icon] || ICON.fist }),
      h('span', { class: 'move-name' }, pixelLabel(move.name, 14, '#ffffff', { maxW: 150 })),
      q ? h('span', { class: `move-q move-q-${slot}` }, q) : null,
      move.tag ? h('span', { class: 'move-tag' }, move.tag) : null); // loadout style (logic/gear.js)
      b.dataset.slot = slot;
      onTap(b, () => this.handlers.action && this.handlers.action(slot), 400);
      return b;
    };
    const moves = Object.fromEntries((heroDef.moves || []).map((m) => [m.slot, m]));
    this.btn = {};
    for (const slot of ['quick', 'power', 'guard', 'special']) {
      this.btn[slot] = mk(moves[slot] || { slot, name: slot, icon: 'fist' });
    }
    // a FAST special (loadout) is ready with fewer pips: the ring shows how many it needs
    this.specialCost = Math.max(1, Math.min(RULES.maxEnergy, (moves.special && moves.special.energyCost) || RULES.maxEnergy));
    this.ring = h('div', { class: 'special-ring' }, ...Array.from({ length: this.specialCost }, (_, i) => h('i', { style: { '--i': i } })));
    this.btn.special.appendChild(this.ring);
    this.actions = h('div', { class: 'actions moves hidden' }, this.btn.quick, this.btn.power, this.btn.guard, this.btn.special);
    this.hand = h('div', { class: 'tut-hand hidden', html: ICON.hand });
    this.el.append(this.panels.hero.root, this.panels.foe.root, this.ko, this.pauseBtn, this.actions, this.hand);
    layer.appendChild(this.el);
  }

  on(name, fn) {
    this.handlers[name] = fn;
  }

  panel(side, def, px) {
    const fill = h('div', { class: 'hp-fill' });
    const chip = h('div', { class: 'hp-chip' });
    const hp = h('div', { class: 'hp' }, h('div', { class: 'hp-track' }, chip, fill));
    const pips = side === 'hero'
      ? h('div', { class: 'energy' }, ...Array.from({ length: RULES.maxEnergy }, () => h('span', { class: 'pip', html: ICON.bolt })))
      : h('div', { class: 'charge-meter', 'aria-label': 'Charge' }); // filled by setMeter
    const status = h('div', { class: 'status' });
    const root = h('div', { class: `panel panel-${side}` },
      h('div', { class: 'portrait' }, portrait(def, 62, px * 1.2)),
      h('div', { class: 'panel-body' }, hp, h('div', { class: 'pname' }, pixelLabel(def.name, 19, '#FFC914')), pips, status));
    return { root, fill, chip, pips, status };
  }

  setHP(side, hp, max, instant = false) {
    const p = this.panels[side];
    const pct = Math.max(0, Math.min(100, (hp / max) * 100));
    p.fill.style.width = pct + '%';
    p.root.classList.toggle('low', pct <= 30);
    p.root.classList.toggle('mid', pct > 30 && pct <= 60);
    this.ko.classList.toggle('hot', Object.values(this.panels).some((q) => q.root.classList.contains('low')));
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
    const full = n >= this.specialCost;
    this.btn.special.classList.toggle('ready', full);
    this.btn.special.classList.toggle('locked', !full);
  }

  // The foe's charge meter: one flame per pip, lit by wrong answers. Full = the
  // foe is winding up (the meter pulses). pulse: pop newly lit flames.
  setMeter({ meter, max, windup }, pulse = false) {
    const el = this.panels.foe.pips;
    while (el.children.length < max) el.appendChild(h('span', { class: 'cpip', html: ICON.flame }));
    while (el.children.length > max) el.lastChild.remove();
    [...el.children].forEach((p, i) => {
      const was = p.classList.contains('on');
      p.classList.toggle('on', i < meter);
      if (pulse && !was && i < meter) {
        p.classList.remove('pop');
        void p.offsetWidth;
        p.classList.add('pop');
      }
    });
    el.classList.toggle('full', !!windup);
  }

  meterAnchor() {
    const r = this.toVirtual(this.panels.foe.pips.getBoundingClientRect());
    return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
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
    this.btn.guard.classList.toggle('suggest', !!(on && opts.suggestDefend));
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
