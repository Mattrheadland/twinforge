// TEMPORARY placeholder toys drawn in code, in the v2 '90s cel style
// (heavy brush ink, hard cool shadows, angular glints, rim light on the right).
// Real toys arrive as Astra sprites; drawToy() switches to them automatically
// when def.art.kind === 'sprites'.
import { INK, toon, rr, ellipse, starPath, line, taper } from './draw.js';

// p = { t, eyes, mouth, armF, armB, antenna, tail, legL, legR, glow }
// Origin = feet center, facing +x. Height ~ 190 units.

const C = {
  red: '#D7263D', blue: '#2456E0', yellow: '#FFC914', boot: '#2A2F55', head: '#4EA8DE', steel: '#C4CAD8',
  screen: '#0E1630', glow: '#5FF2FF', angry: '#FF5A4A',
  dino: '#33A04A', dinoDark: '#2B8C40', belly: '#F2D07C', spike: '#F46036', mouth: '#5E1530',
};

// Robot screen eyes: tall bars with a slanted top so the look reads
// determined instead of cute. Inner corners sit lower (a visor "brow").
function screenEyes(ctx, eyes, cx, cy, gap, color, t) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const blink = eyes === 'open' && (t % 3600) < 120;
  for (const dx of [-gap / 2, gap / 2]) {
    const x = cx + dx;
    const inner = dx < 0 ? 1 : -1; // +1 when the inner side is to the right
    ctx.beginPath();
    if (eyes === 'open' || eyes === 'angry') {
      if (blink) {
        ctx.moveTo(x - 6, cy + 2); ctx.lineTo(x + 6, cy + 2); ctx.stroke();
      } else {
        const tilt = eyes === 'angry' ? 9 : 5;
        const hiL = inner > 0 ? cy - 9 : cy - 9 + tilt;
        const hiR = inner > 0 ? cy - 9 + tilt : cy - 9;
        ctx.moveTo(x - 6, hiL); ctx.lineTo(x + 6, hiR); ctx.lineTo(x + 6, cy + 8); ctx.lineTo(x - 6, cy + 8); ctx.closePath();
        ctx.fill();
      }
    } else if (eyes === 'happy') {
      ctx.moveTo(x - 7, cy + 4); ctx.lineTo(x, cy - 5); ctx.lineTo(x + 7, cy + 4); ctx.stroke();
    } else if (eyes === 'squint') {
      ctx.moveTo(x - 6 * inner, cy - 7); ctx.lineTo(x + 6 * inner, cy); ctx.lineTo(x - 6 * inner, cy + 7); ctx.stroke();
    } else if (eyes === 'closed') {
      ctx.moveTo(x - 7, cy + 2); ctx.lineTo(x + 7, cy + 2); ctx.stroke();
    } else if (eyes === 'swirl') {
      for (let a = 0; a < 12; a += 0.4) {
        const r = a * 0.75;
        const px = x + Math.cos(a + t / 120) * r, py = cy + Math.sin(a + t / 120) * r;
        a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }
  ctx.restore();
}

function blockoArm(ctx, sx, sy, angle) {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(angle);
  toon(ctx, (c) => rr(c, -11, -4, 22, 44, 9), C.blue, true, { crease: true });
  toon(ctx, (c) => { c.arc(0, 48, 15, 0, Math.PI * 2); }, C.yellow, true, { highlight: [-5, 42, 6, 4] });
  ctx.restore();
}

export function drawBlocko(ctx, p) {
  const t = p.t || 0;
  // back arm
  blockoArm(ctx, -46, -110, p.armB ?? 0.25);
  // legs
  const lL = p.legL || 0, lR = p.legR || 0;
  toon(ctx, (c) => rr(c, -38, -56 + lL, 26, 52 - lL, 6), C.blue, true, { crease: true });
  toon(ctx, (c) => rr(c, -42, -16 + lL, 36, 16, 6), C.boot, true, { highlight: [-30, -12 + lL, 6, 3] });
  toon(ctx, (c) => rr(c, 10, -56 + lR, 26, 52 - lR, 6), C.blue, true, { crease: true });
  toon(ctx, (c) => rr(c, 8, -16 + lR, 38, 16, 6), C.boot, true, { highlight: [20, -12 + lR, 6, 3] });
  // body
  toon(ctx, (c) => rr(c, -54, -128, 108, 80, 14), C.red, true, { crease: true, highlight: [-30, -116, 20, 7, -0.25] });
  toon(ctx, (c) => starPath(c, 8, -88, 22, 9), C.yellow, true, { line: 3.5, highlight: [2, -96, 6, 3] });
  ctx.fillStyle = '#FFE08A';
  for (const [x, y] of [[-42, -116], [42, -116], [-42, -60], [42, -60]]) {
    ctx.beginPath(); ctx.arc(x, y, 3.6, 0, Math.PI * 2); ctx.fill();
  }
  // head
  const hb = p.headBob || 0;
  ctx.save();
  ctx.translate(0, hb);
  // antenna (spring wobble)
  const aw = p.antenna || 0;
  line(ctx, [0, -186, aw * 0.6, -200, aw, -212], 4.5);
  toon(ctx, (c) => c.arc(aw, -216, 9, 0, Math.PI * 2), p.glow ? '#F46036' : C.yellow, true, { line: 4, highlight: [aw - 3, -219, 3, 2.5] });
  toon(ctx, (c) => rr(c, -44, -190, 88, 66, 14), C.head, true, { highlight: [-26, -181, 14, 5, -0.15] });
  toon(ctx, (c) => c.arc(-44, -157, 8, 0, Math.PI * 2), C.steel, true, { line: 4, highlight: [-47, -160, 3, 2] });
  // face screen
  ctx.beginPath();
  rr(ctx, -28, -178, 64, 44, 10);
  ctx.fillStyle = C.screen;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // screen glare: one hard diagonal band
  ctx.save();
  ctx.beginPath();
  rr(ctx, -28, -178, 64, 44, 10);
  ctx.clip();
  ctx.fillStyle = 'rgba(160,220,255,.16)';
  ctx.beginPath();
  ctx.moveTo(-28, -150); ctx.lineTo(-6, -178); ctx.lineTo(6, -178); ctx.lineTo(-28, -136); ctx.closePath();
  ctx.fill();
  ctx.restore();
  const glowC = p.eyes === 'angry' ? C.angry : C.glow;
  ctx.save();
  ctx.shadowColor = glowC;
  ctx.shadowBlur = 6;
  screenEyes(ctx, p.eyes || 'open', 6, -159, 26, glowC, t);
  // mouth
  ctx.strokeStyle = glowC;
  ctx.fillStyle = glowC;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const m = p.mouth || 'smile';
  if (m === 'smile') { ctx.moveTo(-2, -146); ctx.quadraticCurveTo(7, -141, 16, -150); ctx.stroke(); } // cocky smirk
  else if (m === 'open') { ctx.moveTo(-3, -147); ctx.lineTo(17, -147); ctx.quadraticCurveTo(7, -134, -3, -147); ctx.fill(); }
  else if (m === 'grit') { ctx.rect(-2, -149, 18, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(4, -149); ctx.lineTo(4, -142); ctx.moveTo(10, -149); ctx.lineTo(10, -142); ctx.lineWidth = 2; ctx.stroke(); }
  else if (m === 'o') { ctx.arc(7, -144, 4, 0, Math.PI * 2); ctx.stroke(); }
  else { ctx.moveTo(1, -144); ctx.lineTo(13, -144); ctx.stroke(); }
  ctx.restore();
  ctx.restore();
  // front arm
  blockoArm(ctx, 48, -110, p.armF ?? -0.2);
}

function stompyArm(ctx, sx, sy, angle, front) {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(angle);
  toon(ctx, (c) => rr(c, -10, -4, 20, 34, 10), front ? C.dino : C.dinoDark, true);
  // claws
  for (const k of [-5, 1, 7]) taper(ctx, [k - 1, 30, k, 35, k + 1, 39], 3.4, '#fff7e0');
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
    c.quadraticCurveTo(-46, -26, -76, 24);
    c.quadraticCurveTo(-38, 12, 6, 14);
    c.closePath();
  }, C.dino, true, { crease: true });
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
      c.lineTo(bx + nx * 26, by + ny * 26);
      c.lineTo(bx - tx * 12, by - ty * 12);
      c.closePath();
    }, C.spike, true, { line: 4 });
  }
  // legs
  const lL = p.legL || 0, lR = p.legR || 0;
  toon(ctx, (c) => ellipse(c, -24, -18 + lL, 25, 19), C.dinoDark, true);
  // body
  toon(ctx, (c) => ellipse(c, 0, -74, 58, 62), C.dino, true, { crease: true });
  toon(ctx, (c) => ellipse(c, 16, -66, 34, 44), C.belly, true, { line: 4 });
  // belly plates
  for (let k = 0; k < 4; k++) {
    const y = -98 + k * 18;
    ctx.beginPath();
    ctx.moveTo(-10 + k * 2, y); ctx.quadraticCurveTo(18, y + 6, 46 - k * 3, y - 2);
    ctx.lineWidth = 2.4; ctx.strokeStyle = 'rgba(20,17,26,.55)'; ctx.stroke();
  }
  toon(ctx, (c) => ellipse(c, 28, -18 + lR, 26, 19), C.dino, true);
  for (const fx of [-40, 12]) {
    const fy = fx < 0 ? lL : lR;
    for (let k = 0; k < 3; k++) taper(ctx, [fx + 18 + k * 9, -11 + fy, fx + 19 + k * 9, -6 + fy, fx + 18 + k * 9, -1 + fy], 4.5, '#fff7e0');
  }
  // head
  const hb = p.headBob || 0;
  ctx.save();
  ctx.translate(0, hb);
  const headPath = (c) => {
    c.arc(24, -142, 44, 0, Math.PI * 2);
    ellipse(c, 64, -126, 34, 25);
  };
  toon(ctx, headPath, C.dino, true, { shadow: 0.17 });
  // nostrils
  ctx.fillStyle = INK;
  for (const nx of [80, 90]) { ctx.beginPath(); ellipse(ctx, nx, -135, 3, 2, -0.3); ctx.fill(); }
  // eyes
  const eyes = p.eyes || 'open';
  const blink = eyes === 'open' && (t % 4100) < 130;
  const eye = (x, y, rx, ry, near) => {
    if (eyes === 'open' || eyes === 'angry') {
      if (blink) { taper(ctx, [x - rx, y, x, y + 2, x + rx, y], 4.5); return; }
      toon(ctx, (c) => ellipse(c, x, y, rx, ry), '#ffffff', null, { line: 3.2 });
      ctx.fillStyle = INK;
      ctx.beginPath(); ellipse(ctx, x + rx * 0.35, y + 2, rx * 0.42, ry * 0.5); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(x + rx * 0.48, y - ry * 0.05, near ? 2.2 : 1.6, 0, Math.PI * 2); ctx.fill();
      // lid + brow in a V (inner ends low): reads determined, not sleepy.
      // `inner` = which side faces the other eye in this 3/4 view.
      const inner = near ? -1 : 1;
      const k = eyes === 'angry' ? 0.62 : 0.4;
      const hiY = y - ry - 1, loY = y - ry + ry * 2 * k;
      const yIn = loY, yOut = y - ry + ry * 2 * k * 0.15;
      const xIn = x + inner * (rx + 3), xOut = x - inner * (rx + 3);
      ctx.save();
      ctx.beginPath(); ellipse(ctx, x, y, rx + 1, ry + 1); ctx.clip();
      ctx.fillStyle = C.dino;
      ctx.beginPath();
      ctx.moveTo(xOut, hiY - 6); ctx.lineTo(xIn, hiY - 6); ctx.lineTo(xIn, yIn); ctx.lineTo(xOut, yOut); ctx.closePath();
      ctx.fill();
      ctx.restore();
      line(ctx, [xOut, yOut, xIn, yIn], 3.4);
      taper(ctx, [xOut - inner * 2, yOut - 7, (xOut + xIn) / 2, (yOut + yIn) / 2 - 9, xIn + inner * 3, yIn - 4], 7);
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
  eye(18, -152, 8, 11, false);
  eye(44, -151, 11, 13, true);
  // mouth
  const m = p.mouth || 'smile';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (m === 'smile') {
    // confident smirk: corner lifted at the back of the jaw, two fangs
    ctx.moveTo(50, -122);
    ctx.quadraticCurveTo(66, -106, 94, -114);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    for (const tx of [70, 84]) {
      ctx.beginPath(); ctx.moveTo(tx - 4, -110 + (tx - 70) * -0.05); ctx.lineTo(tx, -103); ctx.lineTo(tx + 4, -110); ctx.closePath(); ctx.fill();
      ctx.lineWidth = 1.6; ctx.stroke();
    }
  } else if (m === 'open' || m === 'grit') {
    ctx.fillStyle = C.mouth;
    ctx.moveTo(50, -120); ctx.quadraticCurveTo(72, -86, 96, -116); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(56, -118); ctx.lineTo(92, -115); ctx.lineTo(90, -109); ctx.lineTo(58, -112); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 2; ctx.stroke();
  } else if (m === 'o') {
    ctx.fillStyle = C.mouth;
    ellipse(ctx, 72, -110, 7, 6); ctx.fill(); ctx.stroke();
  } else {
    ctx.moveTo(60, -112); ctx.lineTo(86, -115); ctx.stroke();
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
