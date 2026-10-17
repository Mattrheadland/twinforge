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
  assert.deepEqual(a.progress, { ...data.progress, battles: 5, lossStreak: { foeId: 'tree', n: 1 } });
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

// ---- Phase 5 audit (directive §8): quick spam, bosses beyond health, comebacks, retry hand ----
import { pipsFor } from '../src/logic/battle.js';
import { retryHand } from '../src/logic/outcome.js';
import { winRate } from './_sim.mjs';
import { ROSTER } from '../src/data/characters.js';

test('a repeated quick is read by the foe: 4/5 then about 2/3, never less, energy still comes', () => {
  let s = fresh('early');
  const full = RULES.quick + C.rex.attackBonus;
  const hits = [];
  for (let i = 0; i < 4; i++) {
    const r = heroAct(s, 'quick', 'none', C);
    const d = r.events.find((e) => e.type === 'damage');
    hits.push(d);
    assert.ok(r.events.some((e) => e.type === 'energy' && e.gained > 0) || r.state.hero.energy === RULES.maxEnergy, 'quick still charges energy');
    s = { ...foeAct(r.state, C).state };
  }
  assert.deepEqual(hits.map((d) => d.amount), [full, Math.round(full * 0.8), Math.round(full * 0.65), Math.round(full * 0.65)]);
  assert.deepEqual(hits.map((d) => !!d.read), [false, true, true, true]);
  assert.deepEqual(RULES.quickRead, [1, 0.8, 0.65], 'capped: the floor is the last entry');
  // any other move resets it: the next quick is a full one again
  let r = heroAct(s, 'power', 'indep', C);
  s = foeAct(r.state, C).state;
  r = heroAct(s, 'quick', 'none', C);
  assert.equal(r.events.find((e) => e.type === 'damage').amount, full);
  assert.equal(r.events.find((e) => e.type === 'damage').read, false);
});

test('quick spam alone loses; quick mixed into real play still wins (test/_sim.mjs scripted child)', () => {
  const spam = winRate({ chars: C, roster: ROSTER, pathway: 'early', accuracy: 'random', rounds: 1, seed: 3 });
  assert.ok(spam.rate > 0.75, 'a random tapper (uses every button) still wins most of the time');
  let s = fresh('early'), turns = 0;
  while (!s.result && turns++ < 80) { s = heroAct(s, 'quick', 'none', C).state; if (!s.result) s = foeAct(s, C).state; }
  assert.equal(s.result, 'lose', 'only ever tapping quick does not beat a toy');
});

test('a giant is harder by behaviour, not only health: smaller meter, heavier charged hit', () => {
  const plain = fresh('early'), giant = fresh('early', { boss: true });
  assert.equal(pipsFor(plain), RULES.stakes.early.pips);
  assert.equal(pipsFor(giant), RULES.stakes.early.pips - RULES.boss.pipsLess);
  assert.ok(pipsFor(fresh('growing', { boss: true })) >= RULES.boss.minPips, 'never below the floor');
  assert.equal(meterOf(giant).max, pipsFor(giant));
  // fill the meter and compare the charged hit
  const hit = (s0) => {
    let s = s0;
    while (!s.foe.windup) s = foeAct(heroAct(s, 'power', 'support', C).state, C).state;
    let d = null, guard = 0;
    while (!d && guard++ < 6) { // the move right after the wind-up is a normal one; a 'charge' in the pattern does not attack
      const r = foeAct(heroAct(s, 'quick', 'none', C).state, C);
      d = r.events.find((e) => e.type === 'damage' && e.target === 'hero' && e.charged);
      s = r.state;
    }
    assert.ok(d, 'the charged attack landed');
    return d.amount;
  };
  assert.ok(hit(giant) > hit(plain), 'the giant\'s charged hit is heavier');
  assert.ok(RULES.boss.chargedPower <= 1.25, 'capped');
});

