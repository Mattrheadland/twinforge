// Original music, sequenced on a 16th-note grid and played by the voices in
// synth.js (supersaw, lead, pluck, sub, bass, pad, brass, bell) with the
// 'modern' drum kit (k kick, s snare, c clap, h hat, o open hat, r crash, t tom).
// Tokens: note (C5, F#4, Bb3, chords as D4+F#4+A4), '-' hold, '.' rest.
//
// Brief (Matt, 2026-10-15): fighting music and adventure themes that hit hard
// and are catchy. Modern arcade / synthwave production, not chiptune.
//
// Helpers keep the 128-step (8-bar) lines readable: B() is one bar of 16 steps,
// R() repeats a bar.

const seq = (s) => s.replace(/\|/g, ' ').trim().split(/\s+/);
const B = (s) => s.trim().split(/\s+/);
const R = (bar, n) => Array.from({ length: n }, () => B(bar)).flat();
const J = (...bars) => bars.flat();

// ---------------------------------------------------------------- BATTLE
// D minor, 160 bpm. A hook that lands on the downbeat, a bass that drives,
// claps on 2 and 4, a riser into every loop.
const battle = {
  bpm: 160, grid: 16, kit: 'modern', loop: true, length: 128,
  parts: [
    { // hook (supersaw): D F A | G F E | D F A | C Bb A ...
      kind: 'tone', inst: 'supersaw', gain: 0.055, lp: 2600, detune: 18, legato: 0.9, verb: 0.3, delay: 0.22,
      notes: J(
        B('D5 - - - . . D5 - F5 - - - A5 - - -'), B('G5 - - - F5 - - - E5 - - - - - - -'),
        B('D5 - - - . . D5 - F5 - - - A5 - - -'), B('C6 - - - Bb5 - - - A5 - - - - - - -'),
        B('D5 - - - F5 - - - A5 - - - D6 - - -'), B('C6 - - - A5 - - - F5 - - - G5 - A5 -'),
        B('Bb5 - - - A5 - G5 - F5 - - - E5 - - -'), B('D5 - - - - - - - . . . . . . . .'),
      ),
    },
    { // answer line (lead, an octave down, fills the gaps)
      kind: 'tone', inst: 'lead', gain: 0.045, lp: 2200, legato: 0.6, verb: 0.2, delay: 0.3,
      notes: J(
        B('. . . . . . . . . . . . . . D4 F4'), B('. . . . . . . . A4 - G4 - F4 - E4 -'),
        B('. . . . . . . . . . . . . . D4 F4'), B('. . . . . . . . A4 - Bb4 - C5 - - -'),
        B('. . . . . . . . . . . . . . . .'), B('. . . . . . . . . . . . . . . .'),
        B('. . . . . . . . . . . . . . . .'), B('A4 - F4 - D4 - - - A3 - C4 - D4 - - -'),
      ),
    },
    { // bass: growl on 8ths with 16th pickups
      kind: 'tone', inst: 'bass', gain: 0.2, lp: 480, legato: 0.8,
      notes: J(
        B('D2 - D2 - D2 - D2 D2 D2 - D2 - D2 - D3 -'), B('Bb1 - Bb1 - Bb1 - Bb1 Bb1 Bb1 - Bb1 - Bb1 - Bb2 -'),
        B('D2 - D2 - D2 - D2 D2 D2 - D2 - D2 - D3 -'), B('C2 - C2 - C2 - C2 C2 A1 - A1 - A1 - A2 -'),
        B('D2 - D2 - D2 - D2 D2 D2 - D2 - D2 - D3 -'), B('F2 - F2 - F2 - F2 F2 C2 - C2 - C2 - C3 -'),
        B('G1 - G1 - G1 - G1 G1 A1 - A1 - A1 - A1 A1'), B('D2 - D2 - D2 - D2 D2 D2 - D2 - D2 D2 D2 D2'),
      ),
    },
    { // sub: long roots under the bass
      kind: 'tone', inst: 'sub', gain: 0.22, legato: 0.95,
      notes: J(
        B('D1 - - - - - - - - - - - - - - -'), B('Bb0 - - - - - - - - - - - - - - -'),
        B('D1 - - - - - - - - - - - - - - -'), B('C1 - - - - - - - A0 - - - - - - -'),
        B('D1 - - - - - - - - - - - - - - -'), B('F1 - - - - - - - C1 - - - - - - -'),
        B('G0 - - - - - - - A0 - - - - - - -'), B('D1 - - - - - - - - - - - - - - -'),
      ),
    },
    { // brass stabs on the "and"s
      kind: 'tone', inst: 'brass', gain: 0.05, lp: 1500, legato: 0.35,
      notes: J(
        B('. . D4+A4 . . . D4+A4 . . . D4+A4 . . . . .'), B('. . Bb3+F4 . . . Bb3+F4 . . . Bb3+F4 . . . . .'),
        B('. . D4+A4 . . . D4+A4 . . . D4+A4 . . . . .'), B('. . C4+G4 . . . C4+G4 . . . A3+E4 . . . A3+E4 .'),
        B('. . D4+A4 . . . D4+A4 . . . D4+A4 . . . . .'), B('. . F4+C5 . . . F4+C5 . . . C4+G4 . . . C4+G4 .'),
        B('. . G3+D4 . . . G3+D4 . . . A3+E4 . . . A3+E4 .'), B('D4+A4+D5 - - - . . . . . . . . . . . .'),
      ),
    },
    { // pad: chords under everything
      kind: 'tone', inst: 'pad', gain: 0.03, lp: 1000, legato: 1, verb: 0.7,
      notes: J(
        B('D3+F3+A3 - - - - - - - - - - - - - - -'), B('Bb2+D3+F3 - - - - - - - - - - - - - - -'),
        B('D3+F3+A3 - - - - - - - - - - - - - - -'), B('C3+E3+G3 - - - - - - - A2+C#3+E3 - - - - - - -'),
        B('D3+F3+A3 - - - - - - - - - - - - - - -'), B('F3+A3+C4 - - - - - - - C3+E3+G3 - - - - - - -'),
        B('G2+Bb2+D3 - - - - - - - A2+C#3+E3 - - - - - - -'), B('D3+F3+A3 - - - - - - - - - - - - - - -'),
      ),
    },
    { // drums: kick on 1 and the "and of 2", clap+snare on 2 and 4, 16th hats
      kind: 'drum', gain: 1,
      notes: J(
        B('kr h h h sc h h h k h k h sc h h h'), B('k h h h sc h h h k h k h sc h h o'),
        B('k h h h sc h h h k h k h sc h h h'), B('k h h h sc h h h k h k h sc h s s'),
        B('k h h h sc h h h k h k h sc h h h'), B('k h h h sc h h h k h k h sc h h o'),
        B('k h h h sc h h h k h k h sc h k h'), B('k h s h k h s h ks s ks s ks s ks s'),
      ),
    },
    { // riser into the loop
      kind: 'riser', gain: 0.2,
      notes: J(R('. . . . . . . . . . . . . . . .', 7), B('r - - - - - - - - - - - - - - -')),
    },
  ],
};

