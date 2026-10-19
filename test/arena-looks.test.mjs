import test from 'node:test';
import assert from 'node:assert/strict';
import { getArenaLook, lookProblems, makeLookGetter } from '../src/data/arena-looks.js';
import { ARENAS } from '../src/data/arenas.js';

// The values the Pumpkin Patch had inline in arenas-new-four.js before the registry existed.
const PUMPKIN = {
  rim: 0xB4FF7A, rimK: 0.7, tint: 0xEAE4FF,
  mist: 0xB89CFF, mistK: 0.42,
  fireflies: { count: 44, colors: ['#D6FF6A', '#FFC15A', '#A6FF8A'], size: 34 },
  pools: [{ slot: 'backR', color: 0x7DFF5A, r: 170, k: 0.6 }, { slot: 'frontR', color: 0xFF9A3A, r: 120, k: 0.5 }, { slot: 'frontL', color: 0xFF8A2A, r: 110, k: 0.45 }],
  sway: { 6: 0.05, 3: 0.02 },
};

function quiet(fn) {
  const warns = [], orig = console.warn;
  console.warn = (...a) => warns.push(a.join(' '));
  try { fn(); } finally { console.warn = orig; }
  return warns;
}

test('Pumpkin Patch look resolves to the same values as before', () => {
  assert.deepEqual(getArenaLook('pumpkin-patch'), PUMPKIN);
  assert.deepEqual(ARENAS['pumpkin-patch'].look, PUMPKIN);
  assert.equal(ARENAS['pumpkin-patch'].look, getArenaLook('pumpkin-patch'));
  assert.deepEqual(lookProblems(PUMPKIN), []);
});

test('arenas without a look return undefined and carry no look', () => {
  for (const id of ['bedroom', 'castle', 'grandmas-woods', 'star-bridge', 'nope', '__proto__', 'toString']) {
    assert.equal(getArenaLook(id), undefined, id);
  }
  for (const [id, def] of Object.entries(ARENAS)) {
    if (!['pumpkin-patch', 'skull-cove'].includes(id)) assert.ok(!('look' in def), `${id} has no look`);
  }
});

test('malformed entries are rejected with a warning, never a throw', () => {
  const bads = {
    notObject: 5, nul: null, list: [],
    unknownKey: { rim: 0xffffff, glitter: 1 },
    badColor: { tint: -1 }, floatColor: { rim: 1.5 }, strColor: { mist: '#fff' },
    rimKRange: { rimK: 2 }, nan: { mistK: NaN },
    flies: { fireflies: { count: 5000 } }, fliesColors: { fireflies: { colors: ['red'] } },
    poolSlot: { pools: [{ slot: 'middle', color: 0, r: 10 }] }, poolR: { pools: [{ slot: 'backL', color: 0, r: -4 }] },
    poolsType: { pools: {} }, swayKey: { sway: { 9: 0.1 } }, swayVal: { sway: { 1: 3 } },
  };
  const get = makeLookGetter({ ...bads, good: { rimK: 0.5 } });
  const warns = quiet(() => {
    for (const id of Object.keys(bads)) assert.equal(get(id), undefined, id);
  });
  assert.equal(warns.length, Object.keys(bads).length);
  assert.deepEqual(get('good'), { rimK: 0.5 });
  // warns once, not on every lookup
  assert.equal(quiet(() => get('badColor')).length, 0);
});
