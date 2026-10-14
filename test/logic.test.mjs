import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS as C, ROSTER } from '../src/data/characters.js';
import { createBattle, heroAct, foeAct, canAct, foeIntent, RULES, starsFor, isValidBattle, moveFor, learningFor } from '../src/logic/battle.js';
import { makeCounting, makeLetter, makeMath, makeReading, validate, qualityFor } from '../src/logic/challenges.js';
import { defaultSkills, recordResult } from '../src/logic/difficulty.js';
import { Rng } from '../src/logic/rng.js';

const ROSTER_IDS = ROSTER;

test('every character has exactly one move per slot, with names and colors', () => {
  for (const id of ROSTER_IDS) {
    const slots = C[id].moves.map((m) => m.slot).sort();
    assert.deepEqual(slots, ['guard', 'power', 'quick', 'special'], id);
    for (const m of C[id].moves) assert.ok(m.name && m.id && m.color && m.icon, `${id} ${m.slot}`);
    assert.ok(['block', 'reflect', 'dodge'].includes(moveFor(C[id], 'guard').guard), id);
  }
});

test('every matchup ends in a win with a simple strategy, in a sensible number of turns', () => {
  for (const h of ROSTER_IDS) for (const f of ROSTER_IDS) {
    if (h === f) continue;
    for (const q of ['indep', 'support', 'none']) {
      let s = createBattle({ heroId: h, foeId: f, chars: C });
      let turns = 0;
      while (!s.result && turns++ < 60) {
        const intent = foeIntent({ ...s, turn: 'foe' }, C);
        const slot = canAct(s, 'special') ? 'special' : intent === 'slam' ? 'guard' : 'power';
        s = heroAct(s, slot, slot === 'guard' ? 'none' : q, C).state;
        if (!s.result) s = foeAct(s, C).state;
      }
      assert.equal(s.result, 'win', `${h} vs ${f} (${q})`);
      assert.ok(turns >= 4 && turns <= 14, `${h} vs ${f} (${q}) took ${turns}`);
    }
  }
});

test('the foe can win; a guard cannot be used twice in a row', () => {
  let s = createBattle({ heroId: 'witch', foeId: 'nightwing', chars: C });
  s = heroAct(s, 'guard', 'none', C).state;
  s = foeAct(s, C).state;
  assert.equal(canAct(s, 'guard'), false);
  assert.throws(() => heroAct(s, 'guard', 'none', C));
  s.hero.hp = 3;
  s.foe.hp = 999;
  for (let i = 0; i < 4 && !s.result; i++) {
    s = heroAct(s, 'quick', 'none', C).state;
    s = foeAct(s, C).state;
  }
  assert.equal(s.result, 'lose');
});

test('special is refused without full energy and spends it all', () => {
  let s = createBattle({ heroId: 'arthur', foeId: 'rex', chars: C });
  assert.equal(canAct(s, 'special'), false);
  assert.throws(() => heroAct(s, 'special', 'indep', C));
  s.hero.energy = RULES.maxEnergy;
  const r = heroAct(s, 'special', 'indep', C);
  assert.equal(r.state.hero.energy, 0);
  assert.equal(r.state.hero.guard, 'block'); // Sword in the Stone shields
});

test('energy never exceeds max', () => {
  let s = createBattle({ heroId: 'rex', foeId: 'tree', chars: C });
  for (let i = 0; i < 5; i++) {
    s = heroAct(s, 'power', 'indep', C).state;
    if (s.result) break;
    s = foeAct(s, C).state;
    assert.ok(s.hero.energy <= RULES.maxEnergy);
  }
});

test('wrong answers never cause a miss; independent answers hit harder; Learning off still hits', () => {
  for (const q of ['indep', 'hint', 'support', 'none']) {
    const s = createBattle({ heroId: 'rockfish', foeId: 'rex', chars: C });
    const r = heroAct(s, 'power', q, C);
    assert.ok(r.state.foe.hp < s.foe.hp, q);
  }
  const s = createBattle({ heroId: 'rockfish', foeId: 'rex', chars: C });
  const a = heroAct(s, 'power', 'indep', C).state.foe.hp;
  const b = heroAct(s, 'power', 'support', C).state.foe.hp;
  assert.ok(a < b, 'independent hits harder');
  const quick = heroAct(s, 'quick', null, C);
  assert.ok(quick.state.foe.hp < s.foe.hp && quick.events.find((e) => e.type === 'action').quality === 'none');
});