// ------------------------------------------------------------------ BOSS
// E minor, 140 bpm, half-time feel: heavy kick on 1, snare on 3, sub drops,
// a flat-second snarl in the hook. Big, not scary.
const boss = {
  bpm: 140, grid: 16, kit: 'modern', loop: true, length: 128,
  parts: [
    { // hook: low supersaw, long notes, a bend up to F at the turn
      kind: 'tone', inst: 'supersaw', gain: 0.06, lp: 1900, detune: 22, legato: 0.95, verb: 0.4, delay: 0.2,
      notes: J(
        B('E4 - - - - - - - F4 - - - E4 - - -'), B('D4 - - - - - - - - - - - B3 - - -'),
        B('E4 - - - - - - - F4 - - - G4 - - -'), B('A4 - - - G4 - - - F4 - - - E4 - - -'),
        B('E5 - - - - - - - F5 - - - E5 - - -'), B('D5 - - - B4 - - - G4 - - - B4 - - -'),
        B('C5 - - - B4 - - - A4 - - - G4 - - -'), B('F4 - - - - - - - E4 - - - - - - -'),
      ),
    },
    { // pluck arp under the hook, 16ths
      kind: 'tone', inst: 'pluck', gain: 0.04, lp: 1600, legato: 0.5, verb: 0.3, delay: 0.4,
      notes: J(
        B('E3 . B3 . E4 . B3 . E3 . B3 . E4 . B3 .'), B('E3 . B3 . E4 . B3 . E3 . B3 . E4 . B3 .'),
        B('E3 . B3 . E4 . B3 . E3 . B3 . E4 . B3 .'), B('A2 . E3 . A3 . E3 . F3 . C4 . F3 . C4 .'),
        B('E3 . B3 . E4 . B3 . E3 . B3 . E4 . B3 .'), B('E3 . B3 . E4 . B3 . G3 . D4 . G3 . D4 .'),
        B('C3 . G3 . C4 . G3 . A2 . E3 . A3 . E3 .'), B('F3 . C4 . F3 . C4 . E3 . B3 . E3 . B3 .'),
      ),
    },
    { // bass: pounding root, octave jump before the snare
      kind: 'tone', inst: 'bass', gain: 0.22, lp: 400, legato: 0.85,
      notes: J(
        B('E2 - - - E2 - E3 - E2 - - - E2 - E2 E2'), B('E2 - - - E2 - E3 - E2 - - - E2 - E2 E2'),
        B('E2 - - - E2 - E3 - E2 - - - E2 - E2 E2'), B('A1 - - - A1 - A2 - F2 - - - F2 - F2 F2'),
        B('E2 - - - E2 - E3 - E2 - - - E2 - E2 E2'), B('E2 - - - E2 - E3 - G2 - - - G2 - G2 G2'),
        B('C2 - - - C2 - C3 - A1 - - - A1 - A2 -'), B('F2 - - - F2 - F2 - E2 - - - E2 - E2 E2'),
      ),
    },
    {
      kind: 'tone', inst: 'sub', gain: 0.26, legato: 0.95,
      notes: J(
        B('E1 - - - - - - - - - - - - - - -'), B('E1 - - - - - - - - - - - - - - -'),
        B('E1 - - - - - - - - - - - - - - -'), B('A0 - - - - - - - F1 - - - - - - -'),
        B('E1 - - - - - - - - - - - - - - -'), B('E1 - - - - - - - G1 - - - - - - -'),
        B('C1 - - - - - - - A0 - - - - - - -'), B('F1 - - - - - - - E1 - - - - - - -'),
      ),
    },
    { // brass hits on the downbeats
      kind: 'tone', inst: 'brass', gain: 0.06, lp: 1200, legato: 0.6, verb: 0.4,
      notes: J(
        B('E3+B3+E4 - - - . . . . E3+B3+E4 - - - . . . .'), B('E3+B3+E4 - - - . . . . . . . . . . . .'),
        B('E3+B3+E4 - - - . . . . E3+B3+E4 - - - . . . .'), B('A2+E3+A3 - - - . . . . F3+C4+F4 - - - . . . .'),
        B('E3+B3+E4 - - - . . . . E3+B3+E4 - - - . . . .'), B('E3+B3+E4 - - - . . . . G3+D4+G4 - - - . . . .'),
        B('C3+G3+C4 - - - . . . . A2+E3+A3 - - - . . . .'), B('F3+C4+F4 - - - . . . . E3+B3+E4 - - - - - - -'),
      ),
    },
    {
      kind: 'tone', inst: 'pad', gain: 0.035, lp: 900, legato: 1, verb: 0.75,
      notes: J(
        B('E3+G3+B3 - - - - - - - - - - - - - - -'), B('E3+G3+B3 - - - - - - - - - - - - - - -'),
        B('E3+G3+B3 - - - - - - - - - - - - - - -'), B('A2+C3+E3 - - - - - - - F3+A3+C4 - - - - - - -'),
        B('E3+G3+B3 - - - - - - - - - - - - - - -'), B('E3+G3+B3 - - - - - - - G3+B3+D4 - - - - - - -'),
        B('C3+E3+G3 - - - - - - - A2+C3+E3 - - - - - - -'), B('F3+A3+C4 - - - - - - - E3+G3+B3 - - - - - - -'),
      ),
    },
    { // drums: half-time stomp, toms into the turn
      kind: 'drum', gain: 1,
      notes: J(
        B('kr h . h . h k h s h . h . h k h'), B('k h . h . h k h s h . h k h . h'),
        B('k h . h . h k h s h . h . h k h'), B('k h . h . h k h s h t h t t t t'),
        B('k h . h . h k h s h . h . h k h'), B('k h . h . h k h s h . h k h . h'),
        B('k h . h . h k h s h . h . h k h'), B('k s k s k s k s ks ks ks ks ks ks ks o'),
      ),
    },
    { kind: 'riser', gain: 0.22, notes: J(R('. . . . . . . . . . . . . . . .', 7), B('r - - - - - - - - - - - - - - -')) },
  ],
};

