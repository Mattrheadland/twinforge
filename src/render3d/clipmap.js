// Which animation a toy should be playing, and which clip in a model plays it.
// Pure functions (no three.js), so they're unit-tested in node.
//
// Actions: idle · attack · hit · guard · special · win · tired.
// The battle choreography doesn't name actions; it sets fighter state
// (lunge offset, shield, aura, cannon, flash, eyes, cheer, tired). actionOf()
// reads that state, so model animations follow the existing moves untouched.

export const ACTIONS = ['idle', 'attack', 'hit', 'guard', 'special', 'win', 'tired'];

// Loop forever, or play once and hold the last frame.
export const LOOPS = { idle: true, attack: false, hit: false, guard: false, special: false, win: true, tired: true };

// Keywords per action, best first. Clip names from Meshy / Tripo / Mixamo
// look like "Idle", "Armature|Punch_Combo", "mixamo.com|Hit_Reaction_2".
const KEYWORDS = {
  idle: ['idle', 'breath', 'stand', 'wait', 'survey'],
  attack: ['attack', 'bite', 'chomp', 'punch', 'slash', 'swipe', 'strike', 'kick', 'hook', 'jab', 'combo', 'swing'],
  hit: ['hit_react', 'hitreact', 'hit react', 'hit', 'hurt', 'damage', 'impact', 'knock', 'flinch', 'stagger'],
  guard: ['block', 'guard', 'defen', 'shield', 'parry', 'dodge', 'cover'],
  special: ['special', 'roar', 'power', 'charge', 'cast', 'spell', 'shoot', 'fire', 'skill', 'ultimate', 'taunt', 'scream'],
  win: ['victory', 'win', 'cheer', 'celebrat', 'dance', 'happy', 'clap', 'fist_pump', 'jump'],
  tired: ['tired', 'exhaust', 'dizzy', 'weak', 'sad', 'defeat', 'sleep', 'injured', 'limp', 'fall', 'die', 'death'],
};

const clean = (n) => String(n).toLowerCase().replace(/^.*[|:]/, '').replace(/[\s-]+/g, '_');

// Map each action to a clip name. `overrides` (from the character's art.clips)
// wins; otherwise the first keyword hit, never reusing a clip for two actions
// unless nothing else fits. Returns { idle: 'Idle', attack: 'Punch', ... }.
export function matchClips(names, overrides = {}) {
  const out = {};
  const used = new Set();
  for (const a of ACTIONS) {
    const o = overrides[a];
    if (o && names.includes(o)) { out[a] = o; used.add(o); }
  }
  for (const a of ACTIONS) {
    if (out[a]) continue;
    let pick = null;
    for (const k of KEYWORDS[a]) {
      const key = clean(k);
      pick = names.find((n) => !used.has(n) && clean(n).includes(key));
      if (pick) break;
    }
    if (pick) { out[a] = pick; used.add(pick); }
  }
  // a model with a single unnamed clip: treat it as idle
  if (!out.idle && names.length === 1 && !used.has(names[0])) out.idle = names[0];
  return out;
}

// The action a fighter is in right now, from its pose values (Fighter.pose()).
export function actionOf(p) {
  if (p.pose === 'victory') return 'win';
  if (p.pose === 'tired' || p.dizzy) return 'tired';
  if (p.hurt > 0.35) return 'hit';
  if (p.shield > 0.2) return 'guard';
  if (p.charge > 0.5 || p.cannon > 0.2) return 'special';
  if (p.lunge > 12 || p.mouth === 'grit') return 'attack';
  return 'idle';
}
