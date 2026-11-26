// Campaign board layout: where every island, tier, bridge, waterfall and prop
// goes. Pure data and functions, no three.js, so node tests can check it (the
// spaces never move, nothing tall stands on the path, every world is dressed).
// board3d.js turns this into geometry (board-kit.js / board-dress.js).
//
// Units: the board's world units (a space disc is ~76 wide). x runs along the
// board, z toward the camera (+z is the front), y up. The island top is y = 2.

export const STEP = 130; // between spaces
export const GAP = 120; // extra water between worlds
export const WAVE = 70; // how far the path wiggles toward/away from the camera

// heights of the stepped terrain (top to sea)
export const LEVEL = { top: 2, ledge: -20, beach: -40, water: -48, floor: -64 };

// the spaces, exactly where they always were (game logic and saves rely on the order)
export function pathPoints(board) {
  return board.map((sp, i) => ({ x: i * STEP + sp.world * GAP, z: Math.sin(i * 0.85) * WAVE }));
}

// seeded random (Park–Miller), same as board3d.js uses for its own bits
export function rng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

// ---------- island outlines ----------
// A boxy superellipse with a few lumps, so the coast is irregular but the
// radius at any angle is a cheap closed form (edge tests and ring building).
export function lump(sh, a) {
  const q = sh.seed;
  return 1 + sh.lumpK * (0.5 * Math.sin(a * 3 + q) + 0.35 * Math.cos(a * 5 + q * 2) + 0.2 * Math.sin(a * 9 + q * 3));
}
export function radiusAt(sh, a) {
  const c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a)), n = sh.n;
  return lump(sh, a) / Math.pow(Math.pow(c / sh.rx, n) + Math.pow(s / sh.rz, n), 1 / n);
}
// how far (x, z) is inside the outline, along the ray from the centre (negative: outside)
export function edgeDist(sh, x, z) {
  const dx = x - sh.cx, dz = z - sh.cz;
  return radiusAt(sh, Math.atan2(dz, dx)) - Math.hypot(dx, dz);
}
// outline point at angle a, pushed out by `off` units
export function rimPoint(sh, a, off = 0) {
  const r = radiusAt(sh, a) + off;
  return { x: sh.cx + Math.cos(a) * r, z: sh.cz + Math.sin(a) * r };
}

// distance from (x, z) to the polyline through pts (and the nearest point's z)
export function pathDist(pts, x, z) {
  let best = Infinity, bz = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const vx = b.x - a.x, vz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * vx + (z - a.z) * vz) / (vx * vx + vz * vz)));
    const px = a.x + vx * t, pz = a.z + vz * t;
    const d = Math.hypot(x - px, z - pz);
    if (d < best) { best = d; bz = pz; }
  }
  if (pts.length === 1) { best = Math.hypot(x - pts[0].x, z - pts[0].z); bz = pts[0].z; }
  return { d: best, z: bz };
}

const KEEP = 58; // every space centre sits at least this far inside its island's top

