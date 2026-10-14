// Particles, comic words, shockwave rings and falling blocks.
import { INK, starPath, burstPath, comicText, rr, toon, FONT, taper } from './draw.js';

// STYLE_GUIDE v2 effects palette
const COLORS = ['#FFC914', '#F46036', '#D7263D', '#4EA8DE', '#2E9E44', '#6A3FA0', '#ffffff'];

export class FX {
  constructor() {
    this.parts = [];
    this.words = [];
    this.rings = [];
    this.bodies = [];
    this.bursts = [];
    this.lines = [];
    this.ents = [];
    this.sprites = [];
    this.reduced = false;
    this.seed = 1;
  }
  clear() {
    this.parts.length = this.words.length = this.rings.length = this.bodies.length = this.bursts.length = this.lines.length = this.ents.length = this.sprites.length = 0;
  }
  // Painted effect sprite from Astra's effects sheet (public/ui/fx-<name>.png,
  // scripts/build-ui.py): pops in, holds, fades. Skipped quietly until loaded.
  //   o: size (longest side, world units), life ms, rot, spin, drift {x,y} units/s, delay
  sprite(name, x, y, o = {}) {
    const img = fxImage(name);
    if (!img) return;
    this.sprites.push({ img, x, y, life: -(o.delay || 0), max: o.life ?? 420, size: o.size ?? 120, rot: o.rot ?? 0, spin: o.spin ?? 0, dx: o.drift?.x || 0, dy: o.drift?.y || 0, alpha: o.alpha ?? 1, flip: o.flip ? -1 : 1 });
  }

  // Move effect entity from render/fx-moves.js. Resolves when it finishes.
  add(e) {
    e.life = -(e.delay || 0);
    this.ents.push(e);
    return new Promise((r) => { e._done = r; });
  }

  // Cel impact starburst: jagged red/gold shape with heavy ink and a white core.
  impact(x, y, o = {}) {
    this.bursts.push({ x, y, life: 0, max: o.life ?? 300, size: o.size ?? 80, colors: o.colors ?? ['#D7263D', '#FFC914'], seed: this.seed++, rot: Math.random() * 6 });
  }
  // Speed lines streaking out behind a lunging toy.
  speed(x, y, dir = 1) {
    const n = Math.round(9 * this.density);
    for (let i = 0; i < n; i++) {
      this.lines.push({ x: x - dir * (20 + Math.random() * 60), y: y + (Math.random() - 0.5) * 150, len: 70 + Math.random() * 90, dir, life: -Math.random() * 60, max: 240, w: 3 + Math.random() * 4 });
    }
  }
  get density() {
    return this.reduced ? 0.45 : 1;
  }

  burst(x, y, o = {}) {
    const n = Math.round((o.count ?? 14) * this.density);
    for (let i = 0; i < n; i++) {
      const a = (o.dir ?? 0) + (Math.random() - 0.5) * (o.spread ?? Math.PI * 2);
      const sp = (o.speed ?? 320) * (0.45 + Math.random() * 0.75);
      this.parts.push({
        x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        g: o.gravity ?? 500,
        drag: o.drag ?? 2.2,
        life: 0, max: (o.life ?? 650) * (0.7 + Math.random() * 0.6),
        size: (o.size ?? 9) * (0.6 + Math.random() * 0.7),
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12,
        color: o.colors ? o.colors[i % o.colors.length] : COLORS[i % COLORS.length],
        kind: o.kind || 'star',
      });
    }
  }
  puff(x, y, n = 8, color = '#CFC6BE') {
    this.burst(x, y, { count: n, kind: 'puff', speed: 120, gravity: -40, drag: 3, life: 600, size: 14, colors: [color], spread: Math.PI, dir: -Math.PI / 2 });
  }
  confetti(W, H) {
    const n = Math.round(80 * this.density);
    for (let i = 0; i < n; i++) {
      this.parts.push({
        x: Math.random() * W, y: -20 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 80, vy: 80 + Math.random() * 120,
        g: 60, drag: 0.4, life: 0, max: 3200 + Math.random() * 1500,
        size: 7 + Math.random() * 6, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10,
        color: COLORS[i % 6], kind: 'confetti', wob: Math.random() * 6,
      });
    }
  }
  zzz(x, y) {
    this.parts.push({ x, y, vx: 18, vy: -34, g: 0, drag: 0, life: 0, max: 1800, size: 18, rot: 0, vr: 0, color: '#ffffff', kind: 'z' });
  }
  orb(x, y, tx, ty, color = '#ffd23f', delay = 0) {
    this.parts.push({ x, y, sx: x, sy: y, tx, ty, life: -delay, max: 650, size: 11, color, kind: 'orb', vx: 0, vy: 0, g: 0, drag: 0, rot: 0, vr: 0, arc: (Math.random() - 0.5) * 160 });
  }
  word(text, x, y, o = {}) {
    this.words.push({ text, x, y, life: 0, max: o.life ?? 900, size: o.size ?? 54, color: o.color ?? '#ffd23f', rot: o.rot ?? (Math.random() - 0.5) * 0.3 });
  }
  ring(x, y, o = {}) {
    this.rings.push({ x, y, life: 0, max: o.life ?? 500, rx: o.rx ?? 20, ry: o.ry ?? 8, grow: o.grow ?? 220, color: o.color ?? '#ffffff', width: o.width ?? 8, vx: o.vx ?? 0 });
  }
  // falling toy block; onLand fires once when it hits floorY
  block(x, y, floorY, o = {}) {
    this.bodies.push({ x, y, vx: o.vx ?? 0, vy: o.vy ?? 0, floorY, size: o.size ?? 44, rot: Math.random() - 0.5, vr: (Math.random() - 0.5) * 4, color: o.color ?? COLORS[Math.floor(Math.random() * 5)], letter: o.letter ?? '', landed: false, onLand: o.onLand, life: 0, max: o.max ?? 1800, bounces: 0 });
  }

