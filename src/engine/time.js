// Game clock + tweens. Everything world-related runs on game time, so it pauses
// when the app is hidden and freezes during hit-stop.

export const Ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => t * (2 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inCubic: (t) => t * t * t,
  outBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  inBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  outElastic: (t) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
  outBounce: (t) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

export class Clock {
  constructor() {
    this.time = 0; // game ms
    this.tweens = [];
    this.freezeLeft = 0;
    this.scale = 1;
  }
  // real dt in ms -> returns world dt actually applied
  step(realDt) {
    if (this.freezeLeft > 0) {
      this.freezeLeft -= realDt;
      return 0;
    }
    const dt = realDt * this.scale;
    this.time += dt;
    const list = this.tweens;
    this.tweens = [];
    const keep = [];
    for (const tw of list) {
      if (tw.cancelled) continue;
      if (tw.delay > 0) {
        tw.delay -= dt;
        keep.push(tw);
        continue;
      }
      if (!tw.started) {
        tw.started = true;
        tw.from = {};
        for (const k in tw.props) tw.from[k] = tw.obj[k];
      }
      tw.t += dt;
      const p = tw.dur <= 0 ? 1 : Math.min(1, tw.t / tw.dur);
      const e = tw.ease(p);
      for (const k in tw.props) tw.obj[k] = tw.from[k] + (tw.props[k] - tw.from[k]) * e;
      tw.onUpdate && tw.onUpdate(p);
      if (p >= 1) tw.resolve();
      else keep.push(tw);
    }
    // tweens created during callbacks were pushed onto this.tweens
    this.tweens = keep.concat(this.tweens);
    return dt;
  }
  to(obj, props, dur, ease = Ease.outQuad, delay = 0, onUpdate = null) {
    return new Promise((resolve) => {
      this.tweens.push({ obj, props, dur, ease, delay, t: 0, started: false, resolve, onUpdate });
    });
  }
  wait(ms) {
    return this.to({}, {}, ms, Ease.linear);
  }
  freeze(ms) {
    this.freezeLeft = Math.max(this.freezeLeft, ms);
  }
  killTweensOf(obj) {
    for (const tw of this.tweens) if (tw.obj === obj) {
      tw.cancelled = true;
      tw.resolve();
    }
  }
}
