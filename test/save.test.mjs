import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS as C, ROSTER } from '../src/data/characters.js';
import { newRun, winStop } from '../src/game/modes.js';

const mem = new Map();
globalThis.window = {
  localStorage: {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
  },
};
const { SaveStore, migrate } = await import('../src/save.js');
const tourney = () => winStop(newRun('tournament', 'rex', { chars: C, roster: ROSTER }), 3);
const arcade = () => newRun('arcade', 'tree', { chars: C, roster: ROSTER, foeId: 'rex', arenaId: 'castle' });

test('save: tournament and arcade keep separate runs', () => {
  mem.clear();
  const st = new SaveStore(C);
  st.data.runs.tournament = tourney();
  st.save();
  // starting an arcade fight must not touch the tournament in progress
  st.data.runs.arcade = arcade();
  st.save();
  const back = new SaveStore(C);
  assert.equal(back.data.runs.tournament.mode, 'tournament');
  assert.equal(back.data.runs.tournament.step, 1);
  assert.equal(back.data.runs.tournament.heroId, 'rex');
  assert.equal(back.data.runs.arcade.mode, 'arcade');
  assert.equal(back.data.runs.arcade.heroId, 'tree');
  assert.equal('run' in back.data, false);
});

test('save: an old single `run` migrates into its mode slot', () => {
  const t = tourney();
  const m = migrate({ v: 1, run: t }, C);
  assert.deepEqual(m.runs.tournament, t);
  assert.equal(m.runs.arcade, null);
  assert.equal('run' in m, false);
  const a = migrate({ v: 1, run: arcade() }, C);
  assert.equal(a.runs.arcade.mode, 'arcade');
  assert.equal(a.runs.tournament, null);
  // a run in the wrong slot lands in the right one; broken runs are dropped
  const w = migrate({ v: 1, runs: { tournament: arcade(), arcade: { mode: 'arcade', heroId: 'nobody', path: [] } } }, C);
  assert.equal(w.runs.arcade.heroId, 'tree');
  assert.equal(w.runs.tournament, null);
  assert.deepEqual(migrate({ v: 1 }, C).runs, { tournament: null, arcade: null });
});

test('save: reset really forgets progress, even through the backup', () => {
  mem.clear();
  const st = new SaveStore(C);
  st.data.progress.stars = 12;
  st.data.settings.music = 0.2;
  st.save();
  st.save();
  st.reset();
  assert.equal(st.data.progress.stars, 0);
  assert.equal(st.data.settings.music, 0.2); // settings survive a reset
  assert.equal(JSON.parse(mem.get('tbb.save')).progress.stars, 0);
  assert.ok(!mem.has('tbb.save.bak') || JSON.parse(mem.get('tbb.save.bak')).progress.stars === 0);
  st.save();
  // even if the main copy breaks now, the old 12 stars never come back
  mem.set('tbb.save', '{broken');
  const again = new SaveStore(C);
  assert.equal(again.data.progress.stars, 0);
});

test('save: after a backup restore, the corrupt main never overwrites the good backup', () => {
  mem.clear();
  const st = new SaveStore(C);
  st.data.progress.stars = 7;
  st.save();
  st.save(); // backup now holds 7 stars
  mem.set('tbb.save', '{oops');
  const rec = new SaveStore(C);
  assert.equal(rec.recovered, true);
  assert.equal(rec.data.progress.stars, 7);
  rec.data.progress.stars = 8;
  rec.save();
  assert.equal(JSON.parse(mem.get('tbb.save.bak')).progress.stars, 7, 'backup still good');
  assert.equal(JSON.parse(mem.get('tbb.save')).progress.stars, 8);
  rec.data.progress.stars = 9;
  rec.save(); // main is good again, so it rolls into the backup as usual
  assert.equal(JSON.parse(mem.get('tbb.save.bak')).progress.stars, 8);
  // and a second corruption still recovers
  mem.set('tbb.save', 'nope');
  assert.equal(new SaveStore(C).data.progress.stars, 8);
});
