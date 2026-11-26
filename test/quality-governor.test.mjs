import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QualityGovernor, MIN_ROWS } from '../src/render3d/quality-governor.js';

const iphone = (k) => 1206 / (2 + k); // iPhone landscape: 402 css px x 3, normal picture is k = 2 (603 rows)
const run = (g, ft, n, rows = iphone) => { let steps = 0; for (let i = 0; i < n; i++) if (g.sample(ft, rows)) steps++; return steps; };

test('a phone holding 60 fps never steps down, even with the odd hitch', () => {
  const g = new QualityGovernor();
  for (let i = 0; i < 6000; i++) g.sample(i % 97 === 0 ? 60 : 16.7, iphone);
  assert.equal(g.extraK, 0);
});

test('an even 30 fps (iPhone Low Power Mode) is left alone', () => {
  const g = new QualityGovernor();
  run(g, 33.3, 3000);
  assert.equal(g.extraK, 0);
});

test('a phone that keeps missing frames steps down once after a few seconds', () => {
  const g = new QualityGovernor();
  let i = 0;
  const jank = () => g.sample(i++ % 3 ? 33.3 : 50, iphone); // between 20 and 30 fps, uneven
  for (let k = 0; k < 120 + 90; k++) assert.equal(jank(), false, 'one slow window is not enough');
  let steps = 0;
  for (let k = 0; k < 90; k++) if (jank()) steps++;
  assert.equal(steps, 1);
  assert.equal(g.extraK, 1);
});

test('loading stalls and hidden tabs are ignored', () => {
  const g = new QualityGovernor();
  assert.equal(run(g, 500, 2000), 0);
  assert.equal(g.extraK, 0);
});

test('never goes below the minimum picture height', () => {
  const g = new QualityGovernor();
  run(g, 40, 10000);
  assert.ok(iphone(g.extraK) >= MIN_ROWS);
  assert.equal(g.extraK, 1); // 603 -> 402 rows, then 301 would be too small
});
