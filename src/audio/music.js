// Original chiptune-style music on an 8th-note grid.
// Tokens: note (C5, F#4, chords as D4+F#4+A4), '-' hold, '.' rest.
// Drum tokens: k kick, s snare, h hat, o open hat (combine: "kh").
// Part options: wave, gain, lp (lowpass Hz), double (detuned second voice, cents),
// legato (0–1 of the step), attack (s), detune (cents).
//
// Brief from Matt (2026-10-15): fighting music and adventure themes that crank,
// not gentle menu loops. Leads are sawtooth with a detuned double, bass is
// square octaves on every 8th, chords are stabs, drums hit on every beat.

const seq = (s) => s.replace(/\|/g, ' ').trim().split(/\s+/);

// ---------------------------------------------------------------- BATTLE
// D minor, 168 bpm, 8 bars. A riff that climbs, a bass that never stops.
const battle = {
  bpm: 168,
  loop: true,
  length: 64,
  parts: [
    { // lead: sawtooth, detuned double, riff → climb → answer
      kind: 'tone', wave: 'sawtooth', gain: 0.085, lp: 2400, double: 11, legato: 0.8, attack: 0.008,
      notes: seq(`
        D5 - - D5 F5 - A5 - | G5 - F5 - E5 - - - | D5 - - D5 F5 - A5 - | C6 - Bb5 - A5 - - - |
        D5 - F5 - A5 - D6 - | C6 - A5 - F5 - G5 A5 | Bb5 - A5 G5 F5 - E5 - | D5 - - - - - . . `),
    },
    { // harmony: a fifth under the lead on the hits
      kind: 'tone', wave: 'sawtooth', gain: 0.04, lp: 1800, legato: 0.6,
      notes: seq(`
        . . . . . . D5 - | . . . . . . . . | . . . . . . D5 - | F5 - D5 - C5 - - - |
        . . . . . . F5 - | E5 - C5 - . . . . | D5 - C5 Bb4 A4 - . . | A4 - - - - - . . `),
    },
    { // bass: square octaves, every 8th
      kind: 'tone', wave: 'square', gain: 0.17, lp: 900, legato: 0.75,
      notes: seq(`
        D2 D3 D2 D3 D2 D3 D2 D3 | Bb1 Bb2 Bb1 Bb2 Bb1 Bb2 Bb1 Bb2 | D2 D3 D2 D3 D2 D3 D2 D3 | C2 C3 C2 C3 A1 A2 A1 A2 |
        D2 D3 D2 D3 D2 D3 D2 D3 | F2 F3 F2 F3 C2 C3 C2 C3 | G1 G2 G1 G2 A1 A2 A1 A2 | D2 D3 D2 D3 D2 D3 D2 D3 `),
    },
    { // power-chord stabs on the off-beats
      kind: 'tone', wave: 'sawtooth', gain: 0.045, lp: 1400, legato: 0.35, double: 9,
      notes: seq(`
        . D4+A4 . D4+A4 . . D4+A4 . | . Bb3+F4 . Bb3+F4 . . Bb3+F4 . | . D4+A4 . D4+A4 . . D4+A4 . | . C4+G4 . C4+G4 . A3+E4 . A3+E4 |
        . D4+A4 . D4+A4 . . D4+A4 . | . F4+C5 . F4+C5 . C4+G4 . C4+G4 | . G3+D4 . G3+D4 . A3+E4 . A3+E4 | D4+A4 . D4+A4 . D4+A4 . . . `),
    },
    { // drums: four on the floor with snare on 2 and 4, double kicks, open hat on the turn
      kind: 'drum', gain: 1.0,
      notes: seq(`
        kh h sh h kh kh sh h | kh h sh h kh kh sh h | kh h sh h kh kh sh h | kh h sh h kh s s ko |
        kh h sh h kh kh sh h | kh h sh h kh kh sh h | kh h sh h kh s kh s | kh s ks s ks s ko . `),
    },
  ],
};

