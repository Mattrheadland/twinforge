import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS as C, ROSTER } from '../src/data/characters.js';
import { ARENAS, arenaFor } from '../src/data/arenas.js';
import { newRun, winStop, current, recordRun, defaultRecords, isValidRun } from '../src/game/modes.js';
import { createBattle, heroAct, foeAct, canAct, foeIntent } from '../src/logic/battle.js';
import { Rng } from '../src/logic/rng.js';

const ctx = (seed = 1) => { const r = new Rng(seed); return { chars: C, roster: ROSTER, rnd: () => r.next() }; };

test('tournament: every other toy once, on its home turf, toughest last as a giant', () => {
  for (const hero of ROSTER) {
    const run = newRun('tournament', hero, ctx());
    const foes = run.path.map((s) => s.foeId);
    assert.equal(foes.length, ROSTER.length - 1, hero);
    assert.ok(!foes.includes(hero));
    assert.equal(new Set(foes).size, foes.length);
    assert.ok(run.path.at(-1).boss && run.path.filter((s) => s.boss).length === 1);
    assert.equal(run.path.at(-1).foeId, hero === 'nightwing' ? 'tree' : 'nightwing');
    for (const s of run.path.slice(0, -1)) assert.equal(s.arenaId, arenaFor(s.foeId));
    assert.notEqual(run.path.at(-1).arenaId, 'bedroom');
    assert.ok(isValidRun(run, C));
    let r = run;
    while (!r.done) r = winStop(r, 2);
    assert.equal(r.wins, ROSTER.length - 1);
  }
});

test('arcade: the picked opponent and arena, or a surprise; never yourself', () => {
  const a = newRun('arcade', 'tree', { ...ctx(), foeId: 'bass', arenaId: 'castle' });
  assert.deepEqual(current(a), { foeId: 'bass', arenaId: 'castle', boss: false });
  for (let i = 0; i < 30; i++) {
    const s = current(newRun('arcade', 'rex', ctx(i)));
    assert.notEqual(s.foeId, 'rex');
    assert.ok(ROSTER.includes(s.foeId) && ARENAS[s.arenaId]);
  }
  assert.notEqual(current(newRun('arcade', 'rex', { ...ctx(), foeId: 'rex' })).foeId, 'rex');
  assert.ok(winStop(a, 1).done);
});

test('records count trophies, arcade wins and campaign clears', () => {
  let rec = defaultRecords();
  rec = recordRun(rec, { mode: 'tournament', done: true, heroId: 'rex' });
  rec = recordRun(rec, { mode: 'arcade', done: true, heroId: 'rex' });
  rec = recordRun(rec, { mode: 'arcade', done: false, heroId: 'rex' });
  rec = recordRun(rec, { mode: 'campaign', done: true, heroId: 'arthur' });
  assert.deepEqual(rec, { campaignCleared: { arthur: true }, trophies: 1, arcadeWins: 1 });
  assert.ok(!isValidRun({ mode: 'story', heroId: 'rex', path: [{ foeId: 'tree', arenaId: 'castle' }], step: 0 }, C), 'old modes are dropped');
});

test('a giant foe has more health and can still be beaten by every hero', () => {
  for (const h of ROSTER) for (const f of ROSTER) {
    if (h === f) continue;
    let s = createBattle({ heroId: h, foeId: f, chars: C, arenaId: 'castle', boss: true });
    assert.ok(s.foe.maxHp > C[f].maxHp && s.boss && s.arenaId === 'castle');
    let turns = 0;
    while (!s.result && turns++ < 80) {
      const intent = foeIntent({ ...s, turn: 'foe' }, C);
      const slot = canAct(s, 'special') ? 'special' : intent === 'slam' ? 'guard' : 'power';
      s = heroAct(s, slot, slot === 'guard' ? 'none' : 'support', C).state;
      if (!s.result) s = foeAct(s, C).state;
    }
    assert.equal(s.result, 'win', `${h} vs giant ${f}`);
  }
});
