// v6 stakes: the foe's charge meter, the charged attack, real defeat and retry.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS as C } from '../src/data/characters.js';
import { createBattle, heroAct, foeAct, canAct, RULES, stakesFor, meterOf, isValidBattle, PATHWAY_DEFAULT } from '../src/logic/battle.js';
import { settleBattle, retryStop, retryBattle } from '../src/logic/outcome.js';
import { PATHWAYS } from '../src/save.js';

const fresh = (pathway = 'early', o = {}) => createBattle({ heroId: 'rex', foeId: 'tree', chars: C, pathway, ...o });
const kinds = (events) => events.map((e) => e.type);

test('every pathway has a stakes table; Early is gentler than Growing', () => {
  for (const p of PATHWAYS) {
    const st = RULES.stakes[p];
    assert.ok(st, p);
    for (const k of ['pips', 'perWrong', 'drain', 'chargedHit', 'foePower', 'foeHp']) assert.ok(Number.isFinite(st[k]) && st[k] > 0, `${p}.${k}`);
  }
  const { early: e, growing: g } = RULES.stakes;
  assert.ok(e.pips / e.perWrong > g.pips / g.perWrong, 'Early charges slower (more wrong taps to fill)');
  assert.ok(e.chargedHit * e.foePower < g.chargedHit * g.foePower, 'Early charged hit is smaller');
  assert.ok(e.foePower < g.foePower, 'Early foe hits softer');
  assert.equal(g.foePower, 1, 'Growing keeps the pre-v6 foe damage');
});

test('a battle remembers its pathway; unknown or missing means Early', () => {
  assert.equal(fresh('growing').pathway, 'growing');
  assert.equal(createBattle({ heroId: 'rex', foeId: 'tree', chars: C }).pathway, PATHWAY_DEFAULT);
  assert.equal(fresh('nonsense').pathway, 'early');
  assert.equal(PATHWAY_DEFAULT, 'early');
  const s = fresh('growing');
  assert.equal(s.foe.maxHp, Math.round(C.tree.maxHp * RULES.stakes.growing.foeHp));
  assert.deepEqual(meterOf(s), { meter: 0, max: RULES.stakes.growing.pips, windup: false });
});

test('a wrong tap still lands the hit, and charges the foe', () => {
  for (const [q, wrong] of [['hint', 1], ['support', 2]]) {
    const s0 = fresh('early');
    const { state, events } = heroAct(s0, 'power', q, C);
    const dmg = events.find((e) => e.type === 'damage');
    assert.equal(dmg.amount, RULES.power[q] + C.rex.attackBonus, 'never a miss');
    const m = events.find((e) => e.type === 'meter');
    assert.deepEqual(m, { type: 'meter', target: 'foe', meter: wrong, max: 3, delta: wrong, reason: 'wrong' });
    assert.equal(state.foe.meter, wrong);
    assert.equal(state.foe.windup, false);
  }
});

test('a first-try answer drains the meter, never below empty', () => {
  let s = fresh('early');
  s.foe.meter = 2;
  let r = heroAct(s, 'power', 'indep', C);
  assert.equal(r.state.foe.meter, 1);
  assert.deepEqual(r.events.find((e) => e.type === 'meter'), { type: 'meter', target: 'foe', meter: 1, max: 3, delta: -1, reason: 'drain' });
  s = fresh('early');
  r = heroAct(s, 'power', 'indep', C);
  assert.equal(r.state.foe.meter, 0);
  assert.ok(!kinds(r.events).includes('meter'), 'no event when nothing changes');
});

test('moves without a question never touch the meter', () => {
  let s = fresh('early');
  s.foe.meter = 2;
  for (const slot of ['quick', 'guard']) {
    const r = heroAct({ ...s, hero: { ...s.hero, lastSlot: null } }, slot, 'none', C);
    assert.equal(r.state.foe.meter, 2, slot);
    assert.ok(!kinds(r.events).includes('meter'), slot);
  }
  const r = heroAct(s, 'power', 'none', C); // Learning off
  assert.equal(r.state.foe.meter, 2);
});

