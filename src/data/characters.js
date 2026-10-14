// Character roster. Everything gameplay-related lives here as plain data, so
// moves, stats and looks can be tuned per character without touching the engine.
//
// moves: exactly one per slot — quick, power, guard, special.
//   anim   how the attack plays: 'lunge' (melee), 'shot' (projectile), 'ground' (erupts under the foe)
//   color  the move's effect color; icon: key in ui/icons.js
//   guard  (guard slot) 'block' | 'reflect' (blocks + singes the attacker) | 'dodge'
//   effect (special) 'dizzy' (foe loses a turn) | 'shield' (blocks the next hit) | 'heal'
//   power  special damage multiplier; hits = how many impacts the animation shows
// foePattern: what the character does when the game plays it as the opponent.
// art.draw: which code-built 3D rig to use (render3d/rigs.js).
// art.model: imported GLB at assets/models/<model>/<model>.glb; used instead of
//   the code-built rig when present (render3d/models.js lists the other art options).

export const CHARACTERS = {
  rex: {
    id: 'rex',
    name: 'Battle Rex',
    color: '#D7263D',
    accent: '#8E9AAE',
    maxHp: 105,
    attackBonus: 2,
    moves: [
      { slot: 'quick', id: 'tailWhip', name: 'Tail Whip', icon: 'tail', color: '#F46036', anim: 'lunge', word: 'WHAP!' },
      { slot: 'power', id: 'chomp', name: 'Chomp', icon: 'jaw', color: '#FFC914', anim: 'lunge', word: 'CHOMP!' },
      { slot: 'guard', id: 'battleArmor', name: 'Battle Armor', icon: 'armor', color: '#A9B4C8', guard: 'block' },
      { slot: 'special', id: 'rexCannon', name: 'Rex Cannon', icon: 'cannon', color: '#FF7A1A', power: 1.15 },
    ],
    foePattern: ['quick', 'power', 'charge', 'slam'],
    art: {
      kind: 'procedural', draw: 'rex', model: 'battle-rex',
      // effect points in rig units (190 tall, facing +x); tune once the model is in
      anchors: { muzzle: [70, 196, 0] },
    },
  },
  tree: {
    id: 'tree',
    name: 'Spooky Tree',
    color: '#2B2B36',
    accent: '#FF8A1F',
    maxHp: 115,
    attackBonus: 0,
    moves: [
      { slot: 'quick', id: 'branchSwat', name: 'Branch Swat', icon: 'branch', color: '#FF8A1F', anim: 'lunge', word: 'SWAT!' },
      { slot: 'power', id: 'rootGrab', name: 'Root Grab', icon: 'root', color: '#8A5A3C', anim: 'ground', word: 'GRAB!' },
      { slot: 'guard', id: 'blazingBark', name: 'Blazing Bark', icon: 'fire', color: '#FF8A1F', guard: 'reflect' },
      { slot: 'special', id: 'hauntedForest', name: 'Haunted Forest', icon: 'forest', color: '#FF8A1F', power: 1, effect: 'dizzy', hits: 3 },
    ],
    foePattern: ['quick', 'charge', 'slam', 'power'],
    art: { kind: 'procedural', draw: 'tree' },
  },
  rockfish: {
    id: 'rockfish',
    name: "Ragin' Rockfish",
    color: '#1B4FD8',
    accent: '#F46036',
    maxHp: 110,
    attackBonus: 1,
    moves: [
      { slot: 'quick', id: 'gauntletPunch', name: 'Gauntlet Punch', icon: 'fist', color: '#4EA8DE', anim: 'lunge', word: 'POW!' },
      { slot: 'power', id: 'twinCannon', name: 'Twin Cannon Blast', icon: 'cannon', color: '#4EA8DE', anim: 'shot', shots: 2, word: 'BLAM!' },
      { slot: 'guard', id: 'stoneScales', name: 'Stone Scales', icon: 'scales', color: '#9AA3B8', guard: 'block' },
      { slot: 'special', id: 'tidalRage', name: 'Tidal Rage', icon: 'wave', color: '#33AFE4', power: 1.2, hits: 4 },
    ],
    foePattern: ['power', 'quick', 'charge', 'slam'],
    art: { kind: 'procedural', draw: 'rockfish' },
  },
  arthur: {
    id: 'arthur',
    name: 'Young Arthur',
    color: '#1B4FD8',
    accent: '#D7263D',
    maxHp: 100,
    attackBonus: 2,
    moves: [
      { slot: 'quick', id: 'swordSwipe', name: 'Sword Swipe', icon: 'sword', color: '#DDE6F2', anim: 'lunge', word: 'SWISH!' },
      { slot: 'power', id: 'knightCharge', name: "Knight's Charge", icon: 'charge', color: '#FFC914', anim: 'lunge', dash: true, word: 'CLANG!' },
      { slot: 'guard', id: 'merlinsWard', name: "Merlin's Ward", icon: 'ward', color: '#4EA8DE', guard: 'block' },
      { slot: 'special', id: 'swordInStone', name: 'Sword in the Stone', icon: 'stone', color: '#FFC914', power: 1.1, effect: 'shield' },
    ],
    foePattern: ['quick', 'quick', 'charge', 'slam'],
    art: { kind: 'procedural', draw: 'arthur' },
  },
  witch: {
    id: 'witch',
    name: 'Wanda Wickwhistle',
    pendingDesign: true,
    color: '#6A3FA0',
    accent: '#2E9E44',
    maxHp: 95,
    attackBonus: 3,
    moves: [
      { slot: 'quick', id: 'sparkZap', name: 'Spark Zap', icon: 'spark', color: '#5CE07A', anim: 'shot', word: 'ZAP!' },
      { slot: 'power', id: 'cauldronSplash', name: 'Cauldron Splash', icon: 'cauldron', color: '#5CE07A', anim: 'shot', lob: true, word: 'SPLOSH!' },
      { slot: 'guard', id: 'broomDodge', name: 'Broom Dodge', icon: 'broom', color: '#C9A15A', guard: 'dodge' },
      { slot: 'special', id: 'potionStorm', name: 'Potion Storm', icon: 'potion', color: '#5CE07A', power: 1, effect: 'dizzy', hits: 3 },
    ],
    foePattern: ['quick', 'power', 'charge', 'slam'],
    art: { kind: 'procedural', draw: 'witch' },
  },
  nightwing: {
    id: 'nightwing',
    name: 'Gloomwing',
    pendingDesign: true,
    color: '#2A2470',
    accent: '#A777E0',
    maxHp: 120,
    attackBonus: 0,
    moves: [
      { slot: 'quick', id: 'shadowClaw', name: 'Shadow Claw', icon: 'claw', color: '#A777E0', anim: 'lunge', word: 'SLASH!' },
      { slot: 'power', id: 'flameDance', name: 'Flame Dance', icon: 'flames', color: '#FF7A1A', anim: 'dancers', word: 'SIZZLE!' },
      { slot: 'guard', id: 'nightWings', name: 'Night Wings', icon: 'wings', color: '#6A3FA0', guard: 'dodge' },
      { slot: 'special', id: 'midnightStorm', name: 'Midnight Storm', icon: 'ghost', color: '#B98CFF', power: 1.2, hits: 5 },
    ],
    foePattern: ['power', 'charge', 'slam', 'quick'],
    art: { kind: 'procedural', draw: 'nightwing' },
  },
  // the family dog: quick and loyal; Power Paws also patches him up ("Good boy!")
  roo: {
    id: 'roo',
    name: 'Remy Roo',
    color: '#C9822E',
    accent: '#F2EDE4',
    maxHp: 108,
    attackBonus: 2,
    moves: [
      { slot: 'quick', id: 'zoomies', name: 'Zoomies', icon: 'zoom', color: '#F2EDE4', anim: 'lunge', dash: true, word: 'ZOOM!' },
      { slot: 'power', id: 'bigBark', name: 'Big Bark', icon: 'bark', color: '#FFC914', anim: 'shot', shots: 2, word: 'WOOF!' },
      { slot: 'guard', id: 'rollOver', name: 'Roll Over', icon: 'roll', color: '#4EA8DE', guard: 'dodge' },
      { slot: 'special', id: 'powerPaws', name: 'Power Paws', icon: 'paw', color: '#FFC914', power: 1.05, effect: 'heal', healWord: 'GOOD BOY!', hits: 5 },
    ],
    foePattern: ['quick', 'power', 'charge', 'slam'],
    art: { kind: 'procedural', draw: 'roo', model: 'remy-roo', anchors: { muzzle: [96, 132, 0] } },
  },
  // the talking wall fish: sings, flops, and hides on his plaque
  bass: {
    id: 'bass',
    name: 'Billy Bass',
    color: '#3E8E2E',
    accent: '#E8B33A',
    maxHp: 104,
    attackBonus: 2,
    moves: [
      { slot: 'quick', id: 'tailFlop', name: 'Tail Flop', icon: 'fin', color: '#C8E63C', anim: 'lunge', word: 'FLOP!' },
      { slot: 'power', id: 'takeMeToTheRiver', name: 'Take Me to the River', icon: 'notes', color: '#33AFE4', anim: 'river', word: 'SPLOOSH!' },
      { slot: 'guard', id: 'wallMount', name: 'Wall Mount', icon: 'plaque', color: '#B57A4A', guard: 'block' },
      { slot: 'special', id: 'encore', name: 'Encore!', icon: 'note', color: '#FFC914', power: 1, effect: 'dizzy', hits: 3 },
    ],
    foePattern: ['power', 'quick', 'charge', 'slam'],
    art: { kind: 'procedural', draw: 'bass', model: 'billy-bass', anchors: { muzzle: [92, 104, 0] } },
  },
};

export const ROSTER = ['rex', 'tree', 'rockfish', 'arthur', 'witch', 'nightwing', 'roo', 'bass'];

// A different opponent each time (never the hero, avoids repeating the last foe).
let lastFoe = null;
export function opponentFor(heroId, rnd = Math.random) {
  const pool = ROSTER.filter((id) => id !== heroId && id !== lastFoe);
  const pick = pool[Math.floor(rnd() * pool.length)] || ROSTER.find((id) => id !== heroId);
  lastFoe = pick;
  return pick;
}
