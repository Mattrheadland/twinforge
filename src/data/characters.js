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

import { NEW_FOUR } from './characters-new-four.js';
export const CHARACTERS = {
  ...NEW_FOUR,
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
      // imported model (Hunyuan 3D, static): toy joints and effect points in rig units
      anchors: { muzzle: [64, 186, 0] },
      armScale: 0.6,
      // swappable eyes over the painted ones, one on each side of the snout
      face: { pair: true, pos: [96, 146, 20], yaw: 1.0, size: [16, 16], style: { iris: '#7A4A20', lid: '#C8202E', brow: '#14111A', size: 0.34 } },
      joints: {
        head: { pivot: [74, 128, 0], box: [[74, 118, -60], [150, 200, 60]] },
        jaw: { pivot: [86, 127, 0], box: [[84, 92, -40], [150, 127, 40]] },
        armF: { pivot: [60, 114, 14], box: [[60, 86, 7], [86, 95, 60]] },
        armB: { pivot: [60, 114, -14], box: [[60, 86, -60], [86, 95, -7]] },
        tail: { pivot: [-34, 116, 0], box: [[-200, 80, -60], [-34, 160, 60]] },
      },
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
    art: {
      portrait: { y: -6 }, // HUD head frame nudge (rig units): x, y, r
      kind: 'procedural', draw: 'tree', model: 'spooky-tree',
      // imported model (Hunyuan 3D, static): the two big branches swing as arms; no head joint, since any cut
      // would split the carved glowing face (it stays painted in the texture)
      armScale: 0.6,
      joints: {
        armF: { pivot: [0, 108, 26], box: [[-30, 92, 27], [30, 155, 70]] },
        armB: { pivot: [0, 95, -24], box: [[-30, 45, -70], [30, 115, -27]] },
      },
    },
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
    art: {
      portrait: { y: -20, r: 64 }, // HUD head frame nudge (rig units): x, y, r
      kind: 'procedural', draw: 'rockfish', model: 'ragin-rockfish',
      // imported model (Hunyuan 3D, static): head and jaw between the shoulder cannons, armored arms, tail fin
      anchors: { muzzle: [34, 172, 0] },
      armScale: 0.35, // his forearms are fused to his hips in the mesh; small swings keep that seam from stretching
      face: { pair: true, pos: [44, 138, 15], yaw: 1.0, size: [14, 14], style: { iris: '#E8A33A', lid: '#A8B0B4', brow: '#14111A', size: 0.34 } },
      joints: {
        head: { pivot: [10, 108, 0], box: [[2, 104, -21], [72, 176, 21]] },
        jaw: { pivot: [20, 128, 0], box: [[24, 104, -20], [72, 127, 20]] },
        armF: { pivot: [8, 115, 38], box: [[-20, 50, 35], [42, 122, 72]] },
        armB: { pivot: [8, 115, -38], box: [[-20, 50, -72], [42, 122, -35]] },
        tail: { pivot: [-22, 60, 0], box: [[-80, 0, -22], [-22, 76, 22]] },
      },
    },
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
    art: {
      kind: 'procedural', draw: 'arthur', model: 'young-arthur', inkBias: 1.5,
      // imported model (Hunyuan 3D, static): head from the chin up, arms from the shoulders; the cape and sword stay on the body
      face: { pos: [26, 153, 0], size: [30, 12], style: { iris: '#2F7FD0', lid: '#F2C29B', brow: '#C98A2B', size: 0.36 } },
      joints: {
        head: { pivot: [2, 132, 0], box: [[-45, 134, -45], [45, 200, 45]] },
        armF: { pivot: [2, 115, 24], box: [[-14, 52, 26], [26, 121, 50]] },
        armB: { pivot: [2, 115, -24], box: [[-14, 52, -50], [26, 121, -22]] },
      },
    },
  },
  witch: {
    id: 'witch',
    name: 'Wicked Wanda',
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
    art: {
      portrait: { y: 6, r: 38 }, // HUD head frame nudge (rig units): x, y, r
      kind: 'procedural', draw: 'witch', model: 'wanda-wickwhistle', inkBias: 1.5,
      // imported model (Hunyuan 3D, static): head from the collar up (hair tower + hat), broom arm on the
      // camera side, spark hand on the far side; the painted wicked face stays
      anchors: { muzzle: [30, 150, 0] },
      armScale: 0.5,
      joints: {
        head: { pivot: [2, 136, 0], box: [[-26, 138, -30], [34, 200, 30]] },
        armF: { pivot: [6, 118, 18], box: [[-12, 20, 14], [50, 130, 48]] },
        armB: { pivot: [-4, 118, -18], box: [[-24, 90, -48], [40, 128, -14]] },
      },
    },
  },
  nightwing: {
    id: 'nightwing',
    name: 'Czernobog',
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
    art: {
      portrait: { y: -6, r: 62 }, // HUD head frame nudge (rig units): x, y, r
      kind: 'procedural', draw: 'nightwing', model: 'czernobog',
      // imported model (Hunyuan 3D, static): the giant demon god. Head from the chin up (horns included),
      // arms from the shoulders, wings behind the back sway as the tail; the painted glowing eyes stay.
      anchors: { muzzle: [30, 148, 0] },
      armScale: 0.6,
      joints: {
        head: { pivot: [4, 150, 0], box: [[-14, 152, -24], [40, 200, 24]] },
        armF: { pivot: [0, 130, 36], box: [[-16, 60, 30], [30, 142, 70]] },
        armB: { pivot: [0, 130, -36], box: [[-16, 60, -70], [30, 142, -30]] },
        tail: { pivot: [-14, 150, 0], box: [[-50, 40, -70], [-13, 180, 70]] },
      },
    },
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
    art: {
      kind: 'procedural', draw: 'roo', model: 'remy-roo',
      // imported model (Hunyuan 3D, static): head from the collar up, front legs as arms, a narrow tail cut
      anchors: { muzzle: [104, 150, 0] },
      armScale: 0.35,
      face: { pos: [84, 171, 0], size: [30, 11], style: { iris: '#5A3A1A', lid: '#C9822E', brow: '#7A4A20', size: 0.36 } },
      joints: {
        head: { pivot: [36, 140, 0], box: [[38, 128, -42], [116, 194, 42]] },
        armF: { pivot: [38, 70, 18], box: [[12, 0, 4], [66, 70, 40]] },
        armB: { pivot: [38, 70, -18], box: [[12, 0, -40], [66, 70, -4]] },
        tail: { pivot: [-62, 112, 0], box: [[-118, 40, -9], [-62, 130, 9]] },
      },
    },
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
    art: {
      portrait: { x: 40, y: -40, r: 64 }, // HUD head frame nudge (rig units): x, y, r
      kind: 'procedural', draw: 'bass', model: 'billy-bass', height: 150, yaw: 0.45, // turned toward his foe: a long fish reads best side-on
      // imported model (Hunyuan 3D, static), scaled to 150 tall so he's about Rex's length:
      // open lower jaw, head, pectoral fins as arms, tail fin; he stands on his pelvic fins
      anchors: { muzzle: [111, 63, 0] },
      armScale: 0.5,
      face: { pair: true, pos: [88, 84, 28], yaw: 1.0, size: [13, 13], style: { iris: '#E8B33A', lid: '#3E8E2E', brow: '#14111A', size: 0.34 } },
      joints: {
        jaw: { pivot: [73, 58, 0], box: [[73, 20, -36], [118, 57, 36]] },
        head: { pivot: [47, 79, 0], box: [[47, 57, -47], [118, 158, 47]] },
        armF: { pivot: [4, 63, 38], box: [[-4, 32, 32], [55, 71, 55]] },
        armB: { pivot: [4, 63, -38], box: [[-4, 32, -55], [55, 71, -32]] },
        tail: { pivot: [-87, 79, 0], box: [[-158, 16, -24], [-87, 142, 24]] },
      },
    },
  },
};

