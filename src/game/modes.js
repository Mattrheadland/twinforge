// Game modes as plain data + pure functions (tested in node).
//
//   story       beat every other toy on its home turf, then a GIANT boss
//   tournament  three rounds against random toys in random arenas; the final is giant
//   arcade      endless: keep winning, count the streak
//   quick       one battle, any arena (or shuffle)
//
// A run lives in save.data.run so a closed app picks up where it left off.
import { ARENAS, arenaFor } from '../data/arenas.js';

export const MODES = ['story', 'tournament', 'arcade', 'quick'];
export const ARENA_IDS = Object.keys(ARENAS);
export const BOSS_HP = 1.35; // giant foes have this much more health
export const BOSS_SCALE = 1.22;

// The story's final boss: the first of these that isn't the hero.
const BOSSES = ['nightwing', 'tree', 'rockfish', 'rex'];

// Story order: easier toys first (less health and punch), toughest last.
function difficulty(def) {
  return def.maxHp + (def.attackBonus || 0) * 6;
}

function pick(list, rnd) {
  return list[Math.floor(rnd() * list.length)];
}

function shuffle(list, rnd) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// One stop on a run's path.
const stop = (foeId, arenaId, boss = false) => ({ foeId, arenaId, boss });

export function newRun(mode, heroId, { chars, roster, rnd = Math.random, arenaId = null } = {}) {
  const others = roster.filter((id) => id !== heroId);
  const run = { mode, heroId, step: 0, wins: 0, stars: 0, path: [], done: false };
  if (mode === 'story') {
    const boss = BOSSES.find((id) => others.includes(id)) || others[others.length - 1];
    const order = others.filter((id) => id !== boss).sort((a, b) => difficulty(chars[a]) - difficulty(chars[b]) || a.localeCompare(b));
    run.path = order.map((id) => stop(id, arenaFor(id)));
    run.path.push(stop(boss, arenaFor(boss) === 'bedroom' ? 'haunted-forest' : arenaFor(boss), true));
  } else if (mode === 'tournament') {
    const foes = shuffle(others, rnd).slice(0, 3);
    const arenas = shuffle(ARENA_IDS, rnd);
    run.path = foes.map((id, i) => stop(id, arenas[i % arenas.length], i === foes.length - 1));
  } else if (mode === 'arcade') {
    run.path = [stop(pick(others, rnd), pick(ARENA_IDS, rnd))];
  } else {
    const foe = pick(others, rnd);
    run.path = [stop(foe, arenaId && ARENAS[arenaId] ? arenaId : pick(ARENA_IDS, rnd))];
  }
  return run;
}

export const current = (run) => run && run.path[run.step];

// After a win. Returns the updated run (a copy); `done` when the path is finished.
export function winStop(run, stars, { roster, rnd = Math.random } = {}) {
  const r = { ...run, path: run.path.slice(), wins: run.wins + 1, stars: run.stars + stars };
  if (run.mode === 'arcade') {
    const last = run.path[run.step];
    const others = roster.filter((id) => id !== run.heroId && id !== last.foeId);
    // every fifth fight is a giant
    const n = r.wins + 1;
    r.path.push(stop(pick(others, rnd), pick(ARENA_IDS.filter((a) => a !== last.arenaId), rnd), n % 5 === 0));
    r.step++;
    return r;
  }
  r.step++;
  r.done = r.step >= r.path.length;
  return r;
}

// Records kept across runs.
export function defaultRecords() {
  return { storyCleared: {}, trophies: 0, arcadeBest: 0 };
}

export function recordRun(records, run) {
  const rec = { ...defaultRecords(), ...(records || {}), storyCleared: { ...(records?.storyCleared || {}) } };
  if (run.mode === 'story' && run.done) rec.storyCleared[run.heroId] = true;
  if (run.mode === 'tournament' && run.done) rec.trophies++;
  if (run.mode === 'arcade') rec.arcadeBest = Math.max(rec.arcadeBest, run.wins);
  return rec;
}

export function isValidRun(run, chars) {
  try {
    return !!run && MODES.includes(run.mode) && !!chars[run.heroId] && Array.isArray(run.path) &&
      run.path.length > 0 && run.step >= 0 && run.step < run.path.length + (run.done ? 1 : 0) &&
      run.path.every((s) => chars[s.foeId] && ARENAS[s.arenaId]);
  } catch {
    return false;
  }
}
