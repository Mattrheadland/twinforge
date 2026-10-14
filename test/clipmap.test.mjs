import test from 'node:test';
import assert from 'node:assert/strict';
import { matchClips, actionOf, ACTIONS, LOOPS } from '../src/render3d/clipmap.js';
import { CHARACTERS as C } from '../src/data/characters.js';

test('Meshy-style clip names map to every action', () => {
  const names = ['Armature|Idle_02', 'Armature|Bite_Attack', 'Armature|Hit_Reaction', 'Armature|Block_Idle', 'Armature|Roar', 'Armature|Victory_Cheer', 'Armature|Tired_Breathing'];
  assert.deepEqual(matchClips(names), {
    idle: 'Armature|Idle_02', attack: 'Armature|Bite_Attack', hit: 'Armature|Hit_Reaction', guard: 'Armature|Block_Idle',
    special: 'Armature|Roar', win: 'Armature|Victory_Cheer', tired: 'Armature|Tired_Breathing',
  });
});

test('Mixamo names, missing actions, and pinned overrides', () => {
  const names = ['mixamo.com|Standing Idle', 'mixamo.com|Punching', 'mixamo.com|Head Hit'];
  const m = matchClips(names);
  assert.equal(m.idle, 'mixamo.com|Standing Idle');
  assert.equal(m.attack, 'mixamo.com|Punching');
  assert.equal(m.hit, 'mixamo.com|Head Hit');
  assert.equal(m.win, undefined);
  assert.equal(matchClips(names, { attack: 'mixamo.com|Head Hit' }).attack, 'mixamo.com|Head Hit');
  assert.equal(matchClips(names, { attack: 'not a clip' }).attack, 'mixamo.com|Punching');
});

test('a clip is used for one action only, and a lone clip becomes idle', () => {
  const m = matchClips(['Idle', 'Hit_Idle']);
  assert.equal(m.idle, 'Idle');
  assert.equal(m.hit, 'Hit_Idle');
  assert.deepEqual(matchClips(['Take 001']), { idle: 'Take 001' });
  assert.deepEqual(matchClips([]), {});
});

test('fighter state reads as the right action', () => {
  const base = { pose: 'idle', mouth: 'smile', hurt: 0, shield: 0, charge: 0, cannon: 0, lunge: 0 };
  assert.equal(actionOf(base), 'idle');
  assert.equal(actionOf({ ...base, lunge: 60 }), 'attack');
  assert.equal(actionOf({ ...base, lunge: -60 }), 'idle'); // knocked back, not attacking
  assert.equal(actionOf({ ...base, mouth: 'grit' }), 'attack');
  assert.equal(actionOf({ ...base, hurt: 0.9 }), 'hit');
  assert.equal(actionOf({ ...base, shield: 1 }), 'guard');
  assert.equal(actionOf({ ...base, charge: 1 }), 'special');
  assert.equal(actionOf({ ...base, charge: 0.45 }), 'idle'); // foe's lingering telegraph glow
  assert.equal(actionOf({ ...base, pose: 'victory', hurt: 1 }), 'win');
  assert.equal(actionOf({ ...base, pose: 'tired' }), 'tired');
  assert.equal(actionOf({ ...base, dizzy: true }), 'tired');
  for (const a of ACTIONS) assert.equal(typeof LOOPS[a], 'boolean', a);
});

test('characters with an imported model name a valid asset id', () => {
  for (const def of Object.values(C)) {
    const id = def.art?.model;
    if (id) assert.match(id, /^[a-z0-9]+(-[a-z0-9]+)*$/, def.id);
  }
});