  update(dt) {
    const s = dt / 1000;
    for (const p of this.parts) {
      p.life += dt;
      if (p.kind === 'orb') continue;
      p.vy += p.g * s;
      p.vx *= Math.max(0, 1 - p.drag * s);
      p.vy *= Math.max(0, 1 - p.drag * s * 0.5);
      p.x += p.vx * s;
      p.y += p.vy * s;
      p.rot += p.vr * s;
    }
    this.parts = this.parts.filter((p) => p.life < p.max);
    for (const w of this.words) w.life += dt;
    this.words = this.words.filter((w) => w.life < w.max);
    for (const r of this.rings) {
      r.life += dt;
      r.x += r.vx * s;
    }
    this.rings = this.rings.filter((r) => r.life < r.max);
    for (const b of this.bodies) {
      b.life += dt;
      b.vy += 1500 * s;
      b.x += b.vx * s;
      b.y += b.vy * s;
      b.rot += b.vr * s;
      if (b.y > b.floorY && b.vy > 0) {
        b.y = b.floorY;
        if (!b.landed) {
          b.landed = true;
          b.onLand && b.onLand(b);
        }
        b.vy *= -0.38;
        b.vx = b.vx * 0.6 + (Math.random() - 0.5) * 220;
        b.vr = (Math.random() - 0.5) * 8;
        b.bounces++;
      }
    }
    this.bodies = this.bodies.filter((b) => b.life < b.max);
    for (const b of this.bursts) b.life += dt;
    this.bursts = this.bursts.filter((b) => b.life < b.max);
    for (const e of this.ents) {
      const was = e.life;
      e.life += dt;
      if (was < e.max && e.life >= e.max) { e.onDone && e.onDone(); e._done && e._done(); }
    }
    this.ents = this.ents.filter((e) => e.life < e.max);
    for (const l of this.lines) l.life += dt;
    this.lines = this.lines.filter((l) => l.life < l.max);
    for (const sp of this.sprites) sp.life += dt;
    this.sprites = this.sprites.filter((sp) => sp.life < sp.max);
  }

