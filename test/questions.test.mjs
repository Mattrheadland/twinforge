// The bigger question pool: word banks, new types, no repeats, second tries.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeMath, makeReading, validate, keyOf, skillOf, KINDS, MATH_KINDS, READ_KINDS } from '../src/logic/challenges.js';
import { PICS, STARTS, ENDS, RHYMES, CVC, LONG_WORDS, SPELL, SIGHT, ALL_WORDS } from '../src/logic/words.js';
import { pickQuestion, rememberAnswer, defaultMem, normalizeMem, RECENT_MAX } from '../src/logic/question-picker.js';
import { defaultLearning, normalizeLearning, recordAnswer, buildReport, reportText } from '../src/logic/learning-log.js';
import { Rng } from '../src/logic/rng.js';

test('word banks: every word has a picture and really starts / ends / rhymes the way it says', () => {
  for (const [L, words] of Object.entries(STARTS)) for (const w of words) { assert.ok(PICS[w], w); assert.equal(w[0].toUpperCase(), L, w); }
  for (const [L, words] of Object.entries(ENDS)) for (const w of words) { assert.ok(PICS[w], w); assert.equal(w.at(-1), L, w); }
  const inRhymes = RHYMES.flat();
  assert.equal(new Set(inRhymes).size, inRhymes.length, 'a word sits in two rhyme families');
  for (const w of [...inRhymes, ...CVC, ...LONG_WORDS, ...SPELL]) assert.ok(PICS[w], w);
  for (const w of SPELL) { assert.equal(w.length, 3); assert.ok('aeiou'.includes(w[1]), w); }
  // big enough to stop memorising
  assert.ok(Object.values(STARTS).flat().length >= 120);
  assert.ok(RHYMES.length >= 25 && CVC.length + LONG_WORDS.length >= 40);
  assert.ok(SIGHT.easy.length + SIGHT.more.length >= 40);
  assert.ok(ALL_WORDS.size >= 130);
});

test('every new type is valid at every level it appears, across many seeds', () => {
  for (const [table, make] of [[MATH_KINDS, makeMath], [READ_KINDS, makeReading]]) {
    for (let lv = 1; lv <= 5; lv++) for (const kind of new Set(table[lv])) {
      const rng = new Rng(lv * 101 + kind.length);
      for (let i = 0; i < 400; i++) {
        const ch = make(lv, rng, kind);
        assert.ok(validate(ch), `${kind} L${lv}: ${JSON.stringify(ch)}`);
        assert.equal(ch.level, lv);
        assert.ok(ch.prompt && ch.optType, kind);
      }
    }
  }
});

test('any type at any level (as forced previews and reviews ask) and the picker always give a full card', () => {
  // a card with a missing or short answer row would leave the battle waiting on a question that never shows
  const full = (ch, what) => {
    for (const st of ch.steps || [ch]) {
      assert.equal(st.options.length, 3, what);
      assert.equal(st.options.filter((o) => String(o) === String(st.answer)).length, 1, what);
    }
  };
  for (const [kind, { domain }] of Object.entries(KINDS)) {
    const make = domain === 'math' ? makeMath : makeReading;
    for (let lv = 1; lv <= 5; lv++) {
      const rng = new Rng(lv * 977 + kind.length);
      for (let i = 0; i < 300; i++) full(make(lv, rng, kind), `${kind} L${lv}`);
    }
  }
  for (const domain of ['math', 'reading']) for (let lv = 1; lv <= 5; lv++) {
    const rng = new Rng(lv * 31), mem = defaultMem();
    for (let i = 0; i < 400; i++) {
      const ch = pickQuestion(domain, lv, rng, { mem });
      full(ch, `${domain} L${lv} ${ch.kind}`);
      rememberAnswer(mem, ch, i % 3 ? 'indep' : 'support');
    }
  }
});

test('the pool is big: hundreds of different questions per subject at each level', () => {
  const distinct = (make, lv) => { const r = new Rng(lv * 7); const s = new Set(); for (let i = 0; i < 6000; i++) s.add(keyOf(make(lv, r))); return s.size; };
  for (let lv = 2; lv <= 5; lv++) {
    assert.ok(distinct(makeMath, lv) >= 150, `math L${lv}: ${distinct(makeMath, lv)}`);
    assert.ok(distinct(makeReading, lv) >= 150, `reading L${lv}: ${distinct(makeReading, lv)}`);
  }
  // even level 1 (counting, quick look, shapes, matching capitals) has plenty
  // level 1 is small on purpose (count to 5, quick look to 4, six shapes, 26 capitals); he moves up after 3 in a row
  assert.ok(distinct(makeMath, 1) >= 30 && distinct(makeReading, 1) >= 26);
});

test('starts-with, pick-a-picture and missing letter never offer a second right answer', () => {
  const rng = new Rng(5);
  for (let i = 0; i < 3000; i++) {
    const p = makeReading(4, rng, 'pickStart');
    const sounds = p.letter === 'C' || p.letter === 'K' ? ['C', 'K'] : [p.letter];
    assert.equal(p.options.filter((o) => sounds.includes(o[0].toUpperCase())).length, 1, JSON.stringify(p));
    const m = makeReading(5, rng, 'missing');
    for (const o of m.options) if (o !== m.answer) assert.ok(!ALL_WORDS.has(m.word.slice(0, m.pos) + o + m.word.slice(m.pos + 1)), `${m.word} ${o}`);
  }
});

