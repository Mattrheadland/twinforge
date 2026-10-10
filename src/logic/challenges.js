// Learning challenges. Deterministic given an Rng; every challenge is validated
// before it is shown. Visual-only: no reading or voice required.

export const COUNT_ITEMS = ['block', 'star', 'ball', 'duck'];

// Count ranges per math level (Luca counts to 20, default starts at 2).
const COUNT_RANGE = { 1: [1, 5], 2: [3, 8], 3: [5, 10], 4: [8, 15], 5: [10, 20] };

export function makeCounting(level, rng) {
  const lv = clampLevel(level);
  const [lo, hi] = COUNT_RANGE[lv];
  const n = rng.int(lo, hi);
  // Easy levels use far-apart distractors; harder levels use neighbours.
  const spread = lv <= 2 ? [2, 3, 4] : lv === 3 ? [1, 2, 3] : [1, 2];
  const opts = new Set([n]);
  let guard = 0;
  while (opts.size < 3 && guard++ < 100) {
    const d = rng.pick(spread) * (rng.next() < 0.5 ? -1 : 1);
    const c = n + d;
    if (c >= 1 && c <= 20) opts.add(c);
  }
  for (let c = 1; opts.size < 3; c++) opts.add(c);
  const ch = {
    kind: 'count',
    level: lv,
    item: rng.pick(COUNT_ITEMS),
    n,
    answer: n,
    options: rng.shuffle([...opts]),
  };
  if (!validate(ch)) throw new Error('invalid counting challenge');
  return ch;
}

// Letter shape families: easy levels pick distractors from different families.
const FAMILY = {
  round: 'COGQDUS',
  straight: 'EFHILT',
  diagonal: 'AKMNVWXYZ',
  mixed: 'BPRJ',
};
const familyOf = (L) => Object.keys(FAMILY).find((k) => FAMILY[k].includes(L.toUpperCase()));
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const CONFUSABLE = [
  ['b', 'd', 'p'], ['p', 'q', 'b'], ['m', 'n', 'u'], ['n', 'h', 'u'],
  ['a', 'o', 'e'], ['c', 'e', 'o'], ['i', 'l', 't'], ['v', 'w', 'y'],
];
// Letters in Luca's name show up a little more often early on.
const FAVORITES = ['L', 'U', 'C', 'A'];

export function makeLetter(level, rng) {
  const lv = clampLevel(level);
  let target, options, display = 'upper', optionCase = 'upper';

  if (lv === 5) {
    const set = rng.pick(CONFUSABLE);
    target = rng.pick(set);
    options = set.slice();
    display = optionCase = 'lower';
  } else {
    const pool = lv <= 2 ? [...UPPER, ...FAVORITES] : UPPER;
    const T = rng.pick(pool);
    const others = UPPER.filter((L) => L !== T && (lv >= 2 || familyOf(L) !== familyOf(T)));
    const distractors = rng.shuffle(others).slice(0, 2);
    if (lv <= 2) {
      target = T;
      options = [T, ...distractors];
    } else if (lv === 3) {
      target = T.toLowerCase();
      options = [T, ...distractors].map((x) => x.toLowerCase());
      display = optionCase = 'lower';
    } else {
      // level 4: big letter shown upper-case, find its lower-case partner
      target = T.toLowerCase();
      options = [T, ...distractors].map((x) => x.toLowerCase());
      display = 'upper';
      optionCase = 'lower';
    }
  }
  const ch = {
    kind: 'letter',
    level: lv,
    target,
    shown: display === 'upper' ? target.toUpperCase() : target,
    answer: target,
    optionCase,
    options: rng.shuffle(options),
  };
  if (!validate(ch)) throw new Error('invalid letter challenge');
  return ch;
}

export function validate(ch) {
  if (!ch || !Array.isArray(ch.options) || ch.options.length !== 3) return false;
  if (new Set(ch.options).size !== 3) return false;
  if (ch.options.filter((o) => o === ch.answer).length !== 1) return false;
  if (ch.kind === 'count') {
    return Number.isInteger(ch.n) && ch.n >= 1 && ch.n <= 20 && ch.answer === ch.n &&
      ch.options.every((o) => Number.isInteger(o) && o >= 1 && o <= 20);
  }
  if (ch.kind === 'letter') {
    return ch.options.every((o) => typeof o === 'string' && o.length === 1) &&
      ch.shown.toLowerCase() === ch.answer.toLowerCase();
  }
  return false;
}

export const isCorrect = (ch, choice) => choice === ch.answer;

// Wrong-answer count -> quality used by the battle rules.
export const qualityFor = (wrongs) => (wrongs === 0 ? 'indep' : wrongs === 1 ? 'hint' : 'support');

function clampLevel(l) {
  return Math.max(1, Math.min(5, Math.round(l || 1)));
}