test('second wind: once a battle, at low health, +1 energy and one pip off the meter; never a rescue', () => {
  let s = fresh('early');
  s.hero.hp = Math.floor(s.hero.maxHp * 0.3) + 3; // one plain hit drops under 30%
  s.foe.meter = 2;
  s.turn = 'foe';
  let r = foeAct(s, C);
  const sw = r.events.find((e) => e.type === 'secondwind');
  assert.ok(sw, 'second wind fired');
  assert.ok(r.events.find((e) => e.type === 'damage' && e.target === 'hero').amount > 0, 'the hit still landed');
  assert.equal(r.state.hero.energy, 1);
  assert.equal(r.state.foe.meter, 1);
  assert.ok(r.events.some((e) => e.type === 'meter' && e.reason === 'secondwind'));
  // only once: drop further and nothing more happens
  let s2 = { ...r.state, turn: 'foe' };
  s2.hero.hp = 5; s2.hero.guard = null; s2.hero.shield = false;
  r = foeAct(s2, C);
  assert.ok(!r.events.some((e) => e.type === 'secondwind'), 'does not repeat');
  // a knockout is a knockout: no second wind on the hit that ends it
  let s3 = fresh('early'); s3.hero.hp = 3; s3.turn = 'foe';
  r = foeAct(s3, C);
  assert.equal(r.state.result, 'lose');
  assert.ok(!r.events.some((e) => e.type === 'secondwind'));
  // a shown wind-up stays shown
  let s4 = fresh('early'); s4.hero.hp = Math.floor(s4.hero.maxHp * 0.3) + 3; s4.foe.meter = 3; s4.foe.windup = true; s4.foe.windupFresh = true; s4.turn = 'foe';
  r = foeAct(s4, C);
  assert.ok(r.state.foe.windup && r.state.foe.meter === 3, 'second wind never cancels a wind-up the child was warned about');
});

test('retry hand: from the third try against the same foe a retry starts with 1 energy, never more; a win clears it', () => {
  const data = { progress: { battles: 0 }, player: { xp: 0, level: 1 } };
  const lost = { ...fresh('early'), result: 'lose' };
  let p = settleBattle(data, lost).progress;
  assert.equal(retryHand(p, 'tree'), 0, 'first defeat: no help');
  p = settleBattle({ ...data, progress: p }, lost).progress;
  assert.equal(p.lossStreak.n, 2);
  assert.equal(retryHand(p, 'tree'), 1, 'two defeats in a row: the next try starts with 1 energy');
  assert.equal(retryHand(p, 'rockfish'), 0, 'only against that foe');
  for (let i = 0; i < 5; i++) p = settleBattle({ ...data, progress: p }, lost).progress;
  assert.equal(retryHand(p, 'tree'), RULES.retryHand.energy, 'capped: it never grows');
  const rb = retryBattle(lost, C, p);
  assert.equal(rb.hero.energy, 1);
  assert.equal(rb.hero.hp, rb.hero.maxHp);
  assert.equal(rb.foe.maxHp, lost.foe.maxHp, 'the foe is not made smaller');
  assert.equal(retryBattle(lost, C, null).hero.energy, 0, 'no streak, no hand');
  // a different foe's defeat restarts the count; a win clears it
  p = settleBattle({ ...data, progress: p }, { ...fresh('early', { foeId: 'rockfish' }), result: 'lose' }).progress;
  assert.deepEqual(p.lossStreak, { foeId: 'rockfish', n: 1 });
  p = settleBattle({ ...data, progress: p }, { ...fresh('early'), result: 'win' }).progress;
  assert.equal(p.lossStreak, undefined);
  assert.equal(retryHand(p, 'rockfish'), 0);
  // the hand never pushes a toy's own starting energy past the cap
  const kitted = { ...C, rex: { ...C.rex, startEnergy: 2 } };
  assert.equal(createBattle({ heroId: 'rex', foeId: 'tree', chars: kitted, startEnergy: 1 }).hero.energy, RULES.maxEnergy - 1);
});
