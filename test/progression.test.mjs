// v6 Phase 3: player level + XP curve, XP awards, save migration, learning pathways,
// and independent math / reading mastery.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS as C } from '../src/data/characters.js';
import { MAX_LEVEL, XP, xpForLevel, levelForXp, xpProgress, xpForAnswer, xpForWin, awardXp } from '../src/logic/progression.js';
import { defaultSkills, recordResult, playLevel, bandFor, PATHWAY_BANDS, MIN_LEVEL, MAX_LEVEL as MAX_SKILL } from '../src/logic/difficulty.js';

const mem = new Map();
globalThis.window = {
  localStorage: {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
  },
};
const { SaveStore, migrate, MAX_PLAYER_LEVEL, PATHWAYS } = await import('../src/save.js');

test('progression: the curve starts at 0, rises every level, and gets steeper', () => {
  assert.equal(MAX_LEVEL, 100);
  assert.equal(MAX_PLAYER_LEVEL, MAX_LEVEL);
  assert.equal(xpForLevel(1), 0);
  assert.equal(xpForLevel(2), 50);
  assert.equal(xpForLevel(3), 120);
  assert.equal(xpForLevel(10), 1170);
  assert.equal(xpForLevel(100), 101970);
  let lastStep = 0;
  for (let n = 1; n < MAX_LEVEL; n++) {
    const step = xpForLevel(n + 1) - xpForLevel(n);
    assert.equal(step, 30 + 20 * n, `step ${n}`);
    assert.ok(step > lastStep);
    lastStep = step;
  }
});

test('progression: levelForXp inverts the curve exactly at every boundary', () => {
  for (let n = 1; n <= MAX_LEVEL; n++) {
    assert.equal(levelForXp(xpForLevel(n)), n, `at level ${n}`);
    if (n > 1) assert.equal(levelForXp(xpForLevel(n) - 1), n - 1, `just below level ${n}`);
  }
  assert.equal(levelForXp(0), 1);
  assert.equal(levelForXp(-50), 1);
  assert.equal(levelForXp(NaN), 1);
  assert.equal(levelForXp('junk'), 1);
});

test('progression: the level never passes 100 and the bar is full there', () => {
  assert.equal(levelForXp(xpForLevel(100) + 1e9), 100);
  assert.equal(levelForXp(Number.MAX_SAFE_INTEGER), 100);
  assert.equal(xpForLevel(250), xpForLevel(100), 'levels above 100 cost the same as 100');
  const top = xpProgress(xpForLevel(100) * 5);
  assert.equal(top.level, 100);
  assert.equal(top.into, top.needed);
  assert.ok(top.max);
  const capped = awardXp({ xp: xpForLevel(100) - 1, level: 99 }, 1e7);
  assert.equal(capped.player.level, 100);
  assert.equal(capped.to, 100);
});

test('progression: xpProgress splits XP into the current level', () => {
  assert.deepEqual(xpProgress(0), { level: 1, into: 0, needed: 50, max: false });
  assert.deepEqual(xpProgress(49), { level: 1, into: 49, needed: 50, max: false });
  assert.deepEqual(xpProgress(50), { level: 2, into: 0, needed: 70, max: false });
  assert.deepEqual(xpProgress(130), { level: 3, into: 10, needed: 90, max: false });
});

test('progression: early levels come fast, level 100 is a long-term goal', () => {
  // a modest won battle: three questions (two first-try, one on the second try), 2 stars
  const battle = 2 * xpForAnswer('indep') + xpForAnswer('hint') + xpForWin(2);
  assert.ok(battle >= 40 && battle <= 90, `one battle earns ${battle}`);
  let p = { xp: 0, level: 1 };
  let firstUp = null;
  for (let b = 1; b <= 3 && firstUp == null; b++) {
    p = awardXp(p, battle).player;
    if (p.level > 1) firstUp = b;
  }
  assert.ok(firstUp != null && firstUp <= 3, 'a level-up within the first few battles');
  assert.ok(xpForLevel(100) / battle > 1000, 'level 100 takes well over a thousand battles');
});