// ----------------------------------------------------------------- TITLE
// C major adventure theme, 128 bpm: pad swell, a hook on supersaw that steps
// up to the high C, brass answering, big drums.
const title = {
  bpm: 128, grid: 16, kit: 'modern', loop: true, length: 128,
  parts: [
    { // hook
      kind: 'tone', inst: 'supersaw', gain: 0.05, lp: 2800, detune: 15, legato: 0.9, verb: 0.35, delay: 0.25,
      notes: J(
        B('C5 - - - E5 - - - G5 - - - - - - -'), B('A5 - - - G5 - - - E5 - - - - - - -'),
        B('F5 - - - G5 - - - A5 - - - G5 - - -'), B('E5 - - - - - - - D5 - - - - - - -'),
        B('C5 - - - E5 - - - G5 - - - C6 - - -'), B('B5 - - - G5 - - - E5 - - - G5 - - -'),
        B('A5 - - - B5 - - - C6 - - - B5 - - -'), B('G5 - - - - - - - - - - - . . . .'),
      ),
    },
    { // brass answers in the gaps
      kind: 'tone', inst: 'brass', gain: 0.05, lp: 1600, legato: 0.6, verb: 0.3, delay: 0.1,
      notes: J(
        B('. . . . . . . . . . . . E4+G4 - F4+A4 -'), B('. . . . . . . . . . . . C4+E4 - D4+F4 -'),
        B('. . . . . . . . . . . . . . . .'), B('G4+B4 - - - A4+C5 - - - B4+D5 - - - - - - -'),
        B('. . . . . . . . . . . . E5+G5 - - -'), B('D5+F5 - - - . . . . . . . . . . . .'),
        B('. . . . . . . . . . . . . . . .'), B('C5+E5 - - - B4+D5 - - - G4+B4 - - - - - - -'),
      ),
    },
    { // pluck arps running underneath
      kind: 'tone', inst: 'pluck', gain: 0.035, lp: 1800, legato: 0.5, verb: 0.35, delay: 0.4,
      notes: J(
        B('C4 . E4 . G4 . E4 . C4 . E4 . G4 . E4 .'), B('A3 . C4 . E4 . C4 . A3 . C4 . E4 . C4 .'),
        B('F3 . A3 . C4 . A3 . F3 . A3 . C4 . A3 .'), B('G3 . B3 . D4 . B3 . G3 . B3 . D4 . B3 .'),
        B('C4 . E4 . G4 . E4 . C4 . E4 . G4 . E4 .'), B('E3 . G3 . B3 . G3 . E3 . G3 . B3 . G3 .'),
        B('F3 . A3 . C4 . A3 . G3 . B3 . D4 . B3 .'), B('C4 . E4 . G4 . C5 . G4 . E4 . C4 . . .'),
      ),
    },
    {
      kind: 'tone', inst: 'bass', gain: 0.18, lp: 460, legato: 0.8,
      notes: J(
        B('C2 - - - C2 - C2 - C2 - - - C2 - E2 G2'), B('A1 - - - A1 - A1 - A1 - - - A1 - C2 E2'),
        B('F1 - - - F1 - F1 - F1 - - - F1 - A1 C2'), B('G1 - - - G1 - G1 - G1 - - - G1 - B1 D2'),
        B('C2 - - - C2 - C2 - C2 - - - C2 - E2 G2'), B('E2 - - - E2 - E2 - E2 - - - E2 - G2 B2'),
        B('F1 - - - F1 - F1 - G1 - - - G1 - G1 G1'), B('C2 - - - C2 - C2 - C2 - - - C2 C2 C2 C2'),
      ),
    },
    {
      kind: 'tone', inst: 'sub', gain: 0.2, legato: 0.95,
      notes: J(
        B('C1 - - - - - - - - - - - - - - -'), B('A0 - - - - - - - - - - - - - - -'),
        B('F0 - - - - - - - - - - - - - - -'), B('G0 - - - - - - - - - - - - - - -'),
        B('C1 - - - - - - - - - - - - - - -'), B('E1 - - - - - - - - - - - - - - -'),
        B('F0 - - - - - - - G0 - - - - - - -'), B('C1 - - - - - - - - - - - - - - -'),
      ),
    },
    {
      kind: 'tone', inst: 'pad', gain: 0.035, lp: 1200, legato: 1, verb: 0.7,
      notes: J(
        B('C3+E3+G3 - - - - - - - - - - - - - - -'), B('A2+C3+E3 - - - - - - - - - - - - - - -'),
        B('F2+A2+C3 - - - - - - - - - - - - - - -'), B('G2+B2+D3 - - - - - - - - - - - - - - -'),
        B('C3+E3+G3 - - - - - - - - - - - - - - -'), B('E3+G3+B3 - - - - - - - - - - - - - - -'),
        B('F2+A2+C3 - - - - - - - G2+B2+D3 - - - - - - -'), B('C3+E3+G3 - - - - - - - - - - - - - - -'),
      ),
    },
    {
      kind: 'drum', gain: 0.95,
      notes: J(
        B('kr h h h sc h h h k h h h sc h h h'), B('k h h h sc h h h k h k h sc h h o'),
        B('k h h h sc h h h k h h h sc h h h'), B('k h h h sc h h h k h k h sc s s s'),
        B('k h h h sc h h h k h h h sc h h h'), B('k h h h sc h h h k h k h sc h h o'),
        B('k h h h sc h h h k h h h sc h h h'), B('k h s h k h s h ks s ks s ks ks ks o'),
      ),
    },
    { kind: 'riser', gain: 0.18, notes: J(R('. . . . . . . . . . . . . . . .', 7), B('r - - - - - - - - - - - - - - -')) },
  ],
};

// ----------------------------------------------------------------- BOARD
// Campaign map, G major, 118 bpm: travelling groove, bells on the hook,
// lighter drums. Still moving.
const board = {
  bpm: 118, grid: 16, kit: 'modern', loop: true, length: 128,
  parts: [
    {
      kind: 'tone', inst: 'bell', gain: 0.07, legato: 0.9, verb: 0.6, delay: 0.3,
      notes: J(
        B('G5 - - - D5 - - - B4 - - - D5 - - -'), B('E5 - - - D5 - - - B4 - - - - - - -'),
        B('C5 - - - D5 - - - E5 - - - G5 - - -'), B('F#5 - - - D5 - - - - - - - . . . .'),
        B('G5 - - - D5 - - - B4 - - - D5 - - -'), B('E5 - - - G5 - - - A5 - - - B5 - - -'),
        B('C6 - - - B5 - - - A5 - - - G5 - - -'), B('F#5 - - - - - - - G5 - - - - - - -'),
      ),
    },
    {
      kind: 'tone', inst: 'pluck', gain: 0.035, lp: 1500, legato: 0.5, verb: 0.35, delay: 0.4,
      notes: J(
        B('G3 . D4 . G4 . D4 . G3 . D4 . G4 . D4 .'), B('C4 . G4 . C5 . G4 . C4 . G4 . C5 . G4 .'),
        B('A3 . E4 . A4 . E4 . A3 . E4 . A4 . E4 .'), B('D4 . F#4 . A4 . F#4 . D4 . F#4 . A4 . F#4 .'),
        B('G3 . D4 . G4 . D4 . G3 . D4 . G4 . D4 .'), B('E3 . B3 . E4 . B3 . E3 . B3 . E4 . B3 .'),
        B('C4 . G4 . C5 . G4 . D4 . A4 . D5 . A4 .'), B('G3 . D4 . G4 . D4 . G3 . D4 . G4 . . .'),
      ),
    },
    {
      kind: 'tone', inst: 'bass', gain: 0.16, lp: 420, legato: 0.8,
      notes: J(
        B('G1 - - - . . G1 - . . G1 - - - B1 D2'), B('C2 - - - . . C2 - . . C2 - - - E2 G2'),
        B('A1 - - - . . A1 - . . A1 - - - C2 E2'), B('D2 - - - . . D2 - . . D2 - - - F#2 A2'),
        B('G1 - - - . . G1 - . . G1 - - - B1 D2'), B('E2 - - - . . E2 - . . E2 - - - G2 B2'),
        B('C2 - - - . . C2 - D2 - - - D2 - D2 D2'), B('G1 - - - . . G1 - . . G1 - - - - -'),
      ),
    },
    {
      kind: 'tone', inst: 'pad', gain: 0.035, lp: 1100, legato: 1, verb: 0.75,
      notes: J(
        B('G3+B3+D4 - - - - - - - - - - - - - - -'), B('C4+E4+G4 - - - - - - - - - - - - - - -'),
        B('A3+C4+E4 - - - - - - - - - - - - - - -'), B('D4+F#4+A4 - - - - - - - - - - - - - - -'),
        B('G3+B3+D4 - - - - - - - - - - - - - - -'), B('E3+G3+B3 - - - - - - - - - - - - - - -'),
        B('C4+E4+G4 - - - - - - - D4+F#4+A4 - - - - - - -'), B('G3+B3+D4 - - - - - - - - - - - - - - -'),
      ),
    },
    {
      kind: 'drum', gain: 0.8,
      notes: J(
        B('k h . h sc h . h . h k h sc h . h'), B('k h . h sc h . h . h k h sc h . o'),
        B('k h . h sc h . h . h k h sc h . h'), B('k h . h sc h . h . h k h sc h s s'),
        B('k h . h sc h . h . h k h sc h . h'), B('k h . h sc h . h . h k h sc h . o'),
        B('k h . h sc h . h . h k h sc h . h'), B('k h . h sc h . h ks s ks s ks s o .'),
      ),
    },
  ],
};

