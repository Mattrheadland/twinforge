// Game modes as plain data + pure functions (tested in node).
//
//   campaign    the board game (game/campaign.js)
//   tournament  beat every other toy on its home turf, then a GIANT boss
//   arcade      pick your toy, the opponent and the arena (or SURPRISE!), then fight
//
// A run lives in save.data.run so a closed app picks up where it left off.
import { ARENAS, arenaFor } from '../data/arenas.js';

export const MODES = ['tournament', 'arcade'];
export const ARENA_IDS = Object.keys(ARENAS);
export const BOSS_HP = 1.35; // giant foes have this much more health
export const BOSS_SCALE = 1.22;

// The tournament's final boss: the first of these that isn't the hero.
const BOSSES = ['nightwing', 'tree', 'rockfish', 'rex'];

// Tournament order: easier toys first (less health and punch), toughest last.
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

export function newRun(mode, heroId, { chars, roster, rnd = Math.random, arenaId = null, foeId = null } = {}) {
  const others = roster.filter((id) => id !== heroId);
  const run = { mode, heroId, step: 0, wins: 0, stars: 0, path: [], done: false };
  if (mode === 'tournament') {
    const boss = BOSSES.find((id) => others.includes(id)) || others[others.length - 1];
    const order = others.filter((id) => id !== boss).sort((a, b) => difficulty(chars[a]) - difficulty(chars[b]) || a.localeCompare(b));
    run.path = order.map((id) => stop(id, arenaFor(id)));
    run.path.push(stop(boss, arenaFor(boss) === 'bedroom' ? 'haunted-forest' : arenaFor(boss), true));
  } else {
    // arcade: one fight, everything picked (null = surprise)
    const foe = foeId && others.includes(foeId) ? foeId : pick(others, rnd);
    run.path = [stop(foe, arenaId && ARENAS[arenaId] ? arenaId : pick(ARENA_IDS, rnd))];
  }
  return run;
}

export const current = (run) => run && run.path[run.step];

// After a win. Returns the updated run (a copy); `done` when the path is finished.
export function winStop(run, stars) {
  const r = { ...run, path: run.path.slice(), wins: run.wins + 1, stars: run.stars + stars, step: run.step + 1 };
  r.done = r.step >= r.path.length;
  return r;
}

// Records kept across runs.
export function defaultRecords() {
  return { campaignCleared: {}, trophies: 0, arcadeWins: 0 };
}

export function recordRun(records, run) {
  const rec = { ...defaultRecords(), ...(records || {}), campaignCleared: { ...(records?.campaignCleared || {}) } };
  if (run.mode === 'tournament' && run.done) rec.trophies++;
  if (run.mode === 'arcade' && run.done) rec.arcadeWins++;
  if (run.mode === 'campaign' && run.done) rec.campaignCleared[run.heroId] = true;
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
