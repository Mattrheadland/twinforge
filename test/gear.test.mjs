// v6 Phase 4: per-toy XP, evolutions, armor and move loadouts (src/logic/gear.js) and how the
// battle rules use them (src/logic/battle.js). Balance of every choice is checked with the same
// seeded simulator as test/balance.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS as C, ROSTER } from '../src/data/characters.js';
import {
  toyXpForLevel, toyLevelForXp, toyProgress, TOY_MAX_LEVEL, EVOLUTIONS, evolutionFor, ARMORS, ARMOR_ORDER, STYLES, SLOT_ORDER,
  unlocks, hasChoices, normalizeKit, kitDef, kitChars, awardToyXp, nextUnlock, defaultKit, formsUnlocked,
} from '../src/logic/gear.js';
import { createBattle, heroAct, foeAct, canAct, moveFor, RULES } from '../src/logic/battle.js';
import { xpForWin, XP } from '../src/logic/progression.js';
import { migrate } from '../src/save.js';
import { winRate } from './_sim.mjs';

const at = (level) => ({ xp: toyXpForLevel(level), level });
const kit = (armor = 'classic', moves = {}) => ({ armor, moves: { ...defaultKit().moves, ...moves }, form: null });

test('toy XP curve: strictly rising, inverse is exact, capped at 100', () => {
  for (let n = 1; n < TOY_MAX_LEVEL; n++) {
    assert.ok(toyXpForLevel(n + 1) > toyXpForLevel(n));
    assert.equal(toyLevelForXp(toyXpForLevel(n)), n);
    assert.equal(toyLevelForXp(toyXpForLevel(n + 1) - 1), n);
  }
  assert.equal(toyLevelForXp(1e12), TOY_MAX_LEVEL);
  assert.equal(toyLevelForXp(-5), 1);
  assert.equal(toyLevelForXp('junk'), 1);
  const p = toyProgress(toyXpForLevel(7) + 10);
  assert.deepEqual([p.level, p.into], [7, 10]);
  assert.equal(toyProgress(1e12).max, true);
});

test('pacing: evolutions take real play with one toy, not a few questions (directive §6–7)', (t) => {
  const perWin = xpForWin(2) + 3 * XP.indep; // a won battle with three first-try answers
  const battles = EVOLUTIONS.slice(1).map((e) => [e.name, e.level, Math.ceil(toyXpForLevel(e.level) / perWin)]);
  t.diagnostic('battles with one toy (~' + perWin + ' XP each): ' + battles.map(([n, l, b]) => `${n} (lv ${l}) ≈ ${b}`).join(', '));
  const [e1, e2, e3] = battles.map((b) => b[2]);
  assert.ok(e1 >= 15 && e1 <= 45, `Evolution I after ${e1} battles`);
  assert.ok(e2 >= 80 && e2 <= 220, `Evolution II after ${e2} battles`);
  assert.ok(e3 >= 250 && e3 <= 700, `Ultimate after ${e3} battles`);
  assert.deepEqual(EVOLUTIONS.map((e) => e.level), [1, 15, 35, 65]); // the directive's provisional milestones
});

test('evolutions and forms unlock at 15 / 35 / 65 and earlier looks stay available', () => {
  assert.equal(evolutionFor(14).tier, 0);
  assert.equal(evolutionFor(15).tier, 1);
  assert.equal(evolutionFor(64).tier, 2);
  assert.equal(evolutionFor(100).tier, 3);
  assert.deepEqual(formsUnlocked(40), [0, 1, 2]);
});

test('unlocks grow with toy level; a new toy has nothing to choose', () => {
  const u1 = unlocks({});
  assert.deepEqual(u1.armors, ['classic']);
  for (const slot of SLOT_ORDER) assert.deepEqual(u1.styles[slot], ['signature']);
  assert.equal(hasChoices({}), false);
  assert.equal(hasChoices(at(5)), true); // ZIPPY quick
  const u35 = unlocks(at(35));
  assert.deepEqual(u35.armors, ['classic', 'tough', 'swift', 'mighty']);
  assert.ok(u35.styles.special.includes('superSpecial'));
  assert.equal(unlocks(at(100)).armors.length, ARMOR_ORDER.length);
  assert.deepEqual(nextUnlock({}), { level: 5, kind: 'move', slot: 'quick', name: 'ZIPPY' });
  assert.equal(nextUnlock(at(100)), null);
});

