// Drop-in roster entries for the four new toys (handoff 2026-10-14).
// Paste these into CHARACTERS in src/data/characters.js and add the ids to ROSTER.
// Same schema as the existing eight. art.draw points at the code-built rigs in
// src/render3d/villain-rigs.js; add art.model once the Hunyuan GLBs exist.
export const NEW_FOUR = {
  // hook-handed pirate captain; rival of Billy Bass and Ragin' Rockfish
  crookhook: {
    id: 'crookhook',
    name: "Capt'n Crookhook",
    color: '#1F8A8A',
    accent: '#FFC914',
    maxHp: 110,
    attackBonus: 2,
    moves: [
      { slot: 'quick', id: 'hookSwipe', name: 'Hook Swipe', icon: 'claw', color: '#DDE6F2', anim: 'lunge', word: 'SNAG!' },
      { slot: 'power', id: 'squawksAttack', name: 'Squawks Attack', icon: 'wings', color: '#2E9E44', anim: 'shot', shots: 2, word: 'SQUAWK!' },
      { slot: 'guard', id: 'barrelRoll', name: 'Barrel Roll', icon: 'roll', color: '#9A6232', guard: 'dodge' },
      { slot: 'special', id: 'cannonBroadside', name: 'Cannon Broadside', icon: 'cannon', color: '#FFC914', power: 1.15, hits: 4 },
    ],
    foePattern: ['quick', 'power', 'charge', 'slam'],
    arcadeOnly: true, // playable everywhere, but no campaign world or wild creature
    art: { kind: 'procedural', draw: 'crookhook' },
  },
  // pumpkin-headed toy skeleton who folds up like a pocketknife; rival of Spooky Tree
  jackknife: {
    id: 'jackknife',
    name: 'Jack-Knife',
    color: '#E8762B',
    accent: '#5CF2A0',
    maxHp: 98,
    attackBonus: 3,
    moves: [
      { slot: 'quick', id: 'rattleKick', name: 'Rattle Kick', icon: 'zoom', color: '#EDE6D2', anim: 'lunge', word: 'RATTLE!' },
      { slot: 'power', id: 'pumpkinToss', name: 'Pumpkin Toss', icon: 'pumpkin', color: '#5CF2A0', anim: 'shot', lob: true, word: 'SPLAT!' },
      { slot: 'guard', id: 'foldUp', name: 'Fold Up', icon: 'roll', color: '#5CF2A0', guard: 'dodge' },
      { slot: 'special', id: 'pumpkinBarrage', name: 'Pumpkin Bomb Barrage', icon: 'pumpkin', color: '#5CF2A0', power: 1.1, effect: 'dizzy', hits: 5 },
    ],
    foePattern: ['power', 'quick', 'charge', 'slam'],
    arcadeOnly: true, // playable everywhere, but no campaign world or wild creature
    art: { kind: 'procedural', draw: 'jackknife' },
  },
  // the storybook wolf who huffs and puffs; rival of Remy Roo
  wolfgang: {
    id: 'wolfgang',
    name: 'Big Bad Wolfgang',
    color: '#6B7A99',
    accent: '#D7263D',
    maxHp: 115,
    attackBonus: 1,
    moves: [
      { slot: 'quick', id: 'pawSwat', name: 'Paw Swat', icon: 'paw', color: '#FFFFFF', anim: 'lunge', word: 'SWAT!' },
      { slot: 'power', id: 'howl', name: 'Howl', icon: 'bark', color: '#FFD84A', anim: 'shot', shots: 2, word: 'AWOOO!' },
      { slot: 'guard', id: 'sheepsDisguise', name: "Sheep's Disguise", icon: 'roll', color: '#FAF6EE', guard: 'dodge' },
      { slot: 'special', id: 'huffAndPuff', name: 'Huff & Puff', icon: 'gust', color: '#FFFFFF', power: 1.15, effect: 'dizzy', hits: 3 },
    ],
    foePattern: ['quick', 'quick', 'charge', 'slam'],
    arcadeOnly: true, // playable everywhere, but no campaign world or wild creature
    art: { kind: 'procedural', draw: 'wolfgang' },
  },
  // armored star commander of the Iron Halo; rival of Young Arthur
  payne: {
    id: 'payne',
    name: 'Commander Payne',
    color: '#4A5262',
    accent: '#FFC914',
    maxHp: 118,
    attackBonus: 1,
    moves: [
      { slot: 'quick', id: 'halberdSweep', name: 'Halberd Sweep', icon: 'sword', color: '#4EE8FF', anim: 'lunge', word: 'VRRMM!' },
      { slot: 'power', id: 'gravityGrip', name: 'Gravity Grip', icon: 'spark', color: '#4EE8FF', anim: 'shot', word: 'ZZZRK!' },
      { slot: 'guard', id: 'deflectorShield', name: 'Deflector Shield', icon: 'shield', color: '#4EE8FF', guard: 'reflect' },
      { slot: 'special', id: 'orbitalStrike', name: 'Orbital Strike', icon: 'bolt', color: '#4EE8FF', power: 1.2, hits: 4 },
    ],
    foePattern: ['power', 'charge', 'slam', 'quick'],
    arcadeOnly: true, // playable everywhere, but no campaign world or wild creature
    art: { kind: 'procedural', draw: 'payne' },
  },
};

export const NEW_ROSTER_IDS = ['crookhook', 'jackknife', 'wolfgang', 'payne'];
