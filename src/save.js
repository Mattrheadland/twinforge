// Versioned local save with a rolling backup copy and export/import, split into
// up to three player profiles.
//
// Storage layout (localStorage):
//   tbb.profiles          profile index: names, avatars, learning pathway, which one is active,
//                         and the household settings shared by every player (sound, motion, look)
//   tbb.save / .bak       player 1  (the pre-profile save lives here untouched, so it simply
//                         becomes player 1 with no rewrite)
//   tbb.save.2 / .bak     player 2
//   tbb.save.3 / .bak     player 3
//
// Each player's save keeps `v: 1` on purpose. Older cached builds of the game (the service
// worker can serve one for a while after a deploy) only accept v <= 1, and their migrate()
// keeps unknown fields, so they read and write a v6 save without losing the new data. The new
// player fields (xp, toys) are additive and tagged `rev: 2`. Older builds ignore tbb.profiles
// and simply keep playing as player 1.
import { defaultSkills } from './logic/difficulty.js';
import { isValidBattle } from './logic/battle.js';
import { defaultRecords, isValidRun } from './game/modes.js';
import { defaultLearning, normalizeLearning } from './logic/learning-log.js';
import { isValidCampaign } from './game/campaign.js';

export const SAVE_VERSION = 1;
export const SAVE_REV = 2; // additive revision: player xp + per-toy records
export const PROFILE_SLOTS = 3;
export const PATHWAYS = ['early', 'growing']; // Early learner (3–5), Growing learner (5–7)
export const MAX_PLAYER_LEVEL = 100;
export const NAME_MAX = 12;
// settings that belong to the device, not to a child: switching players keeps these
export const DEVICE_SETTINGS = ['music', 'sfx', 'reducedMotion', 'haptics', 'showFps', 'tvLook', 'pixelArt'];
const KEY = 'tbb.save';
const IDX = 'tbb.profiles';
const INDEX_VERSION = 1;

export const saveKey = (slot) => (slot === 0 ? KEY : `${KEY}.${slot + 1}`);
export const backupKey = (slot) => `${saveKey(slot)}.bak`;

export function defaultSave() {
  return {
    v: SAVE_VERSION,
    rev: SAVE_REV,
    created: Date.now(),
    updated: Date.now(),
    settings: {
      music: 0.6,
      sfx: 0.9,
      reducedMotion: matchMediaSafe('(prefers-reduced-motion: reduce)'),
      haptics: true,
      showFps: false,
      tvLook: true,
      learning: true,
      readAloud: true, // the phone's voice reads each question (audio/speech.js)
      pixelArt: true,
      offKinds: [], // question types switched off in the learning report
    },
    progress: { stars: 0, wins: 0, battles: 0, lastHero: null, tutorial: {} },
    skills: defaultSkills(),
    learning: defaultLearning(), // answer log behind the grown-up learning report
    battle: null, // snapshot of an unfinished battle (taken at the start of each hero turn)
    runs: { tournament: null, arcade: null }, // each mode's run in progress (game/modes.js)
    campaign: null, // the campaign board in progress (game/campaign.js)
    records: defaultRecords(), // story clears, trophies, best arcade streak
    player: { xp: 0, level: 1 }, // player experience (independent of learning levels)
    toys: {}, // per-toy experience, evolutions, armor and move loadouts: { [toyId]: { xp, level, ... } }
  };
}

function matchMediaSafe(q) {
  try {
    return !!window.matchMedia(q).matches;
  } catch {
    return false;
  }
}

const int = (n, lo, hi) => Math.max(lo, Math.min(hi, Math.floor(Number.isFinite(+n) ? +n : lo)));
const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);

function normalizeToys(raw, chars) {
  const out = {};
  if (!isObj(raw)) return out;
  for (const [id, t] of Object.entries(raw)) {
    if (!isObj(t)) continue;
    if (chars && !chars[id]) continue; // a toy this build doesn't know
    out[id] = { ...t, xp: int(t.xp, 0, Number.MAX_SAFE_INTEGER), level: int(t.level || 1, 1, MAX_PLAYER_LEVEL) };
  }
  return out;
}

