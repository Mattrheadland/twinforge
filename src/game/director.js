// Choreography: turns battle events into anticipation -> movement -> impact ->
// reaction -> recovery, with sound and haptics fired at the moment of impact.
import { Ease } from '../engine/time.js';
import { buzz } from '../haptics.js';
import * as FXM from '../render/fx-moves.js';
import { VH } from '../render/stage.js';

const WORDS = { indep: ['WHAM!', 'POW!!', 'KAPOW!'], hint: ['POW!', 'BAM!'], support: ['pow!', 'bop!'] };
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export class Director {
  constructor(stage, audio) {
    this.stage = stage;
    this.audio = audio;
    this.clock = stage.clock;
    this.fx = stage.fx;
    this.zzzTimer = 0;
    this.storm = null; // Czernobog's fight: lightning, thunder, embers (see setStorm)
    stage.onFrame = (real) => this.tick(real);
  }

  // The ultimate villain gets weather. on: purple vignette closes in, embers
  // drift up from the floor, lightning flashes with a thunder rumble every
  // few seconds. off: everything clears.
  setStorm(on) {
    if (on) {
      if (this.storm) return;
      // fire underglow along the floor (drawn under the other effects)
      const glow = FXM.underglow({ width: () => this.stage.W, y: VH, h: 170 });
      this.fx.addUnder(glow);
      this.clock.to(glow, { on: 1 }, 1400);
      // night crew: fire dancers hop beside him (2–4 alive), shadow peekers
      // rise from his third of the floor. All timers live here and clear below.
      this.storm = { bolt: 2500 + Math.random() * 3000, ember: 0, wisp: 900, glow, dancer: 1200, dancers: [], peek: 2600, peekers: [], wisps: [] };
      this.clock.to(this.stage, { vignette: 0.6 }, 1200);
    } else {
      const st = this.storm;
      this.storm = null;
      if (st) for (const e of [...(st.dancers || []), ...(st.peekers || []), ...(st.wisps || [])]) e.max = 0; // dropped on the next fx tick
      if (st?.glow) {
        const glow = st.glow;
        this.clock.killTweensOf(glow);
        this.clock.to(glow, { on: 0 }, 500).then(() => { glow.max = 0; });
      }
      this.clock.to(this.stage, { vignette: 0 }, 600);
    }
  }
  get hero() { return this.stage.fighters.hero; }
  get foe() { return this.stage.fighters.foe; }
  other(f) { return f === this.hero ? this.foe : this.hero; }
  to(obj, props, dur, ease, delay) { return this.clock.to(obj, props, dur, ease, delay); }
  wait(ms) { return this.clock.wait(ms); }

  tick(real) {
    const t = this.clock.time;
    this.zzzTimer += real;
    if (this.storm) {
      const st = this.storm;
      st.ember -= real;
      if (st.ember <= 0) {
        st.ember = 90 + Math.random() * 120;
        const W = this.stage.W;
        this.fx.burst(Math.random() * W, 420 + Math.random() * 40, { count: 1, kind: 'spark', colors: ['#FF7A1A', '#FFC914', '#C07CFF'], speed: 40 + Math.random() * 50, gravity: -140, drag: 1.2, life: 1600 + Math.random() * 900, size: 4 + Math.random() * 4, spread: 0.6, dir: -Math.PI / 2 });
      }
      // spirit wisps rising around Czernobog every 1.5-3 s
      st.wisp -= real;
      if (st.wisp <= 0) {
        st.wisp = 1500 + Math.random() * 1500;
        const cz = [this.foe, this.hero].find((f) => f?.def?.id === 'nightwing') || this.foe;
        if (cz) {
          const n = Math.random() < 0.35 ? 2 : 1;
          for (let i = 0; i < n; i++) {
            st.wisps = st.wisps.filter((e) => e.life < e.max);
            const w = FXM.wisp({ x: cz.x + (Math.random() - 0.5) * 240, y: cz.y + 6, rise: 260 + Math.random() * 120, size: 11 + Math.random() * 7, color: Math.random() < 0.5 ? '#E6D8FF' : '#CFC2FF', life: 2000 + Math.random() * 800, delay: i * 350, spin: Math.random() < 0.5 ? 1 : -1 });
            st.wisps.push(w);
            this.fx.add(w);
          }
        }
      }
      // night crew (fire dancers and shadow peekers), only while the toys are on stage
      const czn = [this.foe, this.hero].find((f) => f?.def?.id === 'nightwing');
      if (czn) {
        const W = this.stage.W;
        st.dancers = st.dancers.filter((d) => d.life < d.max && this.fx.ents.includes(d));
        st.dancer -= real;
        if (st.dancer <= 0) {
          st.dancer = 1700 + Math.random() * 900;
          const want = st.dancers.length < 2 ? 2 : 4; // keep at least two, never more than four
          if (st.dancers.length < want) {
            // on his outer side (the move buttons sit between the toys): four
            // evenly spread spots from just past his feet to the edge of the
            // stage, taking the first one no dancer is standing on
            const outer = czn.flip < 0 ? 1 : -1;
            const edge = outer > 0 ? W - 45 : 45;
            const slots = [0, 1, 2, 3].map((i) => czn.x + outer * 70 + (edge - (czn.x + outer * 70)) * (i / 3));
            const free = slots.filter((sx) => !st.dancers.some((e) => Math.abs(e.x0 - sx) < 30));
            const x = free.length ? free[Math.floor(Math.random() * free.length)] : slots[0];
            const d = FXM.fireDancer({ x, y: czn.y + 2, size: 36 + Math.random() * 12, life: 5000 + Math.random() * 3000 });
            st.dancers.push(d);
            this.fx.add(d);
          }
        }
        st.peek -= real;
        if (st.peek <= 0) {
          st.peek = 3400 + Math.random() * 1400;
          const third = W / 3, cx = czn.flip < 0 ? W - third / 2 : third / 2;
          const x = Math.max(40, Math.min(W - 40, cx + (Math.random() - 0.5) * third * 0.9));
          st.peekers = st.peekers.filter((e) => e.life < e.max && this.fx.ents.includes(e));
          const pk = FXM.shadowPeeker({ x, y: czn.y + 2, size: 46 + Math.random() * 14, life: 3000 + Math.random() * 1200 });
          st.peekers.push(pk);
          this.fx.add(pk);
        }
      }
      st.bolt -= real;
      if (st.bolt <= 0) {
        st.bolt = 3500 + Math.random() * 4500;
        this.stage.flash(0.42, '#D8C8FF');
        setTimeout(() => this.stage.flash(0.28, '#D8C8FF'), 90);
        this.stage.shake(0.18);
        this.audio.sfx('thunder');
      }
    }
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
    this.fx.sprite(big ? 'impact' : 'spark', hx, hy, { size: big ? 210 : 120 * Math.max(0.8, power), rot: Math.random() * 0.6 - 0.3, life: big ? 460 : 320 });
    this.fx.burst(hx, hy, { count: big ? 26 : Math.round(14 * power), speed: big ? 480 : 320, size: big ? 13 : 10 });
    this.fx.ring(hx, hy, { rx: 10, ry: 10, grow: big ? 140 : 90, color: '#fff', width: 7 });
    this.fx.word(word, hx, hy - 80, { size: big ? 72 : 50 * Math.max(0.8, power), color: color || '#ffd23f' });
    // v6 combat feel: the hit lights the toys in the move's colour, a shockwave runs along the floor from the
    // target's feet with a kick of dust, and a big hit punches the camera in for a moment
    this.stage.lightPulse && this.stage.lightPulse(color || '#FFC914', big ? 1 : 0.55, big ? 420 : 260);
    this.fx.ring(def.x, def.y + 2, { rx: 26, ry: 7, grow: big ? 230 : 130, color: color || '#ffffff', width: big ? 6 : 4, life: big ? 520 : 380 });
    this.fx.puff(def.x - 26 * def.flip, def.y, big ? 10 : 5, '#CFC6BE');
    if (big && !this.stage.reduced && Math.abs(this.stage.cam.zoom - 1) < 0.02) {
      this.stage.zoomTo(1.07, 70).then(() => this.stage.zoomTo(1, 280));
    }
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
    // a move's own voice (move.sfx on the wind-up, move.sfxHit on the hit) plays
    // over the generic whoosh / thud, so each toy sounds like itself
    if (move.sfx) this.audio.sfx(move.sfx);
    // Czernobog hits harder: his power move rattles the room an extra notch
    const czernobog = att.def?.id === 'nightwing' && move.slot === 'power';
    const onHit = async () => {
      if (move.sfxHit && !ev.dodged && !ev.blocked && !ev.perfect) this.audio.sfx(move.sfxHit);
      this.strike(def, ev, { power, word, big, color: move.color });
      if (czernobog && !ev.dodged) this.stage.shake(0.4);
      applyHit();
      await this.wait(240);
    };
    switch (move.anim) {
      case 'shot': return this.shot(att, def, move, onHit);
      case 'parrot': return this.parrotAttack(att, def, move, onHit);
      case 'howl': return this.howlAttack(att, def, move, onHit);
      case 'pumpkinToss': return this.pumpkinToss(att, def, move, onHit);
      case 'gravity': return this.gravityGrip(att, def, move, onHit);
      case 'ground': return this.ground(att, def, move, onHit);
      case 'dancers': return this.dancers(att, def, move, onHit);
      case 'river': return this.river(att, def, move, onHit);
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
      this.fx.sprite('muzzle', m.x, m.y, { size: 96, rot: Math.atan2(target.y - m.y, target.x - m.x), life: 220 });
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

  // Capt'n Crookhook: Squawks the parrot launches off his shoulder, swoops
  // across and pecks twice.
  async parrotAttack(att, def, move, onHit) {
    att.mouth = 'open';
    att.eyes = 'happy';
    const s = this.pt(att, 'top');
    const c = def.center();
    await this.to(att, { armF: -2.0, sy: 0.95 }, 160, Ease.outQuad);
    this.fx.burst(s.x, s.y, { count: 6, colors: ['#2E9E44', '#D7263D'], kind: 'puff', speed: 120 });
    const peck = () => { this.audio.sfx('hit'); this.fx.burst(c.x, c.y - 20, { count: 8, colors: [move.color, '#ffffff'], speed: 220 }); def.flash = 0.6; };
    await this.fx.add(FXM.parrot({ x0: s.x, y0: s.y - 10, x1: c.x - 30 * def.flip * -1, y1: c.y - 30, life: 620, onHit: peck }));
    // a second peck from a quick loop
    await this.fx.add(FXM.parrot({ x0: c.x - 90 * att.flip, y0: c.y - 110, x1: c.x, y1: c.y - 20, life: 380 }));
    await onHit();
    // flies home
    this.fx.add(FXM.parrot({ x0: c.x, y0: c.y - 40, x1: s.x, y1: s.y - 10, life: 520 }));
    att.eyes = 'open';
    att.mouth = 'smile';
    await this.to(att, { armF: -0.2, sy: 1 }, 240, Ease.outCubic);
  }

  // Big Bad Wolfgang: throws his head back and howls; two sound rings blast across.
  async howlAttack(att, def, move, onHit) {
    att.mouth = 'open';
    att.eyes = 'closed';
    await this.to(att, { rot: -0.3, sy: 1.08, oy: -8 }, 240, Ease.outQuad);
    const m = this.pt(att, 'muzzle');
    const c = def.center();
    this.fx.word('AWOOO!', m.x + 30 * att.flip, m.y - 70, { size: 40, color: move.color, life: 900 });
    let last;
    for (let i = 0; i < (move.shots || 2); i++) {
      last = this.fx.add(FXM.howlRing({ x0: m.x, y0: m.y - 10, x1: c.x, y1: c.y - 10, color: move.color, life: 420, delay: i * 260, onHit: i < (move.shots || 2) - 1 ? () => { this.audio.sfx('hit'); def.flash = 0.6; this.fx.burst(c.x, c.y, { count: 8, colors: [move.color, '#ffffff'], speed: 220 }); } : null }));
      this.wait(i * 260).then(() => this.stage.shake(0.15));
    }
    await last;
    await onHit();
    att.eyes = 'open';
    att.mouth = 'smile';
    await this.to(att, { rot: 0, sy: 1, oy: 0 }, 260, Ease.outCubic);
  }

  // Jack-Knife: winds up and lobs a real pumpkin that splats on the foe.
  async pumpkinToss(att, def, move, onHit) {
    att.mouth = 'grit';
    const h = this.pt(att, 'top');
    const c = def.center();
    await this.to(att, { armF: -2.6, rot: -0.15, sx: 0.95 }, 200, Ease.outQuad);
    this.to(att, { armF: 0.6, rot: 0.15, sx: 1.05 }, 140, Ease.inQuad).then(() => this.to(att, { armF: -0.2, rot: 0, sx: 1 }, 260));
    await this.fx.add(FXM.pumpkin({ x0: h.x, y0: h.y - 10, x1: c.x, y1: c.y, size: 24, glow: move.color, arc: 170, life: 520 }));
    this.fx.burst(c.x, c.y - 10, { count: 16, kind: 'puff', colors: ['#E8762B', '#F6A04A', move.color], speed: 240 });
    await onHit();
    att.mouth = 'smile';
  }

  // Galactic Hunter: raises a hand and a gravity well opens over the foe,
  // pulling it in, then snaps shut.
  async gravityGrip(att, def, move, onHit) {
    att.mouth = 'grit';
    att.eyes = 'angry';
    const c = def.center();
    await this.to(att, { armF: -1.9, sy: 1.03 }, 220, Ease.outBack);
    this.fx.orb(att.x, att.y - 150, c.x, c.y, move.color, 0);
    await this.wait(200);
    def.eyes = 'squint';
    // the foe gets tugged toward the well and lifted while it's open
    const tug = this.to(def, { oy: -26, sx: 0.94, sy: 1.08 }, 500, Ease.inOutQuad);
    await this.fx.add(FXM.gravityWell({ x: c.x, y: c.y, r: 110, color: move.color, life: 820, onHit: () => { this.audio.sfx('hit'); this.stage.shake(0.2); } }));
    await tug;
    this.to(def, { oy: 0, sx: 1, sy: 1 }, 180, Ease.inQuad);
    await onHit();
    att.eyes = 'open';
    att.mouth = 'smile';
    await this.to(att, { armF: -0.2, sy: 1 }, 240, Ease.outCubic);
  }

  async ground(att, def, move, onHit) {
    att.mouth = 'grit';
    this.audio.sfx('jump');
    await this.to(att, { sy: 0.82, sx: 1.12 }, 180);
    this.audio.sfx('boom');
    this.stage.shake(0.3);
    await this.to(att, { sy: 1, sx: 1 }, 160, Ease.outBack);
    this.fx.puff(def.x, def.y, 8, '#8A5A3C');
    this.fx.sprite('dust', att.x, att.y - 30, { size: 150, life: 520, drift: { x: 0, y: -30 } });
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

  // Billy Bass sings, and a river rolls in under the foe (Take Me to the River)
  async river(att, def, move, onHit) {
    att.mouth = 'open';
    att.eyes = 'happy';
    this.audio.sfx('powerUp');
    const a = att.center();
    for (let i = 0; i < 3; i++) this.fx.add(FXM.note({ cx: a.x, cy: a.y - 60, r0: 90, phase: i * 2.1, color: i % 2 ? '#C8E63C' : '#FFC914', life: 900, size: 13 }));
    await this.wait(450);
    const dir = att.flip;
    this.audio.sfx('whoosh');
    const w = this.fx.add(FXM.wave({ x0: att.x - dir * 40, x1: def.x + dir * 90, y: Math.max(att.y, def.y) + 20, height: 150, dir, color: move.color, life: 1000 }));
    await this.wait(600);
    this.fx.burst(def.x, def.y - 40, { count: 14, colors: ['#ffffff', move.color], kind: 'puff', speed: 240, gravity: 300 });
    this.fx.sprite('splash', def.x, def.y - 70, { size: 230, life: 620 });
    await onHit();
    await w;
    att.eyes = 'open';
    att.mouth = 'smile';
  }

  // ---------------- guards ----------------
  async guardUp(f, move) {
    f.guardType = move.guard || 'block';
    f.guardColor = move.color || '#4EA8DE';
    this.audio.sfx(move.sfx || (f.guardType === 'dodge' ? 'whoosh' : 'shieldUp'));
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
    const cc = f.center();
    this.fx.sprite('aura', cc.x, cc.y + 40, { size: 200, life: 800, alpha: 0.8 });
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
      powerPaws: this.spPowerPaws, encore: this.spEncore,
      cannonBroadside: this.spCannonBroadside, pumpkinBarrage: this.spPumpkinBarrage, huffAndPuff: this.spHuffAndPuff, orbitalStrike: this.spOrbitalStrike,
    }[move.id] || this.spGeneric;
    await fn.call(this, att, def, move, quality, ev, applyHit);
  }

  async spGeneric(att, def, move, q, ev, applyHit) {
    await this.chargeUp(att, move.color);
    if (move.sfx) this.audio.sfx(move.sfx);
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
    this.fx.sprite('muzzle', m.x, m.y, { size: 170, rot: Math.atan2(c.y - 10 - m.y, c.x - m.x), life: 380 });
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
    this.fx.sprite('splash', c.x, c.y - 20, { size: 260, life: 700 });
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
      last = this.fx.add(FXM.potion({ x: c.x + (i - 1.5) * 40, y0: -60, y1: c.y - 20 + (i % 2) * 20, color: i % 2 ? '#A777E0' : move.color, life: 480, delay: i * 180, onHit: () => { this.tap(def, move.color); this.fx.burst(c.x, c.y, { count: 8, kind: 'puff', colors: [move.color], speed: 160 }); this.fx.sprite('magic', c.x + (Math.random() - 0.5) * 60, c.y + (Math.random() - 0.5) * 60, { size: 110, life: 340, spin: 3 }); } }));
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
    this.fx.sprite('swirl', c.x, c.y, { size: 240, life: 1500, spin: 2.5, alpha: 0.85 });
    const n = q === 'indep' ? 8 : 6;
    let last;
    for (let i = 0; i < n; i++) {
      last = this.fx.add(FXM.ghost({ cx: c.x, cy: c.y, r0: 230, phase: (i / n) * Math.PI * 2, life: 1300, delay: i * 80, size: 20 + (i % 3) * 4, onHit: i % 2 ? () => this.tap(def, move.color) : null }));
    }
    await last;
    const fin = this.finishSpecial(att, def, ev, move.color, 'BOO-YAH!', applyHit);
    if (att.def?.id === 'nightwing' && !ev.dodged) {
      // the ultimate villain's storm lands with a red flash and a big shake
      this.stage.flash(0.35, '#FF3B2F');
      this.stage.shake(0.9);
    }
    await fin;
    await this.to(att, { oy: 0 }, 380, Ease.inQuad);
    this.squash(att, 1.2, 0.8, 300);
    await sw;
    this.stage.dim = 0;
  }

  // Remy Roo: his paws light up, a flurry of glowing paw prints, then a big pounce
  async spPowerPaws(att, def, move, q, ev, applyHit) {
    await this.chargeUp(att, move.color);
    att.eyes = 'angry';
    att.mouth = 'open';
    const c = def.center();
    this.fx.word('POWER PAWS!', this.stage.W / 2, 120, { size: 50, color: move.color, life: 1200 });
    const n = q === 'indep' ? 7 : 5;
    let last;
    for (let i = 0; i < n; i++) {
      // little hops in place while he swipes
      this.to(att, { sy: 0.88, sx: 1.1, armF: -1.2 }, 70).then(() => this.to(att, { sy: 1, sx: 1, armF: -0.2 }, 110));
      last = this.fx.add(FXM.pawStamp({
        x: c.x + (Math.random() - 0.5) * 120, y: c.y + (Math.random() - 0.5) * 110, rot: (Math.random() - 0.5) * 1.2,
        size: 26 + (i % 3) * 6, color: move.color, life: 460, delay: i * 140,
        onHit: () => this.tap(def, move.color),
      }));
    }
    await last;
    await this.lunge(att, def, { power: 1.4, dash: true, onImpact: () => this.finishSpecial(att, def, ev, move.color, 'POUNCE!', applyHit) });
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

  // Capt'n Crookhook: braces, then four cannonballs arc across (the fourth is
  // the big one) and the foe gets a splash. Sound: 'broadside' (four booms
  // 220 ms apart, then a splash tail).
  async spCannonBroadside(att, def, move, q, ev, applyHit) {
    await this.chargeUp(att, move.color);
    att.eyes = 'angry';
    att.mouth = 'grit';
    // brace: lean back, hook arm up
    await this.to(att, { rot: -0.18, armF: -2.2, sx: 1.08, sy: 0.94 }, 260, Ease.outBack);
    this.fx.word('BROADSIDE!', this.stage.W / 2, 120, { size: 52, color: move.color, life: 1300 });
    const m = this.pt(att, 'muzzle');
    const c = def.center();
    const shots = q === 'indep' ? 4 : 3;
    this.audio.sfx(move.sfx);
    let last;
    for (let i = 0; i < shots; i++) {
      const big = i === shots - 1;
      this.fx.sprite('muzzle', m.x, m.y, { size: big ? 150 : 100, rot: Math.atan2(c.y - m.y, c.x - m.x), life: 240, delay: i * 220 });
      // recoil on each shot
      this.wait(i * 220).then(() => { this.stage.shake(big ? 0.5 : 0.25); this.to(att, { ox: -34 * att.flip }, 70).then(() => this.to(att, { ox: 0 }, 180, Ease.outCubic)); });
      last = this.fx.add(FXM.cannonball({
        x0: m.x, y0: m.y, x1: c.x + (i - (shots - 1) / 2) * 18, y1: c.y - 10 + (i % 2) * 16, size: big ? 30 : 21, arc: 60 + i * 25, life: 400, delay: i * 220,
        onHit: big ? null : () => { this.tap(def, move.color); this.fx.burst(c.x, c.y, { count: 10, kind: 'puff', colors: ['#B9B4C4', '#ffffff'], speed: 200 }); },
      }));
    }
    await last;
    this.fx.sprite('splash', c.x, c.y - 20, { size: 240, life: 650 });
    this.fx.burst(c.x, c.y, { count: 20, kind: 'puff', colors: ['#B9B4C4', '#ffffff', '#4EA8DE'], speed: 300 });
    await this.finishSpecial(att, def, ev, move.color, 'KA-BOOM!', applyHit);
    await this.to(att, { rot: 0, armF: -0.2, sx: 1, sy: 1 }, 300, Ease.outCubic);
  }

  // Jack-Knife: folds up with a giggle, springs open, and five pumpkin bombs
  // lob in from high overhead. Sound: 'slideWhistle' on the lob, 'pumpkinThonk'
  // on each landing.
  async spPumpkinBarrage(att, def, move, q, ev, applyHit) {
    await this.chargeUp(att, move.color);
    att.eyes = 'happy';
    att.mouth = 'open';
    this.audio.sfx('giggle');
    // fold up like a pocketknife, then spring open
    await this.to(att, { sy: 0.45, sx: 1.25, rot: 0.3 }, 260, Ease.inQuad);
    await this.wait(160);
    this.audio.sfx('snikt');
    await this.to(att, { sy: 1.15, sx: 0.9, rot: -0.1, oy: -40 }, 180, Ease.outBack);
    this.to(att, { sy: 1, sx: 1, rot: 0, oy: 0 }, 300, Ease.outBounce);
    this.fx.word('PUMPKIN BOMBS!', this.stage.W / 2, 120, { size: 48, color: move.color, life: 1400 });
    this.audio.sfx(move.sfx);
    const h = this.pt(att, 'top');
    const c = def.center();
    const n = q === 'indep' ? 5 : 4;
    let last;
    for (let i = 0; i < n; i++) {
      const big = i === n - 1;
      last = this.fx.add(FXM.pumpkin({
        x0: h.x + (Math.random() - 0.5) * 40, y0: h.y - 20, x1: c.x + (Math.random() - 0.5) * 90, y1: c.y + (Math.random() - 0.5) * 60,
        size: big ? 30 : 20 + (i % 2) * 4, glow: move.color, arc: 240 + i * 25, life: 520, delay: i * 170,
        onHit: () => {
          this.audio.sfx('pumpkinThonk');
          if (!big) this.tap(def, '#E8762B');
          this.fx.burst(c.x, c.y - 10, { count: big ? 22 : 12, kind: 'puff', colors: ['#E8762B', '#F6A04A', move.color], speed: big ? 320 : 220 });
          this.fx.sprite('magic', c.x + (Math.random() - 0.5) * 60, c.y + (Math.random() - 0.5) * 60, { size: big ? 190 : 110, life: 340, spin: 3 });
        },
      }));
      // a little hop with each throw
      this.wait(i * 170).then(() => this.to(att, { oy: -18, armF: -2.4 }, 80).then(() => this.to(att, { oy: 0, armF: -0.2 }, 120)));
    }
    await last;
    await this.finishSpecial(att, def, ev, move.color, 'SPLAT-BOOM!', applyHit);
    att.eyes = 'open';
  }

  // Big Bad Wolfgang: a huge inhale (he swells up), then a gale of wind, straw
  // and sticks blows the foe off its feet. Sound: 'huffPuff' (inhale ~1.1 s,
  // then the gale).
  async spHuffAndPuff(att, def, move, q, ev, applyHit) {
    await this.chargeUp(att, move.color);
    att.eyes = 'angry';
    att.mouth = 'o';
    this.audio.sfx(move.sfx);
    // inhale: swell up and lean back; little orbs get sucked toward his mouth
    const m = this.pt(att, 'muzzle');
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      this.fx.orb(m.x + Math.cos(a) * 160 * att.flip, m.y + Math.sin(a) * 110, m.x, m.y, '#ffffff', i * 90);
    }
    await this.to(att, { sx: 1.28, sy: 1.22, rot: -0.2, oy: -10 }, 1050, Ease.inOutQuad);
    this.fx.word('HUFF AND PUFF!', this.stage.W / 2, 120, { size: 50, color: move.color, life: 1300 });
    // blow: snap forward, the gale tears across
    att.mouth = 'open';
    const m2 = this.pt(att, 'muzzle');
    const c = def.center();
    this.to(att, { sx: 0.92, sy: 0.96, rot: 0.22, oy: 0 }, 160, Ease.outQuad).then(() => this.to(att, { sx: 1, sy: 1, rot: 0.1 }, 500));
    const g = this.fx.add(FXM.gust({ x0: m2.x, x1: c.x + 40 * att.flip, y: c.y - 10, height: 180, color: '#ffffff', life: 1150 }));
    this.stage.shake(0.3);
    // the foe gets shoved back and tumbles
    await this.wait(260);
    const push = this.to(def, { ox: 70 * def.flip * -1, rot: -0.55 * def.flip }, 420, Ease.outQuad);
    const n = q === 'indep' ? 3 : 2;
    for (let i = 0; i < n; i++) { this.tap(def, move.color); await this.wait(190); }
    await push;
    await this.finishSpecial(att, def, ev, move.color, 'WHOOOSH!', applyHit);
    this.to(def, { ox: 0, rot: 0 }, 360, Ease.outBack);
    await this.to(att, { rot: 0 }, 240);
    await g;
    att.eyes = 'open';
  }

  // Galactic Hunter: halberd up, a reticle locks onto the foe through three
  // countdown beeps, then the beam drops from orbit. Sound: 'orbitalStrike'
  // (beeps at 0, 0.25, 0.5 s; beam at 0.95 s).
  async spOrbitalStrike(att, def, move, q, ev, applyHit) {
    await this.chargeUp(att, move.color);
    att.eyes = 'angry';
    att.mouth = 'grit';
    this.stage.dim = 0.3;
    await this.to(att, { armF: -2.6, sy: 1.04 }, 220, Ease.outBack);
    const c = def.center();
    this.audio.sfx(move.sfx);
    const r = this.fx.add(FXM.reticle({ x: c.x, y: c.y - 10, r0: 170, r1: 75, color: move.color, life: 950 }));
    await this.wait(950);
    await r;
    // the beam drops from the top of the screen
    this.stage.flash(0.4, '#CFF7FF');
    this.stage.shake(0.6);
    this.fx.word('ORBITAL STRIKE!', this.stage.W / 2, 120, { size: 50, color: move.color, life: 1200 });
    const b = this.fx.add(FXM.beam({ x0: c.x, y0: -80, x1: c.x, y1: def.y + 6, color: move.color, width: q === 'indep' ? 70 : 54, life: 820 }));
    this.fx.burst(c.x, def.y, { count: 22, colors: [move.color, '#ffffff', '#FFC914'], kind: 'spark', speed: 420, gravity: -100 });
    this.fx.sprite('dust', c.x, def.y - 10, { size: 150, life: 520, drift: { x: 0, y: -40 } });
    const n = q === 'indep' ? 3 : 2;
    for (let i = 0; i < n; i++) { await this.wait(150); this.tap(def, move.color); }
    await this.finishSpecial(att, def, ev, move.color, 'KRA-KOOM!', applyHit);
    await b;
    this.stage.dim = 0;
    await this.to(att, { armF: -0.2, sy: 1 }, 300);
    att.eyes = 'open';
  }

  // A special that patches the hero up (Power Paws).
  healGlow(f, amount, word = 'HEAL!') {
    const c = f.center();
    this.audio.sfx('perfect');
    this.fx.burst(c.x, c.y - 20, { count: 16, colors: ['#5CE07A', '#ffffff', '#FFC914'], kind: 'star', speed: 220, gravity: -160 });
    this.fx.word(`${word} +${amount}`, c.x, c.y - 160, { size: 38, color: '#5CE07A', life: 1000 });
    this.fx.sprite('heal', c.x, c.y - 30, { size: 200, life: 900, drift: { x: 0, y: -50 } });
    f.eyes = 'happy';
  }

  setDizzy(f, on) {
    f.dizzy = on;
    if (on) {
      this.audio.sfx('dizzy');
      const hd = f.head();
      this.fx.sprite('dizzy', hd.x, hd.top - 6, { size: 130, life: 1100, spin: 4 });
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
    if (hero.def?.winSfx) this.audio.sfx(hero.def.winSfx); // a toy's own victory sting
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
