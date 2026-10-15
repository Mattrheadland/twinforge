// Modern synth voices and effects for the music engine (audio.js). Everything is
// still generated live, but these are layered, filtered, enveloped sounds with
// reverb, delay and sidechain pumping, not single oscillators.
//
// Instruments (part.inst in music.js): supersaw, lead, pluck, sub, bass, pad,
// brass, bell. Drum kit 'modern': k kick (808-style, pitch drop + click),
// s snare (body + noise + verb), c clap, h hat, o open hat, r crash, t tom.
//
// Every instrument: play(a, freq, t0, dur, part, bus) where `a` is the Audio
// (ctx, noiseBuf, music effects) and `part` carries gain / lp / detune overrides.

const dBtoGain = (db) => Math.pow(10, db / 20);

// Set up the music effect chain once: bus → [dry] + [reverb send] + [delay send] → duck → musicBus.
export function setupMusicFx(a) {
  if (a.mfx) return a.mfx;
  const c = a.ctx;
  const duck = c.createGain(); // sidechain: kicks pull this down for a moment
  duck.connect(a.musicBus);
  // reverb: generated impulse, 1.6 s exponential tail, slightly bright
  const sr = c.sampleRate, len = Math.floor(sr * 1.6);
  const ir = c.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6) * (i < 400 ? i / 400 : 1);
  }
  const verb = c.createConvolver();
  verb.buffer = ir;
  const verbIn = c.createGain(); verbIn.gain.value = 1;
  const verbHp = c.createBiquadFilter(); verbHp.type = 'highpass'; verbHp.frequency.value = 350;
  const verbOut = c.createGain(); verbOut.gain.value = 0.42;
  verbIn.connect(verbHp); verbHp.connect(verb); verb.connect(verbOut); verbOut.connect(duck);
  // delay: dotted-8th at the current tempo (retimed by setTempo), feedback 0.32, darkened
  const delay = c.createDelay(2);
  const delayFb = c.createGain(); delayFb.gain.value = 0.32;
  const delayLp = c.createBiquadFilter(); delayLp.type = 'lowpass'; delayLp.frequency.value = 2600;
  const delayIn = c.createGain();
  const delayOut = c.createGain(); delayOut.gain.value = 0.3;
  delayIn.connect(delay); delay.connect(delayLp); delayLp.connect(delayFb); delayFb.connect(delay); delayLp.connect(delayOut); delayOut.connect(duck);
  const dry = c.createGain(); dry.connect(duck);
  a.mfx = { duck, dry, verbIn, delayIn, delay, setTempo(bpm) { delay.delayTime.value = (60 / bpm) * 0.75; } };
  return a.mfx;
}

// ADSR-ish gain envelope on a GainNode.
function env(g, t0, { a = 0.01, d = 0.08, s = 0.7, r = 0.12, peak = 1, dur }) {
  const p = g.gain;
  p.setValueAtTime(0.0001, t0);
  p.exponentialRampToValueAtTime(Math.max(0.0001, peak), t0 + a);
  p.exponentialRampToValueAtTime(Math.max(0.0001, peak * s), t0 + a + d);
  p.setValueAtTime(Math.max(0.0001, peak * s), Math.max(t0 + a + d, t0 + dur));
  p.exponentialRampToValueAtTime(0.0001, Math.max(t0 + a + d, t0 + dur) + r);
  return t0 + dur + r + 0.05;
}

function osc(c, type, freq, t0, tEnd, detune = 0) {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (detune) o.detune.value = detune;
  o.start(t0);
  o.stop(tEnd);
  return o;
}

// Lowpass with its own envelope: opens to `peakHz`, settles to `restHz`.
function filt(c, t0, { peakHz, restHz, q = 0.8, decay = 0.18 }) {
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.Q.value = q;
  f.frequency.setValueAtTime(peakHz, t0);
  f.frequency.exponentialRampToValueAtTime(Math.max(40, restHz), t0 + decay);
  return f;
}

function sends(a, node, { verb = 0, delay = 0 }) {
  const fx = setupMusicFx(a);
  node.connect(fx.dry);
  if (verb > 0) { const g = a.ctx.createGain(); g.gain.value = verb; node.connect(g); g.connect(fx.verbIn); }
  if (delay > 0) { const g = a.ctx.createGain(); g.gain.value = delay; node.connect(g); g.connect(fx.delayIn); }
}

