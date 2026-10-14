// Drawing helpers that enforce STYLE_GUIDE v2 (early-'90s Saturday-morning
// action cartoon): near-black brush ink that is heavier on the shadow side,
// flat color, a big hard-edged shadow shape shifted cool toward blue-violet,
// a thin hard rim light on the right edge and angular hard glints.
// Light comes from the upper left.

export const INK = '#14111A';
export const OUTLINE = 5;

// ---------- color helpers ----------
const SHADE_TINT = [158, 146, 206]; // multiply → cool, blue-violet shadows
const CREASE_TINT = [100, 88, 152];

function parse(c) {
  if (typeof c !== 'string' || c[0] !== '#') return null;
  let h = c.slice(1);
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

export function multiply(c, tint) {
  const p = parse(c);
  if (!p) return c;
  return hex(p[0] * tint[0] / 255, p[1] * tint[1] / 255, p[2] * tint[2] / 255);
}
export function mix(a, b, t) {
  const p = parse(a), q = parse(b);
  if (!p || !q) return a;
  return hex(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t);
}
export const coolShade = (c) => multiply(c, SHADE_TINT);
export const crease = (c) => multiply(c, CREASE_TINT);
export const rimOf = (c) => mix(c, '#ffffff', 0.55);
export function rgba(c, a) {
  const p = parse(c) || [255, 255, 255];
  return `rgba(${p[0]},${p[1]},${p[2]},${a})`;
}

// ---------- path builders ----------
export function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.moveTo(x + rx * Math.cos(rot), y + rx * Math.sin(rot));
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
}

// Records the rough bounds of a path builder so shadow and rim sizes can
// scale with each part. Arcs count their full circle; good enough here.
class Bounds {
  constructor() { this.x0 = Infinity; this.y0 = Infinity; this.x1 = -Infinity; this.y1 = -Infinity; }
  add(x, y) { if (x < this.x0) this.x0 = x; if (x > this.x1) this.x1 = x; if (y < this.y0) this.y0 = y; if (y > this.y1) this.y1 = y; }
  moveTo(x, y) { this.add(x, y); }
  lineTo(x, y) { this.add(x, y); }
  quadraticCurveTo(a, b, x, y) { this.add(a, b); this.add(x, y); }
  bezierCurveTo(a, b, c, d, x, y) { this.add(a, b); this.add(c, d); this.add(x, y); }
  arcTo(a, b, x, y) { this.add(a, b); this.add(x, y); }
  arc(x, y, r) { this.add(x - r, y - r); this.add(x + r, y + r); }
  ellipse(x, y, rx, ry) { const m = Math.max(rx, ry); this.add(x - m, y - m); this.add(x + m, y + m); }
  rect(x, y, w, h) { this.add(x, y); this.add(x + w, y + h); }
  closePath() {}
  get w() { return this.x1 - this.x0; }
  get h() { return this.y1 - this.y0; }
}
export function bounds(build) {
  const b = new Bounds();
  build(b);
  return b;
}

// One inked, cel-shaded part.
//   fill   base color (hex)
//   shade  any truthy value = shade it (color is computed cool from `fill`);
//          null = flat color, no shadow or rim (eye whites, screens, boots)
//   opts.line       ink weight (visible width)
//   opts.highlight  [x, y, rx, ry, rot] → a hard angular glint (shiny plastic)
//   opts.rim        false to skip the rim light
//   opts.shadow     fraction of the part's size the light is offset by (≈⅓ in shadow)
//   opts.crease     add a darker third tone along the bottom (deep creases)
//   opts.noOutline  skip the ink
export function toon(ctx, build, fill, shade, opts = {}) {
  const { line = OUTLINE, highlight = null, noOutline = false, rim = true, shadow = 0.2, crease: creaseOn = false } = opts;
  const b = bounds(build);
  const size = Math.max(1, Math.min(b.w, b.h));
  // Ink goes UNDER the fill at double width, so overlapping parts merge into
  // one silhouette. A second pass nudged down-right makes the line heavier
  // on the shadow side, like a brush pen.
  if (!noOutline && line > 0) {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = INK;
    ctx.lineWidth = line * 2;
    ctx.beginPath();
    build(ctx);
    ctx.stroke();
    ctx.save();
    ctx.translate(line * 0.4, line * 0.5);
    ctx.beginPath();
    build(ctx);
    ctx.stroke();
    ctx.restore();
  }
  ctx.beginPath();
  build(ctx);
  const shaded = shade != null && parse(fill);
  if (!shaded) {
    ctx.fillStyle = fill;
    ctx.fill();
  } else {
    const sc = coolShade(fill);
    ctx.save();
    ctx.clip();
    const rimW = Math.max(1.4, Math.min(4, size * 0.06));
    // rim light: whole part, then the shadow tone covers all but the right edge
    ctx.fillStyle = rim ? rimOf(fill) : sc;
    ctx.fillRect(b.x0 - 4, b.y0 - 4, b.w + 8, b.h + 8);
    const fillShifted = (dx, dy, color) => {
      ctx.save();
      ctx.translate(dx, dy);
      ctx.beginPath();
      build(ctx);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    };
    // Light and rim directions are fixed in screen space, so rotated parts
    // (swinging arms) still get their shadow on the lower right.
    const toLocal = localDir(ctx);
    const rd = toLocal(-1, 0.35), up = toLocal(0, -1), ld = toLocal(-1, -1);
    const rx = rim ? rd[0] * rimW : 0, ry = rim ? rd[1] * rimW : 0;
    if (creaseOn) {
      // third, darker tone: a band along the bottom of the shadow side
      const c = Math.max(2, size * 0.09);
      fillShifted(rx, ry, crease(fill));
      fillShifted(rx + up[0] * c, ry + up[1] * c, sc);
    } else if (rim) {
      fillShifted(rx, ry, sc);
    }
    // lit area: the part shifted toward the light; what's left is a hard
    // shadow shape on the lower right
    ctx.translate(ld[0] * Math.SQRT2 * b.w * shadow, ld[1] * Math.SQRT2 * b.h * shadow);
    ctx.beginPath();
    build(ctx);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();
  }
  if (highlight) glint(ctx, build, highlight);
}

