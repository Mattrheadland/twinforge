// Pure battle rules. No DOM, no timing, no audio.
// Every function takes a state and returns { state, events } with a NEW state.
// Presentation reads `events` and animates them; it never decides outcomes.
//
// Each character has 4 moves, one per slot:
//   quick   — reliable hit, no question, +1 energy
//   power   — bigger hit; asks a MATH question when Learning is on, +1 energy (+2 if answered alone)
//   guard   — protects against the foe's next move (block / reflect / dodge), +1 energy
//   special — needs full energy; asks a READING question when Learning is on
// Quality of an answer: 'indep' (first try), 'hint' (second try), 'support'
// (shown the answer), or 'none' (no question: Learning off, or a quick/guard move).
// A wrong answer never causes a miss.

export const RULES = {
  maxEnergy: 3,
  quick: 12,
  power: { indep: 22, hint: 18, support: 14, none: 20 },
  special: { indep: 38, hint: 33, support: 28, none: 35 },
  energy: { quick: 1, power: 1, powerIndepBonus: 1, guard: 1, perfect: 1 },
  guardFactor: 0.2,
  reflect: 6,
  heal: 16,
  foe: { quick: 8, power: 12, slam: 22 },
};

export const SLOTS = ['quick', 'power', 'guard', 'special'];
export const QUALITIES = ['indep', 'hint', 'support', 'none'];
export const BATTLE_VERSION = 2;

// Old action names from saves/tests.
const ALIAS = { attack: 'power', defend: 'guard' };
export const slotOf = (a) => ALIAS[a] || a;

const clone = (s) => JSON.parse(JSON.stringify(s));

export function moveFor(def, slot) {
  return (def.moves || []).find((m) => m.slot === slotOf(slot));
}

// Which question a move asks (null = none).
export function learningFor(slot) {
  slot = slotOf(slot);
  return slot === 'power' ? 'math' : slot === 'special' ? 'reading' : null;
}

// boss: a GIANT foe (game/modes.js) with BOSS_HP times the health.
export function createBattle({ heroId, foeId, chars, arenaId = 'bedroom', boss = false }) {
  const h = chars[heroId];
  const f = chars[foeId];
  if (!h || !f) throw new Error('unknown character');
  const foeHp = boss ? Math.round(f.maxHp * 1.35) : f.maxHp;
  return {
    v: BATTLE_VERSION,
    heroId,
    foeId,
    arenaId,
    round: 1,
    turn: 'hero',
    result: null,
    hero: { hp: h.maxHp, maxHp: h.maxHp, energy: 0, guard: null, shield: false },
    boss,
    foe: { hp: foeHp, maxHp: foeHp, charged: false, dizzy: false, step: 0 },
    stats: { indep: 0, hint: 0, support: 0, turns: 0 },
  };
}

export function canAct(s, action) {
  if (!s || s.result || s.turn !== 'hero') return false;
  const slot = slotOf(action);
  if (slot === 'special') return s.hero.energy >= RULES.maxEnergy;
  // a guard can't be used twice in a row (otherwise a dodger could never be hit)
  if (slot === 'guard') return s.hero.lastSlot !== 'guard';
  return slot === 'quick' || slot === 'power';
}

function gainEnergy(s, amount, events, reason) {
  const before = s.hero.energy;
  s.hero.energy = Math.min(RULES.maxEnergy, before + amount);
  const gained = s.hero.energy - before;
  if (gained > 0) events.push({ type: 'energy', gained, energy: s.hero.energy, reason });
}

function damage(s, target, amount, events, extra = {}) {
  const t = s[target];
  const amt = Math.max(0, Math.round(amount));
  t.hp = Math.max(0, t.hp - amt);
  events.push({ type: 'damage', target, amount: amt, hp: t.hp, maxHp: t.maxHp, ...extra });
  if (t.hp === 0 && !s.result) {
    s.result = target === 'foe' ? 'win' : 'lose';
    events.push({ type: 'ko', target });
  }
}

function setGuard(s, type, ev, from) {
  s.hero.guard = type;
  s.hero.shield = true;
  ev.push({ type: 'shield', on: true, guard: type, from });
}