test('normalizeKit: locked or unknown choices fall back; good ones stay', () => {
  const k = normalizeKit({ armor: 'legend', moves: { quick: 'zippy', power: 'heavy', guard: 'nope', special: 'superSpecial' }, form: 3 }, at(12));
  assert.equal(k.armor, 'classic'); // legend is level 65
  assert.equal(k.moves.quick, 'zippy');
  assert.equal(k.moves.power, 'heavy');
  assert.equal(k.moves.guard, 'signature');
  assert.equal(k.moves.special, 'signature');
  assert.equal(k.form, null);
  assert.deepEqual(normalizeKit('garbage', {}), defaultKit());
  assert.equal(normalizeKit({ form: 1 }, at(40)).form, 1);
});

test('kitDef: armor numbers, styled moves keep the toy\'s own animation, ids and art untouched', () => {
  const base = C.rex;
  const d = kitDef(base, kit('tough', { quick: 'zippy', special: 'superSpecial' }), at(40));
  assert.equal(d.id, 'rex');
  assert.equal(d.art, base.art);
  assert.equal(d.maxHp, Math.round(base.maxHp * ARMORS.tough.hp));
  assert.equal(d.attackBonus, base.attackBonus + ARMORS.tough.attack);
  const q = moveFor(d, 'quick'), sp = moveFor(d, 'special');
  assert.equal(q.id, moveFor(base, 'quick').id);
  assert.equal(q.anim, moveFor(base, 'quick').anim);
  assert.equal(q.tag, 'ZIPPY');
  assert.equal(q.quickDmg, 8);
  assert.equal(sp.id, 'rexCannon');
  assert.ok(sp.power > moveFor(base, 'special').power);
  assert.deepEqual(d.evolution.tier, 2);
  // the plain toy is never mutated
  assert.equal(moveFor(C.rex, 'quick').tag, undefined);
  // a SUPER special drops its extra trick (Spooky Tree's dizzy)
  assert.equal(moveFor(kitDef(C.tree, kit('classic', { special: 'superSpecial' }), at(40)), 'special').effect, undefined);
  assert.equal(moveFor(C.tree, 'special').effect, 'dizzy');
  // kitChars swaps only the hero
  const chars = kitChars(C, 'rex', kit('tough'), at(10));
  assert.notEqual(chars.rex, C.rex);
  assert.equal(chars.tree, C.tree);
});

test('a classic kit plays exactly like the plain toy', () => {
  for (const id of ROSTER) {
    const d = kitDef(C[id], defaultKit(), {});
    assert.equal(d.maxHp, C[id].maxHp);
    assert.equal(d.attackBonus, C[id].attackBonus || 0);
    assert.deepEqual(d.moves, C[id].moves);
  }
});

const battleWith = (k, rec = at(100), foeId = 'tree') => {
  const chars = kitChars(C, 'rex', k, rec);
  return { chars, s: createBattle({ heroId: 'rex', foeId, chars, pathway: 'growing' }) };
};

test('battle: ZIPPY quick hits for 8 + bonus and fills two pips', () => {
  const { chars, s } = battleWith(kit('classic', { quick: 'zippy' }));
  const { state, events } = heroAct(s, 'quick', 'none', chars);
  assert.equal(events.find((e) => e.type === 'damage').amount, 8 + C.rex.attackBonus);
  assert.equal(state.hero.energy, 2);
});

test('battle: HEAVY power rewards first-try answers, costs on hints', () => {
  const { chars, s } = battleWith(kit('classic', { power: 'heavy' }));
  const hit = (q) => heroAct(s, 'power', q, chars).events.find((e) => e.type === 'damage').amount;
  assert.equal(hit('indep'), RULES.power.indep + 6 + C.rex.attackBonus);
  assert.equal(hit('hint'), RULES.power.hint - 3 + C.rex.attackBonus);
});

test('battle: HEAL power heals the hero, never above max', () => {
  const { chars, s } = battleWith(kit('classic', { power: 'healing' }));
  s.hero.hp = 40;
  const r = heroAct(s, 'power', 'indep', chars);
  assert.equal(r.state.hero.hp, 49);
  assert.ok(r.events.some((e) => e.type === 'heal' && e.amount === 9));
  const full = battleWith(kit('classic', { power: 'healing' }));
  assert.ok(!heroAct(full.s, 'power', 'indep', full.chars).events.some((e) => e.type === 'heal'));
});

test('battle: COUNTER guard blocks less but always strikes back', () => {
  const { chars, s } = battleWith(kit('classic', { guard: 'counter' }));
  const g = heroAct(s, 'guard', 'none', chars).state;
  assert.equal(g.hero.guard, 'reflect');
  const r = foeAct(g, chars);
  const toHero = r.events.find((e) => e.type === 'damage' && e.target === 'hero');
  const back = r.events.find((e) => e.type === 'damage' && e.target === 'foe');
  assert.ok(toHero.blocked);
  assert.equal(back.amount, 9);
  assert.equal(r.state.hero.guardFactor, null); // cleared after the foe's move
});

