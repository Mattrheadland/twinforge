// Effect pieces for character moves (projectiles, beams, waves, fish, ghosts…).
// Each factory returns an entity { max, delay, draw(ctx, k, t) } that FX.add()
// plays: k runs 0→1 over `max` ms. Drawn in the 2D world, inked to match the toys.
import { INK, mix, rgba } from './draw.js';

const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);

function inkCircle(ctx, x, y, r, color) {
  ctx.beginPath();
  ctx.arc(x, y, r + 2.5, 0, Math.PI * 2);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

// Glowing ball that flies from (x0,y0) to (x1,y1); `arc` lifts the middle (lobs).
export function bolt({ x0, y0, x1, y1, color = '#FFC914', size = 14, life = 380, arc = 0, delay = 0, onHit }) {
  const pos = (k) => ({ x: lerp(x0, x1, k), y: lerp(y0, y1, k) - Math.sin(k * Math.PI) * arc });
  return {
    max: life, delay, onDone: onHit,
    draw(ctx, k, t) {
      for (let i = 3; i >= 1; i--) {
        const p = pos(Math.max(0, k - i * 0.06));
        ctx.globalAlpha = 0.25 * (4 - i) / 3;
        ctx.beginPath(); ctx.arc(p.x, p.y, size * (1 - i * 0.18), 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
      }
      ctx.globalAlpha = 1;
      const p = pos(k);
      const s = size * (1 + 0.12 * Math.sin(t / 30));
      inkCircle(ctx, p.x, p.y, s, color);
      ctx.beginPath(); ctx.arc(p.x - s * 0.2, p.y - s * 0.2, s * 0.45, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
    },
  };
}

// Thick energy beam (Rex Cannon).
export function beam({ x0, y0, x1, y1, color = '#FF7A1A', width = 46, life = 700, delay = 0 }) {
  return {
    max: life, delay,
    draw(ctx, k, t) {
      const grow = k < 0.15 ? k / 0.15 : k > 0.8 ? (1 - k) / 0.2 : 1;
      const w = width * grow * (1 + 0.08 * Math.sin(t / 20));
      const reach = Math.min(1, k / 0.12);
      const ex = lerp(x0, x1, reach), ey = lerp(y0, y1, reach);
      ctx.lineCap = 'round';
      for (const [lw, c] of [[w + 7, INK], [w, color], [w * 0.55, mix(color, '#ffffff', 0.5)], [w * 0.22, '#ffffff']]) {
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(ex, ey); ctx.lineWidth = lw; ctx.strokeStyle = c; ctx.stroke();
      }
      // muzzle flash
      inkCircle(ctx, x0, y0, w * 0.7, mix(color, '#ffffff', 0.4));
    },
  };
}

// Pointy things bursting up from the floor (roots, rocks).
export function spikes({ x, y, color = '#8A5A3C', count = 5, spread = 80, height = 110, life = 750, delay = 0, seed = 1 }) {
  const list = Array.from({ length: count }, (_, i) => ({
    dx: (i / (count - 1) - 0.5) * spread * 2 + ((seed * (i + 3) * 37) % 17) - 8,
    h: height * (0.6 + (((seed + i) * 53) % 40) / 100),
    lean: ((i * 29 + seed) % 30 - 15) / 60,
    d: i * 0.06,
  }));
  return {
    max: life, delay,
    draw(ctx, k) {
      for (const s of list) {
        const kk = Math.max(0, k - s.d);
        const g = kk < 0.25 ? ease(kk / 0.25) : kk > 0.75 ? Math.max(0, 1 - (kk - 0.75) / 0.25) : 1;
        if (g <= 0) continue;
        const bx = x + s.dx, hh = s.h * g, w = 13;
        ctx.beginPath();
        ctx.moveTo(bx - w, y);
        ctx.quadraticCurveTo(bx - w * 0.3 + s.lean * hh * 0.5, y - hh * 0.5, bx + s.lean * hh, y - hh);
        ctx.quadraticCurveTo(bx + w * 0.3 + s.lean * hh * 0.5, y - hh * 0.5, bx + w, y);
        ctx.closePath();
        ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke();
        ctx.fillStyle = color; ctx.fill();
        ctx.fillStyle = rgba('#000000', 0.25);
        ctx.beginPath(); ctx.moveTo(bx + 2, y); ctx.lineTo(bx + s.lean * hh, y - hh); ctx.lineTo(bx + w, y); ctx.closePath(); ctx.fill();
      }
    },
  };
}

function flameShape(ctx, x, y, s, color, t, eyes = true) {
  const f = Math.sin(t / 60) * 0.15;
  ctx.beginPath();
  ctx.moveTo(x, y - s * (1.6 + f));
  ctx.bezierCurveTo(x + s * 0.9, y - s * 0.6, x + s, y + s * 0.4, x, y + s * 0.6);
  ctx.bezierCurveTo(x - s, y + s * 0.4, x - s * 0.9, y - s * 0.6, x, y - s * (1.6 + f));
  ctx.closePath();
  ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
  ctx.fillStyle = color; ctx.fill();
  ctx.beginPath(); ctx.ellipse(x, y + s * 0.1, s * 0.45, s * 0.42, 0, 0, Math.PI * 2); ctx.fillStyle = '#FFE77A'; ctx.fill();
  if (eyes) {
    ctx.fillStyle = INK;
    ctx.fillRect(x - s * 0.32, y - s * 0.1, s * 0.16, s * 0.24);
    ctx.fillRect(x + s * 0.16, y - s * 0.1, s * 0.16, s * 0.24);
  }
}

// Little flame sprites that hop-dance along the floor to the target (Flame Dance).
export function hopper({ x0, x1, y, color = '#FF7A1A', size = 16, hops = 4, life = 900, delay = 0, onHit }) {
  return {
    max: life, delay, onDone: onHit,
    draw(ctx, k, t) {
      const x = lerp(x0, x1, k);
      const yy = y - Math.abs(Math.sin(k * hops * Math.PI)) * 46;
      ctx.save();
      ctx.translate(x, yy);
      ctx.rotate(Math.sin(k * hops * Math.PI * 2) * 0.25);
      flameShape(ctx, 0, 0, size, color, t);
      ctx.restore();
    },
  };
}

// A big wave rolling across the arena (Tidal Rage).
export function wave({ x0, x1, y, height = 300, dir = 1, color = '#33AFE4', life = 1100, delay = 0 }) {
  return {
    max: life, delay,
    draw(ctx, k, t) {
      const front = lerp(x0, x1, ease(Math.min(1, k / 0.75)));
      const back = front - dir * 1400;
      const h = height * (k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1);
      if (h <= 0) return;
      ctx.globalAlpha = k > 0.85 ? (1 - k) / 0.15 + 0.2 : 1;
      const crest = y - h;
      ctx.beginPath();
      ctx.moveTo(back, y + 60);
      ctx.lineTo(back, crest + 40);
      for (let i = 0; i <= 10; i++) {
        const xx = lerp(back, front - dir * 80, i / 10);
        ctx.lineTo(xx, crest + 30 + Math.sin(i * 1.3 + t / 120) * 12);
      }
      // curling lip
      ctx.quadraticCurveTo(front + dir * 40, crest - 30, front + dir * 30, crest + 50);
      ctx.quadraticCurveTo(front - dir * 10, crest + 20, front, y + 60);
      ctx.closePath();
      ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.stroke();
      ctx.fillStyle = color; ctx.fill();
      // depth band and foam
      ctx.fillStyle = mix(color, '#0A1A55', 0.35);
      ctx.fillRect(Math.min(back, front), y - h * 0.35, Math.abs(front - back) - 40, h * 0.35 + 60);
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 12; i++) {
        const xx = lerp(back, front, i / 12) + Math.sin(i * 3 + t / 90) * 10;
        ctx.beginPath(); ctx.arc(xx, crest + 30 + Math.sin(i * 1.3 + t / 120) * 12, 9 + (i % 3) * 3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
  };
}

// Rockfish warrior swooping in on an arc (Tidal Rage).
export function fish({ x0, y0, x1, y1, color = '#B8C2CC', size = 26, life = 600, delay = 0, arc = 120, onHit }) {
  const pos = (k) => ({ x: lerp(x0, x1, k), y: lerp(y0, y1, k) - Math.sin(k * Math.PI) * arc });
  return {
    max: life, delay, onDone: onHit,
    draw(ctx, k, t) {
      const p = pos(k), q = pos(Math.min(1, k + 0.02));
      const a = Math.atan2(q.y - p.y, q.x - p.x);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(a);
      const s = size, wag = Math.sin(t / 40) * 0.3;
      // tail
      ctx.save(); ctx.translate(-s, 0); ctx.rotate(wag);
      ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-s * 0.7, -s * 0.55); ctx.lineTo(-s * 0.5, 0); ctx.lineTo(-s * 0.7, s * 0.55); ctx.closePath();
      ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke(); ctx.fillStyle = color; ctx.fill();
      ctx.restore();
      // body
      ctx.beginPath(); ctx.ellipse(0, 0, s * 1.1, s * 0.55, 0, 0, Math.PI * 2);
      ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke(); ctx.fillStyle = color; ctx.fill();
      ctx.save(); ctx.clip();
      ctx.fillStyle = '#F2F2F2'; ctx.fillRect(-s * 1.2, s * 0.1, s * 2.4, s);
      ctx.strokeStyle = '#2B2F3A'; ctx.lineWidth = 3.5;
      for (const yy of [-s * 0.32, -s * 0.12]) { ctx.beginPath(); ctx.moveTo(-s, yy); ctx.lineTo(s * 0.7, yy); ctx.stroke(); }
      ctx.restore();
      // battle band (blue/orange) and eye
      ctx.fillStyle = '#1B4FD8'; ctx.fillRect(-s * 0.25, -s * 0.55, s * 0.22, s * 1.1);
      ctx.fillStyle = '#F46036'; ctx.fillRect(-s * 0.21, -s * 0.12, s * 0.14, s * 0.24);
      ctx.beginPath(); ctx.arc(s * 0.6, -s * 0.12, s * 0.16, 0, Math.PI * 2); ctx.fillStyle = '#FFC914'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
      ctx.fillStyle = INK; ctx.fillRect(s * 0.6, -s * 0.18, s * 0.08, s * 0.12);
      ctx.restore();
    },
  };
}

// Shadow tree that rises beside the target and swats (Haunted Forest).
export function shadowTree({ x, y, h = 200, dir = 1, swatAt = 0.5, life = 1300, delay = 0, glow = '#FF8A1F' }) {
  return {
    max: life, delay,
    draw(ctx, k, t) {
      const rise = k < 0.25 ? ease(k / 0.25) : k > 0.85 ? 1 - (k - 0.85) / 0.15 : 1;
      if (rise <= 0) return;
      const hh = h * rise;
      const swat = k > swatAt - 0.1 && k < swatAt + 0.1 ? Math.sin(((k - swatAt + 0.1) / 0.2) * Math.PI) : 0;
      ctx.save();
      ctx.translate(x, y);
      ctx.globalAlpha = 0.95;
      // trunk
      ctx.beginPath();
      ctx.moveTo(-34, 0); ctx.lineTo(-20, -hh * 0.75); ctx.lineTo(-10, -hh); ctx.lineTo(4, -hh * 0.86); ctx.lineTo(16, -hh * 0.98); ctx.lineTo(22, -hh * 0.7); ctx.lineTo(34, 0); ctx.closePath();
      ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke(); ctx.fillStyle = '#23202E'; ctx.fill();
      // swatting branch
      ctx.save();
      ctx.translate(dir * 18, -hh * 0.62);
      ctx.rotate(dir * (-0.9 + swat * 1.6));
      ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(dir * 70, -14); ctx.lineTo(dir * 82, -30); ctx.lineTo(dir * 78, -4); ctx.lineTo(0, 7); ctx.closePath();
      ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke(); ctx.fillStyle = '#23202E'; ctx.fill();
      ctx.restore();
      // glowing eyes and mouth
      const fl = 0.8 + 0.2 * Math.sin(t / 50);
      ctx.fillStyle = glow;
      ctx.globalAlpha = fl;
      ctx.beginPath(); ctx.moveTo(-16, -hh * 0.62); ctx.lineTo(-4, -hh * 0.56); ctx.lineTo(-14, -hh * 0.52); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(16, -hh * 0.62); ctx.lineTo(4, -hh * 0.56); ctx.lineTo(14, -hh * 0.52); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, -hh * 0.42, 12, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    },
  };
}

function ghostShape(ctx, s, color, t) {
  ctx.beginPath();
  ctx.moveTo(-s, s * 0.9);
  ctx.lineTo(-s, -s * 0.1);
  ctx.arc(0, -s * 0.1, s, Math.PI, 0);
  ctx.lineTo(s, s * 0.9);
  for (let i = 0; i < 4; i++) {
    const x = s - ((i + 0.5) / 4) * 2 * s;
    ctx.lineTo(x, s * (0.6 + 0.25 * Math.sin(t / 70 + i)));
    ctx.lineTo(s - ((i + 1) / 4) * 2 * s, s * 0.9);
  }
  ctx.closePath();
  ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
  ctx.fillStyle = color; ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.ellipse(-s * 0.35, -s * 0.15, s * 0.16, s * 0.24, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(s * 0.35, -s * 0.15, s * 0.16, s * 0.24, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, s * 0.3, s * 0.18, s * 0.22, 0, 0, Math.PI * 2); ctx.fill();
}

// Ghost swirling in toward a point (Midnight Storm).
export function ghost({ cx, cy, r0 = 220, phase = 0, color = '#E6D8FF', size = 22, life = 1400, delay = 0, onHit }) {
  return {
    max: life, delay, onDone: onHit,
    draw(ctx, k, t) {
      const a = phase + k * Math.PI * 4;
      const r = r0 * (1 - 0.85 * ease(k));
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.55;
      ctx.save();
      ctx.globalAlpha = k < 0.1 ? k / 0.1 : 0.92;
      ctx.translate(x, y);
      ctx.rotate(Math.sin(a) * 0.3);
      ghostShape(ctx, size, color, t);
      ctx.restore();
    },
  };
}

// Swirling ring of light (spell / storm cores).
export function swirl({ cx, cy, r = 120, color = '#B98CFF', life = 1200, delay = 0, arms = 4 }) {
  return {
    max: life, delay,
    draw(ctx, k, t) {
      const a0 = t / 140;
      const fade = k < 0.15 ? k / 0.15 : k > 0.8 ? (1 - k) / 0.2 : 1;
      ctx.lineCap = 'round';
      for (let i = 0; i < arms; i++) {
        const a = a0 + (i / arms) * Math.PI * 2;
        for (const [lw, c, al] of [[16, INK, 0.9], [10, color, 1], [3, '#ffffff', 1]]) {
          ctx.globalAlpha = fade * al;
          ctx.beginPath();
          ctx.ellipse(cx, cy, r * (0.6 + 0.4 * k), r * 0.36 * (0.6 + 0.4 * k), 0, a, a + 1.1);
          ctx.lineWidth = lw; ctx.strokeStyle = c; ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    },
  };
}

// The stone with the sword in it (Sword in the Stone). `pullAt` = when the sword leaves.
export function stone({ x, y, pullAt = 0.55, life = 1500, delay = 0 }) {
  return {
    max: life, delay,
    draw(ctx, k, t) {
      const rise = k < 0.2 ? ease(k / 0.2) : k > 0.88 ? 1 - (k - 0.88) / 0.12 : 1;
      if (rise <= 0) return;
      ctx.save();
      ctx.translate(x, y + (1 - rise) * 80);
      // sword (before it's pulled)
      if (k < pullAt) {
        const glow = 0.6 + 0.4 * Math.sin(t / 60);
        ctx.globalAlpha = glow;
        ctx.beginPath(); ctx.arc(0, -96, 30, 0, Math.PI * 2); ctx.fillStyle = '#FFE77A'; ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = INK; ctx.fillRect(-7, -150, 14, 100);
        ctx.fillStyle = '#DDE6F2'; ctx.fillRect(-4, -146, 8, 96);
        ctx.fillStyle = INK; ctx.fillRect(-22, -116, 44, 12);
        ctx.fillStyle = '#FFC914'; ctx.fillRect(-19, -113, 38, 6);
        ctx.fillStyle = '#8A5A3C'; ctx.fillRect(-4, -146, 8, 26);
      }
      // rock
      ctx.beginPath();
      ctx.moveTo(-70, 0); ctx.lineTo(-58, -40); ctx.lineTo(-24, -62); ctx.lineTo(20, -60); ctx.lineTo(56, -38); ctx.lineTo(72, 0); ctx.closePath();
      ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke(); ctx.fillStyle = '#9AA3B8'; ctx.fill();
      ctx.fillStyle = '#6E7790';
      ctx.beginPath(); ctx.moveTo(10, -60); ctx.lineTo(56, -38); ctx.lineTo(72, 0); ctx.lineTo(16, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#C9D0DD';
      ctx.beginPath(); ctx.moveTo(-58, -40); ctx.lineTo(-24, -62); ctx.lineTo(-20, -40); ctx.closePath(); ctx.fill();
      ctx.restore();
    },
  };
}

// Big golden crescent slash.
export function slash({ x, y, r = 150, dir = 1, color = '#FFC914', life = 420, delay = 0 }) {
  return {
    max: life, delay,
    draw(ctx, k) {
      const sweep = ease(Math.min(1, k / 0.5));
      const a0 = -2.0, a1 = a0 + 2.6 * sweep;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(dir, 1);
      ctx.globalAlpha = k > 0.6 ? (1 - k) / 0.4 : 1;
      ctx.lineCap = 'round';
      for (const [lw, c] of [[34, INK], [26, color], [10, '#ffffff']]) {
        ctx.beginPath(); ctx.arc(0, 0, r, a0, a1); ctx.lineWidth = lw; ctx.strokeStyle = c; ctx.stroke();
      }
      ctx.restore();
    },
  };
}

// Falling potion bottle that bursts into a green splash on landing.
export function potion({ x, y0, y1, color = '#5CE07A', life = 520, delay = 0, onHit }) {
  return {
    max: life, delay, onDone: onHit,
    draw(ctx, k, t) {
      const y = lerp(y0, y1, k * k);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t / 90);
      ctx.beginPath();
      ctx.moveTo(-6, -22); ctx.lineTo(6, -22); ctx.lineTo(6, -10); ctx.quadraticCurveTo(18, -2, 16, 10);
      ctx.quadraticCurveTo(12, 22, 0, 22); ctx.quadraticCurveTo(-12, 22, -16, 10); ctx.quadraticCurveTo(-18, -2, -6, -10); ctx.closePath();
      ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke(); ctx.fillStyle = color; ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-8, 0, 4, 8);
      ctx.restore();
    },
  };
}

// Tennis ball that bounces in on an arc and pops off the target.
export function tennisBall({ x0, y0, x1, y1, size = 15, life = 560, delay = 0, arc = 150, onHit }) {
  const pos = (k) => ({ x: lerp(x0, x1, k), y: lerp(y0, y1, k) - Math.sin(k * Math.PI) * arc });
  return {
    max: life, delay, onDone: onHit,
    draw(ctx, k) {
      const p = pos(k);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(k * 9);
      inkCircle(ctx, 0, 0, size, '#C8E63C');
      ctx.beginPath();
      ctx.arc(-size * 1.05, 0, size * 0.75, -0.9, 0.9);
      ctx.arc(size * 1.05, 0, size * 0.75, Math.PI - 0.9, Math.PI + 0.9);
      ctx.lineWidth = 3; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      ctx.restore();
    },
  };
}

function noteShape(ctx, s, color, two) {
  const head = (x, y) => {
    ctx.beginPath(); ctx.ellipse(x, y, s * 0.55, s * 0.4, -0.4, 0, Math.PI * 2);
    ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke(); ctx.fillStyle = color; ctx.fill();
  };
  ctx.lineCap = 'round';
  for (const [lw, c] of [[8, INK], [4, color]]) {
    ctx.lineWidth = lw; ctx.strokeStyle = c;
    ctx.beginPath();
    ctx.moveTo(s * 0.45, 0); ctx.lineTo(s * 0.45, -s * 1.7);
    if (two) { ctx.lineTo(s * 1.65, -s * 1.95); ctx.lineTo(s * 1.65, -s * 0.25); }
    else ctx.quadraticCurveTo(s * 1.2, -s * 1.3, s * 1.1, -s * 0.8);
    ctx.stroke();
  }
  head(0, 0);
  if (two) head(s * 1.2, -s * 0.25);
}

// Musical note that spirals in on the target (Encore!).
export function note({ cx, cy, r0 = 220, phase = 0, color = '#FFC914', size = 16, life = 1300, delay = 0, onHit }) {
  const two = Math.round(phase * 10) % 2 === 0;
  return {
    max: life, delay, onDone: onHit,
    draw(ctx, k, t) {
      const a = phase + k * Math.PI * 3;
      const r = r0 * (1 - 0.8 * ease(k));
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.6 + Math.sin(t / 90 + phase) * 8;
      ctx.save();
      ctx.globalAlpha = k < 0.1 ? k / 0.1 : 1;
      ctx.translate(x, y);
      ctx.rotate(Math.sin(t / 120 + phase) * 0.35);
      noteShape(ctx, size, color, two);
      ctx.restore();
      ctx.globalAlpha = 1;
    },
  };
}

// Glowing paw print that stamps onto the target (Power Paws): pops in big,
// settles, then fades. onHit fires as it lands.
export function pawStamp({ x, y, size = 28, rot = 0, color = '#FFC914', life = 460, delay = 0, onHit }) {
  let hit = false;
  return {
    max: life, delay,
    draw(ctx, k) {
      if (!hit && k > 0.2) { hit = true; onHit && onHit(); }
      const s = size * (k < 0.2 ? 1.8 - 0.8 * ease(k / 0.2) : 1);
      ctx.save();
      ctx.globalAlpha = k > 0.6 ? (1 - k) / 0.4 : 1;
      ctx.translate(x, y);
      ctx.rotate(rot);
      const pad = (px, py, rx, ry) => {
        for (const [c, g] of [[INK, 3], [color, 0]]) {
          ctx.beginPath(); ctx.ellipse(px, py, rx + g, ry + g, 0, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill();
        }
      };
      pad(0, s * 0.25, s * 0.55, s * 0.45);
      pad(-s * 0.62, -s * 0.28, s * 0.2, s * 0.26);
      pad(-s * 0.22, -s * 0.62, s * 0.2, s * 0.26);
      pad(s * 0.22, -s * 0.62, s * 0.2, s * 0.26);
      pad(s * 0.62, -s * 0.28, s * 0.2, s * 0.26);
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.beginPath(); ctx.ellipse(-s * 0.15, s * 0.12, s * 0.16, s * 0.1, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    },
  };
}
