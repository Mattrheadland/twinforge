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

Not in the repo: the Hocus Pocus and Chernabog sheets (Disney characters). Their roster spots use original stand-ins, Wanda Wickwhistle and Gloomwing, which are built in code and have no sheets yet.

## Arenas — `assets/arenas/<id>/`
`arena-<id>-backdrop.png` (1536×1024, far scenery; the floor line is ~60% down) · `arena-<id>-floor.png` (seamless, top-down) · `arena-<id>-props.png` (1536×1024, 6 props on #EEEEEE).

| id | Backdrop | Floor | Props |
|---|---|---|---|
| bog-shack | pondside cabin (+ `backdrop-alt`: snow-cone shack) | **missing** (re-run IMAGE 2 of the arena prompt) | frog sign, snow cone, lantern, chalkboard, bench, flower pot |
| castle | courtyard wall with banners | blue stone blocks | tower, banner pole, chest, bench, barrel, shield |
| fishing-pier | sunny bay, lighthouse | honey-brown planks | piling, cooler, life ring, bucket, crate, lantern |
| haunted-forest | moonlit forest | purple earth | tree, lamp post, mossy rock, stump, mushroom, log |

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
3D toys made from the turnarounds (option A). Written by `npm run model:import`; shipped by the build only when present (the build lists them, so missing ones never cause a request). See ASSET_PIPELINE §4.

| id | Character | Status |
|---|---|---|
| battle-rex | rex | in game (Hunyuan 3D, 9k triangles, toy joints) |
| spooky-tree, ragin-rockfish, young-arthur | tree, rockfish, arthur | after Rex |
| remy-roo, billy-bass | roo, bass | after Rex; code-built stand-ins in game now |