export const INST = {
  // Big detuned lead: 5 saws + a sub octave, filter envelope, verb + delay.
  supersaw(a, freq, t0, dur, part) {
    const c = a.ctx;
    const g = c.createGain();
    const tEnd = env(g, t0, { a: 0.012, d: 0.1, s: 0.75, r: 0.16, peak: part.gain ?? 0.06, dur });
    const f = filt(c, t0, { peakHz: part.lp ? part.lp * 2.2 : 6000, restHz: part.lp || 2400, q: 1.1, decay: 0.22 });
    const spread = part.detune ?? 16;
    for (const d of [-2, -1, 0, 1, 2]) osc(c, 'sawtooth', freq, t0, tEnd, d * spread).connect(f);
    const sub = osc(c, 'square', freq / 2, t0, tEnd); const sg = c.createGain(); sg.gain.value = 0.35; sub.connect(sg); sg.connect(f);
    f.connect(g);
    sends(a, g, { verb: part.verb ?? 0.35, delay: part.delay ?? 0.25 });
  },
  // Cleaner lead: 2 saws + square, tighter filter, less verb. Good for fast riffs.
  lead(a, freq, t0, dur, part) {
    const c = a.ctx;
    const g = c.createGain();
    const tEnd = env(g, t0, { a: 0.006, d: 0.06, s: 0.8, r: 0.1, peak: part.gain ?? 0.07, dur });
    const f = filt(c, t0, { peakHz: part.lp ? part.lp * 1.8 : 5000, restHz: part.lp || 2800, q: 1.4, decay: 0.12 });
    osc(c, 'sawtooth', freq, t0, tEnd, -9).connect(f);
    osc(c, 'sawtooth', freq, t0, tEnd, 9).connect(f);
    const sq = osc(c, 'square', freq, t0, tEnd); const qg = c.createGain(); qg.gain.value = 0.5; sq.connect(qg); qg.connect(f);
    f.connect(g);
    sends(a, g, { verb: part.verb ?? 0.18, delay: part.delay ?? 0.22 });
  },
  // Plucky arp voice: fast decay, filter snaps shut.
  pluck(a, freq, t0, dur, part) {
    const c = a.ctx;
    const g = c.createGain();
    const tEnd = env(g, t0, { a: 0.003, d: 0.14, s: 0.25, r: 0.08, peak: part.gain ?? 0.07, dur: Math.min(dur, 0.25) });
    const f = filt(c, t0, { peakHz: 7000, restHz: part.lp || 1200, q: 2, decay: 0.1 });
    osc(c, 'sawtooth', freq, t0, tEnd, -6).connect(f);
    osc(c, 'square', freq, t0, tEnd, 6).connect(f);
    f.connect(g);
    sends(a, g, { verb: part.verb ?? 0.3, delay: part.delay ?? 0.35 });
  },
  // Sub bass: sine fundamental + a little square, no verb, tight.
  sub(a, freq, t0, dur, part) {
    const c = a.ctx;
    const g = c.createGain();
    const tEnd = env(g, t0, { a: 0.006, d: 0.05, s: 0.85, r: 0.06, peak: part.gain ?? 0.3, dur });
    osc(c, 'sine', freq, t0, tEnd).connect(g);
    const sq = osc(c, 'square', freq, t0, tEnd); const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260; const qg = c.createGain(); qg.gain.value = 0.35; sq.connect(f); f.connect(qg); qg.connect(g);
    sends(a, g, { verb: 0, delay: 0 });
  },
  // Growly bass: saw through a filter envelope, for the driving 8ths.
  bass(a, freq, t0, dur, part) {
    const c = a.ctx;
    const g = c.createGain();
    const tEnd = env(g, t0, { a: 0.005, d: 0.08, s: 0.7, r: 0.06, peak: part.gain ?? 0.22, dur });
    const f = filt(c, t0, { peakHz: part.lp ? part.lp * 3 : 1800, restHz: part.lp || 420, q: 3, decay: 0.09 });
    osc(c, 'sawtooth', freq, t0, tEnd).connect(f);
    osc(c, 'sawtooth', freq, t0, tEnd, 7).connect(f);
    const sn = osc(c, 'sine', freq / 2, t0, tEnd); const sg = c.createGain(); sg.gain.value = 0.6; sn.connect(sg); sg.connect(g);
    f.connect(g);
    sends(a, g, { verb: 0.04, delay: 0 });
  },
  // Pad: 3 slow detuned saws, dark filter, lots of verb.
  pad(a, freq, t0, dur, part) {
    const c = a.ctx;
    const g = c.createGain();
    const tEnd = env(g, t0, { a: 0.25, d: 0.3, s: 0.9, r: 0.5, peak: part.gain ?? 0.035, dur });
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = part.lp || 1100; f.Q.value = 0.5;
    for (const d of [-12, 0, 12]) osc(c, 'sawtooth', freq, t0, tEnd, d).connect(f);
    f.connect(g);
    sends(a, g, { verb: part.verb ?? 0.7, delay: 0 });
  },
  // Brass stab: saws with a fast filter sweep and short sustain.
  brass(a, freq, t0, dur, part) {
    const c = a.ctx;
    const g = c.createGain();
    const tEnd = env(g, t0, { a: 0.02, d: 0.12, s: 0.6, r: 0.1, peak: part.gain ?? 0.06, dur });
    const f = filt(c, t0, { peakHz: 3600, restHz: part.lp || 1400, q: 1.6, decay: 0.16 });
    for (const d of [-7, 0, 7]) osc(c, 'sawtooth', freq, t0, tEnd, d).connect(f);
    f.connect(g);
    sends(a, g, { verb: part.verb ?? 0.3, delay: part.delay ?? 0.12 });
  },
  // Bell / chime: sine + partial, long ring, verb.
  bell(a, freq, t0, dur, part) {
    const c = a.ctx;
    const g = c.createGain();
    const tEnd = env(g, t0, { a: 0.004, d: 0.6, s: 0.2, r: 0.5, peak: part.gain ?? 0.08, dur });
    osc(c, 'sine', freq, t0, tEnd).connect(g);
    const p = osc(c, 'sine', freq * 2.76, t0, tEnd); const pg = c.createGain(); pg.gain.value = 0.25; p.connect(pg); pg.connect(g);
    sends(a, g, { verb: part.verb ?? 0.6, delay: part.delay ?? 0.3 });
  },
};

