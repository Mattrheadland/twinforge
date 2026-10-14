// Learning challenges. Deterministic given an Rng; every challenge is validated
// before it is shown. Picture-first: a 4-year-old can answer every one without
// reading the small grown-up prompt line.
//
// Math (power moves):    count · shape match · which has most/fewest · what comes next
//                        · find the group for a number · add · take away
// Reading (specials):    letter match · upper→lower · tricky letters · starts with
//                        · rhymes · read a word, find its picture
// Both scale over 5 levels (logic/difficulty.js moves the level automatically).

export const COUNT_ITEMS = ['block', 'star', 'ball', 'duck'];
export const SHAPES = ['circle', 'square', 'triangle', 'star', 'heart', 'diamond'];
export const TOKEN_COLORS = ['red', 'blue', 'yellow', 'green', 'purple'];

// Pictures (emoji) with their words.
export const PICS = {
  apple: '🍎', bear: '🐻', cat: '🐱', dog: '🐶', egg: '🥚', fish: '🐟', grapes: '🍇', hat: '🎩',
  juice: '🧃', kite: '🪁', lion: '🦁', moon: '🌙', nose: '👃', octopus: '🐙', pig: '🐷', rainbow: '🌈',
  sun: '☀️', tree: '🌳', umbrella: '☂️', violin: '🎻', whale: '🐋', yoyo: '🪀', zebra: '🦓',
  bat: '🦇', frog: '🐸', log: '🪵', bee: '🐝', key: '🔑', snake: '🐍', cake: '🎂', pear: '🍐', chair: '🪑',
  spoon: '🥄', fox: '🦊', box: '📦', socks: '🧦', goat: '🐐', boat: '⛵', coat: '🧥', star: '⭐', car: '🚗',
  jar: '🫙', mouse: '🐭', house: '🏠', bus: '🚌', cup: '☕', bed: '🛏️', bug: '🐛', king: '🤴', ring: '💍',
};
const WORD_LABEL = { yoyo: 'yo-yo' };
export const wordLabel = (w) => WORD_LABEL[w] || w;

// First letter → picture word (sound-alike starts only, no tricky ones).
const STARTS = {
  A: 'apple', B: 'bear', C: 'cat', D: 'dog', E: 'egg', F: 'fish', G: 'grapes', H: 'hat', J: 'juice',
  K: 'kite', L: 'lion', M: 'moon', N: 'nose', O: 'octopus', P: 'pig', R: 'rainbow', S: 'sun', T: 'tree',
  U: 'umbrella', V: 'violin', W: 'whale', Y: 'yoyo', Z: 'zebra',
};
// Letters whose sounds a beginner rarely mixes up — used at easier levels.
const EASY_STARTS = 'BCDFLMPSTZ'.split('');

const RHYMES = [
  ['cat', 'hat', 'bat'], ['dog', 'frog', 'log'], ['bee', 'tree', 'key'], ['cake', 'snake'],
  ['bear', 'pear', 'chair'], ['fox', 'box', 'socks'], ['goat', 'boat', 'coat'], ['star', 'car', 'jar'],
  ['mouse', 'house'], ['king', 'ring'], ['moon', 'spoon'],
];
const CVC = ['cat', 'dog', 'sun', 'hat', 'pig', 'bus', 'cup', 'bed', 'fox', 'bug', 'box', 'bat'];

// ---------------- math ----------------
const COUNT_RANGE = { 1: [1, 5], 2: [3, 8], 3: [5, 10], 4: [8, 15], 5: [10, 20] };

const MATH_KINDS = {
  1: ['count', 'count', 'shape', 'compare'],
  2: ['count', 'shape', 'compare', 'pattern', 'numeral'],
  3: ['count', 'numeral', 'add', 'pattern', 'compare'],
  4: ['count', 'numeral', 'add', 'sub', 'pattern'],
  5: ['count', 'add', 'sub', 'numeral', 'compare'],
};

export function makeMath(level, rng, force) {
  const lv = clampLevel(level);
  const kind = force || rng.pick(MATH_KINDS[lv]);
  const fn = { count: makeCounting, shape: makeShape, compare: makeCompare, pattern: makePattern, numeral: makeNumeral, add: makeAdd, sub: makeSub }[kind];
  return fn(lv, rng);
}

function numberOptions(n, lv, rng, lo = 0, hi = 20) {
  const spread = lv <= 2 ? [2, 3, 4] : lv === 3 ? [1, 2, 3] : [1, 2];
  const opts = new Set([n]);
  let guard = 0;
  while (opts.size < 3 && guard++ < 100) {
    const c = n + rng.pick(spread) * (rng.next() < 0.5 ? -1 : 1);
    if (c >= lo && c <= hi) opts.add(c);
  }
  for (let c = lo; opts.size < 3; c++) opts.add(c);
  return rng.shuffle([...opts]);
}

export function makeCounting(level, rng) {
  const lv = clampLevel(level);
  const [lo, hi] = COUNT_RANGE[lv];
  const n = rng.int(lo, hi);
  return checked({
    kind: 'count', level: lv, prompt: 'How many?', optType: 'num',
    item: rng.pick(COUNT_ITEMS), n, answer: n, options: numberOptions(n, lv, rng, 1, 20),
  });
}

