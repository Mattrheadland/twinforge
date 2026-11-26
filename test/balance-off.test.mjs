// Learning OFF is a fair battle mode, not an easy one (design fix 1). Before the fix, a
// learning-off attack hit for nearly a perfect answer's damage and never lit the foe's
// meter: learning off won 100% of fights in the sim, giants included, so it worked as
// a cheat button. Now both modes share one damage formula (logic/battle.js) and the
// same foe meter; learning off uses a skill input (logic/skill-input.js):
//   Growing (5-7)  timing ring: plays exactly like answering at the same accuracy
//   Early (3-5)    cheer tap: no timing, a modest bonus, the foe gets braver on its own
// Measured with these seeds (396 battles a cell; giants 264):
//   learning on  early  90% 100 | 50% 99.7 | random 93.2 | giants at 50% 83.7
//                growing 90% 100 | 50% 95.2 | random 68.9 | giants at 50% 67.4
//   learning off early (cheer)  100 | giants 87.1 | random buttons 98.5, about 8.3 turns
//                growing (ring) 90% 100 | 50% 95.2 | random 48.0 | giants at 50% 67.4
//                growing, timing switched off (cheer) giants 68.9
import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS as C, ROSTER } from '../src/data/characters.js';
import { RULES, hitFor } from '../src/logic/battle.js';
import { offInputFor, judgeRing, RING } from '../src/logic/skill-input.js';
import { winRate } from './_sim.mjs';

const on = (pathway, accuracy, boss = false) =>
  winRate({ chars: C, roster: ROSTER, pathway, accuracy, rounds: boss ? 2 : 3, seed: boss ? 9 : 7, boss });
const off = (pathway, accuracy, boss = false, input = null) =>
  winRate({ chars: C, roster: ROSTER, pathway, accuracy, rounds: boss ? 2 : 3, seed: boss ? 9 : 7, boss, mode: 'off', input });
const pct = (x) => `${(x * 100).toFixed(1)}%`;

test('one damage formula: no input hits for the base, never more than a wrong answer', () => {
  for (const slot of ['power', 'special']) {
    assert.equal(hitFor(slot, 'none'), RULES.base[slot]);
    assert.equal(hitFor(slot, 'support'), RULES.base[slot], 'a wrong answer still hits for the full base');
    assert.ok(hitFor(slot, 'indep') > hitFor(slot, 'hint') && hitFor(slot, 'hint') > hitFor(slot, 'none'));
    assert.ok(hitFor(slot, 'indep') <= Math.round(RULES.base[slot] * 1.5), 'the top bonus stays near 1.5x');
    assert.equal(hitFor(slot, 'cheer'), hitFor(slot, 'hint'), 'a cheer is a modest bonus, never the top one');
  }
});

test('each pathway gets the right learning-off input', () => {
  assert.equal(offInputFor('early'), 'cheer');
  assert.equal(offInputFor('growing'), 'ring');
  assert.equal(offInputFor('growing', { timing: false }), 'cheer');
  assert.equal(offInputFor(undefined), 'cheer');
});

test('the timing ring is generous and scores the closest landing', () => {
  assert.equal(judgeRing(RING.beat), 'indep');
  assert.equal(judgeRing(RING.beat * 2 + RING.perfect), 'indep');
  assert.equal(judgeRing(RING.beat - RING.close), 'hint');
  assert.equal(judgeRing(RING.beat * 1.5), 'support', 'halfway between landings misses');
  assert.equal(judgeRing(100), 'support', 'a tap carried over from the move button never scores');
  assert.equal(judgeRing(null), 'support', 'no tap is the base hit, never a miss of the attack');
  assert.equal(judgeRing(RING.beat * (RING.loops + 1)), 'support');
});

test('growing: learning off with the ring is never easier than answering, and can be lost', (t) => {
  const rows = [];
  for (const acc of [0.9, 0.5, 'random']) {
    const a = on('growing', acc).rate, b = off('growing', acc).rate;
    rows.push(`${acc}: on ${pct(a)} off ${pct(b)}`);
    assert.ok(b <= a + 0.02, `off ${pct(b)} beats on ${pct(a)} at ${acc}`);
  }
  const gOn = on('growing', 0.5, true).rate, gOff = off('growing', 0.5, true).rate;
  rows.push(`giants at 50%: on ${pct(gOn)} off ${pct(gOff)}`);
  t.diagnostic(rows.join(' | '));
  assert.ok(gOff <= gOn + 0.02);
  assert.ok(off('growing', 0.9).rate >= 0.95, 'a skilled tapper still wins nearly every fight');
  assert.ok(off('growing', 'random').rate < 0.85, 'random tapping loses some fights');
});

test('cheer tap (Early, or timing switched off) plays like a child answering half right, never like a perfect one', (t) => {
  const rows = [];
  for (const pathway of ['early', 'growing']) {
    const cheerGiant = off(pathway, 0.5, true, 'cheer').rate;
    const onGiant = on(pathway, 0.5, true).rate;
    const cheer = off(pathway, 0.9, false, 'cheer');
    const best = on(pathway, 0.9);
    rows.push(`${pathway}: cheer ${pct(cheer.rate)} in ${cheer.turns.toFixed(1)} turns, giants ${pct(cheerGiant)} | on 90% in ${best.turns.toFixed(1)} turns, on 50% giants ${pct(onGiant)}`);
    assert.ok(cheerGiant < 1, `${pathway}: cheer can lose to a giant`);
    assert.ok(cheerGiant <= onGiant + 0.05, `${pathway}: cheer giants ${pct(cheerGiant)} vs answering half right ${pct(onGiant)}`);
    assert.ok(cheer.turns > best.turns, `${pathway}: right answers win faster than cheering`);
  }
  t.diagnostic(rows.join(' | '));
  assert.ok(off('early', 0.9, false, 'cheer').rate >= 0.97, 'the youngest still win nearly every normal fight');
});

test('before the fix learning off never lost; now no learning-off giant fight is a sure win', () => {
  for (const pathway of ['early', 'growing']) assert.ok(off(pathway, 0.5, true).rate < 1, pathway);
});
