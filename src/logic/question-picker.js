// Chooses the next question so Luca practises skills instead of memorising answers:
//  - no repeats: a question asked in the last RECENT_MAX of its kind of subject
//    (math or reading) isn't asked again;
//  - reviews: a question he needed help with comes back a few questions later
//    as the same skill in a new form (the B he missed in "starts with" comes
//    back as "which picture starts with B", a missed 3 + 2 comes back as a toy
//    story that also makes 5).
// Memory lives in save.data.learning.mem (logic/learning-log.js keeps it tidy).
import { makeMath, makeReading, keyOf, skillOf, kindsAt, REVIEW_AS, KINDS } from './challenges.js';

export const RECENT_MAX = 25;
export const REVIEW_MAX = 8;
export const REVIEW_TRIES = 2; // a skill comes back at most this many times in a row
const ATTEMPTS = 80;

export function defaultMem() {
  return { recent: { math: [], reading: [] }, review: [], asked: { math: 0, reading: 0 } };
}

export function normalizeMem(m) {
  const base = defaultMem();
  if (!m || typeof m !== 'object') return base;
  const list = (x) => (Array.isArray(x) ? x.filter((k) => typeof k === 'string').slice(-RECENT_MAX) : []);
  return {
    recent: { math: list(m.recent?.math), reading: list(m.recent?.reading) },
    review: Array.isArray(m.review) ? m.review.filter((r) => r && KINDS[r.kind] && typeof r.skill === 'string').slice(-REVIEW_MAX) : [],
    asked: { math: m.asked?.math | 0, reading: m.asked?.reading | 0 },
  };
}

// domain: 'math' | 'reading'. mem may be null (then it's a plain random question).
export function pickQuestion(domain, level, rng, { force, off = [], mem = null } = {}) {
  const make = domain === 'math' ? makeMath : makeReading;
  if (force || !mem) return make(level, rng, force, off);
  const recent = mem.recent[domain] || [];
  const here = kindsAt(domain, level).filter((k) => !off.includes(k));

  // a review that's due, in a new form where possible
  const due = mem.review.find((r) => r.domain === domain && r.due <= mem.asked[domain]);
  if (due) {
    mem.review.splice(mem.review.indexOf(due), 1);
    const forms = (REVIEW_AS[due.kind] || [due.kind]).filter((k) => here.includes(k) || k === due.kind);
    for (const kind of forms) {
      if (!here.includes(kind) && kind !== due.kind) continue;
      for (let i = 0; i < ATTEMPTS; i++) {
        const ch = make(level, rng, kind, off);
        if (skillOf(ch) === due.skill && keyOf(ch) !== due.key) {
          ch.review = (due.tries || 0) + 1;
          return ch;
        }
      }
    }
    // couldn't build it at this level: let it go
  }

  // a fresh question that isn't one of the recent ones
  let ch;
  for (let i = 0; i < 30; i++) {
    ch = make(level, rng, undefined, off);
    if (!recent.includes(keyOf(ch))) return ch;
  }
  return ch;
}

// After an answer: remember it, and queue a review if he needed help.
export function rememberAnswer(mem, ch, quality) {
  const domain = KINDS[ch.kind]?.domain;
  if (!mem || !domain) return mem;
  mem.asked[domain]++;
  const r = mem.recent[domain];
  r.push(keyOf(ch));
  if (r.length > RECENT_MAX) r.splice(0, r.length - RECENT_MAX);
  const tries = ch.review || 0;
  if (quality !== 'indep' && tries < REVIEW_TRIES) {
    const skill = skillOf(ch);
    if (!mem.review.some((x) => x.skill === skill)) {
      mem.review.push({ domain, kind: ch.kind, skill, key: keyOf(ch), due: mem.asked[domain] + 3 + (mem.asked[domain] % 3), tries });
      if (mem.review.length > REVIEW_MAX) mem.review.shift();
    }
  }
  return mem;
}
