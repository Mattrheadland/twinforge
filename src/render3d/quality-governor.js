// Safety net for older phones. It watches real frame times and only steps the 3D picture down after the
// phone has been slow for a few seconds in a row. A phone that keeps up (a recent iPhone at 60 fps) never
// trips it, so it always gets the full picture. Each step makes the 3D pixels one size chunkier (render
// height 603 -> 402 rows on an iPhone, the same as before PR 18); it never steps back up in a session, so
// the picture can't flicker between sizes, and it never goes below MIN_ROWS.
//
// Pure logic (no three.js) so test/quality-governor.test.mjs can drive it with made-up frame times.

export const MIN_ROWS = 360;

export class QualityGovernor {
  constructor({ windowFrames = 90, slowMs = 22, slowWindows = 2, stallMs = 120, settleFrames = 120 } = {}) {
    Object.assign(this, { windowFrames, slowMs, slowWindows, stallMs, settleFrames });
    this.extraK = 0; // how many sizes chunkier than the normal picture
    this.reset();
  }

  reset() {
    this.buf = [];
    this.slow = 0;
    this.settle = this.settleFrames; // ignore the first frames after a start or a step (loading, shader compile)
  }

  // ft: ms since the last frame. rows(k): render height the picture would have at chunkiness k.
  // Returns true when it just stepped down (the caller re-sizes the renderer).
  sample(ft, rowsAt) {
    if (this.settle > 0) { this.settle--; return false; }
    if (!(ft > 0) || ft >= this.stallMs) return false; // a hitch or a hidden tab, not the phone's pace
    this.buf.push(ft);
    if (this.buf.length < this.windowFrames) return false;
    const s = this.buf.sort((a, b) => a - b), n = s.length, med = s[n >> 1];
    this.buf = [];
    // An even 30 fps (every frame about 33 ms) is the screen running at 30, as in iPhone Low Power Mode,
    // not a phone falling behind, and it doesn't stutter, so it doesn't count as slow.
    const even30 = s[Math.floor(n * 0.1)] > 28 && s[Math.floor(n * 0.9)] < 40;
    this.slow = med > this.slowMs && !even30 ? this.slow + 1 : 0;
    if (this.slow < this.slowWindows) return false;
    if (rowsAt && rowsAt(this.extraK + 1) < MIN_ROWS) { this.slow = 0; return false; }
    this.extraK++;
    this.slow = 0;
    this.settle = this.settleFrames;
    return true;
  }
}