// Bring any older/partial save up to the current shape.
export function migrate(raw, chars) {
  if (!raw || typeof raw !== 'object') throw new Error('not a save');
  if (typeof raw.v !== 'number' || raw.v > SAVE_VERSION) throw new Error('unknown save version');
  const base = defaultSave();
  const out = {
    ...base,
    ...raw,
    v: SAVE_VERSION,
    rev: SAVE_REV,
    settings: { ...base.settings, ...(raw.settings || {}) },
    progress: { ...base.progress, ...(raw.progress || {}), tutorial: { ...(raw.progress?.tutorial || {}) } },
    skills: {
      math: { ...base.skills.math, ...(raw.skills?.math || {}) },
      letters: { ...base.skills.letters, ...(raw.skills?.letters || {}) },
    },
  };
  out.learning = normalizeLearning(raw.learning);
  if (!Array.isArray(out.settings.offKinds)) out.settings.offKinds = [];
  if (out.battle && !isValidBattle(out.battle, chars)) out.battle = null;
  // one run per mode; older saves kept a single shared `run`
  const runs = { ...base.runs };
  for (const r of [raw.runs?.tournament, raw.runs?.arcade, raw.run]) {
    if (r && isValidRun(r, chars) && !runs[r.mode]) runs[r.mode] = r;
  }
  out.runs = runs;
  delete out.run;
  delete out.profile; // a single-player export carries its profile card; that lives in the index
  if (out.campaign && !isValidCampaign(out.campaign, chars)) out.campaign = null;
  const rec = raw.records || {};
  out.records = { ...defaultRecords(), trophies: rec.trophies || 0, arcadeWins: rec.arcadeWins || 0, campaignCleared: { ...(rec.campaignCleared || {}) } };
  out.progress.stars = Math.max(0, Math.floor(out.progress.stars || 0));
  const pl = isObj(raw.player) ? raw.player : {};
  out.player = { ...pl, xp: int(pl.xp, 0, Number.MAX_SAFE_INTEGER), level: int(pl.level || 1, 1, MAX_PLAYER_LEVEL) };
  out.toys = normalizeToys(raw.toys, chars);
  return out;
}

// A grown-up typed this; keep it short, printable and never empty.
export function cleanName(name, fallback) {
  const s = String(name ?? '')
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return [...s].slice(0, NAME_MAX).join('') || fallback;
}

function normalizeProfile(p, i, chars) {
  if (!isObj(p)) return null;
  return {
    name: cleanName(p.name, `Player ${i + 1}`),
    avatar: chars && p.avatar && !chars[p.avatar] ? null : p.avatar || null,
    pathway: PATHWAYS.includes(p.pathway) ? p.pathway : PATHWAYS[0],
    created: Number.isFinite(p.created) ? p.created : Date.now(),
  };
}

export function normalizeIndex(raw, chars) {
  if (!isObj(raw) || typeof raw.v !== 'number' || raw.v > INDEX_VERSION || !Array.isArray(raw.profiles)) throw new Error('not a profile index');
  const profiles = [];
  for (let i = 0; i < PROFILE_SLOTS; i++) profiles.push(normalizeProfile(raw.profiles[i], i, chars));
  if (!profiles.some(Boolean)) throw new Error('no players');
  let active = int(raw.active, 0, PROFILE_SLOTS - 1);
  if (!profiles[active]) active = profiles.findIndex(Boolean);
  const device = {};
  if (isObj(raw.device)) for (const k of DEVICE_SETTINGS) if (k in raw.device) device[k] = raw.device[k];
  return { v: INDEX_VERSION, active, profiles, device };
}

function storage() {
  try {
    const ls = window.localStorage;
    const k = '__tbb_probe';
    ls.setItem(k, '1');
    ls.removeItem(k);
    return ls;
  } catch {
    return null;
  }
}

function pickDevice(settings) {
  const d = {};
  for (const k of DEVICE_SETTINGS) if (settings && k in settings) d[k] = settings[k];
  return d;
}

export class SaveStore {
  constructor(chars) {
    this.chars = chars;
    this.ls = storage();
    this.available = !!this.ls;
    this.index = this.loadIndex();
    this.slot = this.index.active;
    this.data = this.load(this.slot);
    this.adoptDevice();
  }

