// Learning challenges. Deterministic given an Rng; every challenge is validated
// before it is shown. Picture-first: a 4-year-old can answer every one without
// reading the small grown-up prompt line, and the game reads that line aloud
// (ch.say) when "Read questions aloud" is on.
//
// Math (power moves):
//   count · quick look (dots flash, then hide) · same shape · which has most/fewest
//   · what comes next (patterns) · find the group for a number · one more / one less
//   · missing number in a row · bigger / smaller number · add · take away
//   · story problems with the toys · teen numbers (a full ten-frame and some more)
// Reading (specials):
//   letter match · starts with (letter for a picture) · which picture starts with a letter
//   · rhymes · ends with · missing letter · read a word · first sight words · spell a word
// Both scale over 5 levels (logic/difficulty.js moves the level automatically).
// Word lists live in logic/words.js.
import {
  PICS, wordLabel, STARTS, SAME_SOUND, EASY_STARTS, ENDS, RHYMES, CVC, LONG_WORDS, SPELL, SIGHT,
  VOWELS, CONSONANTS, ALL_WORDS, STORY_NAMES,
} from './words.js';

export { PICS, wordLabel };
export const COUNT_ITEMS = ['block', 'star', 'ball', 'duck'];
export const SHAPES = ['circle', 'square', 'triangle', 'star', 'heart', 'diamond'];
export const TOKEN_COLORS = ['red', 'blue', 'yellow', 'green', 'purple'];
const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
const PLURAL = { block: 'blocks', star: 'stars', ball: 'balls', duck: 'ducks' };

// ---------------- math ----------------
const COUNT_RANGE = { 1: [1, 5], 2: [3, 8], 3: [5, 10], 4: [8, 15], 5: [10, 20] };

export const MATH_KINDS = {
  1: ['count', 'count', 'shape', 'compare', 'flash'],
  2: ['count', 'shape', 'compare', 'pattern', 'numeral', 'flash'],
  3: ['count', 'numeral', 'add', 'pattern', 'compare', 'oneMore', 'seq', 'flash'],
  4: ['count', 'numeral', 'add', 'sub', 'pattern', 'oneMore', 'seq', 'bigger', 'story'],
  5: ['count', 'add', 'sub', 'numeral', 'compare', 'oneMore', 'seq', 'bigger', 'story', 'teen'],
};

// off: question types a grown-up switched off in the learning report. If that
// leaves nothing at this level, the level's normal mix is used instead.
const allowed = (list, off) => {
  const keep = off && off.length ? list.filter((k) => !off.includes(k)) : list;
  return keep.length ? keep : list;
};

const MATH_MAKERS = {};
export function makeMath(level, rng, force, off) {
  const lv = clampLevel(level);
  const kind = force || rng.pick(allowed(MATH_KINDS[lv], off));
  return MATH_MAKERS[kind](lv, rng);
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
  const item = rng.pick(COUNT_ITEMS);
  return checked({
    kind: 'count', level: lv, prompt: 'How many?', say: `How many ${PLURAL[item]}?`, optType: 'num',
    item, n, answer: n, options: numberOptions(n, lv, rng, 1, 20),
  });
}