// ------------------------------------------------------------------ BOSS
// Giants and world bosses: slower, heavier, half-time, E minor with a flat
// second for menace. Nothing scary, just big.
const boss = {
  bpm: 132,
  loop: true,
  length: 64,
  parts: [
    { // lead: low saw, long notes, a snarl at the turn
      kind: 'tone', wave: 'sawtooth', gain: 0.09, lp: 1700, double: 14, legato: 0.9, attack: 0.02,
      notes: seq(`
        E4 - - - F4 - E4 - | D4 - - - - - B3 - | E4 - - - F4 - G4 - | A4 - G4 - F4 - E4 - |
        E5 - - - F5 - E5 - | D5 - B4 - G4 - B4 - | C5 - B4 - A4 - G4 - | F4 - - - E4 - - - `),
    },
    { // bass: pounding root, octave jump on the hits
      kind: 'tone', wave: 'square', gain: 0.2, lp: 700, legato: 0.85,
      notes: seq(`
        E2 - E2 - E2 - E3 E2 | E2 - E2 - E2 - E3 E2 | E2 - E2 - E2 - E3 E2 | A1 - A1 - F2 - F2 - |
        E2 - E2 - E2 - E3 E2 | E2 - E2 - G2 - G2 - | C2 - C2 - A1 - A1 - | F2 - F2 - E2 - E2 - `),
    },
    { // chord hits: big saw triads on the downbeats
      kind: 'tone', wave: 'sawtooth', gain: 0.05, lp: 1300, legato: 0.5, double: 10,
      notes: seq(`
        E3+B3+E4 - . . E3+B3+E4 - . . | E3+B3+E4 - . . . . . . | E3+B3+E4 - . . E3+B3+E4 - . . | A2+E3+A3 - . . F3+C4+F4 - . . |
        E3+B3+E4 - . . E3+B3+E4 - . . | E3+B3+E4 - . . G3+D4+G4 - . . | C3+G3+C4 - . . A2+E3+A3 - . . | F3+C4+F4 - . . E3+B3+E4 - - - `),
    },
    { // drums: half-time, heavy kick, snare on 3, open hats roll into the turn
      kind: 'drum', gain: 1.0,
      notes: seq(`
        kh . h . sh . h k | kh . h k sh . h . | kh . h . sh . h k | kh . h k sh s ko . |
        kh . h . sh . h k | kh . h k sh . h . | kh . h . sh . h k | ks s ks s ko . ko . `),
    },
  ],
};

// ----------------------------------------------------------------- TITLE
// Adventure theme: a bold hook in C major, marching drums, 128 bpm, 8 bars.
const title = {
  bpm: 128,
  loop: true,
  length: 64,
  parts: [
    { // lead: sawtooth hook
      kind: 'tone', wave: 'sawtooth', gain: 0.075, lp: 2600, double: 9, legato: 0.85, attack: 0.01,
      notes: seq(`
        C5 - E5 - G5 - - - | A5 - G5 - E5 - - - | F5 - G5 - A5 - G5 - | E5 - - - D5 - - - |
        C5 - E5 - G5 - C6 - | B5 - G5 - E5 - G5 - | A5 - B5 - C6 - B5 - | G5 - - - - - . . `),
    },
    { // counter-line: triangle answering the hook
      kind: 'tone', wave: 'triangle', gain: 0.1, legato: 0.8,
      notes: seq(`
        . . . . . . E4 F4 | . . . . . . C4 D4 | . . . . . . . . | G4 - A4 - B4 - - - |
        . . . . . . E5 - | D5 - . . . . . . | . . . . . . . . | C5 - B4 - G4 - - - `),
    },
    { // bass: square, walking on the 8ths
      kind: 'tone', wave: 'square', gain: 0.15, lp: 800, legato: 0.75,
      notes: seq(`
        C2 C3 C2 C3 C2 C3 E2 G2 | A1 A2 A1 A2 A1 A2 C2 E2 | F1 F2 F1 F2 F1 F2 A1 C2 | G1 G2 G1 G2 G1 G2 B1 D2 |
        C2 C3 C2 C3 C2 C3 E2 G2 | E2 E3 E2 E3 E2 E3 G2 B2 | F1 F2 F1 F2 G1 G2 G1 G2 | C2 C3 C2 C3 C2 C3 C2 C3 `),
    },
    { // chords: stabs on the off-beats, brass-like
      kind: 'tone', wave: 'sawtooth', gain: 0.035, lp: 1500, legato: 0.4, double: 8,
      notes: seq(`
        . C4+E4+G4 . C4+E4+G4 . C4+E4+G4 . . | . A3+C4+E4 . A3+C4+E4 . A3+C4+E4 . . | . F3+A3+C4 . F3+A3+C4 . F3+A3+C4 . . | . G3+B3+D4 . G3+B3+D4 . G3+B3+D4 . G3+B3+D4 |
        . C4+E4+G4 . C4+E4+G4 . C4+E4+G4 . . | . E3+G3+B3 . E3+G3+B3 . E3+G3+B3 . . | . F3+A3+C4 . F3+A3+C4 . G3+B3+D4 . G3+B3+D4 | C4+E4+G4 - . . C4+E4+G4 - . . `),
    },
    { // drums: march with a snare roll into each turn
      kind: 'drum', gain: 0.9,
      notes: seq(`
        kh h sh h kh h sh h | kh h sh h kh h sh h | kh h sh h kh h sh h | kh h sh h ks s s s |
        kh h sh h kh h sh h | kh h sh h kh h sh h | kh h sh h kh h sh h | kh s ks s ko . ko . `),
    },
  ],
};

