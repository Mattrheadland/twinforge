// Upper rungs of the question ladder (design fix 2): levels 6 to 8, for ages 6 to 10.
// Levels 1-5 (logic/challenges.js) reach about first grade; these carry on:
//   6  ladder L4, grade 1     add and take away within 20 · missing addend · tens and ones
//                             · sh / ch / th / wh sounds · read a short sentence
//   7  ladder L5, grade 2     add and take away within 100 · equal groups · skip counting
//                             · read a longer word · read a sentence and answer a question
//   8  ladder L6, grades 3-4  times facts · sharing (division) · half, third, quarter of
//                             · two-step story problems · same and opposite words
//                             · a short story with a question · spelling from sound
// Every question here has FOUR choices, so guessing scores 25%, not 33%. Each one is
// validated before it is shown, like the lower levels. Deterministic given an Rng.
import { PICS, CVC, SPELL_LONGER, STORY_NAMES } from './words.js';

export const UPPER_MATH = {
  6: ['add20', 'sub20', 'missingAdd', 'tens', 'add20', 'sub20'],
  7: ['add100', 'sub100', 'groups', 'skip', 'missingAdd', 'tens'],
  8: ['times', 'times', 'divide', 'fraction', 'twoStep', 'groups'],
};
export const UPPER_READ = {
  6: ['digraph', 'sentence', 'digraph', 'sentence', 'word', 'sight', 'spell'],
  7: ['bigWord', 'comprehend', 'comprehend', 'sentence', 'digraph', 'spell'],
  8: ['vocab', 'vocab', 'paragraph', 'paragraph', 'comprehend', 'spell'],
};
export const UPPER_MATH_KINDS = new Set(Object.values(UPPER_MATH).flat());
export const UPPER_KINDS = new Set([...Object.values(UPPER_MATH), ...Object.values(UPPER_READ)].flat()
  .filter((k) => !['word', 'sight', 'spell'].includes(k)));

const OPTS = 4;
const isInt = Number.isInteger;

// Four different numbers: the answer and near misses (a tens slip, an off-by-one, a mixed-up operation).
function numOpts(answer, rng, near = [1, 2], lo = 0, hi = 200, extra = []) {
  const opts = new Set([answer]);
  for (const e of rng.shuffle([...extra])) if (opts.size < OPTS && isInt(e) && e >= lo && e <= hi) opts.add(e);
  let guard = 0;
  while (opts.size < OPTS && guard++ < 200) {
    const c = answer + rng.pick(near) * (rng.next() < 0.5 ? -1 : 1);
    if (c >= lo && c <= hi) opts.add(c);
  }
  for (let c = lo; opts.size < OPTS; c++) opts.add(c);
  return rng.shuffle([...opts]);
}
// Four different words or pictures: the answer and three others from a pool.
function wordOpts(answer, pool, rng) {
  const others = rng.shuffle(pool.filter((w) => w !== answer)).slice(0, OPTS - 1);
  return rng.shuffle([answer, ...others]);
}

