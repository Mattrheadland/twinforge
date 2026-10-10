import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS as C } from '../src/data/characters.js';
import { createBattle, heroAct, foeAct, canAct, foeIntent, RULES, starsFor, isValidBattle } from '../src/logic/battle.js';
import { makeCounting, makeLetter, validate, qualityFor } from '../src/logic/challenges.js';
import { defaultSkills, recordResult } from '../src/logic/difficulty.js';
import { Rng } from '../src/logic/rng.js';

test('full battle reaches a win with only attacks/specials', () => {
  let s = createBattle({ heroId: 'stompy', foeId: 'blocko', chars: C });
  let guard = 0;
  while (!s.result && guard++ < 100) {
    const action = canAct(s, 'special') ? 'special' : 'attack';
    s = heroAct(s, action, 'indep', C).state;
    if (!s.result) s = foeAct(s, C).state;
  }
  assert.equal(s.result, 'win');
  assert.ok(s.foe.hp === 0);
});

test('special is refused without full energy and spends it all', () => {
  let s = createBattle({ heroId: 'blocko', foeId: 'stompy', chars: C });
  assert.equal(canAct(s, 'special'), false);
  assert.throws(() => heroAct(s, 'special', 'indep', C));
  s.hero.energy = RULES.maxEnergy;
  const r = heroAct(s, 'special', 'indep', C);
  assert.equal(r.state.hero.energy, 0);
  assert.equal(r.state.hero.shield, true); // Blocko's wall
});

test('energy never exceeds max', () => {
  let s = createBattle({ heroId: 'stompy', foeId: 'blocko', chars: C });
  for (let i = 0; i < 4; i++) {
    s = heroAct(s, 'attack', 'indep', C).state;
    s = foeAct(s, C).state;
    assert.ok(s.hero.energy <= RULES.maxEnergy);
  }
});

test('wrong answers never cause a miss: every quality deals damage', () => {
  for (const q of ['indep', 'hint', 'support']) {
    const s = createBattle({ heroId: 'blocko', foeId: 'stompy', chars: C });
    const r = heroAct(s, 'attack', q, C);
    assert.ok(r.state.foe.hp < s.foe.hp, q);
  }
  const s = createBattle({ heroId: 'blocko', foeId: 'stompy', chars: C });
  const a = heroAct(s, 'attack', 'indep', C).state.foe.hp;
  const b = heroAct(s, 'attack', 'support', C).state.foe.hp;
  assert.ok(a < b, 'independent hits harder');
});

test('foe telegraphs charge then slams; shield turns it into a perfect block', () => {
  let s = createBattle({ heroId: 'stompy', foeId: 'blocko', chars: C });
  const seen = [];
  for (let i = 0; i < 4; i++) {
    seen.push(foeIntent({ ...s, turn: 'foe' }, C));
    const intent = seen[seen.length - 1];
    s = heroAct(s, intent === 'slam' ? 'defend' : 'attack', 'hint', C).state;
    const r = foeAct(s, C);
    if (intent === 'slam') {
      const dmg = r.events.find((e) => e.type === 'damage');
      assert.ok(dmg.blocked && dmg.perfect);
      assert.ok(dmg.amount <= 5);
    }
    s = r.state;
  }
  assert.deepEqual(seen, ['attack', 'attack', 'charge', 'slam']);
});

test('dizzy special cancels a charge and skips the foe turn', () => {
  let s = createBattle({ heroId: 'stompy', foeId: 'blocko', chars: C });
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
  let s = createBattle({ heroId: 'stompy', foeId: 'blocko', chars: C });
  s = heroAct(s, 'attack', 'indep', C).state;
  assert.equal(canAct(s, 'attack'), false);
  assert.throws(() => heroAct(s, 'attack', 'indep', C));
  s.result = 'win';
  assert.throws(() => foeAct(s, C));
});

test('stars and validity', () => {
  const s = createBattle({ heroId: 'stompy', foeId: 'blocko', chars: C });
  assert.ok(isValidBattle(s, C));
  assert.ok(!isValidBattle({ ...s, heroId: 'nope' }, C));
  assert.equal(starsFor({ ...s, result: 'win' }), 3);
  assert.equal(starsFor({ ...s, result: 'lose' }), 0);
});

test('challenges are always valid across levels and seeds', () => {
  for (let seed = 1; seed < 400; seed++) {
    for (let lv = 1; lv <= 5; lv++) {
      const r = new Rng(seed * 31 + lv);
      const c = makeCounting(lv, r);
      assert.ok(validate(c), JSON.stringify(c));
      const l = makeLetter(lv, r);
      assert.ok(validate(l), JSON.stringify(l));
    }
  }
});

test('same seed gives same challenge', () => {
  assert.deepEqual(makeCounting(3, new Rng(42)), makeCounting(3, new Rng(42)));
  assert.deepEqual(makeLetter(2, new Rng(7)), makeLetter(2, new Rng(7)));
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
  st.data.battle = createBattle({ heroId: 'stompy', foeId: 'blocko', chars: C });
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