// ------------------------------------------------------- BATTLE: CASTLE
// Castle Courtyard. Heroic knights' march, F major with a D minor turn,
// 150 bpm. Brass carries the tune, snare rolls, bells on the answer.
const battleCastle = {
  bpm: 150, grid: 16, kit: 'modern', loop: true, length: 128,
  parts: [
    { // brass tune
      kind: 'tone', inst: 'brass', gain: 0.07, lp: 1900, legato: 0.85, verb: 0.35, delay: 0.15,
      notes: J(
        B('F4 - - - A4 - - - C5 - - - F5 - - -'), B('E5 - - - C5 - - - A4 - - - - - - -'),
        B('G4 - - - Bb4 - - - D5 - - - G5 - - -'), B('F5 - - - E5 - - - C5 - - - - - - -'),
        B('F4 - - - A4 - - - C5 - - - F5 - - -'), B('G5 - - - A5 - - - Bb5 - - - A5 - - -'),
        B('G5 - - - F5 - - - E5 - - - D5 - - -'), B('C5 - - - - - - - F5 - - - - - - -'),
      ),
    },
    { // supersaw doubles the tune an octave up on the second half
      kind: 'tone', inst: 'supersaw', gain: 0.03, lp: 2600, detune: 14, legato: 0.9, verb: 0.35, delay: 0.2,
      notes: J(
        R('. . . . . . . . . . . . . . . .', 4),
        B('F5 - - - A5 - - - C6 - - - F6 - - -'), B('G6 - - - A6 - - - Bb6 - - - A6 - - -'),
        B('G6 - - - F6 - - - E6 - - - D6 - - -'), B('C6 - - - - - - - F6 - - - - - - -'),
      ),
    },
    { // bells answering
      kind: 'tone', inst: 'bell', gain: 0.05, legato: 0.9, verb: 0.6, delay: 0.3,
      notes: J(
        B('. . . . . . . . . . . . C6 - A5 -'), B('. . . . . . . . F5 - A5 - C6 - - -'),
        B('. . . . . . . . . . . . D6 - Bb5 -'), B('. . . . . . . . G5 - Bb5 - D6 - - -'),
        R('. . . . . . . . . . . . . . . .', 3), B('. . . . . . . . A5 - C6 - F6 - - -'),
      ),
    },
    { // march bass
      kind: 'tone', inst: 'bass', gain: 0.2, lp: 500, legato: 0.8,
      notes: J(
        B('F2 - - - F2 - F2 - F2 - - - F2 - A2 C3'), B('A1 - - - A1 - A1 - A1 - - - A1 - C2 E2'),
        B('G1 - - - G1 - G1 - G1 - - - G1 - Bb1 D2'), B('C2 - - - C2 - C2 - C2 - - - C2 - E2 G2'),
        B('F2 - - - F2 - F2 - F2 - - - F2 - A2 C3'), B('Bb1 - - - Bb1 - Bb1 - Bb1 - - - Bb1 - D2 F2'),
        B('G1 - - - G1 - G1 - C2 - - - C2 - C2 C2'), B('F2 - - - F2 - F2 - F2 - - - F2 F2 F2 F2'),
      ),
    },
    {
      kind: 'tone', inst: 'sub', gain: 0.2, legato: 0.95,
      notes: J(
        B('F1 - - - - - - - - - - - - - - -'), B('A0 - - - - - - - - - - - - - - -'),
        B('G0 - - - - - - - - - - - - - - -'), B('C1 - - - - - - - - - - - - - - -'),
        B('F1 - - - - - - - - - - - - - - -'), B('Bb0 - - - - - - - - - - - - - - -'),
        B('G0 - - - - - - - C1 - - - - - - -'), B('F1 - - - - - - - - - - - - - - -'),
      ),
    },
    {
      kind: 'tone', inst: 'pad', gain: 0.03, lp: 1100, legato: 1, verb: 0.7,
      notes: J(
        B('F3+A3+C4 - - - - - - - - - - - - - - -'), B('A2+C3+E3 - - - - - - - - - - - - - - -'),
        B('G2+Bb2+D3 - - - - - - - - - - - - - - -'), B('C3+E3+G3 - - - - - - - - - - - - - - -'),
        B('F3+A3+C4 - - - - - - - - - - - - - - -'), B('Bb2+D3+F3 - - - - - - - - - - - - - - -'),
        B('G2+Bb2+D3 - - - - - - - C3+E3+G3 - - - - - - -'), B('F3+A3+C4 - - - - - - - - - - - - - - -'),
      ),
    },
    { // march drums: snare rolls into each turn
      kind: 'drum', gain: 0.95,
      notes: J(
        B('kr h h h s h h h k h h h s h s s'), B('k h h h s h h h k h k h s h h h'),
        B('k h h h s h h h k h h h s h s s'), B('k h h h s h h h k h k h s s s s'),
        B('kr h h h s h h h k h h h s h s s'), B('k h h h s h h h k h k h s h h h'),
        B('k h h h s h h h k h h h s h s s'), B('k s s s k s s s ks s ks s ks s ks s'),
      ),
    },
    { kind: 'riser', gain: 0.16, notes: J(R('. . . . . . . . . . . . . . . .', 7), B('r - - - - - - - - - - - - - - -')) },
  ],
};