// Modern drum kit. Returns nothing; schedules onto the music chain.
export function drumModern(a, kind, t0, gain = 1) {
  const c = a.ctx;
  const fx = setupMusicFx(a);
  const noise = (dur, { type = 'bandpass', freq = 1500, q = 1, sweep, g = 0.3, attack = 0.002, verb = 0 }) => {
    const src = c.createBufferSource(); src.buffer = a.noiseBuf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t0); if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t0 + dur); f.Q.value = q;
    const gg = c.createGain(); gg.gain.setValueAtTime(0.0001, t0); gg.gain.exponentialRampToValueAtTime(g * gain, t0 + attack); gg.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(gg); gg.connect(fx.dry);
    if (verb) { const vg = c.createGain(); vg.gain.value = verb; gg.connect(vg); vg.connect(fx.verbIn); }
    src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.05);
  };
  for (const k of kind.split('')) {
    if (k === 'k') {
      // 808-ish: pitch drops 160 → 42 Hz, plus a click; and it ducks the whole mix
      const o = c.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(160, t0); o.frequency.exponentialRampToValueAtTime(42, t0 + 0.11);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.9 * gain, t0 + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.38);
      const sat = c.createWaveShaper(); const curve = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = (i / 127.5) - 1; curve[i] = Math.tanh(x * 1.8); } sat.curve = curve;
      o.connect(sat); sat.connect(g); g.connect(fx.dry); o.start(t0); o.stop(t0 + 0.45);
      noise(0.025, { type: 'highpass', freq: 2500, g: 0.35 });
      // sidechain pump
      const d = fx.duck.gain; d.cancelScheduledValues(t0); d.setValueAtTime(1, t0); d.linearRampToValueAtTime(0.45, t0 + 0.012); d.exponentialRampToValueAtTime(1, t0 + 0.22);
    } else if (k === 's') {
      const o = c.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(220, t0); o.frequency.exponentialRampToValueAtTime(140, t0 + 0.06);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.45 * gain, t0 + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
      o.connect(g); g.connect(fx.dry); o.start(t0); o.stop(t0 + 0.2);
      noise(0.2, { type: 'bandpass', freq: 2200, q: 0.6, g: 0.5, verb: 0.5 });
      noise(0.06, { type: 'highpass', freq: 5000, g: 0.3 });
    } else if (k === 'c') {
      [0, 0.012, 0.024].forEach((d, i) => { const src = c.createBufferSource(); src.buffer = a.noiseBuf; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 1.2; const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0 + d); g.gain.exponentialRampToValueAtTime(0.4 * gain, t0 + d + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + (i === 2 ? 0.2 : 0.03)); src.connect(f); f.connect(g); g.connect(fx.dry); if (i === 2) { const vg = c.createGain(); vg.gain.value = 0.6; g.connect(vg); vg.connect(fx.verbIn); } src.start(t0 + d, Math.random() * 0.5); src.stop(t0 + d + 0.3); });
    } else if (k === 'h') {
      noise(0.045, { type: 'highpass', freq: 8000, g: 0.16 });
    } else if (k === 'o') {
      noise(0.3, { type: 'highpass', freq: 6500, g: 0.14 });
    } else if (k === 'r') {
      noise(1.4, { type: 'highpass', freq: 5000, g: 0.22, attack: 0.01, verb: 0.4 });
    } else if (k === 't') {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(190, t0); o.frequency.exponentialRampToValueAtTime(95, t0 + 0.18);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.5 * gain, t0 + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
      o.connect(g); g.connect(fx.dry); o.start(t0); o.stop(t0 + 0.35);
    }
  }
}

// Riser: a noise sweep up over `dur` seconds, for the bar before a drop.
export function riser(a, t0, dur, gain = 0.25) {
  const c = a.ctx; const fx = setupMusicFx(a);
  const src = c.createBufferSource(); src.buffer = a.noiseBuf; src.loop = true;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(300, t0); f.frequency.exponentialRampToValueAtTime(6000, t0 + dur);
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + dur); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.05);
  src.connect(f); f.connect(g); g.connect(fx.dry); const vg = c.createGain(); vg.gain.value = 0.5; g.connect(vg); vg.connect(fx.verbIn);
  src.start(t0); src.stop(t0 + dur + 0.1);
}
