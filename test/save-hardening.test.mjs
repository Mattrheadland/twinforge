// Save hardening: damaged storage, legacy migration idempotency, three-way profile isolation,
// export/import round trip and rejection, and the parental delete confirmation.
// Cases already covered by save.test.mjs / profiles.test.mjs are not repeated here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS as C } from '../src/data/characters.js';
import { newCampaign } from '../src/game/campaign.js';

const mem = new Map();
globalThis.window = {
  localStorage: {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
  },
};
const { SaveStore, migrate, saveKey } = await import('../src/save.js');
const read = (k) => JSON.parse(mem.get(k));
const snap = () => new Map(mem);

test('hardening: damaged main saves never throw and fall back to a safe default', () => {
  const bad = ['{"v":1,"progress":{"stars":5', '', 'null', '[]', '[1,2]', '"text"', '42', '{"v":99}', '{"v":"1"}', '{}', '{"progress":{"stars":3}}'];
  for (const txt of bad) {
    mem.clear();
    mem.set('tbb.save', txt);
    let st;
    assert.doesNotThrow(() => (st = new SaveStore(C)), `loading ${JSON.stringify(txt)}`);
    assert.equal(st.data.progress.stars, 0, `default for ${JSON.stringify(txt)}`);
    assert.equal(st.data.player.level, 1);
    assert.equal(st.mainOk, false, 'a garbage main is never trusted');
  }
});

test('hardening: garbage main with a good backup recovers and never overwrites the backup', () => {
  const garbage = ['{"v":1,"prog', 'null', '[]', '{"v":2}', '{"v":99}', 'undefined'];
  for (const txt of garbage) {
    mem.clear();
    const st = new SaveStore(C);
    st.data.progress.stars = 7;
    st.save();
    st.save(); // backup holds 7
    const good = mem.get('tbb.save.bak');
    mem.set('tbb.save', txt);
    const rec = new SaveStore(C);
    assert.equal(rec.recovered, true, txt);
    assert.equal(rec.data.progress.stars, 7, txt);
    rec.save();
    assert.equal(mem.get('tbb.save.bak'), good, `backup untouched after saving over ${txt}`);
  }
});

test('hardening: a save with missing or wrong-typed fields loads with a full shape', () => {
  mem.clear();
  mem.set('tbb.save', JSON.stringify({ v: 1, settings: null, progress: null, skills: null, learning: 'x', records: null, player: [], toys: [], runs: 5, campaign: 'zzz', battle: 3 }));
  let st;
  assert.doesNotThrow(() => (st = new SaveStore(C)));
  const d = st.data;
  assert.equal(d.progress.stars, 0);
  assert.deepEqual(d.progress.tutorial, {});
  assert.ok(d.skills.math.level >= 1);
  assert.ok(d.skills.letters.level >= 1);
  assert.deepEqual(d.learning.log, []);
  assert.deepEqual(d.player, { xp: 0, level: 1 });
  assert.deepEqual(d.toys, {});
  assert.equal(d.campaign, null);
  assert.equal(d.battle, null);
  assert.deepEqual(d.runs, { tournament: null, arcade: null });
  assert.ok(Array.isArray(d.settings.offKinds));
});

test('hardening: a damaged profile index and a damaged save in another slot do not throw', () => {
  for (const idx of ['{"v":1,"profiles":[', 'null', '[]', '{"v":1,"profiles":[null,null,null]}', '{"v":9,"profiles":[{}]}']) {
    mem.clear();
    const st = new SaveStore(C);
    st.createProfile(1, { name: 'Sam' });
    st.switchTo(1);
    st.data.progress.stars = 3;
    st.save();
    mem.set('tbb.profiles', idx);
    mem.set(saveKey(0), '{truncated');
    let again;
    assert.doesNotThrow(() => (again = new SaveStore(C)), idx);
    assert.doesNotThrow(() => again.profiles());
    assert.ok(again.index.profiles.some(Boolean));
  }
});