// ---------------- math ----------------
const M = {};
M.add20 = (lv, rng) => {
  const a = rng.int(4, 12), b = rng.int(Math.max(1, 11 - a), 20 - a), n = a + b;
  return { kind: 'add20', show: `${a} + ${b} = ?`, say: `${a} plus ${b}?`, a, b, n, answer: n, options: numOpts(n, rng, [1, 2, 10], 0, 30, [a - b > 0 ? a - b : n + 1]) };
};
M.sub20 = (lv, rng) => {
  const a = rng.int(11, 20), b = rng.int(2, 9), n = a - b;
  return { kind: 'sub20', show: `${a} − ${b} = ?`, say: `${a} take away ${b}?`, a, b, n, answer: n, options: numOpts(n, rng, [1, 2, 10], 0, 30, [a + b]) };
};
M.missingAdd = (lv, rng) => {
  const total = lv >= 7 ? rng.int(12, 20) : rng.pick([10, 10, rng.int(8, 15)]);
  const a = rng.int(1, total - 1), n = total - a;
  return { kind: 'missingAdd', show: `${a} + ? = ${total}`, say: `${a} plus what makes ${total}?`, a, b: total, n, answer: n, options: numOpts(n, rng, [1, 2], 0, 20, [total]) };
};
M.tens = (lv, rng) => {
  const t = rng.int(2, lv >= 7 ? 9 : 5), o = rng.int(0, 9), n = t * 10 + o;
  return { kind: 'tens', show: `${t} tens and ${o} ${o === 1 ? 'one' : 'ones'}`, say: `${t} tens and ${o} ${o === 1 ? 'one' : 'ones'}. What number?`, a: t, b: o, n, answer: n, options: numOpts(n, rng, [1, 10], 10, 99, [o * 10 + t, t + o]) };
};
M.add100 = (lv, rng) => {
  const a = rng.int(12, 68), b = rng.int(5, 99 - a), n = a + b;
  return { kind: 'add100', show: `${a} + ${b} = ?`, say: `${a} plus ${b}?`, a, b, n, answer: n, options: numOpts(n, rng, [1, 10], 0, 100, [n - 10, n + 10]) };
};
M.sub100 = (lv, rng) => {
  const a = rng.int(30, 99), b = rng.int(5, a - 10), n = a - b;
  return { kind: 'sub100', show: `${a} − ${b} = ?`, say: `${a} take away ${b}?`, a, b, n, answer: n, options: numOpts(n, rng, [1, 10], 0, 100, [n + 10, n - 10]) };
};
M.groups = (lv, rng) => {
  const g = rng.int(2, lv >= 8 ? 5 : 4), per = rng.int(2, 5), n = g * per;
  return { kind: 'groups', show: `${g} groups of ${per}`, say: `${g} groups of ${per}. How many in all?`, a: g, b: per, n, answer: n, options: numOpts(n, rng, [1, 2], 1, 30, [g + per, n + per]) };
};
M.skip = (lv, rng) => {
  const step = rng.pick([2, 5, 10]), start = step * rng.int(0, step === 10 ? 4 : 6);
  const seq = Array.from({ length: 5 }, (_, i) => start + i * step);
  const hole = rng.int(2, 4), answer = seq[hole];
  seq[hole] = null;
  const near = rng.shuffle([answer + 1, answer - 1, answer + 2, answer - 2, answer + step + 1, answer - step - 1, answer + 3]).filter((c) => c >= 0 && !seq.includes(c));
  return { kind: 'skip', step, seq, hole, dir: 'up', say: `Count by ${step}s. What number is missing?`, n: answer, answer,
    prompt: `Count by ${step}s. What is missing?`, options: rng.shuffle([answer, ...[...new Set(near)].slice(0, OPTS - 1)]) };
};
M.times = (lv, rng) => {
  const a = rng.int(2, 10), b = rng.int(2, 10), n = a * b;
  return { kind: 'times', show: `${a} × ${b} = ?`, say: `${a} times ${b}?`, a, b, n, answer: n, options: numOpts(n, rng, [a, b, 1], 0, 100, [a + b, n + a, n - b]) };
};
M.divide = (lv, rng) => {
  const b = rng.int(2, 10), n = rng.int(2, 10), a = b * n;
  return { kind: 'divide', show: `${a} ÷ ${b} = ?`, say: `${a} shared into ${b} equal groups. How many in each?`, a, b, n, answer: n, options: numOpts(n, rng, [1, 2], 1, 20, [b, a - b]) };
};
const FRACTIONS = { 2: 'half', 3: 'a third', 4: 'a quarter' };
M.fraction = (lv, rng) => {
  const d = rng.pick([2, 2, 3, 4]), n = rng.int(2, 10), a = d * n;
  return { kind: 'fraction', show: `${FRACTIONS[d]} of ${a}`, say: `What is ${FRACTIONS[d]} of ${a}?`, a, b: d, n, answer: n, options: numOpts(n, rng, [1, 2], 1, 40, [a - n, a / 2 !== n ? a / 2 : n + d]) };
};
M.twoStep = (lv, rng) => {
  const name = rng.pick(STORY_NAMES), bags = rng.int(2, 5), per = rng.int(2, 6), give = rng.int(1, bags * per - 2), n = bags * per - give;
  return { kind: 'twoStep', name, a: bags, b: per, give, n, answer: n, prompt: 'How many are left?',
    show: `${name} has ${bags} bags with ${per} marbles in each. ${name} gives away ${give}. How many are left?`,
    options: numOpts(n, rng, [1, 2], 0, 60, [bags * per, bags + per - give, n + give]) };
};

