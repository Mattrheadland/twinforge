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
//
// Stakes (v6): the foe has a CHARGE meter, counted in whole pips so it can be
// drawn as a row of lights. Each wrong tap on a math or reading question adds
// pips ('hint' = 1 wrong tap, 'support' = 2; never more than 2 per question); a
// first-try answer drains some. When the meter fills, the foe winds up (the
// 'windup' event). The foe's move right after that is still a normal one; its
// first attack after the hero's NEXT turn is the charged attack: more damage,
// then the meter empties. So the child always gets one turn with the wind-up on
// screen, and a guard still blocks or dodges it: the wind-up is a warning the
// child can act on. All numbers are per learning pathway in RULES.stakes;
// a battle keeps the pathway it was created with (s.pathway).
//
// Loadouts (v6 Phase 4, logic/gear.js): a toy's equipped armor and move styles arrive as a
// "kitted" character def. A move may carry quickDmg / energyGain (quick), powerDelta / healOn
// (power), guardFactor / reflect (guard) and energyCost (special); def.startEnergy is the energy
// the hero starts with. Absent fields mean the plain rules below, so unkitted toys play as before.
//
// When the hero's health reaches 0 the battle is lost (result 'lose'); nothing
// here rescues it. Losing never touches stars, XP or progress (logic/outcome.js).

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
  // Phase 5 audit (directive §8). All capped and predictable; none stacks forever.
  //   quickRead   a quick move used again right after a quick does less: the foe has seen it
  //               (1st in a row = full, 2nd = 4/5, 3rd and on = about 2/3). Energy still comes. So quick
  //               is the safe opener and the finisher, not a way around the questions.
  //   secondWind  once per battle, when the hero first drops to this share of health: +1 energy
  //               and one pip off the foe's meter. A chance, never a rescue (the hit still landed).
  //   retryHand   after this many defeats in a row against the same foe, a retry starts with
  //               1 energy (never more, never a smaller foe). Capped at one pip whatever the streak.
  //   boss        giants are harder by behaviour, not only health: meter one pip smaller (min 2)
  //               and the charged attack hits harder. foeHp above still applies.
  quickRead: [1, 0.8, 0.65],
  secondWind: { at: 0.3, energy: 1, drain: 1 },
  retryHand: { after: 2, energy: 1 },
  boss: { pipsLess: 1, minPips: 2, chargedPower: 1.2 },
  // Per pathway (save.js PATHWAYS). Balance proven by test/balance.test.mjs.
  // Before v6 even random tapping won ~100% of fights in about 5 turns, so the
  // foe also gets more health: a fight lasts long enough for the meter to matter.
  //   pips        meter size (the charged attack comes when it is full)
  //   perWrong    pips added per wrong tap (max 2 wrong taps count per question)
  //   drain       pips removed by a first-try answer
  //   chargedHit  base damage of the charged attack (a foe's slam, 22, if bigger)
  //   foePower    multiplier on every foe hit (1 = the pre-v6 numbers above)
  //   foeHp       multiplier on the foe's health (bosses get BOSS_HP on top)
  stakes: {
    early: { pips: 3, perWrong: 1, drain: 1, chargedHit: 36, foePower: 0.9, foeHp: 1.5 },
    growing: { pips: 2, perWrong: 1, drain: 1, chargedHit: 46, foePower: 1, foeHp: 1.4 },
  },
};

