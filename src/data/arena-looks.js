// v6 arena looks: id -> `look` object (mood tint, rim light, mist, fireflies, light pools, prop sway).
// To give an arena a look, add an entry here; arenas.js attaches it and render3d/arena-image.js and
// stage3d.js pick it up. Arenas without an entry render exactly as before.
//
// look = {
//   rim: 0xRRGGBB, rimK: 0..1, tint: 0xRRGGBB      (toon.js setLighting)
//   mist: 0xRRGGBB, mistK: 0..1                     (drifting mist banks)
//   fireflies: { count: 0..400, colors: ['#rrggbb', ...], size: 1..200 }
//   pools: [{ slot, color: 0xRRGGBB, r: 1..1000, k: 0..1 }]   (slot: a prop slot name)
//   sway: { <prop file number 1-6>: radians 0..0.5 }
// }

const LOOKS = {
  'pumpkin-patch': {
    // v6 Phase 1 visual benchmark (directive §5): moonlit mood tint, a green-lantern rim light on the toys,
    // drifting purple mist, fireflies, a light pool under the lantern, the lantern and signpost swaying
    rim: 0xB4FF7A, rimK: 0.7, tint: 0xEAE4FF,
    mist: 0xB89CFF, mistK: 0.42,
    fireflies: { count: 44, colors: ['#D6FF6A', '#FFC15A', '#A6FF8A'], size: 34 },
    pools: [{ slot: 'backR', color: 0x7DFF5A, r: 170, k: 0.6 }, { slot: 'frontR', color: 0xFF9A3A, r: 120, k: 0.5 }, { slot: 'frontL', color: 0xFF8A2A, r: 110, k: 0.45 }],
    sway: { 6: 0.05, 3: 0.02 },
  },
};

const SLOTS = ['backL', 'backL2', 'backR', 'backR2', 'frontL', 'frontR'];
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNum = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const isColor = (v) => Number.isInteger(v) && v >= 0 && v <= 0xFFFFFF;
const isHex = (v) => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);

// Returns a list of problems; empty means the look is valid.
export function lookProblems(look) {
  if (!isObj(look)) return ['look must be an object'];
  const bad = [];
  const KEYS = ['rim', 'rimK', 'tint', 'mist', 'mistK', 'fireflies', 'pools', 'sway'];
  for (const k of Object.keys(look)) if (!KEYS.includes(k)) bad.push(`unknown key "${k}"`);
  for (const k of ['rim', 'tint', 'mist']) if (look[k] !== undefined && !isColor(look[k])) bad.push(`${k} must be a 0xRRGGBB integer`);
  for (const k of ['rimK', 'mistK']) if (look[k] !== undefined && !isNum(look[k], 0, 1)) bad.push(`${k} must be a number 0..1`);
  const f = look.fireflies;
  if (f !== undefined) {
    if (!isObj(f)) bad.push('fireflies must be an object');
    else {
      for (const k of Object.keys(f)) if (!['count', 'colors', 'size'].includes(k)) bad.push(`unknown fireflies key "${k}"`);
      if (f.count !== undefined && !(isNum(f.count, 0, 400) && Number.isInteger(f.count))) bad.push('fireflies.count must be an integer 0..400');
      if (f.size !== undefined && !isNum(f.size, 1, 200)) bad.push('fireflies.size must be a number 1..200');
      if (f.colors !== undefined && !(Array.isArray(f.colors) && f.colors.length > 0 && f.colors.every(isHex))) bad.push('fireflies.colors must be a non-empty list of "#rrggbb"');
    }
  }
  if (look.pools !== undefined) {
    if (!Array.isArray(look.pools)) bad.push('pools must be a list');
    else look.pools.forEach((p, i) => {
      if (!isObj(p)) return bad.push(`pools[${i}] must be an object`);
      for (const k of Object.keys(p)) if (!['slot', 'color', 'r', 'k'].includes(k)) bad.push(`unknown pools[${i}] key "${k}"`);
      if (!SLOTS.includes(p.slot)) bad.push(`pools[${i}].slot must be one of ${SLOTS.join('/')}`);
      if (!isColor(p.color)) bad.push(`pools[${i}].color must be a 0xRRGGBB integer`);
      if (!isNum(p.r, 1, 1000)) bad.push(`pools[${i}].r must be a number 1..1000`);
      if (p.k !== undefined && !isNum(p.k, 0, 1)) bad.push(`pools[${i}].k must be a number 0..1`);
    });
  }
  if (look.sway !== undefined) {
    if (!isObj(look.sway)) bad.push('sway must be an object');
    else for (const [n, v] of Object.entries(look.sway)) {
      if (!/^[1-6]$/.test(n)) bad.push(`sway key "${n}" must be a prop number 1-6`);
      if (!isNum(v, 0, 0.5)) bad.push(`sway[${n}] must be a number 0..0.5`);
    }
  }
  return bad;
}

// A getter over a registry. Bad entries warn once and read as "no look". Exported for tests.
export function makeLookGetter(registry) {
  const checked = new Map();
  return function get(id) {
    if (checked.has(id)) return checked.get(id);
    let look;
    if (Object.prototype.hasOwnProperty.call(registry, id)) {
      const bad = lookProblems(registry[id]);
      if (bad.length) console.warn(`arena look "${id}" ignored: ${bad.join('; ')}`);
      else look = registry[id];
    }
    checked.set(id, look);
    return look;
  };
}

export const getArenaLook = makeLookGetter(LOOKS);
