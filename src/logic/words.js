// Word banks for the reading and spelling questions. Every picture word was
// picked so a 4-year-old names the picture the way the answer expects: no
// "ladybug" (he'd say bug), no "panda" (bear), no "rabbit" (bunny), no fried
// egg in a pan. Change a word here and the tests check it still has a picture.

// Pictures (emoji) with their words.
export const PICS = {
  // A–Z picture words
  apple: '🍎', ant: '🐜', axe: '🪓',
  bear: '🐻', ball: '🏀', banana: '🍌', bus: '🚌', bee: '🐝', bed: '🛏️', bat: '🦇', boat: '⛵', box: '📦', book: '📖', bird: '🐦', bell: '🔔', bug: '🐛',
  cat: '🐱', car: '🚗', cake: '🎂', cup: '☕', cow: '🐮', carrot: '🥕', corn: '🌽', coat: '🧥', cookie: '🍪', crab: '🦀', can: '🥫',
  dog: '🐶', duck: '🦆', drum: '🥁', donut: '🍩', dinosaur: '🦕', door: '🚪', deer: '🦌',
  egg: '🥚', elephant: '🐘', elf: '🧝',
  fish: '🐟', frog: '🐸', fox: '🦊', fire: '🔥', feather: '🪶', flower: '🌸',
  grapes: '🍇', goat: '🐐', guitar: '🎸', ghost: '👻', gift: '🎁',
  hat: '🎩', house: '🏠', horse: '🐴', heart: '❤️', hammer: '🔨', hand: '✋', hippo: '🦛', horn: '📯',
  juice: '🧃', jar: '🫙', jellyfish: '🪼',
  kite: '🪁', key: '🔑', king: '🤴', kangaroo: '🦘',
  lion: '🦁', log: '🪵', leaf: '🍃', lemon: '🍋', lips: '👄', lock: '🔒', leg: '🦵',
  moon: '🌙', mouse: '🐭', monkey: '🐵', milk: '🥛', map: '🗺️', mushroom: '🍄',
  nose: '👃', nest: '🪺', nut: '🥜',
  octopus: '🐙', otter: '🦦',
  pig: '🐷', pear: '🍐', pizza: '🍕', pen: '🖊️', penguin: '🐧', pumpkin: '🎃', popcorn: '🍿', pie: '🥧', plant: '🪴',
  rainbow: '🌈', ring: '💍', robot: '🤖', rocket: '🚀', rose: '🌹', rock: '🪨',
  sun: '☀️', snake: '🐍', socks: '🧦', star: '⭐', spoon: '🥄', seal: '🦭', soap: '🧼', sandwich: '🥪', snail: '🐌', sled: '🛷', shell: '🐚', ship: '🚢',
  tree: '🌳', tiger: '🐯', turtle: '🐢', tent: '⛺', train: '🚂', tooth: '🦷', taco: '🌮', tomato: '🍅', truck: '🚚', tie: '👔', ten: '🔟',
  umbrella: '☂️',
  violin: '🎻', volcano: '🌋', vest: '🦺',
  whale: '🐋', watermelon: '🍉', worm: '🪱', watch: '⌚', web: '🕸️',
  yoyo: '🪀', yarn: '🧶',
  zebra: '🦓',
  // rhyme partners
  chair: '🪑', clock: '⏰', cap: '🧢', eye: '👁️', cart: '🛒', chain: '⛓️',
};
const WORD_LABEL = { yoyo: 'yo-yo' };
export const wordLabel = (w) => WORD_LABEL[w] || w;

// First letter → picture words that start with that letter's usual sound.
// (No soft c/g, no sh/ch/th starts, no long-vowel starts, no I/Q/X.)
export const STARTS = {
  A: ['apple', 'ant', 'axe'],
  B: ['bear', 'ball', 'banana', 'bus', 'bee', 'bed', 'bat', 'boat', 'box', 'book', 'bird', 'bell'],
  C: ['cat', 'car', 'cake', 'cup', 'cow', 'carrot', 'corn', 'coat', 'cookie', 'crab', 'can'],
  D: ['dog', 'duck', 'drum', 'donut', 'dinosaur', 'door', 'deer'],
  E: ['egg', 'elephant', 'elf'],
  F: ['fish', 'frog', 'fox', 'fire', 'feather', 'flower'],
  G: ['grapes', 'goat', 'guitar', 'ghost'],
  H: ['hat', 'house', 'horse', 'heart', 'hammer', 'hand', 'hippo'],
  J: ['juice', 'jar', 'jellyfish'],
  K: ['kite', 'key', 'king', 'kangaroo'],
  L: ['lion', 'log', 'leaf', 'lemon', 'lips', 'lock', 'leg'],
  M: ['moon', 'mouse', 'monkey', 'milk', 'map', 'mushroom'],
  N: ['nose', 'nest'],
  O: ['octopus', 'otter'],
  P: ['pig', 'pear', 'pizza', 'pen', 'penguin', 'pumpkin', 'popcorn', 'pie'],
  R: ['rainbow', 'ring', 'robot', 'rocket', 'rose'],
  S: ['sun', 'snake', 'socks', 'star', 'spoon', 'seal', 'soap', 'sandwich', 'snail'],
  T: ['tree', 'tiger', 'turtle', 'tent', 'train', 'tooth', 'taco', 'tomato', 'truck', 'tie'],
  U: ['umbrella'],
  V: ['violin', 'volcano', 'vest'],
  W: ['whale', 'watermelon', 'worm', 'watch'],
  Y: ['yoyo', 'yarn'],
  Z: ['zebra'],
};
// C and K make the same sound (cat, kite): never offer one as the wrong answer for the other.
export const SAME_SOUND = { C: ['K'], K: ['C'] };
// Letters whose sounds a beginner rarely mixes up — used at easier levels.
export const EASY_STARTS = 'BCDFLMPSTZ'.split('');

