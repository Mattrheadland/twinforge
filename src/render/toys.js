// TEMPORARY placeholder toys drawn in code, in the approved style
// (dark outline, flat color, one shade band). Real toys arrive as Astra sprites;
// drawToy() switches to them automatically when def.art.kind === 'sprites'.
import { INK, toon, rr, ellipse, starPath, line } from './draw.js';

// p = { t, eyes, mouth, armF, armB, antenna, tail, legL, legR, glow }
// Origin = feet center, facing +x. Height ~ 190 units.

function screenEyes(ctx, eyes, cx, cy, gap, color, t) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  const blink = eyes === 'open' && (t % 3600) < 120;
  for (const dx of [-gap / 2, gap / 2]) {
    const x = cx + dx;
    ctx.beginPath();
    if (eyes === 'open' || eyes === 'angry') {
      if (blink) {
        ctx.moveTo(x - 6, cy); ctx.lineTo(x + 6, cy); ctx.stroke();
      } else {
        rr(ctx, x - 5, cy - 9, 10, 18, 5); ctx.fill();
      }
    } else if (eyes === 'happy') {
      ctx.moveTo(x - 7, cy + 3); ctx.lineTo(x, cy - 5); ctx.lineTo(x + 7, cy + 3); ctx.stroke();
    } else if (eyes === 'squint') {
      const d = dx < 0 ? 1 : -1;
      ctx.moveTo(x - 6 * d, cy - 7); ctx.lineTo(x + 6 * d, cy); ctx.lineTo(x - 6 * d, cy + 7); ctx.stroke();
    } else if (eyes === 'closed') {
      ctx.moveTo(x - 7, cy + 1); ctx.lineTo(x + 7, cy + 1); ctx.stroke();
    } else if (eyes === 'swirl') {
      for (let a = 0; a < 12; a += 0.4) {
        const r = a * 0.75;
        const px = x + Math.cos(a + t / 120) * r, py = cy + Math.sin(a + t / 120) * r;
        a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    if (eyes === 'angry') {
      ctx.beginPath();
      const s = dx < 0 ? 1 : -1;
      ctx.moveTo(x - 8 * s, cy - 16); ctx.lineTo(x + 7 * s, cy - 11);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function blockoArm(ctx, sx, sy, angle) {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(angle);
  toon(ctx, (c) => rr(c, -11, -4, 22, 44, 10), '#3d7bf2', '#2a56b8', { shadeOffset: 4 });
  toon(ctx, (c) => { c.arc(0, 48, 15, 0, Math.PI * 2); }, '#ffd23f', '#e0a91b', { shadeOffset: 4, highlight: [-5, 42, 5, 4] });
  ctx.restore();
}

export function drawBlocko(ctx, p) {
  const t = p.t || 0;
  // back arm
  blockoArm(ctx, -46, -110, p.armB ?? 0.25);
  // legs
  const lL = p.legL || 0, lR = p.legR || 0;
  toon(ctx, (c) => rr(c, -38, -56 + lL, 26, 52 - lL, 6), '#3d7bf2', '#2a56b8', { shadeOffset: 4 });
  toon(ctx, (c) => rr(c, -42, -16 + lL, 36, 16, 6), '#27325c', null);
  toon(ctx, (c) => rr(c, 10, -56 + lR, 26, 52 - lR, 6), '#3d7bf2', '#2a56b8', { shadeOffset: 4 });
  toon(ctx, (c) => rr(c, 8, -16 + lR, 38, 16, 6), '#27325c', null);
  // body
  toon(ctx, (c) => rr(c, -54, -128, 108, 80, 16), '#ef4b3c', '#b8322a', { highlight: [-30, -116, 18, 7, -0.3] });
  toon(ctx, (c) => starPath(c, 8, -88, 21, 9), '#ffd23f', '#e0a91b', { shadeOffset: 3, line: 4 });
  ctx.fillStyle = '#ffe9a8';
  for (const [x, y] of [[-42, -116], [42, -116], [-42, -60], [42, -60]]) {
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
  }
  // head
  const hb = p.headBob || 0;
  ctx.save();
  ctx.translate(0, hb);
  // antenna (spring wobble)
  const aw = p.antenna || 0;
  line(ctx, [0, -186, aw * 0.6, -200, aw, -212], 4.5);
  toon(ctx, (c) => c.arc(aw, -216, 9, 0, Math.PI * 2), p.glow ? '#ff9f1c' : '#ffd23f', '#e0a91b', { shadeOffset: 3, line: 4, highlight: [aw - 3, -219, 3, 2.5] });
  toon(ctx, (c) => rr(c, -44, -190, 88, 66, 16), '#7fd3f7', '#4fa9d1', { highlight: [-24, -180, 14, 6, -0.2] });
  toon(ctx, (c) => c.arc(-44, -157, 8, 0, Math.PI * 2), '#c9cfdc', '#9aa3b8', { shadeOffset: 2, line: 4 });
  // face screen
  ctx.beginPath();
  rr(ctx, -28, -178, 64, 44, 11);
  ctx.fillStyle = '#16213b';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  const glowC = p.eyes === 'angry' ? '#ff6b5b' : '#7ef6ff';
  ctx.save();
  ctx.shadowColor = glowC;
  ctx.shadowBlur = 8;
  screenEyes(ctx, p.eyes || 'open', 6, -160, 26, glowC, t);
  // mouth
  ctx.strokeStyle = glowC;
  ctx.fillStyle = glowC;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const m = p.mouth || 'smile';
  if (m === 'smile') { ctx.arc(6, -149, 7, 0.2, Math.PI - 0.2); ctx.stroke(); }
  else if (m === 'open') { ctx.ellipse(6, -144, 8, 5, 0, 0, Math.PI * 2); ctx.fill(); }
  else if (m === 'o') { ctx.arc(6, -144, 4, 0, Math.PI * 2); ctx.stroke(); }
  else { ctx.moveTo(0, -144); ctx.lineTo(12, -144); ctx.stroke(); }
  ctx.restore();
  ctx.restore();
  // front arm
  blockoArm(ctx, 48, -110, p.armF ?? -0.2);
}

function stompyArm(ctx, sx, sy, angle, front) {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(angle);
  toon(ctx, (c) => rr(c, -10, -4, 20, 34, 10), front ? '#5cc95a' : '#4bb34a', '#3e9b44', { shadeOffset: 4 });
  ctx.restore();
}

export function drawStompy(ctx, p) {
  const t = p.t || 0;
  const sway = Math.sin(t / 380) * 0.06 + (p.tail || 0);
  // tail
  ctx.save();
  ctx.translate(-34, -48);
  ctx.rotate(sway);
  toon(ctx, (c) => {
    c.moveTo(4, -34);
    c.quadraticCurveTo(-46, -26, -72, 26);
    c.quadraticCurveTo(-38, 12, 6, 14);
    c.closePath();
  }, '#5cc95a', '#3e9b44', { highlight: [-20, -18, 16, 5, -0.4] });
  ctx.restore();
  // back arm
  stompyArm(ctx, -10, -100, p.armB ?? 0.3, false);
  // back spikes
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * 1.05 + i * 0.3;
    const bx = Math.cos(a) * 56, by = -76 + Math.sin(a) * 60;
    const nx = Math.cos(a), ny = Math.sin(a);
    const tx = -ny, ty = nx;
    toon(ctx, (c) => {
      c.moveTo(bx + tx * 12, by + ty * 12);
      c.lineTo(bx + nx * 24, by + ny * 24);
      c.lineTo(bx - tx * 12, by - ty * 12);
      c.closePath();
    }, '#ff9f1c', '#e07b10', { shadeOffset: 3, line: 4 });
  }
  // legs
  const lL = p.legL || 0, lR = p.legR || 0;
  toon(ctx, (c) => ellipse(c, -24, -18 + lL, 25, 19), '#4bb34a', '#3e9b44', { shadeOffset: 4 });
  // body
  toon(ctx, (c) => ellipse(c, 0, -74, 58, 62), '#5cc95a', '#3e9b44', { highlight: [-22, -110, 16, 9, -0.5] });
  toon(ctx, (c) => ellipse(c, 16, -66, 34, 44), '#ffe9a8', '#f2cf7a', { shadeOffset: 5, line: 4 });
  // plush stitching
  ctx.save();
  ctx.setLineDash([5, 6]);
  line(ctx, [16, -108, 16, -24], 2.5, 'rgba(29,21,48,.55)');
  ctx.restore();
  toon(ctx, (c) => ellipse(c, 28, -18 + lR, 26, 19), '#5cc95a', '#3e9b44', { shadeOffset: 4 });
  for (const fx of [-40, 12]) {
    const fy = fx < 0 ? lL : lR;
    for (let k = 0; k < 3; k++) line(ctx, [fx + 18 + k * 9, -8 + fy, fx + 18 + k * 9, -2 + fy], 3);
  }
  // head
  const hb = p.headBob || 0;
  ctx.save();
  ctx.translate(0, hb);
  toon(ctx, (c) => {
    c.arc(24, -142, 46, 0, Math.PI * 2);
    ellipse(c, 64, -126, 32, 25);
  }, '#5cc95a', '#3e9b44', { highlight: [8, -170, 16, 9, -0.4] });
  // cheek blush
  ctx.fillStyle = 'rgba(255,122,168,.45)';
  ctx.beginPath(); ellipse(ctx, 44, -120, 11, 7); ctx.fill();
  // nostrils
  ctx.fillStyle = INK;
  for (const nx of [78, 88]) { ctx.beginPath(); ctx.arc(nx, -134, 2.6, 0, Math.PI * 2); ctx.fill(); }
  // eyes
  const eyes = p.eyes || 'open';
  const blink = eyes === 'open' && (t % 4100) < 130;
  const eye = (x, y, rx, ry, big) => {
    if (eyes === 'open' || eyes === 'angry') {
      if (blink) { line(ctx, [x - rx, y, x + rx, y], 4); return; }
      toon(ctx, (c) => ellipse(c, x, y, rx, ry), '#ffffff', null, { line: 3.5 });
      ctx.fillStyle = INK;
      ctx.beginPath(); ellipse(ctx, x + rx * 0.3, y + 1, rx * 0.58, ry * 0.62); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(x + rx * 0.45, y - ry * 0.25, big ? 3.4 : 2.4, 0, Math.PI * 2); ctx.fill();
      if (eyes === 'angry') line(ctx, [x - rx - 2, y - ry - 6, x + rx + 2, y - ry + 2], 4.5);
    } else if (eyes === 'happy') {
      ctx.beginPath(); ctx.arc(x, y + 4, rx * 0.8, Math.PI * 1.1, Math.PI * 1.9);
      ctx.lineWidth = 4.5; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke();
    } else if (eyes === 'squint') {
      line(ctx, [x - rx * 0.7, y - 6, x + rx * 0.5, y, x - rx * 0.7, y + 6], 4.5);
    } else if (eyes === 'closed') {
      ctx.beginPath(); ctx.arc(x, y - 2, rx * 0.75, Math.PI * 0.15, Math.PI * 0.85);
      ctx.lineWidth = 4.5; ctx.strokeStyle = INK; ctx.stroke();
    } else if (eyes === 'swirl') {
      ctx.beginPath();
      for (let a = 0; a < 13; a += 0.4) {
        const r = a * rx * 0.075;
        const px = x + Math.cos(a + t / 110) * r, py = y + Math.sin(a + t / 110) * r;
        a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    }
  };
  eye(14, -156, 10, 13, false);
  eye(42, -154, 14, 16, true);
  // mouth
  const m = p.mouth || 'smile';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (m === 'smile') {
    ctx.moveTo(52, -116);
    ctx.quadraticCurveTo(72, -104, 92, -118);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    for (const tx of [64, 78]) {
      ctx.beginPath(); ctx.moveTo(tx - 4, -111); ctx.lineTo(tx, -104); ctx.lineTo(tx + 4, -110); ctx.closePath(); ctx.fill();
    }
  } else if (m === 'open') {
    ctx.fillStyle = '#7a1f2b';
    ctx.moveTo(52, -116); ctx.quadraticCurveTo(72, -88, 94, -118); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (m === 'o') {
    ctx.fillStyle = '#7a1f2b';
    ellipse(ctx, 72, -110, 7, 6); ctx.fill(); ctx.stroke();
  } else {
    ctx.moveTo(60, -112); ctx.lineTo(84, -114); ctx.stroke();
  }
  ctx.restore();
  // front arm
  stompyArm(ctx, 40, -98, p.armF ?? -0.3, true);
}

const DRAWERS = { blocko: drawBlocko, stompy: drawStompy };

// Sprite art support (Astra assets). Images load lazily; until a pose image is
// ready the placeholder drawing is used so the game never shows a blank toy.
const imageCache = new Map();
function img(src) {
  if (!imageCache.has(src)) {
    const im = new Image();
    im.src = src;
    imageCache.set(src, im);
  }
  const im = imageCache.get(src);
  return im.complete && im.naturalWidth ? im : null;
}

export function drawToy(ctx, def, p) {
  const art = def.art || {};
  if (art.kind === 'sprites' && art.poses) {
    const src = art.poses[p.pose] || art.poses.idle;
    const im = src && img(src);
    if (im) {
      const h = art.height || 200;
      const w = (im.naturalWidth / im.naturalHeight) * h;
      const ax = art.anchor ? art.anchor[0] : 0.5;
      const ay = art.anchor ? art.anchor[1] : 1;
      ctx.drawImage(im, -w * ax, -h * ay, w, h);
      return;
    }
  }
  (DRAWERS[art.draw] || drawBlocko)(ctx, p);
}

// Where each toy's head is, for portraits, arrows and dizzy stars.
export const HEAD = { blocko: { x: 2, y: -160, r: 60, top: -228 }, stompy: { x: 40, y: -140, r: 62, top: -196 } };
