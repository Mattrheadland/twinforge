// Versioned local save with a rolling backup copy and export/import.
import { defaultSkills } from './logic/difficulty.js';
import { isValidBattle } from './logic/battle.js';

export const SAVE_VERSION = 1;
const KEY = 'tbb.save';
const BAK = 'tbb.save.bak';

export function defaultSave() {
  return {
    v: SAVE_VERSION,
    created: Date.now(),
    updated: Date.now(),
    settings: {
      music: 0.6,
      sfx: 0.9,
      reducedMotion: matchMediaSafe('(prefers-reduced-motion: reduce)'),
      haptics: true,
      showFps: false,
      tvLook: true,
    },
    progress: { stars: 0, wins: 0, battles: 0, lastHero: null, tutorial: {} },
    skills: defaultSkills(),
    battle: null, // snapshot of an unfinished battle (taken at the start of each hero turn)
  };
}

function matchMediaSafe(q) {
  try {
    return !!window.matchMedia(q).matches;
  } catch {
    return false;
  }
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
    settings: { ...base.settings, ...(raw.settings || {}) },
    progress: { ...base.progress, ...(raw.progress || {}), tutorial: { ...(raw.progress?.tutorial || {}) } },
    skills: {
      math: { ...base.skills.math, ...(raw.skills?.math || {}) },
      letters: { ...base.skills.letters, ...(raw.skills?.letters || {}) },
    },
  };
  if (out.battle && !isValidBattle(out.battle, chars)) out.battle = null;
  out.progress.stars = Math.max(0, Math.floor(out.progress.stars || 0));
  return out;
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

export class SaveStore {
  constructor(chars) {
    this.chars = chars;
    this.ls = storage();
    this.available = !!this.ls;
    this.data = this.load();
  }
  load() {
    if (!this.ls) return defaultSave();
    for (const key of [KEY, BAK]) {
      try {
        const txt = this.ls.getItem(key);
        if (!txt) continue;
        const d = migrate(JSON.parse(txt), this.chars);
        this.recovered = key === BAK;
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
    try {
      const prev = this.ls.getItem(KEY);
      if (prev) this.ls.setItem(BAK, prev);
      this.ls.setItem(KEY, JSON.stringify(this.data));
      return true;
    } catch {
      return false;
    }
  }
  exportText() {
    return JSON.stringify({ app: 'twinforge', ...this.data }, null, 2);
  }
  importText(txt) {
    const raw = JSON.parse(txt);
    // 'toy-box-battleground' = backups made before the game was renamed
    if (raw.app && raw.app !== 'twinforge' && raw.app !== 'toy-box-battleground') throw new Error('not a TwinForge backup');
    delete raw.app;
    this.data = migrate(raw, this.chars);
    this.save();
    return this.data;
  }
  reset() {
    const settings = this.data.settings;
    this.data = defaultSave();
    this.data.settings = settings; // keep sound/motion choices
    if (this.ls) {
      try {
        this.ls.removeItem(BAK);
      } catch {}
    }
    this.save();
  }
}