// per world: what grows there and the landmark (board-dress.js builds the kinds)
export const DRESS = {
  bedroom: { back: ['blocks', 'blocks', 'toytree', 'toytree', 'crayon-cup', 'ringstack', 'ball'], front: ['block', 'crayon', 'marbles', 'block', 'domino', 'top'], tiny: ['marbles', 'flowers', 'grass'], tier: 'books', falls: 0, dens: 0.6 },
  castle: { back: ['tree', 'tree', 'tree', 'pine', 'banner', 'hay', 'tree'], front: ['bush', 'rock', 'hay', 'bush', 'flowers', 'target'], tiny: ['flowers', 'grass', 'flowers'], tier: 'rock', falls: 2 },
  'fishing-pier': { back: ['palm', 'hut', 'palm', 'crates', 'net-rack', 'palm'], front: ['umbrella', 'crates', 'barrel', 'rock', 'buoy-ring', 'shell'], tiny: ['shell', 'grass', 'flowers'], tier: 'sandstone', falls: 0 },
  'bog-shack': { back: ['cypress', 'cypress', 'reeds', 'cypress', 'mushroom', 'pool'], front: ['reeds', 'lily-pool', 'log', 'reeds', 'mushroom', 'rock'], tiny: ['reeds-small', 'grass', 'flowers'], tier: 'moss', falls: 2 },
  'haunted-forest': { back: ['twisted', 'twisted', 'pine-dark', 'twisted', 'crystal', 'mushroom-glow'], front: ['pumpkin', 'mushroom-glow', 'rock', 'crystal', 'pumpkin', 'bush-dark'], tiny: ['mushroom-tiny', 'grass', 'flowers'], tier: 'dark', falls: 0 },
};
// how tall each kind stands (front kinds must stay low so the path stays visible)
export const TALL = { blocks: 70, toytree: 70, 'crayon-cup': 50, ringstack: 50, ball: 40, tree: 80, pine: 90, banner: 70, hay: 26, palm: 90, hut: 60, crates: 30, 'net-rack': 40, cypress: 100, reeds: 36, mushroom: 34, pool: 2, twisted: 90, 'pine-dark': 90, crystal: 40, 'mushroom-glow': 30, block: 26, crayon: 10, marbles: 6, domino: 20, top: 22, bush: 22, rock: 18, flowers: 6, target: 30, umbrella: 34, barrel: 20, 'buoy-ring': 6, shell: 5, 'lily-pool': 2, log: 12, pumpkin: 16, 'bush-dark': 22, 'mushroom-tiny': 8, grass: 8, 'reeds-small': 16 };

