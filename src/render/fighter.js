// A toy on stage: transform, pose state, idle life, shield/aura/status visuals.
import { drawToy, HEAD } from './toys.js';
import { INK, toon, rr, ellipse, starPath, comicText } from './draw.js';

const BOX = { x: -130, y: -250, w: 280, h: 280 }; // local bounds of a toy

export class Fighter {
  constructor(def, side, spot) {
    this.def = def;
    this.side = side;
    this.home = { ...spot };
    this.x = spot.x;
    this.y = spot.y;
    this.scale = spot.scale;
    this.flip = side === 'foe' ? -1 : 1;
    this.ox = 0; this.oy = 0; this.rot = 0; this.sx = 1; this.sy = 1;
    this.alpha = 1;
    this.flash = 0;
    this.eyes = 'open';
    this.mouth = 'smile';
    this.armF = -0.2; this.armB = 0.25;
    this.armFt = null; // target overrides when animating
    this.antenna = 0; this.antV = 0;
    this.tail = 0;
    this.shield = 0; // 0..1 visual amount
    this.aura = 0; this.auraColor = '#F46036';
    this.dizzy = false;
    this.charged = false;
    this.tired = false;
    this.cheer = false;
    this.arrow = 0;
    this.arrowColor = '#FFC914';
    this.trail = [];
    this.trailOn = false;
    this.idle = 1;
    this.lastOx = 0;
    this.buf = document.createElement('canvas');
    this.bctx = this.buf.getContext('2d');
    this.px = 1;
    this.headInfo = HEAD[def.art?.draw] || HEAD.blocko;
  }

  setPx(px) {
    this.px = px;
    const s = this.scale * px;
    this.buf.width = Math.ceil(BOX.w * s);
    this.buf.height = Math.ceil(BOX.h * s);
  }

  // world position of the head (for effects)
  head() {
    const h = this.headInfo;
    return {
      x: this.x + this.ox + h.x * this.scale * this.flip,
      y: this.y + this.oy + h.y * this.scale * this.sy,
      top: this.y + this.oy + h.top * this.scale * this.sy,
      r: h.r * this.scale,
    };
  }
  center() {
    return { x: this.x + this.ox, y: this.y + this.oy - 95 * this.scale };
  }

  update(dt, t) {
    // antenna/tail spring reacts to movement
    const vel = (this.ox - this.lastOx) / Math.max(1, dt);
    this.lastOx = this.ox;
    this.antV += (-this.antenna * 0.02 - vel * this.flip * 0.9) * dt * 0.06;
    this.antV *= 0.9;
    this.antenna += this.antV * dt * 0.06;
    this.antenna = Math.max(-22, Math.min(22, this.antenna));
    this.flash = Math.max(0, this.flash - dt / 160);
    if (this.trailOn) {
      this.trail.push({ x: this.x + this.ox, y: this.y + this.oy, life: 0 });
    }
    for (const p of this.trail) p.life += dt;
    this.trail = this.trail.filter((p) => p.life < 160);
    if (this.charged && Math.random() < 0.5) this.jitter = (Math.random() - 0.5) * 3;
    else this.jitter = 0;
  }

  pose(t) {
    const breathe = this.idle * Math.sin(t / 420);
    let armF = this.armF, armB = this.armB, eyes = this.eyes, mouth = this.mouth;
    if (this.tired) {
      eyes = 'closed'; mouth = 'flat'; armF = 0.5; armB = 0.4;
    } else if (this.dizzy) {
      eyes = 'swirl'; mouth = 'o';
    } else if (this.charged && eyes === 'open') {
      eyes = 'angry';
    }
    if (this.cheer) {
      const w = Math.sin(t / 110);
      armF = -2.6 + w * 0.3; armB = 2.6 - w * 0.3;
      eyes = 'happy'; mouth = 'open';
    }
    return {
      t, eyes, mouth,
      armF: armF + breathe * 0.06,
      armB: armB - breathe * 0.05,
      antenna: this.antenna,
      tail: this.tail,
      headBob: breathe * 1.6,
      glow: this.aura > 0.3,
      pose: this.tired ? 'tired' : this.cheer ? 'victory' : 'idle',
    };
  }

