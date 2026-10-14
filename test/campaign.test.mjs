import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS as C, ROSTER, MINIONS, MINION_OF } from '../src/data/characters.js';
import { ARENAS } from '../src/data/arenas.js';
import { buildBoard, newCampaign, move, winSpace, pending, rollDie, isValidCampaign, stopFor, WORLDS } from '../src/game/campaign.js';
import { createBattle, heroAct, foeAct, canAct, foeIntent } from '../src/logic/battle.js';
import { Rng } from '../src/logic/rng.js';
import { ICON } from '../src/ui/icons.js';

test('every main character has at least one wild creature, with 4 moves and icons', () => {
  assert.ok(Object.keys(MINIONS).length >= ROSTER.length);
  for (const m of Object.values(MINIONS)) assert.ok(ROSTER.includes(m.boss), m.id);
  for (const id of ROSTER) {
    const m = C[MINION_OF[id]];
    assert.ok(m && m.minion && m.boss === id, id);
    assert.deepEqual(m.moves.map((x) => x.slot).sort(), ['guard', 'power', 'quick', 'special']);
    for (const mv of m.moves) assert.ok(ICON[mv.icon], `${m.id} ${mv.id}`);
    assert.ok(m.maxHp < 70 && m.foePower < 1, m.id);
    assert.ok(!m.foePattern.includes('charge'), 'minions never charge a special');
  }
  for (const id of Object.keys(MINIONS)) assert.ok(!ROSTER.includes(id), 'minions are not playable');
});

test('the board: worlds in order, every boss once, Czernobog giant at the end', () => {
  for (const hero of ROSTER) {
    const b = buildBoard(hero);
    assert.equal(b[0].type, 'start');
    const last = b.at(-1);
    assert.ok(last.type === 'boss' && last.final && last.giant, hero);
    assert.equal(last.foeId, hero === 'nightwing' ? 'tree' : 'nightwing');
    assert.equal(last.arena, 'haunted-forest');
    const bosses = b.filter((s) => s.type === 'boss');
    assert.equal(bosses.length, 8, hero);
    // never fight yourself: your boss slot is a giant of your own wild creature
    for (const s of b) if (s.foeId) assert.notEqual(s.foeId, hero, `${hero} fights itself`);
    assert.ok(b.some((s) => s.foeId === MINION_OF[hero] && s.giant), `${hero}: giant own minion`);
    for (const s of b) { assert.ok(ARENAS[s.arena]); if (s.foeId) assert.ok(C[s.foeId], s.foeId); }
    // each world's fights use that world's creatures
    for (const s of b.filter((x) => x.type === 'fight')) assert.ok(WORLDS[s.world].minions.includes(s.foeId));
  }
});

test('rolling: hops stop on an uncleared boss gate; fights must be won before rolling on', () => {
  const b = buildBoard('rex');
  let c = newCampaign('rex');
  const gate = b.findIndex((s) => s.type === 'boss');
  // walk up to the gate with big rolls
  let guard = 0;
  while (c.pos < gate && guard++ < 50) {
    const r = move(c, b, 3);
    c = r.campaign;
    assert.ok(r.hops.length >= 1 && r.hops.length <= 3);
    if (pending(c, b) && c.pos !== gate) c = winSpace(c, b, 1);
  }
  assert.equal(c.pos, gate, 'stopped on the gate');
  assert.ok(pending(c, b), 'the boss is waiting');
  assert.throws(() => move(c, b, 3), /fight first/);
  c = winSpace(c, b, 3);
  assert.ok(!pending(c, b));
  const r = move(c, b, 1);
  assert.equal(r.campaign.pos, gate + 1, 'past the gate after winning');
  for (let i = 0; i < 200; i++) { const d = rollDie(); assert.ok(d >= 1 && d <= 3); }
});

test('a whole campaign finishes in a sensible number of rolls; stars add up; saves validate', () => {
  for (const hero of ROSTER) {
    const rng = new Rng(hero.length * 7);
    const b = buildBoard(hero);
    let c = newCampaign(hero);
    let fights = 0, rolls = 0;
    while (!c.done && rolls < 200) {
      if (pending(c, b)) { c = winSpace(c, b, 2); fights++; continue; }
      const r = move(c, b, rollDie(() => rng.next()));
      c = r.campaign; rolls++;
    }
    assert.ok(c.done, hero);
    assert.ok(rolls >= 10 && rolls <= 40, `${hero} took ${rolls} rolls`);
    assert.ok(fights >= 8 && fights <= 24, `${hero}: ${fights} fights`);
    assert.ok(isValidCampaign(c, C));
  }
  assert.ok(!isValidCampaign({ v: 1, heroId: 'nobody', pos: 0, cleared: [] }, C));
  assert.deepEqual(stopFor({ foeId: 'frog', arena: 'bog-shack', giant: false, scale: 1.2 }), { foeId: 'frog', arenaId: 'bog-shack', boss: false, scale: 1.2 });
});

test('every hero beats every wild creature quickly, even a giant one', () => {
  for (const h of ROSTER) for (const m of Object.keys(MINIONS)) {
    for (const boss of [false, true]) {
      let s = createBattle({ heroId: h, foeId: m, chars: C, boss });
      let turns = 0;
      while (!s.result && turns++ < 40) {
        const slot = canAct(s, 'special') ? 'special' : 'power';
        s = heroAct(s, slot, 'support', C).state;
        if (!s.result) s = foeAct(s, C).state;
      }
      assert.equal(s.result, 'win', `${h} vs ${m}`);
      assert.ok(turns <= (boss ? 7 : 5), `${h} vs ${boss ? 'giant ' : ''}${m} took ${turns}`);
      void foeIntent;
    }
  }
});
