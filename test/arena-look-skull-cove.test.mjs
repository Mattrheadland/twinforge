import test from 'node:test';
import assert from 'node:assert/strict';
import { getArenaLook, lookProblems } from '../src/data/arena-looks.js';
import { ARENAS, READY_NEW_ARENAS } from '../src/data/arenas.js';
import { NEW_ARENAS } from '../src/data/arenas-new-four.js';

const ID = 'skull-cove';

test('the Skull Cove id is a live arena and resolves a look', () => {
  assert.ok(READY_NEW_ARENAS.includes(ID));
  const look = getArenaLook(ID);
  assert.ok(look);
  assert.equal(ARENAS[ID].look, look);
  assert.deepEqual(lookProblems(look), []);
});

test('the entry has every field: tint + rim, mist, ambient particles, light pools, sway', () => {
  const l = getArenaLook(ID);
  for (const k of ['rim', 'rimK', 'tint', 'mist', 'mistK', 'fireflies', 'pools', 'sway']) assert.ok(l[k] !== undefined, k);
  assert.ok(l.fireflies.count > 0 && l.fireflies.colors.length > 0 && l.fireflies.size > 0);
  assert.ok(l.pools.length >= 1);
  assert.ok(Object.keys(l.sway).length >= 1);
  // sway keys must be props this arena actually has; pools must sit on slots it uses
  const nums = NEW_ARENAS[ID].props.map((p) => String(p[0]));
  for (const n of Object.keys(l.sway)) assert.ok(nums.includes(n), `prop ${n}`);
  const slots = NEW_ARENAS[ID].props.map((p) => p[1]);
  for (const p of l.pools) assert.ok(slots.includes(p.slot), p.slot);
  // gentle: keeps the toys and the question card clear
  assert.ok(l.mistK <= 0.4 && l.fireflies.count <= 60 && Math.max(...Object.values(l.sway)) <= 0.06);
});

test('arenas without a look still resolve to the old shading', () => {
  for (const id of ['bedroom', 'castle', 'grandmas-woods', 'star-bridge', 'nope']) {
    assert.equal(getArenaLook(id), undefined, id);
    if (ARENAS[id]) assert.ok(!('look' in ARENAS[id]), id);
  }
});

test('the look carries no gameplay data and the arena def is otherwise unchanged', () => {
  const l = getArenaLook(ID);
  const ALLOWED = ['rim', 'rimK', 'tint', 'mist', 'mistK', 'fireflies', 'pools', 'sway'];
  assert.deepEqual(Object.keys(l).filter((k) => !ALLOWED.includes(k)), []);
  const { look, ...rest } = ARENAS[ID];
  // the def object is shared with NEW_ARENAS, so pin the original values
  assert.deepEqual(rest, {
    id: 'skull-cove', name: 'Skull Cove', horizon: 0.62, floorTile: 200, tint: 0xe6e8ff,
    props: [[4, 'backL', 260], [5, 'backR', 190], [3, 'backL2', 95], [6, 'backR2', 110], [1, 'frontL', 80], [2, 'frontR', 85]],
  });
  for (const k of ['hp', 'damage', 'atk', 'def', 'speed', 'stats', 'moves', 'questions']) assert.ok(!(k in l), k);
});
