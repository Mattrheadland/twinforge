// Three player profiles: legacy migration, isolation, deletion, backups, damaged storage.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS as C, ROSTER } from '../src/data/characters.js';
import { newRun } from '../src/game/modes.js';

const mem = new Map();
globalThis.window = {
  localStorage: {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
  },
};
const { SaveStore, migrate, saveKey, backupKey, cleanName, PROFILE_SLOTS } = await import('../src/save.js');
const read = (k) => JSON.parse(mem.get(k));

// a save exactly as the pre-profile build wrote it (no rev, player or toys)
function legacySave() {
  const d = migrate({ v: 1 }, C);
  delete d.rev;
  delete d.player;
  delete d.toys;
  d.progress.stars = 23;
  d.progress.wins = 9;
  d.progress.lastHero = 'tree';
  d.settings.music = 0.25;
  d.settings.readAloud = false;
  d.skills.math.level = 4;
  d.records.trophies = 2;
  d.runs.arcade = newRun('arcade', 'tree', { chars: C, roster: ROSTER, foeId: 'rex', arenaId: 'castle' });
  return d;
}

test('profiles: a pre-profile save becomes player 1 with nothing lost', () => {
  mem.clear();
  const old = legacySave();
  mem.set('tbb.save', JSON.stringify(old));
  mem.set('tbb.save.bak', JSON.stringify(old));
  const before = mem.get('tbb.save');
  const st = new SaveStore(C);
  assert.equal(st.slot, 0);
  assert.equal(st.profile.name, 'Player 1');
  assert.equal(st.data.progress.stars, 23);
  assert.equal(st.data.progress.wins, 9);
  assert.equal(st.data.progress.lastHero, 'tree');
  assert.equal(st.data.settings.music, 0.25);
  assert.equal(st.data.settings.readAloud, false);
  assert.equal(st.data.skills.math.level, 4);
  assert.equal(st.data.records.trophies, 2);
  assert.equal(st.data.runs.arcade.heroId, 'tree');
  assert.deepEqual(st.data.player, { xp: 0, level: 1 });
  assert.deepEqual(st.data.toys, {});
  // loading alone writes nothing; the first save adds the index and keeps v:1
  assert.equal(mem.get('tbb.save'), before);
  assert.equal(mem.has('tbb.profiles'), false);
  st.save();
  assert.ok(mem.has('tbb.profiles'));
  assert.equal(read('tbb.save').v, 1, 'older cached builds still accept the save');
  assert.equal(read('tbb.save').rev, 2);
  assert.equal(read('tbb.save.bak').progress.stars, 23);
  assert.deepEqual(st.profiles().map((p) => !p.empty), [true, false, false]);
});

test('profiles: an older build reading a v6 save keeps the new fields', () => {
  // the old migrate() spreads the raw save, so unknown fields round-trip
  const v6 = migrate({ v: 1, player: { xp: 420, level: 7 }, toys: { rex: { xp: 90, level: 3, evo: 1 } } }, C);
  const oldBuild = { ...v6 }; // what `{ ...base, ...raw }` keeps
  assert.deepEqual(migrate(oldBuild, C).player, { xp: 420, level: 7 });
  assert.equal(migrate(oldBuild, C).toys.rex.evo, 1);
});

test('profiles: first run gets one player and two open slots', () => {
  mem.clear();
  const st = new SaveStore(C);
  assert.equal(st.slot, 0);
  assert.deepEqual(st.profiles().map((p) => p.empty), [false, true, true]);
  assert.equal(st.data.progress.stars, 0);
});

