// Character roster. Everything gameplay-related lives here as plain data.
// `art.kind: 'procedural'` = temporary placeholder drawn in code.
// When Astra art arrives, switch to `art.kind: 'sprites'` with the pose files
// listed in docs/ASSET_PIPELINE.md; the renderer swaps automatically.

export const CHARACTERS = {
  blocko: {
    id: 'blocko',
    name: 'Captain Blocko',
    placeholder: true,
    color: '#D7263D',
    accent: '#1B4FD8',
    maxHp: 110,
    attackBonus: 0,
    shieldStyle: 'blocks', // what his Defend looks like
    special: {
      id: 'barrage',
      name: 'Block Barrage',
      power: 1.1,
      effect: 'wall', // rains blocks, then builds a wall that shields him next turn
    },
    foePattern: ['attack', 'attack', 'charge', 'slam'],
    foePower: 1.0,
    art: { kind: 'procedural', draw: 'blocko' },
    stats: { hearts: 5, punch: 3, special: 'wall' },
  },
  stompy: {
    id: 'stompy',
    name: 'Stompy',
    placeholder: true,
    color: '#2E9E44',
    accent: '#F46036',
    maxHp: 95,
    attackBonus: 3,
    shieldStyle: 'bubble',
    special: {
      id: 'megastomp',
      name: 'Mega Stomp',
      power: 1.0,
      effect: 'dizzy', // shockwave; foe gets dizzy and loses its next turn
    },
    foePattern: ['attack', 'charge', 'slam', 'attack'],
    foePower: 1.0,
    art: { kind: 'procedural', draw: 'stompy' },
    stats: { hearts: 4, punch: 4, special: 'dizzy' },
  },
};

export const ROSTER = ['blocko', 'stompy'];

export function opponentFor(heroId) {
  return ROSTER.find((id) => id !== heroId) || ROSTER[0];
}
