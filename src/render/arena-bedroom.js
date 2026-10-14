// Arena 1: Bedroom Block Fortress at night. TEMPORARY code-drawn art in the
// STYLE_GUIDE v2 background treatment: painted, not inked. Soft gradients,
// airbrushed glows and a light brush texture; shapes are defined by value and
// color so the inked toys pop in front. Cool moonlight from the window, a warm
// desk-lamp glow from the left edge. Foreground props are inked cels.
// Static parts are pre-rendered once per resize; only small bits animate.
// When Astra's plates arrive, `back` / `front` become images.
import { toon, rr, ellipse, starPath } from './draw.js';
import { Rng } from '../logic/rng.js';
import { dither, pixelize } from './pixel.js';

const MARGIN = 60; // extra painted area so shake/zoom never shows an edge
const FLOOR_Y = 232;

const P = {
  wallTop: '#120f2a', wallBot: '#2f2760',
  floorFar: '#2a1c2e', floorNear: '#5a3a35',
  moon: '#FFF1C4', moonGlow: 'rgba(190,210,255,', lamp: 'rgba(255,170,90,',
  sky0: '#070b24', sky1: '#1d2c66',
};

// ---------- painting helpers (no ink) ----------
// Fill a shape with a soft light-to-shadow gradient (light from `from`).
function paintShape(ctx, build, lit, dark, from = [-1, -1], spread = 1) {
  const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const rec = {
    add(x, y) { b.x0 = Math.min(b.x0, x); b.y0 = Math.min(b.y0, y); b.x1 = Math.max(b.x1, x); b.y1 = Math.max(b.y1, y); },
    moveTo(x, y) { this.add(x, y); }, lineTo(x, y) { this.add(x, y); },
    quadraticCurveTo(a, c, x, y) { this.add(a, c); this.add(x, y); },
    arcTo(a, c, x, y) { this.add(a, c); this.add(x, y); },
    arc(x, y, r) { this.add(x - r, y - r); this.add(x + r, y + r); },
    ellipse(x, y, rx, ry) { this.add(x - rx, y - ry); this.add(x + rx, y + ry); },
    closePath() {},
  };
  build(rec);
  const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
  const hw = (b.x1 - b.x0) / 2 * spread, hh = (b.y1 - b.y0) / 2 * spread;
  const g = ctx.createLinearGradient(cx + from[0] * hw, cy + from[1] * hh, cx - from[0] * hw, cy - from[1] * hh);
  g.addColorStop(0, lit);
  g.addColorStop(1, dark);
  ctx.beginPath();
  build(ctx);
  ctx.fillStyle = g;
  ctx.fill();
}