test('profiles: players never share progress', () => {
  mem.clear();
  const st = new SaveStore(C);
  st.data.progress.stars = 5;
  st.data.skills.letters.level = 3;
  st.data.learning.log.push({ t: 1, d: 'math', k: 'count', l: 1, r: 'first' });
  st.data.campaign = null;
  st.data.player = { xp: 300, level: 4 };
  st.data.toys.rex = { xp: 50, level: 2 };
  st.save();
  st.createProfile(1, { name: 'Sam', avatar: 'rex', pathway: 'growing' });
  st.switchTo(1);
  assert.equal(st.slot, 1);
  assert.equal(st.data.progress.stars, 0);
  assert.equal(st.data.skills.letters.level, 1);
  assert.equal(st.data.learning.log.length, 0);
  assert.deepEqual(st.data.player, { xp: 0, level: 1 });
  assert.deepEqual(st.data.toys, {});
  st.data.progress.stars = 2;
  st.data.runs.tournament = newRun('tournament', 'tree', { chars: C, roster: ROSTER });
  st.save();
  st.switchTo(0);
  assert.equal(st.data.progress.stars, 5);
  assert.equal(st.data.runs.tournament, null);
  assert.equal(st.data.learning.log.length, 1);
  assert.equal(st.data.toys.rex.xp, 50);
  // after a restart the last player picked is the one that loads, with their own data
  st.switchTo(1);
  const again = new SaveStore(C);
  assert.equal(again.slot, 1);
  assert.equal(again.profile.name, 'Sam');
  assert.equal(again.profile.pathway, 'growing');
  assert.equal(again.data.progress.stars, 2);
  assert.equal(again.data.runs.tournament.heroId, 'tree');
  assert.equal(read(saveKey(0)).progress.stars, 5);
});

test('profiles: sound and look follow the device, learning settings follow the child', () => {
  mem.clear();
  const st = new SaveStore(C);
  st.data.settings.readAloud = false;
  st.data.settings.offKinds = ['rhyme'];
  st.save();
  st.createProfile(2, { name: 'Ava' });
  st.data.settings.music = 0.1;
  st.data.settings.reducedMotion = true;
  st.save();
  st.switchTo(2);
  assert.equal(st.data.settings.music, 0.1);
  assert.equal(st.data.settings.reducedMotion, true);
  assert.equal(st.data.settings.readAloud, true, 'a new child starts with read-aloud on');
  assert.deepEqual(st.data.settings.offKinds, []);
  st.data.settings.sfx = 0.3;
  st.switchTo(0);
  assert.equal(st.data.settings.sfx, 0.3);
  assert.equal(st.data.settings.readAloud, false);
  assert.deepEqual(st.data.settings.offKinds, ['rhyme']);
});

test('profiles: three slots at most, names are cleaned, avatars must be real toys', () => {
  mem.clear();
  const st = new SaveStore(C);
  st.createProfile(1, { name: '  <b>Super  Long Name Here</b>  ', avatar: 'nobody' });
  assert.equal(st.index.profiles[1].name.length <= 12, true);
  assert.equal(st.index.profiles[1].name.includes('<'), false);
  assert.equal(st.index.profiles[1].avatar, null);
  assert.equal(st.index.profiles[1].pathway, 'early');
  st.createProfile(2, { name: '' });
  assert.equal(st.index.profiles[2].name, 'Player 3');
  assert.throws(() => st.createProfile(2, { name: 'X' }), /taken/);
  assert.throws(() => st.createProfile(3, { name: 'X' }), /no such player slot/);
  assert.throws(() => st.switchTo(-1), /no such player slot/);
  assert.equal(PROFILE_SLOTS, 3);
  assert.equal(cleanName('\u0000\u0007', 'Fallback'), 'Fallback');
  st.updateProfile(1, { name: 'Mia', avatar: 'witch', pathway: 'growing' });
  assert.deepEqual([st.index.profiles[1].name, st.index.profiles[1].avatar, st.index.profiles[1].pathway], ['Mia', 'witch', 'growing']);
  st.updateProfile(1, { pathway: 'expert' });
  assert.equal(st.index.profiles[1].pathway, 'early', 'unknown pathways fall back');
});