export function heroAct(s0, action, quality, chars) {
  const slot = slotOf(action);
  if (!canAct(s0, slot)) throw new Error(`illegal action: ${action}`);
  if (quality == null) quality = 'none';
  if (!QUALITIES.includes(quality)) throw new Error('bad quality');
  const s = clone(s0);
  const ev = [];
  const hc = chars[s.heroId];
  const move = moveFor(hc, slot) || { slot, id: slot, name: slot };
  s.stats.turns++;
  if (quality !== 'none') s.stats[quality]++;
  const bonus = hc.attackBonus || 0;

  ev.push({ type: 'action', who: 'hero', action: slot, quality, move: move.id });

  if (slot === 'quick') {
    damage(s, 'foe', RULES.quick + bonus, ev, { kind: 'quick', quality });
    if (!s.result) gainEnergy(s, RULES.energy.quick, ev, 'hit');
  } else if (slot === 'power') {
    damage(s, 'foe', RULES.power[quality] + bonus, ev, { kind: 'power', quality });
    if (!s.result) {
      const extra = quality === 'indep' ? RULES.energy.powerIndepBonus : 0;
      gainEnergy(s, RULES.energy.power + extra, ev, extra ? 'bonus' : 'hit');
    }
  } else if (slot === 'guard') {
    setGuard(s, move.guard || 'block', ev);
    gainEnergy(s, RULES.energy.guard, ev, 'defend');
  } else if (slot === 'special') {
    s.hero.energy = 0;
    ev.push({ type: 'energy', gained: -RULES.maxEnergy, energy: 0, reason: 'spent' });
    const sp = move;
    const dmg = RULES.special[quality] * (sp.power || 1);
    damage(s, 'foe', dmg, ev, { kind: 'special', quality, big: true, hits: sp.hits || 1 });
    if (!s.result) {
      if (sp.effect === 'dizzy') {
        const wasCharged = s.foe.charged;
        s.foe.dizzy = true;
        s.foe.charged = false;
        ev.push({ type: 'dizzy', target: 'foe', cancelledCharge: wasCharged });
      } else if (sp.effect === 'shield') {
        setGuard(s, 'block', ev, 'special');
      } else if (sp.effect === 'heal') {
        const before = s.hero.hp;
        s.hero.hp = Math.min(s.hero.maxHp, s.hero.hp + RULES.heal);
        ev.push({ type: 'heal', target: 'hero', amount: s.hero.hp - before, hp: s.hero.hp, maxHp: s.hero.maxHp });
      }
    }
  }

  s.hero.lastSlot = slot;
  if (!s.result) s.turn = 'foe';
  return { state: s, events: ev };
}

// The foe's next move. Exposed so the UI can telegraph it:
// 'quick' | 'power' | 'charge' | 'slam' (its special, after a charge) | 'dizzy'.
export function foeIntent(s, chars) {
  if (s.foe.dizzy) return 'dizzy';
  if (s.foe.charged) return 'slam';
  const pattern = chars[s.foeId].foePattern || ['quick', 'power', 'charge', 'slam'];
  let move = pattern[s.foe.step % pattern.length];
  if (move === 'attack') move = 'quick';
  // A slam in the pattern without a charge first becomes a power move.
  return move === 'slam' ? 'power' : move;
}

export function foeAct(s0, chars) {
  if (!s0 || s0.result || s0.turn !== 'foe') throw new Error('not foe turn');
  const s = clone(s0);
  const ev = [];
  const fc = chars[s.foeId];
  const intent = foeIntent(s, chars);
  const power = fc.foePower || 1;

  if (intent === 'dizzy') {
    s.foe.dizzy = false;
    ev.push({ type: 'action', who: 'foe', action: 'dizzy' });
  } else if (intent === 'charge') {
    s.foe.charged = true;
    s.foe.step++;
    ev.push({ type: 'action', who: 'foe', action: 'charge', move: moveFor(fc, 'special')?.id });
  } else {
    const slam = intent === 'slam';
    if (slam) s.foe.charged = false;
    s.foe.step++;
    // skip the pattern's own 'slam' slot after a charge so the cycle stays readable
    const pattern = fc.foePattern || [];
    if (slam && pattern[s.foe.step % pattern.length] === 'slam') s.foe.step++;
    const slot = slam ? 'special' : intent;
    const move = moveFor(fc, slot);
    ev.push({ type: 'action', who: 'foe', action: slam ? 'slam' : intent, move: move?.id });
    const base = (slam ? RULES.foe.slam : RULES.foe[intent] || RULES.foe.quick) * power;
    const guard = s.hero.guard || (s.hero.shield ? 'block' : null);
    const kind = slam ? 'slam' : intent;
    if (guard === 'dodge') {
      ev.push({ type: 'dodge', target: 'hero', perfect: slam });
      damage(s, 'hero', 0, ev, { kind, blocked: true, dodged: true, perfect: slam, big: slam });
    } else {
      const blocked = !!guard;
      const amount = blocked ? Math.max(1, Math.round(base * RULES.guardFactor)) : base;
      damage(s, 'hero', amount, ev, { kind, blocked, perfect: blocked && slam, big: slam, guard });
      if (guard === 'reflect' && !s.result) damage(s, 'foe', RULES.reflect, ev, { kind: 'reflect' });
    }
    if (guard && slam && !s.result) gainEnergy(s, RULES.energy.perfect, ev, 'perfect');
  }

  if (s.hero.guard || s.hero.shield) {
    s.hero.guard = null;
    s.hero.shield = false;
    ev.push({ type: 'shield', on: false });
  }
  if (!s.result) {
    s.turn = 'hero';
    s.round++;
  }
  return { state: s, events: ev };
}

export function starsFor(s) {
  if (s.result !== 'win') return 0;
  const pct = s.hero.hp / s.hero.maxHp;
  return pct > 0.6 ? 3 : pct > 0.3 ? 2 : 1;
}

export function isValidBattle(s, chars) {
  try {
    return (
      s && s.v === BATTLE_VERSION && chars[s.heroId] && chars[s.foeId] &&
      Number.isFinite(s.hero.hp) && Number.isFinite(s.foe.hp) &&
      s.hero.hp >= 0 && s.foe.hp >= 0 &&
      s.hero.energy >= 0 && s.hero.energy <= RULES.maxEnergy &&
      (s.turn === 'hero' || s.turn === 'foe')
    );
  } catch {
    return false;
  }
}
