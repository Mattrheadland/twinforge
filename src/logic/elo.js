// Per-strand skill scores (Elo-style), so one weak spot doesn't drag a whole subject.
//
// A strand is one question kind (add, sub, digraph, comprehend...). Each strand keeps a
// rating on the same scale as the levels (1-8), and a question's difficulty is the level
// it was asked at. The chance of a first-try answer is
//   P = g + (1 - g) * sigmoid(k * (rating - level)),   g = 1 / choices (a lucky guess)
// After each answer the rating moves by U(n) * (score - P), with U(n) = a / (1 + b n):
// big steps for the first few answers, settling after about ten (research doc, 6c).
//
// The picker (logic/question-picker.js) uses it two ways, both hidden from the child:
//  - which kind to ask: kinds whose predicted success sits nearest the pathway's target
//    (0.85 for 3-5s, 0.8 for 5-7s, 0.75 for 8-10s) come up more often;
//  - a quiet step down: a strand predicted under 50% at the subject's level is asked one
//    level easier, if it exists there. Nothing is announced; the subject level is not moved.
// The subject level itself still steps on logic/difficulty.js rules.

export const ELO = {
  k: 1.7, // how sharply P falls as a question gets harder than the rating
  a: 1, b: 0.05, // uncertainty step U(n) = a / (1 + b n)
  seedAbove: 0.5, // a new strand starts half a level above where it's first asked (P ~ 0.8)
  target: { early: 0.85, growing: 0.8, older: 0.75 },
  low: 0.5, // under this, ask the strand one level easier
  spread: 0.12, // how strongly kind choice leans toward the target
  floor: 0.15, // every kind at the level keeps some chance
  min: 0, max: 9,
};

const SCORE = { indep: 1, hint: 0.5, support: 0 };
export const choicesAt = (level) => (level >= 6 ? 4 : 3);
const sigmoid = (x) => 1 / (1 + Math.exp(-x));
const clampR = (r) => Math.max(ELO.min, Math.min(ELO.max, r));

export function predict(rating, level, choices = choicesAt(level)) {
  const g = 1 / Math.max(2, choices);
  return g + (1 - g) * sigmoid(ELO.k * (rating - level));
}

export const seedFor = (level) => level + ELO.seedAbove;
export const ratingOf = (elo, kind, level) => (elo && elo[kind] ? elo[kind].r : seedFor(level));

// Mutates and returns elo. level: the level the question was asked at.
export function updateElo(elo, kind, level, quality, choices = choicesAt(level)) {
  const s = SCORE[quality];
  if (s === undefined || !kind) return elo;
  const cur = elo[kind] || { r: seedFor(level), n: 0 };
  const step = ELO.a / (1 + ELO.b * cur.n);
  const p = predict(cur.r, level, choices);
  elo[kind] = { r: Math.round(clampR(cur.r + step * (s - p)) * 1000) / 1000, n: cur.n + 1 };
  return elo;
}

// Weighted pick among kinds: nearest the target success rate is likeliest.
export function chooseKind(elo, kinds, level, pathway, rng) {
  if (!kinds.length) return undefined;
  const target = ELO.target[pathway] ?? ELO.target.early;
  const w = kinds.map((k) => {
    const d = (predict(ratingOf(elo, k, level), level) - target) / ELO.spread;
    return ELO.floor + Math.exp(-d * d);
  });
  let x = rng.next() * w.reduce((t, v) => t + v, 0);
  for (let i = 0; i < kinds.length; i++) if ((x -= w[i]) <= 0) return kinds[i];
  return kinds[kinds.length - 1];
}

// The level to ask this strand at: one easier when it's predicted under ELO.low and the
// kind exists one level down (hasKindAt(level) says whether it does).
export function levelFor(elo, kind, level, hasKindAt) {
  if (!elo || !elo[kind] || level <= 1) return level;
  if (predict(elo[kind].r, level) >= ELO.low) return level;
  return hasKindAt(level - 1) ? level - 1 : level;
}

export function normalizeElo(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw))
    if (v && Number.isFinite(v.r) && Number.isFinite(v.n)) out[k] = { r: clampR(v.r), n: Math.max(0, v.n | 0) };
  return out;
}
