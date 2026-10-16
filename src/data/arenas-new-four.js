// Drop-in arena entries for src/data/arenas.js (handoff 2026-10-14).
// These are painted arenas like Castle / Fishing Pier: they need Astra's
// backdrop, floor and prop sheets in assets/arenas/<id>/, then
// `python3 scripts/build-arenas.py <id>` to make public/arenas/<id>/.
// The horizon/prop numbers below are starting values; tune them once the art is in.
export const NEW_ARENAS = {
  'skull-cove': {
    id: 'skull-cove', name: 'Skull Cove', horizon: 0.62, floorTile: 200, tint: 0xe6e8ff,
    // 1 chest · 2 cannon · 3 barrels · 4 palm · 5 lantern post · 6 anchor (Astra's sheet order)
    props: [[4, 'backL', 260], [5, 'backR', 190], [3, 'backL2', 95], [6, 'backR2', 110], [1, 'frontL', 80], [2, 'frontR', 85]],
  },
  'pumpkin-patch': {
    id: 'pumpkin-patch', name: 'Midnight Pumpkin Patch', horizon: 0.62, floorTile: 180, tint: 0xe6e0ff,
    // 1 pumpkin pile · 2 hay bale · 3 signpost · 4 fence · 5 big pumpkin · 6 green lantern
    props: [[4, 'backL', 90], [6, 'backR', 180], [2, 'backL2', 80], [3, 'backR2', 130], [1, 'frontL', 85], [5, 'frontR', 95]],
    // v6 Phase 1 visual benchmark (directive §5): moonlit mood tint, a green-lantern rim light on the toys,
    // drifting purple mist, fireflies, a light pool under the lantern, the lantern and signpost swaying
    look: {
      rim: 0xB4FF7A, rimK: 0.7, tint: 0xEAE4FF,
      mist: 0xB89CFF, mistK: 0.42,
      fireflies: { count: 44, colors: ['#D6FF6A', '#FFC15A', '#A6FF8A'], size: 34 },
      pools: [{ slot: 'backR', color: 0x7DFF5A, r: 170, k: 0.6 }, { slot: 'frontR', color: 0xFF9A3A, r: 120, k: 0.5 }, { slot: 'frontL', color: 0xFF8A2A, r: 110, k: 0.45 }],
      sway: { 6: 0.05, 3: 0.02 },
    },
  },
  'grandmas-woods': {
    id: 'grandmas-woods', name: "Grandma's Woods", horizon: 0.64, floorTile: 190, tint: 0xffffff,
    // 1 picnic basket · 2 mushroom stump · 3 signpost · 4 straw bundle · 5 storybook tree · 6 brick stack
    props: [[5, 'backL', 280], [3, 'backR', 150], [4, 'backL2', 60], [6, 'backR2', 55], [1, 'frontL', 70], [2, 'frontR', 80]],
  },
  'star-bridge': {
    id: 'star-bridge', name: 'Star Fortress Bridge', horizon: 0.6, floorTile: 160, tint: 0xf0f4ff,
    // 1 holo pedestal · 2 crates · 3 beacon · 4 gravity mine · 5 droid · 6 railing
    props: [[3, 'backL', 230], [1, 'backR', 150], [6, 'backL2', 80], [2, 'backR2', 110], [4, 'frontL', 55], [5, 'frontR', 80]],
  },
};

// Add to HOME so each new toy fights on its home turf in Tournament / as the opponent.
export const NEW_HOME = { crookhook: 'skull-cove', jackknife: 'pumpkin-patch', wolfgang: 'grandmas-woods', payne: 'star-bridge' };
