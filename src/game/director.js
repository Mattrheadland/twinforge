// Choreography: turns battle events into anticipation -> movement -> impact ->
// reaction -> recovery, with sound and haptics fired at the moment of impact.
import { Ease } from '../engine/time.js';
import { buzz } from '../haptics.js';

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
      f.arrowColor = f === this.hero ? '#ffd23f' : '#ff6b5b';
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
  }

  squash(f, sx, sy, dur) {
    f.sx = sx;
    f.sy = sy;
    return this.to(f, { sx: 1, sy: 1 }, dur, Ease.outElastic);
  }

  // ---------------- attacks ----------------
  async lunge(att, def, { onImpact, power = 1, word = 'POW!', big = false }) {
    const gap = def.x - att.x;
    const dx = gap - Math.sign(gap) * 140;
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

  async heroAttack(quality, applyHit) {
    const power = quality === 'indep' ? 1.2 : quality === 'hint' ? 1 : 0.75;
    await this.lunge(this.hero, this.foe, {
      power,
      onImpact: async () => {
        this.impactAt(this.foe, { power, word: pick(WORDS[quality]) });
        applyHit();
        await this.wait(220);
      },
    });
  }

  async foeAttack(ev, applyHit) {
    const { foe, hero } = this;
    if (ev.kind === 'slam') return this.foeSlam(ev, applyHit);
    await this.lunge(foe, hero, {
      onImpact: async () => {
        this.impactAt(hero, { power: 0.9, word: ev.blocked ? '' : pick(['BONK!', 'BOP!']), blocked: ev.blocked, color: '#F46036' });
        applyHit();
        await this.wait(240);
      },
    });
  }

  async foeSlam(ev, applyHit) {
    const { foe, hero } = this;
    foe.aura = 1;
    this.audio.sfx('jump');
    await this.to(foe, { sy: 0.75, sx: 1.15 }, 160);
    const dx = hero.x - foe.x + 130;
    await Promise.all([
      this.to(foe, { sy: 1.1, sx: 0.92 }, 120),
      this.to(foe, { oy: -170 }, 340, Ease.outQuad),
      this.to(foe, { ox: dx * 0.6, rot: 0.3 }, 360, Ease.linear),
    ]);
    this.audio.sfx('fall');
    await Promise.all([
      this.to(foe, { oy: hero.y - foe.y - 20, ox: dx, rot: 0 }, 220, Ease.inQuad),
    ]);
    // impact
    const c = hero.center();
    this.stage.shake(ev.blocked ? 0.4 : 0.85);
    this.fx.ring(hero.x, hero.y, { rx: 40, ry: 10, grow: 260, color: '#ffd23f', width: 10 });
    this.fx.puff(hero.x + 60, hero.y, 12);
    if (ev.perfect) {
      this.audio.sfx('block');
      this.audio.sfx('perfect');
      buzz('medium');
      this.stage.hitStop(120);
      this.stage.flash(0.35, '#bfefff');
      this.fx.burst(c.x + 40, c.y - 20, { count: 22, colors: ['#ffffff', '#7fd3f7', '#ffd23f'], kind: 'star', speed: 380 });
      this.fx.word('PERFECT!', c.x + 20, c.y - 120, { color: '#4EA8DE', size: 58 });
      hero.shield = 1.35;
      this.to(hero, { shield: 1 }, 300);
      hero.eyes = 'happy';
    } else {
      this.audio.sfx('boom');
      buzz('heavy');
      this.stage.hitStop(140);
      this.stage.flash(0.3);
      this.impactAt(hero, { power: 1.3, word: 'SLAM!', big: true, color: '#F46036' });
    }
    applyHit();
    foe.aura = 0;
    await this.wait(380);
    // hop back home
    await Promise.all([
      this.to(foe, { ox: 0 }, 420, Ease.inOutQuad),
      this.to(foe, { oy: -90 }, 210, Ease.outQuad).then(() => this.to(foe, { oy: 0 }, 210, Ease.inQuad)),
    ]);
    this.squash(foe, 1.15, 0.85, 240);
    this.audio.sfx('land');
    if (!hero.tired) { hero.eyes = 'open'; hero.mouth = 'smile'; }
  }

  async foeCharge() {
    const { foe } = this;
    this.audio.sfx('charge');
    foe.auraColor = '#ff6b2b';
    this.stage.zoomTo(1.07, 400, foe.x, foe.y - 100);
    foe.eyes = 'angry';
    await this.to(foe, { aura: 1, sy: 0.9, sx: 1.08 }, 600, Ease.outQuad);
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2;
      const c = foe.center();
      this.fx.orb(c.x + Math.cos(a) * 140, c.y + Math.sin(a) * 110, c.x, c.y, '#ff9f1c', i * 50);
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

  // ---------------- defend ----------------
  async heroDefend() {
    const { hero } = this;
    const blocks = hero.def.shieldStyle === 'blocks';
    this.audio.sfx(blocks ? 'blocksStack' : 'shieldUp');
    buzz('light');
    await this.to(hero, { sy: 0.9, sx: 1.06, armF: -1.2 }, 150);
    await Promise.all([
      this.to(hero, { shield: 1 }, blocks ? 520 : 360, blocks ? Ease.linear : Ease.outBack),
      this.to(hero, { sy: 1, sx: 1 }, 300, Ease.outBack),
    ]);
    this.fx.burst(hero.center().x + 60, hero.center().y, { count: 10, colors: ['#ffffff', '#7fd3f7'], speed: 200, gravity: -50 });
    await this.to(hero, { armF: -0.5 }, 200);
  }

  shieldOff(f) {
    if (f.shield > 0) {
      this.fx.burst(f.center().x + 60 * f.flip, f.center().y, { count: 8, colors: ['#ffffff', '#7fd3f7'], speed: 160, gravity: 200 });
      this.to(f, { shield: 0 }, 300);
    }
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
    const pulls = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const c = f.center();
      this.fx.orb(c.x + Math.cos(a) * 170, c.y + Math.sin(a) * 130, c.x, c.y, color, i * 40);
    }
    pulls.push(this.to(f, { aura: 1, sy: 0.86, sx: 1.1 }, 700, Ease.outQuad));
    await Promise.all(pulls);
  }

  async heroSpecial(specialId, quality, applyHit) {
    if (specialId === 'barrage') return this.barrage(quality, applyHit);
    return this.megaStomp(quality, applyHit);
  }

  async barrage(quality, applyHit) {
    const { hero, foe } = this;
    await this.chargeUp(hero, '#ffd23f');
    hero.cheer = true;
    this.audio.sfx('jump');
    await this.wait(380);
    hero.cheer = false;
    hero.oy = 0;
    await this.stage.zoomTo(1.06, 300, foe.x, foe.y - 150);
    const n = quality === 'indep' ? 7 : quality === 'hint' ? 6 : 5;
    const letters = 'TOYBOXGO';
    let landed = 0;
    const done = new Promise((resolve) => {
      for (let i = 0; i < n; i++) {
        this.clock.wait(i * 150).then(() => {
          const last = i === n - 1;
          const x = foe.x + (Math.random() - 0.5) * 90;
          this.fx.block(x, -60 - Math.random() * 40, foe.head().top + 60 + Math.random() * 30, {
            size: last ? 64 : 40 + Math.random() * 12,
            letter: letters[i % letters.length],
            vx: (Math.random() - 0.5) * 60,
            onLand: (b) => {
              b.floorY = foe.y; // bonk the head, then tumble to the floor
              landed++;
              if (last) {
                this.impactAt(foe, { power: 1.4, word: 'BOOM!', big: true });
                applyHit();
                resolve();
              } else {
                this.audio.sfx('blockDrop', i);
                buzz('light');
                this.stage.shake(0.18);
                foe.flash = 0.7;
                foe.eyes = 'squint';
                this.fx.burst(b.x, b.y - 10, { count: 6, speed: 200, size: 7 });
              }
            },
          });
        });
      }
    });
    await done;
    hero.aura = 0;
    hero.eyes = 'open';
    hero.mouth = 'smile';
    await this.wait(500);
    await this.stage.zoomTo(1, 350);
  }

  async megaStomp(quality, applyHit) {
    const { hero, foe } = this;
    await this.chargeUp(hero, '#5cff7a');
    this.audio.sfx('jump');
    await this.to(hero, { sy: 0.7, sx: 1.2 }, 140);
    await Promise.all([
      this.to(hero, { sy: 1.15, sx: 0.9 }, 120),
      this.to(hero, { oy: -620 }, 320, Ease.inQuad),
    ]);
    await this.stage.zoomTo(1, 200);
    this.stage.shake(0.15);
    await this.wait(260);
    this.audio.sfx('fall');
    await this.to(hero, { oy: 0, sy: 1.1, sx: 0.9 }, 230, Ease.inQuad);
    // landing quake
    this.audio.sfx('boom');
    buzz('heavy');
    this.stage.hitStop(90);
    this.stage.shake(0.9);
    this.stage.flash(0.3);
    this.squash(hero, 1.35, 0.7, 380);
    this.fx.puff(hero.x - 40, hero.y, 10);
    this.fx.puff(hero.x + 40, hero.y, 10);
    this.fx.ring(hero.x, hero.y, { rx: 50, ry: 12, grow: 160, color: '#5cff7a', width: 12 });
    // shockwave travels to the foe
    const dist = foe.x - hero.x;
    const travel = 360;
    for (let k = 0; k < 3; k++) this.fx.ring(hero.x, hero.y - 2 - k * 4, { rx: 26, ry: 8, grow: 40, life: travel + 120, color: k ? '#ffffff' : '#5cff7a', width: 9 - k * 2, vx: dist / (travel / 1000) });
    this.fx.word(quality === 'indep' ? 'MEGA STOMP!' : 'STOMP!', hero.x + 60, hero.y - 230, { size: 52, color: '#7EE07A' });
    await this.wait(travel);
    this.impactAt(foe, { power: 1.4, word: 'BOOM!', big: true });
    applyHit();
    await Promise.all([
      this.to(foe, { oy: -110, rot: -0.4 }, 240, Ease.outQuad).then(() => this.to(foe, { oy: 0, rot: 0 }, 280, Ease.outBounce)),
    ]);
    hero.aura = 0;
    hero.eyes = 'open';
    hero.mouth = 'smile';
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
