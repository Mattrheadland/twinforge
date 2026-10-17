// Deterministic battle simulator for balance tests (test/balance.test.mjs).
// Plays whole battles through the pure rules in logic/battle.js with a seeded RNG
// and a scripted child:
//   accuracy p   each tap on a question is right with chance p, so a question is
//                'indep' (p), 'hint' ((1−p)·p) or 'support' (the rest); buttons:
//                special when ready, guard on a visible threat half the time,
//                otherwise power (3 in 4) or quick
//   'random'     taps any button and any answer: 1 in 3 right first, then 1 in 2
import { createBattle, heroAct, foeAct, canAct, foeIntent, SLOTS } from '../src/logic/battle.js';
import { Rng } from '../src/logic/rng.js';

function answer(rng, accuracy) {
  if (accuracy === 'random') {
    const r = rng.next();
    return r < 1 / 3 ? 'indep' : r < 2 / 3 ? 'hint' : 'support';
  }
  if (rng.next() < accuracy) return 'indep';
  if (rng.next() < accuracy) return 'hint';
  return 'support';
}

function choose(rng, s, chars, accuracy) {
  if (accuracy === 'random') return rng.pick(SLOTS.filter((k) => canAct(s, k)));
  if (canAct(s, 'special')) return 'special';
  const threat = s.foe.windup || foeIntent({ ...s, turn: 'foe' }, chars) === 'slam';
  if (threat && canAct(s, 'guard') && rng.next() < 0.5) return 'guard';
  return rng.next() < 0.75 ? 'power' : 'quick';
}

// One battle. Returns { result, turns, charged } (charged: charged attacks the foe threw).
export function playBattle({ heroId, foeId, chars, pathway, accuracy, rng, boss = false }) {
  let s = createBattle({ heroId, foeId, chars, pathway, boss });
  let turns = 0, charged = 0;
  while (!s.result && turns++ < 80) {
    const slot = choose(rng, s, chars, accuracy);
    const q = slot === 'power' || slot === 'special' ? answer(rng, accuracy) : 'none';
    s = heroAct(s, slot, q, chars).state;
    if (s.result) break;
    const r = foeAct(s, chars);
    if (r.events.some((e) => e.type === 'action' && e.charged)) charged++;
    s = r.state;
  }
  return { result: s.result, turns, charged };
}

// Every hero against every other toy, `rounds` times each. Returns the win rate.
export function winRate({ chars, roster, pathway, accuracy, rounds = 2, seed = 1, boss = false }) {
  const rng = new Rng(seed);
  let wins = 0, n = 0, charged = 0;
  for (let k = 0; k < rounds; k++) {
    for (const heroId of roster) for (const foeId of roster) {
      if (heroId === foeId) continue;
      const r = playBattle({ heroId, foeId, chars, pathway, accuracy, rng, boss });
      n++;
      if (r.result === 'win') wins++;
      charged += r.charged;
    }
  }
  return { rate: wins / n, battles: n, chargedPerBattle: charged / n };
}
