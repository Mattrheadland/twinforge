// When a tap on a question card may answer it (src/ui/answer-gate.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { answerGate, ANSWER_MIN_MS, HAMMER_GAP_MS } from '../src/ui/answer-gate.js';

// taps: times in ms after the move tap that opened the card; returns which ones answered
const run = (taps) => {
  const gate = answerGate(0);
  return taps.filter((t) => gate.down(t));
};

test('a calm tap after the answers pop in answers; one before that does not', () => {
  assert.deepEqual(run([1200]), [1200]);
  assert.deepEqual(run([ANSWER_MIN_MS - 100]), []);
  assert.deepEqual(run([ANSWER_MIN_MS - 100, ANSWER_MIN_MS + 600]), [ANSWER_MIN_MS + 600]);
});

test('hammering the move button never answers, however long it goes on', () => {
  // a kid tapping five times a second for three seconds (the power button sits
  // under the right-hand answer, so these land on an answer)
  const hammer = Array.from({ length: 15 }, (_, i) => 200 * (i + 1));
  assert.deepEqual(run(hammer), []);
  // irregular hammering, every gap still short
  assert.deepEqual(run([90, 300, 520, 700, 1000, 1300, 1700, 2100, 2500]), []);
});

test('the first pause ends the burst, and then quick taps answer normally', () => {
  const hammer = [150, 300, 450, 600, 750, 900, 1050];
  const pause = 1050 + HAMMER_GAP_MS + 200;
  assert.deepEqual(run([...hammer, pause]), [pause]);
  // after the pause he can tap a wrong answer and then the right one quickly
  assert.deepEqual(run([...hammer, pause, pause + 150, pause + 300]), [pause, pause + 150, pause + 300]);
});

test('a single tap that waited out the gap but came too early still waits for the answers', () => {
  // gap from the move tap is long enough, the answers are not in yet
  assert.deepEqual(run([HAMMER_GAP_MS + 10, ANSWER_MIN_MS + 5]), [ANSWER_MIN_MS + 5]);
});