test('learning: power asks math, special asks reading, quick and guard ask nothing', () => {
  assert.equal(learningFor('power'), 'math');
  assert.equal(learningFor('special'), 'reading');
  assert.equal(learningFor('quick'), null);
  assert.equal(learningFor('guard'), null);
});

test('foe telegraphs its charge then uses its special; a guard turns it into a perfect block', () => {
  let s = createBattle({ heroId: 'tree', foeId: 'rex', chars: C });
  const seen = [];
  for (let i = 0; i < 4; i++) {
    const intent = foeIntent({ ...s, turn: 'foe' }, C);
    seen.push(intent);
    s = heroAct(s, intent === 'slam' ? 'guard' : 'quick', 'none', C).state;
    const r = foeAct(s, C);
    if (intent === 'slam') {
      const dmg = r.events.find((e) => e.type === 'damage' && e.target === 'hero');
      assert.ok(dmg.blocked && dmg.perfect);
      assert.ok(dmg.amount <= 5);
      assert.equal(r.events.find((e) => e.type === 'action').move, 'rexCannon');
    }
    s = r.state;
  }
  assert.deepEqual(seen, ['quick', 'power', 'charge', 'slam']);
});

test('guard types: reflect singes the attacker, dodge takes no damage', () => {
  let s = createBattle({ heroId: 'tree', foeId: 'arthur', chars: C });
  s = heroAct(s, 'guard', 'none', C).state;
  const foeHp = s.foe.hp, heroHp = s.hero.hp;
  let r = foeAct(s, C);
  assert.ok(r.state.foe.hp < foeHp, 'Blazing Bark singes');
  assert.ok(r.state.hero.hp < heroHp && heroHp - r.state.hero.hp <= 3, 'mostly blocked');
  s = createBattle({ heroId: 'witch', foeId: 'arthur', chars: C });
  s = heroAct(s, 'guard', 'none', C).state;
  r = foeAct(s, C);
  assert.equal(r.state.hero.hp, s.hero.hp, 'Broom Dodge takes nothing');
  assert.ok(r.events.find((e) => e.type === 'dodge'));
  assert.equal(r.state.hero.guard, null, 'guard lasts one foe move');
});

test('dizzy special cancels a charge and skips the foe turn', () => {
  let s = createBattle({ heroId: 'tree', foeId: 'rex', chars: C });
  s.foe.charged = true;
  s.hero.energy = 3;
  s = heroAct(s, 'special', 'indep', C).state;
  assert.equal(s.foe.charged, false);
  const hp = s.hero.hp;
  const r = foeAct(s, C);
  assert.equal(r.state.hero.hp, hp);
  assert.equal(r.state.foe.dizzy, false);
});

test('cannot act on the foe turn or after the battle ends', () => {
  let s = createBattle({ heroId: 'rex', foeId: 'tree', chars: C });
  s = heroAct(s, 'power', 'indep', C).state;
  assert.equal(canAct(s, 'power'), false);
  assert.throws(() => heroAct(s, 'power', 'indep', C));
  s.result = 'win';
  assert.throws(() => foeAct(s, C));
});

test('stars and validity (old battle saves are dropped)', () => {
  const s = createBattle({ heroId: 'rex', foeId: 'tree', chars: C });
  assert.ok(isValidBattle(s, C));
  assert.ok(!isValidBattle({ ...s, heroId: 'nope' }, C));
  assert.ok(!isValidBattle({ ...s, v: 1 }, C));
  assert.equal(starsFor({ ...s, result: 'win' }), 3);
  assert.equal(starsFor({ ...s, result: 'lose' }), 0);
});

