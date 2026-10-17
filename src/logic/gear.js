// v6 Phase 4: per-toy experience, evolutions, armor and move loadouts. Pure: no DOM, no save access.
//
// Three independent systems (directive §6): the PLAYER level (logic/progression.js), the child's
// math / reading levels (logic/difficulty.js) and, here, each TOY's own level. A toy only earns
// XP in battles it fights, and it earns the same XP the player does in that battle.
//
// Toy XP curve. Total XP to reach toy level n:  toyXpForLevel(n) = 30·(n−1) + 6·(n−1)²
//   level 5 at 216, 8 at 504, 15 at 1,596, 35 at 7,956, 65 at 26,496, 100 at 61,776.
// A won battle with a few questions earns about 60 XP, so with one favourite toy:
//   Evolution I (level 15) after ~25 battles, II (35) after ~130, Ultimate (65) after ~440.
// (test/gear.test.mjs prints the pacing.) Milestones are the directive's provisional 15 / 35 / 65.
//
// Armor and move styles never change WHICH four slots a toy has (quick, power, guard,
// special); they change the numbers inside a slot and keep the toy's own animation, so every
// toy still looks and sounds like itself. Each option is a trade-off, so a lower-level choice
// is never useless (test/gear.test.mjs checks the spread with the battle simulator).

export const TOY_MAX_LEVEL = 100;

export function toyXpForLevel(n) {
  const k = Math.max(1, Math.min(TOY_MAX_LEVEL, Math.floor(n))) - 1;
  return 30 * k + 6 * k * k;
}

export function toyLevelForXp(xp) {
  const x = Math.max(0, Number.isFinite(+xp) ? +xp : 0);
  let n = 1 + Math.floor((-30 + Math.sqrt(900 + 24 * x)) / 12);
  n = Math.max(1, Math.min(TOY_MAX_LEVEL, n));
  while (n < TOY_MAX_LEVEL && toyXpForLevel(n + 1) <= x) n++;
  while (n > 1 && toyXpForLevel(n) > x) n--;
  return n;
}

export function toyProgress(xp) {
  const x = Math.max(0, Math.floor(Number.isFinite(+xp) ? +xp : 0));
  const level = toyLevelForXp(x);
  if (level >= TOY_MAX_LEVEL) {
    const needed = toyXpForLevel(TOY_MAX_LEVEL) - toyXpForLevel(TOY_MAX_LEVEL - 1);
    return { level, into: needed, needed, max: true };
  }
  const base = toyXpForLevel(level);
  return { level, into: x - base, needed: toyXpForLevel(level + 1) - base, max: false };
}

// ---- evolutions -------------------------------------------------------------------------------
// tier 0 = base form. `look` is what the renderer adds; it never replaces the toy's body, so a
// wolf stays a wolf and a skeleton keeps its bones (directive §7). The looks here are the
// placeholder treatment for Founder Creative Approval; real evolved geometry per toy is Phase 6 art.
export const EVOLUTIONS = [
  { tier: 0, level: 1, name: 'Base', look: { scale: 1, halo: 0, sparkle: 0 } },
  { tier: 1, level: 15, name: 'Evolution I', look: { scale: 1.04, halo: 0.55, sparkle: 1 } },
  { tier: 2, level: 35, name: 'Evolution II', look: { scale: 1.08, halo: 0.8, sparkle: 2 } },
  { tier: 3, level: 65, name: 'Ultimate', look: { scale: 1.12, halo: 1, sparkle: 3 } },
];

export function evolutionFor(level) {
  let e = EVOLUTIONS[0];
  for (const x of EVOLUTIONS) if (level >= x.level) e = x;
  return e;
}

// A child can show any form already unlocked ("previously unlocked appearances stay available").
export const formsUnlocked = (level) => EVOLUTIONS.filter((e) => level >= e.level).map((e) => e.tier);