// --------------------------------------------------------- BATTLE: PIER
// Fishing Pier. Funky surf groove, A minor, 136 bpm. Plucks and a slap-ish
// bass on syncopated 16ths, open hats, claps.
const battlePier = {
  bpm: 136, grid: 16, kit: 'modern', loop: true, length: 128,
  parts: [
    { // surf lead on pluck, lots of delay
      kind: 'tone', inst: 'pluck', gain: 0.06, lp: 2200, legato: 0.6, verb: 0.3, delay: 0.45,
      notes: J(
        B('A4 - - A4 . C5 - - E5 - . . D5 - C5 -'), B('A4 - - - . . . . G4 - A4 - C5 - - -'),
        B('A4 - - A4 . C5 - - E5 - . . G5 - E5 -'), B('D5 - - - . . . . C5 - B4 - A4 - - -'),
        B('F4 - - F4 . A4 - - C5 - . . D5 - C5 -'), B('G4 - - G4 . B4 - - D5 - . . E5 - D5 -'),
        B('A4 - - A4 . C5 - - E5 - . . A5 - G5 -'), B('E5 - - - - - - - A4 - - - . . . .'),
      ),
    },
    { // supersaw joins on the second half, an octave up, with a gritty filter
      kind: 'tone', inst: 'lead', gain: 0.035, lp: 2400, legato: 0.7, verb: 0.25, delay: 0.3,
      notes: J(
        R('. . . . . . . . . . . . . . . .', 4),
        B('F5 - - F5 . A5 - - C6 - . . D6 - C6 -'), B('G5 - - G5 . B5 - - D6 - . . E6 - D6 -'),
        B('A5 - - A5 . C6 - - E6 - . . A6 - G6 -'), B('E6 - - - - - - - A5 - - - . . . .'),
      ),
    },
    { // slap-ish bass: pluck voice low, syncopated
      kind: 'tone', inst: 'bass', gain: 0.22, lp: 560, legato: 0.6,
      notes: J(
        B('A1 . . A1 . . A2 . A1 . . A1 . G1 . A1'), B('A1 . . A1 . . A2 . A1 . . A1 . C2 . E2'),
        B('A1 . . A1 . . A2 . A1 . . A1 . G1 . A1'), B('D2 . . D2 . . D3 . D2 . . C2 . B1 . A1'),
        B('F1 . . F1 . . F2 . F1 . . F1 . E1 . F1'), B('G1 . . G1 . . G2 . G1 . . G1 . F#1 . G1'),
        B('A1 . . A1 . . A2 . A1 . . A1 . G1 . A1'), B('E1 . . E1 . . E2 . A1 - - - A1 A1 A1 A1'),
      ),
    },
    {
      kind: 'tone', inst: 'sub', gain: 0.2, legato: 0.95,
      notes: J(
        B('A0 - - - - - - - - - - - - - - -'), B('A0 - - - - - - - - - - - - - - -'),
        B('A0 - - - - - - - - - - - - - - -'), B('D1 - - - - - - - - - - - - - - -'),
        B('F0 - - - - - - - - - - - - - - -'), B('G0 - - - - - - - - - - - - - - -'),
        B('A0 - - - - - - - - - - - - - - -'), B('E1 - - - - - - - A0 - - - - - - -'),
      ),
    },
    { // chord chops on the off-beats
      kind: 'tone', inst: 'brass', gain: 0.04, lp: 1400, legato: 0.3, verb: 0.3, delay: 0.2,
      notes: J(
        B('. . A3+C4+E4 . . . A3+C4+E4 . . . A3+C4+E4 . . . . .'), B('. . A3+C4+E4 . . . A3+C4+E4 . . . G3+B3+D4 . . . . .'),
        B('. . A3+C4+E4 . . . A3+C4+E4 . . . A3+C4+E4 . . . . .'), B('. . D4+F4+A4 . . . D4+F4+A4 . . . C4+E4+G4 . . . . .'),
        B('. . F3+A3+C4 . . . F3+A3+C4 . . . F3+A3+C4 . . . . .'), B('. . G3+B3+D4 . . . G3+B3+D4 . . . G3+B3+D4 . . . . .'),
        B('. . A3+C4+E4 . . . A3+C4+E4 . . . A3+C4+E4 . . . . .'), B('. . E3+G#3+B3 . . . E3+G#3+B3 . . . A3+C4+E4 - - - . .'),
      ),
    },
    {
      kind: 'tone', inst: 'pad', gain: 0.025, lp: 1000, legato: 1, verb: 0.7,
      notes: J(
        B('A2+C3+E3 - - - - - - - - - - - - - - -'), B('A2+C3+E3 - - - - - - - - - - - - - - -'),
        B('A2+C3+E3 - - - - - - - - - - - - - - -'), B('D3+F3+A3 - - - - - - - - - - - - - - -'),
        B('F2+A2+C3 - - - - - - - - - - - - - - -'), B('G2+B2+D3 - - - - - - - - - - - - - - -'),
        B('A2+C3+E3 - - - - - - - - - - - - - - -'), B('E2+G#2+B2 - - - - - - - A2+C3+E3 - - - - - - -'),
      ),
    },
    { // funk drums: kick syncopation, claps on 2 and 4, open hats on the "and"
      kind: 'drum', gain: 0.95,
      notes: J(
        B('kr h h k c h h h . h k h c h o h'), B('k h h k c h h h . h k h c h o h'),
        B('k h h k c h h h . h k h c h o h'), B('k h h k c h h h . h k h c s s s'),
        B('k h h k c h h h . h k h c h o h'), B('k h h k c h h h . h k h c h o h'),
        B('k h h k c h h h . h k h c h o h'), B('k h k h c h k h ks s ks s c . o .'),
      ),
    },
    { kind: 'riser', gain: 0.16, notes: J(R('. . . . . . . . . . . . . . . .', 7), B('r - - - - - - - - - - - - - - -')) },
  ],
};

// ---------------------------------------------------------- BATTLE: BOG
// Bog Shack. Swampy half-time, G minor with chromatic creeps, 124 bpm.
// Sneaky pluck riff, bell stabs, deep sub.
const battleBog = {
  bpm: 124, grid: 16, kit: 'modern', loop: true, length: 128,
  parts: [
    { // sneaky riff
      kind: 'tone', inst: 'pluck', gain: 0.06, lp: 1500, legato: 0.55, verb: 0.35, delay: 0.4,
      notes: J(
        B('G4 . . G4 . Bb4 . . A4 . Ab4 . G4 . . .'), B('. . D5 . . . C5 . Bb4 . . . A4 . . .'),
        B('G4 . . G4 . Bb4 . . A4 . Ab4 . G4 . . .'), B('. . F4 . . . G4 . Bb4 . . . D5 - - -'),
        B('Eb5 . . Eb5 . D5 . . C5 . B4 . Bb4 . . .'), B('. . G5 . . . F5 . Eb5 . . . D5 . . .'),
        B('G4 . . G4 . Bb4 . . A4 . Ab4 . G4 . . .'), B('D5 - - - Db5 - - - C5 - - - - - . .'),
      ),
    },
    { // bell stabs on the half-time snare
      kind: 'tone', inst: 'bell', gain: 0.045, legato: 0.8, verb: 0.6, delay: 0.3,
      notes: J(
        B('. . . . . . . . G5+Bb5 - - - . . . .'), B('. . . . . . . . D5+F5 - - - . . . .'),
        B('. . . . . . . . G5+Bb5 - - - . . . .'), B('. . . . . . . . Bb5+D6 - - - . . . .'),
        B('. . . . . . . . Eb5+G5 - - - . . . .'), B('. . . . . . . . D5+F5 - - - . . . .'),
        B('. . . . . . . . G5+Bb5 - - - . . . .'), B('. . . . . . . . D5+F#5 - - - - - - -'),
      ),
    },
    { // supersaw creeps in on the second half, low
      kind: 'tone', inst: 'supersaw', gain: 0.035, lp: 1500, detune: 20, legato: 0.95, verb: 0.45, delay: 0.2,
      notes: J(
        R('. . . . . . . . . . . . . . . .', 4),
        B('Eb4 - - - - - - - D4 - - - - - - -'), B('C4 - - - - - - - D4 - - - - - - -'),
        B('G3 - - - - - - - Bb3 - - - - - - -'), B('D4 - - - Db4 - - - C4 - - - - - - -'),
      ),
    },
    { // bass: dubby, long notes with 16th pickups
      kind: 'tone', inst: 'bass', gain: 0.2, lp: 380, legato: 0.9,
      notes: J(
        B('G1 - - - - - - - G1 - - - . . G1 Bb1'), B('G1 - - - - - - - G1 - - - . . F1 G1'),
        B('G1 - - - - - - - G1 - - - . . G1 Bb1'), B('F1 - - - - - - - G1 - - - . . A1 Bb1'),
        B('Eb2 - - - - - - - Eb2 - - - . . D2 C2'), B('C2 - - - - - - - D2 - - - . . D2 D2'),
        B('G1 - - - - - - - G1 - - - . . G1 Bb1'), B('D2 - - - Db2 - - - C2 - - - . . . .'),
      ),
    },
    {
      kind: 'tone', inst: 'sub', gain: 0.26, legato: 0.95,
      notes: J(
        B('G0 - - - - - - - - - - - - - - -'), B('G0 - - - - - - - - - - - - - - -'),
        B('G0 - - - - - - - - - - - - - - -'), B('F0 - - - - - - - G0 - - - - - - -'),
        B('Eb1 - - - - - - - - - - - - - - -'), B('C1 - - - - - - - D1 - - - - - - -'),
        B('G0 - - - - - - - - - - - - - - -'), B('D1 - - - - - - - C1 - - - - - - -'),
      ),
    },
    {
      kind: 'tone', inst: 'pad', gain: 0.03, lp: 800, legato: 1, verb: 0.8,
      notes: J(
        B('G2+Bb2+D3 - - - - - - - - - - - - - - -'), B('G2+Bb2+D3 - - - - - - - - - - - - - - -'),
        B('G2+Bb2+D3 - - - - - - - - - - - - - - -'), B('F2+A2+C3 - - - - - - - G2+Bb2+D3 - - - - - - -'),
        B('Eb3+G3+Bb3 - - - - - - - - - - - - - - -'), B('C3+Eb3+G3 - - - - - - - D3+F#3+A3 - - - - - - -'),
        B('G2+Bb2+D3 - - - - - - - - - - - - - - -'), B('D3+F#3+A3 - - - - - - - - - - - - - - -'),
      ),
    },
    { // half-time, swampy: kick, snare on 3, hats with gaps
      kind: 'drum', gain: 0.95,
      notes: J(
        B('kr . h . . h k . sc . h . . h . k'), B('k . h . . h k . sc . h . k h . h'),
        B('k . h . . h k . sc . h . . h . k'), B('k . h . . h k . sc . h . t t t o'),
        B('k . h . . h k . sc . h . . h . k'), B('k . h . . h k . sc . h . k h . h'),
        B('k . h . . h k . sc . h . . h . k'), B('k . k . s . k . ks . ks . ks s o .'),
      ),
    },
    { kind: 'riser', gain: 0.18, notes: J(R('. . . . . . . . . . . . . . . .', 7), B('r - - - - - - - - - - - - - - -')) },
  ],
};

