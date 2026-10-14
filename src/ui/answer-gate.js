// Decides whether a tap on a question card may answer it. Pure (no DOM) so it
// can be unit-tested.
//
// Kids hammer the move button, and the card's answers pop up right where that
// button was (the power move sits under the right-hand answer). So a tap only
// answers once
//  - the answers have had time to pop in (minMs after the card was built), and
//  - the burst of taps that opened the card is over. Every tap that comes within
//    gapMs of the one before it still belongs to that burst, however long he keeps
//    hammering; the first pause ends the burst for good, and from then on taps
//    answer normally.
// (A fixed 800 ms window used to be the only guard: hammering for longer than
// that answered the question at random.)
export const ANSWER_MIN_MS = 800;
export const HAMMER_GAP_MS = 450;

// start: when the card was built (the move tap that opened it).
export function answerGate(start, { minMs = ANSWER_MIN_MS, gapMs = HAMMER_GAP_MS } = {}) {
  let last = start;
  let burst = true;
  return {
    // Call for every pointerdown on the card while it is up. Returns true when
    // this tap may answer.
    down(now) {
      if (burst && now - last >= gapMs) burst = false;
      last = now;
      return !burst && now - start >= minMs;
    },
  };
}
