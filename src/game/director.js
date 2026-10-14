// Choreography: turns battle events into anticipation -> movement -> impact ->
// reaction -> recovery, with sound and haptics fired at the moment of impact.
import { Ease } from '../engine/time.js';
import { buzz } from '../haptics.js';
import * as FXM from '../render/fx-moves.js';

const WORDS = { indep: ['WHAM!', 'POW!!', 'KAPOW!'], hint: ['POW!', 'BAM!'], support: ['pow!', 'bop!'] };
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export class Director {
  constructor(stage, audio) {
    this.stage = stage;
    this.audio = audio;
    this.clock = stage.clock;
    this.fx = stage.fx;
    this.zzzTimer = 0;
    stage.onFrame = (real) => this.tick(real);
  }
  get hero() { return this.stage.fighters.hero; }
  get foe() { return this.stage.fighters.foe; }
  other(f) { return f === this.hero ? this.foe : this.hero; }
  to(obj, props, dur, ease, delay) { return this.clock.to(obj, props, dur, ease, delay); }
  wait(ms) { return this.clock.wait(ms); }

  tick(real) {
    const t = this.clock.time;
    this.zzzTimer += real;
    for (const f of [this.hero, this.foe]) {
      if (!f) continue;
      if (f.cheer) f.oy = -Math.abs(Math.sin(t / 190)) * 28;
      if (f.tired && this.zzzTimer > 900) {
        const hd = f.head();
        this.fx.zzz(hd.x + 20 * f.flip, hd.top + 20);
      }
    }
    if (this.zzzTimer > 900) this.zzzTimer = 0;
  }

  reset(f) {
    this.clock.killTweensOf(f);
    Object.assign(f, { ox: 0, oy: 0, rot: 0, sx: 1, sy: 1, alpha: 1, eyes: 'open', mouth: 'smile', armF: -0.2, armB: 0.25, trailOn: false, cheer: false, tired: false, dizzy: false, charged: false, aura: 0, shield: 0, arrow: 0 });
  }

  setTurn(side) {
    for (const f of [this.hero, this.foe]) {
      if (!f) continue;
      const on = (side === 'hero' && f === this.hero) || (side === 'foe' && f === this.foe);
      f.arrowColor = f === this.hero ? '#FFC914' : '#FF5A4A';
      this.to(f, { arrow: on ? 1 : 0 }, 200);
    }
  }

  // ---------------- intro ----------------
  async intro() {
    const { hero, foe } = this;
    hero.ox = -this.stage.W * 0.45;
    foe.oy = -520;
    foe.alpha = 1;
    this.audio.sfx('whoosh');
    hero.trailOn = true;
    await this.to(hero, { ox: 0 }, 480, Ease.outCubic);
    hero.trailOn = false;
    this.squash(hero, 1.15, 0.85, 220);
    this.fx.puff(hero.x - 40, hero.y, 6);
    this.audio.sfx('fall');
    await this.to(foe, { oy: 0 }, 420, Ease.inQuad);
    this.audio.sfx('land');
    this.stage.shake(0.35);
    buzz('medium');
    this.fx.puff(foe.x, foe.y, 10);
    this.fx.ring(foe.x, foe.y, { rx: 30, ry: 8, grow: 120, color: '#fff' });
    await this.squash(foe, 1.25, 0.75, 260);
    // little taunts
    hero.eyes = 'happy';
    this.to(hero, { armF: -2.4 }, 180, Ease.outBack);
    foe.eyes = 'angry';
    await this.wait(500);
    hero.eyes = 'open';
    foe.eyes = 'open';
    await this.to(hero, { armF: -0.2 }, 220);
    // arcade announcer cards
    const cx = this.stage.W / 2;
    this.fx.word('ROUND 1', cx, 190, { size: 60, life: 950, color: '#FFC914', rot: 0 });
    this.audio.sfx('select');
    await this.wait(900);
    this.fx.word('FIGHT!', cx, 200, { size: 92, life: 800, color: '#F46036', rot: 0 });
    this.audio.sfx('whoosh');
    this.stage.shake(0.25);
    buzz('light');
    await this.wait(550);
  }

  squash(f, sx, sy, dur) {
    f.sx = sx;
    f.sy = sy;
    return this.to(f, { sx: 1, sy: 1 }, dur, Ease.outElastic);
  }

  // ---------------- attacks ----------------
  async lunge(att, def, { onImpact, power = 1, word = 'POW!', big = false, dash = false }) {
    const gap = def.x - att.x;
    const dx = gap - Math.sign(gap) * (dash ? 110 : 140);
    // anticipation: gritted, determined wind-up
    att.mouth = 'grit';
    this.audio.sfx('whoosh');
    await Promise.all([
      this.to(att, { sx: 1.1, sy: 0.88, rot: -0.14, armF: 1.1 }, 200, Ease.outQuad),
      this.to(att, { ox: -18 * att.flip }, 200, Ease.outQuad),
    ]);
    // strike
    att.trailOn = true;
    att.mouth = 'open';
    this.fx.speed(att.x + att.ox, att.center().y - 10, att.flip);
    await Promise.all([
      this.to(att, { ox: dx, sx: 1, sy: 1, rot: 0.12, armF: -1.57 }, 170, Ease.inQuad),
      this.to(att, { oy: -26 }, 85, Ease.outQuad).then(() => this.to(att, { oy: 0 }, 85, Ease.inQuad)),
    ]);
    att.trailOn = false;
    await onImpact({ power, word, big });
    // recover
    att.mouth = 'smile';
    await this.to(att, { ox: 0, rot: 0, armF: -0.2 }, 320, Ease.outCubic);
  }

  impactAt(def, { power = 1, word = 'POW!', big = false, blocked = false, color }) {
    const c = def.center();
    const hx = c.x - 40 * def.flip, hy = c.y - 10;
    if (blocked) {
      this.audio.sfx('block');
      buzz('light');
      this.stage.hitStop(60);
      this.stage.shake(0.15);
      this.fx.burst(hx - 30 * def.flip, hy, { count: 12, colors: ['#ffffff', '#4EA8DE'], speed: 300, kind: 'spark', gravity: 0 });
      this.fx.impact(hx - 20 * def.flip, hy, { size: 60, colors: ['#4EA8DE', '#ffffff'], life: 260 });
      this.fx.word('BLOCK!', hx, hy - 70, { color: '#4EA8DE', size: 46 });
      def.flash = 0.5;
      def.shield = 1.25;
      this.to(def, { shield: 1 }, 260);
      return;
    }
    this.audio.sfx(big ? 'bigHit' : power < 0.8 ? 'softHit' : 'hit');
    buzz(big ? 'heavy' : 'medium');
    this.stage.hitStop(big ? 140 : power >= 1.1 ? 100 : 70);
    this.stage.shake(big ? 0.75 : 0.32 * power);
    if (big) this.stage.flash(0.3);
    this.fx.impact(hx, hy, { size: big ? 120 : 78 * Math.max(0.8, power) });
    this.fx.burst(hx, hy, { count: big ? 26 : Math.round(14 * power), speed: big ? 480 : 320, size: big ? 13 : 10 });
    this.fx.ring(hx, hy, { rx: 10, ry: 10, grow: big ? 140 : 90, color: '#fff', width: 7 });
    this.fx.word(word, hx, hy - 80, { size: big ? 72 : 50 * Math.max(0.8, power), color: color || '#ffd23f' });
    // reaction
    def.flash = 1;
    def.eyes = 'squint';
    def.mouth = 'o';
    const kb = 30 * power * -def.flip;
    this.to(def, { ox: kb, rot: -0.2 }, 90, Ease.outQuad).then(async () => {
      await this.to(def, { ox: 0, rot: 0 }, 380, Ease.outBack);
      if (!def.tired && !def.dizzy) { def.eyes = 'open'; def.mouth = 'smile'; }
    });
  }

  // ======================================================================
  // Moves. Every move works both ways (hero → foe and foe → hero), so the
  // opponent fights with its own moveset and its own special.
  // `ev` is the damage event for the final hit: { blocked, dodged, perfect, guard }.
  // ======================================================================

  pt(f, name) {
    return (f.point && f.point(name)) || (name === 'head' ? f.head() : f.center());
  }

  // Final hit of any move: impact / block / dodge visuals.
  strike(def, ev = {}, { power = 1, word = 'POW!', big = false, color } = {}) {
    if (ev.dodged) return this.dodgeAway(def, ev);
    if (ev.perfect) {
      const c = def.center();
      this.audio.sfx('block');
      this.audio.sfx('perfect');
      buzz('medium');
      this.stage.hitStop(120);
      this.stage.flash(0.35, '#bfefff');
      this.fx.burst(c.x, c.y - 20, { count: 22, colors: ['#ffffff', '#4EA8DE', '#FFC914'], kind: 'star', speed: 380 });
      this.fx.word('PERFECT!', c.x, c.y - 120, { color: '#4EA8DE', size: 58 });
      def.shield = 1.35;
      this.to(def, { shield: 1 }, 300);
      def.eyes = 'happy';
      return;
    }
    this.impactAt(def, { power, word, big, blocked: ev.blocked, color });
  }

  async dodgeAway(def, ev) {
    const c = def.center();
    this.audio.sfx('whoosh');
    this.fx.word(ev.perfect ? 'DODGE!' : 'MISS!', c.x, c.y - 120, { color: '#B9D8FF', size: 52 });
    this.fx.speed(def.x + def.ox, c.y, -def.flip);
    def.trailOn = true;
    await Promise.all([
      this.to(def, { ox: -70 * def.flip, alpha: 0.45 }, 140, Ease.outQuad),
      this.to(def, { oy: -60 }, 140, Ease.outQuad),
    ]);
    def.trailOn = false;
    await Promise.all([this.to(def, { ox: 0, oy: 0, alpha: 1 }, 320, Ease.outBack)]);
    def.eyes = 'happy';
    def.mouth = 'smile';
  }

  qualityPower(quality, slot) {
    const base = { indep: 1.2, hint: 1, support: 0.8, none: 1 }[quality] || 1;
    return slot === 'quick' ? base * 0.8 : base;
  }

  // quick / power moves
  async attack(att, def, move, { quality = 'none', ev = {}, applyHit = () => {} } = {}) {
    const power = this.qualityPower(quality, move.slot);
    const word = quality === 'indep' && move.slot === 'power' ? (move.word || 'POW!').replace('!', '!!') : move.word || 'POW!';
    const big = move.slot === 'power' && quality === 'indep';
    const onHit = async () => {
      this.strike(def, ev, { power, word, big, color: move.color });
      applyHit();
      await this.wait(240);
    };
    switch (move.anim) {
      case 'shot': return this.shot(att, def, move, onHit);
      case 'ground': return this.ground(att, def, move, onHit);
      case 'dancers': return this.dancers(att, def, move, onHit);
      default: return this.lunge(att, def, { power, onImpact: onHit, dash: move.dash });
    }
  }

  async shot(att, def, move, onHit) {
    const shots = move.shots || 1;
    att.mouth = 'grit';
    att.cannon = 0;
    this.audio.sfx('charge');
    await Promise.all([this.to(att, { sx: 1.06, sy: 0.94, armF: -1.4, cannon: 1 }, 220, Ease.outQuad)]);
    const target = def.center();
    let last;
    for (let i = 0; i < shots; i++) {
      const m = this.pt(att, shots > 1 ? (i ? 'muzzle2' : 'muzzle') : 'muzzle');
      this.audio.sfx('whoosh');
      this.to(att, { ox: -16 * att.flip }, 60).then(() => this.to(att, { ox: 0 }, 160));
      last = this.fx.add(FXM.bolt({ x0: m.x, y0: m.y, x1: target.x + (i - (shots - 1) / 2) * 20, y1: target.y - 10, color: move.color, size: move.lob ? 18 : 15, life: move.lob ? 560 : 340, arc: move.lob ? 140 : 18 }));
      if (i < shots - 1) {
        await last;
        this.fx.burst(target.x, target.y, { count: 8, colors: [move.color, '#ffffff'], speed: 240 });
        this.audio.sfx('hit');
        def.flash = 0.6;
      }
    }
    await last;
    if (move.lob) this.fx.burst(target.x, target.y, { count: 18, colors: [move.color, '#ffffff'], kind: 'puff', speed: 200 });
    await onHit();
    att.mouth = 'smile';
    await this.to(att, { sx: 1, sy: 1, armF: -0.2, cannon: 0 }, 260, Ease.outCubic);
  }

  async ground(att, def, move, onHit) {
    att.mouth = 'grit';
    this.audio.sfx('jump');
    await this.to(att, { sy: 0.82, sx: 1.12 }, 180);
    this.audio.sfx('boom');
    this.stage.shake(0.3);
    await this.to(att, { sy: 1, sx: 1 }, 160, Ease.outBack);
    this.fx.puff(def.x, def.y, 8, '#8A5A3C');
    const p = this.fx.add(FXM.spikes({ x: def.x, y: def.y + 4, color: move.color, count: 5, spread: 70, height: 130, life: 800 }));
    await this.wait(220);
    await onHit();
    await p;
    att.mouth = 'smile';
  }

  async dancers(att, def, move, onHit) {
    att.mouth = 'open';
    att.eyes = 'happy';
    this.audio.sfx('powerUp');
    const x0 = att.x + 60 * att.flip, x1 = def.x - 30 * att.flip;
    let last;
    for (let i = 0; i < 3; i++) {
      last = this.fx.add(FXM.hopper({ x0: x0 + i * 12 * att.flip, x1, y: def.y - 12, color: i === 1 ? '#FFC914' : move.color, size: 15 + i * 2, hops: 4 + i, life: 900, delay: i * 150 }));
    }
    await this.wait(900);
    this.fx.burst(def.x, def.y - 40, { count: 16, colors: ['#FF7A1A', '#FFC914', '#ffffff'], kind: 'spark', speed: 300, gravity: -200 });
    await last;
    await onHit();
    att.eyes = 'open';
    att.mouth = 'smile';
  }

  // ---------------- guards ----------------
  async guardUp(f, move) {
    f.guardType = move.guard || 'block';
    f.guardColor = move.color || '#4EA8DE';
    this.audio.sfx(f.guardType === 'dodge' ? 'whoosh' : 'shieldUp');
    buzz('light');
    await this.to(f, { sy: 0.9, sx: 1.06, armF: -1.2 }, 150);
    await Promise.all([
      this.to(f, { shield: 1 }, 360, Ease.outBack),
      this.to(f, { sy: 1, sx: 1 }, 300, Ease.outBack),
    ]);
    const c = f.center();
    this.fx.word(move.name.toUpperCase(), c.x, c.y - 150, { color: move.color, size: 34, life: 800 });
    this.fx.burst(c.x + 60 * f.flip, c.y, { count: 10, colors: ['#ffffff', move.color], speed: 200, gravity: -50 });
    await this.to(f, { armF: -0.5 }, 200);
  }

  shieldOff(f) {
    if (f.shield > 0) {
      this.fx.burst(f.center().x + 60 * f.flip, f.center().y, { count: 8, colors: ['#ffffff', f.guardColor || '#4EA8DE'], speed: 160, gravity: 200 });
      this.to(f, { shield: 0 }, 300);
    }
  }

  // Blazing Bark: the attacker gets singed.
  singe(f, applyHit) {
    const c = f.center();
    this.audio.sfx('hit');
    f.flash = 0.8;
    this.fx.burst(c.x, c.y, { count: 14, colors: ['#FF8A1F', '#FFC914', '#ffffff'], kind: 'spark', speed: 260, gravity: -220 });
    this.fx.word('SINGED!', c.x, c.y - 120, { color: '#FF8A1F', size: 40 });
    applyHit && applyHit();
  }

  // ---------------- foe telegraph ----------------
  async foeCharge(move) {
    const { foe } = this;
    this.audio.sfx('charge');
    foe.auraColor = (move && move.color) || '#ff6b2b';
    this.stage.zoomTo(1.07, 400, foe.x, foe.y - 100);
    foe.eyes = 'angry';
    await this.to(foe, { aura: 1, sy: 0.9, sx: 1.08 }, 600, Ease.outQuad);
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2;
      const c = foe.center();
      this.fx.orb(c.x + Math.cos(a) * 140, c.y + Math.sin(a) * 110, c.x, c.y, foe.auraColor, i * 50);
    }
    foe.charged = true;
    this.audio.sfx('warn');
    this.stage.shake(0.2);
    await this.to(foe, { sy: 1, sx: 1 }, 300, Ease.outBack);
    await this.stage.zoomTo(1, 350);
    this.to(foe, { aura: 0.45 }, 300);
  }

  async foeDizzySkip() {
    const { foe } = this;
    this.audio.sfx('dizzy');
    for (let i = 0; i < 3; i++) {
      await this.to(foe, { rot: 0.18 }, 160, Ease.inOutQuad);
      await this.to(foe, { rot: -0.18 }, 160, Ease.inOutQuad);
    }
    await this.to(foe, { rot: 0 }, 140);
    foe.dizzy = false;
    foe.eyes = 'open';
    foe.mouth = 'smile';
    this.fx.puff(foe.head().x, foe.head().top + 10, 6);
    this.squash(foe, 0.9, 1.1, 300);
    await this.wait(250);
  }

  // ---------------- specials ----------------
  async chargeUp(f, color) {
    f.auraColor = color;
    this.audio.sfx('powerUp');
    this.audio.sfx('charge');
    buzz('light');
    this.stage.zoomTo(1.1, 500, f.x, f.y - 110);
    f.eyes = 'angry';
    f.mouth = 'open';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const c = f.center();
      this.fx.orb(c.x + Math.cos(a) * 170, c.y + Math.sin(a) * 130, c.x, c.y, color, i * 40);
    }
    await this.to(f, { aura: 1, sy: 0.86, sx: 1.1 }, 700, Ease.outQuad);
    await this.to(f, { sy: 1, sx: 1 }, 200, Ease.outBack);
  }

  // Small hit during a multi-hit special (no HP change).
  tap(def, color) {
    const c = def.center();
    this.audio.sfx('softHit');
    buzz('light');
    def.flash = 0.7;
    def.eyes = 'squint';
    this.stage.shake(0.15);
    this.fx.impact(c.x + (Math.random() - 0.5) * 50, c.y + (Math.random() - 0.5) * 60, { size: 54, colors: [color, '#FFC914'], life: 220 });
  }

  async finishSpecial(att, def, ev, color, word, applyHit) {
    this.strike(def, ev, { power: 1.4, word, big: true, color });
    if (!ev.blocked && !ev.dodged) {
      this.audio.sfx('boom');
      buzz('heavy');
      this.stage.hitStop(140);
      this.stage.flash(0.3);
    }
    applyHit();
    att.aura = 0;
    await this.wait(420);
    await this.stage.zoomTo(1, 300);
    if (!att.tired) { att.eyes = 'open'; att.mouth = 'smile'; }
  }

  async special(att, def, move, { quality = 'none', ev = {}, applyHit = () => {} } = {}) {
    const fn = {
      rexCannon: this.spRexCannon, hauntedForest: this.spHauntedForest, tidalRage: this.spTidalRage,
      swordInStone: this.spSwordInStone, potionStorm: this.spPotionStorm, midnightStorm: this.spMidnightStorm,
      fetchFrenzy: this.spFetchFrenzy, encore: this.spEncore,
    }[move.id] || this.spGeneric;
    await fn.call(this, att, def, move, quality, ev, applyHit);
  }

  async spGeneric(att, def, move, q, ev, applyHit) {
    await this.chargeUp(att, move.color);
    await this.lunge(att, def, { power: 1.4, onImpact: () => this.finishSpecial(att, def, ev, move.color, 'BOOM!', applyHit) });
  }

  async spRexCannon(att, def, move, q, ev, applyHit) {
    await this.chargeUp(att, move.color);
    this.audio.sfx('charge');
    await this.to(att, { cannon: 1, sy: 0.92 }, 360, Ease.outBack);
    const m = this.pt(att, 'muzzle');
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      this.fx.orb(m.x + Math.cos(a) * 90, m.y + Math.sin(a) * 70, m.x, m.y, '#FFC914', i * 35);
    }
    await this.wait(480);
    const c = def.center();
    this.audio.sfx('boom');
    this.stage.shake(0.5);
    this.to(att, { ox: -40 * att.flip }, 90).then(() => this.to(att, { ox: 0 }, 500, Ease.outCubic));
    const b = this.fx.add(FXM.beam({ x0: m.x, y0: m.y, x1: c.x, y1: c.y - 10, color: move.color, width: q === 'indep' ? 58 : 46, life: 760 }));
    await this.wait(160);
    this.fx.word('REX CANNON!', (m.x + c.x) / 2, m.y - 70, { size: 46, color: '#FF7A1A' });
    for (let i = 0; i < 2; i++) { await this.wait(150); this.tap(def, move.color); }
    await this.finishSpecial(att, def, ev, move.color, 'KA-BOOM!', applyHit);
    await b;
    await this.to(att, { cannon: 0, sy: 1 }, 300);
  }

  async spHauntedForest(att, def, move, q, ev, applyHit) {
    await this.chargeUp(att, move.color);
    this.stage.dim = 0.3;
    this.audio.sfx('warn');
    const spots = [-150, 150, -80, 90];
    const trees = spots.map((dx, i) => this.fx.add(FXM.shadowTree({ x: def.x + dx, y: def.y + 8 - (i % 2) * 10, h: 190 + (i % 3) * 30, dir: dx < 0 ? 1 : -1, swatAt: 0.35 + i * 0.12, life: 1700, delay: i * 120, glow: move.color })));
    this.fx.word('HAUNTED FOREST!', def.x, def.y - 260, { size: 44, color: move.color, life: 1200 });
    await this.wait(700);
    for (let i = 0; i < 3; i++) { this.tap(def, move.color); await this.wait(200); }
    await this.finishSpecial(att, def, ev, move.color, 'BOO-OOM!', applyHit);
    await Promise.all(trees);
    this.stage.dim = 0;
  }

  async spTidalRage(att, def, move, q, ev, applyHit) {
    await this.chargeUp(att, move.color);
    const dir = att.flip;
    const W = this.stage.W;
    this.audio.sfx('boom');
    this.fx.word('TIDAL RAGE!', W / 2, 140, { size: 52, color: move.color, life: 1100 });
    const w = this.fx.add(FXM.wave({ x0: dir > 0 ? -200 : W + 200, x1: dir > 0 ? W + 300 : -300, y: Math.max(att.y, def.y) + 30, height: 300, dir, color: move.color, life: 1300 }));
    this.stage.shake(0.6);
    await this.wait(620);
    this.tap(def, move.color);
    await this.wait(300);
    // the school swoops in
    const c = def.center();
    const n = q === 'indep' ? 6 : 4;
    let last;
    for (let i = 0; i < n; i++) {
      const fromX = dir > 0 ? -60 - i * 30 : W + 60 + i * 30;
      last = this.fx.add(FXM.fish({ x0: fromX, y0: 80 + (i % 3) * 60, x1: c.x + (Math.random() - 0.5) * 40, y1: c.y + (Math.random() - 0.5) * 50, life: 560, arc: 80 + i * 10, delay: i * 130, size: 24, onHit: () => this.tap(def, '#4EA8DE') }));
    }
    await last;
    await this.finishSpecial(att, def, ev, move.color, 'SPLASH!', applyHit);
    await w;
  }

  async spSwordInStone(att, def, move, q, ev, applyHit) {
    await this.chargeUp(att, move.color);
    const sx = att.x + 90 * att.flip;
    this.audio.sfx('boom');
    this.stage.shake(0.3);
    const st = this.fx.add(FXM.stone({ x: sx, y: att.y + 4, pullAt: 0.5, life: 1700 }));
    await this.wait(500);
    // pull the sword free
    await this.to(att, { ox: 40 * att.flip, armF: -0.8 }, 220, Ease.outQuad);
    await this.wait(250);
    this.audio.sfx('perfect');
    this.stage.flash(0.45, '#FFE77A');
    att.cheer = true;
    this.fx.burst(sx, att.y - 150, { count: 24, colors: ['#FFC914', '#ffffff'], kind: 'star', speed: 320 });
    this.fx.word('SWORD IN THE STONE!', this.stage.W / 2, 130, { size: 40, color: '#FFC914', life: 1200 });
    await this.wait(600);
    att.cheer = false;
    att.oy = 0;
    const c = def.center();
    await this.lunge(att, def, {
      power: 1.5,
      onImpact: async () => {
        this.fx.add(FXM.slash({ x: c.x, y: c.y, r: 150, dir: att.flip, color: '#FFC914', life: 460 }));
        await this.finishSpecial(att, def, ev, '#FFC914', 'EXCALI-BAM!', applyHit);
      },
    });
    await st;
  }

  async spPotionStorm(att, def, move, q, ev, applyHit) {
    await this.chargeUp(att, move.color);
    const c = def.center();
    const sw = this.fx.add(FXM.swirl({ cx: c.x, cy: c.y, r: 150, color: move.color, life: 1500 }));
    this.fx.word('POTION STORM!', c.x, 120, { size: 48, color: move.color, life: 1100 });
    let last;
    for (let i = 0; i < 4; i++) {
      last = this.fx.add(FXM.potion({ x: c.x + (i - 1.5) * 40, y0: -60, y1: c.y - 20 + (i % 2) * 20, color: i % 2 ? '#A777E0' : move.color, life: 480, delay: i * 180, onHit: () => { this.tap(def, move.color); this.fx.burst(c.x, c.y, { count: 8, kind: 'puff', colors: [move.color], speed: 160 }); } }));
    }
    await last;
    await this.finishSpecial(att, def, ev, move.color, 'KA-POOF!', applyHit);
    await sw;
  }

  async spMidnightStorm(att, def, move, q, ev, applyHit) {
    await this.chargeUp(att, move.color);
    this.stage.dim = 0.35;
    this.audio.sfx('jump');
    await this.to(att, { oy: -150 }, 400, Ease.outQuad);
    const c = def.center();
    this.fx.word('MIDNIGHT STORM!', this.stage.W / 2, 120, { size: 48, color: move.color, life: 1300 });
    const sw = this.fx.add(FXM.swirl({ cx: c.x, cy: c.y, r: 190, color: move.color, life: 1800, arms: 5 }));
    const n = q === 'indep' ? 8 : 6;
    let last;
    for (let i = 0; i < n; i++) {
      last = this.fx.add(FXM.ghost({ cx: c.x, cy: c.y, r0: 230, phase: (i / n) * Math.PI * 2, life: 1300, delay: i * 80, size: 20 + (i % 3) * 4, onHit: i % 2 ? () => this.tap(def, move.color) : null }));
    }
    await last;
    await this.finishSpecial(att, def, ev, move.color, 'BOO-YAH!', applyHit);
    await this.to(att, { oy: 0 }, 380, Ease.inQuad);
    this.squash(att, 1.2, 0.8, 300);
    await sw;
    this.stage.dim = 0;
  }

  // Remy Roo: a volley of tennis balls, then a happy zoomie lap
  async spFetchFrenzy(att, def, move, q, ev, applyHit) {
    await this.chargeUp(att, move.color);
    att.eyes = 'happy';
    att.mouth = 'open';
    this.audio.sfx('jump');
    const m = this.pt(att, 'muzzle');
    const c = def.center();
    this.fx.word('FETCH FRENZY!', this.stage.W / 2, 120, { size: 48, color: move.color, life: 1200 });
    const n = q === 'indep' ? 6 : 4;
    let last;
    for (let i = 0; i < n; i++) {
      this.to(att, { sy: 0.9, sx: 1.08 }, 70).then(() => this.to(att, { sy: 1, sx: 1 }, 120));
      last = this.fx.add(FXM.tennisBall({
        x0: m.x, y0: m.y, x1: c.x + (Math.random() - 0.5) * 50, y1: c.y + (Math.random() - 0.5) * 60,
        arc: 120 + (i % 3) * 50, life: 520, delay: i * 150,
        onHit: () => { this.tap(def, move.color); this.fx.burst(c.x, c.y, { count: 6, kind: 'puff', colors: ['#C8E63C'], speed: 160 }); },
      }));
    }
    await last;
    await this.lunge(att, def, { power: 1.3, dash: true, onImpact: () => this.finishSpecial(att, def, ev, move.color, 'BOING!', applyHit) });
  }

  // Billy Bass: sings an encore; the notes spin the foe around
  async spEncore(att, def, move, q, ev, applyHit) {
    await this.chargeUp(att, move.color);
    att.mouth = 'open';
    this.stage.dim = 0.25;
    this.audio.sfx('powerUp');
    const c = def.center();
    this.fx.word('ENCORE!', this.stage.W / 2, 120, { size: 56, color: move.color, life: 1300 });
    const sw = this.fx.add(FXM.swirl({ cx: c.x, cy: c.y, r: 150, color: '#C8E63C', life: 1500, arms: 3 }));
    // he bobs and flaps along to his own song
    const bob = (async () => {
      for (let i = 0; i < 4; i++) {
        await this.to(att, { rot: 0.12, sy: 1.06 }, 150, Ease.inOutQuad);
        await this.to(att, { rot: -0.1, sy: 0.96 }, 150, Ease.inOutQuad);
      }
      await this.to(att, { rot: 0, sy: 1 }, 120);
    })();
    const n = q === 'indep' ? 8 : 6;
    let last;
    for (let i = 0; i < n; i++) {
      last = this.fx.add(FXM.note({ cx: c.x, cy: c.y, r0: 230, phase: (i / n) * Math.PI * 2, color: i % 2 ? '#FFC914' : '#C8E63C', life: 1200, delay: i * 90, size: 15 + (i % 3) * 3, onHit: i % 2 ? () => this.tap(def, move.color) : null }));
    }
    await last;
    await bob;
    await this.finishSpecial(att, def, ev, move.color, 'TA-DAAA!', applyHit);
    await sw;
    this.stage.dim = 0;
  }

  // A special that patches the hero up (Fetch Frenzy).
  healGlow(f, amount, word = 'HEAL!') {
    const c = f.center();
    this.audio.sfx('perfect');
    this.fx.burst(c.x, c.y - 20, { count: 16, colors: ['#5CE07A', '#ffffff', '#FFC914'], kind: 'star', speed: 220, gravity: -160 });
    this.fx.word(`${word} +${amount}`, c.x, c.y - 160, { size: 38, color: '#5CE07A', life: 1000 });
    f.eyes = 'happy';
  }

  setDizzy(f, on) {
    f.dizzy = on;
    if (on) {
      this.audio.sfx('dizzy');
      f.charged = false;
      this.to(f, { aura: 0 }, 200);
    }
  }

  // ---------------- energy ----------------
  async energyOrbs(n, anchorFor, startIndex) {
    const c = this.hero.center();
    for (let i = 0; i < n; i++) {
      const a = anchorFor(startIndex + i);
      this.fx.orb(c.x, c.y - 30, a.x, a.y, '#ffd23f', i * 120);
    }
    await this.wait(650 + (n - 1) * 120);
    this.audio.sfx('energy', n);
  }

  // ---------------- endings ----------------
  async win() {
    const { hero, foe } = this;
    hero.arrow = 0;
    foe.arrow = 0;
    this.audio.sfx('yawn');
    foe.tired = true;
    foe.aura = 0;
    foe.charged = false;
    foe.dizzy = false;
    await this.to(foe, { sy: 0.8, sx: 1.08, rot: -0.08 }, 600, Ease.outQuad);
    hero.cheer = true;
    this.fx.confetti(this.stage.W, 450);
  }

  async lose() {
    const { hero, foe } = this;
    hero.arrow = 0;
    foe.arrow = 0;
    this.audio.sfx('yawn');
    hero.tired = true;
    hero.shield = 0;
    await this.to(hero, { sy: 0.8, sx: 1.08, rot: -0.08 }, 600, Ease.outQuad);
    foe.aura = 0;
    foe.charged = false;
    foe.cheer = true;
  }
}
