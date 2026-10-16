// Arenas. The Bedroom Block Fortress is built in code (render3d/room.js); the
// rest are Astra's painted arenas (assets/arenas → public/arenas via
// scripts/build-arenas.py), shown as a backdrop, a tiled floor and cut-out props.
//
// horizon: how far down the backdrop image its floor begins (0 top, 1 bottom)
// floorTile: world units per floor-texture repeat
// props: [file number, slot, height]; slots: backL / backL2 / backR / backR2
//   (against the backdrop, outer and inner), frontL / frontR (big, near the camera)

import { NEW_ARENAS, NEW_HOME } from './arenas-new-four.js';

export const ARENAS = {
  bedroom: { id: 'bedroom', name: 'Bedroom Block Fortress', built: true },
  castle: {
    id: 'castle', name: 'Castle Courtyard', horizon: 0.66, floorTile: 190, tint: 0xf2f2ff,
    props: [[1, 'backL', 230], [2, 'backR', 210], [4, 'backL2', 70], [6, 'backR2', 100], [3, 'frontL', 110], [5, 'frontR', 125]],
  },
  'fishing-pier': {
    id: 'fishing-pier', name: 'Fishing Pier', horizon: 0.645, floorTile: 200, tint: 0xffffff,
    props: [[1, 'backL', 150], [4, 'backR', 105], [5, 'backL2', 85], [3, 'backR2', 95], [2, 'frontL', 100], [6, 'frontR', 105]],
  },
  'haunted-forest': {
    id: 'haunted-forest', name: 'Haunted Forest', horizon: 0.62, floorTile: 180, tint: 0xe6e0ff,
    props: [[1, 'backL', 270], [2, 'backR', 240], [4, 'backL2', 75], [5, 'backR2', 115], [3, 'frontL', 90], [6, 'frontR', 80]],
  },
  'bog-shack': {
    id: 'bog-shack', name: 'Bog Shack', horizon: 0.667, floorTile: 200, tint: 0xffffff,
    props: [[1, 'backL', 175], [4, 'backR', 145], [5, 'backL2', 72], [6, 'backR2', 85], [2, 'frontR', 105]],
  },
};

// Each opponent fights on its home turf.
const HOME = {
  rex: 'bedroom', tree: 'haunted-forest', rockfish: 'fishing-pier', arthur: 'castle',
  witch: 'bog-shack', nightwing: 'haunted-forest', roo: 'bedroom', bass: 'fishing-pier',
  ...NEW_HOME,
};

// The new four's arenas join as Astra's art is cut into public/arenas/<id>/ (scripts/build-arenas.py).
// A toy whose arena isn't ready yet fights in the bedroom (arenaFor's fallback).
export const READY_NEW_ARENAS = ['skull-cove', 'pumpkin-patch', 'grandmas-woods'];
for (const id of READY_NEW_ARENAS) ARENAS[id] = NEW_ARENAS[id];

export function arenaFor(foeId) {
  return ARENAS[HOME[foeId]] ? HOME[foeId] : 'bedroom';
}