// Last letter → words that clearly end with that sound (no silent e, no x, no plurals, no ng/sh).
export const ENDS = {
  t: ['cat', 'bat', 'hat', 'nut', 'ant', 'nest', 'tent', 'gift', 'goat', 'boat', 'coat', 'robot', 'rocket'],
  g: ['dog', 'log', 'pig', 'bug', 'leg', 'egg', 'frog'],
  n: ['sun', 'pen', 'ten', 'can', 'moon', 'lion', 'lemon'],
  s: ['bus'],
  p: ['cup', 'map', 'cap'],
  d: ['bed', 'hand', 'bird'],
  b: ['web', 'crab'],
  m: ['drum', 'worm'],
  k: ['milk', 'duck', 'lock', 'book'],
  l: ['bell', 'ball', 'seal', 'snail'],
  f: ['leaf', 'elf'],
};

// Rhyme families. Words in different families never rhyme with each other.
export const RHYMES = [
  ['cat', 'hat', 'bat'], ['dog', 'frog', 'log'], ['bee', 'tree', 'key'], ['cake', 'snake'],
  ['bear', 'pear', 'chair'], ['fox', 'box'], ['goat', 'boat', 'coat'], ['star', 'car', 'jar'],
  ['mouse', 'house'], ['king', 'ring'], ['moon', 'spoon'], ['pen', 'ten'], ['bed', 'sled'],
  ['bell', 'shell'], ['lock', 'clock', 'rock'], ['nose', 'rose'], ['map', 'cap'], ['duck', 'truck'],
  ['pie', 'tie', 'eye'], ['egg', 'leg'], ['heart', 'cart'], ['snail', 'whale'], ['nest', 'vest'],
  ['train', 'chain'], ['corn', 'horn'], ['ant', 'plant'],
];

// Words to read (picture answers). Short ones first; longer ones at level 5.
export const CVC = ['cat', 'bat', 'hat', 'dog', 'log', 'fox', 'box', 'pig', 'bug', 'sun', 'bus', 'cup', 'nut', 'bed', 'web', 'pen', 'ten', 'leg', 'map', 'can', 'cap', 'egg', 'ant'];
export const LONG_WORDS = ['frog', 'drum', 'nest', 'tent', 'crab', 'duck', 'milk', 'hand', 'gift', 'lock', 'fish', 'ship', 'star', 'ring', 'king', 'bell', 'ball', 'book'];
// Spellable consonant-vowel-consonant words (every letter makes its plain sound).
export const SPELL = ['cat', 'bat', 'hat', 'dog', 'log', 'pig', 'bug', 'sun', 'bus', 'cup', 'nut', 'bed', 'web', 'pen', 'ten', 'leg', 'map', 'can', 'cap'];

// First sight words (Pre-K / K lists). Level 4 uses the first group.
export const SIGHT = {
  easy: ['a', 'I', 'go', 'me', 'my', 'see', 'the', 'up', 'we', 'to', 'is', 'it', 'in', 'can', 'and', 'look', 'you', 'no', 'on', 'at'],
  more: ['red', 'big', 'blue', 'come', 'down', 'here', 'help', 'jump', 'little', 'make', 'play', 'run', 'said', 'where', 'yellow', 'funny', 'find', 'away', 'not', 'one', 'two', 'three', 'for', 'like'],
};

export const VOWELS = ['a', 'e', 'i', 'o', 'u'];
export const CONSONANTS = 'bcdfghjklmnprstvwz'.split('');
// every picture word, for checking a made-up spelling isn't a different real word
export const ALL_WORDS = new Set(Object.keys(PICS));

// Toy names for little story problems.
export const STORY_NAMES = ['Rex', 'Remy', 'Billy', 'Arthur', 'Wanda'];
