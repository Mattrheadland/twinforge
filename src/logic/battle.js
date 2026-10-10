// Pure battle rules. No DOM, no timing, no audio.
// Every function takes a state and returns { state, events } with a NEW state.
// Presentation reads `events` and animates them; it never decides outcomes.

export const RULES = {
  maxEnergy: 3,
  attack: { indep: 20, hint: 16, support: 12 },
  attackEnergy: { indep: 2, hint: 1, support: 1 },
  special: { indep: 36, hint: 31, support: 26 },
  defendEnergy: 1,
  perfectBlockEnergy: 1,
  shieldFactor: 0.2,
  foe: { attack: 9, slam: 22 },
};

export const QUALITIES = ['indep', 'hint', 'support'];

const clone = (s) => JSON.parse(JSON.stringify(s));

export function createBattle({ heroId, foeId, chars, arenaId = 'bedroom' }) {
  const h = chars[heroId];
  const f = chars[foeId];
  if (!h || !f) throw new Error('unknown character');
  return {
    v: 1,
    heroId,
    foeId,
    arenaId,
    round: 1,
    turn: 'hero',
    result: null,
    hero: { hp: h.maxHp, maxHp: h.maxHp, energy: 0, shield: false },
    foe: { hp: f.maxHp, maxHp: f.maxHp, charged: false, dizzy: false, step: 0 },
    stats: { indep: 0, hint: 0, support: 0, turns: 0 },
  };
}

export function canAct(s, action) {
  if (!s || s.result || s.turn !== 'hero') return false;
  if (action === 'special') return s.hero.energy >= RULES.maxEnergy;
  return action === 'attack' || action === 'defend';
}

function gainEnergy(s, amount, events, reason) {
  const before = s.hero.energy;
  s.hero.energy = Math.min(RULES.maxEnergy, before + amount);
  const gained = s.hero.energy - before;
  if (gained > 0) events.push({ type: 'energy', gained, energy: s.hero.energy, reason });
}

function damage(s, target, amount, events, extra = {}) {
  const t = s[target];
  const amt = Math.max(0, Math.round(amount));
  t.hp = Math.max(0, t.hp - amt);
  events.push({ type: 'damage', target, amount: amt, hp: t.hp, maxHp: t.maxHp, ...extra });
  if (t.hp === 0 && !s.result) {
    s.result = target === 'foe' ? 'win' : 'lose';
    events.push({ type: 'ko', target });
  }
}

export function heroAct(s0, action, quality, chars) {
  if (!canAct(s0, action)) throw new Error(`illegal action: ${action}`);
  if (action !== 'defend' && !QUALITIES.includes(quality)) throw new Error('bad quality');
  const s = clone(s0);
  const ev = [];
  const hc = chars[s.heroId];
  s.stats.turns++;

  if (action === 'attack') {
    s.stats[quality]++;
    const dmg = RULES.attack[quality] + (hc.attackBonus || 0);
    ev.push({ type: 'action', who: 'hero', action, quality });
    damage(s, 'foe', dmg, ev, { kind: 'attack', quality });
    if (!s.result) gainEnergy(s, RULES.attackEnergy[quality], ev, quality === 'indep' ? 'bonus' : 'hit');
  } else if (action === 'defend') {
    ev.push({ type: 'action', who: 'hero', action });
    s.hero.shield = true;
    ev.push({ type: 'shield', on: true });
    gainEnergy(s, RULES.defendEnergy, ev, 'defend');
  } else if (action === 'special') {
    s.stats[quality]++;
    s.hero.energy = 0;
    ev.push({ type: 'action', who: 'hero', action, quality, special: hc.special.id });
    ev.push({ type: 'energy', gained: -RULES.maxEnergy, energy: 0, reason: 'spent' });
    const dmg = RULES.special[quality] * (hc.special.power || 1);
    damage(s, 'foe', dmg, ev, { kind: 'special', quality, big: true });
    if (!s.result) {
      if (hc.special.effect === 'dizzy') {
        const wasCharged = s.foe.charged;
        s.foe.dizzy = true;
        s.foe.charged = false;
        ev.push({ type: 'dizzy', target: 'foe', cancelledCharge: wasCharged });
      } else if (hc.special.effect === 'wall') {
        s.hero.shield = true;
        ev.push({ type: 'shield', on: true, from: 'special' });
      }
    }
  }

  if (!s.result) s.turn = 'foe';
  return { state: s, events: ev };
}

// Which move the foe will make next. Exposed so the UI can telegraph it.
export function foeIntent(s, chars) {
  if (s.foe.dizzy) return 'dizzy';
  if (s.foe.charged) return 'slam';
  const pattern = chars[s.foeId].foePattern;
  const move = pattern[s.foe.step % pattern.length];
  // A slam in the pattern without a charge first becomes a normal attack.
  return move === 'slam' ? 'attack' : move;
}

export function foeAct(s0, chars) {
  if (!s0 || s0.result || s0.turn !== 'foe') throw new Error('not foe turn');
  const s = clone(s0);
  const ev = [];
  const fc = chars[s.foeId];
  const intent = foeIntent(s, chars);
  const power = fc.foePower || 1;

  if (intent === 'dizzy') {
    s.foe.dizzy = false;
    ev.push({ type: 'action', who: 'foe', action: 'dizzy' });
  } else if (intent === 'charge') {
    s.foe.charged = true;
    s.foe.step++;
    ev.push({ type: 'action', who: 'foe', action: 'charge' });
  } else {
    const slam = intent === 'slam';
    if (slam) s.foe.charged = false;
    s.foe.step++;
    // skip the pattern's own 'slam' slot after a charge so the cycle stays readable
    const pattern = fc.foePattern;
    if (slam && pattern[s.foe.step % pattern.length] === 'slam') s.foe.step++;
    ev.push({ type: 'action', who: 'foe', action: slam ? 'slam' : 'attack' });
    const base = (slam ? RULES.foe.slam : RULES.foe.attack) * power;
    const blocked = s.hero.shield;
    const amount = blocked ? Math.max(1, Math.round(base * RULES.shieldFactor)) : base;
    damage(s, 'hero', amount, ev, { kind: slam ? 'slam' : 'attack', blocked, perfect: blocked && slam, big: slam });
    if (blocked && slam && !s.result) gainEnergy(s, RULES.perfectBlockEnergy, ev, 'perfect');
  }

  if (s.hero.shield) {
    s.hero.shield = false;
    ev.push({ type: 'shield', on: false });
  }
  if (!s.result) {
    s.turn = 'hero';
    s.round++;
  }
  return { state: s, events: ev };
}

export function starsFor(s) {
  if (s.result !== 'win') return 0;
  const pct = s.hero.hp / s.hero.maxHp;
  return pct > 0.6 ? 3 : pct > 0.3 ? 2 : 1;
}

export function isValidBattle(s, chars) {
  try {
    return (
      s && s.v === 1 && chars[s.heroId] && chars[s.foeId] &&
      Number.isFinite(s.hero.hp) && Number.isFinite(s.foe.hp) &&
      s.hero.hp >= 0 && s.foe.hp >= 0 &&
      s.hero.energy >= 0 && s.hero.energy <= RULES.maxEnergy &&
      (s.turn === 'hero' || s.turn === 'foe')
    );
  } catch {
    return false;
  }
}