test('progression: XP awards come from play only and never go down', () => {
  assert.ok(XP.indep > XP.hint && XP.hint > XP.support && XP.support > 0, 'more XP for right on the first try');
  assert.equal(xpForAnswer('indep'), XP.indep);
  assert.equal(xpForAnswer('none'), 0, 'no question asked, no answer XP');
  assert.equal(xpForAnswer(undefined), 0);
  assert.equal(xpForWin(0), XP.win);
  assert.equal(xpForWin(3), XP.win + 3 * XP.star);
  assert.equal(xpForWin(99), XP.win + 3 * XP.star, 'stars are capped at 3');
  assert.ok(XP.space > 0);

  const start = { xp: 40, level: 1 };
  const r = awardXp(start, XP.indep);
  assert.deepEqual(r.player, { xp: 50, level: 2 });
  assert.equal(r.gained, XP.indep);
  assert.deepEqual([r.from, r.to], [1, 2]);
  assert.deepEqual(start, { xp: 40, level: 1 }, 'the input is not mutated');
  for (const bad of [-100, -1, NaN, 'x', null, undefined, -Infinity]) {
    const b = awardXp({ xp: 300, level: 4 }, bad);
    assert.equal(b.player.xp, 300, `award ${bad}`);
    assert.equal(b.player.level, 4);
    assert.equal(b.gained, 0);
  }
  // a stored level above what the XP gives is never lowered
  assert.equal(awardXp({ xp: 0, level: 7 }, 5).player.level, 7);
  // a missing player starts from level 1, xp 0
  assert.deepEqual(awardXp(undefined, 10).player, { xp: 10, level: 1 });
});

test('progression: old saves load with level 1, xp 0; level follows xp; bad values clean up', () => {
  // a save from before player progress existed
  const old = migrate({ v: 1 }, C);
  delete old.player;
  delete old.rev;
  old.progress.stars = 12;
  const back = migrate(JSON.parse(JSON.stringify(old)), C);
  assert.deepEqual(back.player, { xp: 0, level: 1 });
  assert.equal(back.progress.stars, 12);
  // junk player fields
  assert.deepEqual(migrate({ v: 1, player: 'nope' }, C).player, { xp: 0, level: 1 });
  assert.deepEqual(migrate({ v: 1, player: { xp: -5, level: 0 } }, C).player, { xp: 0, level: 1 });
  assert.equal(migrate({ v: 1, player: { xp: 0, level: 5000 } }, C).player.level, 100);
  // xp earned but level not written (e.g. by an older build): level catches up
  assert.equal(migrate({ v: 1, player: { xp: xpForLevel(6) + 3 } }, C).player.level, 6);
  // old skills: missing or out-of-range levels are brought into 1–5
  const sk = migrate({ v: 1, skills: { math: { level: 9 }, letters: { level: 'x' } } }, C).skills;
  assert.equal(sk.math.level, MAX_SKILL);
  assert.equal(sk.letters.level, MIN_LEVEL);
  assert.equal(sk.math.auto, true, 'missing skill fields come from the defaults');
});

test('progression: XP is saved per profile and survives a restart', () => {
  mem.clear();
  const st = new SaveStore(C);
  st.data.player = awardXp(st.data.player, 130).player;
  st.save();
  st.createProfile(1, { name: 'Sam', pathway: 'growing' });
  st.switchTo(1);
  assert.deepEqual(st.data.player, { xp: 0, level: 1 }, 'a new player starts at level 1');
  st.data.player = awardXp(st.data.player, 20).player;
  st.save();
  const list = st.profiles();
  assert.deepEqual([list[0].level, list[0].xp], [3, 130]);
  assert.deepEqual([list[1].level, list[1].xp], [1, 20]);
  const again = new SaveStore(C);
  assert.equal(again.slot, 1);
  assert.equal(again.data.player.xp, 20);
  again.switchTo(0);
  assert.deepEqual(again.data.player, { xp: 130, level: 3 });
});

test('pathways: default Early; the pathway sets the starting band and the ceiling', () => {
  assert.deepEqual(PATHWAYS, ['early', 'growing']);
  assert.ok(PATHWAY_BANDS.early && PATHWAY_BANDS.growing);
  assert.equal(bandFor('nonsense'), PATHWAY_BANDS.early);
  mem.clear();
  const st = new SaveStore(C);
  assert.equal(st.pathway, 'early');
  const s = defaultSkills();
  // a new player: Early starts where the game always started; Growing starts higher
  assert.equal(playLevel(s.math, 'early'), 2);
  assert.equal(playLevel(s.letters, 'early'), 1);
  assert.equal(playLevel(s.math, 'growing'), PATHWAY_BANDS.growing.min);
  assert.equal(playLevel(s.letters, 'growing'), PATHWAY_BANDS.growing.min);
  assert.ok(PATHWAY_BANDS.growing.min > PATHWAY_BANDS.early.min);
  assert.ok(PATHWAY_BANDS.growing.max > PATHWAY_BANDS.early.max);
  // the ceiling: on Early, first-try streaks stop at the Early top
  let m = { ...s.math, level: PATHWAY_BANDS.early.max };
  for (let i = 0; i < 12; i++) m = recordResult(m, 'indep', bandFor('early'));
  assert.equal(m.level, PATHWAY_BANDS.early.max);
  // and on Growing they can climb past it
  for (let i = 0; i < 12; i++) m = recordResult(m, 'indep', bandFor('growing'));
  assert.equal(m.level, PATHWAY_BANDS.growing.max);
  // the floor: on Growing, needing help never drops below the Growing start
  let g = { ...s.letters, level: PATHWAY_BANDS.growing.min };
  for (let i = 0; i < 12; i++) g = recordResult(g, 'support', bandFor('growing'));
  assert.equal(g.level, PATHWAY_BANDS.growing.min);
});

