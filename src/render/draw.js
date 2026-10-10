// Drawing helpers that enforce the style guide: dark ink outline, flat color,
// one cel-shade band (light from upper-left), small highlight.

export const INK = '#1d1530';
export const OUTLINE = 5;

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

// Fill `build` with `fill`, add a shade band offset toward bottom-right, outline it.
export function toon(ctx, build, fill, shade, opts = {}) {
  const { line = OUTLINE, shadeOffset = 7, highlight = null, noOutline = false } = opts;
  // Outline goes UNDER the fill at double width: overlapping parts merge into
  // one clean silhouette, while later parts still get an outline on top.
  if (!noOutline) {
    ctx.beginPath();
    build(ctx);
    ctx.lineWidth = line * 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
  ctx.beginPath();
  build(ctx);
  ctx.fillStyle = shade || fill;
  ctx.fill();
  if (shade) {
    ctx.save();
    ctx.clip();
    ctx.translate(-shadeOffset, -shadeOffset);
    ctx.beginPath();
    build(ctx);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();
  }
  if (highlight) {
    ctx.save();
    ctx.beginPath();
    build(ctx);
    ctx.clip();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ellipse(ctx, highlight[0], highlight[1], highlight[2], highlight[3], highlight[4] || 0);
    ctx.fill();
    ctx.restore();
  }
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

export function comicText(ctx, text, x, y, size, fill = '#ffd23f', rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.font = `900 ${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.22;
  ctx.strokeStyle = INK;
  ctx.strokeText(text, 0, size * 0.06);
  ctx.fillStyle = fill;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

export const FONT = '"SF Pro Rounded", ui-rounded, "Arial Rounded MT Bold", "Nunito", system-ui, sans-serif';

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
