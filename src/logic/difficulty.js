// Gentle adaptive difficulty, tracked separately for math and letters.
// Only independent answers move a level up; repeated "needed help" moves it down.
//
// Mastery: save.skills.math (counting, numbers, adding) and save.skills.letters
// (reading: letters, sounds, words, spelling) are two separate levels. A math answer
// only ever moves skills.math and a reading answer only skills.letters, so being
// strong at one never raises or lowers the other. They move on first-try accuracy:
// three first-try answers in a row ('indep') step up; needing the answer shown
// ('support') twice in four steps down.
//
// Learning pathways (a profile's `pathway`, chosen by a grown-up) set the band each
// level plays in: where a new player starts, and the lowest and highest level their
// questions come from. Changing the pathway never rewrites the stored level; the
// band only clamps the level that's played, so switching back restores it exactly.

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 5;

export function defaultSkills() {
  return {
    math: { level: 2, auto: true, streak: 0, recent: [] },
    letters: { level: 1, auto: true, streak: 0, recent: [] },
  };
}

// min is also the starting band: a new player (stored math 2, reading 1) plays at
// least at `min`, so Early starts at math 2 / reading 1 and Growing at 3 / 3.
export const PATHWAY_BANDS = {
  early: { min: 1, max: 4 }, // Early learner, 3–5
  growing: { min: 3, max: 5 }, // Growing learner, 5–7
};

export const bandFor = (pathway) => PATHWAY_BANDS[pathway] || PATHWAY_BANDS.early;

const clampTo = (lvl, lo, hi) => Math.max(lo, Math.min(hi, Number.isFinite(+lvl) ? Math.floor(+lvl) : lo));

// The level questions are asked at for this skill on this pathway.
export function playLevel(skill, pathway) {
  const b = bandFor(pathway);
  return clampTo(skill?.level, b.min, b.max);
}

// band: an optional pathway band { min, max }; without one the full 1–5 range applies.
// The level steps from the level being played; when it doesn't step, the stored level
// is left exactly as it was (a pathway switch never costs progress).
export function recordResult(skill, quality, band = null) {
  const lo = band ? Math.max(MIN_LEVEL, band.min) : MIN_LEVEL;
  const hi = band ? Math.min(MAX_LEVEL, band.max) : MAX_LEVEL;
  const s = { ...skill, recent: [...(skill.recent || []), quality].slice(-6) };
  if (quality === 'indep') s.streak = (s.streak || 0) + 1;
  else s.streak = 0;
  if (!s.auto) return s;

  const at = band ? clampTo(s.level, lo, hi) : s.level;
  if (s.streak >= 3 && at < hi) {
    s.level = at + 1;
    s.streak = 0;
    s.recent = [];
    s.changed = 'up';
  } else {
    const lastFour = s.recent.slice(-4);
    if (lastFour.filter((q) => q === 'support').length >= 2 && at > lo) {
      s.level = at - 1;
      s.recent = [];
      s.changed = 'down';
    } else {
      delete s.changed;
    }
  }
  return s;
}