function makeAdd(lv, rng) {
  const max = lv <= 3 ? 5 : 10;
  const a = rng.int(1, max - 1), b = rng.int(1, max - a);
  const n = a + b;
  return checked({
    kind: 'add', level: lv, prompt: `${a} and ${b} more. How many altogether?`, optType: 'num',
    item: rng.pick(COUNT_ITEMS), a, b, n, answer: n, options: numberOptions(n, lv, rng, 1, 20),
  });
}

function makeSub(lv, rng) {
  const max = lv <= 4 ? 5 : 10;
  const a = rng.int(2, max), b = rng.int(1, a - 1);
  const n = a - b;
  return checked({
    kind: 'sub', level: lv, prompt: `${a} take away ${b}. How many are left?`, optType: 'num',
    item: rng.pick(COUNT_ITEMS), a, b, n, answer: n, options: numberOptions(n, lv, rng, 0, 20),
  });
}

function makeNumeral(lv, rng) {
  const hi = lv <= 2 ? 5 : lv === 3 ? 8 : lv === 4 ? 10 : 12;
  const n = rng.int(1, hi);
  return checked({
    kind: 'numeral', level: lv, prompt: `Find the group with ${n}.`, optType: 'group',
    n, answer: n, options: numberOptions(n, Math.min(lv, 3), rng, 1, hi + 3),
  });
}

function makeCompare(lv, rng) {
  const fewest = lv >= 3 && rng.next() < 0.5;
  const hi = lv <= 2 ? 6 : 9;
  // distinct counts, with a clear gap at easy levels
  const gap = lv <= 2 ? 2 : 1;
  let vals;
  for (let g = 0; g < 50; g++) {
    vals = [rng.int(1, hi), rng.int(1, hi), rng.int(1, hi)].sort((x, y) => x - y);
    if (vals[1] - vals[0] >= gap && vals[2] - vals[1] >= gap) break;
    vals = null;
  }
  vals = vals || [1, 3, 5];
  const answer = fewest ? vals[0] : vals[2];
  return checked({
    kind: 'compare', level: lv, mode: fewest ? 'fewest' : 'most',
    prompt: fewest ? 'Which has the fewest?' : 'Which has the most?', optType: 'group',
    answer, options: rng.shuffle(vals),
  });
}

function makeShape(lv, rng) {
  const target = rng.pick(SHAPES);
  const others = rng.shuffle(SHAPES.filter((s) => s !== target)).slice(0, 2);
  return checked({
    kind: 'shape', level: lv, prompt: 'Find the same shape.', optType: 'shape',
    target, color: rng.pick(TOKEN_COLORS), answer: target, options: rng.shuffle([target, ...others]),
  });
}

function makePattern(lv, rng) {
  // AB, ABB, ABC by level; tokens are "shape:color"
  const unitLen = lv <= 2 ? 2 : lv === 3 ? rng.pick([2, 3]) : 3;
  const shapes = rng.shuffle(SHAPES.slice(0, 4));
  const colors = rng.shuffle(TOKEN_COLORS);
  const pool = [0, 1, 2].map((i) => `${shapes[i]}:${colors[i]}`);
  const unit = unitLen === 2 ? [pool[0], pool[1]] : lv === 3 ? [pool[0], pool[1], pool[1]] : [pool[0], pool[1], pool[2]];
  const len = unit.length * 2 + (unit.length === 2 ? 1 : 0); // show 2 full repeats (+1 for AB)
  const seq = Array.from({ length: len }, (_, i) => unit[i % unit.length]);
  const answer = unit[len % unit.length];
  const distract = [...new Set([...pool, `${shapes[3]}:${colors[3]}`])].filter((t) => t !== answer);
  return checked({
    kind: 'pattern', level: lv, prompt: 'What comes next?', optType: 'token',
    seq, answer, options: rng.shuffle([answer, ...rng.shuffle(distract).slice(0, 2)]),
  });
}

// ---------------- reading ----------------
const READ_KINDS = {
  1: ['letter'],
  2: ['letter', 'letter', 'starts'],
  3: ['letter', 'starts', 'rhyme'],
  4: ['letter', 'starts', 'rhyme', 'word'],
  5: ['letter', 'rhyme', 'word', 'word'],
};

export function makeReading(level, rng, force) {
  const lv = clampLevel(level);
  const kind = force || rng.pick(READ_KINDS[lv]);
  const fn = { letter: makeLetter, starts: makeStarts, rhyme: makeRhyme, word: makeWord }[kind];
  return fn(lv, rng);
}

const FAMILY = { round: 'COGQDUS', straight: 'EFHILT', diagonal: 'AKMNVWXYZ', mixed: 'BPRJ' };
const familyOf = (L) => Object.keys(FAMILY).find((k) => FAMILY[k].includes(L.toUpperCase()));
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const CONFUSABLE = [
  ['b', 'd', 'p'], ['p', 'q', 'b'], ['m', 'n', 'u'], ['n', 'h', 'u'],
  ['a', 'o', 'e'], ['c', 'e', 'o'], ['i', 'l', 't'], ['v', 'w', 'y'],
];
const FAVORITES = ['L', 'U', 'C', 'A']; // letters in Luca's name show up a little more often early on