// Build the whole layout for a board (deterministic for a given board).
export function layout(board) {
  const pts = pathPoints(board);
  const worlds = [...new Set(board.map((s) => s.world))].sort((a, b) => a - b);
  const names = worlds.map((wi) => board.find((s) => s.world === wi).arena);
  const r = rng(4242);
  const isles = worlds.map((wi, k) => {
    const idx = board.map((s, i) => (s.world === wi ? i : -1)).filter((i) => i >= 0);
    const x0 = pts[idx[0]].x, x1 = pts[idx.at(-1)].x;
    const sh = { wi, name: names[k], idx, cx: (x0 + x1) / 2, cz: -50, rx: (x1 - x0) / 2 + 60, rz: 232, n: 3.4, seed: wi * 1.7 + 0.6, lumpK: 0 };
    sh.lumpK = Math.min(0.09, 20 / sh.rx); // lumps of ~20 units, whatever the island's size
    // grow until every space has room around it (boss discs are ~51 across the middle)
    for (let g = 0; g < 40 && idx.some((i) => edgeDist(sh, pts[i].x, pts[i].z) < KEEP); g++) {
      const worst = idx.reduce((m, i) => (edgeDist(sh, pts[i].x, pts[i].z) < edgeDist(sh, pts[m].x, pts[m].z) ? i : m), idx[0]);
      if (Math.abs(pts[worst].x - sh.cx) / sh.rx > Math.abs(pts[worst].z - sh.cz) / sh.rz) sh.rx += 6; else sh.rz += 6;
    }
    sh.path = idx.map((i) => pts[i]);
    sh.spaces = idx;
    return sh;
  });
  // the boardwalk bridges: from the last space of one world to the first of the next
  const bridges = [];
  for (let k = 0; k < isles.length - 1; k++) {
    const i = isles[k].idx.at(-1), j = isles[k + 1].idx[0];
    bridges.push({ from: k, to: k + 1, a: pts[i], b: pts[j], ai: i, bi: j });
  }
  const props = [];
  const falls = [];
  const reserved = []; // circles nothing else may use { x, z, r, w }
  const free = (x, z, rad) => !reserved.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + rad);
  const reserve = (w, x, z, rad, why) => reserved.push({ w, x, z, r: rad, why });

  for (const sh of isles) {
    const D = DRESS[sh.name] || DRESS.castle;
    const wi = sh.wi;
    // where the path runs (with its bridge ends) for this island
    const wpath = [...sh.path];
    const prev = bridges.find((b) => b.to === isles.indexOf(sh)), next = bridges.find((b) => b.from === isles.indexOf(sh));
    if (prev) wpath.unshift(prev.a);
    if (next) wpath.push(next.b);
    sh.wpath = wpath;
    // shadow peekers rise behind the path between spaces: keep those spots clear
    for (let q = 0; q < sh.path.length - 1; q++) {
      const a = sh.path[q], b = sh.path[q + 1];
      reserve(wi, (a.x + b.x) / 2, (a.z + b.z) / 2 - 89, 46, 'peeker');
    }
    // the forest's three fire dancers on the back edge (board3d.js places them)
    sh.half = (sh.path.at(-1).x - sh.path[0].x) / 2 + 90; // the old island half-width (dancers and fireflies use it)
    if (sh.name === 'haunted-forest') {
      const hx = sh.half;
      for (let k = 0; k < 3; k++) reserve(wi, sh.cx - hx * 0.45 + k * hx * 0.26, -206 + (k % 2) * 12, 40, 'dancer');
    }
    // the raised back tier (the landmark stands on it), and a summit on some
    const forest = sh.name === 'haunted-forest';
    const inner = sh.half - 90; // half the run of spaces
    const tierCx = forest ? sh.cx - inner * 0.1 : sh.cx + inner * 0.18;
    sh.tiers = [{ cx: tierCx, cz: forest ? -306 : -268, rx: Math.min(330, inner * 0.62 + 90), rz: 64, n: 2.6, seed: wi * 2.3 + 1, lumpK: 0.07, top: 46, kind: D.tier }];
    if (sh.name === 'castle') sh.tiers.push({ cx: sh.path.at(-1).x - 60, cz: -284, rx: 96, rz: 42, n: 2.4, seed: 9, lumpK: 0.05, top: 86, kind: 'rock' });
    if (sh.name === 'bedroom') sh.tiers.push({ cx: tierCx + 40, cz: -272, rx: 150, rz: 46, n: 6, seed: 3, lumpK: 0.0, top: 66, kind: 'books' });
    const T = sh.tiers[0];
    const topTier = sh.tiers.at(-1);
    // the landmark sits on the highest tier, toward the boss end
    sh.landmark = { x: sh.name === 'castle' ? topTier.cx : topTier.cx + (sh.name === 'bedroom' ? 10 : T.rx * 0.35), z: topTier.cz + 4, y: topTier.top };
    if (sh.name === 'haunted-forest') sh.landmark.x = T.cx - T.rx * 0.25;
    reserve(wi, sh.landmark.x, sh.landmark.z, sh.name === 'castle' ? 110 : 90, 'landmark');
    // waterfalls: one over the front cliff into the sea (a spring pool feeds it),
    // and one down the tier into a pool on the plateau
    if (D.falls) {
      // front: where the path swings furthest back, so the pool has room
      let best = null;
      for (const p of sh.path.slice(1, -1)) if (!best || p.z < best.z) best = p;
      best = best || sh.path[0];
      const ang = Math.atan2(160 - sh.cz, best.x - sh.cx);
      const rim = rimPoint(sh, ang);
      falls.push({ w: wi, kind: 'sea', x: rim.x, z: rim.z, ang, top: LEVEL.top, bottom: LEVEL.water, pool: { x: rim.x - Math.cos(ang) * 30, z: rim.z - Math.sin(ang) * 30, r: 24 } });
      reserve(wi, rim.x - Math.cos(ang) * 26, rim.z - Math.sin(ang) * 26, 40, 'spring');
      // tier: at the tier's front, away from the peeker spots
      let tx = T.cx - T.rx * 0.55;
      for (let k = 0; k < 8 && !free(tx, T.cz + T.rz + 30, 26); k++) tx += 30;
      const tfront = rimPoint(T, Math.atan2(T.rz, tx - T.cx));
      falls.push({ w: wi, kind: 'tier', x: tfront.x, z: tfront.z, ang: Math.atan2(tfront.z - T.cz, tfront.x - T.cx), top: T.top, bottom: LEVEL.top, pool: { x: tfront.x, z: tfront.z + 22, r: 22 } });
      reserve(wi, tfront.x, tfront.z + 20, 32, 'tier-pool');
      const ta = Math.atan2(tfront.z - T.cz, tfront.x - T.cx);
      falls.at(-1).spring = { x: tfront.x - Math.cos(ta) * 26, z: tfront.z - Math.sin(ta) * 26 };
      reserve(wi, falls.at(-1).spring.x, falls.at(-1).spring.z, 30, 'tier-spring');
    }
    // the castle's curtain wall along the front of its plateau
    if (sh.name === 'castle') {
      sh.wall = { x0: T.cx - T.rx * 0.72, x1: T.cx + T.rx * 0.2, z: T.cz + T.rz * 0.55, y: T.top };
      for (let x = sh.wall.x0; x <= sh.wall.x1; x += 24) reserve(wi, x, sh.wall.z, 22, 'wall');
    }
    // the pier's two docks reach out from the front shore
    if (sh.name === 'fishing-pier') {
      sh.docks = [];
      for (const f of [-0.42, 0.3]) {
        const x = sh.cx + inner * f;
        const ang = Math.atan2(150 - sh.cz, x - sh.cx);
        const rim = rimPoint(sh, ang);
        sh.docks.push({ x: rim.x, z: rim.z - 14, len: 150, w: 34 });
        reserve(wi, rim.x, rim.z - 20, 30, 'dock');
      }
    }
    // bog: little stilt shacks standing in the shallows out front
    if (sh.name === 'bog-shack') {
      sh.stilts = [];
      for (const f of [-0.75, 0.55, 0.95]) {
        const x = sh.cx + inner * f;
        const rim = rimPoint(sh, Math.atan2(180 - sh.cz, x - sh.cx), 44);
        sh.stilts.push({ x: rim.x, z: rim.z, rot: r() * 0.6 - 0.3 });
      }
    }
    // ---- scatter: a jittered grid over the island, sorted into zones ----
    const cell = 30;
    const field = (x, z) => Math.sin(x * 0.011 + wi) * Math.cos(z * 0.017 + wi * 2) + Math.sin(x * 0.027 - z * 0.013) * 0.5; // clumps
    for (let gx = sh.cx - sh.rx * 1.12; gx < sh.cx + sh.rx * 1.12; gx += cell) {
      for (let gz = sh.cz - sh.rz * 1.12; gz < sh.cz + sh.rz * 1.12; gz += cell) {
        const x = gx + (r() - 0.5) * cell * 0.9, z = gz + (r() - 0.5) * cell * 0.9;
        const e = edgeDist(sh, x, z);
        if (e < 12) continue;
        const pd = pathDist(wpath, x, z);
        if (pd.d < 64) continue; // the path and its spaces stay clear
        // on a tier? those get their own (taller) dressing, kept off the landmark
        const onTier = sh.tiers.findLast((t) => edgeDist(t, x, z) > 10);
        const nearTier = sh.tiers.some((t) => edgeDist(t, x, z) > -14);
        const behind = z < pd.z;
        const c = field(x, z);
        let kind = null, zone;
        if (onTier) {
          if (r() > (0.55 + c * 0.25) * (D.dens || 1)) continue;
          zone = 'tier';
          kind = D.back[Math.floor(r() * D.back.length)];
          if (TALL[kind] < 20 || kind === 'pool') kind = D.back[0];
        } else if (nearTier) continue; // the tier's cliff foot stays clean
        else if (pd.d < 96) {
          if (r() > 0.42) continue;
          zone = 'edge';
          kind = D.tiny[Math.floor(r() * D.tiny.length)];
        } else if (behind) {
          if (r() > (0.62 + c * 0.3) * (D.dens || 1)) continue;
          zone = 'back';
          kind = D.back[Math.floor(r() * D.back.length)];
        } else {
          if (r() > 0.4 + c * 0.25) continue;
          zone = 'front';
          kind = e < 34 && r() < 0.5 ? 'rock' : D.front[Math.floor(r() * D.front.length)];
        }
        const rad = zone === 'edge' ? 8 : 18;
        if (!free(x, z, rad)) continue;
        const y = onTier ? onTier.top : LEVEL.top;
        props.push({ w: wi, kind, zone, x, z, y, s: 0.8 + r() * 0.45, rot: r() * Math.PI * 2, v: r() });
      }
    }
  }

  // keep each island within budget (phones): drop the smallest, most hidden extras first
  const BUDGET = 78;
  for (const sh of isles) {
    const mine = props.filter((p) => p.w === sh.wi);
    if (mine.length <= BUDGET) continue;
    const order = { edge: 0, front: 1, tier: 2, back: 3 };
    const drop = new Set(mine.sort((a, b) => order[a.zone] - order[b.zone] || a.v - b.v).slice(0, mine.length - BUDGET).filter((_, k) => k % 1 === 0));
    for (let k = props.length - 1; k >= 0; k--) if (drop.has(props[k])) props.splice(k, 1);
  }
  // ---- the sea: little islets, sea stacks, rocks and buoys ----
  const sea = [];
  const xMin = pts[0].x - 400, xMax = pts.at(-1).x + 300;
  const inAny = (x, z, pad) => isles.some((sh) => edgeDist(sh, x, z) > -pad);
  const nearBridge = (x, z) => bridges.some((b) => pathDist([b.a, b.b], x, z).d < 90);
  for (let k = 0, tries = 0; k < 48 && tries < 900; tries++) {
    const x = xMin + r() * (xMax - xMin);
    const z = r() < 0.6 ? 260 + r() * 420 : -380 - r() * 500;
    const big = r() < 0.18;
    const kind = big ? 'islet' : r() < 0.22 ? 'stack' : r() < 0.25 ? 'buoy' : 'sea-rock';
    const rad = kind === 'islet' ? 120 : kind === 'stack' ? 50 : 30;
    if (inAny(x, z, rad + 60) || nearBridge(x, z) || sea.some((q) => Math.hypot(q.x - x, q.z - z) < q.rad + rad)) continue;
    // the mountain owns the back of the forest end
    if (x > pts.at(-1).x - 500 && z < -150) continue;
    let w = 0;
    for (const sh of isles) if (Math.abs(sh.cx - x) < Math.abs(isles[w].cx - x)) w = isles.indexOf(sh);
    sea.push({ w: isles[w].wi, kind, x, z, rad, s: 0.7 + r() * 0.6, rot: r() * 6.28, v: r() });
    k++;
  }
  // a few drifting boats (board3d.js bobs them), out front where the camera sees them
  const boats = [];
  for (const [f, z] of [[0.18, 330], [0.52, 420], [0.83, 360], [0.35, -470]]) {
    const x = xMin + 400 + f * (xMax - xMin - 600);
    boats.push({ x, z, rot: r() * 6.28, color: [0xe84a3a, 0x2456e0, 0xffc914, 0x3fc46a][boats.length % 4], drift: 20 + r() * 30, ph: r() * 6.28 });
  }
  return { pts, isles, bridges, props, falls, reserved, sea, boats };
}

// handy counts for tests and the e2e check
export function detailCounts(L) {
  return L.isles.map((sh) => ({
    name: sh.name,
    props: L.props.filter((p) => p.w === sh.wi).length,
    tall: L.props.filter((p) => p.w === sh.wi && (TALL[p.kind] || 0) >= 40).length,
    falls: L.falls.filter((f) => f.w === sh.wi).length,
    tiers: sh.tiers.length,
  }));
}
