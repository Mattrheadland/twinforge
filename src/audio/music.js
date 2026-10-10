// Original chiptune-style music on an 8th-note grid.
// Tokens: note (C5, F#4, chords as D4+F#4+A4), '-' hold, '.' rest.
// Drum tokens: k kick, s snare, h hat, o open hat (combine: "kh").

const seq = (s) => s.replace(/\|/g, ' ').trim().split(/\s+/);

const battle = {
  bpm: 144,
  loop: true,
  length: 64,
  parts: [
    {
      kind: 'tone', wave: 'square', gain: 0.075, lp: 2600, double: 7, legato: 0.85,
      notes: seq(`
        A4 - D5 - F#5 E5 D5 - | F#5 - E5 D5 B4 - - - | G4 - B4 D5 G5 - F#5 E5 | E5 - - C#5 A4 - - - |
        A4 - D5 - F#5 - A5 - | B5 - A5 F#5 D5 - B4 - | G5 - F#5 E5 D5 - E5 F#5 | E5 - C#5 - A4 - A5 - `),
    },
    {
      kind: 'tone', wave: 'triangle', gain: 0.22, legato: 0.7,
      notes: seq(`
        D2 D3 D2 D3 D2 D3 D2 D3 | B1 B2 B1 B2 B1 B2 B1 B2 | G1 G2 G1 G2 G1 G2 G1 G2 | A1 A2 A1 A2 A1 A2 C#2 C#3 |
        D2 D3 D2 D3 D2 D3 D2 D3 | B1 B2 B1 B2 B1 B2 B1 B2 | G1 G2 G1 G2 G1 G2 G1 G2 | A1 A2 A1 A2 A1 A2 C#2 C#3 `),
    },
    {
      kind: 'tone', wave: 'square', gain: 0.035, lp: 1500, legato: 0.4,
      notes: seq(`
        . D4+F#4+A4 . D4+F#4+A4 . D4+F#4+A4 . D4+F#4+A4 | . D4+F#4+B4 . D4+F#4+B4 . D4+F#4+B4 . D4+F#4+B4 |
        . D4+G4+B4 . D4+G4+B4 . D4+G4+B4 . D4+G4+B4 | . C#4+E4+A4 . C#4+E4+A4 . C#4+E4+A4 . C#4+E4+A4 |
        . D4+F#4+A4 . D4+F#4+A4 . D4+F#4+A4 . D4+F#4+A4 | . D4+F#4+B4 . D4+F#4+B4 . D4+F#4+B4 . D4+F#4+B4 |
        . D4+G4+B4 . D4+G4+B4 . D4+G4+B4 . D4+G4+B4 | . C#4+E4+A4 . C#4+E4+A4 . C#4+E4+A4 . C#4+E4+A4 `),
    },
    {
      kind: 'drum', gain: 0.9,
      notes: seq(`
        k h s h k k s h | k h s h k k s h | k h s h k k s h | k h s h k s s s |
        k h s h k k s h | k h s h k k s h | k h s h k k s h | k s k s ks s s ko `),
    },
  ],
};

const title = {
  bpm: 116,
  loop: true,
  length: 64,
  parts: [
    {
      kind: 'tone', wave: 'triangle', gain: 0.2, double: 6, legato: 0.85,
      notes: seq(`
        E5 - G5 - C6 - G5 - | A5 - F5 - C5 - - - | D5 - F5 - A5 - G5 F5 | E5 - - - G4 - - - |
        E5 G5 C6 E6 D6 - C6 - | A5 - C6 - F5 - A5 - | G5 - E5 - C5 - D5 E5 | D5 - B4 - C5 - - - `),
    },
    {
      kind: 'tone', wave: 'triangle', gain: 0.2, legato: 0.8,
      notes: seq(`
        C2 - G2 - C3 - G2 - | F2 - C3 - F2 - C3 - | D2 - A2 - F2 - A2 - | G1 - D2 - G2 - B1 - |
        C2 - G2 - C3 - G2 - | F2 - C3 - F2 - A2 - | C2 - G2 - E2 - G2 - | G1 - D2 - G2 - G1 - `),
    },
    {
      kind: 'tone', wave: 'sine', gain: 0.06, legato: 0.5,
      notes: seq(`
        . C5 . E5 . G5 . E5 | . F5 . A5 . C6 . A5 | . D5 . F5 . A5 . F5 | . D5 . G5 . B5 . G5 |
        . C5 . E5 . G5 . E5 | . F5 . A5 . C6 . A5 | . C5 . E5 . G5 . E5 | . D5 . G5 . B5 . D6 `),
    },
    {
      kind: 'drum', gain: 0.6,
      notes: seq(`
        k . h . s . h . | k . h k s . h . | k . h . s . h . | k . h k s . s . |
        k . h . s . h . | k . h k s . h . | k . h . s . h . | k . s . s s s o `),
    },
  ],
};

const victory = {
  bpm: 168,
  loop: false,
  length: 24,
  parts: [
    {
      kind: 'tone', wave: 'square', gain: 0.1, lp: 3200, double: 8, legato: 0.95,
      notes: seq(`G4 C5 E5 G5 - E5 G5 - | C6 - - - - - - - | . . . . . . . .`),
    },
    {
      kind: 'tone', wave: 'triangle', gain: 0.14, legato: 0.95,
      notes: seq(`C3 . C3 . E3 . G3 . | C4+E4+G4 - - - - - - - | . . . . . . . .`),
    },
    { kind: 'drum', gain: 0.8, notes: seq(`s s s s k . s . | ko . . . . . . . | . . . . . . . .`) },
  ],
};

const nap = {
  bpm: 96,
  loop: false,
  length: 24,
  parts: [
    { kind: 'tone', wave: 'triangle', gain: 0.16, legato: 0.95, notes: seq(`E5 - D5 - C5 - - - | G4 - A4 - C5 - - - | . . . . . . . .`) },
    { kind: 'tone', wave: 'sine', gain: 0.12, legato: 0.95, notes: seq(`C3 - - - A2 - - - | F2 - - - C3 - - - | . . . . . . . .`) },
  ],
};

export const TRACKS = { battle, title, victory, nap };
