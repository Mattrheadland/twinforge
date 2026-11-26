// The very first session: one tap from the title to a guided fight (design fix 3, Nov 2026).
//
// Before: Play -> who's playing -> modes -> pick a toy -> pick a foe -> go: 6-8 taps of
// menus before a 3-year-old did anything. Now, on a brand-new player's first Play, the game
// goes straight into a short guided battle with a default toy. The Play tap stays because
// phones only allow sound and speech after a tap, and every line here is spoken.
//
// The guided battle can't be lost: the foe has less health, hits softly, never charges its
// meter, and "gets tired" rather than knocking the hero out (hero health stops at 1). It
// counts as a normal win, so the next Play goes through the usual menus. Setting up age
// and level stays with a grown-up, behind the parent gate, after the first fight.

export const FIRST_BATTLE = { heroId: 'rex', foeId: 'tree', arenaId: 'bedroom' };

// Guided-battle rules, read by logic/battle.js when a battle has `guided: true`.
export const GUIDED = { foeHp: 0.5, foePower: 0.5, heroFloor: 1 };

// A first session: this player has never fought, has no fight saved, and is the only player
// on the device (a household with several players keeps "who's playing?" first).
export function isFirstSession(data, playerCount = 1) {
  if (!data || data.battle || playerCount > 1) return false;
  const p = data.progress || {};
  return (p.battles | 0) === 0 && (p.wins | 0) === 0;
}

// Spoken coaching for the guided battle, by what the helper hand points at.
// Short, plain, and the same words every time so a pre-reader learns them.
export const COACH = {
  power: 'Tap the glowing button to attack!',
  quick: 'Tap the glowing button to attack!',
  special: 'Your power is full! Tap the star for a super move!',
  guard: 'Watch out! Tap the shield to block!',
  win: 'You did it! You won your first battle!',
};