test('every math and reading challenge is valid across levels and seeds', () => {
  const seen = new Set();
  for (let seed = 1; seed < 500; seed++) {
    for (let lv = 1; lv <= 5; lv++) {
      const r = new Rng(seed * 31 + lv);
      const m = makeMath(lv, r);
      const rd = makeReading(lv, r);
      assert.ok(validate(m), JSON.stringify(m));
      assert.ok(validate(rd), JSON.stringify(rd));
      seen.add(m.kind); seen.add(rd.kind);
    }
  }
  for (const k of ['count', 'shape', 'compare', 'pattern', 'numeral', 'add', 'sub', 'flash', 'story', 'oneMore', 'seq', 'bigger', 'teen',
    'letter', 'starts', 'pickStart', 'ends', 'rhyme', 'word', 'missing', 'sight', 'spell']) assert.ok(seen.has(k), k);
});

test('levels gate the harder challenge types', () => {
  const kinds = (fn, lv) => { const r = new Rng(9); const s = new Set(); for (let i = 0; i < 300; i++) s.add(fn(lv, r).kind); return s; };
  assert.ok(!kinds(makeMath, 1).has('add') && !kinds(makeMath, 1).has('sub'));
  assert.ok(kinds(makeMath, 4).has('sub'));
  assert.deepEqual([...kinds(makeReading, 1)], ['letter']);
  assert.ok(kinds(makeReading, 5).has('word'));
});

test('same seed gives same challenge', () => {
  assert.deepEqual(makeCounting(3, new Rng(42)), makeCounting(3, new Rng(42)));
  assert.deepEqual(makeLetter(2, new Rng(7)), makeLetter(2, new Rng(7)));
  assert.deepEqual(makeMath(4, new Rng(5)), makeMath(4, new Rng(5)));
});

test('quality mapping', () => {
  assert.equal(qualityFor(0), 'indep');
  assert.equal(qualityFor(1), 'hint');
  assert.equal(qualityFor(2), 'support');
});

test('difficulty: three independent in a row levels up, repeated support levels down, assisted never levels up', () => {
  let m = defaultSkills().math;
  m = recordResult(m, 'indep');
  m = recordResult(m, 'hint');
  m = recordResult(m, 'indep');
  m = recordResult(m, 'indep');
  assert.equal(m.level, 2);
  m = recordResult(m, 'indep');
  assert.equal(m.level, 3);
  m = recordResult(m, 'support');
  m = recordResult(m, 'support');
  assert.equal(m.level, 2);
  const locked = { ...defaultSkills().math, auto: false };
  let l = locked;
  for (let i = 0; i < 6; i++) l = recordResult(l, 'indep');
  assert.equal(l.level, 2);
});

test('save: migrate, backup recovery, import/export, corrupted battle dropped', async () => {
  const mem = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => mem.set(k, String(v)),
      removeItem: (k) => mem.delete(k),
    },
  };
  const { SaveStore, migrate } = await import('../src/save.js');
  const st = new SaveStore(C);
  st.data.progress.stars = 5;
  st.data.battle = createBattle({ heroId: 'rex', foeId: 'tree', chars: C });
  st.save();
  st.data.progress.stars = 9;
  st.save();
  // corrupt main save -> recovers from backup (stars 5)
  mem.set('tbb.save', '{oops');
  const st2 = new SaveStore(C);
  assert.equal(st2.recovered, true);
  assert.equal(st2.data.progress.stars, 5);
  assert.ok(st2.data.battle);
  // export / import roundtrip
  const txt = st2.exportText();
  const st3 = new SaveStore(C);
  st3.data.progress.stars = 0;
  st3.importText(txt);
  assert.equal(st3.data.progress.stars, 5);
  assert.throws(() => st3.importText('{"app":"other","v":1}'));
  // bad battle snapshot is dropped, not crashed on
  const m = migrate({ v: 1, battle: { v: 1, heroId: 'x' } }, C);
  assert.equal(m.battle, null);
  assert.throws(() => migrate({ v: 99 }, C));
});

test('music: every part matches its track length and every note parses', async () => {
  const { TRACKS } = await import('../src/audio/music.js');
  const { midiFreq } = await import('../src/audio/audio.js');
  for (const [name, tr] of Object.entries(TRACKS)) {
    for (const p of tr.parts) {
      assert.equal(p.notes.length, tr.length, `${name} part length`);
      if (p.kind === 'drum') continue;
      for (const n of p.notes) {
        if (n === '-' || n === '.') continue;
        for (const x of n.split('+')) assert.ok(midiFreq(x) > 20, `${name}: ${x}`);
      }
    }
  }
});