  drawSprites(ctx) {
    for (const sp of this.sprites) {
      if (sp.life < 0) continue;
      const k = sp.life / sp.max;
      const pop = k < 0.18 ? 0.55 + (k / 0.18) * 0.6 : k < 0.3 ? 1.15 - ((k - 0.18) / 0.12) * 0.15 : 1;
      const t = sp.life / 1000;
      const w = sp.img.width, h = sp.img.height, s = (sp.size / Math.max(w, h)) * pop;
      ctx.save();
      ctx.globalAlpha = sp.alpha * (k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1);
      ctx.translate(sp.x + sp.dx * t, sp.y + sp.dy * t);
      ctx.rotate(sp.rot + sp.spin * t);
      ctx.scale(s * sp.flip, s);
      ctx.drawImage(sp.img, -w / 2, -h / 2);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  drawBursts(ctx) {
    for (const l of this.lines) {
      if (l.life < 0) continue;
      const k = l.life / l.max;
      ctx.globalAlpha = 1 - k;
      const x0 = l.x - l.dir * k * 60, x1 = x0 - l.dir * l.len * (1 - k * 0.5);
      taper(ctx, [x0, l.y, (x0 + x1) / 2, l.y, x1, l.y], l.w, '#ffffff');
    }
    ctx.globalAlpha = 1;
    for (const b of this.bursts) {
      const k = b.life / b.max;
      const sc = k < 0.25 ? 0.45 + (k / 0.25) * 0.75 : 1.2 - (k - 0.25) * 0.25;
      ctx.globalAlpha = k > 0.6 ? (1 - k) / 0.4 : 1;
      const r = b.size * 0.5 * sc;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.lineJoin = 'miter';
      ctx.beginPath();
      burstPath(ctx, 0, 0, r, r * 0.55, 11, b.seed, b.rot);
      ctx.fillStyle = b.colors[0];
      ctx.fill();
      ctx.lineWidth = Math.max(3, b.size * 0.06);
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.beginPath();
      burstPath(ctx, 0, 0, r * 0.66, r * 0.36, 9, b.seed + 7, b.rot + 0.3);
      ctx.fillStyle = b.colors[1];
      ctx.fill();
      ctx.beginPath();
      burstPath(ctx, 0, 0, r * 0.32, r * 0.18, 7, b.seed + 3, b.rot);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  draw(ctx) {
    this.t = (this.t || 0);
    for (const e of this.ents) {
      if (e.life < 0) continue;
      ctx.save();
      e.draw(ctx, Math.min(1, e.life / e.max), performance.now());
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    this.drawSprites(ctx);
    this.drawBursts(ctx);
    for (const r of this.rings) {
      const k = r.life / r.max;
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width * (1 - k * 0.7);
      ctx.beginPath();
      const g = r.grow * k;
      ctx.ellipse(r.x, r.y, r.rx + g, r.ry + g * (r.ry / Math.max(1, r.rx)), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const b of this.bodies) {
      const fade = b.life > b.max - 300 ? (b.max - b.life) / 300 : 1;
      ctx.globalAlpha = Math.max(0, fade);
      ctx.save();
      ctx.translate(b.x, b.y - b.size / 2);
      ctx.rotate(b.rot);
      const s = b.size;
      toon(ctx, (c) => rr(c, -s / 2, -s / 2, s, s, s * 0.16), b.color, 'rgba(0,0,0,.18)', { line: 3.5, shadeOffset: 4 });
      if (b.letter) {
        ctx.font = `900 ${s * 0.55}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 3;
        ctx.strokeStyle = INK;
        ctx.fillStyle = '#fff';
        ctx.strokeText(b.letter, 0, 2);
        ctx.fillText(b.letter, 0, 2);
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    for (const p of this.parts) {
      if (p.life < 0) continue;
      const k = p.life / p.max;
      if (p.kind === 'orb') {
        const e = k * k * (3 - 2 * k);
        const x = p.sx + (p.tx - p.sx) * e + Math.sin(e * Math.PI) * p.arc;
        const y = p.sy + (p.ty - p.sy) * e - Math.sin(e * Math.PI) * 60;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        starPath(ctx, x, y, p.size, p.size * 0.45, 4, k * 8);
        ctx.fill();
        ctx.shadowBlur = 0;
        continue;
      }
      ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      ctx.fillStyle = p.color;
      if (p.kind === 'star') {
        ctx.beginPath();
        starPath(ctx, p.x, p.y, p.size, p.size * 0.45, 5, p.rot);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = INK;
        ctx.stroke();
      } else if (p.kind === 'puff') {
        const r = p.size * (0.6 + k);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = INK;
        ctx.stroke();
        ctx.fill();
        ctx.fillStyle = '#9C90A8';
        ctx.beginPath();
        ctx.arc(p.x + r * 0.25, p.y + r * 0.25, r * 0.7, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'confetti') {
        ctx.save();
        ctx.translate(p.x + Math.sin(p.life / 200 + p.wob) * 10, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, Math.abs(Math.sin(p.life / 160 + p.wob)));
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      } else if (p.kind === 'z') {
        comicText(ctx, 'Z', p.x + Math.sin(p.life / 300) * 8, p.y, p.size * (0.6 + k * 0.8), '#B9D8FF', -0.2);
      } else if (p.kind === 'spark') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    for (const w of this.words) {
      const k = w.life / w.max;
      const pop = k < 0.18 ? 0.4 + (k / 0.18) * 0.85 : k < 0.3 ? 1.25 - ((k - 0.18) / 0.12) * 0.25 : 1;
      ctx.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1;
      comicText(ctx, w.text, w.x, w.y - k * 30, Math.round(w.size * pop / 4) * 4, w.color, w.rot);
    }
    ctx.globalAlpha = 1;
  }
}

// ---------- painted effect sprites ----------
const FX_NAMES = ['impact', 'spark', 'dust', 'speed', 'fire', 'splash', 'magic', 'slash', 'swirl', 'dizzy', 'bubble', 'muzzle', 'aura', 'heal', 'leaves', 'sleepy'];
const fxImages = {};
let fxLoading = false;
function fxImage(name) {
  if (!fxLoading && typeof Image !== 'undefined') {
    fxLoading = true;
    for (const n of FX_NAMES) {
      const im = new Image();
      im.onload = () => { fxImages[n] = im; };
      im.src = `ui/fx-${n}.png`;
    }
  }
  return fxImages[name] || null;
}
// start loading as soon as the module is used
export const preloadFxSprites = () => fxImage('impact');
