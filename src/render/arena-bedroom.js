// Arena 1: Bedroom Block Fortress. TEMPORARY code-drawn art in the approved style.
// Static parts are pre-rendered once per resize; only small bits animate.
// When Astra's plates arrive, `layers.back` / `layers.front` become images.
import { INK, toon, rr, ellipse, starPath, line, FONT } from './draw.js';
import { Rng } from '../logic/rng.js';

const MARGIN = 60; // extra painted area so shake/zoom never shows an edge

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
    const r = new Rng(7);
    this.motes = Array.from({ length: 26 }, () => ({
      x: r.next() * W, y: 40 + r.next() * 300, s: 1 + r.next() * 2.4, v: 4 + r.next() * 9, ph: r.next() * 6,
    }));
    const wx = W * 0.5;
    this.twinkles = Array.from({ length: 9 }, () => ({ x: wx - 70 + r.next() * 140, y: 34 + r.next() * 90, ph: r.next() * 6, s: 2 + r.next() * 3 }));
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
    const floorY = 232;
    // wall
    const g = ctx.createLinearGradient(0, -MARGIN, 0, floorY);
    g.addColorStop(0, '#3d2f7a');
    g.addColorStop(1, '#6f5bb8');
    ctx.fillStyle = g;
    ctx.fillRect(-MARGIN, -MARGIN, W + MARGIN * 2, floorY + MARGIN);
    // wallpaper stripes
    ctx.fillStyle = 'rgba(255,255,255,0.045)';
    for (let x = -MARGIN; x < W + MARGIN; x += 44) ctx.fillRect(x, -MARGIN, 20, floorY + MARGIN);
    // glow-in-the-dark star stickers
    const r = new Rng(3);
    for (let i = 0; i < 14; i++) {
      const x = r.next() * W, y = 10 + r.next() * 150;
      if (Math.abs(x - W * 0.5) < 120) continue;
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#d6ff9a';
      ctx.shadowColor = '#d6ff9a';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      starPath(ctx, x, y, 6 + r.next() * 4, 3);
      ctx.fill();
      ctx.restore();
    }
    // window
    const wx = W * 0.5, wy = 24, ww = 180, wh = 136;
    toon(ctx, (c) => rr(c, wx - ww / 2 - 10, wy - 10, ww + 20, wh + 20, 12), '#f4d9a6', '#d6b47c');
    const sky = ctx.createLinearGradient(0, wy, 0, wy + wh);
    sky.addColorStop(0, '#0e1a4a');
    sky.addColorStop(1, '#2a3f8f');
    ctx.fillStyle = sky;
    ctx.beginPath();
    rr(ctx, wx - ww / 2, wy, ww, wh, 6);
    ctx.fill();
    // moon
    ctx.save();
    ctx.beginPath();
    rr(ctx, wx - ww / 2, wy, ww, wh, 6);
    ctx.clip();
    ctx.fillStyle = '#fff4c2';
    ctx.shadowColor = '#fff4c2';
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(wx + 44, wy + 42, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#16245e';
    ctx.beginPath();
    ctx.arc(wx + 54, wy + 36, 18, 0, Math.PI * 2);
    ctx.fill();
    // far rooftops
    ctx.fillStyle = '#0a1238';
    ctx.beginPath();
    ctx.moveTo(wx - ww / 2, wy + wh);
    for (let i = 0; i <= 6; i++) {
      const x = wx - ww / 2 + i * (ww / 6);
      ctx.lineTo(x, wy + wh - 22 - (i % 2) * 14);
      ctx.lineTo(x + ww / 12, wy + wh - 34 - (i % 3) * 6);
    }
    ctx.lineTo(wx + ww / 2, wy + wh);
    ctx.fill();
    ctx.restore();
    // window cross
    line(ctx, [wx, wy, wx, wy + wh], 6, '#f4d9a6');
    line(ctx, [wx - ww / 2, wy + wh / 2, wx + ww / 2, wy + wh / 2], 6, '#f4d9a6');
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK;
    ctx.beginPath();
    rr(ctx, wx - ww / 2, wy, ww, wh, 6);
    ctx.stroke();
    // curtains
    for (const side of [-1, 1]) {
      toon(ctx, (c) => {
        const x0 = wx + side * (ww / 2 + 4);
        c.moveTo(x0 - side * 24, wy - 18);
        c.lineTo(x0 + side * 40, wy - 18);
        c.quadraticCurveTo(x0 + side * 30, wy + wh * 0.6, x0 + side * 46, wy + wh + 30);
        c.lineTo(x0 + side * 4, wy + wh + 30);
        c.quadraticCurveTo(x0 - side * 26, wy + wh * 0.5, x0 - side * 24, wy - 18);
        c.closePath();
      }, '#ff7aa8', '#d9567f');
    }
    toon(ctx, (c) => rr(c, wx - ww / 2 - 46, wy - 26, ww + 92, 12, 6), '#c98b55', '#9c6236');
    // shelf with toys (left)
    const sx = W * 0.1;
    toon(ctx, (c) => rr(c, sx - 70, 120, 160, 12, 4), '#c98b55', '#9c6236');
    const books = ['#3d7bf2', '#ffd23f', '#5cc95a', '#ef4b3c', '#8e5cf2'];
    books.forEach((col, i) => toon(ctx, (c) => rr(c, sx - 62 + i * 18, 70 + (i % 2) * 8, 16, 50 - (i % 2) * 8, 3), col, null, { line: 3.5 }));
    toon(ctx, (c) => c.arc(sx + 58, 102, 17, 0, Math.PI * 2), '#ff9f1c', '#e07b10', { highlight: [sx + 52, 96, 5, 4] });
    // shelf right with a tiny rocket
    const rx = W * 0.9, sy = 96;
    toon(ctx, (c) => rr(c, rx - 80, sy, 160, 12, 4), '#c98b55', '#9c6236');
    toon(ctx, (c) => { c.moveTo(rx - 10, sy - 2); c.lineTo(rx + 10, sy - 2); c.lineTo(rx + 10, sy - 42); c.quadraticCurveTo(rx, sy - 68, rx - 10, sy - 42); c.closePath(); }, '#e9eef7', '#b9c3d6', { line: 4 });
    toon(ctx, (c) => c.arc(rx, sy - 32, 5, 0, Math.PI * 2), '#7fd3f7', null, { line: 3 });
    toon(ctx, (c) => rr(c, rx + 30, sy - 32, 30, 30, 5), '#5cc95a', '#3e9b44', { line: 4 });
    this.letterOn(ctx, 'A', rx + 45, sy - 17, 18);
    toon(ctx, (c) => rr(c, rx - 64, sy - 28, 26, 26, 5), '#ffd23f', '#e0a91b', { line: 4 });
    this.letterOn(ctx, '3', rx - 51, sy - 15, 16);

    // floor
    const fg = ctx.createLinearGradient(0, floorY, 0, H + MARGIN);
    fg.addColorStop(0, '#a8693c');
    fg.addColorStop(1, '#d9995e');
    ctx.fillStyle = fg;
    ctx.fillRect(-MARGIN, floorY, W + MARGIN * 2, H - floorY + MARGIN);
    // plank lines in perspective
    ctx.strokeStyle = 'rgba(80,40,20,.35)';
    ctx.lineWidth = 2;
    const vx = W / 2, vy = -260;
    for (let i = -14; i <= 14; i++) {
      const bx = W / 2 + i * 80;
      const t0 = (floorY - vy) / (H + MARGIN - vy);
      ctx.beginPath();
      ctx.moveTo(vx + (bx - vx) * t0, floorY);
      ctx.lineTo(bx, H + MARGIN);
      ctx.stroke();
    }
    // baseboard
    toon(ctx, (c) => rr(c, -MARGIN - 10, floorY - 12, W + MARGIN * 2 + 20, 16, 2), '#f4d9a6', '#d6b47c', { line: 4 });

    // block fortress behind the foe
    this.paintFortress(ctx, W * 0.74, floorY + 22);
    // toy chest behind hero
    const cx = W * 0.14;
    toon(ctx, (c) => rr(c, cx - 70, floorY - 30, 140, 70, 10), '#8e5cf2', '#6a3fcc', { highlight: [cx - 40, floorY - 20, 20, 5] });
    toon(ctx, (c) => rr(c, cx - 76, floorY - 44, 152, 22, 8), '#a57bff', '#8e5cf2');
    toon(ctx, (c) => starPath(c, cx, floorY + 6, 14, 6), '#ffd23f', null, { line: 3.5 });

    // big round rug = the arena ring
    const rugY = 360;
    toon(ctx, (c) => ellipse(c, W / 2, rugY, W * 0.47, 82), '#2fb7a8', '#24907f', { shadeOffset: 0 });
    ctx.save();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ffd23f';
    ctx.setLineDash([18, 14]);
    ctx.beginPath();
    ellipse(ctx, W / 2, rugY, W * 0.43, 70);
    ctx.stroke();
    ctx.restore();
    toon(ctx, (c) => ellipse(c, W / 2, rugY, W * 0.3, 44), '#3cd0bf', null, { line: 0, noOutline: true });
    // little spot rugs under each fighter
    const sp = this.spots(W);
    toon(ctx, (c) => ellipse(c, sp.hero.x, sp.hero.y, 112, 26), '#ff9f1c', '#e07b10', { line: 4 });
    toon(ctx, (c) => ellipse(c, sp.foe.x, sp.foe.y, 92, 21), '#ef4b3c', '#b8322a', { line: 4 });
  }

  paintFortress(ctx, x, baseY) {
    const cols = ['#ef4b3c', '#3d7bf2', '#ffd23f', '#5cc95a', '#8e5cf2', '#ff9f1c'];
    const letters = 'ABCDEFGHIJKL';
    let k = 0;
    const s = 30;
    const layout = [
      [-5, 0], [-4, 0], [-3, 0], [2, 0], [3, 0], [4, 0],
      [-5, 1], [-3, 1], [2, 1], [4, 1],
      [-5, 2], [-4, 2], [-3, 2], [2, 2], [3, 2], [4, 2],
    ];
    for (const [cx, cy] of layout) {
      const bx = x + cx * s, by = baseY - (cy + 1) * s - 10;
      const col = cols[k % cols.length];
      toon(ctx, (c) => rr(c, bx, by, s - 2, s - 2, 5), col, shade(col), { line: 3.5, shadeOffset: 4 });
      if ((cx + cy) % 2 === 0) this.letterOn(ctx, letters[k % letters.length], bx + s / 2 - 1, by + s / 2, 15);
      k++;
    }
    // flags
    for (const fx of [x - 4 * s + 14, x + 3 * s + 14]) {
      line(ctx, [fx, baseY - 3 * s - 10, fx, baseY - 3 * s - 50], 4);
      toon(ctx, (c) => { c.moveTo(fx, baseY - 3 * s - 50); c.lineTo(fx + 26, baseY - 3 * s - 42); c.lineTo(fx, baseY - 3 * s - 34); c.closePath(); }, '#ffd23f', null, { line: 3 });
    }
  }

  letterOn(ctx, ch, x, y, size) {
    ctx.font = `900 ${size}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.strokeText(ch, x, y + 1);
    ctx.fillText(ch, x, y + 1);
  }

  paintFront(ctx, W, H) {
    // foreground blocks peeking in at the corners (parallax layer)
    toon(ctx, (c) => rr(c, -40, H - 70, 92, 92, 12), '#3d7bf2', '#2a56b8', { line: 6, highlight: [-14, H - 58, 20, 6] });
    this.letterOn(ctx, 'B', 6, H - 26, 44);
    toon(ctx, (c) => rr(c, W - 58, H - 58, 96, 96, 12), '#ffd23f', '#e0a91b', { line: 6, highlight: [W - 30, H - 46, 20, 6] });
    this.letterOn(ctx, '7', W - 10, H - 12, 44);
    toon(ctx, (c) => c.arc(W - 70, H - 8, 26, 0, Math.PI * 2), '#ef4b3c', '#b8322a', { line: 5, highlight: [W - 78, H - 18, 7, 5] });
  }

  drawBack(ctx, cam, t) {
    const px = this.px;
    ctx.drawImage(this.back, -MARGIN + cam.x * 0.35, -MARGIN + cam.y * 0.35, this.back.width / px, this.back.height / px);
    // twinkling window stars
    for (const s of this.twinkles) {
      const a = 0.45 + 0.55 * Math.sin(t / 500 + s.ph);
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      starPath(ctx, s.x + cam.x * 0.35, s.y + cam.y * 0.35, s.s, s.s * 0.4, 4);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // moonbeam
    const wx = this.W * 0.5;
    const g = ctx.createLinearGradient(wx, 40, wx - 120, 420);
    g.addColorStop(0, 'rgba(200,220,255,0.16)');
    g.addColorStop(1, 'rgba(200,220,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(wx - 90, 160);
    ctx.lineTo(wx + 90, 160);
    ctx.lineTo(wx + 40 + Math.sin(t / 2000) * 6, 440);
    ctx.lineTo(wx - 260, 440);
    ctx.closePath();
    ctx.fill();
  }

  drawMotes(ctx, cam, t, dt) {
    ctx.fillStyle = 'rgba(255,240,200,.55)';
    for (const m of this.motes) {
      m.y -= (m.v * dt) / 1000;
      if (m.y < 20) m.y = 340;
      const x = m.x + Math.sin(t / 1400 + m.ph) * 14 + cam.x * 0.6;
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t / 700 + m.ph);
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

function shade(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * 0.75), g = Math.round(((n >> 8) & 255) * 0.75), b = Math.round((n & 255) * 0.75);
  return `rgb(${r},${g},${b})`;
}
