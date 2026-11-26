// PR 2 (design fix 2): the question ladder L1-L6 for ages 3-10, and per-strand skill.
import test from 'node:test';
import assert from 'node:assert/strict';
import './_words.mjs';
import { makeMath, makeReading, validate, kindsAt, LADDER, MAX_CHALLENGE_LEVEL } from '../src/logic/challenges.js';
import { UPPER_KINDS, UPPER_MATH_KINDS } from '../src/logic/challenges-upper.js';
import { PATHWAY_BANDS, MAX_LEVEL, recordResult, bandFor, playLevel, defaultSkills } from '../src/logic/difficulty.js';
import { predict, updateElo, chooseKind, levelFor, seedFor, normalizeElo, ELO } from '../src/logic/elo.js';
import { pickQuestion, rememberAnswer, defaultMem, normalizeMem } from '../src/logic/question-picker.js';
import { Rng } from '../src/logic/rng.js';

test('the ladder: levels 1-8 map to L1-L6 in order, and the top reaches ages 8-10', () => {
  assert.equal(MAX_CHALLENGE_LEVEL, 8);
  assert.equal(MAX_LEVEL, 8);
  const rungs = [];
  for (let lv = 1; lv <= 8; lv++) { assert.ok(LADDER[lv], lv); rungs.push(LADDER[lv].rung); }
  assert.deepEqual([...new Set(rungs)], ['L1', 'L2', 'L3', 'L4', 'L5', 'L6']);
  assert.equal(LADDER[8].ages, '8-10');
});

test('L4-L6 questions are valid, have 4 choices with exactly one right, and get harder', () => {
  for (let lv = 6; lv <= 8; lv++) {
    for (const [domain, make] of [['math', makeMath], ['reading', makeReading]]) {
      const kinds = kindsAt(domain, lv);
      assert.ok(kinds.some((k) => UPPER_KINDS.has(k)), `${domain} L${lv} has new types`);
      const rng = new Rng(lv * 7 + domain.length);
      for (const kind of kinds) for (let i = 0; i < 200; i++) {
        const ch = make(lv, rng, kind);
        assert.ok(validate(ch), `${kind} L${lv}: ${JSON.stringify(ch)}`);
        if (UPPER_KINDS.has(kind)) {
          assert.equal(ch.options.length, 4, kind);
          assert.equal(ch.options.filter((o) => String(o) === String(ch.answer)).length, 1, kind);
        }
      }
    }
  }
  // adding and taking away grow up the ladder: within 20 at L4, within 100 at L5, times tables at L6
  const top = (lv) => { const rng = new Rng(lv); let m = 0; for (let i = 0; i < 500; i++) { const ch = makeMath(lv, rng); if (/^(add|sub)(20|100)$/.test(ch.kind)) m = Math.max(m, ch.a, ch.b, +ch.answer); } return m; };
  assert.ok(top(6) <= 20 && top(6) >= 15, `L4 top ${top(6)}`);
  assert.ok(top(7) > 20 && top(7) <= 100, `L5 top ${top(7)}`);
  assert.ok(kindsAt('math', 8).includes('times') && kindsAt('math', 8).includes('fraction'));
});

test('pathways: Older (8-10) plays L3-L6; Growing now reaches L4; Early is unchanged', () => {
  assert.deepEqual(PATHWAY_BANDS.early, { min: 1, max: 4 });
  assert.deepEqual(PATHWAY_BANDS.growing, { min: 3, max: 6 });
  assert.deepEqual(PATHWAY_BANDS.older, { min: 5, max: 8 });
  const s = defaultSkills();
  assert.equal(playLevel(s.math, 'older'), 5);
  let m = { ...s.math, level: 5 };
  for (let i = 0; i < 12; i++) m = recordResult(m, 'indep', bandFor('older'));
  assert.equal(m.level, 8, 'three first-try answers a step climbs to the top');
});

test('elo: P falls as the question gets harder, a new strand starts near 0.8, guessing is the floor', () => {
  assert.ok(predict(5, 4) > predict(5, 5) && predict(5, 5) > predict(5, 6));
  const p0 = predict(seedFor(4), 4, 3);
  assert.ok(p0 > 0.76 && p0 < 0.84, `seed P ${p0}`);
  assert.ok(predict(0, 8, 4) >= 0.25 && predict(0, 8, 4) < 0.27, 'never below a lucky guess');
});

test('elo: right answers raise a strand, needed-help lowers it, and steps settle after about ten', () => {
  const e = {};
  updateElo(e, 'add20', 6, 'indep');
  const up = e.add20.r;
  assert.ok(up > seedFor(6));
  updateElo(e, 'add20', 6, 'support');
  assert.ok(e.add20.r < up);
  assert.equal(e.add20.n, 2);
  // first step vs the eleventh step, same surprise
  const a = {}, b = { x: { r: seedFor(6), n: 10 } };
  updateElo(a, 'x', 6, 'support'); updateElo(b, 'x', 6, 'support');
  assert.ok(seedFor(6) - a.x.r > 1.4 * (seedFor(6) - b.x.r), 'early steps are bigger');
  // 'none' (learning off) never moves it
  const c = {}; updateElo(c, 'add', 3, 'none'); assert.deepEqual(c, {});
});

