import test from 'node:test';
import assert from 'node:assert/strict';
import { SFX } from '../src/audio/audio.js';
import { NEW_FOUR } from '../src/data/characters-new-four.js';

// A stub synth: records every voice and checks the numbers make sense for the
// Web Audio calls behind them (exponential ramps reject 0 and negatives).
function stub() {
  const calls = [];
  const check = (kind, freq, dur, o) => {
    assert.ok(dur > 0 && dur < 3, `${kind} dur ${dur}`);
    if (kind === 'tone') assert.ok(freq > 0, `tone freq ${freq}`);
    if (o.slide != null) assert.ok(o.slide > 0, `${kind} slide ${o.slide}`);
    if (o.sweep != null) assert.ok(o.sweep > 0, `${kind} sweep ${o.sweep}`);
    if (o.gain != null) assert.ok(o.gain > 0 && o.gain <= 1, `${kind} gain ${o.gain}`);
    if (o.delay != null) assert.ok(o.delay >= 0 && o.delay < 2, `${kind} delay ${o.delay}`);
    if (o.attack != null) assert.ok(o.attack > 0 && o.attack < dur, `${kind} attack ${o.attack} vs dur ${dur}`);
    if (o.slideTime != null) assert.ok(o.slideTime > 0 && o.slideTime <= dur + 0.001, `${kind} slideTime ${o.slideTime} vs dur ${dur}`);
    calls.push(kind);
  };
  return {
    calls,
    tone: (f, d, o = {}) => check('tone', f, d, o),
    noise: (d, o = {}) => check('noise', 0, d, o),
  };
}

test('every sound effect plays on the stub synth with sane numbers', () => {
  for (const [name, fn] of Object.entries(SFX)) {
    const a = stub();
    fn(a, 1);
    assert.ok(a.calls.length > 0, `${name} makes no sound`);
  }
});

test('the new four: every move names a sound that exists, and every toy has a win sting', () => {
  for (const toy of Object.values(NEW_FOUR)) {
    assert.ok(SFX[toy.winSfx], `${toy.id} winSfx ${toy.winSfx}`);
    for (const m of toy.moves) {
      assert.ok(m.sfx && SFX[m.sfx], `${toy.id} ${m.id} sfx ${m.sfx}`);
      if (m.sfxHit) assert.ok(SFX[m.sfxHit], `${toy.id} ${m.id} sfxHit ${m.sfxHit}`);
    }
  }
});
