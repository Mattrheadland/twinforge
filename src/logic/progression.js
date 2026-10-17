// Player level (1–100) and experience. Pure: no DOM, no save access.
//
// XP curve. Total XP needed to reach level n:
//   xpForLevel(n) = 40·(n−1) + 10·(n−1)²
// so the step from level n to n+1 costs 30 + 20·n XP:
//   level 2 at 50 XP, 3 at 120, 4 at 210, 5 at 320, 10 at 1,170, 20 at 4,370,
//   50 at 25,970 and 100 at 101,970.
// A won battle with a few questions earns roughly 50–80 XP (see XP below), so the
// first level-up comes in the first battle or two, level 10 after about 20 battles,
// and level 100 is a long-term goal (well over a thousand battles).
//
// XP only comes from real play and is never taken away.

export const MAX_LEVEL = 100;

export const XP = {
  indep: 10, // right on the first try
  hint: 5, // right on the second try
  support: 2, // right with the answer shown
  win: 25, // a battle won
  star: 5, // per star earned in a won battle
  space: 15, // a campaign board space cleared
};

export function xpForLevel(n) {
  const k = Math.max(1, Math.min(MAX_LEVEL, Math.floor(n))) - 1;
  return 40 * k + 10 * k * k;
}

export function levelForXp(xp) {
  const x = Math.max(0, Number.isFinite(+xp) ? +xp : 0);
  // invert 10k² + 40k − x = 0, then settle rounding at the edges
  let n = 1 + Math.floor((-40 + Math.sqrt(1600 + 40 * x)) / 20);
  n = Math.max(1, Math.min(MAX_LEVEL, n));
  while (n < MAX_LEVEL && xpForLevel(n + 1) <= x) n++;
  while (n > 1 && xpForLevel(n) > x) n--;
  return n;
}

// Where the bar sits: XP into the current level and XP that level takes in all.
// At level 100 the bar is full (into = needed).
export function xpProgress(xp) {
  const x = Math.max(0, Math.floor(Number.isFinite(+xp) ? +xp : 0));
  const level = levelForXp(x);
  if (level >= MAX_LEVEL) {
    const needed = xpForLevel(MAX_LEVEL) - xpForLevel(MAX_LEVEL - 1);
    return { level, into: needed, needed, max: true };
  }
  const base = xpForLevel(level);
  return { level, into: x - base, needed: xpForLevel(level + 1) - base, max: false };
}

export const xpForAnswer = (quality) => XP[quality] || 0; // 'none' (learning off) earns nothing
export const xpForWin = (stars = 0) => XP.win + XP.star * Math.max(0, Math.min(3, stars | 0));

// Add XP to a save's `player` ({ xp, level }). Negative or junk amounts add nothing.
// The level follows the XP but never drops and never passes 100.
// Returns { player, gained, from, to } (from/to are levels).
export function awardXp(player, amount) {
  const p = player && typeof player === 'object' ? player : {};
  const xp0 = Math.max(0, Math.floor(+p.xp || 0));
  const from = Math.max(1, Math.min(MAX_LEVEL, Math.floor(+p.level || 1)));
  const add = Math.max(0, Math.floor(Number.isFinite(+amount) ? +amount : 0));
  const xp = xp0 + add;
  const to = Math.max(from, levelForXp(xp));
  return { player: { ...p, xp, level: to }, gained: add, from, to };
}