test('profiles: deleting needs the exact name and never touches siblings', () => {
  mem.clear();
  const st = new SaveStore(C);
  st.data.progress.stars = 4;
  st.save();
  st.createProfile(1, { name: 'Sam' });
  st.createProfile(2, { name: 'Ava' });
  st.switchTo(2);
  st.data.progress.stars = 6;
  st.save();
  st.switchTo(1);
  st.data.progress.stars = 9;
  st.save();
  assert.throws(() => st.deleteProfile(1, 'sam'), /does not match/);
  assert.throws(() => st.deleteProfile(1), /does not match/);
  assert.ok(mem.has(saveKey(1)));
  // deleting the active player moves to another one first
  st.deleteProfile(1, 'Sam');
  assert.notEqual(st.slot, 1);
  assert.equal(mem.has(saveKey(1)), false);
  assert.equal(mem.has(backupKey(1)), false);
  assert.equal(st.index.profiles[1], null);
  assert.equal(read(saveKey(0)).progress.stars, 4);
  assert.equal(read(saveKey(2)).progress.stars, 6);
  // a new player in the freed slot starts clean
  st.createProfile(1, { name: 'Leo' });
  st.switchTo(1);
  assert.equal(st.data.progress.stars, 0);
  // the last player can't be deleted (Reset progress is for that)
  st.deleteProfile(1, 'Leo');
  st.deleteProfile(2, 'Ava');
  assert.throws(() => st.deleteProfile(0, 'Player 1'), /only player/);
});

test('profiles: a stale save left by an interrupted delete never comes back', () => {
  mem.clear();
  const st = new SaveStore(C);
  st.createProfile(1, { name: 'Sam' });
  st.switchTo(1);
  st.data.progress.stars = 30;
  st.save();
  st.switchTo(0);
  // the index was updated but the page died before the save keys were removed
  st.index.profiles[1] = null;
  st.writeIndex();
  const again = new SaveStore(C);
  assert.equal(again.index.profiles[1], null);
  again.createProfile(1, { name: 'New' });
  again.switchTo(1);
  assert.equal(again.data.progress.stars, 0);
});

test('profiles: a broken index is rebuilt from the saves that exist', () => {
  mem.clear();
  const st = new SaveStore(C);
  st.data.progress.stars = 3;
  st.save();
  st.createProfile(2, { name: 'Ava' });
  st.switchTo(2);
  st.data.progress.stars = 8;
  st.save();
  mem.set('tbb.profiles', '{not json');
  const again = new SaveStore(C);
  assert.deepEqual(again.profiles().map((p) => p.empty), [false, true, false]);
  assert.equal(again.profiles()[2].stars, 8);
  assert.equal(again.profiles()[0].stars, 3);
  // an index listing nobody is also rebuilt
  mem.set('tbb.profiles', JSON.stringify({ v: 1, active: 0, profiles: [null, null, null] }));
  assert.deepEqual(new SaveStore(C).profiles().map((p) => p.empty), [false, true, false]);
  // an index from a newer build is not trusted
  mem.set('tbb.profiles', JSON.stringify({ v: 99, active: 0, profiles: [{ name: 'X' }] }));
  assert.deepEqual(new SaveStore(C).profiles().map((p) => p.empty), [false, true, false]);
});

test('profiles: one player’s damaged save recovers from its own backup only', () => {
  mem.clear();
  const st = new SaveStore(C);
  st.data.progress.stars = 1;
  st.save();
  st.createProfile(1, { name: 'Sam' });
  st.switchTo(1);
  st.data.progress.stars = 7;
  st.save();
  st.data.progress.stars = 8;
  st.save(); // Sam's backup holds 7
  mem.set(saveKey(1), '{oops');
  const again = new SaveStore(C);
  assert.equal(again.slot, 1);
  assert.equal(again.recovered, true);
  assert.equal(again.data.progress.stars, 7);
  again.switchTo(0);
  assert.equal(again.recovered, false);
  assert.equal(again.data.progress.stars, 1);
  // a player whose save and backup are both gone starts fresh without crashing
  mem.delete(saveKey(1));
  mem.delete(backupKey(1));
  again.switchTo(1);
  assert.equal(again.data.progress.stars, 0);
});