export const PATHWAY_DEFAULT = 'early';
export const stakesFor = (s) => RULES.stakes[s && s.pathway] || RULES.stakes[PATHWAY_DEFAULT];
// The meter size for THIS battle: a giant's is one pip smaller (never below RULES.boss.minPips).
export const pipsFor = (s) => { const p = stakesFor(s).pips; return s && s.boss ? Math.max(RULES.boss.minPips, p - RULES.boss.pipsLess) : p; };
const WRONG_TAPS = { indep: 0, hint: 1, support: 2, none: 0 };

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
// pathway: the player's learning pathway ('early' | 'growing'); sets the stakes.
// startEnergy: extra starting energy for a retry hand (logic/outcome.js); capped at RULES.maxEnergy - 1 with the toy's own.
export function createBattle({ heroId, foeId, chars, arenaId = 'bedroom', boss = false, pathway = PATHWAY_DEFAULT, startEnergy = 0 }) {
  const h = chars[heroId];
  const f = chars[foeId];
  if (!h || !f) throw new Error('unknown character');
  if (!RULES.stakes[pathway]) pathway = PATHWAY_DEFAULT;
  const foeHp = Math.round(f.maxHp * (boss ? 1.35 : 1) * RULES.stakes[pathway].foeHp);
  return {
    v: BATTLE_VERSION,
    heroId,
    foeId,
    arenaId,
    pathway,
    round: 1,
    turn: 'hero',
    result: null,
    hero: { hp: h.maxHp, maxHp: h.maxHp, energy: Math.max(0, Math.min(RULES.maxEnergy - 1, (h.startEnergy | 0) + (startEnergy | 0))), guard: null, shield: false, secondWind: false, quickStreak: 0,
      specialCost: Math.max(1, Math.min(RULES.maxEnergy, (moveFor(h, 'special') || {}).energyCost || RULES.maxEnergy)) },
    boss,
    foe: { hp: foeHp, maxHp: foeHp, charged: false, dizzy: false, step: 0, meter: 0, windup: false, windupFresh: false },
    stats: { indep: 0, hint: 0, support: 0, turns: 0 },
  };
}

