// Canvas stage: virtual 450-unit-tall world scaled to the screen, camera with
// shake/zoom, arena layers, fighters and effects.
import { Clock } from '../engine/time.js';
import { FX } from './fx.js';
import { BedroomArena } from './arena-bedroom.js';
import { Fighter } from './fighter.js';
import { setArtScale } from './pixel.js';

export const VH = 450;
// '80s mode: art is drawn about this many pixels tall and scaled up by a whole
// number of device pixels, so every art pixel is the same chunky square. The
// screen itself stays full resolution, which lets sprites, camera shake and
// effects glide smoothly between art pixels (modern motion, 8-bit look).
export const ART_H = 200;

export class Stage {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.clock = new Clock();
    this.fx = new FX();
    this.arena = new BedroomArena();
    this.cam = { x: 0, y: 0, zoom: 1, trauma: 0, fx: 0.5, fy: 0.55, drift: 0 };
    this.fighters = { hero: null, foe: null };
    this.dim = 0;
    this.flashA = 0;
    this.flashColor = '#ffffff';
    this.reduced = false;
    this.pixel = true;
    this.W = 975;
    this.px = 1;
    this.onFrame = null;
    this.fps = { frames: 0, acc: 0, value: 0, worst: 0, worstAcc: 0 };
  }

  resize(cssW, cssH, dpr) {
    const s = cssH / VH;
    const r = Math.min(dpr || 1, 3);
    this.scale = s;
    this.W = cssW / s;
    this.canvas.width = Math.round(cssW * r);
    this.canvas.height = Math.round(cssH * r);
    this.canvas.style.width = cssW + 'px';
    this.canvas.style.height = cssH + 'px';
    this.full = s * r; // device px per world unit
    if (this.pixel) {
      const k = Math.max(1, Math.round((cssH * r) / ART_H)); // device px per art px
      this.px = this.full / k; // art px per world unit
      // art-resolution layers for effects, composited with hard pixels
      const lw = Math.ceil(this.W * this.px), lh = Math.ceil(VH * this.px);
      this.layers = [0, 1].map(() => {
        const c = document.createElement('canvas');
        c.width = lw; c.height = lh;
        return c;
      });
    } else {
      this.px = this.full;
      this.layers = null;
    }
    this.canvas.classList.toggle('pixel', this.pixel);
    this.ctx.imageSmoothingEnabled = !this.pixel;
    setArtScale(this.px, this.pixel);
    this.arena.pixel = this.pixel;
    this.arena.build(this.W, VH, this.px);
    const spots = this.arena.spots(this.W);
    for (const side of ['hero', 'foe']) {
      const f = this.fighters[side];
      if (f) {
        f.home = { ...spots[side] };
        f.x = spots[side].x;
        f.y = spots[side].y;
        f.pixel = this.pixel;
        f.setPx(this.px);
      }
    }
  }

  setFighters(heroDef, foeDef) {
    const spots = this.arena.spots(this.W);
    this.fighters.hero = heroDef ? new Fighter(heroDef, 'hero', spots.hero) : null;
    this.fighters.foe = foeDef ? new Fighter(foeDef, 'foe', spots.foe) : null;
    for (const f of Object.values(this.fighters)) f && (f.pixel = this.pixel, f.setPx(this.px));
  }

  setReduced(on) {
    this.reduced = on;
    this.fx.reduced = on;
  }

  shake(amount) {
    if (this.reduced) return;
    this.cam.trauma = Math.min(1, this.cam.trauma + amount);
  }
  flash(a = 0.6, color = '#ffffff') {
    this.flashA = this.reduced ? Math.min(a, 0.2) : a;
    this.flashColor = color;
  }
  hitStop(ms) {
    this.clock.freeze(ms);
  }
  zoomTo(z, dur, fx, fy) {
    if (this.reduced) z = 1 + (z - 1) * 0.3;
    if (fx != null) {
      this.cam.fx = fx / this.W;
      this.cam.fy = fy / VH;
    }
    return this.clock.to(this.cam, { zoom: z }, dur);
  }

  start() {
    let last = performance.now();
    const loop = (now) => {
      const real = Math.min(50, now - last);
      last = now;
      this.trackFps(now - (this._prev || now));
      this._prev = now;
      const dt = this.clock.step(real);
      this.update(dt, real);
      this.render();
      this.onFrame && this.onFrame(real);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  trackFps(ft) {
    const f = this.fps;
    f.frames++;
    f.acc += ft;
    f.worstAcc = Math.max(f.worstAcc, ft);
    if (f.acc >= 500) {
      f.value = Math.round((f.frames * 1000) / f.acc);
      f.worst = Math.round(f.worstAcc);
      f.frames = 0; f.acc = 0; f.worstAcc = 0;
    }
  }

  update(dt, real) {
    const t = this.clock.time;
    for (const f of Object.values(this.fighters)) f && f.update(dt, t);
    this.fx.update(dt);
    this.cam.trauma = Math.max(0, this.cam.trauma - real / 600);
    this.arena.excite = Math.max((this.arena.excite || 0) - real / 1400, this.cam.trauma);
    this.flashA = Math.max(0, this.flashA - real / 260);
    this.lastDt = dt;
  }

  render() {
    const ctx = this.ctx;
    const t = this.clock.time;
    const W = this.W;
    const cam = this.cam;
    const tr = cam.trauma * cam.trauma;
    const shx = tr * 22 * (Math.random() * 2 - 1);
    const shy = tr * 16 * (Math.random() * 2 - 1);
    const drift = cam.drift ? Math.sin(t / 3000) * 10 * cam.drift : 0;
    const view = { x: shx + drift, y: shy };
    const fs = [this.fighters.foe, this.fighters.hero].filter(Boolean);

    const camera = (c, scale) => {
      c.setTransform(scale, 0, 0, scale, 0, 0);
      const fx = cam.fx * W, fy = cam.fy * VH;
      c.translate(fx, fy);
      c.scale(cam.zoom, cam.zoom);
      c.translate(-fx, -fy);
    };
    camera(ctx, this.full);
    ctx.imageSmoothingEnabled = !this.pixel;

    if (!this.pixel) {
      this.arena.drawBack(ctx, view, t);
      ctx.save();
      ctx.translate(view.x, view.y);
      for (const f of fs) f.drawShadow(ctx);
      for (const f of fs) f.drawAura(ctx, t);
      this.fx.drawUnder && this.fx.drawUnder(ctx);
      for (const f of fs) f.draw(ctx, t);
      this.fx.draw(ctx);
      for (const f of fs) f.drawOverlay(ctx, t);
      this.arena.drawMotes(ctx, { x: 0, y: 0 }, t, this.lastDt || 16);
      ctx.restore();
      this.arena.drawFront(ctx, view);
    } else {
      // 1) painted background, pre-pixelated, placed at a smooth sub-pixel offset
      this.arena.drawBackImage(ctx, view);
      // 2) art-res layer under the toys: crowd, moonbeam, floor shadows, auras
      const [under, over] = this.layers;
      const lay = (c, fn) => {
        const g = c.getContext('2d');
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, c.width, c.height);
        g.setTransform(this.px, 0, 0, this.px, 0, 0);
        g.imageSmoothingEnabled = false;
        fn(g);
        ctx.drawImage(c, view.x, view.y, c.width / this.px, c.height / this.px);
      };
      lay(under, (g) => {
        this.arena.drawDecor(g, { x: 0, y: 0 }, t);
        for (const f of fs) f.drawShadow(g);
        for (const f of fs) f.drawAura(g, t);
        this.fx.drawUnder && this.fx.drawUnder(g);
      });
      // 3) toys: art-res sprites drawn at unsnapped positions (fluid motion)
      ctx.save();
      ctx.translate(view.x, view.y);
      for (const f of fs) f.draw(ctx, t);
      ctx.restore();
      // 4) art-res layer over the toys: hits, words, shields, motes
      lay(over, (g) => {
        this.fx.draw(g);
        for (const f of fs) f.drawOverlay(g, t);
        this.arena.drawMotes(g, { x: 0, y: 0 }, t, this.lastDt || 16);
      });
      this.arena.drawFront(ctx, view);
    }

    ctx.setTransform(this.full, 0, 0, this.full, 0, 0);
    if (this.dim > 0) {
      ctx.fillStyle = `rgba(10,8,30,${this.dim})`;
      ctx.fillRect(0, 0, W, VH);
    }
    if (this.flashA > 0) {
      ctx.globalAlpha = this.flashA;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, W, VH);
      ctx.globalAlpha = 1;
    }
  }
}
