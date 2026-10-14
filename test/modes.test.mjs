import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS as C, ROSTER } from '../src/data/characters.js';
import { ARENAS, arenaFor } from '../src/data/arenas.js';
import { newRun, winStop, current, recordRun, defaultRecords, isValidRun } from '../src/game/modes.js';
import { createBattle, heroAct, foeAct, canAct, foeIntent } from '../src/logic/battle.js';
import { Rng } from '../src/logic/rng.js';

const ctx = (seed = 1) => { const r = new Rng(seed); return { chars: C, roster: ROSTER, rnd: () => r.next() }; };

test('story: every other toy once, on its home turf, toughest last as a giant', () => {
  for (const hero of ROSTER) {
    const run = newRun('story', hero, ctx());
    const foes = run.path.map((s) => s.foeId);
    assert.equal(foes.length, ROSTER.length - 1, hero);
    assert.ok(!foes.includes(hero));
    assert.equal(new Set(foes).size, foes.length);
    assert.ok(run.path.at(-1).boss && run.path.filter((s) => s.boss).length === 1);
    for (const s of run.path.slice(0, -1)) assert.equal(s.arenaId, arenaFor(s.foeId));
    assert.notEqual(run.path.at(-1).arenaId, 'bedroom');
    assert.ok(isValidRun(run, C));
  }
});

test('story and tournament finish; arcade keeps going with a giant every fifth fight', () => {
  for (const mode of ['story', 'tournament']) {
    let run = newRun(mode, 'rex', ctx(3));
    let guard = 0;
    while (!run.done && guard++ < 20) run = winStop(run, 2, ctx(guard));
    assert.ok(run.done, mode);
    assert.equal(run.wins, run.path.length);
    assert.equal(run.stars, run.path.length * 2);
  }
  const t = newRun('tournament', 'roo', ctx(5));
  assert.equal(t.path.length, 3);
  assert.ok(t.path[2].boss && !t.path[0].boss);
  let a = newRun('arcade', 'bass', ctx(7));
  for (let i = 0; i < 9; i++) {
    const before = current(a);
    a = winStop(a, 1, ctx(i + 10));
    assert.ok(!a.done);
    const now = current(a);
    assert.notEqual(now.foeId, before.foeId);
    assert.notEqual(now.foeId, 'bass');
    assert.ok(ARENAS[now.arenaId]);
  }
  assert.equal(a.wins, 9);
  assert.equal(a.path.filter((s) => s.boss).length, 2); // fights 5 and 10
});

test('quick uses the picked arena; records count trophies, clears and streaks', () => {
  assert.equal(current(newRun('quick', 'tree', { ...ctx(), arenaId: 'castle' })).arenaId, 'castle');
  assert.ok(ARENAS[current(newRun('quick', 'tree', ctx())).arenaId]);
  let rec = defaultRecords();
  rec = recordRun(rec, { mode: 'tournament', done: true, heroId: 'rex', wins: 3 });
  rec = recordRun(rec, { mode: 'story', done: true, heroId: 'arthur', wins: 7 });
  rec = recordRun(rec, { mode: 'arcade', done: false, heroId: 'rex', wins: 4 });
  rec = recordRun(rec, { mode: 'arcade', done: false, heroId: 'rex', wins: 2 });
  assert.deepEqual(rec, { storyCleared: { arthur: true }, trophies: 1, arcadeBest: 4 });
  assert.ok(!isValidRun({ mode: 'story', heroId: 'nobody', path: [], step: 0 }, C));
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