test('filling the meter makes the foe wind up; after one more hero turn its attack is charged, then the meter empties', () => {
  for (const pathway of ['early', 'growing']) {
    const st = stakesFor({ pathway });
    let s = fresh(pathway);
    s.foe.meter = st.pips - 1;
    const r = heroAct(s, 'power', 'hint', C);
    assert.deepEqual(kinds(r.events).slice(-2), ['meter', 'windup'], pathway);
    assert.equal(r.state.foe.windup, true);
    assert.equal(meterOf(r.state).windup, true);

    // the foe's move right away is a normal one: the child gets a turn to react
    s = r.state;
    s.foe.step = 0; // Spooky Tree: quick, charge, slam, power
    const first = foeAct(s, C);
    assert.equal(first.events.find((e) => e.type === 'action').charged, false, pathway);
    assert.equal(first.state.foe.windup, true);
    assert.equal(first.state.foe.meter, st.pips);

    // more wrong taps while winding up change nothing
    const again = heroAct(first.state, 'power', 'support', C);
    assert.equal(again.state.foe.meter, st.pips);
    assert.ok(!kinds(again.events).includes('meter'));

    s = heroAct(first.state, 'quick', 'none', C).state;
    s.foe.step = 0; // a quick hit (8) becomes the charged attack
    const hp0 = s.hero.hp;
    const f = foeAct(s, C);
    const act = f.events.find((e) => e.type === 'action');
    const dmg = f.events.find((e) => e.type === 'damage' && e.target === 'hero');
    assert.equal(act.charged, true);
    assert.equal(dmg.charged, true);
    assert.equal(dmg.big, true);
    const expected = Math.round(Math.max(RULES.foe.quick, st.chargedHit) * (C.tree.foePower || 1) * st.foePower);
    assert.equal(dmg.amount, expected, pathway);
    assert.equal(f.state.hero.hp, hp0 - expected);
    assert.equal(f.state.foe.meter, 0);
    assert.equal(f.state.foe.windup, false);
    assert.deepEqual(f.events.find((e) => e.type === 'meter'), { type: 'meter', target: 'foe', meter: 0, max: st.pips, delta: 0, reason: 'release' });
  }
});

test('a plain attack is not charged, and Early foes hit softer than Growing ones', () => {
  const hit = (pathway) => {
    const s = fresh(pathway);
    s.turn = 'foe';
    const f = foeAct(s, C);
    assert.equal(f.events.find((e) => e.type === 'action').charged, false);
    return f.events.find((e) => e.type === 'damage').amount;
  };
  assert.equal(hit('growing'), RULES.foe.quick);
  assert.ok(hit('early') < hit('growing'));
});

test('a guard blocks or dodges the charged attack and earns the perfect bonus', () => {
  // Rex blocks; Spooky Tree's quick is the charged hit
  let s = fresh('growing');
  s.foe.windup = true;
  s.foe.meter = stakesFor(s).pips;
  s = heroAct(s, 'guard', 'none', C).state;
  s.foe.step = 0;
  const f = foeAct(s, C);
  const dmg = f.events.find((e) => e.type === 'damage');
  assert.equal(dmg.blocked, true);
  assert.equal(dmg.perfect, true);
  assert.equal(dmg.amount, Math.max(1, Math.round(RULES.stakes.growing.chargedHit * RULES.guardFactor)));
  assert.ok(f.events.some((e) => e.type === 'energy' && e.reason === 'perfect'));
  assert.equal(f.state.foe.windup, false, 'a blocked charge is still used up');
});

test('a wind-up waits through a dizzy or charging turn for the next real attack', () => {
  let s = fresh('early');
  s.foe.windup = true;
  s.foe.meter = 3;
  s.foe.dizzy = true;
  s.turn = 'foe';
  let f = foeAct(s, C);
  assert.equal(f.events.find((e) => e.type === 'action').action, 'dizzy');
  assert.equal(f.state.foe.windup, true);
  s = f.state;
  s.turn = 'foe';
  s.foe.step = 1; // Spooky Tree's pattern: quick, CHARGE, slam, power
  f = foeAct(s, C);
  assert.equal(f.events.find((e) => e.type === 'action').action, 'charge');
  assert.equal(f.state.foe.windup, true);
  s = f.state;
  s.turn = 'foe';
  f = foeAct(s, C);
  const act = f.events.find((e) => e.type === 'action');
  assert.equal(act.action, 'slam');
  assert.equal(act.charged, true);
  const st = RULES.stakes.early;
  assert.equal(f.events.find((e) => e.type === 'damage').amount, Math.round(Math.max(RULES.foe.slam, st.chargedHit) * st.foePower));
});

