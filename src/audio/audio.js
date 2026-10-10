// Web Audio engine: every sound is synthesized (no files), so it is original,
// tiny and works offline. Sounds are triggered by game events, never by timers.
import { TRACKS } from './music.js';

export class Audio {
  constructor() {
    this.ctx = null;
    this.musicVol = 0.6;
    this.sfxVol = 0.9;
    this.unlocked = false;
    this.current = null;
    this.pendingTrack = null;
  }

  // Must run inside a user gesture on iOS.
  unlock() {
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'playback'; // play even with the silent switch on
    } catch {}
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC({ latencyHint: 'interactive' });
      const c = this.ctx;
      this.master = c.createGain();
      this.master.connect(c.destination);
      this.comp = c.createDynamicsCompressor();
      this.comp.threshold.value = -14;
      this.comp.ratio.value = 4;
      this.comp.connect(this.master);
      this.musicBus = c.createGain();
      this.musicBus.gain.value = this.musicVol * 0.55;
      this.musicBus.connect(this.comp);
      this.sfxBus = c.createGain();
      this.sfxBus.gain.value = this.sfxVol;
      this.sfxBus.connect(this.comp);
      const len = c.sampleRate * 1.5;
      this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    // iOS needs a sound started inside the gesture
    const b = this.ctx.createBufferSource();
    b.buffer = this.ctx.createBuffer(1, 1, 22050);
    b.connect(this.ctx.destination);
    b.start(0);
    this.unlocked = true;
    if (this.pendingTrack) {
      const t = this.pendingTrack;
      this.pendingTrack = null;
      this.play(t);
    }
  }

  suspend() {
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {});
  }
  resume() {
    if (this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
  }

  setVolumes(music, sfx) {
    this.musicVol = music;
    this.sfxVol = sfx;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(music * 0.55, now, 0.05);
    this.sfxBus.gain.setTargetAtTime(sfx, now, 0.05);
  }

  get ready() {
    return this.ctx && this.ctx.state === 'running';
  }

  // ---------- low-level voices ----------
  tone(freq, dur, o = {}) {
    const c = this.ctx;
    const t0 = c.currentTime + (o.delay || 0);
    const osc = c.createOscillator();
    osc.type = o.type || 'triangle';
    osc.frequency.setValueAtTime(freq, t0);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t0 + (o.slideTime || dur));
    if (o.detune) osc.detune.value = o.detune;
    const g = c.createGain();
    const a = o.attack ?? 0.005;
    const peak = o.gain ?? 0.3;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node = osc;
    if (o.lp) {
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = o.lp;
      osc.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(o.bus || this.sfxBus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  noise(dur, o = {}) {
    const c = this.ctx;
    const t0 = c.currentTime + (o.delay || 0);
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = o.filter || 'bandpass';
    f.frequency.setValueAtTime(o.freq || 1200, t0);
    if (o.sweep) f.frequency.exponentialRampToValueAtTime(o.sweep, t0 + dur);
    f.Q.value = o.q ?? 1;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.gain ?? 0.3, t0 + (o.attack ?? 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(o.bus || this.sfxBus);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + dur + 0.05);
  }

  // ---------- sound effects ----------
  sfx(name, arg) {
    if (!this.ready || this.sfxVol <= 0) return;
    const fn = SFX[name];
    if (fn) {
      try {
        fn(this, arg);
      } catch (e) {
        /* never let audio break the game */
      }
    }
  }

  // ---------- music ----------
  play(name) {
    if (!this.ctx || !this.unlocked) {
      this.pendingTrack = name;
      return;
    }
    if (this.current && this.current.name === name && !this.current.stopped) return;
    this.stopMusic(0.35);
    const track = TRACKS[name];
    if (!track) return;
    const c = this.ctx;
    const bus = c.createGain();
    bus.gain.value = 0.0001;
    bus.gain.exponentialRampToValueAtTime(1, c.currentTime + 0.4);
    bus.connect(this.musicBus);
    const seq = {
      name, track, bus, stopped: false,
      step: 0,
      next: c.currentTime + 0.08,
      spb: 60 / track.bpm / 2, // 8th-note grid
    };
    this.current = seq;
    const tick = () => {
      if (seq.stopped) return;
      if (c.state === 'running') {
        while (seq.next < c.currentTime + 0.12) {
          this.scheduleStep(seq, seq.step, seq.next);
          seq.next += seq.spb;
          seq.step++;
          if (!track.loop && seq.step >= track.length) {
            seq.stopped = true;
            break;
          }
        }
      } else {
        seq.next = c.currentTime + 0.08;
      }
      seq.timer = setTimeout(tick, 25);
    };
    tick();
  }

  stopMusic(fade = 0.3) {
    const s = this.current;
    if (!s) return;
    s.stopped = true;
    clearTimeout(s.timer);
    if (this.ctx) {
      const now = this.ctx.currentTime;
      s.bus.gain.cancelScheduledValues(now);
      s.bus.gain.setValueAtTime(Math.max(0.0001, s.bus.gain.value), now);
      s.bus.gain.exponentialRampToValueAtTime(0.0001, now + fade);
      setTimeout(() => s.bus.disconnect(), (fade + 0.2) * 1000);
    }
    this.current = null;
  }

  scheduleStep(seq, step, time) {
    const tr = seq.track;
    const len = tr.length;
    const i = step % len;
    const delay = time - this.ctx.currentTime;
    for (const part of tr.parts) {
      const note = part.notes[i];
      if (note == null || note === '-' || note === '.') continue;
      // hold length = following '-' tokens
      let hold = 1;
      while (part.notes[(i + hold) % len] === '-' && hold < 16) hold++;
      const dur = hold * seq.spb * (part.legato ?? 0.9);
      if (part.kind === 'drum') {
        drum(this, note, delay, seq.bus, part.gain ?? 1);
      } else {
        const notes = String(note).split('+');
        for (const n of notes) {
          const f = midiFreq(n);
          if (!f) continue;
          this.tone(f, Math.max(0.08, dur), {
            type: part.wave, gain: part.gain, attack: part.attack ?? 0.01, lp: part.lp, delay, bus: seq.bus, detune: part.detune,
          });
          if (part.double) this.tone(f, Math.max(0.08, dur), { type: part.wave, gain: part.gain * 0.6, attack: part.attack ?? 0.01, lp: part.lp, delay, bus: seq.bus, detune: -part.double });
        }
      }
    }
  }
}

function drum(a, kind, delay, bus, gain) {
  const parts = kind.split('');
  for (const k of parts) {
    if (k === 'k') a.tone(150, 0.22, { type: 'sine', slide: 42, slideTime: 0.16, gain: 0.55 * gain, delay, bus });
    else if (k === 's') {
      a.noise(0.14, { filter: 'bandpass', freq: 1800, q: 0.8, gain: 0.26 * gain, delay, bus });
      a.tone(220, 0.08, { type: 'triangle', gain: 0.12 * gain, delay, bus });
    } else if (k === 'h') a.noise(0.04, { filter: 'highpass', freq: 7000, gain: 0.09 * gain, delay, bus });
    else if (k === 'o') a.noise(0.18, { filter: 'highpass', freq: 6000, gain: 0.08 * gain, delay, bus });
  }
}

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function midiFreq(n) {
  const m = /^([A-G])(#|b)?(\d)$/.exec(n);
  if (!m) return 0;
  let semi = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const midi = 12 * (Number(m[3]) + 1) + semi;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const SFX = {
  tap: (a) => {
    a.tone(880, 0.07, { type: 'triangle', gain: 0.22 });
    a.tone(1320, 0.06, { type: 'sine', gain: 0.1, delay: 0.02 });
  },
  select: (a) => {
    [523, 659, 784].forEach((f, i) => a.tone(f, 0.14, { type: 'square', gain: 0.08, lp: 3000, delay: i * 0.05 }));
  },
  whoosh: (a) => a.noise(0.22, { filter: 'bandpass', freq: 500, sweep: 3200, q: 1.4, gain: 0.32, attack: 0.05 }),
  hit: (a) => {
    a.tone(190, 0.22, { type: 'sine', slide: 50, slideTime: 0.18, gain: 0.7 });
    a.noise(0.09, { filter: 'bandpass', freq: 2400, q: 0.7, gain: 0.45 });
    a.tone(620, 0.06, { type: 'square', gain: 0.08, lp: 2000 });
  },
  bigHit: (a) => {
    a.tone(140, 0.5, { type: 'sine', slide: 35, slideTime: 0.4, gain: 0.85 });
    a.noise(0.35, { filter: 'lowpass', freq: 2200, sweep: 200, gain: 0.55 });
    a.noise(0.08, { filter: 'bandpass', freq: 3000, gain: 0.4 });
  },
  softHit: (a) => {
    a.tone(240, 0.16, { type: 'sine', slide: 90, gain: 0.45 });
    a.noise(0.06, { filter: 'bandpass', freq: 1500, gain: 0.2 });
  },
  shieldUp: (a) => {
    [660, 990, 1320].forEach((f, i) => a.tone(f, 0.5, { type: 'sine', gain: 0.12, attack: 0.04, delay: i * 0.06, slide: f * 1.12 }));
    a.noise(0.4, { filter: 'highpass', freq: 5000, gain: 0.06, attack: 0.1 });
  },
  blocksStack: (a) => [0, 0.08, 0.16, 0.24, 0.32].forEach((d, i) => a.tone(520 + i * 70, 0.09, { type: 'square', gain: 0.1, lp: 1800, delay: d, slide: 300 })),
  block: (a) => {
    a.tone(1500, 0.25, { type: 'triangle', gain: 0.22, slide: 1200 });
    a.tone(2250, 0.2, { type: 'sine', gain: 0.12, delay: 0.01 });
    a.tone(160, 0.12, { type: 'sine', slide: 80, gain: 0.35 });
  },
  perfect: (a) => [784, 988, 1175, 1568].forEach((f, i) => a.tone(f, 0.18, { type: 'square', gain: 0.07, lp: 4000, delay: 0.1 + i * 0.06 })),
  charge: (a) => {
    a.tone(110, 1.0, { type: 'sawtooth', slide: 440, slideTime: 0.95, gain: 0.16, lp: 900, attack: 0.1 });
    a.noise(1.0, { filter: 'bandpass', freq: 400, sweep: 2600, q: 2, gain: 0.12, attack: 0.3 });
  },
  warn: (a) => [0, 0.22].forEach((d) => a.tone(330, 0.16, { type: 'square', gain: 0.1, lp: 1200, delay: d, slide: 260 })),
  powerUp: (a) => [392, 523, 659, 784, 1047].forEach((f, i) => a.tone(f, 0.16, { type: 'square', gain: 0.08, lp: 3500, delay: i * 0.045 })),
  boom: (a) => {
    a.tone(90, 0.9, { type: 'sine', slide: 28, slideTime: 0.8, gain: 0.95 });
    a.noise(0.9, { filter: 'lowpass', freq: 1800, sweep: 120, gain: 0.7, attack: 0.01 });
  },
  blockDrop: (a, i = 0) => {
    a.tone(700 - i * 40, 0.12, { type: 'triangle', slide: 300, gain: 0.3 });
    a.noise(0.05, { filter: 'bandpass', freq: 2500, gain: 0.25 });
    a.tone(130, 0.1, { type: 'sine', slide: 70, gain: 0.35 });
  },
  jump: (a) => a.tone(220, 0.3, { type: 'square', slide: 880, slideTime: 0.25, gain: 0.1, lp: 2400 }),
  fall: (a) => a.tone(1000, 0.4, { type: 'triangle', slide: 160, slideTime: 0.38, gain: 0.14 }),
  dizzy: (a) => [0, 0.12, 0.24, 0.36].forEach((d, i) => a.tone(i % 2 ? 700 : 880, 0.12, { type: 'sine', gain: 0.12, delay: d })),
  energy: (a, n = 1) => {
    for (let i = 0; i < n; i++) [988, 1319].forEach((f, j) => a.tone(f, 0.12, { type: 'sine', gain: 0.14, delay: i * 0.12 + j * 0.05 }));
  },
  ready: (a) => [523, 784, 1047, 1568].forEach((f, i) => a.tone(f, 0.25, { type: 'triangle', gain: 0.16, delay: i * 0.07 })),
  correct: (a) => [523, 659, 784, 1047].forEach((f, i) => a.tone(f, 0.22, { type: 'triangle', gain: 0.2, delay: i * 0.06 })),
  supportCorrect: (a) => [523, 659, 784].forEach((f, i) => a.tone(f, 0.22, { type: 'triangle', gain: 0.16, delay: i * 0.08 })),
  tryAgain: (a) => {
    a.tone(392, 0.16, { type: 'sine', gain: 0.16 });
    a.tone(349, 0.2, { type: 'sine', gain: 0.14, delay: 0.14 });
  },
  count: (a, n = 1) => a.tone(440 * Math.pow(2, (Math.min(n, 20) - 1) / 12), 0.12, { type: 'triangle', gain: 0.18 }),
  pop: (a) => a.tone(600, 0.08, { type: 'sine', slide: 1200, slideTime: 0.06, gain: 0.18 }),
  turn: (a) => [659, 988].forEach((f, i) => a.tone(f, 0.14, { type: 'triangle', gain: 0.14, delay: i * 0.07 })),
  foeTurn: (a) => [330, 247].forEach((f, i) => a.tone(f, 0.14, { type: 'triangle', gain: 0.12, delay: i * 0.08 })),
  land: (a) => {
    a.tone(120, 0.25, { type: 'sine', slide: 45, gain: 0.6 });
    a.noise(0.18, { filter: 'lowpass', freq: 800, gain: 0.3 });
  },
  star: (a, i = 0) => [1047, 1319, 1568].forEach((f, j) => a.tone(f * (1 + i * 0.12), 0.18, { type: 'triangle', gain: 0.14, delay: j * 0.04 })),
  yawn: (a) => a.tone(520, 0.8, { type: 'sine', slide: 260, slideTime: 0.7, gain: 0.12, attack: 0.1 }),
};