  // ---------------- profile index ----------------
  loadIndex() {
    const fresh = (profiles) => ({ v: INDEX_VERSION, active: Math.max(0, profiles.findIndex(Boolean)), profiles, device: {} });
    if (!this.ls) return fresh([normalizeProfile({}, 0), null, null]);
    try {
      const txt = this.ls.getItem(IDX);
      if (txt) return normalizeIndex(JSON.parse(txt), this.chars);
    } catch {
      /* rebuild below; names are lost but every player's progress is kept */
    }
    // No index yet (a pre-profile save, or a first run) or a broken one: rebuild it from the
    // saves that exist. A first run, or a lone legacy save, becomes player 1.
    const profiles = [];
    for (let i = 0; i < PROFILE_SLOTS; i++) {
      const has = this.ls.getItem(saveKey(i)) != null || this.ls.getItem(backupKey(i)) != null;
      profiles.push(has || i === 0 ? normalizeProfile({}, i) : null);
    }
    const idx = fresh(profiles);
    this.indexRebuilt = true;
    return idx;
  }

  writeIndex() {
    if (!this.ls) return false;
    try {
      this.ls.setItem(IDX, JSON.stringify(this.index));
      return true;
    } catch {
      return false;
    }
  }

  // household settings (sound, motion, look) live in the index and follow every player
  adoptDevice() {
    const dev = this.index.device;
    if (Object.keys(dev).length) Object.assign(this.data.settings, dev);
    else this.index.device = pickDevice(this.data.settings);
  }

  get profile() {
    return this.index.profiles[this.slot];
  }

  profiles() {
    return this.index.profiles.map((p, slot) => {
      if (!p) return { slot, empty: true };
      const d = slot === this.slot ? this.data : this.peek(slot);
      return {
        slot,
        empty: false,
        active: slot === this.slot,
        ...p,
        stars: d?.progress?.stars || 0,
        level: d?.player?.level || 1,
      };
    });
  }

  // read another player's save without making it active (for the picker)
  peek(slot) {
    if (!this.ls) return null;
    for (const key of [saveKey(slot), backupKey(slot)]) {
      try {
        const txt = this.ls.getItem(key);
        if (txt) return migrate(JSON.parse(txt), this.chars);
      } catch {
        /* try the backup */
      }
    }
    return null;
  }

  checkSlot(slot) {
    if (!Number.isInteger(slot) || slot < 0 || slot >= PROFILE_SLOTS) throw new Error('no such player slot');
  }

  switchTo(slot) {
    this.checkSlot(slot);
    if (!this.index.profiles[slot]) throw new Error('that player slot is empty');
    if (slot === this.slot) return this.data;
    this.save(); // the current player's progress first
    const dev = pickDevice(this.data.settings);
    this.slot = slot;
    this.index.active = slot;
    this.index.device = dev;
    this.data = this.load(slot);
    Object.assign(this.data.settings, dev);
    this.writeIndex();
    return this.data;
  }

  createProfile(slot, { name, avatar, pathway } = {}) {
    this.checkSlot(slot);
    if (this.index.profiles[slot]) throw new Error('that player slot is taken');
    // anything left over from a deleted player in this slot goes first
    this.removeKeys(slot);
    const p = normalizeProfile({ name, avatar, pathway, created: Date.now() }, slot, this.chars);
    const d = defaultSave();
    Object.assign(d.settings, pickDevice(this.data.settings));
    if (this.ls) {
      try {
        this.ls.setItem(saveKey(slot), JSON.stringify(d));
      } catch {
        throw new Error('storage is full');
      }
    }
    this.index.profiles[slot] = p;
    this.writeIndex();
    return p;
  }

  updateProfile(slot, changes = {}) {
    this.checkSlot(slot);
    const cur = this.index.profiles[slot];
    if (!cur) throw new Error('that player slot is empty');
    const next = normalizeProfile({ ...cur, ...changes, created: cur.created }, slot, this.chars);
    this.index.profiles[slot] = next;
    this.writeIndex();
    return next;
  }

  // Grown-up only: the caller must pass the player's name exactly as shown, so a stray tap
  // can never erase a sibling. The last player can't be deleted (use Reset progress).
  deleteProfile(slot, confirmName) {
    this.checkSlot(slot);
    const p = this.index.profiles[slot];
    if (!p) throw new Error('that player slot is empty');
    if (confirmName !== p.name) throw new Error('name does not match');
    if (this.index.profiles.filter(Boolean).length < 2) throw new Error('cannot delete the only player');
    if (slot === this.slot) this.switchTo(this.index.profiles.findIndex((q, i) => q && i !== slot));
    // index first: if the page dies before the keys go, the player is already gone from the
    // list and the stale keys are cleared when the slot is next used
    this.index.profiles[slot] = null;
    this.writeIndex();
    this.removeKeys(slot);
    return true;
  }