export function canAct(s, action) {
  if (!s || s.result || s.turn !== 'hero') return false;
  const slot = slotOf(action);
  if (slot === 'special') return s.hero.energy >= (s.hero.specialCost || RULES.maxEnergy);
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

// The foe's charge meter after an answered question. Battles saved before v6
// have no meter fields; they start at 0.
function chargeMeter(s, quality, ev) {
  const st = stakesFor(s);
  const f = s.foe;
  if (f.windup) return; // already winding up: the next attack is charged either way
  const before = f.meter || 0;
  const wrong = WRONG_TAPS[quality] || 0;
  let meter = before;
  const pips = pipsFor(s);
  if (wrong) meter = Math.min(pips, before + wrong * st.perWrong);
  else if (quality === 'indep') meter = Math.max(0, before - st.drain);
  if (meter === before) return;
  f.meter = meter;
  ev.push({ type: 'meter', target: 'foe', meter, max: pips, delta: meter - before, reason: wrong ? 'wrong' : 'drain' });
  if (meter >= pips) {
    // the foe's very next move stays a normal one, so the child gets a turn
    // to see the wind-up and guard before the charged attack lands
    f.windup = true;
    f.windupFresh = true;
    ev.push({ type: 'windup', target: 'foe' });
  }
}

// What the HUD draws: pips lit, meter size, and whether the foe is winding up.
export const meterOf = (s) => ({ meter: s.foe.meter || 0, max: pipsFor(s), windup: !!s.foe.windup });

function setGuard(s, type, ev, from, move = {}) {
  s.hero.guard = type;
  s.hero.shield = true;
  s.hero.guardFactor = move.guardFactor ?? null;
  s.hero.reflect = move.reflect ?? null;
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
    // the foe reads a repeated quick: 2nd in a row does 4/5, 3rd and on about 2/3 (RULES.quickRead)
    const streak = s.hero.lastSlot === 'quick' ? (s.hero.quickStreak || 1) + 1 : 1;
    s.hero.quickStreak = streak;
    const read = RULES.quickRead[Math.min(streak, RULES.quickRead.length) - 1];
    damage(s, 'foe', ((move.quickDmg ?? RULES.quick) + bonus) * read, ev, { kind: 'quick', quality, read: read < 1, streak });
    if (!s.result) gainEnergy(s, move.energyGain ?? RULES.energy.quick, ev, 'hit');
  } else if (slot === 'power') {
    damage(s, 'foe', Math.max(1, RULES.power[quality] + ((move.powerDelta || {})[quality] || 0) + bonus), ev, { kind: 'power', quality });
    const heal = (move.healOn || {})[quality] || 0;
    if (heal && !s.result && s.hero.hp < s.hero.maxHp) {
      const before = s.hero.hp;
      s.hero.hp = Math.min(s.hero.maxHp, s.hero.hp + heal);
      ev.push({ type: 'heal', target: 'hero', amount: s.hero.hp - before, hp: s.hero.hp, maxHp: s.hero.maxHp });
    }
    if (!s.result) {
      const extra = quality === 'indep' ? RULES.energy.powerIndepBonus : 0;
      gainEnergy(s, RULES.energy.power + extra, ev, extra ? 'bonus' : 'hit');
    }
  } else if (slot === 'guard') {
    setGuard(s, move.guard || 'block', ev, undefined, move);
    gainEnergy(s, RULES.energy.guard, ev, 'defend');
  } else if (slot === 'special') {
    const cost = s.hero.specialCost || RULES.maxEnergy;
    s.hero.energy = Math.max(0, s.hero.energy - cost);
    ev.push({ type: 'energy', gained: -cost, energy: s.hero.energy, reason: 'spent' });
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

  if (!s.result && quality !== 'none') chargeMeter(s, quality, ev);
  s.hero.lastSlot = slot;
  if (!s.result) s.turn = 'foe';
  return { state: s, events: ev };
}

// The foe's next move. Exposed so the UI can telegraph it:
// 'quick' | 'power' | 'charge' | 'slam' (its special, after a charge) | 'dizzy'.
// Once per battle: the first time the hero is left at or under RULES.secondWind.at of
// their health (and still standing), they get a breath: +1 energy and one pip off the
// foe's meter (never cancelling a wind-up already shown). A chance to turn it round, not a rescue.
function secondWind(s, ev) {
  const sw = RULES.secondWind, h = s.hero;
  if (s.result || h.secondWind || h.hp <= 0 || h.hp > h.maxHp * sw.at) return;
  h.secondWind = true;
  ev.push({ type: 'secondwind', target: 'hero', hp: h.hp, maxHp: h.maxHp });
  gainEnergy(s, sw.energy, ev, 'secondwind');
  if (!s.foe.windup && (s.foe.meter || 0) > 0) {
    s.foe.meter = Math.max(0, s.foe.meter - sw.drain);
    ev.push({ type: 'meter', target: 'foe', meter: s.foe.meter, max: pipsFor(s), delta: -sw.drain, reason: 'secondwind' });
  }
}

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
  const st = stakesFor(s);
  const power = (fc.foePower || 1) * st.foePower;

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
    // a full charge meter (filled before the hero's last turn) makes this attack
    // a charged one, then empties
    const charged = !!s.foe.windup && !s.foe.windupFresh;
    ev.push({ type: 'action', who: 'foe', action: slam ? 'slam' : intent, move: move?.id, charged });
    const plain = slam ? RULES.foe.slam : RULES.foe[intent] || RULES.foe.quick;
    const base = (charged ? Math.max(plain, st.chargedHit) * (s.boss ? RULES.boss.chargedPower : 1) : plain) * power;
    const guard = s.hero.guard || (s.hero.shield ? 'block' : null);
    const kind = slam ? 'slam' : intent;
    const big = slam || charged;
    if (guard === 'dodge') {
      ev.push({ type: 'dodge', target: 'hero', perfect: big });
      damage(s, 'hero', 0, ev, { kind, blocked: true, dodged: true, perfect: big, big, charged });
    } else {
      const blocked = !!guard;
      const amount = blocked ? Math.max(1, Math.round(base * (s.hero.guardFactor ?? RULES.guardFactor))) : base;
      damage(s, 'hero', amount, ev, { kind, blocked, perfect: blocked && big, big, guard, charged });
      if (guard === 'reflect' && !s.result) damage(s, 'foe', s.hero.reflect ?? RULES.reflect, ev, { kind: 'reflect' });
    }
    if (guard && big && !s.result) gainEnergy(s, RULES.energy.perfect, ev, 'perfect');
    if (charged) {
      s.foe.windup = false;
      s.foe.meter = 0;
      ev.push({ type: 'meter', target: 'foe', meter: 0, max: pipsFor(s), delta: 0, reason: 'release' });
    }
    secondWind(s, ev);
  }

  s.foe.windupFresh = false;
  if (s.hero.guard || s.hero.shield) {
    s.hero.guard = null;
    s.hero.shield = false;
    s.hero.guardFactor = null;
    s.hero.reflect = null;
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