test('pathways: switching pathway keeps every bit of progress', () => {
  mem.clear();
  const st = new SaveStore(C);
  st.data.skills.math.level = 5;
  st.data.skills.letters.level = 2;
  st.data.player = { xp: 500, level: 6 };
  st.data.progress.stars = 9;
  st.save();
  const before = JSON.stringify(st.data);
  st.updateProfile(0, { pathway: 'growing' });
  assert.equal(st.pathway, 'growing');
  assert.equal(JSON.stringify(st.data), before, 'the save itself is untouched by a pathway change');
  assert.equal(playLevel(st.data.skills.letters, st.pathway), PATHWAY_BANDS.growing.min, 'Growing lifts reading to its band');
  st.updateProfile(0, { pathway: 'early' });
  assert.equal(playLevel(st.data.skills.math, st.pathway), PATHWAY_BANDS.early.max, 'Early plays math at its ceiling');
  assert.equal(st.data.skills.math.level, 5, 'but the stored level is kept');
  st.updateProfile(0, { pathway: 'growing' });
  assert.equal(playLevel(st.data.skills.math, st.pathway), 5, 'switching back restores it exactly');
  assert.equal(playLevel(st.data.skills.letters, st.pathway), PATHWAY_BANDS.growing.min);
  // a mixed answer on the clamped level that doesn't step leaves the stored level alone
  const kept = recordResult(st.data.skills.math, 'hint', bandFor('early'));
  assert.equal(kept.level, 5);
  const reload = new SaveStore(C);
  assert.equal(reload.pathway, 'growing');
  assert.deepEqual(reload.data.player, { xp: 500, level: 6 });
  assert.equal(reload.data.progress.stars, 9);
  assert.equal(reload.data.skills.math.level, 5);
});

test('mastery: math and reading move independently on first-try accuracy', () => {
  const band = bandFor('growing');
  let skills = defaultSkills();
  skills = { ...skills, math: { ...skills.math, level: 3 }, letters: { ...skills.letters, level: 3 } };
  const answer = (key, q) => { skills = { ...skills, [key]: recordResult(skills[key], q, band) }; };
  // strong at math: three first-try answers in a row step math up, reading stays
  for (let i = 0; i < 3; i++) answer('math', 'indep');
  assert.equal(skills.math.level, 4);
  assert.equal(skills.letters.level, 3);
  assert.deepEqual(skills.letters.recent, [], 'reading saw none of the math answers');
  // struggling at reading: needing help steps reading down, math stays
  answer('letters', 'support');
  answer('letters', 'support');
  assert.equal(skills.letters.level, 3, 'held at the Growing floor');
  skills.letters.level = 4;
  answer('letters', 'support');
  answer('letters', 'support');
  assert.equal(skills.letters.level, 3);
  assert.equal(skills.math.level, 4, 'reading trouble never lowers math');
  // a second-try answer never moves a level up, and breaks the streak
  answer('math', 'indep');
  answer('math', 'indep');
  answer('math', 'hint');
  answer('math', 'indep');
  assert.equal(skills.math.level, 4);
  assert.equal(skills.math.streak, 1);
  // interleaving: first-try reading answers between math answers don't help math
  for (let i = 0; i < 2; i++) answer('letters', 'indep');
  assert.equal(skills.math.level, 4);
  answer('letters', 'indep');
  assert.equal(skills.letters.level, 4);
  assert.equal(skills.math.level, 4);
});

test('mastery: without a band, recordResult behaves exactly as before', () => {
  let m = defaultSkills().math;
  for (let i = 0; i < 30; i++) m = recordResult(m, 'indep');
  assert.equal(m.level, MAX_SKILL);
  for (let i = 0; i < 30; i++) m = recordResult(m, 'support');
  assert.equal(m.level, MIN_LEVEL);
});