// ---------------- reading ----------------
const R = {};
// words with a picture that start or end with sh, ch, th or wh
const DIGRAPH_WORDS = { start: { ship: 'sh', shell: 'sh', chair: 'ch', chain: 'ch', whale: 'wh' }, end: { fish: 'sh', watch: 'ch', tooth: 'th' } };
const DIGRAPHS = ['sh', 'ch', 'th', 'wh'];
R.digraph = (lv, rng) => {
  const pos = rng.next() < 0.6 ? 'start' : 'end';
  const word = rng.pick(Object.keys(DIGRAPH_WORDS[pos]).filter((w) => PICS[w]));
  const answer = DIGRAPH_WORDS[pos][word];
  return { kind: 'digraph', pos, word, pic: PICS[word], answer, options: rng.shuffle([...DIGRAPHS]),
    prompt: `Which sound does ${word} ${pos === 'start' ? 'start' : 'end'} with?`, say: `${word}. Which sound does it ${pos === 'start' ? 'start' : 'end'} with?` };
};
const SENTENCES = ['I see a {w}.', 'The {w} is red.', 'Can you get the {w}?', 'A {w} is on the bed.', 'I have a big {w}.'];
R.sentence = (lv, rng) => {
  const pool = CVC.filter((w) => PICS[w] && w !== 'bed');
  const word = rng.pick(pool);
  return { kind: 'sentence', word, answer: word, show: rng.pick(SENTENCES).replace('{w}', word), options: wordOpts(word, pool, rng),
    prompt: 'Read it. Find the picture.' };
};
R.bigWord = (lv, rng) => {
  const pool = SPELL_LONGER.filter((w) => PICS[w]);
  const word = rng.pick(pool);
  return { kind: 'bigWord', word, answer: word, show: word, options: wordOpts(word, pool, rng), prompt: 'Read the word. Find its picture.' };
};
const COLORS = ['red', 'blue', 'green', 'yellow', 'purple'];
const THINGS = ['ball', 'hat', 'kite', 'boat', 'cup', 'drum'];
R.comprehend = (lv, rng) => {
  const name = rng.pick(STORY_NAMES), color = rng.pick(COLORS), thing = rng.pick(THINGS.filter((t) => PICS[t]));
  const show = `${name} has a ${color} ${thing}.`;
  const ask = rng.pick(['color', 'thing', 'who']);
  if (ask === 'color') return { kind: 'comprehend', ask, show, word: thing, answer: color, options: wordOpts(color, COLORS, rng), prompt: `What color is the ${thing}?` };
  if (ask === 'who') return { kind: 'comprehend', ask, show, word: thing, answer: name, options: wordOpts(name, STORY_NAMES, rng), prompt: `Who has the ${thing}?` };
  return { kind: 'comprehend', ask, show, word: thing, answer: thing, options: wordOpts(thing, THINGS.filter((t) => PICS[t]), rng), prompt: `What does ${name} have?` };
};
const PLACES = ['park', 'beach', 'farm', 'zoo', 'shop'];
R.paragraph = (lv, rng) => {
  const [a, b] = rng.shuffle([...STORY_NAMES]);
  const place = rng.pick(PLACES), color = rng.pick(COLORS), thing = rng.pick(THINGS), k = rng.int(2, 6);
  const show = `${a} and ${b} went to the ${place}. ${a} found a ${color} ${thing}. ${b} found ${k} shells.`;
  const ask = rng.pick(['where', 'color', 'count', 'who']);
  const Q = {
    where: ['Where did they go?', place, PLACES],
    color: [`What color was the ${thing}?`, color, COLORS],
    count: [`How many shells did ${b} find?`, String(k), ['2', '3', '4', '5', '6']],
    who: [`Who found the ${thing}?`, a, STORY_NAMES.filter((n) => n !== b)],
  }[ask];
  return { kind: 'paragraph', ask, show, word: thing, answer: Q[1], options: wordOpts(Q[1], Q[2], rng), prompt: Q[0] };
};
const SAME = [['big', 'large'], ['small', 'tiny'], ['happy', 'glad'], ['fast', 'quick'], ['start', 'begin'], ['shout', 'yell'], ['scared', 'afraid'], ['tired', 'sleepy'], ['smart', 'clever'], ['jump', 'leap']];
const OPPOSITE = [['hot', 'cold'], ['up', 'down'], ['full', 'empty'], ['loud', 'quiet'], ['open', 'closed'], ['early', 'late'], ['wet', 'dry'], ['day', 'night'], ['first', 'last'], ['push', 'pull']];
R.vocab = (lv, rng) => {
  const same = rng.next() < 0.5;
  const list = same ? SAME : OPPOSITE;
  const pair = rng.pick(list);
  const [word, answer] = rng.next() < 0.5 ? pair : [pair[1], pair[0]];
  const pool = [...SAME, ...OPPOSITE].filter((p) => p !== pair).flat();
  return { kind: 'vocab', mode: same ? 'same' : 'opposite', word, answer, show: word, options: wordOpts(answer, pool, rng),
    prompt: same ? `Which word means the same as “${word}”?` : `Which word is the opposite of “${word}”?`,
    say: same ? `Which word means the same as ${word}?` : `Which word is the opposite of ${word}?` };
};