// ----------------------------------------------------------------- BOARD
// Campaign map: a travelling march, G major, lighter than the title but
// still moving. 120 bpm.
const board = {
  bpm: 120,
  loop: true,
  length: 64,
  parts: [
    {
      kind: 'tone', wave: 'square', gain: 0.07, lp: 2800, double: 7, legato: 0.8,
      notes: seq(`
        G5 - D5 - B4 - D5 - | E5 - D5 - B4 - - - | C5 - D5 - E5 - G5 - | F#5 - D5 - - - . . |
        G5 - D5 - B4 - D5 - | E5 - G5 - A5 - B5 - | C6 - B5 - A5 - G5 - | F#5 - - - G5 - - - `),
    },
    {
      kind: 'tone', wave: 'triangle', gain: 0.16, legato: 0.8,
      notes: seq(`
        G2 - D3 - G2 - D3 - | C2 - G2 - C2 - G2 - | A2 - E3 - A2 - E3 - | D2 - A2 - D2 - F#2 - |
        G2 - D3 - G2 - D3 - | E2 - B2 - E2 - B2 - | C2 - G2 - D2 - A2 - | G2 - D3 - G2 - - - `),
    },
    {
      kind: 'tone', wave: 'sawtooth', gain: 0.03, lp: 1400, legato: 0.4, double: 8,
      notes: seq(`
        . G3+B3+D4 . G3+B3+D4 . G3+B3+D4 . G3+B3+D4 | . C4+E4+G4 . C4+E4+G4 . C4+E4+G4 . C4+E4+G4 | . A3+C4+E4 . A3+C4+E4 . A3+C4+E4 . A3+C4+E4 | . D4+F#4+A4 . D4+F#4+A4 . D4+F#4+A4 . D4+F#4+A4 |
        . G3+B3+D4 . G3+B3+D4 . G3+B3+D4 . G3+B3+D4 | . E3+G3+B3 . E3+G3+B3 . E3+G3+B3 . E3+G3+B3 | . C4+E4+G4 . C4+E4+G4 . D4+F#4+A4 . D4+F#4+A4 | . G3+B3+D4 . G3+B3+D4 . G3+B3+D4 . . `),
    },
    {
      kind: 'drum', gain: 0.75,
      notes: seq(`
        kh . h . sh . h . | kh . h k sh . h . | kh . h . sh . h . | kh . h k sh . s s |
        kh . h . sh . h . | kh . h k sh . h . | kh . h . sh . h . | kh s ks s ko . . . `),
    },
  ],
};

// --------------------------------------------------------------- VICTORY
const victory = {
  bpm: 176,
  loop: false,
  length: 32,
  parts: [
    {
      kind: 'tone', wave: 'sawtooth', gain: 0.1, lp: 3200, double: 10, legato: 0.95,
      notes: seq(`G4 C5 E5 G5 - E5 G5 - | C6 - - - B5 - C6 - | E6 - - - - - - - | . . . . . . . .`),
    },
    {
      kind: 'tone', wave: 'square', gain: 0.14, lp: 1200, legato: 0.9,
      notes: seq(`C3 . C3 . E3 . G3 . | C2 C3 C2 C3 G2 G3 G2 G3 | C2 - - - - - - - | . . . . . . . .`),
    },
    {
      kind: 'tone', wave: 'sawtooth', gain: 0.05, lp: 1600, legato: 0.9, double: 8,
      notes: seq(`. . . . . . . . | C4+E4+G4 - - - G3+B3+D4 - - - | C4+E4+G4+C5 - - - - - - - | . . . . . . . .`),
    },
    { kind: 'drum', gain: 0.9, notes: seq(`s s s s k . s . | ks h s h ks h s h | ko . . . . . . . | . . . . . . . .`) },
  ],
};

// ------------------------------------------------------------------- NAP
const nap = {
  bpm: 96,
  loop: false,
  length: 24,
  parts: [
    { kind: 'tone', wave: 'triangle', gain: 0.16, legato: 0.95, notes: seq(`E5 - D5 - C5 - - - | G4 - A4 - C5 - - - | . . . . . . . .`) },
    { kind: 'tone', wave: 'sine', gain: 0.12, legato: 0.95, notes: seq(`C3 - - - A2 - - - | F2 - - - C3 - - - | . . . . . . . .`) },
  ],
};

export const TRACKS = { battle, boss, title, board, victory, nap };