test('hardening: legacy learning records survive migration; migrating twice changes nothing', () => {
  const legacy = {
    v: 1,
    created: 1000,
    updated: 2000,
    settings: { music: 0.3, readAloud: false, offKinds: ['count'] },
    progress: { stars: 14, wins: 5, battles: 8, lastHero: 'rex', tutorial: { intro: true } },
    skills: { math: { level: 3 }, letters: { level: 2 } },
    learning: { v: 1, stats: { count: { n: 4, indep: 3, hint: 1, support: 0 } }, log: [{ t: 5, k: 'count', lv: 1, q: 'indep' }], levels: [], days: { '2026-01-01': { n: 4, indep: 3 } } },
    records: { trophies: 3, arcadeWins: 2, campaignCleared: { rex: true } },
  };
  mem.clear();
  mem.set('tbb.save', JSON.stringify(legacy));
  const st = new SaveStore(C);
  assert.equal(st.slot, 0);
  assert.equal(st.data.progress.stars, 14);
  assert.equal(st.data.progress.tutorial.intro, true);
  assert.equal(st.data.skills.math.level, 3);
  assert.equal(st.data.settings.music, 0.3);
  assert.deepEqual(st.data.settings.offKinds, ['count']);
  assert.equal(st.data.learning.stats.count.n, 4);
  assert.equal(st.data.learning.log.length, 1);
  assert.equal(st.data.learning.days['2026-01-01'].indep, 3);
  assert.equal(st.data.records.trophies, 3);
  assert.equal(st.data.records.arcadeWins, 2);
  assert.deepEqual(st.data.records.campaignCleared, { rex: true });

  // idempotent: migrate(migrate(x)) deep-equals migrate(x)
  const once = migrate(legacy, C);
  const twice = migrate(once, C);
  assert.deepEqual(twice, once);
  assert.deepEqual(migrate(JSON.parse(JSON.stringify(twice)), C), once);

  // and a save/reload cycle is stable too
  st.save();
  const first = read('tbb.save');
  const again = new SaveStore(C);
  again.data.updated = first.updated;
  assert.deepEqual(JSON.parse(JSON.stringify(again.data)), first);
});

test('hardening: profiles A, B and C stay isolated across switches and reloads', () => {
  mem.clear();
  const st = new SaveStore(C);
  st.createProfile(1, { name: 'Sam' });
  st.createProfile(2, { name: 'Ava' });
  st.switchTo(1);
  st.data.player = { xp: 111, level: 2 };
  st.data.toys.tree = { xp: 5, level: 2, kit: ['a'] };
  st.data.progress.stars = 11;
  st.save();
  st.switchTo(2);
  st.data.player = { xp: 222, level: 3 };
  st.data.progress.stars = 22;
  st.data.skills.math.level = 2;
  st.save();
  const view = (store, slot) => {
    const d = store.peek(slot);
    return JSON.stringify({ p: d.player, t: d.toys, s: d.progress.stars, sk: d.skills, l: d.learning, c: d.campaign });
  };
  st.switchTo(1);
  st.save();
  const bBefore = view(st, 1);
  const cBefore = view(st, 2);

  // change everything on A
  st.switchTo(0);
  st.data.player = { xp: 9999, level: 9 };
  st.data.toys.rex = { xp: 300, level: 5, kit: ['x', 'y'] };
  st.data.progress.stars = 99;
  st.data.skills.letters.level = 5;
  st.data.learning.log.push({ t: 1, k: 'count', lv: 1, q: 'indep' });
  st.data.learning.stats.count = { n: 1, indep: 1, hint: 0, support: 0 };
  st.data.campaign = newCampaign('rex');
  st.save();
  assert.equal(view(st, 1), bBefore, 'B unchanged after A edits');
  assert.equal(view(st, 2), cBefore, 'C unchanged after A edits');

  // round trip through storage
  const re = new SaveStore(C);
  assert.equal(re.slot, 0);
  assert.equal(re.data.player.xp, 9999);
  assert.ok(re.data.campaign, 'campaign persisted for A');
  assert.equal(view(re, 1), bBefore);
  assert.equal(view(re, 2), cBefore);
  re.switchTo(1);
  assert.equal(re.data.progress.stars, 11);
  assert.equal(re.data.player.level, 2);
  assert.equal(re.data.campaign, null);
  assert.equal(re.data.learning.log.length, 0);
  assert.equal(re.data.toys.rex, undefined);
  re.switchTo(2);
  assert.equal(re.data.player.xp, 222);
  assert.equal(re.data.skills.letters.level, 1);
  assert.deepEqual(re.data.toys, {});
});

