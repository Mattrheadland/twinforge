// Combat balance by pathway, proven by simulation (seeded, so every run is identical).
// The scripted child is in test/_sim.mjs: every hero against every other toy,
// answering each tap right with chance 90% or 50%, or tapping at random.
//
// Bands (what v6 promises; measured with these seeds in brackets, 396 battles a cell):
//   Early (3–5)    90%: ≥ 97% wins [100]   50%: ≥ 90% [99.7]    random: 75–97%, so it
//                  sometimes loses [91.4]  giants at 50%: ≥ 80% [96.6]
//   Growing (5–7)  90%: ≥ 95% [100]        50%: 70–97% [94.2]   random: 50–85% [67.4]
//                  giants at 50%: ≥ 50% [77.7]
// Before v6 every one of these was ~99–100%: a wrong answer cost nothing.
//   and, for both, more right answers never win less, and Early always wins at
//   least as often as Growing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS as C, ROSTER } from '../src/data/characters.js';
import { winRate } from './_sim.mjs';

const BANDS = {
  early: { 0.9: [0.97, 1], 0.5: [0.9, 1], random: [0.75, 0.97], giant50: [0.8, 1] },
  growing: { 0.9: [0.95, 1], 0.5: [0.7, 0.97], random: [0.5, 0.85], giant50: [0.5, 1] },
};
const ACC = [0.9, 0.5, 'random'];

const rates = {};
for (const pathway of Object.keys(BANDS)) {
  rates[pathway] = {};
  for (const acc of ACC) rates[pathway][acc] = winRate({ chars: C, roster: ROSTER, pathway, accuracy: acc, rounds: 3, seed: 7 }).rate;
  rates[pathway].giant50 = winRate({ chars: C, roster: ROSTER, pathway, accuracy: 0.5, rounds: 2, seed: 9, boss: true }).rate;
}
const pct = (x) => `${(x * 100).toFixed(1)}%`;

for (const [pathway, bands] of Object.entries(BANDS)) {
  test(`${pathway}: win rates stay in their bands`, (t) => {
    t.diagnostic(`${pathway}: ` + Object.entries(rates[pathway]).map(([k, v]) => `${k}=${pct(v)}`).join(' '));
    for (const [k, [lo, hi]] of Object.entries(bands)) {
      const r = rates[pathway][k];
      assert.ok(r >= lo && r <= hi, `${pathway} ${k}: ${pct(r)} not in ${pct(lo)}–${pct(hi)}`);
    }
  });
}

test('early: a child tapping at random sometimes loses, one answering half right wins most', () => {
  assert.ok(rates.early.random < 1, 'random tapping must be able to lose');
  assert.ok(rates.early[0.5] > 0.85);
});

test('more right answers never win less; Early is never harder than Growing', () => {
  for (const p of ['early', 'growing']) {
    assert.ok(rates[p][0.9] >= rates[p][0.5], p);
    assert.ok(rates[p][0.5] >= rates[p].random, p);
  }
  for (const k of [...ACC, 'giant50']) assert.ok(rates.early[k] >= rates.growing[k], String(k));
});

test('the simulation is deterministic', () => {
  const a = winRate({ chars: C, roster: ROSTER, pathway: 'growing', accuracy: 'random', rounds: 1, seed: 42 });
  const b = winRate({ chars: C, roster: ROSTER, pathway: 'growing', accuracy: 'random', rounds: 1, seed: 42 });
  assert.deepEqual(a, b);
});