export function makeLetter(level, rng) {
  const lv = clampLevel(level);
  let target, options, display = 'upper', optionCase = 'upper', prompt = 'Find the same letter.';
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
      target = T.toLowerCase();
      options = [T, ...distractors].map((x) => x.toLowerCase());
      optionCase = 'lower';
      prompt = 'Find its small letter.';
    }
  }
  return checked({
    kind: 'letter', level: lv, prompt, optType: 'letter',
    target, shown: display === 'upper' ? target.toUpperCase() : target,
    answer: target, optionCase, options: rng.shuffle(options),
  });
}

function makeStarts(lv, rng) {
  const letters = lv <= 3 ? EASY_STARTS : Object.keys(STARTS);
  const L = rng.pick(letters);
  const word = STARTS[L];
  // distractors: letters with different sounds (and different shapes at easy levels)
  const pool = Object.keys(STARTS).filter((x) => x !== L && (lv >= 3 || familyOf(x) !== familyOf(L)));
  const opts = [L, ...rng.shuffle(pool).slice(0, 2)];
  return checked({
    kind: 'starts', level: lv, prompt: `What does ${wordLabel(word)} start with?`, optType: 'letter',
    word, pic: PICS[word], answer: L, options: rng.shuffle(opts),
  });
}

function makeRhyme(lv, rng) {
  const group = rng.pick(RHYMES);
  const [a, b] = rng.shuffle(group).slice(0, 2);
  const others = rng.shuffle(RHYMES.filter((g) => g !== group)).slice(0, 2).map((g) => rng.pick(g));
  return checked({
    kind: 'rhyme', level: lv, prompt: `What rhymes with ${a}?`, optType: 'pic',
    word: a, pic: PICS[a], answer: b, options: rng.shuffle([b, ...others]),
  });
}

function makeWord(lv, rng) {
  const w = rng.pick(CVC);
  // at level 5 distractors share letters with the word (cat vs bat/hat)
  let pool = CVC.filter((x) => x !== w);
  if (lv >= 5) {
    const close = pool.filter((x) => x[1] === w[1] || x[2] === w[2]);
    if (close.length >= 2) pool = close;
  }
  return checked({
    kind: 'word', level: lv, prompt: 'Read the word. Find its picture.', optType: 'pic',
    word: w, answer: w, options: rng.shuffle([w, ...rng.shuffle(pool).slice(0, 2)]),
  });
}

// ---------------- shared ----------------
export function validate(ch) {
  if (!ch || !Array.isArray(ch.options) || ch.options.length !== 3) return false;
  const opts = ch.options.map(String);
  if (new Set(opts).size !== 3) return false;
  if (opts.filter((o) => o === String(ch.answer)).length !== 1) return false;
  switch (ch.kind) {
    case 'count':
      return Number.isInteger(ch.n) && ch.n >= 1 && ch.n <= 20 && ch.answer === ch.n && ch.options.every((o) => Number.isInteger(o) && o >= 1 && o <= 20);
    case 'add':
      return ch.a + ch.b === ch.answer && ch.answer <= 10;
    case 'sub':
      return ch.a - ch.b === ch.answer && ch.answer >= 1 && ch.options.every((o) => o >= 0);
    case 'numeral':
      return ch.answer === ch.n && ch.options.every((o) => Number.isInteger(o) && o >= 1);
    case 'compare': {
      const sorted = [...ch.options].sort((x, y) => x - y);
      return ch.answer === (ch.mode === 'fewest' ? sorted[0] : sorted[2]);
    }
    case 'shape':
      return SHAPES.includes(ch.target) && ch.answer === ch.target;
    case 'pattern':
      return Array.isArray(ch.seq) && ch.seq.length >= 4;
    case 'letter':
      return ch.options.every((o) => typeof o === 'string' && o.length === 1) && ch.shown.toLowerCase() === ch.answer.toLowerCase();
    case 'starts':
      return STARTS[ch.answer] === ch.word && !!ch.pic;
    case 'rhyme':
      return RHYMES.some((g) => g.includes(ch.word) && g.includes(ch.answer)) &&
        ch.options.filter((o) => RHYMES.some((g) => g.includes(ch.word) && g.includes(o))).length === 1 &&
        ch.options.every((o) => PICS[o]);
    case 'word':
      return CVC.includes(ch.answer) && ch.options.every((o) => PICS[o]);
    default:
      return false;
  }
}

function checked(ch) {
  if (!validate(ch)) throw new Error(`invalid ${ch.kind} challenge`);
  return ch;
}

export const isCorrect = (ch, choice) => String(choice) === String(ch.answer);

// Wrong-answer count -> quality used by the battle rules.
export const qualityFor = (wrongs) => (wrongs === 0 ? 'indep' : wrongs === 1 ? 'hint' : 'support');

function clampLevel(l) {
  return Math.max(1, Math.min(5, Math.round(l || 1)));
}
