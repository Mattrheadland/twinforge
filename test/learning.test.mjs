import test from 'node:test';
import assert from 'node:assert/strict';
import './_words.mjs';
import { makeMath, makeReading, makeLetter, KINDS, kindsAt, MATH_KINDS, READ_KINDS } from '../src/logic/challenges.js';
import { defaultLearning, normalizeLearning, recordAnswer, noteLevel, buildReport, reportText, describe, LOG_MAX, KIND_ORDER } from '../src/logic/learning-log.js';
import { defaultSkills } from '../src/logic/difficulty.js';
import { migrate, defaultSave } from '../src/save.js';
import { CHARACTERS } from '../src/data/characters.js';
import { Rng } from '../src/logic/rng.js';

const LOOKALIKE = [['b', 'd', 'p', 'q'], ['m', 'w'], ['n', 'u']];

test('every question type has a label, a domain and a first level', () => {
  for (const k of KIND_ORDER) assert.ok(KINDS[k], k);
  assert.equal(Object.keys(KINDS).length, KIND_ORDER.length);
  assert.equal(KINDS.sub.from, 4);
  assert.equal(KINDS.word.from, 4);
  assert.deepEqual(kindsAt('reading', 1), ['letter']);
});

test('switched-off types never come up while the level has something else to ask', () => {
  const rng = new Rng(7);
  for (let lv = 1; lv <= 5; lv++) {
    for (let i = 0; i < 200; i++) {
      assert.notEqual(makeMath(lv, rng, undefined, ['count']).kind, 'count', `math L${lv}`);
      if (lv >= 3) assert.notEqual(makeReading(lv, rng, undefined, ['rhyme']).kind, 'rhyme', `reading L${lv}`);
    }
  }
  // all switched off at a level: fall back to the normal mix instead of crashing
  assert.equal(makeReading(1, rng, undefined, ['letter']).kind, 'letter');
  const allMath = [...new Set(Object.values(MATH_KINDS).flat())];
  assert.ok(makeMath(3, rng, undefined, allMath));
  void READ_KINDS;
});

test('starts-with never offers K for cat or C for kite', () => {
  const rng = new Rng(11);
  let seen = 0;
  for (let i = 0; i < 4000; i++) {
    const ch = makeReading(4, rng, 'starts');
    if (ch.answer === 'C') { seen++; assert.ok(!ch.options.includes('K'), JSON.stringify(ch.options)); }
    if (ch.answer === 'K') { seen++; assert.ok(!ch.options.includes('C'), JSON.stringify(ch.options)); }
  }
  assert.ok(seen > 50);
});

test('lowercase letters below level 5 never come with their mirror twin', () => {
  const rng = new Rng(3);
  for (const lv of [3, 4]) for (let i = 0; i < 3000; i++) {
    const ch = makeLetter(lv, rng);
    const set = LOOKALIKE.find((s) => s.includes(ch.answer));
    if (set) assert.ok(ch.options.filter((o) => set.includes(o)).length === 1, `L${lv} ${ch.answer}: ${ch.options}`);
  }
  // level 5 is where the tricky ones live on purpose
  const ch5 = makeLetter(5, new Rng(1));
  assert.equal(ch5.optionCase, 'lower');
});

test('recording an answer keeps totals, a capped log, days and level changes', () => {
  const L = defaultLearning();
  const rng = new Rng(5);
  const t = new Date(2026, 9, 14, 10).getTime();
  for (let i = 0; i < LOG_MAX + 30; i++) {
    const ch = makeMath(3, rng, 'add');
    const q = i % 5 === 0 ? 'support' : i % 3 === 0 ? 'hint' : 'indep';
    const wrong = ch.options.filter((o) => o !== ch.answer);
    recordAnswer(L, ch, q, { wrongPicks: q === 'indep' ? [] : q === 'hint' ? wrong.slice(0, 1) : wrong, firstMs: 3000 + i * 10 }, t + i * 1000);
  }
  assert.equal(L.stats.add.n, LOG_MAX + 30);
  assert.equal(L.log.length, LOG_MAX);
  assert.equal(Object.keys(L.days).length, 1);
  assert.equal(L.days['2026-10-14'].n, LOG_MAX + 30);
  const miss = L.log.find((e) => e.q === 'support');
  assert.equal(miss.w.length, 2);
  assert.match(miss.d, /^\d+ \+ \d+$/);
  noteLevel(L, 'math', 3, 3);
  assert.equal(L.levels.length, 0, 'no-op change is not logged');
  noteLevel(L, 'math', 3, 4, 'auto', t);
  assert.equal(L.levels.length, 1);
});

