// Word banks for the reading and spelling questions. The lists themselves live
// in public/words.json (fetched once at start-up, so they stay out of the 1 MB
// index.html); this file fills the shared objects below from it.
//
// Every picture word was picked so a 4-year-old names the picture the way the
// answer expects: no "ladybug" (he'd say bug), no "panda" (bear), no "rabbit"
// (bunny), no fried egg in a pan. Change a word in words.json and the tests
// check it still has a picture. What each list is:
//   PICS        picture (emoji) for every word
//   STARTS      first letter -> words that start with its usual sound
//               (no soft c/g, no sh/ch/th starts, no long-vowel starts, no I/Q/X)
//   ENDS        last letter -> words that clearly end with that sound
//               (no silent e, no x, no plurals, no ng/sh)
//   RHYMES      rhyme families; words in different families never rhyme
//   CVC         short words to read; LONG_WORDS are the level-5 ones
//   SPELL       spellable consonant-vowel-consonant words (plain sounds only)
//   SPELL_LONG, SPELL_LONGER   4- and 5-letter words for the spelling ladder
//   SIGHT       first sight words (Pre-K / K); level 4 uses `easy`

export const PICS = {};
export const STARTS = {};
export const ENDS = {};
export const SIGHT = { easy: [], more: [] };
export const RHYMES = [];
export const CVC = [];
export const LONG_WORDS = [];
export const SPELL = [];
export const SPELL_LONG = []; // 4 letters (frog, drum, nest…), copy / peek / spell-from-sound
export const SPELL_LONGER = []; // 5 letters (truck, train, plant…), level 5 only
// every picture word, for checking a made-up spelling isn't a different real word
export const ALL_WORDS = new Set();

export const wordsReady = () => ALL_WORDS.size > 0;

export function setWords(d) {
  for (const k of Object.keys(PICS)) delete PICS[k];
  Object.assign(PICS, d.PICS);
  Object.assign(STARTS, d.STARTS);
  Object.assign(ENDS, d.ENDS);
  Object.assign(SIGHT, d.SIGHT);
  for (const [list, src] of [[RHYMES, d.RHYMES], [CVC, d.CVC], [LONG_WORDS, d.LONG_WORDS], [SPELL, d.SPELL], [SPELL_LONG, d.SPELL_LONG || []], [SPELL_LONGER, d.SPELL_LONGER || []]]) list.splice(0, list.length, ...src);
  ALL_WORDS.clear();
  for (const w of Object.keys(PICS)) ALL_WORDS.add(w);
}

// Until it arrives (or if it can't, e.g. offline before it was ever cached),
// reading questions are letter matches, which need no words.
export function loadWords(url = 'words.json') {
  return fetch(url)
    .then((r) => r.json())
    .then(setWords)
    .catch((e) => console.warn('word list unavailable, letter questions only', e && e.message));
}

const WORD_LABEL = { yoyo: 'yo-yo' };
export const wordLabel = (w) => WORD_LABEL[w] || w;

// C and K make the same sound (cat, kite): never offer one as the wrong answer for the other.
export const SAME_SOUND = { C: ['K'], K: ['C'] };
// Letters whose sounds a beginner rarely mixes up — used at easier levels.
export const EASY_STARTS = 'BCDFLMPSTZ'.split('');

export const VOWELS = ['a', 'e', 'i', 'o', 'u'];
export const CONSONANTS = 'bcdfghjklmnprstvwz'.split('');

// Toy names for little story problems.
export const STORY_NAMES = ['Rex', 'Remy', 'Billy', 'Arthur', 'Wanda'];