  removeKeys(slot) {
    if (!this.ls) return;
    try {
      this.ls.removeItem(saveKey(slot));
      this.ls.removeItem(backupKey(slot));
    } catch {}
  }

  // ---------------- the active player's save ----------------
  load(slot = this.slot) {
    this.recovered = false;
    this.mainOk = false;
    if (!this.ls) return defaultSave();
    for (const key of [saveKey(slot), backupKey(slot)]) {
      try {
        const txt = this.ls.getItem(key);
        if (!txt) continue;
        const d = migrate(JSON.parse(txt), this.chars);
        this.recovered = key === backupKey(slot);
        // a main save that didn't load must never be copied over the good backup
        this.mainOk = key === saveKey(slot);
        return d;
      } catch {
        /* try the backup */
      }
    }
    return defaultSave();
  }

  save() {
    this.data.updated = Date.now();
    if (!this.ls) return false;
    const KEY_ = saveKey(this.slot);
    try {
      const prev = this.ls.getItem(KEY_);
      if (prev && this.mainOk) this.ls.setItem(backupKey(this.slot), prev);
      this.ls.setItem(KEY_, JSON.stringify(this.data));
      this.mainOk = true;
    } catch {
      return false;
    }
    const dev = pickDevice(this.data.settings);
    if (JSON.stringify(dev) !== JSON.stringify(this.index.device) || this.indexRebuilt) {
      this.index.device = dev;
      this.indexRebuilt = !this.writeIndex();
    }
    return true;
  }

  // ---------------- backups ----------------
  // One file holds every player, so a family moves between Safari and the home-screen app
  // (iPhone keeps separate storage for each) or to a new phone in one go.
  exportText() {
    this.save();
    const players = [];
    for (let i = 0; i < PROFILE_SLOTS; i++) players.push(this.index.profiles[i] ? (i === this.slot ? this.data : this.peek(i)) : null);
    return JSON.stringify({ app: 'twinforge', kind: 'household', v: INDEX_VERSION, index: this.index, players }, null, 2);
  }

  importText(txt) {
    const raw = JSON.parse(txt);
    // 'toy-box-battleground' = backups made before the game was renamed
    if (raw.app && raw.app !== 'twinforge' && raw.app !== 'toy-box-battleground') throw new Error('not a TwinForge backup');
    if (raw.kind === 'household') return this.importHousehold(raw);
    delete raw.app;
    // a single-player backup (every backup made before profiles) replaces the active player
    this.data = migrate(raw, this.chars);
    this.save();
    return this.data;
  }

  importHousehold(raw) {
    const index = normalizeIndex(raw.index, this.chars);
    const players = Array.isArray(raw.players) ? raw.players : [];
    // validate everything before touching storage, so a bad file changes nothing
    const datas = index.profiles.map((p, i) => (p ? migrate(players[i] || { v: SAVE_VERSION }, this.chars) : null));
    const dev = pickDevice(this.data.settings); // this device keeps its own sound/look
    this.save();
    const profiles = [];
    for (let i = 0; i < PROFILE_SLOTS; i++) {
      if (!datas[i]) {
        // the backup has nobody here: a player who exists only on this device stays
        profiles.push(this.index.profiles[i]);
        continue;
      }
      Object.assign(datas[i].settings, dev);
      if (this.ls) {
        const prev = this.ls.getItem(saveKey(i));
        if (prev) this.ls.setItem(backupKey(i), prev); // the overwritten save stays one step back
        this.ls.setItem(saveKey(i), JSON.stringify(datas[i]));
      }
      profiles.push(index.profiles[i]);
    }
    this.index = { ...index, profiles, device: dev };
    this.slot = index.active;
    this.writeIndex();
    this.data = this.load(this.slot);
    return this.data;
  }

  reset() {
    const settings = this.data.settings;
    this.data = defaultSave();
    this.data.settings = settings; // keep sound/motion choices
    // drop both copies first so the old progress isn't rolled into the backup
    this.removeKeys(this.slot);
    this.mainOk = false;
    this.save();
  }
}