test('profiles: reset clears only the active player', () => {
  mem.clear();
  const st = new SaveStore(C);
  st.data.progress.stars = 12;
  st.save();
  st.createProfile(1, { name: 'Sam' });
  st.switchTo(1);
  st.data.progress.stars = 5;
  st.save();
  st.save();
  st.reset();
  assert.equal(st.data.progress.stars, 0);
  assert.equal(read(saveKey(0)).progress.stars, 12);
  mem.set(saveKey(1), '{broken');
  assert.equal(new SaveStore(C).data.progress.stars, 0, 'reset progress never comes back through the backup');
});

test('profiles: a household backup restores every player; old single backups still import', () => {
  mem.clear();
  const st = new SaveStore(C);
  st.data.progress.stars = 4;
  st.data.settings.music = 0.4;
  st.save();
  st.createProfile(1, { name: 'Sam', avatar: 'rex', pathway: 'growing' });
  st.switchTo(1);
  st.data.progress.stars = 11;
  st.data.toys.tree = { xp: 12, level: 2 };
  st.save();
  const file = st.exportText();
  const parsed = JSON.parse(file);
  assert.equal(parsed.kind, 'household');
  assert.equal(parsed.players.length, 3);

  // a different device (or the home-screen app vs Safari) with its own player and sound
  mem.clear();
  const other = new SaveStore(C);
  other.data.progress.stars = 2;
  other.data.settings.music = 0.9;
  other.save();
  other.createProfile(2, { name: 'Local' });
  other.importText(file);
  assert.equal(other.slot, 1);
  assert.equal(other.profile.name, 'Sam');
  assert.equal(other.profile.pathway, 'growing');
  assert.equal(other.data.progress.stars, 11);
  assert.equal(other.data.toys.tree.xp, 12);
  assert.equal(other.data.settings.music, 0.9, 'this device keeps its own sound');
  assert.equal(other.index.profiles[2].name, 'Local', 'a player the backup doesn’t have is kept');
  other.switchTo(0);
  assert.equal(other.data.progress.stars, 4);
  assert.equal(read(backupKey(0)).progress.stars, 2, 'the overwritten player stays one step back');

  // a bad household file changes nothing
  const snapshot = new Map(mem);
  const bad = JSON.parse(file);
  bad.players[1] = { v: 7 };
  assert.throws(() => other.importText(JSON.stringify(bad)));
  assert.deepEqual(new Map(mem), snapshot);

  // a backup from before profiles lands in the active player only
  const single = JSON.stringify({ app: 'twinforge', ...legacySave() });
  other.switchTo(2);
  other.importText(single);
  assert.equal(other.data.progress.stars, 23);
  assert.equal(read(saveKey(0)).progress.stars, 4);
  assert.throws(() => other.importText(JSON.stringify({ app: 'something-else', v: 1 })), /not a TwinForge backup/);
});

test('profiles: per-toy and player records are sanitised on load', () => {
  const m = migrate({ v: 1, player: { xp: -5, level: 500 }, toys: { rex: { xp: 'lots', level: 0 }, nobody: { xp: 1 }, tree: 7 } }, C);
  assert.deepEqual(m.player, { xp: 0, level: 100 });
  assert.deepEqual(m.toys, { rex: { xp: 0, level: 1 } });
});

test('profiles: without storage the game still runs as one player', () => {
  const saved = globalThis.window;
  globalThis.window = {};
  try {
    const st = new SaveStore(C);
    assert.equal(st.available, false);
    assert.equal(st.profile.name, 'Player 1');
    assert.equal(st.save(), false);
    assert.doesNotThrow(() => st.createProfile(1, { name: 'Sam' }));
    st.switchTo(1);
    assert.equal(st.data.progress.stars, 0);
  } finally {
    globalThis.window = saved;
  }
});