test('report flags a tough skill, a solid skill, and suggests a lever', () => {
  const L = defaultLearning();
  const rng = new Rng(9);
  const t0 = Date.now() - 3600e3;
  for (let i = 0; i < 10; i++) recordAnswer(L, makeMath(2, rng, 'count'), 'indep', { firstMs: 2000 }, t0 + i * 1000);
  for (let i = 0; i < 6; i++) {
    const ch = makeMath(4, rng, 'sub');
    recordAnswer(L, ch, i % 2 ? 'support' : 'hint', { wrongPicks: [ch.options.find((o) => o !== ch.answer)], firstMs: 9000 }, t0 + 20000 + i * 1000);
  }
  for (let i = 0; i < 4; i++) recordAnswer(L, makeReading(3, rng, 'rhyme'), 'indep', { firstMs: 21000 }, t0 + 40000 + i * 1000);
  const skills = defaultSkills();
  const R = buildReport(L, skills, ['pattern']);
  const row = (k) => R.rows.find((r) => r.kind === k);
  assert.equal(row('count').status, 'solid');
  assert.equal(row('count').firstTry, 100);
  assert.equal(row('sub').status, 'tough');
  assert.equal(row('sub').recentSupport, 3);
  assert.equal(row('rhyme').status, 'slow');
  assert.equal(row('word').status, 'new');
  assert.equal(row('pattern').off, true);
  assert.equal(R.today.n, 20);
  assert.ok(R.misses.length >= 6 && R.misses[0].t >= R.misses[R.misses.length - 1].t, 'newest first');
  assert.ok(R.tips.some((x) => x.startsWith('Take away')));
  assert.ok(R.tips.some((x) => x.startsWith('Rhymes')));
  const txt = reportText(R);
  assert.match(txt, /Take away \| 6 \|/);
  assert.match(txt, /Patterns|What comes next \[off\]/);
});

test('report on an empty or missing log does not crash', () => {
  const R = buildReport(undefined, defaultSkills());
  assert.equal(R.all.n, 0);
  assert.equal(R.lastPlayed, null);
  assert.equal(R.misses.length, 0);
  assert.ok(reportText(R).length > 0);
});

test('descriptions read like a grown-up would say them', () => {
  const rng = new Rng(2);
  const kinds = { math: ['count', 'add', 'sub', 'numeral', 'compare', 'shape', 'pattern'], reading: ['letter', 'starts', 'rhyme', 'word'] };
  for (const k of kinds.math) assert.ok(!/undefined|NaN|\[object/.test(describe(makeMath(4, rng, k))), k);
  for (const k of kinds.reading) assert.ok(!/undefined|NaN|\[object/.test(describe(makeReading(4, rng, k))), k);
  const p = makeMath(3, new Rng(4), 'pattern');
  assert.match(describe(p), /^(AB|ABB|ABC) pattern, next is \w+ \w+$/);
});

test('old saves get an empty learning log and no switched-off types', () => {
  const old = defaultSave();
  delete old.learning;
  delete old.settings.offKinds;
  const m = migrate(JSON.parse(JSON.stringify(old)), CHARACTERS);
  assert.deepEqual(m.learning.log, []);
  assert.deepEqual(m.settings.offKinds, []);
  const junk = migrate({ ...JSON.parse(JSON.stringify(old)), learning: { log: 'nope', stats: 5 } }, CHARACTERS);
  assert.deepEqual(junk.learning.log, []);
  assert.deepEqual(junk.learning.stats, {});
  assert.deepEqual(normalizeLearning(null), defaultLearning());
});
