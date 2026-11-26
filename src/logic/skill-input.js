// Learning-off skill inputs (design fix 1). Pure rules, no DOM.
//
// With learning questions off, a power move or special still asks for a little
// skill, so learning off is a fair battle mode and not a cheat button. The input
// earns the same skill bonus range as a question (logic/battle.js RULES.skillBonus)
// and its misses light the foe's charge meter exactly like wrong answers:
//   ring    a ring shrinks onto the move button and pulses on a slow beat; tap when it
//           lands. Spot on = 'indep' (top bonus), close = 'hint', off the beat or no tap
//           = 'support' (base hit, like needing the answer shown). Generous window, no
//           fast reactions: it waits through RING.loops beats before calling it a miss.
//   cheer   one big star to tap, any time. Always a modest bonus ('cheer' = the
//           second-try bonus) and it never moves the meter. For Early learners (3-5),
//           who shouldn't need timing, and for anyone a grown-up sets to "no timing".
// The UI (ui/skill-input.js) only measures the tap; these functions decide.

export const RING = { beat: 1600, perfect: 140, close: 320, loops: 3 };

// Which input a learning-off move uses. pathway: 'early' | 'growing' (save.js PATHWAYS).
// timing: the grown-up setting "Timing taps" (settings.offTiming, default on).
export function offInputFor(pathway, { timing = true } = {}) {
  if (!timing || pathway === 'early' || !pathway) return 'cheer';
  return 'ring';
}

// ms: when the tap landed, counted from the moment the ring appeared (null = no tap).
// The ring lands on the button at every whole beat (1, 2, 3 beats in); the closest
// landing counts. Returns 'indep' | 'hint' | 'support'.
export function judgeRing(ms, ring = RING) {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return 'support';
  if (ms > ring.beat * ring.loops + ring.close) return 'support';
  const k = Math.min(ring.loops, Math.max(1, Math.round(ms / ring.beat)));
  const off = Math.abs(ms - k * ring.beat);
  return off <= ring.perfect ? 'indep' : off <= ring.close ? 'hint' : 'support';
}

// How long the UI waits before an untapped ring counts as a miss.
export const ringTimeout = (ring = RING) => ring.beat * ring.loops + ring.close + 1;

// XP for a learning-off input: the same as the matching answer quality, so both modes
// grow toys at the same pace (logic/progression.js xpForAnswer).
export const xpQualityFor = (quality) => (quality === 'cheer' ? 'hint' : quality);
