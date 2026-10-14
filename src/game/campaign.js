// Campaign: a board game across town. Roll the die (1–3), hop along the path,
// fight the wild creatures you land on, collect stars, and beat each boss at
// the end of its world. Czernobog waits at the very end as a GIANT.
// Pure data + functions (tested in node); the screen is ui/board-ui.js.
import { MINION_OF } from '../data/characters.js';

export const BOARD_VERSION = 1;
export const DIE_MAX = 3; // small numbers: Luca counts the hops
export const MINION_SCALE = 1.2; // wild creatures are built small; this brings them to fighting size
export const MINION_GIANT_SCALE = 1.6; // a giant wild creature (when you'd fight yourself)
export const BOSS_SCALE = 1.22;

// Worlds in order. Space codes: f = wild creature fight, s = star, l = lucky
// (roll again), B = this world's boss (a gate: you stop on it until you win),
// M = mid-world boss (also a gate).
export const WORLDS = [
  { arena: 'bedroom', minions: ['rexlet', 'squirrel'], mid: 'roo', boss: 'rex', spaces: 'fsfMlfB' },
  { arena: 'castle', minions: ['squire'], boss: 'arthur', spaces: 'fslfB' },
  { arena: 'fishing-pier', minions: ['minnow', 'crab'], mid: 'bass', boss: 'rockfish', spaces: 'fsfMlfB' },
  { arena: 'bog-shack', minions: ['frog'], boss: 'witch', spaces: 'fslfB' },
  { arena: 'haunted-forest', minions: ['sprout', 'imp', 'bones'], mid: 'tree', boss: 'nightwing', spaces: 'fsfMlfsB', final: true },
];

// A boss slot for this hero: the boss itself, or — if you ARE that boss — a giant
// version of your own wild creature. Czernobog is the final boss unless you're
// playing as Czernobog; then a giant Spooky Tree takes the throne.
function bossFor(heroId, bossId, final) {
  if (final && heroId === 'nightwing') return { foeId: 'tree', giant: true, scale: BOSS_SCALE };
  if (heroId === bossId) return { foeId: MINION_OF[heroId], giant: true, scale: MINION_GIANT_SCALE };
  if (final) return { foeId: bossId, giant: true, scale: BOSS_SCALE };
  return { foeId: bossId, giant: false, scale: 1 };
}

// The board for a hero: a flat list of spaces.
export function buildBoard(heroId) {
  const spaces = [{ type: 'start', world: 0, arena: WORLDS[0].arena }];
  WORLDS.forEach((w, wi) => {
    let mi = 0;
    for (const code of w.spaces) {
      const base = { world: wi, arena: w.arena };
      if (code === 'f') spaces.push({ ...base, type: 'fight', foeId: w.minions[mi++ % w.minions.length], giant: false, scale: MINION_SCALE });
      else if (code === 's') spaces.push({ ...base, type: 'star' });
      else if (code === 'l') spaces.push({ ...base, type: 'lucky' });
      else {
        let b;
        if (code === 'M') {
          // the forest's mid boss is Spooky Tree, unless the tree is the hero or took the final throne
          b = w.final && heroId === 'nightwing' ? { foeId: MINION_OF.nightwing, giant: true, scale: MINION_GIANT_SCALE } : bossFor(heroId, w.mid, false);
        } else b = bossFor(heroId, w.boss, !!w.final);
        spaces.push({ ...base, type: 'boss', ...b, final: code === 'B' && !!w.final });
      }
    }
  });
  return spaces;
}

export function newCampaign(heroId) {
  return { v: BOARD_VERSION, heroId, pos: 0, cleared: [0], stars: 0, rolls: 0, done: false };
}

const isGate = (sp) => sp.type === 'boss';
const isCleared = (c, i) => c.cleared.includes(i);

// What the space under the hero asks for now: 'fight' (uncleared fight or boss), or null (roll).
export function pending(c, board) {
  const sp = board[c.pos];
  return (sp.type === 'fight' || sp.type === 'boss') && !isCleared(c, c.pos) ? sp : null;
}

export function rollDie(rnd = Math.random) {
  return 1 + Math.floor(rnd() * DIE_MAX);
}

// Move `roll` spaces. Stops early on an uncleared boss gate and at the last space.
// Returns { campaign, hops: [space indexes passed through], landed, event }
//   event: 'fight' | 'star' | 'lucky' | null
export function move(c0, board, roll) {
  if (pending(c0, board) || c0.done) throw new Error('fight first');
  const c = { ...c0, cleared: c0.cleared.slice(), rolls: c0.rolls + 1 };
  const hops = [];
  for (let k = 0; k < roll && c.pos < board.length - 1; k++) {
    c.pos++;
    hops.push(c.pos);
    if (isGate(board[c.pos]) && !isCleared(c, c.pos)) break;
  }
  const sp = board[c.pos];
  let event = null;
  if ((sp.type === 'fight' || sp.type === 'boss') && !isCleared(c, c.pos)) event = 'fight';
  else if (sp.type === 'star' && !isCleared(c, c.pos)) {
    event = 'star';
    c.stars++;
    c.cleared.push(c.pos);
  } else if (sp.type === 'lucky') event = 'lucky';
  return { campaign: c, hops, landed: sp, event };
}

// After a battle on the current space.
export function winSpace(c0, board, stars) {
  const c = { ...c0, cleared: c0.cleared.slice(), stars: c0.stars + stars };
  if (!c.cleared.includes(c.pos)) c.cleared.push(c.pos);
  if (board[c.pos].final) c.done = true;
  return c;
}

export function isValidCampaign(c, chars) {
  try {
    if (!c || c.v !== BOARD_VERSION || !chars[c.heroId]) return false;
    const board = buildBoard(c.heroId);
    return Number.isInteger(c.pos) && c.pos >= 0 && c.pos < board.length && Array.isArray(c.cleared);
  } catch {
    return false;
  }
}

// The battle setup for the current space.
export function stopFor(sp) {
  return { foeId: sp.foeId, arenaId: sp.arena, boss: !!sp.giant, scale: sp.scale || 1 };
}