// ------------------------------------------------------- BATTLE: FOREST
// Haunted Forest. C# harmonic minor, 152 bpm, driving 16th bass, organ-ish
// pad, a spooky supersaw hook with the raised seventh. Spooky-fun, not dark.
const battleForest = {
  bpm: 152, grid: 16, kit: 'modern', loop: true, length: 128,
  parts: [
    { // hook
      kind: 'tone', inst: 'supersaw', gain: 0.05, lp: 2300, detune: 20, legato: 0.9, verb: 0.4, delay: 0.25,
      notes: J(
        B('C#5 - - - - - - - E5 - - - D5 - C#5 -'), B('B#4 - - - - - - - C#5 - - - - - - -'),
        B('C#5 - - - - - - - E5 - - - F#5 - G#5 -'), B('A5 - - - G#5 - - - F#5 - - - E5 - - -'),
        B('C#5 - - - E5 - - - G#5 - - - C#6 - - -'), B('B#5 - - - G#5 - - - E5 - - - F#5 - - -'),
        B('A5 - - - G#5 - - - F#5 - - - E5 - - -'), B('D#5 - - - B#4 - - - C#5 - - - - - - -'),
      ),
    },
    { // pluck ostinato, 16ths, the engine of the track
      kind: 'tone', inst: 'pluck', gain: 0.035, lp: 1700, legato: 0.5, verb: 0.3, delay: 0.3,
      notes: J(
        B('C#4 G#3 C#4 E4 C#4 G#3 C#4 E4 C#4 G#3 C#4 E4 C#4 G#3 C#4 E4'), B('C#4 G#3 B#3 E4 C#4 G#3 B#3 E4 C#4 G#3 B#3 E4 C#4 G#3 B#3 E4'),
        B('C#4 G#3 C#4 E4 C#4 G#3 C#4 E4 C#4 G#3 C#4 E4 C#4 G#3 C#4 E4'), B('A3 E4 A4 E4 A3 E4 A4 E4 G#3 D#4 G#4 D#4 G#3 D#4 G#4 D#4'),
        B('C#4 G#3 C#4 E4 C#4 G#3 C#4 E4 C#4 G#3 C#4 E4 C#4 G#3 C#4 E4'), B('E4 B3 E4 G#4 E4 B3 E4 G#4 F#4 C#4 F#4 A4 F#4 C#4 F#4 A4'),
        B('A3 E4 A4 E4 A3 E4 A4 E4 G#3 D#4 G#4 D#4 G#3 D#4 G#4 D#4'), B('G#3 B#3 D#4 B#3 G#3 B#3 D#4 B#3 C#4 G#3 C#4 E4 C#4 G#3 C#4 E4'),
      ),
    },
    { // driving bass, 8ths with 16th doubles
      kind: 'tone', inst: 'bass', gain: 0.21, lp: 460, legato: 0.75,
      notes: J(
        B('C#2 - C#2 - C#2 - C#2 C#2 C#2 - C#2 - C#2 - C#3 -'), B('C#2 - C#2 - C#2 - C#2 C#2 C#2 - C#2 - B#1 - B#1 -'),
        B('C#2 - C#2 - C#2 - C#2 C#2 C#2 - C#2 - C#2 - C#3 -'), B('A1 - A1 - A1 - A1 A1 G#1 - G#1 - G#1 - G#1 G#1'),
        B('C#2 - C#2 - C#2 - C#2 C#2 C#2 - C#2 - C#2 - C#3 -'), B('E2 - E2 - E2 - E2 E2 F#2 - F#2 - F#2 - F#2 F#2'),
        B('A1 - A1 - A1 - A1 A1 G#1 - G#1 - G#1 - G#1 G#1'), B('G#1 - G#1 - G#1 - G#1 G#1 C#2 - C#2 - C#2 C#2 C#2 C#2'),
      ),
    },
    {
      kind: 'tone', inst: 'sub', gain: 0.22, legato: 0.95,
      notes: J(
        B('C#1 - - - - - - - - - - - - - - -'), B('C#1 - - - - - - - - - - - - - - -'),
        B('C#1 - - - - - - - - - - - - - - -'), B('A0 - - - - - - - G#0 - - - - - - -'),
        B('C#1 - - - - - - - - - - - - - - -'), B('E1 - - - - - - - F#1 - - - - - - -'),
        B('A0 - - - - - - - G#0 - - - - - - -'), B('G#0 - - - - - - - C#1 - - - - - - -'),
      ),
    },
    { // organ-ish pad: brighter filter, longer
      kind: 'tone', inst: 'pad', gain: 0.04, lp: 1500, legato: 1, verb: 0.75,
      notes: J(
        B('C#3+E3+G#3 - - - - - - - - - - - - - - -'), B('C#3+E3+G#3 - - - - - - - G#2+B#2+D#3 - - - - - - -'),
        B('C#3+E3+G#3 - - - - - - - - - - - - - - -'), B('A2+C#3+E3 - - - - - - - G#2+B#2+D#3 - - - - - - -'),
        B('C#3+E3+G#3 - - - - - - - - - - - - - - -'), B('E3+G#3+B3 - - - - - - - F#3+A3+C#4 - - - - - - -'),
        B('A2+C#3+E3 - - - - - - - G#2+B#2+D#3 - - - - - - -'), B('G#2+B#2+D#3 - - - - - - - C#3+E3+G#3 - - - - - - -'),
      ),
    },
    { // brass hits on the hook's landings
      kind: 'tone', inst: 'brass', gain: 0.045, lp: 1500, legato: 0.4, verb: 0.35,
      notes: J(
        B('C#4+G#4 - . . . . . . . . . . . . . .'), B('. . . . . . . . C#4+G#4 - . . . . . .'),
        B('C#4+G#4 - . . . . . . . . . . . . . .'), B('A3+E4 - . . . . . . F#3+C#4 - . . . . . .'),
        B('C#4+G#4 - . . . . . . . . . . . . . .'), B('E4+B4 - . . . . . . F#4+C#5 - . . . . . .'),
        B('A3+E4 - . . . . . . G#3+D#4 - . . . . . .'), B('G#3+D#4 - . . . . . . C#4+G#4 - - - - - - -'),
      ),
    },
    {
      kind: 'drum', gain: 1,
      notes: J(
        B('kr h h h sc h h h k h k h sc h h h'), B('k h h h sc h h h k h k h sc h h o'),
        B('k h h h sc h h h k h k h sc h h h'), B('k h h h sc h h h k h k h sc s s s'),
        B('k h h h sc h h h k h k h sc h h h'), B('k h h h sc h h h k h k h sc h h o'),
        B('k h h h sc h h h k h k h sc h k h'), B('k s k s k s k s ks s ks s ks ks ks o'),
      ),
    },
    { kind: 'riser', gain: 0.2, notes: J(R('. . . . . . . . . . . . . . . .', 7), B('r - - - - - - - - - - - - - - -')) },
  ],
};