export const UPPER_MAKERS = { ...M, ...R };

// ---------------- validation ----------------
const four = (ch) => Array.isArray(ch.options) && ch.options.length === OPTS && new Set(ch.options.map(String)).size === OPTS &&
  ch.options.filter((o) => String(o) === String(ch.answer)).length === 1;
const nums = (ch, lo = 0) => ch.options.every((o) => isInt(o) && o >= lo);

export function validateUpper(ch) {
  if (!ch || !UPPER_KINDS.has(ch.kind) || !four(ch)) return false;
  switch (ch.kind) {
    case 'add20': return ch.a + ch.b === ch.answer && ch.answer > 10 && ch.answer <= 20 && nums(ch);
    case 'sub20': return ch.a - ch.b === ch.answer && ch.a > 10 && ch.a <= 20 && ch.answer >= 1 && nums(ch);
    case 'missingAdd': return ch.a + ch.answer === ch.b && ch.answer >= 1 && nums(ch);
    case 'tens': return ch.a * 10 + ch.b === ch.answer && nums(ch, 10);
    case 'add100': return ch.a + ch.b === ch.answer && ch.answer <= 100 && nums(ch);
    case 'sub100': return ch.a - ch.b === ch.answer && ch.answer >= 1 && nums(ch);
    case 'groups': return ch.a * ch.b === ch.answer && nums(ch, 1);
    case 'skip': {
      if (ch.seq[ch.hole] !== null || ch.seq.filter((x) => x === null).length !== 1) return false;
      const first = ch.hole === 0 ? ch.seq[1] - ch.step : ch.seq[0];
      return ch.seq.every((x, i) => (x === null ? first + i * ch.step === ch.answer : x === first + i * ch.step)) && nums(ch) && ch.options.every((o) => !ch.seq.includes(o));
    }
    case 'times': return ch.a * ch.b === ch.answer && nums(ch);
    case 'divide': return ch.a / ch.b === ch.answer && isInt(ch.answer) && nums(ch, 1);
    case 'fraction': return ch.a / ch.b === ch.answer && FRACTIONS[ch.b] && nums(ch, 1);
    case 'twoStep': return ch.a * ch.b - ch.give === ch.answer && ch.answer >= 1 && nums(ch);
    case 'digraph': return DIGRAPH_WORDS[ch.pos]?.[ch.word] === ch.answer && !!ch.pic && ch.options.every((o) => DIGRAPHS.includes(o));
    case 'sentence': case 'bigWord': return ch.answer === ch.word && ch.show.includes(ch.word) && ch.options.every((o) => PICS[o]);
    case 'comprehend': case 'paragraph': return typeof ch.show === 'string' && ch.show.includes(String(ch.answer));
    case 'vocab': return [...SAME, ...OPPOSITE].some((p) => p.includes(ch.word) && p.includes(ch.answer) && ch.word !== ch.answer) &&
      ch.options.filter((o) => [...SAME, ...OPPOSITE].some((p) => p.includes(ch.word) && p.includes(o) && o !== ch.word)).length === 1;
    default: return false;
  }
}

// makes an upper-level question; challenges.js calls this for the kinds above
export function makeUpper(kind, lv, rng) {
  for (let i = 0; i < 20; i++) {
    const ch = { ...UPPER_MAKERS[kind](lv, rng), level: lv, optType: optTypeOf(kind) };
    if (!ch.prompt) ch.prompt = 'What is the answer?';
    if (validateUpper(ch)) return ch;
  }
  throw new Error(`invalid ${kind} challenge`);
}

function optTypeOf(kind) {
  if (['sentence', 'bigWord'].includes(kind)) return 'pic';
  if (['digraph', 'vocab', 'paragraph', 'comprehend'].includes(kind)) return 'word';
  return 'num';
}