// Unit direction in the current local space for a screen-space direction.
function localDir(ctx) {
  const m = ctx.getTransform ? ctx.getTransform() : { a: 1, b: 0, c: 0, d: 1 };
  const det = m.a * m.d - m.b * m.c || 1;
  return (wx, wy) => {
    const x = (m.d * wx - m.c * wy) / det, y = (-m.b * wx + m.a * wy) / det;
    const l = Math.hypot(x, y) || 1;
    return [x / l, y / l];
  };
}

// Hard-edged angular glint: a sharp streak plus a small chip, clipped to the part.
export function glint(ctx, build, [x, y, rx, ry, rot = 0]) {
  ctx.save();
  ctx.beginPath();
  build(ctx);
  ctx.clip();
  ctx.translate(x, y);
  ctx.rotate(rot - 0.35);
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.92;
  const L = Math.max(rx, 3), T = Math.max(ry * 0.45, 1.6);
  ctx.beginPath();
  ctx.moveTo(-L, 0);
  ctx.lineTo(-L * 0.2, -T);
  ctx.lineTo(L, -T * 0.2);
  ctx.lineTo(L * 0.2, T * 0.6);
  ctx.closePath();
  ctx.fill();
  const d = Math.max(1.4, T * 0.8);
  ctx.beginPath();
  ctx.moveTo(L * 1.2, T * 0.6 - d);
  ctx.lineTo(L * 1.2 + d, T * 0.6);
  ctx.lineTo(L * 1.2, T * 0.6 + d);
  ctx.lineTo(L * 1.2 - d, T * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// A darker third tone in a deep crease (under an arm, inside a mouth).
export function creaseShape(ctx, build, fill) {
  ctx.beginPath();
  build(ctx);
  ctx.fillStyle = crease(fill);
  ctx.fill();
}

export function starPath(ctx, cx, cy, outer, inner, points = 5, rot = -Math.PI / 2) {
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer;
    const a = rot + (i * Math.PI) / points;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}

// Jagged comic starburst (uneven spikes, seeded so it doesn't flicker).
export function burstPath(ctx, cx, cy, outer, inner, points = 12, seed = 1, rot = 0) {
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner * (0.85 + rnd() * 0.3) : outer * (0.72 + rnd() * 0.42);
    const a = rot + (i * Math.PI) / points;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}

// Ink line with tapered ends (drawn as a filled stroke that thins at both tips).
export function line(ctx, pts, width = OUTLINE, color = INK) {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.stroke();
}

export function taper(ctx, pts, width = OUTLINE, color = INK) {
  // pts: x0,y0, cx,cy, x1,y1 (quadratic). Builds a lens-shaped brush stroke.
  const [x0, y0, cx, cy, x1, y1] = pts;
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len * width * 0.5, ny = dx / len * width * 0.5;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(cx + nx, cy + ny, x1, y1);
  ctx.quadraticCurveTo(cx - nx, cy - ny, x0, y0);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

// Chunky italic hero lettering with a hard drop and a two-tone fill.
export function comicText(ctx, text, x, y, size, fill = '#FFC914', rot = 0) {
  if (!text) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.font = `italic 900 ${size}px ${HERO_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  // hard extruded drop
  ctx.lineWidth = size * 0.2;
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.strokeText(text, size * 0.06, size * 0.1);
  ctx.fillText(text, size * 0.06, size * 0.1);
  ctx.strokeText(text, 0, 0);
  // two-tone fill: base on top, cool-shifted band below, hard edge
  const g = ctx.createLinearGradient(0, -size * 0.45, 0, size * 0.45);
  g.addColorStop(0, fill);
  g.addColorStop(0.56, fill);
  g.addColorStop(0.56, mix(fill, coolShade(fill), 0.6));
  g.addColorStop(1, mix(fill, coolShade(fill), 0.6));
  ctx.fillStyle = parse(fill) ? g : fill;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

// Rounded font stays for numbers and letters kids read (clear, upright shapes).
export const FONT = '"SF Pro Rounded", ui-rounded, "Arial Rounded MT Bold", "Nunito", system-ui, sans-serif';
// Hero lettering: heavy condensed italic.
export const HERO_FONT = '"Avenir Next Condensed", "AvenirNextCondensed-Heavy", "Futura", "Arial Narrow", "DejaVu Sans Condensed", "Roboto Condensed", Impact, system-ui, sans-serif';

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
