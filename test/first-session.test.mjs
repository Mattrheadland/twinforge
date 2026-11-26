// Design fix 3: one tap from the title to a guided first fight that can't be lost.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS as C } from '../src/data/characters.js';
import { createBattle, heroAct, foeAct, isValidBattle, RULES } from '../src/logic/battle.js';
import { isFirstSession, FIRST_BATTLE, GUIDED, COACH } from '../src/logic/first-session.js';
import { playBattle } from './_sim.mjs';
import { Rng } from '../src/logic/rng.js';

const freshData = () => ({ battle: null, progress: { stars: 0, wins: 0, battles: 0, lastHero: null, tutorial: {} } });

test('a first session is a brand-new lone player with nothing saved', () => {
  assert.equal(isFirstSession(freshData()), true);
  assert.equal(isFirstSession(freshData(), 1), true);
  assert.equal(isFirstSession({ ...freshData(), progress: { battles: 1, wins: 0 } }), false, 'has fought (even a loss)');
  assert.equal(isFirstSession({ ...freshData(), battle: { v: 2 } }), false, 'a fight to resume comes first');
  assert.equal(isFirstSession(freshData(), 2), false, 'several players: who is playing comes first');
  assert.equal(isFirstSession(null), false);
  assert.equal(isFirstSession({ battle: null }), true, 'old saves without progress count as new');
});

test('the first fight uses real toys and every coaching line is short', () => {
  assert.ok(C[FIRST_BATTLE.heroId] && C[FIRST_BATTLE.foeId]);
  assert.notEqual(FIRST_BATTLE.heroId, FIRST_BATTLE.foeId);
  for (const [k, line] of Object.entries(COACH)) assert.ok(line.split(' ').length <= 12, k);
});

test('a guided battle: less foe health, a valid save, and a normal battle is untouched', () => {
  const { heroId, foeId } = FIRST_BATTLE;
  const g = createBattle({ heroId, foeId, chars: C, guided: true });
  const n = createBattle({ heroId, foeId, chars: C });
  assert.equal(g.guided, true);
  assert.equal(n.guided, undefined);
  assert.equal(g.foe.maxHp, Math.round(C[foeId].maxHp * RULES.stakes.early.foeHp * GUIDED.foeHp));
  assert.ok(isValidBattle(g, C));
});

test('a guided battle never charges the meter and the hero is never knocked out', () => {
  const { heroId, foeId } = FIRST_BATTLE;
  let s = createBattle({ heroId, foeId, chars: C, guided: true });
  s.hero.hp = 3;
  for (let i = 0; i < 6 && !s.result; i++) {
    const h = heroAct(s, 'power', 'support', C); // every answer needs full help
    assert.equal(h.state.foe.meter, 0);
    assert.ok(!h.events.some((e) => e.type === 'windup'));
    s = h.state;
    if (s.result) break;
    s = foeAct(s, C).state;
    assert.ok(s.hero.hp >= GUIDED.heroFloor, 'the foe gets tired first');
    assert.notEqual(s.result, 'lose');
  }
});

test('sim: a guided first fight is always won, and short, even tapping at random', (t) => {
  // measured on main after PR #15 (200 fights each, seed 5): hero turns median / longest
  //   half right 4 / 6, mostly right 3 / 5, random taps 6 / 9 (a normal first fight: 8 / 11, 6 / 9, 11 / 16)
  const { heroId, foeId } = FIRST_BATTLE;
  const med = {};
  for (const accuracy of ['random', 0.5, 0.9]) {
    const rng = new Rng(5), turns = [];
    for (let i = 0; i < 200; i++) {
      const r = playBattle({ heroId, foeId, chars: C, pathway: 'early', accuracy, rng, guided: true });
      assert.equal(r.result, 'win', `${accuracy} #${i}`);
      assert.equal(r.charged, 0);
      turns.push(r.turns);
    }
    turns.sort((a, b) => a - b);
    med[accuracy] = turns[100];
    assert.ok(turns.at(-1) <= 10, `${accuracy}: longest ${turns.at(-1)} hero turns`);
  }
  t.diagnostic(`guided median hero turns: ${JSON.stringify(med)}`);
  assert.ok(med[0.5] <= 4 && med[0.9] <= 4, 'about 3-4 exchanges for a child answering (skill 6a)');
});
