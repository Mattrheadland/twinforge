// Deterministic battle simulator for balance tests (test/balance.test.mjs).
// Plays whole battles through the pure rules in logic/battle.js with a seeded RNG
// and a scripted child:
//   accuracy p   each tap on a question is right with chance p, so a question is
//                'indep' (p), 'hint' ((1−p)·p) or 'support' (the rest); buttons:
//                special when ready, guard on a visible threat half the time,
//                otherwise power (3 in 4) or quick
//   'random'     taps any button and any answer: 1 in 3 right first, then 1 in 2
// mode 'off' (learning questions off, design fix 1): power moves and specials use the
// learning-off skill input for the pathway (logic/skill-input.js) instead of a question:
//   ring    accuracy p: the tap lands spot on with chance p, else close with chance p,
//           else misses; 'random' taps at a random moment and the real judge scores it
//   cheer   always 'cheer' (it can't miss)
import { createBattle, heroAct, foeAct, canAct, foeIntent, SLOTS } from '../src/logic/battle.js';
import { Rng } from '../src/logic/rng.js';
import { offInputFor, judgeRing, RING } from '../src/logic/skill-input.js';

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

function offInput(rng, input, accuracy) {
  if (input === 'cheer') return 'cheer';
  if (accuracy === 'random') return judgeRing(350 + rng.next() * RING.beat * RING.loops, RING);
  return answer(rng, accuracy);
}

// One battle. Returns { result, turns, charged } (charged: charged attacks the foe threw).
// mode: 'on' (questions) | 'off' (learning off); input overrides the pathway's off input.
// guided: the first-session battle (logic/first-session.js).
export function playBattle({ heroId, foeId, chars, pathway, accuracy, rng, boss = false, mode = 'on', input = null, guided = false }) {
  let s = createBattle({ heroId, foeId, chars, pathway, boss, guided });
  let turns = 0, charged = 0;
  const off = mode === 'off' ? input || offInputFor(pathway) : null;
  while (!s.result && turns++ < 80) {
    const slot = choose(rng, s, chars, accuracy);
    const asks = slot === 'power' || slot === 'special';
    const q = !asks ? 'none' : off ? offInput(rng, off, accuracy) : answer(rng, accuracy);
    s = heroAct(s, slot, q, chars).state;
    if (s.result) break;
    const r = foeAct(s, chars);
    if (r.events.some((e) => e.type === 'action' && e.charged)) charged++;
    s = r.state;
  }
  return { result: s.result, turns, charged };
}

// Every hero against every other toy, `rounds` times each. Returns the win rate.
export function winRate({ chars, roster, pathway, accuracy, rounds = 2, seed = 1, boss = false, mode = 'on', input = null }) {
  const rng = new Rng(seed);
  let wins = 0, n = 0, charged = 0, turns = 0;
  for (let k = 0; k < rounds; k++) {
    for (const heroId of roster) for (const foeId of roster) {
      if (heroId === foeId) continue;
      const r = playBattle({ heroId, foeId, chars, pathway, accuracy, rng, boss, mode, input });
      n++;
      if (r.result === 'win') wins++;
      charged += r.charged;
      turns += r.turns;
    }
  }
  return { rate: wins / n, battles: n, chargedPerBattle: charged / n, turns: turns / n };
}