test('hardening: export then import round-trips exactly', () => {
  mem.clear();
  const st = new SaveStore(C);
  st.data.progress.stars = 4;
  st.data.player = { xp: 500, level: 4 };
  st.data.toys.rex = { xp: 40, level: 2 };
  st.data.campaign = newCampaign('rex');
  st.data.learning.log.push({ t: 1, k: 'count', lv: 1, q: 'indep' });
  st.save();
  st.createProfile(1, { name: 'Sam', avatar: 'rex', pathway: 'growing' });
  st.switchTo(1);
  st.data.progress.stars = 8;
  st.save();
  const file = st.exportText();

  mem.clear();
  const other = new SaveStore(C);
  other.importText(file);
  const out = other.exportText();
  const a = JSON.parse(file);
  const b = JSON.parse(out);
  // saving stamps `updated`; everything else must match exactly
  for (const x of [a, b]) for (const p of x.players) if (p) delete p.updated;
  assert.deepEqual(b.index, a.index);
  assert.deepEqual(b.players, a.players);
});

test('hardening: importing a malformed file is rejected and leaves the save untouched', () => {
  mem.clear();
  const st = new SaveStore(C);
  st.data.progress.stars = 6;
  st.save();
  st.save();
  const good = st.exportText();
  const before = snap();
  const stars = st.data.progress.stars;
  const bads = [
    '', '{', '{"app":"twinforge","v":1,"progress":', 'null', '[]', '42', '"x"',
    JSON.stringify({ app: 'twinforge', v: 99 }),
    JSON.stringify({ app: 'twinforge' }),
    JSON.stringify({ app: 'other', v: 1 }),
    JSON.stringify({ app: 'twinforge', kind: 'household', v: 1, index: null, players: [] }),
    JSON.stringify({ app: 'twinforge', kind: 'household', v: 1, index: { v: 1, profiles: [null, null, null] }, players: [] }),
    good.slice(0, good.length >> 1),
  ];
  for (const txt of bads) {
    const label = JSON.stringify(txt).slice(0, 60);
    assert.throws(() => st.importText(txt), undefined, label);
    assert.deepEqual(snap(), before, `storage unchanged after ${label}`);
    assert.equal(st.data.progress.stars, stars, 'live data unchanged');
  }
});

test('hardening: deleting a profile needs the parental name confirmation', () => {
  mem.clear();
  const st = new SaveStore(C);
  st.createProfile(1, { name: 'Sam' });
  st.createProfile(2, { name: 'Ava' });
  const before = snap();
  for (const wrong of [undefined, null, '', ' Sam', 'Sam ', 'SAM', 'Ava', 0]) {
    assert.throws(() => st.deleteProfile(1, wrong), /does not match/, String(wrong));
  }
  assert.deepEqual(snap(), before, 'nothing removed without the exact name');
  assert.ok(st.index.profiles[1]);
  assert.throws(() => st.deleteProfile(5, 'x'), /no such player slot/);
  assert.throws(() => st.deleteProfile(-1, 'x'), /no such player slot/);
  assert.equal(st.deleteProfile(1, 'Sam'), true);
  assert.equal(st.index.profiles[1], null);
  assert.ok(st.index.profiles[2], 'sibling kept');
});