test('a battle saved before v6 (no meter, no pathway) still plays', () => {
  const s = fresh('early');
  delete s.pathway;
  delete s.foe.meter;
  delete s.foe.windup;
  assert.ok(isValidBattle(s, C));
  assert.deepEqual(meterOf(s), { meter: 0, max: RULES.stakes.early.pips, windup: false });
  const r = heroAct(s, 'power', 'support', C);
  assert.equal(r.state.foe.meter, 2);
  assert.ok(foeAct(r.state, C).state);
});

test('health 0 is a real defeat: no rescue, no more moves', () => {
  let s = fresh('growing');
  s.hero.hp = 5;
  s.turn = 'foe';
  const f = foeAct(s, C);
  assert.equal(f.state.hero.hp, 0);
  assert.equal(f.state.result, 'lose');
  assert.ok(f.events.some((e) => e.type === 'ko' && e.target === 'hero'));
  for (const k of ['quick', 'power', 'guard', 'special']) assert.equal(canAct(f.state, k), false);
  assert.throws(() => heroAct(f.state, 'quick', 'none', C));
  assert.throws(() => foeAct({ ...f.state, turn: 'foe' }, C));
});

test('losing never takes stars, XP or levels; winning adds them', () => {
  const data = { progress: { battles: 4, wins: 3, stars: 9, tutorial: { power: true } }, player: { xp: 260, level: 4 } };
  const lost = { ...fresh('early'), result: 'lose' };
  const a = settleBattle(data, lost);
  assert.equal(a.stars, 0);
  assert.deepEqual(a.player, data.player);
  assert.deepEqual(a.progress, { ...data.progress, battles: 5 });
  assert.equal(a.progress.tutorial, data.progress.tutorial);
  assert.equal(data.progress.battles, 4, 'pure: the input is not changed');

  const won = { ...fresh('early'), result: 'win' };
  const b = settleBattle(data, won);
  assert.equal(b.stars, 3);
  assert.equal(b.progress.stars, 12);
  assert.equal(b.progress.wins, 4);
  assert.ok(b.player.xp > data.player.xp && b.player.level >= data.player.level);
});

test('a retry is the same fight from the top: full health, empty meter, same place', () => {
  let s = createBattle({ heroId: 'rex', foeId: 'nightwing', chars: C, arenaId: 'haunted-forest', boss: true, pathway: 'growing' });
  Object.assign(s, { from: 'campaign', at: 17, foeScale: 1.6 });
  s.hero.hp = 0;
  s.foe.hp = 12;
  s.foe.meter = 2;
  s.foe.windup = true;
  s.result = 'lose';
  assert.deepEqual(retryStop(s), { foeId: 'nightwing', arenaId: 'haunted-forest', boss: true, scale: 1.6, kind: 'campaign', at: 17, mode: null });
  const r = retryBattle(s, C);
  assert.equal(r.result, null);
  assert.equal(r.turn, 'hero');
  assert.equal(r.hero.hp, r.hero.maxHp);
  assert.equal(r.foe.hp, r.foe.maxHp);
  assert.equal(r.foe.maxHp, s.foe.maxHp, 'same giant');
  assert.deepEqual(meterOf(r), { meter: 0, max: RULES.stakes.growing.pips, windup: false });
  assert.equal(r.arenaId, 'haunted-forest');
  assert.equal(r.pathway, 'growing');
  const run = { ...s, from: 'run', runMode: 'tournament', at: undefined };
  assert.equal(retryStop(run).kind, 'run');
  assert.equal(retryStop(run).mode, 'tournament');
});
