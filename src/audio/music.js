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

export const TRACKS = { battle, boss, title, board, victory, nap };
