// Gentle adaptive difficulty, tracked separately for math and letters.
// Only independent answers move a level up; repeated "needed help" moves it down.

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 5;

export function defaultSkills() {
  return {
    math: { level: 2, auto: true, streak: 0, recent: [] },
    letters: { level: 1, auto: true, streak: 0, recent: [] },
  };
}

export function recordResult(skill, quality) {
  const s = { ...skill, recent: [...(skill.recent || []), quality].slice(-6) };
  if (quality === 'indep') s.streak = (s.streak || 0) + 1;
  else s.streak = 0;
  if (!s.auto) return s;

  if (s.streak >= 3 && s.level < MAX_LEVEL) {
    s.level++;
    s.streak = 0;
    s.recent = [];
    s.changed = 'up';
  } else {
    const lastFour = s.recent.slice(-4);
    if (lastFour.filter((q) => q === 'support').length >= 2 && s.level > MIN_LEVEL) {
      s.level--;
      s.recent = [];
      s.changed = 'down';
    } else {
      delete s.changed;
    }
  }
  return s;
}
