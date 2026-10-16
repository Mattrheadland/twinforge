// Reads questions aloud with the phone's built-in voice (Web Speech API, works offline on iPhone).
// Grown-up settings: "Read questions aloud", "Voice" volume and "Voice speed".
// iOS only lets a page speak after a tap, so unlockSpeech() runs on the first touch anywhere;
// after that the game can speak on its own.
//
// v6 narration (directive §5): numbers and sums are turned into words before the phone sees them
// (so "3 + 2 = ?" is "three plus two equals what?", never "three plus two equals question mark"),
// each sentence is its own utterance so there is a natural pause between them, the music dips
// while the voice talks (onSpeaking → audio.duck), and the voice has its own volume and speed.
// What a question SAYS is decided in logic/challenges.js; test/narration.test.mjs checks that no
// reading or spelling question gives its answer away by sound.
let enabled = true;
let volume = 1;
let rate = 0.88; // a touch slower than normal for little ears; 'slow' is 0.74
let unlocked = false;
let voice = null;
let duck = null; // (on: boolean) => void, set by the app (music dips while speaking)
let talking = 0;

export const RATES = { normal: 0.88, slow: 0.74 };

export const canSpeak = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';

// on: read aloud at all; vol: 0..1 voice volume; speed: 'normal' | 'slow'
export function setSpeech(on, vol = 1, speed = 'normal') {
  enabled = !!on;
  volume = Math.max(0, Math.min(1, Number.isFinite(+vol) ? +vol : 1));
  rate = RATES[speed] || RATES.normal;
  if (!enabled) stopSpeech();
}
export const speechOn = () => enabled && volume > 0 && canSpeak();
export function onSpeaking(fn) { duck = typeof fn === 'function' ? fn : null; }

function pickVoice() {
  try {
    const vs = window.speechSynthesis.getVoices() || [];
    const en = vs.filter((v) => /^en[-_]/i.test(v.lang));
    // warm, clear voices first; local (offline) voices before network ones
    const local = (list) => list.filter((v) => v.localService !== false);
    const pref = /Samantha|Ava|Allison|Karen|Moira|Tessa|Serena|Google US English/i;
    voice = local(en).find((v) => pref.test(v.name)) || en.find((v) => pref.test(v.name)) ||
      local(en).find((v) => /en[-_]US/i.test(v.lang)) || en.find((v) => /en[-_]US/i.test(v.lang)) || en[0] || null;
  } catch {
    voice = null;
  }
}

export function unlockSpeech() {
  if (unlocked || !canSpeak()) return;
  unlocked = true;
  try {
    const u = new window.SpeechSynthesisUtterance(' ');
    u.volume = 0;
    window.speechSynthesis.speak(u);
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
  } catch { /* no voice: the grown-up reads the line */ }
}

// ---- turning written questions into clear speech (pure; tested) ----
const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
export function numberWord(n) {
  n = Math.floor(n);
  if (n < 0) return 'minus ' + numberWord(-n);
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
  if (n < 1000) return ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' and ' + numberWord(n % 100) : '');
  return String(n);
}

// "3 + 2 = ?" → "three plus two equals what?"; "c_t" → "c, blank, t"; quotes and symbols dropped.
export function speakable(text) {
  let s = String(text ?? '');
  s = s.replace(/[“”"«»]/g, '');
  s = s.replace(/\b([a-z]*)_([a-z]*)\b/gi, (m, a, b) => [a && a.split('').join(', '), 'blank', b && b.split('').join(', ')].filter(Boolean).join(', '));
  s = s.replace(/=\s*\?/g, ' equals what?');
  s = s.replace(/\s*\+\s*/g, ' plus ').replace(/(\d)\s*[−–-]\s*(\d)/g, '$1 minus $2').replace(/(\d)\s*[×x]\s*(\d)/g, '$1 times $2').replace(/\s*=\s*/g, ' equals ');
  s = s.replace(/\b\d{1,3}\b/g, (d) => numberWord(+d));
  return s.replace(/\s+/g, ' ').trim();
}

// One utterance per sentence: the phone pauses naturally between them.
export function phrases(text) {
  return speakable(text).split(/(?<=[.?!:])\s+(?=\S)/).map((p) => p.trim()).filter((p) => /[a-z0-9]/i.test(p));
}

function done() {
  talking = Math.max(0, talking - 1);
  if (!talking && duck) duck(false);
}

export function say(text) {
  if (!text || !speechOn()) return;
  try {
    const s = window.speechSynthesis;
    s.cancel();
    talking = 0;
    if (!voice) pickVoice();
    const parts = phrases(text);
    for (const p of parts) {
      const u = new window.SpeechSynthesisUtterance(p);
      if (voice) u.voice = voice;
      u.lang = voice ? voice.lang : 'en-US';
      u.rate = rate;
      u.pitch = 1.1;
      u.volume = volume;
      u.onend = u.onerror = done;
      talking++;
      s.speak(u);
    }
    if (talking && duck) duck(true);
    // iOS sometimes never fires onend after cancel(): never leave the music ducked for long
    const n = talking;
    setTimeout(() => { if (talking === n && talking) { talking = 0; if (duck) duck(false); } }, 1500 + 900 * parts.join(' ').split(/\s+/).length / rate);
  } catch { /* ignore */ }
}

export function stopSpeech() {
  try { if (canSpeak()) window.speechSynthesis.cancel(); } catch { /* ignore */ }
  if (talking && duck) duck(false);
  talking = 0;
}