// ---- armor --------------------------------------------------------------------------------------
// hp: multiplier on max health; attack: added to the toy's attack bonus; energy: special energy at
// the start of a battle. color: the armor's trim / halo colour in the preview and in battle.
export const ARMORS = {
  classic: { id: 'classic', name: 'Classic', level: 1, icon: 'heart', color: null, hp: 1, attack: 0, energy: 0,
    says: 'Just like the box' },
  tough: { id: 'tough', name: 'Tough', level: 8, icon: 'armor', color: '#A9B4C8', hp: 1.15, attack: -1, energy: 0,
    says: 'More health, softer hits' },
  swift: { id: 'swift', name: 'Speedy', level: 15, icon: 'gust', color: '#4EA8DE', hp: 0.9, attack: 0, energy: 1,
    says: 'Starts with energy, less health' },
  mighty: { id: 'mighty', name: 'Mighty', level: 35, icon: 'fist', color: '#E8502E', hp: 0.8, attack: 1, energy: 0,
    says: 'Hits harder, less health' },
  legend: { id: 'legend', name: 'Legend', level: 65, icon: 'star', color: '#FFC914', hp: 1.1, attack: 0, energy: 1,
    says: 'The ultimate armor' },
};
export const ARMOR_ORDER = ['classic', 'tough', 'swift', 'mighty', 'legend'];

// ---- move styles (loadouts) --------------------------------------------------------------------
// One choice per slot. 'signature' is the toy's own move exactly as before. Every other style keeps
// the toy's move (same id, animation, colour, sound) and changes its numbers (logic/battle.js reads
// these fields). `tag` is the short word shown on the move button.
export const STYLES = {
  quick: {
    signature: { id: 'signature', level: 1, tag: null, says: 'Steady hit' },
    zippy: { id: 'zippy', level: 5, tag: 'ZIPPY', says: 'Smaller hit, fills energy twice as fast', quickDmg: 8, energyGain: 2 },
  },
  power: {
    signature: { id: 'signature', level: 1, tag: null, says: 'Big hit' },
    heavy: { id: 'heavy', level: 10, tag: 'HEAVY', says: 'Huge hit when you get it right first time', powerDelta: { indep: 6, hint: -3, support: -5, none: 0 } },
    healing: { id: 'healing', level: 25, tag: 'HEAL', says: 'Smaller hit that heals you', powerDelta: { indep: -5, hint: -5, support: -5, none: -5 }, healOn: { indep: 9, hint: 5, support: 0, none: 4 } },
  },
  guard: {
    signature: { id: 'signature', level: 1, tag: null, says: 'Your own guard' },
    counter: { id: 'counter', level: 20, tag: 'COUNTER', says: 'Blocks less but always hits back', guard: 'reflect', guardFactor: 0.35, reflect: 9 },
  },
  special: {
    signature: { id: 'signature', level: 1, tag: null, says: 'Your own special' },
    quickSpecial: { id: 'quickSpecial', level: 30, tag: 'FAST', says: 'Ready sooner, smaller blast', energyCost: 2, specialPower: 0.62 },
    superSpecial: { id: 'superSpecial', level: 35, tag: 'SUPER', says: 'Evolved blast: bigger, but no extra trick', specialPower: 1.22, extraHits: 1, dropEffect: true },
  },
};
export const SLOT_ORDER = ['quick', 'power', 'guard', 'special'];

export const defaultKit = () => ({ armor: 'classic', moves: { quick: 'signature', power: 'signature', guard: 'signature', special: 'signature' }, form: null });

// What a toy record ({ xp, level, ... }) has unlocked.
export function unlocks(rec) {
  const level = levelOf(rec);
  return {
    level,
    evolution: evolutionFor(level),
    forms: formsUnlocked(level),
    armors: ARMOR_ORDER.filter((id) => ARMORS[id].level <= level),
    styles: Object.fromEntries(SLOT_ORDER.map((slot) => [slot, Object.keys(STYLES[slot]).filter((id) => STYLES[slot][id].level <= level)])),
  };
}

// Anything that could be picked beyond the box defaults? (decides whether the gear-up screen shows)
export const hasChoices = (rec) => { const u = unlocks(rec); return u.armors.length > 1 || SLOT_ORDER.some((s) => u.styles[s].length > 1) || u.forms.length > 1; };

export function levelOf(rec) {
  const r = rec && typeof rec === 'object' ? rec : {};
  return Math.max(1, Math.min(TOY_MAX_LEVEL, Math.max(Math.floor(+r.level || 1), toyLevelForXp(r.xp))));
}

// A stored or hand-built kit, made safe: unknown or still-locked choices fall back to the default.
export function normalizeKit(kit, rec) {
  const u = unlocks(rec);
  const k = kit && typeof kit === 'object' ? kit : {};
  const out = defaultKit();
  if (u.armors.includes(k.armor)) out.armor = k.armor;
  const mv = k.moves && typeof k.moves === 'object' ? k.moves : {};
  for (const slot of SLOT_ORDER) if (u.styles[slot].includes(mv[slot])) out.moves[slot] = mv[slot];
  const form = Number.isInteger(k.form) ? k.form : null;
  out.form = form != null && u.forms.includes(form) ? form : null; // null = newest unlocked form
  return out;
}