// ------------------------------------------------------------- CZERNOBOG
// The ultimate villain's own piece, in the language of Mussorgsky's "Night on
// Bald Mountain" (1867, public domain): D minor, tremolo strings, a descending
// chromatic brass motif, galloping timpani, the tritone, and a tolling bell.
// Original material; Disney's 1940 arrangement is not used. 16 bars:
// A (bars 1–8) the mountain wakes, B (bars 9–16) the gallop.
const czernobog = {
  bpm: 150, grid: 16, kit: 'modern', loop: true, length: 256,
  parts: [
    { // brass motif: a descending chromatic snarl, then the tritone leap
      kind: 'tone', inst: 'brass', gain: 0.075, lp: 1700, legato: 0.85, verb: 0.45, delay: 0.1,
      notes: J(
        B('A4 - - - G#4 - - - G4 - - - F#4 - - -'), B('F4 - - - E4 - - - D4 - - - - - - -'),
        B('A4 - - - G#4 - - - G4 - - - F#4 - - -'), B('F4 - - - G#4 - - - A4 - - - - - - -'),
        B('D5 - - - C#5 - - - C5 - - - B4 - - -'), B('Bb4 - - - A4 - - - G#4 - - - - - - -'),
        B('A4 - - - Eb5 - - - A4 - - - Eb5 - - -'), B('D5 - - - - - - - - - - - . . . .'),
        // B: stabs answering the gallop
        B('D4+A4 - . . . . . . D4+A4 - . . . . . .'), B('D4+A4 - . . . . . . F4+C5 - . . . . . .'),
        B('G4+D5 - . . . . . . G4+D5 - . . . . . .'), B('G#4+D5 - . . . . . . A4+E5 - . . . . . .'),
        B('D5+A5 - . . . . . . D5+A5 - . . . . . .'), B('D5+A5 - . . . . . . F5+C6 - . . . . . .'),
        B('Bb4+F5 - . . . . . . A4+E5 - . . . . . .'), B('G#4+D5 - - - A4+E5 - - - D5+A5 - - - - - - -'),
      ),
    },
    { // supersaw doubles the motif an octave down, dark
      kind: 'tone', inst: 'supersaw', gain: 0.045, lp: 1300, detune: 24, legato: 0.95, verb: 0.5, delay: 0.15,
      notes: J(
        B('A3 - - - G#3 - - - G3 - - - F#3 - - -'), B('F3 - - - E3 - - - D3 - - - - - - -'),
        B('A3 - - - G#3 - - - G3 - - - F#3 - - -'), B('F3 - - - G#3 - - - A3 - - - - - - -'),
        B('D4 - - - C#4 - - - C4 - - - B3 - - -'), B('Bb3 - - - A3 - - - G#3 - - - - - - -'),
        B('A3 - - - Eb4 - - - A3 - - - Eb4 - - -'), B('D4 - - - - - - - - - - - . . . .'),
        // B: the witches' rising figure
        B('D4 - E4 - F4 - G4 - A4 - Bb4 - A4 - G4 -'), B('F4 - E4 - D4 - - - . . . . . . . .'),
        B('D4 - E4 - F4 - G4 - A4 - Bb4 - C5 - C#5 -'), B('D5 - - - - - - - . . . . . . . .'),
        B('A4 - G#4 - G4 - F#4 - F4 - E4 - Eb4 - D4 -'), B('C#4 - D4 - Eb4 - E4 - F4 - F#4 - G4 - G#4 -'),
        B('A4 - - - Eb5 - - - A4 - - - Eb5 - - -'), B('A4 - - - G#4 - - - A4 - - - - - - -'),
      ),
    },
    { // tremolo strings: fast repeated chord tones on the pluck voice
      kind: 'tone', inst: 'pluck', gain: 0.028, lp: 1900, legato: 0.45, verb: 0.5, delay: 0.15,
      notes: J(
        R('D4+F4 A3 D4+F4 A3 D4+F4 A3 D4+F4 A3 D4+F4 A3 D4+F4 A3 D4+F4 A3 D4+F4 A3', 2),
        R('D4+F4 A3 D4+F4 A3 D4+F4 A3 D4+F4 A3 D4+F4 A3 D4+F4 A3 D4+F4 A3 D4+F4 A3', 1), B('D4+F4 Bb3 D4+F4 Bb3 D4+F4 Bb3 D4+F4 Bb3 C#4+E4 A3 C#4+E4 A3 C#4+E4 A3 C#4+E4 A3'),
        R('D4+F4 A3 D4+F4 A3 D4+F4 A3 D4+F4 A3 D4+F4 A3 D4+F4 A3 D4+F4 A3 D4+F4 A3', 1), B('Bb3+D4 G3 Bb3+D4 G3 Bb3+D4 G3 Bb3+D4 G3 A3+C#4 E3 A3+C#4 E3 A3+C#4 E3 A3+C#4 E3'),
        B('D4+F4 A3 D4+F4 A3 Eb4+A4 C4 Eb4+A4 C4 D4+F4 A3 D4+F4 A3 Eb4+A4 C4 Eb4+A4 C4'), B('D4+F4 A3 D4+F4 A3 D4+F4 A3 D4+F4 A3 D4+F4 A3 D4+F4 A3 . . . .'),
        R('. . . . . . . . . . . . . . . .', 8),
      ),
    },
    { // gallop: bass on the B section, dotted feel
      kind: 'tone', inst: 'bass', gain: 0.22, lp: 420, legato: 0.7,
      notes: J(
        B('D2 - - - - - - - D2 - - - - - - -'), B('D2 - - - - - - - D2 - - - . . D2 D2'),
        B('D2 - - - - - - - D2 - - - - - - -'), B('Bb1 - - - - - - - A1 - - - . . A1 A1'),
        B('D2 - - - - - - - D2 - - - - - - -'), B('G1 - - - - - - - A1 - - - . . A1 A1'),
        B('D2 - - - Eb2 - - - D2 - - - Eb2 - - -'), B('D2 - - - - - - - D2 - D2 - D2 D2 D2 D2'),
        B('D2 . D2 D2 . D2 D2 . D2 . D2 D2 . D2 D2 .'), B('D2 . D2 D2 . D2 D2 . F2 . F2 F2 . F2 F2 .'),
        B('G2 . G2 G2 . G2 G2 . G2 . G2 G2 . G2 G2 .'), B('G#2 . G#2 G#2 . G#2 G#2 . A2 . A2 A2 . A2 A2 .'),
        B('D2 . D2 D2 . D2 D2 . D2 . D2 D2 . D2 D2 .'), B('D2 . D2 D2 . D2 D2 . F2 . F2 F2 . F2 F2 .'),
        B('Bb1 . Bb1 Bb1 . Bb1 Bb1 . A1 . A1 A1 . A1 A1 .'), B('G#1 - - - A1 - - - D2 - - - - - - -'),
      ),
    },
    {
      kind: 'tone', inst: 'sub', gain: 0.26, legato: 0.95,
      notes: J(
        B('D1 - - - - - - - - - - - - - - -'), B('D1 - - - - - - - - - - - - - - -'),
        B('D1 - - - - - - - - - - - - - - -'), B('Bb0 - - - - - - - A0 - - - - - - -'),
        B('D1 - - - - - - - - - - - - - - -'), B('G0 - - - - - - - A0 - - - - - - -'),
        B('D1 - - - - - - - - - - - - - - -'), B('D1 - - - - - - - - - - - - - - -'),
        B('D1 - - - - - - - - - - - - - - -'), B('D1 - - - - - - - F1 - - - - - - -'),
        B('G1 - - - - - - - - - - - - - - -'), B('G#1 - - - - - - - A1 - - - - - - -'),
        B('D1 - - - - - - - - - - - - - - -'), B('D1 - - - - - - - F1 - - - - - - -'),
        B('Bb0 - - - - - - - A0 - - - - - - -'), B('G#0 - - - A0 - - - D1 - - - - - - -'),
      ),
    },
    { // the bell tolls on the big arrivals
      kind: 'tone', inst: 'bell', gain: 0.09, legato: 0.95, verb: 0.7, delay: 0.2,
      notes: J(
        B('D3 - - - - - - - - - - - - - - -'), B('. . . . . . . . . . . . . . . .'),
        B('D3 - - - - - - - - - - - - - - -'), B('. . . . . . . . . . . . . . . .'),
        B('D3 - - - - - - - - - - - - - - -'), B('. . . . . . . . . . . . . . . .'),
        B('D3 - - - - - - - Ab3 - - - - - - -'), B('D3 - - - - - - - - - - - - - - -'),
        R('. . . . . . . . . . . . . . . .', 7), B('D3 - - - - - - - D4 - - - - - - -'),
      ),
    },
    { // low choir pad
      kind: 'tone', inst: 'pad', gain: 0.04, lp: 700, legato: 1, verb: 0.8,
      notes: J(
        B('D2+A2+D3 - - - - - - - - - - - - - - -'), B('D2+A2+D3 - - - - - - - - - - - - - - -'),
        B('D2+A2+D3 - - - - - - - - - - - - - - -'), B('Bb2+D3+F3 - - - - - - - A2+C#3+E3 - - - - - - -'),
        B('D2+A2+D3 - - - - - - - - - - - - - - -'), B('G2+Bb2+D3 - - - - - - - A2+C#3+E3 - - - - - - -'),
        B('D2+A2+D3 - - - - - - - Eb2+A2+Eb3 - - - - - - -'), B('D2+A2+D3 - - - - - - - - - - - - - - -'),
        B('D3+F3+A3 - - - - - - - - - - - - - - -'), B('D3+F3+A3 - - - - - - - F3+A3+C4 - - - - - - -'),
        B('G3+Bb3+D4 - - - - - - - - - - - - - - -'), B('G#3+B3+D4 - - - - - - - A3+C#4+E4 - - - - - - -'),
        B('D3+F3+A3 - - - - - - - - - - - - - - -'), B('D3+F3+A3 - - - - - - - F3+A3+C4 - - - - - - -'),
        B('Bb2+D3+F3 - - - - - - - A2+C#3+E3 - - - - - - -'), B('G#2+B2+D3 - - - A2+C#3+E3 - - - D3+F3+A3 - - - - - - -'),
      ),
    },
    { // timpani (toms) and heavy kicks; A is sparse and ominous, B gallops
      kind: 'drum', gain: 1,
      notes: J(
        B('kr . . . . . . . t . . . . . t t'), B('k . . . . . . . t . . . . . . .'),
        B('k . . . . . . . t . . . . . t t'), B('k . . . . . . . t . . . t t t t'),
        B('k . . . . . . . t . . . . . t t'), B('k . . . . . . . t . . . . . . .'),
        B('k . t . k . t . k . t . k . t .'), B('k t t t k t t t kt t kt t kt t kt o'),
        B('kr h s h k h s h k h s h k h s h'), B('k h s h k h s h k h s h k h s t'),
        B('k h s h k h s h k h s h k h s h'), B('k h s h k h s h k t s t k t s t'),
        B('k h s h k h s h k h s h k h s h'), B('k h s h k h s h k h s h k h s t'),
        B('k h s h k h s h k h s h k h s h'), B('kt t kt t ks s ks s kt t kt t ks ks ks o'),
      ),
    },
    { kind: 'riser', gain: 0.22, notes: J(R('. . . . . . . . . . . . . . . .', 7), B('r - - - - - - - - - - - - - - -'), R('. . . . . . . . . . . . . . . .', 7), B('r - - - - - - - - - - - - - - -')) },
  ],
};