export const ROSTER = ['rex', 'tree', 'rockfish', 'arthur', 'witch', 'nightwing', 'roo', 'bass', 'crookhook', 'jackknife', 'wolfgang', 'payne'];

// A different opponent each time (never the hero, avoids repeating the last foe).
let lastFoe = null;
export function opponentFor(heroId, rnd = Math.random) {
  const pool = ROSTER.filter((id) => id !== heroId && id !== lastFoe);
  const pick = pool[Math.floor(rnd() * pool.length)] || ROSTER.find((id) => id !== heroId);
  lastFoe = pick;
  return pick;
}

// ---------------------------------------------------------------------------
// Wild creatures (campaign minions): one per main character, from its world.
// Small, quick fights: less health, softer hits, and they never charge a
// special. Never playable; they aren't in ROSTER. Rigs: render3d/minion-rigs.js.
const minion = (id, o) => ({
  id, minion: true, attackBonus: 0, foePower: 0.75, foePattern: ['quick', 'power', 'quick', 'power'],
  art: { kind: 'procedural', draw: 'minion-' + id }, ...o,
});
export const MINIONS = {
  rexlet: minion('rexlet', {
    name: 'Rexlet', boss: 'rex', color: '#E0453A', accent: '#8E9AAE', maxHp: 58,
    lore: 'a baby battle-dino in a hand-me-down helmet',
    moves: [
      { slot: 'quick', id: 'nibble', name: 'Nibble', icon: 'jaw', color: '#FFC914', anim: 'lunge', word: 'NOM!' },
      { slot: 'power', id: 'pebblePop', name: 'Pebble Pop', icon: 'cannon', color: '#FF7A1A', anim: 'shot', word: 'POP!' },
      { slot: 'guard', id: 'tinyHelmet', name: 'Tiny Helmet', icon: 'armor', color: '#A9B4C8', guard: 'block' },
      { slot: 'special', id: 'babyRoar', name: 'Baby Roar', icon: 'bark', color: '#FF7A1A', power: 1 },
    ],
  }),
  sprout: minion('sprout', {
    name: 'Spooky Sprout', boss: 'tree', color: '#3A3346', accent: '#FF8A1F', maxHp: 60,
    lore: 'a walking stump with a jack-o-lantern grin',
    moves: [
      { slot: 'quick', id: 'twigPoke', name: 'Twig Poke', icon: 'branch', color: '#FF8A1F', anim: 'lunge', word: 'POKE!' },
      { slot: 'power', id: 'rootTrip', name: 'Root Trip', icon: 'root', color: '#8A5A3C', anim: 'ground', word: 'TRIP!' },
      { slot: 'guard', id: 'barkUp', name: 'Bark Up', icon: 'fire', color: '#FF8A1F', guard: 'block' },
      { slot: 'special', id: 'leafStorm', name: 'Leaf Storm', icon: 'forest', color: '#FF8A1F', power: 1 },
    ],
  }),
  minnow: minion('minnow', {
    name: 'Rock Minnow', boss: 'rockfish', color: '#4E7BE0', accent: '#C4CAD8', maxHp: 56,
    lore: 'a little armored fish that bounces on its tail',
    moves: [
      { slot: 'quick', id: 'finSlap', name: 'Fin Slap', icon: 'fin', color: '#4EA8DE', anim: 'lunge', word: 'SLAP!' },
      { slot: 'power', id: 'bubbleShot', name: 'Bubble Shot', icon: 'wave', color: '#33AFE4', anim: 'shot', word: 'BLUB!' },
      { slot: 'guard', id: 'pebbleScales', name: 'Pebble Scales', icon: 'scales', color: '#9AA3B8', guard: 'block' },
      { slot: 'special', id: 'splashdown', name: 'Splashdown', icon: 'wave', color: '#33AFE4', power: 1 },
    ],
  }),
  squire: minion('squire', {
    name: 'Tin Squire', boss: 'arthur', color: '#8E9AAE', accent: '#D7263D', maxHp: 60,
    lore: 'a wind-up tin soldier with a wooden sword',
    moves: [
      { slot: 'quick', id: 'woodenSword', name: 'Wooden Sword', icon: 'sword', color: '#C9A15A', anim: 'lunge', word: 'TAP!' },
      { slot: 'power', id: 'windUpCharge', name: 'Wind-Up Charge', icon: 'charge', color: '#FFC914', anim: 'lunge', dash: true, word: 'CLANK!' },
      { slot: 'guard', id: 'potLid', name: 'Pot-Lid Shield', icon: 'shield', color: '#A9B4C8', guard: 'block' },
      { slot: 'special', id: 'trumpet', name: 'Toy Trumpet', icon: 'note', color: '#FFC914', power: 1 },
    ],
  }),
  frog: minion('frog', {
    name: 'Bog Frog', boss: 'witch', color: '#2E9E44', accent: '#E07AB0', maxHp: 56,
    lore: 'Wanda’s hoppy helper from the pond',
    moves: [
      { slot: 'quick', id: 'tongueFlick', name: 'Tongue Flick', icon: 'spark', color: '#E07AB0', anim: 'lunge', word: 'THWIP!' },
      { slot: 'power', id: 'mudBlob', name: 'Mud Blob', icon: 'cauldron', color: '#8A5A3C', anim: 'shot', lob: true, word: 'SPLAT!' },
      { slot: 'guard', id: 'lilyHop', name: 'Lily Hop', icon: 'broom', color: '#5CE07A', guard: 'dodge' },
      { slot: 'special', id: 'ribbit', name: 'Big Ribbit', icon: 'bark', color: '#5CE07A', power: 1 },
    ],
  }),
  // Czernobog's night crew: dancing shadow imps and jiggly skeletons from the
  // mountaintop (mood from Matt's reference; our own cute, kid-friendly designs)
  imp: minion('imp', {
    name: 'Shadow Imp', boss: 'nightwing', color: '#3A2A6A', accent: '#FF5A8A', maxHp: 54,
    lore: 'a little horned shadow that dances on the mountaintop',
    moves: [
      { slot: 'quick', id: 'impScratch', name: 'Scratch', icon: 'claw', color: '#FF5A8A', anim: 'lunge', word: 'SKRITCH!' },
      { slot: 'power', id: 'shadowBall', name: 'Shadow Ball', icon: 'ghost', color: '#B98CFF', anim: 'shot', word: 'POOF!' },
      { slot: 'guard', id: 'fadeAway', name: 'Fade Away', icon: 'wings', color: '#6A3FA0', guard: 'dodge' },
      { slot: 'special', id: 'impJig', name: 'Imp Jig', icon: 'flames', color: '#FF5A8A', power: 1 },
    ],
  }),
  bones: minion('bones', {
    name: 'Jitterbones', boss: 'nightwing', color: '#E8E4F0', accent: '#B98CFF', maxHp: 56,
    lore: 'a wobbly skeleton who can\u2019t stop dancing',
    moves: [
      { slot: 'quick', id: 'boneBonk', name: 'Bone Bonk', icon: 'fist', color: '#E8E4F0', anim: 'lunge', word: 'BONK!' },
      { slot: 'power', id: 'rattleRoll', name: 'Rattle Roll', icon: 'roll', color: '#B98CFF', anim: 'lunge', dash: true, word: 'RATTLE!' },
      { slot: 'guard', id: 'fallApart', name: 'Fall Apart', icon: 'ghost', color: '#E8E4F0', guard: 'dodge' },
      { slot: 'special', id: 'boneDance', name: 'Bone Dance', icon: 'notes', color: '#B98CFF', power: 1 },
    ],
  }),
  squirrel: minion('squirrel', {
    name: 'Sneaky Squirrel', boss: 'roo', color: '#A8692E', accent: '#F2EDE4', maxHp: 56,
    lore: 'the backyard squirrel Remy always chases',
    moves: [
      { slot: 'quick', id: 'tailFlick', name: 'Tail Flick', icon: 'tail', color: '#C9822E', anim: 'lunge', word: 'FLICK!' },
      { slot: 'power', id: 'acornToss', name: 'Acorn Toss', icon: 'ball', color: '#8A5A3C', anim: 'shot', lob: true, word: 'BONK!' },
      { slot: 'guard', id: 'scurry', name: 'Scurry', icon: 'roll', color: '#4EA8DE', guard: 'dodge' },
      { slot: 'special', id: 'nutStash', name: 'Nut Stash', icon: 'ball', color: '#C8E63C', power: 1 },
    ],
  }),
  crab: minion('crab', {
    name: 'Bubble Crab', boss: 'bass', color: '#E8503A', accent: '#FFE7A0', maxHp: 58,
    lore: 'a sideways-scuttling pier crab who sings along with Billy',
    moves: [
      { slot: 'quick', id: 'pinch', name: 'Pinch', icon: 'claw', color: '#FF7A1A', anim: 'lunge', word: 'PINCH!' },
      { slot: 'power', id: 'bubbleBurst', name: 'Bubble Burst', icon: 'wave', color: '#9FD8FF', anim: 'shot', shots: 2, word: 'BLOOP!' },
      { slot: 'guard', id: 'shellUp', name: 'Shell Up', icon: 'armor', color: '#E8503A', guard: 'block' },
      { slot: 'special', id: 'crabDance', name: 'Crab Dance', icon: 'notes', color: '#FFC914', power: 1 },
    ],
  }),
};
Object.assign(CHARACTERS, MINIONS);
// each main character's own wild creature (the first one listed for it)
export const MINION_OF = {};
for (const m of Object.values(MINIONS)) if (!MINION_OF[m.boss]) MINION_OF[m.boss] = m.id;
