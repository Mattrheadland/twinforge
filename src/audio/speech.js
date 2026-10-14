// Reads the question aloud with the phone's built-in voice (Web Speech API,
// works offline on iPhone). Grown-up setting: "Read questions aloud".
// iOS only lets a page speak after a tap, so unlockSpeech() runs on the first
// touch anywhere; after that the game can speak on its own.
let enabled = true;
let volume = 1;
let unlocked = false;
let voice = null;

export const canSpeak = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';

export function setSpeech(on, vol = 1) {
  enabled = !!on;
  volume = Math.max(0, Math.min(1, vol));
  if (!enabled) stopSpeech();
}
export const speechOn = () => enabled && volume > 0 && canSpeak();

function pickVoice() {
  try {
    const vs = window.speechSynthesis.getVoices() || [];
    const en = vs.filter((v) => /^en[-_]/i.test(v.lang));
    voice = en.find((v) => /Samantha|Ava|Allison|Karen|Moira|Tessa|Google US English/i.test(v.name)) ||
      en.find((v) => /en[-_]US/i.test(v.lang)) || en[0] || null;
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

export function say(text) {
  if (!text || !speechOn()) return;
  try {
    const s = window.speechSynthesis;
    s.cancel();
    if (!voice) pickVoice();
    const u = new window.SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.lang = voice ? voice.lang : 'en-US';
    u.rate = 0.88; // a touch slower for little ears
    u.pitch = 1.1;
    u.volume = volume;
    s.speak(u);
  } catch { /* ignore */ }
}

export function stopSpeech() {
  try { if (canSpeak()) window.speechSynthesis.cancel(); } catch { /* ignore */ }
}
