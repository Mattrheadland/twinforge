// v6 narration (directive §5 "Child-Friendly Voice Narration"): numbers and sums are spoken as words,
// sentences become separate utterances (natural pauses), and no reading or spelling question gives its
// answer away by sound. Pure checks; the phone's voice itself is checked by hand.
import './_words.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { speakable, phrases, numberWord } from '../src/audio/speech.js';
import { makeMath, makeReading, READ_KINDS, MATH_KINDS } from '../src/logic/challenges.js';
import { Rng } from '../src/logic/rng.js';

test('numbers: words a phone voice cannot misread', () => {
  assert.equal(numberWord(0), 'zero');
  assert.equal(numberWord(13), 'thirteen');
  assert.equal(numberWord(21), 'twenty-one');
  assert.equal(numberWord(40), 'forty');
  assert.equal(numberWord(100), 'one hundred');
});

test('sums and symbols are spoken, not spelled', () => {
  assert.equal(speakable('3 + 2 = ?'), 'three plus two equals what?');
  assert.equal(speakable('7 - 4 = 3'), 'seven minus four equals three');
  assert.equal(speakable('What is one more than 9?'), 'What is one more than nine?');
  assert.equal(speakable('Spell “cat”'), 'Spell cat');
  assert.equal(speakable('Which letter is missing in c_t?'), 'Which letter is missing in c, blank, t?');
  assert.equal(speakable('_at'), 'blank, a, t');
  assert.equal(speakable('Battle Rex 2'), 'Battle Rex two'); // no stray "times"
  assert.equal(speakable('Rex x Tree'), 'Rex x Tree');
});

test('sentences become separate utterances (natural pauses), empty bits dropped', () => {
  assert.deepEqual(phrases('Listen: cat. Spell cat.'), ['Listen:', 'cat.', 'Spell cat.']);
  assert.deepEqual(phrases('How many dogs?'), ['How many dogs?']);
  assert.deepEqual(phrases('... '), []);
});

// What the phone says when a question appears (ui/challenge.js: say(ch.say || ch.prompt)).
const spoken = (ch) => speakable(ch.say || ch.prompt).toLowerCase();
const tokens = (s) => s.split(/[^a-z]+/).filter(Boolean);

// Questions whose whole point is hearing the answer are allowed to say it:
//   letter     "Find the letter B" (hear a letter name, find its shape)
//   sight      "Find the word: the" (hear a word, find it printed)
//   pickStart  says the letter, the answer is a picture
const SAYS_ANSWER_ON_PURPOSE = new Set(['letter', 'sight']);

test('no reading or spelling question gives its answer away by sound (every level, many questions)', () => {
  const rng = new Rng(4242);
  let n = 0;
  for (const lv of [1, 2, 3, 4, 5]) {
    for (const kind of new Set(READ_KINDS[lv])) {
      if (SAYS_ANSWER_ON_PURPOSE.has(kind)) continue;
      for (let i = 0; i < 60; i++) {
        const ch = makeReading(lv, rng, kind);
        const s = spoken(ch), toks = tokens(s);
        n++;
        if (kind === 'spell') {
          // never the letters one by one: "c, a, t" or "c a t"
          const spelled = [...ch.word.toLowerCase()].join('[ ,.]+');
          if (ch.mode !== 'copy') assert.ok(!new RegExp(`\\b${spelled}\\b`).test(s), `L${lv} spell/${ch.mode} says the letters of ${ch.word}: "${s}"`);
        } else if (kind === 'word') {
          assert.ok(!toks.includes(ch.word.toLowerCase()), `L${lv} read-the-word says ${ch.word}: "${s}"`);
        } else if (kind === 'rhyme' || kind === 'pickStart') {
          assert.ok(!toks.includes(String(ch.answer).toLowerCase()), `L${lv} ${kind} says the answer ${ch.answer}: "${s}"`);
        } else if (kind === 'starts' || kind === 'ends' || kind === 'missing') {
          // the answer is a letter: it may appear inside the question word, never on its own
          const own = new Set(tokens(String(ch.word || '').toLowerCase()));
          const a = String(ch.answer).toLowerCase();
          assert.ok(!toks.some((t) => t === a && !own.has(t) && t.length === 1), `L${lv} ${kind} names the letter ${a}: "${s}"`);
        }
      }
    }
  }
  assert.ok(n > 500, `checked ${n} questions`);
});

test('every math question is spoken without symbols', () => {
  const rng = new Rng(77);
  for (const lv of [1, 2, 3, 4, 5]) {
    for (const kind of new Set(MATH_KINDS[lv])) {
      for (let i = 0; i < 20; i++) {
        const s = speakable(makeMath(lv, rng, kind).say || makeMath(lv, rng, kind).prompt);
        assert.ok(!/[+=_]|\d/.test(s), `L${lv} ${kind}: "${s}"`);
      }
    }
  }
});