test('battle: FAST special is ready at two pips and keeps the leftover', () => {
  const { chars, s } = battleWith(kit('classic', { special: 'quickSpecial' }));
  assert.equal(s.hero.specialCost, 2);
  s.hero.energy = 1;
  assert.equal(canAct(s, 'special'), false);
  s.hero.energy = 3;
  assert.equal(canAct(s, 'special'), true);
  const r = heroAct(s, 'special', 'indep', chars);
  assert.equal(r.state.hero.energy, 1);
  const plain = battleWith(defaultKit());
  plain.s.hero.energy = 3;
  const big = heroAct(plain.s, 'special', 'indep', plain.chars).events.find((e) => e.type === 'damage').amount;
  const small = r.events.find((e) => e.type === 'damage').amount;
  assert.ok(small < big);
});

test('battle: SPEEDY armor starts with one pip; battles saved before Phase 4 still play', () => {
  const { s } = battleWith(kit('swift'));
  assert.equal(s.hero.energy, 1);
  const old = createBattle({ heroId: 'rex', foeId: 'tree', chars: C });
  delete old.hero.specialCost;
  old.hero.energy = 3;
  assert.equal(canAct(old, 'special'), true);
  const r = heroAct(old, 'special', 'indep', C);
  assert.equal(r.state.hero.energy, 0);
});

test('awardToyXp: levels, evolution and unlock news; never lowers; junk adds nothing', () => {
  const toys = { rex: { xp: toyXpForLevel(14) + 5, level: 14, kit: kit('tough') } };
  const r = awardToyXp(toys, 'rex', toyXpForLevel(15));
  assert.equal(r.from, 14);
  assert.ok(r.to >= 15);
  assert.equal(r.evolved.name, 'Evolution I');
  assert.ok(r.unlocked.some((x) => x.kind === 'armor' && x.id === 'swift'));
  assert.deepEqual(r.toys.rex.kit, toys.rex.kit); // the equipped kit survives
  assert.equal(toys.rex.level, 14); // input untouched
  assert.equal(awardToyXp(toys, 'rex', -50).to, 14);
  assert.equal(awardToyXp(toys, 'rex', 'x').gained, 0);
  assert.equal(awardToyXp({}, 'tree', 10).toys.tree.xp, 10);
  assert.equal(awardToyXp(null, 'tree', 10).toys.tree.level, 1);
});

test('save: a toy\'s XP, level and kit survive migration; each profile keeps its own', () => {
  const raw = { v: 1, toys: { rex: { xp: 999, level: 9, kit: kit('tough', { quick: 'zippy' }) }, ghost: { xp: 5 } } };
  const out = migrate(raw, C);
  assert.equal(out.toys.rex.xp, 999);
  assert.deepEqual(out.toys.rex.kit, raw.toys.rex.kit);
  assert.equal(out.toys.ghost, undefined); // a toy this build doesn't know
});

// ---- balance: every armor and move style is a trade-off, none useless, none a must-have ----
// Win rate with each single choice for every hero against every other toy, Growing pathway (the
// harder one), for a 50%-accurate child and a random tapper. Classic / signature is the baseline.
const SPREAD = 0.1;
const rates = {};
function rate(choice) {
  const out = {};
  for (const acc of [0.5, 'random']) {
    const chars = { ...C };
    for (const id of ROSTER) chars[id] = kitDef(C[id], choice, at(100));
    out[acc] = winRate({ chars, roster: ROSTER, pathway: 'growing', accuracy: acc, rounds: 2, seed: 11 }).rate;
  }
  return out;
}
rates.base = rate(defaultKit());
for (const id of ARMOR_ORDER.slice(1)) rates['armor:' + id] = rate(kit(id));
for (const slot of SLOT_ORDER) for (const st of Object.keys(STYLES[slot]).slice(1)) rates[`${slot}:${st}`] = rate(kit('classic', { [slot]: st }));

test(`balance: each armor and style stays within ${SPREAD * 100} points of the plain toy`, (t) => {
  const pct = (x) => (x * 100).toFixed(1) + '%';
  t.diagnostic(Object.entries(rates).map(([k, v]) => `${k} 50%=${pct(v[0.5])} rnd=${pct(v.random)}`).join(' | '));
  for (const [k, v] of Object.entries(rates)) {
    for (const acc of [0.5, 'random']) {
      const d = v[acc] - rates.base[acc];
      assert.ok(Math.abs(d) <= SPREAD, `${k} at ${acc}: ${pct(v[acc])} vs plain ${pct(rates.base[acc])}`);
    }
  }
});
