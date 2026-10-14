import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeReading } from '../src/logic/challenges.js';
import { setWords, wordsReady, PICS, STARTS } from '../src/logic/words.js';
import { Rng } from '../src/logic/rng.js';

test('words: before words.json arrives, reading questions are letter matches', () => {
  assert.equal(wordsReady(), false);
  const rng = new Rng(7);
  for (let i = 0; i < 30; i++) assert.equal(makeReading(4, rng).kind, 'letter');
  assert.equal(makeReading(5, rng, 'spell').kind, 'letter');
});

test('words: once loaded, every reading type comes back', () => {
  setWords(JSON.parse(fs.readFileSync('public/words.json', 'utf8')));
  assert.ok(wordsReady());
  assert.equal(PICS.cat, '🐱');
  assert.ok(STARTS.B.includes('bear'));
  const rng = new Rng(7);
  const kinds = new Set(Array.from({ length: 80 }, () => makeReading(5, rng).kind));
  assert.ok(kinds.size >= 5, [...kinds].join());
});
