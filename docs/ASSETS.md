# Art assets index

All game art lives in the repo under `assets/` (the repo is public, so only finished art goes here: no toy photos). Project docs can't hold images, so this file is the map.

Naming: `<thing>-<id>-<kind>.png`, lowercase, hyphens. One folder per character or arena.

## Characters — `assets/characters/<id>/`
Each has `<id>-turnaround.png` (1536×1024: front, side, back, 3/4) and `<id>-faces.png` (1254×1254, 3×3 expressions).

| id | Name | Faces grid (row by row) |
|---|---|---|
| battle-rex | Battle Rex | confident · angry · happy / hit · sleepy · dizzy / smirk · shout · grit |
| spooky-tree | Spooky Tree | same order |
| ragin-rockfish | Ragin' Rockfish | same order |
| young-arthur | Young Arthur | same order |
| remy-roo | Remy Roo (the family dog) | same order |
| billy-bass | Billy Bass (the talking wall fish) | same order |
| capn-crookhook | Capt'n Crookhook (original pirate captain) | same order; concept renders, plus `-moves.png`, `-palette.png` |
| jack-knife | Jack-Knife (original pumpkin-headed toy skeleton) | same order; concept renders |
| big-bad-wolfgang | Big Bad Wolfgang (original storybook wolf) | same order; concept renders |
| commander-payne | Commander Payne (original armored star commander) | same order; concept renders |

The four newest (2026-10-14) are original designs with no toy behind them. Their sheets are concept renders made in the game's own toon shader (so they match the rest of the roster in scale and color; `roster-lineup.png` shows all twelve side by side); Astra's painted packs replace them (`ASTRA_REQUESTS_NEW_FOUR.md`). Each has the usual `views/` for Hunyuan. In the game they are code-built toys (`src/render3d/villain-rigs.js`) until their models land. Their lore (read-aloud story, personality, moves, taunts, sound notes) is in `docs/lore/<id>.md`.

Not in the repo: the Hocus Pocus and Chernabog sheets (Disney characters). Their roster spots use original stand-ins, Wanda Wickwhistle and Czernobog (the Slavic night god's name, spelled as in Polish and in American Gods; the look is our own chubby night creature), which are built in code and have no sheets yet.

## Arenas — `assets/arenas/<id>/`
`arena-<id>-backdrop.png` (1536×1024, far scenery; the floor line is ~60% down) · `arena-<id>-floor.png` (seamless, top-down) · `arena-<id>-props.png` (1536×1024, 6 props on #EEEEEE).

| id | Backdrop | Floor | Props |
|---|---|---|---|
| bog-shack | pondside cabin (+ `backdrop-alt`: snow-cone shack) | **missing** (re-run IMAGE 2 of the arena prompt) | frog sign, snow cone, lantern, chalkboard, bench, flower pot |
| castle | courtyard wall with banners | blue stone blocks | tower, banner pole, chest, bench, barrel, shield |
| fishing-pier | sunny bay, lighthouse | honey-brown planks | piling, cooler, life ring, bucket, crate, lantern |
| haunted-forest | moonlit forest | purple earth | tree, lamp post, mossy rock, stump, mushroom, log |
| skull-cove | **not made yet**: moonlit pirate cove (Crookhook's home) | | `ARENA.md` + two mockups are the spec |
| pumpkin-patch | **not made yet**: Midnight Pumpkin Patch (Jack-Knife's home) | | same |
| grandmas-woods | **not made yet**: Grandma's Woods (Wolfgang's home) | | same |
| star-bridge | **not made yet**: Star Fortress Bridge (Payne's home) | | same |

The four new arenas each have `ARENA.md` (lore, backdrop / floor / prop spec, ambient sound) and `arena-<id>-mockup-empty.png` / `-mockup-fighters.png` (layout references for Astra, not game art). Their `src/data/arenas.js` entries are drafted in `src/data/arenas-new-four.js`; merge `NEW_ARENAS` and `NEW_HOME` once Astra's packs are built with `scripts/build-arenas.py`. Until then the new toys fight in the Bedroom.

The Bedroom Block Fortress arena is built in code (`src/render3d/room.js`). The other four are in the game: `python3 scripts/build-arenas.py` turns these sheets into `public/arenas/<id>/` (backdrop.jpg, floor.jpg, prop-1..6.png cut-outs); `src/data/arenas.js` sets each arena's horizon, floor tile size and prop layout, and which opponent fights where (each foe's home turf). Bog Shack's floor is the Fishing Pier planks, tinted darker, until Astra makes its own.

## UI and effects — `assets/ui/`
All on flat magenta (#FF00FF) to be keyed out.

| File | Contents |
|---|---|
| `fx-sheet-1-battle-effects.png` (4×4) | big impact · small spark · dust puff · speed lines / fire · water splash · green magic · gold slash / ghost-fire swirl · dizzy stars · shield bubble · muzzle flash / power-up aura ring · heal sparkles · leaves · sleepy bubbles |
| `ui-sheet-2-menu-pieces.png` (3×3) | move-button plate · portrait frame · health-bar frame / arcade button · panel frame · trophy / gold star · empty star · ribbon banner |
| `ui-sheet-3-transitions.png` (2×2) | stripe wipe · radial burst / VS split · title starry swirl |

`python3 scripts/build-ui.py` keys out the magenta and writes `public/ui/fx-<name>.png` (impact, spark, dust, speed, fire, splash, magic, slash, swirl, dizzy, bubble, muzzle, aura, heal, leaves, sleepy) and `public/ui/tr-<name>.jpg`. In game (`FX.sprite`, `src/render/fx.js`): impact/spark on hits, muzzle flash on shots and Rex Cannon, splash on Take Me to the River and Tidal Rage, magic on Potion Storm, dust on ground moves, heal sparkles, dizzy stars, power-up aura, swirl on Midnight Storm. The menu-pieces and transition sheets aren't used yet (the code-drawn HUD and VS screen use each character's colors).

Each character folder also has `views/` (made by `scripts/split-turnaround.py`): the four turnaround views as separate transparent 1024×1024 PNGs for image-to-3D tools.

## Models — `assets/models/<id>/<id>.glb`
Imports are simplified to about 6,000 triangles (`--tris N` to change); `npm run perf` compares frame times across scenes.
3D toys made from the turnarounds (option A). Written by `npm run model:import`; shipped by the build only when present (the build lists them, so missing ones never cause a request). See ASSET_PIPELINE §4.

| id | Character | Status |
|---|---|---|
| battle-rex | rex | in game (Hunyuan 3D, 6k triangles, toy joints, swappable eyes) |
| young-arthur | arthur | in game (443 KB, head + arm joints, swappable eyes) |
| ragin-rockfish | rockfish | in game (559 KB, head, jaw, arms, tail, side eyes; armScale 0.35) |
| spooky-tree | tree | in game (365 KB, branch arms; carved face stays painted) |
| remy-roo, billy-bass | roo, bass | generating on Hunyuan; code-built stand-ins in game now |