test('spelling goes one letter at a time with three choices each', () => {
  const rng = new Rng(9);
  for (let i = 0; i < 500; i++) {
    const ch = makeReading(5, rng, 'spell');
    assert.equal(ch.steps.length, ch.word.length);
    ch.steps.forEach((s, k) => { assert.equal(s.answer, ch.word[k]); assert.equal(new Set(s.options).size, 3); });
    assert.ok('aeiou'.includes(ch.steps[1].answer) && ch.steps[1].options.every((o) => 'aeiou'.includes(o)), 'middle step offers vowels');
  }
});

test('sight words: the prompt never prints the word (it is said aloud); reveal is the no-sound fallback', () => {
  const rng = new Rng(2);
  for (let i = 0; i < 300; i++) {
    const ch = makeReading(5, rng, 'sight');
    assert.ok(!ch.prompt.toLowerCase().split(/[^a-z]+/).includes(ch.word.toLowerCase()), ch.prompt);
    assert.ok(ch.reveal.includes(ch.word) && ch.say.includes(ch.word));
  }
});

test('levels: reading starts with letters only; spelling and teen numbers wait for level 5', () => {
  assert.deepEqual([...new Set(READ_KINDS[1])], ['letter']);
  assert.equal(KINDS.spell.from, 5);
  assert.equal(KINDS.teen.from, 5);
  assert.equal(KINDS.flash.from, 1);
  assert.equal(KINDS.pickStart.from, 2);
});

test('no repeats: the last 25 questions of a subject are never asked again', () => {
  for (const [domain, lv] of [['reading', 3], ['reading', 5], ['math', 2], ['math', 4]]) {
    const rng = new Rng(lv + domain.length);
    const mem = defaultMem();
    const keys = [];
    for (let i = 0; i < 200; i++) {
      const ch = pickQuestion(domain, lv, rng, { mem });
      const k = keyOf(ch);
      assert.ok(!keys.slice(-RECENT_MAX).includes(k), `${domain} L${lv} repeated ${k} at ${i}`);
      keys.push(k);
      rememberAnswer(mem, ch, 'indep');
    }
  }
});

test('second tries: a missed skill comes back 3–5 questions later in a new form, at most twice', () => {
  const rng = new Rng(4);
  const mem = defaultMem();
  let missed;
  // miss the first "starts with" question
  for (;;) {
    const ch = pickQuestion('reading', 3, rng, { mem });
    if (ch.kind === 'starts') { missed = ch; rememberAnswer(mem, ch, 'support'); break; }
    rememberAnswer(mem, ch, 'indep');
  }
  let back = null, after = 0;
  for (let i = 0; i < 8 && !back; i++) {
    const ch = pickQuestion('reading', 3, rng, { mem });
    after++;
    if (ch.review) back = ch; else rememberAnswer(mem, ch, 'indep');
  }
  assert.ok(back, 'the missed skill came back');
  assert.ok(after >= 3 && after <= 6, `came back after ${after}`);
  assert.equal(skillOf(back), skillOf(missed));
  assert.notEqual(keyOf(back), keyOf(missed), 'a new form, not the same question');
  // miss it again, then again: it stops coming back after two tries
  rememberAnswer(mem, back, 'support');
  let tries = 1;
  for (let i = 0; i < 40; i++) {
    const ch = pickQuestion('reading', 3, rng, { mem });
    if (ch.review && skillOf(ch) === skillOf(missed)) { tries++; rememberAnswer(mem, ch, 'support'); } else rememberAnswer(mem, ch, 'indep');
  }
  assert.equal(tries, 2);
  assert.equal(mem.review.length, 0);
});

test('a missed sum comes back as a toy story (or another sum) with the same answer', () => {
  const rng = new Rng(12);
  const mem = defaultMem();
  const add = makeMath(4, rng, 'add');
  rememberAnswer(mem, add, 'hint');
  let back;
  for (let i = 0; i < 10 && !back; i++) { const ch = pickQuestion('math', 4, rng, { mem }); if (ch.review) back = ch; else rememberAnswer(mem, ch, 'indep'); }
  assert.ok(back && ['add', 'story'].includes(back.kind) && back.answer === add.answer, JSON.stringify(back));
});

test('the learning log keeps the memory, old saves get an empty one, and the report counts second tries', () => {
  const L = defaultLearning();
  assert.deepEqual(L.mem, defaultMem());
  assert.deepEqual(normalizeLearning({ stats: {}, log: [] }).mem, defaultMem());
  assert.deepEqual(normalizeMem({ recent: { math: [1, 'x'] }, review: [{ kind: 'nope', skill: 'x' }] }).recent.math, ['x']);
  const rng = new Rng(1);
  const ch = makeReading(4, rng, 'ends');
  recordAnswer(L, ch, 'support', {});
  assert.equal(L.mem.asked.reading, 1);
  assert.equal(L.mem.review.length, 1);
  const again = { ...makeReading(4, rng, 'ends'), review: 1 };
  recordAnswer(L, again, 'indep', {});
  const R = buildReport(L, { math: { level: 2 }, letters: { level: 4 } });
  assert.deepEqual(R.reviews, { n: 1, firstTry: 100 });
  assert.ok(reportText(R).includes('Second tries'));
  assert.ok(R.rows.some((r) => r.kind === 'ends' && r.n === 2));
});