// The character as it fights with this kit: same id, same art, adjusted numbers and moves.
// `kit` must already be normalized. Adds def.kit (for the HUD) and def.evolution (for the renderer).
export function kitDef(def, kit, rec) {
  const k = kit || defaultKit();
  const a = ARMORS[k.armor] || ARMORS.classic;
  const level = levelOf(rec);
  const evo = k.form != null ? EVOLUTIONS[k.form] || evolutionFor(level) : evolutionFor(level);
  const moves = (def.moves || []).map((m) => {
    const st = (STYLES[m.slot] || {})[k.moves[m.slot]];
    if (!st || st.id === 'signature') return m;
    const out = { ...m, style: st.id, tag: st.tag };
    for (const f of ['quickDmg', 'energyGain', 'powerDelta', 'healOn', 'guardFactor', 'reflect', 'energyCost']) if (st[f] != null) out[f] = st[f];
    if (st.guard) out.guard = st.guard;
    if (st.specialPower) out.power = (m.power || 1) * st.specialPower;
    if (st.extraHits) out.hits = (m.hits || 1) + st.extraHits;
    if (st.dropEffect) delete out.effect;
    return out;
  });
  return {
    ...def,
    maxHp: Math.max(1, Math.round(def.maxHp * a.hp)),
    attackBonus: (def.attackBonus || 0) + a.attack,
    startEnergy: a.energy,
    moves,
    kit: { armor: a.id, armorColor: a.color, moves: { ...k.moves }, level },
    evolution: { tier: evo.tier, name: evo.name, look: evo.look },
  };
}

// The chars map a battle uses: the hero replaced by its kitted version. Everyone else is untouched.
export function kitChars(chars, heroId, kit, rec) {
  if (!chars[heroId]) return chars;
  return { ...chars, [heroId]: kitDef(chars[heroId], normalizeKit(kit, rec), rec) };
}

// Add XP to one toy inside a save's `toys` map. Returns { toys, gained, from, to, evolved, unlocked }.
// evolved: the new evolution when a milestone was crossed (or null); unlocked: names of armor and
// move styles that just became available, for the celebration.
export function awardToyXp(toys, toyId, amount) {
  const all = toys && typeof toys === 'object' ? toys : {};
  const rec = all[toyId] && typeof all[toyId] === 'object' ? all[toyId] : {};
  const xp0 = Math.max(0, Math.floor(+rec.xp || 0));
  const from = levelOf(rec);
  const add = Math.max(0, Math.floor(Number.isFinite(+amount) ? +amount : 0));
  const xp = xp0 + add;
  const to = Math.max(from, toyLevelForXp(xp));
  const e0 = evolutionFor(from), e1 = evolutionFor(to);
  const unlocked = [];
  if (to > from) {
    for (const id of ARMOR_ORDER) if (ARMORS[id].level > from && ARMORS[id].level <= to) unlocked.push({ kind: 'armor', id, name: ARMORS[id].name });
    for (const slot of SLOT_ORDER) for (const st of Object.values(STYLES[slot])) if (st.level > from && st.level <= to) unlocked.push({ kind: 'move', slot, id: st.id, name: st.tag });
  }
  return { toys: { ...all, [toyId]: { ...rec, xp, level: to } }, gained: add, from, to, evolved: e1.tier > e0.tier ? e1 : null, unlocked };
}

// What the next unlock is, for "level N unlocks …" previews.
export function nextUnlock(rec) {
  const level = levelOf(rec);
  const items = [
    ...EVOLUTIONS.filter((e) => e.tier > 0).map((e) => ({ level: e.level, kind: 'evolution', name: e.name })),
    ...ARMOR_ORDER.map((id) => ({ level: ARMORS[id].level, kind: 'armor', name: ARMORS[id].name })),
    ...SLOT_ORDER.flatMap((slot) => Object.values(STYLES[slot]).map((st) => ({ level: st.level, kind: 'move', slot, name: st.tag }))),
  ].filter((x) => x.level > level).sort((a, b) => a.level - b.level);
  return items[0] || null;
}