  renderBuffer(t) {
    const c = this.bctx;
    const s = this.scale * this.px;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.buf.width, this.buf.height);
    c.setTransform(s, 0, 0, s, -BOX.x * s, -BOX.y * s);
    drawToy(c, this.def, this.pose(t));
    if (this.flash > 0) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalCompositeOperation = 'source-atop';
      c.globalAlpha = Math.min(1, this.flash);
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, this.buf.width, this.buf.height);
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
    }
  }

  drawShadow(ctx) {
    const lift = Math.max(0, -this.oy);
    const k = Math.max(0.35, 1 - lift / 260);
    ctx.fillStyle = 'rgba(12,8,30,.5)';
    ctx.beginPath();
    ctx.ellipse(this.x + this.ox, this.y + 2, 70 * this.scale * k, 15 * this.scale * k, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawAura(ctx, t) {
    if (this.aura <= 0.01) return;
    const c = this.center();
    const r = 130 * this.scale * (1 + 0.06 * Math.sin(t / 90));
    const g = ctx.createRadialGradient(c.x, c.y, r * 0.2, c.x, c.y, r);
    g.addColorStop(0, hexA(this.auraColor, 0.55 * this.aura));
    g.addColorStop(1, hexA(this.auraColor, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
    ctx.fill();
    // hard flame-tongue rays with a white core, like a power-up cel overlay
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(t / 900);
    ctx.globalAlpha = 0.6 * this.aura;
    for (let i = 0; i < 12; i++) {
      ctx.rotate((Math.PI * 2) / 12);
      const L = r * (0.95 + 0.12 * Math.sin(t / 70 + i * 2));
      ctx.beginPath();
      ctx.moveTo(-9, -r * 0.4);
      ctx.lineTo(0, -L);
      ctx.lineTo(9, -r * 0.4);
      ctx.closePath();
      ctx.fillStyle = this.auraColor;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-3, -r * 0.45);
      ctx.lineTo(0, -L * 0.8);
      ctx.lineTo(3, -r * 0.45);
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
    ctx.restore();
  }

  draw(ctx, t) {
    this.renderBuffer(t);
    const bw = this.buf.width / this.px, bh = this.buf.height / this.px;
    const blit = (x, y, alpha) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x + this.jitter, y);
      ctx.rotate(this.rot * this.flip);
      ctx.scale(this.flip * this.sx, this.sy);
      ctx.drawImage(this.buf, BOX.x * this.scale, BOX.y * this.scale, bw, bh);
      ctx.restore();
    };
    for (const p of this.trail) blit(p.x, p.y, 0.28 * (1 - p.life / 160) * this.alpha);
    blit(this.x + this.ox, this.y + this.oy, this.alpha);
  }

  drawOverlay(ctx, t) {
    const h = this.head();
    if (this.shield > 0.01) this.drawShield(ctx, t);
    if (this.dizzy) {
      for (let i = 0; i < 3; i++) {
        const a = t / 260 + (i * Math.PI * 2) / 3;
        const x = h.x + Math.cos(a) * 40 * this.scale;
        const y = h.top + 6 + Math.sin(a) * 10 * this.scale;
        ctx.fillStyle = '#FFC914';
        ctx.beginPath();
        starPath(ctx, x, y, 11, 5);
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = INK;
        ctx.stroke();
      }
    }
    if (this.charged && !this.tired) {
      const bob = Math.sin(t / 120) * 4;
      const bx = h.x - 78 * this.flip, by = h.top + 18 + bob;
      toon(ctx, (c) => c.arc(bx, by, 20, 0, Math.PI * 2), '#D7263D', true, { line: 3.5 });
      comicText(ctx, '!', bx, by + 1, 30, '#ffffff');
    }
    if (this.arrow > 0.01) {
      const bob = Math.sin(t / 160) * 7;
      const ax = h.x, ay = Math.max(h.top - 30, 116) + bob;
      ctx.globalAlpha = this.arrow;
      toon(ctx, (c) => {
        c.moveTo(ax - 20, ay - 18);
        c.lineTo(ax + 20, ay - 18);
        c.lineTo(ax, ay + 6);
        c.closePath();
      }, this.arrowColor, null, { line: 4 });
      ctx.globalAlpha = 1;
    }
  }

  drawShield(ctx, t) {
    const s = this.shield;
    const c = this.center();
    if (this.def.shieldStyle === 'blocks') {
      // stack of toy blocks in front of the hero
      const fx = c.x + 92 * this.scale * this.flip;
      const base = this.y + 4;
      const size = 36 * this.scale;
      const cols = ['#FFC914', '#2E9E44', '#1B4FD8', '#D7263D', '#6A3FA0'];
      const stack = [[0, 0], [1, 0], [0, 1], [1, 1], [0.5, 2]];
      stack.forEach(([col, row], i) => {
        const appear = Math.max(0, Math.min(1, s * 5 - i));
        if (appear <= 0) return;
        const x = fx + (col - 0.5) * size * this.flip;
        const y = base - (row + 1) * size + (1 - appear) * -60;
        ctx.globalAlpha = appear;
        toon(ctx, (cc) => rr(cc, x - size / 2, y, size - 2, size - 2, 5), cols[i], true, { line: 3.5, highlight: [x - size * 0.2, y + size * 0.22, size * 0.14, 4] });
      });
      ctx.globalAlpha = 1;
      // shimmer line
      ctx.globalAlpha = 0.5 * s;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      const sh = ((t / 600) % 1) * size * 3;
      ctx.beginPath();
      ctx.moveTo(fx - size * this.flip, base - sh);
      ctx.lineTo(fx + size * this.flip, base - sh - 16);
      ctx.stroke();
      ctx.globalAlpha = 1;
      return;
    }
    // energy shield: flat translucent shell, hard bright edge, angular glints
    const rx = 108 * this.scale * (0.6 + 0.4 * s), ry = 128 * this.scale * (0.6 + 0.4 * s);
    ctx.save();
    ctx.globalAlpha = Math.min(1, s);
    ctx.beginPath();
    ellipse(ctx, c.x, c.y, rx, ry);
    ctx.fillStyle = 'rgba(78,168,222,0.2)';
    ctx.fill();
    ctx.lineWidth = 7;
    ctx.strokeStyle = 'rgba(27,79,216,0.85)';
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#DDF4FF';
    ctx.stroke();
    ctx.clip();
    // inner hard band on the shadow side
    ctx.beginPath();
    ellipse(ctx, c.x, c.y, rx, ry);
    ellipse(ctx, c.x - rx * 0.12, c.y - ry * 0.1, rx * 0.95, ry * 0.95);
    ctx.fillStyle = 'rgba(27,79,216,0.28)';
    ctx.fill('evenodd');
    ctx.strokeStyle = 'rgba(255,255,255,.22)';
    ctx.lineWidth = 2;
    const hs = 18;
    for (let yy = c.y - ry; yy < c.y + ry; yy += hs * 1.5) {
      for (let xx = c.x - rx; xx < c.x + rx; xx += hs * 1.73) {
        const off = (Math.round((yy - c.y) / (hs * 1.5)) % 2) * hs * 0.86;
        hex(ctx, xx + off, yy, hs * 0.55);
      }
    }
    // angular glints, upper left
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.85 * Math.min(1, s);
    const gx = c.x - rx * 0.55, gy = c.y - ry * 0.55;
    ctx.beginPath();
    ctx.moveTo(gx - 14, gy + 26); ctx.lineTo(gx + 22, gy - 14); ctx.lineTo(gx + 30, gy - 10); ctx.lineTo(gx - 6, gy + 30); ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(gx + 30, gy + 4); ctx.lineTo(gx + 38, gy - 4); ctx.lineTo(gx + 42, gy); ctx.lineTo(gx + 34, gy + 8); ctx.closePath();
    ctx.fill();
    // sweeping glint
    const sw = c.x - rx + ((t / 5) % (rx * 2.6));
    ctx.globalAlpha = 0.3 * Math.min(1, s);
    ctx.beginPath();
    ctx.moveTo(sw, c.y - ry); ctx.lineTo(sw + 14, c.y - ry); ctx.lineTo(sw - 26, c.y + ry); ctx.lineTo(sw - 40, c.y + ry); ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function hex(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