test('elo: about ten answers find a strand near its true level', () => {
  for (const [truth, seed] of [[7.2, 1], [4.6, 3], [6, 9]]) {
    let within = 0;
    for (let s = 0; s < 200; s++) {
      const rng = new Rng(seed * 1000 + s), e = {};
      for (let i = 0; i < 12; i++) {
        const lv = Math.max(1, Math.min(8, Math.round(e.k ? e.k.r - 0.5 : 6)));
        const p = predict(truth, lv);
        const r = rng.next();
        updateElo(e, 'k', lv, r < p ? 'indep' : r < p + (1 - p) / 2 ? 'hint' : 'support');
      }
      if (Math.abs(e.k.r - truth) < 1.2) within++;
    }
    assert.ok(within / 200 > 0.7, `truth ${truth}: ${within}/200 within 1.2 levels after 12 answers`);
  }
});

test('elo: strands are separate: struggling at take-away never lowers adding', () => {
  const e = {};
  for (let i = 0; i < 6; i++) updateElo(e, 'add20', 6, 'indep');
  const add = e.add20.r;
  for (let i = 0; i < 6; i++) updateElo(e, 'sub20', 6, 'support');
  assert.equal(e.add20.r, add);
  assert.ok(e.sub20.r < add - 1);
});

test('picker: a struggling strand is asked one level easier (quietly) and never steps the subject up', () => {
  const mem = defaultMem();
  mem.elo.sub = { r: 2.5, n: 8 }; // predicted well under 50% at level 5
  assert.equal(levelFor(mem.elo, 'sub', 5, (lv) => kindsAt('math', lv).includes('sub')), 4);
  assert.equal(levelFor(mem.elo, 'add', 5, () => true), 5, 'an unseen strand stays at the level');
  const rng = new Rng(3);
  let eased = 0, subs = 0;
  for (let i = 0; i < 300; i++) {
    const ch = pickQuestion('math', 5, rng, { mem: { ...defaultMem(), elo: { sub: { r: 2.5, n: 8 } } }, pathway: 'growing' });
    if (ch.kind === 'sub') { subs++; if (ch.eased) { eased++; assert.equal(ch.at, 4); assert.ok(validate(ch)); } }
  }
  assert.ok(subs > 0 && eased === subs, `${eased}/${subs} take-aways eased`);
});

test('picker: kinds near the target success rate come up more than mastered ones', () => {
  const rng = new Rng(11);
  const elo = { add20: { r: 9, n: 30 }, sub20: { r: seedFor(6) - 0.4, n: 30 } };
  const n = { add20: 0, sub20: 0 };
  for (let i = 0; i < 2000; i++) n[chooseKind(elo, ['add20', 'sub20'], 6, 'older', rng)]++;
  assert.ok(n.sub20 > 2.5 * n.add20, JSON.stringify(n));
  assert.ok(n.add20 > 0, 'a mastered kind still shows up now and then');
});

test('adaptive check: a simulated child with one weak strand stays near the pathway target', () => {
  // a 9-year-old on Older at level 7: strong at most strands, weak at one
  // (each weak strand also exists one level down, so it can be eased)
  for (const [domain, weak] of [['math', 'missingAdd'], ['reading', 'digraph']]) {
    const rng = new Rng(domain.length * 13), kidRng = new Rng(99), mem = defaultMem();
    const truth = (k) => (k === weak ? 5.2 : 7.4);
    let firstTry = 0, n = 0, weakEased = 0, weakSeen = 0;
    for (let i = 0; i < 400; i++) {
      const ch = pickQuestion(domain, 7, rng, { mem, pathway: 'older' });
      const p = predict(truth(ch.kind), ch.at ?? ch.level, ch.options.length);
      const r = kidRng.next();
      const q = r < p ? 'indep' : r < p + (1 - p) / 2 ? 'hint' : 'support';
      rememberAnswer(mem, ch, q);
      if (i >= 100) { n++; if (q === 'indep') firstTry++; if (ch.kind === weak && !ch.review) { weakSeen++; if (ch.eased) weakEased++; } } // reviews come back at his level
    }
    const rate = firstTry / n;
    assert.ok(rate > 0.65 && rate < 0.9, `${domain} first-try ${rate.toFixed(2)}`);
    assert.ok(weakEased / Math.max(1, weakSeen) > 0.5, `${domain}: weak strand eased ${weakEased}/${weakSeen}`);
  }
});

test('saves: old memory without ratings loads; bad ratings are dropped', () => {
  assert.deepEqual(normalizeMem({ recent: { math: [] } }).elo, {});
  assert.deepEqual(normalizeElo({ add: { r: 4.2, n: 3 }, bad: { r: 'x' }, worse: null }), { add: { r: 4.2, n: 3 } });
  assert.equal(normalizeElo({ add: { r: 99, n: 1 } }).add.r, ELO.max);
});