// Quick look: the dots show for a moment, then hide. Seeing small amounts
// without counting one by one (subitizing) is a big early number skill.
const FLASH_RANGE = { 1: [1, 4], 2: [1, 5], 3: [2, 6], 4: [3, 8], 5: [4, 10] };
function makeFlash(lv, rng) {
  const [lo, hi] = FLASH_RANGE[lv];
  const n = rng.int(lo, hi);
  return checked({
    kind: 'flash', level: lv, prompt: 'Quick look! How many dots?', say: 'Quick look! How many dots?', optType: 'num',
    n, answer: n, ms: lv <= 2 ? 1600 : lv === 3 ? 1300 : 1100, options: numberOptions(n, Math.max(lv, 3), rng, 1, 12),
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

// Little story problems starring the toys. Same trays as add / take away.
function makeStory(lv, rng) {
  const name = rng.pick(STORY_NAMES);
  const item = rng.pick(COUNT_ITEMS);
  const things = PLURAL[item];
  const add = rng.next() < 0.5;
  let a, b, n, prompt;
  if (add) {
    const max = lv <= 4 ? 6 : 10;
    a = rng.int(1, max - 1); b = rng.int(1, Math.min(4, max - a)); n = a + b;
    prompt = `${name} has ${a} ${a === 1 ? item : things}. ${name} finds ${b} more. How many now?`;
  } else {
    const max = lv <= 4 ? 6 : 10;
    a = rng.int(3, max); b = rng.int(1, Math.min(4, a - 1)); n = a - b;
    prompt = `${name} has ${a} ${things}. ${b} roll${b === 1 ? 's' : ''} away. How many are left?`;
  }
  return checked({
    kind: 'story', level: lv, op: add ? 'add' : 'sub', name, prompt, optType: 'num',
    item, a, b, n, answer: n, options: numberOptions(n, lv, rng, 0, 20),
  });
}

function makeNumeral(lv, rng) {
  const hi = lv <= 2 ? 5 : lv === 3 ? 8 : lv === 4 ? 10 : 12;
  const n = rng.int(1, hi);
  return checked({
    kind: 'numeral', level: lv, prompt: `Find the group with ${n}.`, say: `Find the group with ${NUMBER_WORDS[n]}.`, optType: 'group',
    n, answer: n, options: numberOptions(n, Math.min(lv, 3), rng, 1, hi + 3),
  });
}

// One more / one less than a number (no objects to count: number sense).
function makeOneMore(lv, rng) {
  const less = lv >= 4 && rng.next() < 0.5;
  const hi = lv <= 4 ? 10 : 19;
  const n = less ? rng.int(2, hi) : rng.int(1, hi - 1);
  const answer = less ? n - 1 : n + 1;
  const opts = new Set([answer, n]);
  const other = less ? [answer - 1, n + 1] : [answer + 1, n - 1];
  for (const c of rng.shuffle(other)) if (opts.size < 3 && c >= 0) opts.add(c);
  for (let c = answer + 2; opts.size < 3; c++) opts.add(c);
  return checked({
    kind: 'oneMore', level: lv, dir: less ? 'less' : 'more', n, answer,
    prompt: less ? `What is one less than ${n}?` : `What is one more than ${n}?`, optType: 'num',
    options: rng.shuffle([...opts]),
  });
}

// The missing number in a row (1 2 _ 4 5). Level 5 sometimes counts down.
function makeSeq(lv, rng) {
  const len = 5;
  const down = lv >= 5 && rng.next() < 0.35;
  const top = lv <= 3 ? 10 : lv === 4 ? 15 : 20;
  const start = down ? rng.int(len, top) : rng.int(1, top - len + 1);
  const seq = Array.from({ length: len }, (_, i) => (down ? start - i : start + i));
  const hole = lv <= 3 ? rng.int(1, len - 2) : rng.int(1, len - 1);
  const answer = seq[hole];
  seq[hole] = null;
  const opts = new Set([answer]);
  for (const c of rng.shuffle([answer - 1, answer + 1, answer + 2, answer - 2])) if (opts.size < 3 && c >= 0 && !seq.includes(c)) opts.add(c);
  for (let c = answer + 3; opts.size < 3; c++) if (!seq.includes(c)) opts.add(c);
  return checked({
    kind: 'seq', level: lv, dir: down ? 'down' : 'up', seq, hole, answer,
    prompt: down ? 'Counting down. Which number is missing?' : 'Which number is missing?', optType: 'num',
    options: rng.shuffle([...opts]),
  });
}

// Which number is bigger (or smaller)? Numerals only.
function makeBigger(lv, rng) {
  const smaller = lv >= 5 && rng.next() < 0.4;
  const hi = lv <= 4 ? 10 : 20;
  const vals = new Set();
  while (vals.size < 3) vals.add(rng.int(1, hi));
  const sorted = [...vals].sort((a, b) => a - b);
  // clear gaps at level 4
  if (lv <= 4 && (sorted[1] - sorted[0] < 2 || sorted[2] - sorted[1] < 2)) return makeBigger(lv, rng);
  const answer = smaller ? sorted[0] : sorted[2];
  return checked({
    kind: 'bigger', level: lv, mode: smaller ? 'smallest' : 'biggest', answer,
    prompt: smaller ? 'Which number is the smallest?' : 'Which number is the biggest?', optType: 'num',
    options: rng.shuffle(sorted),
  });
}

// Teen numbers: a full ten-frame plus some more.
function makeTeen(lv, rng) {
  const n = rng.int(11, 19);
  return checked({
    kind: 'teen', level: lv, n, answer: n, prompt: 'Ten and some more. How many?', say: 'Ten, and some more. How many?', optType: 'num',
    options: numberOptions(n, 4, rng, 10, 20),
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
    kind: 'shape', level: lv, prompt: 'Find the same shape.', say: `Find the ${target}.`, optType: 'shape',
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

Object.assign(MATH_MAKERS, {
  count: makeCounting, flash: makeFlash, shape: makeShape, compare: makeCompare, pattern: makePattern, numeral: makeNumeral,
  add: makeAdd, sub: makeSub, story: makeStory, oneMore: makeOneMore, seq: makeSeq, bigger: makeBigger, teen: makeTeen,
});

// ---------------- reading ----------------
export const READ_KINDS = {
  1: ['letter'],
  2: ['letter', 'letter', 'starts', 'pickStart'],
  3: ['letter', 'starts', 'pickStart', 'rhyme', 'missing'],
  4: ['letter', 'starts', 'rhyme', 'word', 'ends', 'missing', 'sight'],
  5: ['letter', 'rhyme', 'word', 'ends', 'missing', 'sight', 'spell'],
};

const READ_MAKERS = {};
export function makeReading(level, rng, force, off) {
  const lv = clampLevel(level);
  const kind = force || rng.pick(allowed(READ_KINDS[lv], off));
  return READ_MAKERS[kind](lv, rng);
}

const FAMILY = { round: 'COGQDUS', straight: 'EFHILT', diagonal: 'AKMNVWXYZ', mixed: 'BPRJ' };
const familyOf = (L) => Object.keys(FAMILY).find((k) => FAMILY[k].includes(L.toUpperCase()));
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const CONFUSABLE = [
  ['b', 'd', 'p'], ['p', 'q', 'b'], ['m', 'n', 'u'], ['n', 'h', 'u'],
  ['a', 'o', 'e'], ['c', 'e', 'o'], ['i', 'l', 't'], ['v', 'w', 'y'],
];
const MIRRORS = [['b', 'd', 'p', 'q'], ['m', 'w'], ['n', 'u']];
const lookAlike = (a, b) => [...CONFUSABLE, ...MIRRORS].some((set) => set.includes(a.toLowerCase()) && set.includes(b.toLowerCase()));
const FAVORITES = ['L', 'U', 'C', 'A']; // letters in Luca's name show up a little more often early on
const sameSound = (a, b) => a === b || SAME_SOUND[a.toUpperCase()]?.includes(b.toUpperCase());

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
    // below level 5, never pair a letter with its mirror/flip twin (b·d·p·q, m·w, n·u)
    const others = UPPER.filter((L) => L !== T && (lv >= 2 || familyOf(L) !== familyOf(T)) && (lv < 3 || !lookAlike(L, T)));
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
  const name = target.toUpperCase();
  return checked({
    kind: 'letter', level: lv, prompt, say: lv === 4 ? `Find the small letter ${name}.` : `Find the letter ${name}.`, optType: 'letter',
    target, shown: display === 'upper' ? target.toUpperCase() : target,
    answer: target, optionCase, options: rng.shuffle(options),
  });
}

// "What does cat start with?" — a picture, three letters.
function makeStarts(lv, rng) {
  const letters = lv <= 3 ? EASY_STARTS : Object.keys(STARTS);
  const L = rng.pick(letters);
  const word = rng.pick(STARTS[L]);
  // distractors: letters with different sounds (and different shapes at easy levels)
  const pool = Object.keys(STARTS).filter((x) => !sameSound(x, L) && (lv >= 3 || familyOf(x) !== familyOf(L)));
  const opts = [L, ...rng.shuffle(pool).slice(0, 2)];
  return checked({
    kind: 'starts', level: lv, prompt: `What does ${wordLabel(word)} start with?`, say: `What sound does ${wordLabel(word)} start with?`, optType: 'letter',
    word, pic: PICS[word], answer: L, options: rng.shuffle(opts),
  });
}

// "Which one starts with M?" — a letter, three pictures.
function makePickStart(lv, rng) {
  const letters = lv <= 2 ? EASY_STARTS : Object.keys(STARTS);
  const L = rng.pick(letters);
  const answer = rng.pick(STARTS[L]);
  const otherLetters = rng.shuffle(Object.keys(STARTS).filter((x) => !sameSound(x, L) && (lv >= 3 || familyOf(x) !== familyOf(L)))).slice(0, 2);
  const others = otherLetters.map((x) => rng.pick(STARTS[x]));
  return checked({
    kind: 'pickStart', level: lv, prompt: `Which one starts with ${L}?`, say: `Which picture starts with ${L}?`, optType: 'pic',
    letter: L, answer, options: rng.shuffle([answer, ...others]),
  });
}

// "What does drum end with?" — a picture, three lowercase letters.
function makeEnds(lv, rng) {
  const L = rng.pick(Object.keys(ENDS));
  const word = rng.pick(ENDS[L]);
  const opts = [L, ...rng.shuffle(Object.keys(ENDS).filter((x) => x !== L)).slice(0, 2)];
  return checked({
    kind: 'ends', level: lv, prompt: `What does ${wordLabel(word)} end with?`, say: `What sound does ${wordLabel(word)} end with?`, optType: 'letter',
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

// Read a word, find its picture. Longer words join at level 5.
function makeWord(lv, rng) {
  const bank = lv >= 5 ? [...CVC, ...LONG_WORDS] : CVC;
  const w = rng.pick(bank);
  // at level 5 distractors share letters with the word (cat vs bat/hat)
  let pool = bank.filter((x) => x !== w);
  if (lv >= 5) {
    const close = pool.filter((x) => x[0] === w[0] || x.at(-1) === w.at(-1) || x[1] === w[1]);
    if (close.length >= 2) pool = close;
  }
  return checked({
    kind: 'word', level: lv, prompt: 'Read the word. Find its picture.', optType: 'pic',
    word: w, answer: w, options: rng.shuffle([w, ...rng.shuffle(pool).slice(0, 2)]),
  });
}

// Fill in the missing letter: c_t. Level 3 = first letter, 4 = first or last, 5 = any (incl. the vowel).
function makeMissing(lv, rng) {
  const word = rng.pick(SPELL);
  const pos = lv <= 3 ? 0 : lv === 4 ? rng.pick([0, 2]) : rng.pick([0, 1, 2]);
  const answer = word[pos];
  const options = letterChoices(word, pos, rng);
  return checked({
    kind: 'missing', level: lv, prompt: `Which letter is missing in ${word}?`, say: `${word}. Which letter is missing?`, optType: 'letter',
    word, pic: PICS[word], pos, answer, options,
  });
}

// Three letters for one spot in a word: the right one plus two that don't make
// another real word and don't sound the same (c/k).
function letterChoices(word, pos, rng) {
  const answer = word[pos];
  const pool = (pos === 1 ? VOWELS : CONSONANTS).filter((x) => {
    if (x === answer || sameSound(x, answer)) return false;
    const made = word.slice(0, pos) + x + word.slice(pos + 1);
    return !ALL_WORDS.has(made);
  });
  return rng.shuffle([answer, ...rng.shuffle(pool).slice(0, 2)]);
}

// Spell the word one letter at a time (each step offers three letters).
function makeSpell(lv, rng) {
  const word = rng.pick(SPELL);
  const steps = [...word].map((_, i) => ({ answer: word[i], options: letterChoices(word, i, rng) }));
  return checked({
    kind: 'spell', level: lv, prompt: `Spell ${word}.`, say: `Spell ${word}. ${[...word].join(', ')}... ${word}.`, optType: 'letter',
    word, pic: PICS[word], answer: word, steps, options: steps[0].options,
  });
}

// First sight words: the game says the word, he finds it among three.
function makeSight(lv, rng) {
  const bank = lv >= 5 ? [...SIGHT.easy, ...SIGHT.more] : SIGHT.easy;
  const w = rng.pick(bank);
  let pool = bank.filter((x) => x.toLowerCase() !== w.toLowerCase());
  // level 5: look-alikes (same first letter or same length)
  if (lv >= 5) {
    const close = pool.filter((x) => x[0].toLowerCase() === w[0].toLowerCase() || x.length === w.length);
    if (close.length >= 2) pool = close;
  }
  return checked({
    kind: 'sight', level: lv, prompt: 'Listen, then pick.', reveal: `Find the word: “${w}”`, say: `Find the word: ${w}.`, optType: 'word',
    word: w, answer: w, options: rng.shuffle([w, ...rng.shuffle(pool).slice(0, 2)]),
  });
}

Object.assign(READ_MAKERS, {
  letter: makeLetter, starts: makeStarts, pickStart: makePickStart, ends: makeEnds, rhyme: makeRhyme,
  word: makeWord, missing: makeMissing, spell: makeSpell, sight: makeSight,
});

// ---------------- shared ----------------
const isNum = (o) => Number.isInteger(o);
export function validate(ch) {
  if (!ch) return false;
  if (ch.kind === 'spell') {
    return SPELL.includes(ch.word) && Array.isArray(ch.steps) && ch.steps.length === ch.word.length &&
      ch.steps.every((s, i) => s.answer === ch.word[i] && s.options.length === 3 && new Set(s.options).size === 3 && s.options.filter((o) => o === s.answer).length === 1) &&
      !!ch.pic;
  }
  if (!Array.isArray(ch.options) || ch.options.length !== 3) return false;
  const opts = ch.options.map(String);
  if (new Set(opts).size !== 3) return false;
  if (opts.filter((o) => o === String(ch.answer)).length !== 1) return false;
  switch (ch.kind) {
    case 'count':
      return Number.isInteger(ch.n) && ch.n >= 1 && ch.n <= 20 && ch.answer === ch.n && ch.options.every((o) => isNum(o) && o >= 1 && o <= 20);
    case 'flash':
      return ch.answer === ch.n && ch.n >= 1 && ch.n <= 10 && ch.options.every((o) => isNum(o) && o >= 1);
    case 'add':
      return ch.a + ch.b === ch.answer && ch.answer <= 10;
    case 'sub':
      return ch.a - ch.b === ch.answer && ch.answer >= 1 && ch.options.every((o) => o >= 0);
    case 'story':
      return (ch.op === 'add' ? ch.a + ch.b : ch.a - ch.b) === ch.answer && ch.answer >= 1 && ch.answer <= 10 && ch.options.every((o) => isNum(o) && o >= 0);
    case 'numeral':
      return ch.answer === ch.n && ch.options.every((o) => isNum(o) && o >= 1);
    case 'oneMore':
      return ch.answer === ch.n + (ch.dir === 'less' ? -1 : 1) && ch.answer >= 1 && ch.options.every((o) => isNum(o) && o >= 0);
    case 'seq': {
      if (ch.seq[ch.hole] !== null || ch.seq.filter((x) => x === null).length !== 1) return false;
      const step = ch.dir === 'down' ? -1 : 1;
      const first = ch.hole === 0 ? ch.seq[1] - step : ch.seq[0];
      return ch.seq.every((x, i) => (x === null ? first + i * step === ch.answer : x === first + i * step)) && ch.options.every((o) => isNum(o) && o >= 0 && !ch.seq.includes(o));
    }
    case 'bigger': {
      const sorted = [...ch.options].sort((x, y) => x - y);
      return ch.answer === (ch.mode === 'smallest' ? sorted[0] : sorted[2]);
    }
    case 'teen':
      return ch.answer === ch.n && ch.n >= 11 && ch.n <= 19 && ch.options.every((o) => isNum(o) && o >= 10 && o <= 20);
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
      return STARTS[ch.answer]?.includes(ch.word) && !!ch.pic &&
        ch.options.filter((o) => STARTS[o]?.includes(ch.word) || sameSound(o, ch.answer)).length === 1;
    case 'pickStart':
      return ch.options.every((o) => PICS[o]) && ch.options.filter((o) => STARTS[ch.letter].includes(o) || (SAME_SOUND[ch.letter] || []).some((s) => STARTS[s]?.includes(o))).length === 1 && STARTS[ch.letter].includes(ch.answer);
    case 'ends':
      return ENDS[ch.answer]?.includes(ch.word) && ch.word.at(-1) === ch.answer && !!ch.pic;
    case 'rhyme':
      return RHYMES.some((g) => g.includes(ch.word) && g.includes(ch.answer)) &&
        ch.options.filter((o) => RHYMES.some((g) => g.includes(ch.word) && g.includes(o))).length === 1 &&
        ch.options.every((o) => PICS[o]);
    case 'word':
      return (CVC.includes(ch.answer) || LONG_WORDS.includes(ch.answer)) && ch.options.every((o) => PICS[o]);
    case 'missing':
      return SPELL.includes(ch.word) && ch.word[ch.pos] === ch.answer && !!ch.pic &&
        ch.options.every((o) => o === ch.answer || !ALL_WORDS.has(ch.word.slice(0, ch.pos) + o + ch.word.slice(ch.pos + 1)));
    case 'sight':
      return [...SIGHT.easy, ...SIGHT.more].includes(ch.answer) && new Set(ch.options.map((o) => o.toLowerCase())).size === 3;
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

// Every question type, the domain it belongs to, and the first level it shows up at.
export const KINDS = (() => {
  const out = {};
  for (const [domain, table] of [['math', MATH_KINDS], ['reading', READ_KINDS]])
    for (let lv = 1; lv <= 5; lv++) for (const k of table[lv]) if (!out[k]) out[k] = { domain, from: lv };
  return out;
})();
export const kindsAt = (domain, level) => [...new Set((domain === 'math' ? MATH_KINDS : READ_KINDS)[clampLevel(level)])];

// A question's identity (what "the same question again" means) and the skill
// behind it (what a review should practise, in a new form).
export function keyOf(ch) {
  const parts = [ch.kind, ch.word, ch.a, ch.b, ch.n, ch.target, ch.letter, ch.dir, ch.mode, ch.pos, ch.item, ch.seq && ch.seq.join(','), ch.answer];
  return parts.map((p) => (p == null ? '' : String(p))).join('|');
}
export function skillOf(ch) {
  switch (ch.kind) {
    case 'rhyme': return `rhyme:${RHYMES.findIndex((g) => g.includes(ch.word))}`;
    case 'starts': case 'pickStart': return `start:${ch.kind === 'starts' ? ch.answer : ch.letter}`;
    case 'letter': return `letter:${String(ch.answer).toLowerCase()}`;
    case 'ends': return `end:${ch.answer}`;
    case 'word': case 'missing': case 'spell': return `word:${ch.word}`;
    case 'sight': return `sight:${ch.answer}`;
    case 'add': case 'story': case 'sub': return `fact:${ch.answer}`;
    case 'count': case 'flash': case 'numeral': return `number:${ch.answer}`;
    default: return `${ch.kind}:${ch.answer}`;
  }
}
// Which question types can practise the same skill in a different form.
export const REVIEW_AS = {
  starts: ['pickStart', 'starts'], pickStart: ['starts', 'pickStart'],
  word: ['missing', 'word', 'spell'], missing: ['word', 'missing', 'spell'], spell: ['missing', 'spell', 'word'],
  add: ['story', 'add'], sub: ['story', 'sub'], story: ['add', 'sub', 'story'],
  count: ['flash', 'numeral', 'count'], flash: ['count', 'flash'], numeral: ['count', 'numeral'],
};

function clampLevel(l) {
  return Math.max(1, Math.min(5, Math.round(l || 1)));
}