// --------------------------------------------------------------- VICTORY
const victory = {
  bpm: 170, grid: 16, kit: 'modern', loop: false, length: 64,
  parts: [
    { kind: 'tone', inst: 'supersaw', gain: 0.07, lp: 3000, detune: 16, legato: 0.95, verb: 0.4, delay: 0.25,
      notes: J(B('G4 - C5 - E5 - G5 - - - E5 - G5 - - -'), B('C6 - - - - - - - B5 - - - C6 - - -'), B('E6 - - - - - - - - - - - - - - -'), B('. . . . . . . . . . . . . . . .')) },
    { kind: 'tone', inst: 'brass', gain: 0.06, lp: 1600, legato: 0.8, verb: 0.4,
      notes: J(B('. . . . . . . . . . . . . . . .'), B('C4+E4+G4 - - - - - - - G3+B3+D4 - - - - - - -'), B('C4+E4+G4+C5 - - - - - - - - - - - - - - -'), B('. . . . . . . . . . . . . . . .')) },
    { kind: 'tone', inst: 'bass', gain: 0.2, lp: 500, legato: 0.85,
      notes: J(B('C2 - . . C2 - . . E2 - . . G2 - . .'), B('C2 - C2 - C2 - C2 - G1 - G1 - G1 - G1 -'), B('C2 - - - - - - - - - - - - - - -'), B('. . . . . . . . . . . . . . . .')) },
    { kind: 'tone', inst: 'sub', gain: 0.22, legato: 0.95,
      notes: J(B('C1 - - - - - - - - - - - - - - -'), B('C1 - - - - - - - G0 - - - - - - -'), B('C1 - - - - - - - - - - - - - - -'), B('. . . . . . . . . . . . . . . .')) },
    { kind: 'drum', gain: 0.95,
      notes: J(B('s . s . s . s . k . . . sc . . .'), B('kr h h h sc h h h k h h h sc h h h'), B('kr . . . . . . . . . . . . . . .'), B('. . . . . . . . . . . . . . . .')) },
  ],
};

// ------------------------------------------------------------------- NAP
const nap = {
  bpm: 96, grid: 16, kit: 'modern', loop: false, length: 48,
  parts: [
    { kind: 'tone', inst: 'bell', gain: 0.08, legato: 0.95, verb: 0.6, notes: J(B('E5 - - - D5 - - - C5 - - - - - - -'), B('G4 - - - A4 - - - C5 - - - - - - -'), B('. . . . . . . . . . . . . . . .')) },
    { kind: 'tone', inst: 'pad', gain: 0.035, lp: 900, legato: 1, verb: 0.7, notes: J(B('C3+E3+G3 - - - - - - - A2+C3+E3 - - - - - - -'), B('F2+A2+C3 - - - - - - - C3+E3+G3 - - - - - - -'), B('. . . . . . . . . . . . . . . .')) },
    { kind: 'tone', inst: 'sub', gain: 0.18, legato: 0.95, notes: J(B('C1 - - - - - - - A0 - - - - - - -'), B('F0 - - - - - - - C1 - - - - - - -'), B('. . . . . . . . . . . . . . . .')) },
  ],
};

export const TRACKS = {
  battle, boss, title, board, victory, nap, czernobog,
  'battle-castle': battleCastle, 'battle-fishing-pier': battlePier, 'battle-bog-shack': battleBog, 'battle-haunted-forest': battleForest,
};

// Which battle track an arena plays (bedroom and the new four's future arenas fall back to 'battle').
export const battleTrackFor = (arenaId, boss) => (boss ? 'boss' : TRACKS[`battle-${arenaId}`] ? `battle-${arenaId}` : 'battle');