// Airbrushed glow.
function glow(ctx, x, y, r, color, a, sy = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, sy);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, color + a + ')');
  g.addColorStop(0.45, color + a * 0.45 + ')');
  g.addColorStop(1, color + '0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// A soft lit edge along a shape (light catching a rim), painted not inked.
function litEdge(ctx, build, color, dx, dy, width = 2.5) {
  ctx.save();
  ctx.beginPath();
  build(ctx);
  ctx.clip();
  ctx.translate(dx, dy);
  ctx.beginPath();
  build(ctx);
  ctx.lineWidth = width * 2;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.restore();
}

// Gentle gouache brush texture over everything painted so far.
function brushTexture(ctx, x0, y0, w, h, seed, n) {
  const r = new Rng(seed);
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = x0 + r.next() * w, y = y0 + r.next() * h;
    const len = 3 + r.next() * 9, a = r.next() * Math.PI;
    ctx.globalAlpha = 0.012 + r.next() * 0.022;
    ctx.strokeStyle = r.next() < 0.5 ? '#ffffff' : '#000010';
    ctx.lineWidth = 3 + r.next() * 6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.restore();
}

export class BedroomArena {
  constructor() {
    this.id = 'bedroom';
    this.motes = [];
    this.twinkles = [];
  }

  spots(W) {
    return {
      hero: { x: W * 0.25, y: 394, scale: 1 },
      foe: { x: W * 0.745, y: 314, scale: 0.84 },
    };
  }

  build(W, H, px) {
    this.W = W;
    this.H = H;
    this.px = px;
    this.back = this.paint(W, H, px, (ctx) => this.paintBack(ctx, W, H));
    this.front = this.paint(W, H, px, (ctx) => this.paintFront(ctx, W, H));
    if (this.pixel) {
      dither(this.back.getContext('2d'), this.back.width, this.back.height, 18);
      pixelize(this.front.getContext('2d'), this.front.width, this.front.height);
    }
    const r = new Rng(7);
    // dust motes drifting through the moonbeam
    const wx = W * 0.5;
    this.motes = Array.from({ length: 26 }, () => ({
      x: wx - 220 + r.next() * 360, y: 60 + r.next() * 300, s: 0.8 + r.next() * 2, v: 3 + r.next() * 7, ph: r.next() * 6,
    }));
    this.twinkles = Array.from({ length: 9 }, () => ({ x: wx - 78 + r.next() * 150, y: 32 + r.next() * 70, ph: r.next() * 6, s: 1.6 + r.next() * 2.6 }));
  }

  paint(W, H, px, fn) {
    const c = document.createElement('canvas');
    c.width = Math.ceil((W + MARGIN * 2) * px);
    c.height = Math.ceil((H + MARGIN * 2) * px);
    const ctx = c.getContext('2d');
    ctx.scale(px, px);
    ctx.translate(MARGIN, MARGIN);
    fn(ctx);
    return c;
  }

  paintBack(ctx, W, H) {
    const floorY = FLOOR_Y;
    const L = -MARGIN, R = W + MARGIN, T = -MARGIN, B = H + MARGIN;
    const wx = W * 0.5, wy = 22, ww = 184, wh = 140;

    // ---- wall ----
    const g = ctx.createLinearGradient(0, T, 0, floorY);
    g.addColorStop(0, P.wallTop);
    g.addColorStop(1, P.wallBot);
    ctx.fillStyle = g;
    ctx.fillRect(L, T, R - L, floorY - T);
    // faint wallpaper stripes
    ctx.fillStyle = 'rgba(140,130,220,0.035)';
    for (let x = L; x < R; x += 46) ctx.fillRect(x, T, 20, floorY - T);
    // darker upper corners
    for (const cx of [L, R]) glow(ctx, cx, T, 420, 'rgba(4,2,14,', 0.55, 0.8);
    // moonlight spilling on the wall around the window
    glow(ctx, wx, wy + wh * 0.55, 330, P.moonGlow, 0.22, 0.8);
    // glow-in-the-dark star stickers (faint green)
    const rs = new Rng(3);
    for (let i = 0; i < 16; i++) {
      const x = rs.next() * W, y = 6 + rs.next() * 160;
      if (Math.abs(x - wx) < 140) continue;
      const s = 4 + rs.next() * 4;
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#C8FF9E';
      ctx.shadowColor = '#9DFF6A';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      starPath(ctx, x, y, s, s * 0.45, 5, -Math.PI / 2 + rs.next());
      ctx.fill();
      ctx.restore();
    }

    // ---- window ----
    const frame = (c) => rr(c, wx - ww / 2 - 11, wy - 11, ww + 22, wh + 22, 6);
    paintShape(ctx, frame, '#8C86B8', '#3A355F', [1, -1]);
    const sky = ctx.createLinearGradient(0, wy, 0, wy + wh);
    sky.addColorStop(0, P.sky0);
    sky.addColorStop(1, P.sky1);
    ctx.fillStyle = sky;
    ctx.beginPath();
    rr(ctx, wx - ww / 2, wy, ww, wh, 3);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    rr(ctx, wx - ww / 2, wy, ww, wh, 3);
    ctx.clip();
    // moon with an airbrushed halo
    const mx = wx + 46, my = wy + 42;
    glow(ctx, mx, my, 70, 'rgba(255,240,200,', 0.5);
    ctx.fillStyle = P.moon;
    ctx.beginPath();
    ctx.arc(mx, my, 21, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0d1640';
    ctx.beginPath();
    ctx.arc(mx + 10, my - 6, 18, 0, Math.PI * 2);
    ctx.fill();
    // far rooftops and a tree line, layered by value
    ctx.fillStyle = '#121a45';
    ctx.beginPath();
    ctx.moveTo(wx - ww / 2, wy + wh);
    for (let i = 0; i <= 8; i++) ctx.quadraticCurveTo(wx - ww / 2 + i * 23 + 11, wy + wh - 40 - (i % 3) * 8, wx - ww / 2 + i * 23 + 23, wy + wh - 26);
    ctx.lineTo(wx + ww / 2, wy + wh);
    ctx.fill();
    ctx.fillStyle = '#080d2a';
    ctx.beginPath();
    ctx.moveTo(wx - ww / 2, wy + wh);
    for (let i = 0; i <= 6; i++) {
      const x = wx - ww / 2 + i * (ww / 6);
      ctx.lineTo(x, wy + wh - 18 - (i % 2) * 12);
      ctx.lineTo(x + ww / 12, wy + wh - 28 - (i % 3) * 5);
    }
    ctx.lineTo(wx + ww / 2, wy + wh);
    ctx.fill();
    // a couple of lit windows far away
    ctx.fillStyle = 'rgba(255,200,120,.8)';
    ctx.fillRect(wx - 52, wy + wh - 16, 3, 4);
    ctx.fillRect(wx + 30, wy + wh - 20, 3, 4);
    ctx.restore();
    // window cross bars (painted, moonlit on the left)
    for (const [x, y, w, h] of [[wx - 3.5, wy, 7, wh], [wx - ww / 2, wy + wh / 2 - 3.5, ww, 7]]) {
      paintShape(ctx, (c) => { c.moveTo(x, y); c.lineTo(x + w, y); c.lineTo(x + w, y + h); c.lineTo(x, y + h); c.closePath(); }, '#9993C6', '#45406C', [-1, -1]);
    }
    // curtains: deep crimson-violet folds, moonlit inner edges
    for (const side of [-1, 1]) {
      const x0 = wx + side * (ww / 2 + 4);
      const cur = (c) => {
        c.moveTo(x0 - side * 26, wy - 20);
        c.lineTo(x0 + side * 44, wy - 20);
        c.quadraticCurveTo(x0 + side * 32, wy + wh * 0.6, x0 + side * 50, wy + wh + 34);
        c.lineTo(x0 + side * 4, wy + wh + 34);
        c.quadraticCurveTo(x0 - side * 28, wy + wh * 0.5, x0 - side * 26, wy - 20);
        c.closePath();
      };
      paintShape(ctx, cur, side < 0 ? '#9C3A6E' : '#7E2E62', '#2E1235', [-side, -0.4]);
      // fold shadows
      ctx.save();
      ctx.beginPath(); cur(ctx); ctx.clip();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = '#1c0a22';
      ctx.lineWidth = 7;
      for (const f of [0.35, 0.65]) {
        ctx.beginPath();
        ctx.moveTo(x0 + side * (44 * f - 4), wy - 18);
        ctx.quadraticCurveTo(x0 + side * (36 * f), wy + wh * 0.6, x0 + side * (50 * f + 4), wy + wh + 34);
        ctx.stroke();
      }
      ctx.restore();
      litEdge(ctx, cur, 'rgba(255,200,230,.55)', side * 3, 0, 2);
    }
    paintShape(ctx, (c) => rr(c, wx - ww / 2 - 52, wy - 28, ww + 104, 10, 5), '#7a5a48', '#2e1f22', [-1, -1]);

    // ---- shelves (dark silhouettes with a few lit edges) ----
    const sx = W * 0.1;
    const shelfL = (c) => rr(c, sx - 72, 120, 164, 10, 3);
    paintShape(ctx, shelfL, '#5b3d33', '#21162a', [-1, -1]);
    litEdge(ctx, shelfL, 'rgba(255,190,120,.7)', 0, 2, 1.5);
    const books = ['#2a3f8f', '#8a6a1c', '#215a36', '#7a2032', '#4a2f78'];
    books.forEach((col, i) => {
      const b = (c) => rr(c, sx - 64 + i * 18, 70 + (i % 2) * 8, 16, 50 - (i % 2) * 8, 2);
      paintShape(ctx, b, col, '#120c1e', [-1, -0.3]);
      litEdge(ctx, b, 'rgba(255,180,110,.45)', 2, 0, 1.2);
    });
    const ball = (c) => c.arc(sx + 58, 102, 17, 0, Math.PI * 2);
    paintShape(ctx, ball, '#C8662E', '#3a1a1c', [-1, -1]);
    glow(ctx, sx + 51, 95, 7, 'rgba(255,220,170,', 0.7);

    const rx = W * 0.9, sy = 96;
    const shelfR = (c) => rr(c, rx - 82, sy, 164, 10, 3);
    paintShape(ctx, shelfR, '#3c2d45', '#160f22', [1, -1]);
    litEdge(ctx, shelfR, 'rgba(190,210,255,.55)', 0, 2, 1.5);
    const rocket = (c) => { c.moveTo(rx - 10, sy - 2); c.lineTo(rx + 10, sy - 2); c.lineTo(rx + 10, sy - 42); c.quadraticCurveTo(rx, sy - 68, rx - 10, sy - 42); c.closePath(); };
    paintShape(ctx, rocket, '#9aa3c8', '#1e2040', [-1, -0.2]);
    litEdge(ctx, rocket, 'rgba(210,225,255,.8)', -2, 0, 1.4);
    glow(ctx, rx, sy - 32, 6, 'rgba(120,220,255,', 0.9);
    const blk1 = (c) => rr(c, rx + 30, sy - 30, 28, 28, 3);
    const blk2 = (c) => rr(c, rx - 64, sy - 26, 24, 24, 3);
    paintShape(ctx, blk1, '#2c6e46', '#0f2018', [-1, -1]);
    paintShape(ctx, blk2, '#8a6e1c', '#24180e', [-1, -1]);
    litEdge(ctx, blk1, 'rgba(190,210,255,.5)', -2, 2, 1.2);

    // ---- floor ----
    const fg = ctx.createLinearGradient(0, floorY, 0, B);
    fg.addColorStop(0, P.floorFar);
    fg.addColorStop(1, P.floorNear);
    ctx.fillStyle = fg;
    ctx.fillRect(L, floorY, R - L, B - floorY);
    // planks in perspective: alternating boards, then seams
    {
      const vx0 = W / 2, vy0 = -260, t0 = (floorY - vy0) / (B - vy0);
      for (let i = -14; i < 14; i++) {
        if (i % 2) continue;
        const b0 = W / 2 + i * 80, b1 = b0 + 80;
        ctx.beginPath();
        ctx.moveTo(vx0 + (b0 - vx0) * t0, floorY);
        ctx.lineTo(vx0 + (b1 - vx0) * t0, floorY);
        ctx.lineTo(b1, B);
        ctx.lineTo(b0, B);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,200,160,.045)';
        ctx.fill();
      }
      // board ends
      ctx.strokeStyle = 'rgba(20,10,20,.25)';
      ctx.lineWidth = 1.5;
      const rr0 = new Rng(5);
      for (let row = 0; row < 7; row++) {
        const y = floorY + 8 + row * row * 5 + row * 6;
        for (let i = -14; i < 14; i++) {
          if (rr0.next() < 0.6) continue;
          const tt = (y - vy0) / (B - vy0);
          const xa = vx0 + (W / 2 + i * 80 - vx0) * tt, xb = vx0 + (W / 2 + (i + 1) * 80 - vx0) * tt;
          ctx.beginPath(); ctx.moveTo(xa, y); ctx.lineTo(xb, y); ctx.stroke();
        }
      }
    }
    ctx.strokeStyle = 'rgba(20,10,20,.32)';
    ctx.lineWidth = 2;
    const vx = W / 2, vy = -260;
    for (let i = -14; i <= 14; i++) {
      const bx = W / 2 + i * 80;
      const t0 = (floorY - vy) / (B - vy);
      ctx.beginPath();
      ctx.moveTo(vx + (bx - vx) * t0, floorY);
      ctx.lineTo(bx, B);
      ctx.stroke();
    }
    // baseboard
    paintShape(ctx, (c) => rr(c, L - 10, floorY - 12, R - L + 20, 15, 1), '#4b4270', '#1d1733', [0, -1]);
    ctx.fillStyle = 'rgba(200,210,255,.18)';
    ctx.fillRect(L, floorY - 12, R - L, 2);

    // ---- warm desk-lamp glow from the left edge ----
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, L + 20, 140, 420, P.lamp, 0.42, 0.85);
    glow(ctx, L + 40, 330, 360, P.lamp, 0.24, 0.5);
    ctx.restore();

    // ---- toy chest at back left, mostly in shadow, warm rim from the lamp ----
    const cx = W * 0.14;
    const chest = (c) => rr(c, cx - 72, floorY - 30, 144, 72, 6);
    const lid = (c) => rr(c, cx - 78, floorY - 46, 156, 22, 6);
    paintShape(ctx, chest, '#4a3285', '#140d2a', [-1, -0.6]);
    paintShape(ctx, lid, '#5c40a0', '#1c1238', [-1, -0.6]);
    litEdge(ctx, lid, 'rgba(255,180,110,.75)', 3, 3, 1.6);
    litEdge(ctx, chest, 'rgba(255,170,100,.45)', 3, 0, 1.4);
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#b8922a';
    ctx.beginPath();
    starPath(ctx, cx, floorY + 6, 14, 6);
    ctx.fill();
    ctx.restore();

    // ---- block fortress behind the foe ----
    this.paintFortress(ctx, W * 0.74, floorY + 22);

    // ---- moonlight band across the floor ----
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const mg = ctx.createLinearGradient(0, floorY, 0, B);
    mg.addColorStop(0, 'rgba(150,170,255,.10)');
    mg.addColorStop(0.5, 'rgba(150,170,255,.16)');
    mg.addColorStop(1, 'rgba(150,170,255,.04)');
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.moveTo(wx - 110, floorY);
    ctx.lineTo(wx + 110, floorY);
    ctx.lineTo(wx + 300, B);
    ctx.lineTo(wx - 330, B);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // ---- big round rug = the arena ring, the brightest, clearest area ----
    const rugY = 360, rugRX = W * 0.47, rugRY = 82;
    const rug = (c) => ellipse(c, W / 2, rugY, rugRX, rugRY);
    ctx.save();
    ctx.beginPath(); rug(ctx);
    ctx.fillStyle = '#103f45';
    ctx.fill();
    ctx.clip();
    // moonlit center, darker toward the rim
    const rg = ctx.createRadialGradient(W / 2 - 30, rugY - 14, 20, W / 2, rugY, rugRX);
    rg.addColorStop(0, '#45b8ad');
    rg.addColorStop(0.45, '#2a8f8a');
    rg.addColorStop(1, '#0f3d44');
    ctx.save();
    ctx.translate(W / 2, rugY);
    ctx.scale(1, rugRY / rugRX);
    ctx.translate(-W / 2, -rugY);
    ctx.fillStyle = rg;
    ctx.fillRect(L, rugY - rugRX, R - L, rugRX * 2);
    ctx.restore();
    // woven ring pattern, painted soft
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(255,201,20,.42)';
    ctx.setLineDash([18, 14]);
    ctx.beginPath();
    ellipse(ctx, W / 2, rugY, W * 0.43, 70);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(160,255,240,.12)';
    ctx.beginPath();
    ellipse(ctx, W / 2, rugY, W * 0.31, 46);
    ctx.stroke();
    // warm lamp light on the left side of the rug
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, W * 0.18, rugY - 6, 240, P.lamp, 0.18, 0.4);
    ctx.restore();
    // rug edge: lit on the near side, soft shadow on the far side
    ctx.save();
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(120,230,215,.35)';
    ctx.beginPath();
    ctx.ellipse(W / 2, rugY + 2, rugRX - 2, rugRY - 2, 0, 0.15, Math.PI - 0.15);
    ctx.stroke();
    ctx.restore();

    // ---- light pools where the two toys stand ----
    const sp = this.spots(W);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, sp.hero.x, sp.hero.y, 140, P.lamp, 0.45, 0.24);
    glow(ctx, sp.foe.x, sp.foe.y, 115, P.moonGlow, 0.42, 0.24);
    ctx.restore();

    if (!this.pixel) brushTexture(ctx, L, T, R - L, B - T, 11, Math.round((R - L) * (B - T) / 260));
  }

  paintFortress(ctx, x, baseY) {
    const cols = [['#B8243A', '#3a0c1c'], ['#2448B8', '#0c1440'], ['#D9A512', '#3a2408'], ['#26864A', '#0a2414']];
    let k = 0;
    const s = 30;
    const layout = [
      [-5, 0], [-4, 0], [-3, 0], [2, 0], [3, 0], [4, 0],
      [-5, 1], [-3, 1], [2, 1], [4, 1],
      [-5, 2], [-4, 2], [-3, 2], [2, 2], [3, 2], [4, 2],
    ];
    for (const [cx, cy] of layout) {
      const bx = x + cx * s, by = baseY - (cy + 1) * s - 10;
      const [lit, dark] = cols[k % cols.length];
      const blk = (c) => rr(c, bx, by, s - 2, s - 2, 3);
      paintShape(ctx, blk, lit, dark, [-1, -1], 1.3);
      // warm rim of lamp light on the top-left edges, cool moon on top
      litEdge(ctx, blk, 'rgba(255,190,120,.55)', 2, 2, 1.3);
      // block stud on top
      ctx.fillStyle = 'rgba(255,255,255,.08)';
      ctx.fillRect(bx + 5, by + 4, s - 12, 3);
      k++;
    }
    // little flags
    for (const fx of [x - 4 * s + 14, x + 3 * s + 14]) {
      const top = baseY - 3 * s - 52;
      ctx.strokeStyle = '#3a304e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(fx, baseY - 3 * s - 10);
      ctx.lineTo(fx, top);
      ctx.stroke();
      const flag = (c) => { c.moveTo(fx, top); c.lineTo(fx + 26, top + 8); c.lineTo(fx, top + 16); c.closePath(); };
      paintShape(ctx, flag, '#FFC914', '#8a4a10', [-1, -1]);
    }
    // soft contact shadow at the base
    ctx.save();
    ctx.globalAlpha = 0.45;
    glow(ctx, x - 15, baseY - 8, 190, 'rgba(5,3,15,', 0.8, 0.12);
    ctx.restore();
  }

  paintFront(ctx, W, H) {
    // Foreground props: inked cels like the characters (they sit in front of
    // the toys), mostly in shadow with a hard rim of light on their top edges.
    const blue = (c) => rr(c, -44, H - 72, 96, 96, 8);
    toon(ctx, blue, '#183A9C', true, { line: 6, highlight: [-14, H - 62, 18, 5] });
    const yellow = (c) => rr(c, W - 60, H - 60, 100, 100, 8);
    toon(ctx, yellow, '#B88A10', true, { line: 6, highlight: [W - 32, H - 50, 18, 5] });
    const ball = (c) => c.arc(W - 72, H - 8, 26, 0, Math.PI * 2);
    toon(ctx, ball, '#B21E34', true, { line: 5, highlight: [W - 80, H - 18, 8, 5] });
    // hard rim light on the top edges (moonlight)
    for (const [b, x, y, w] of [[blue, -44, H - 72, 96], [yellow, W - 60, H - 60, 100]]) {
      ctx.save();
      ctx.beginPath(); b(ctx); ctx.clip();
      ctx.fillStyle = 'rgba(200,220,255,.75)';
      ctx.fillRect(x + 6, y, w - 12, 4);
      ctx.restore();
    }
  }

  drawBack(ctx, cam, t) {
    this.drawBackImage(ctx, cam);
    this.drawDecor(ctx, cam, t);
  }

  drawBackImage(ctx, cam) {
    const px = this.px;
    ctx.drawImage(this.back, -MARGIN + cam.x * 0.35, -MARGIN + cam.y * 0.35, this.back.width / px, this.back.height / px);
  }

  // Animated bits of the stage (crowd, twinkles, moonbeam).
  drawDecor(ctx, cam, t) {
    this.drawCrowd(ctx, cam, t);
    // twinkling window stars
    for (const s of this.twinkles) {
      const a = 0.35 + 0.65 * Math.sin(t / 500 + s.ph);
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      starPath(ctx, s.x + cam.x * 0.35, s.y + cam.y * 0.35, s.s, s.s * 0.35, 4);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // moonbeam slanting down from the window
    const wx = this.W * 0.5;
    const g = ctx.createLinearGradient(wx, 60, wx - 140, 440);
    g.addColorStop(0, 'rgba(170,190,255,0.20)');
    g.addColorStop(1, 'rgba(170,190,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(wx - 92, 162);
    ctx.lineTo(wx + 92, 162);
    ctx.lineTo(wx + 60 + Math.sin(t / 2000) * 6, 440);
    ctx.lineTo(wx - 300, 440);
    ctx.closePath();
    ctx.fill();
  }

  // Arcade-stage crowd: a couple of background toys that bob along and jump
  // when a big hit shakes the room (`excite` comes from the camera shake).
  drawCrowd(ctx, cam, t) {
    const W = this.W;
    const ex = this.excite || 0;
    const ox = cam.x * 0.35, oy = cam.y * 0.35;
    // teddy bear on the toy chest, waving
    {
      const x = W * 0.14 - 30 + ox, y = FLOOR_Y - 46 + oy;
      const hop = -Math.abs(Math.sin(t / (ex > 0.05 ? 90 : 420))) * (3 + ex * 16);
      const wave = Math.sin(t / (ex > 0.05 ? 80 : 260)) * 0.6;
      ctx.save();
      ctx.translate(x, y + hop);
      const fur = '#8A5A3C', muzzle = '#D9B48A';
      ctx.save(); ctx.translate(-12, -30); ctx.rotate(-1.9 + wave);
      toon(ctx, (c) => rr(c, -4, -2, 8, 18, 4), fur, true, { line: 2.4 });
      ctx.restore();
      toon(ctx, (c) => ellipse(c, 0, -16, 13, 16), fur, true, { line: 2.4 });
      toon(ctx, (c) => ellipse(c, 2, -12, 7, 8), muzzle, true, { line: 1.8, rim: false });
      for (const ex2 of [-9, 9]) toon(ctx, (c) => c.arc(ex2, -48, 6, 0, Math.PI * 2), fur, true, { line: 2.2 });
      toon(ctx, (c) => c.arc(0, -40, 13, 0, Math.PI * 2), fur, true, { line: 2.4 });
      toon(ctx, (c) => ellipse(c, 3, -36, 6, 4.5), muzzle, true, { line: 1.6, rim: false });
      ctx.fillStyle = '#14111A';
      for (const e of [-4, 7]) { ctx.beginPath(); ctx.arc(e, -43, 1.6, 0, Math.PI * 2); ctx.fill(); }
      ctx.beginPath(); ctx.arc(4, -37.5, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(11, -28); ctx.rotate(0.5);
      toon(ctx, (c) => rr(c, -4, -2, 8, 16, 4), fur, true, { line: 2.4 });
      ctx.restore();
      ctx.restore();
    }
    // rubber duck on the right shelf, bouncing
    {
      const x = W * 0.9 - 26 + ox, y = 96 + oy;
      const hop = -Math.abs(Math.sin(t / (ex > 0.05 ? 85 : 360) + 1)) * (2 + ex * 14);
      ctx.save();
      ctx.translate(x, y + hop);
      const yel = '#E8B416';
      toon(ctx, (c) => ellipse(c, 0, -8, 12, 8), yel, true, { line: 2.2 });
      toon(ctx, (c) => c.arc(4, -21, 7, 0, Math.PI * 2), yel, true, { line: 2.2 });
      toon(ctx, (c) => { c.moveTo(10, -22); c.lineTo(17, -20); c.lineTo(10, -17); c.closePath(); }, '#E0602E', true, { line: 1.6, rim: false });
      ctx.fillStyle = '#14111A';
      ctx.beginPath(); ctx.arc(6, -23, 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  drawMotes(ctx, cam, t, dt) {
    ctx.fillStyle = 'rgba(220,230,255,.8)';
    for (const m of this.motes) {
      m.y -= (m.v * dt) / 1000;
      if (m.y < 40) m.y = 360;
      const x = m.x + Math.sin(t / 1400 + m.ph) * 14 + cam.x * 0.6;
      ctx.globalAlpha = 0.25 + 0.3 * Math.sin(t / 700 + m.ph);
      ctx.beginPath();
      ctx.arc(x, m.y + cam.y * 0.6, m.s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawFront(ctx, cam) {
    const px = this.px;
    ctx.drawImage(this.front, -MARGIN + cam.x * 1.4, -MARGIN + cam.y * 1.4, this.front.width / px, this.front.height / px);
  }
}
