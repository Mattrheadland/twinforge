# Board art requests (campaign diorama, next detail pass)

The v6 board detail pass (`v6/board-detail`) is fully code-built: `src/render3d/board-layout.js` (where everything goes), `board-terrain.js` (stepped cliffs, beaches, foam), `board-dress.js` (props, landmarks, boardwalks, boats) and `board-kit.js` (bakes it all into a few draw calls). This file is what the Founder takes to Astra (ChatGPT) and to Blender for the pass after that.

Style: STYLE_GUIDE v5 ("Campaign board (diorama)"). Rules from ASSET_PIPELINE.md apply: no known characters, brands or places; finished art goes into `assets/` named per ASSETS.md; every prompt is one self-contained message.

## 1. Concept-art prompt pack (one per island)

Each prompt asks for ONE isometric diorama concept sheet for one island. They guide the next code/Blender pass; they are not shipped in the game. Paste one prompt per message. Attach nothing (no reference images from other games).

### 1a. Bedroom Block Fortress
```
ASTRA REQUEST — ISLAND CONCEPT SHEET: BEDROOM BLOCK FORTRESS (TwinForge board)

Context: "TwinForge: Toy Box Tactics" is a board-and-battle game for a 4-year-old. Its campaign map is a little 3D tabletop world: five floating low-poly islands over a calm sea, linked by wooden boardwalks on stilts. A dotted path of octagon spaces winds across each island. This sheet is a blueprint for a 3D artist, so clear shapes beat drama.

The island: a giant child's bedroom floor turned into an island. Warm honey-coloured wooden floorboards on top, the cliff sides are stacked plank layers, a pale sand beach at the waterline. Along the back, a raised shelf made of a row of giant book spines in red, blue, yellow, green and purple. On the shelf, the hero landmark: a castle built from wooden toy blocks — cube walls, an upside-down ramp block as the gate arch, cylinder towers with cone roofs and little pennants, one tall central tower. Around it: stacking-ring towers, cups full of crayons, a lying giant pencil, tumbling alphabet blocks (blank faces, no letters), spinning tops, marbles, dominoes, a big striped ball. The path is a teal ribbon running left to right across the middle; keep the front half low and open so the path is clearly visible.

LOOK: chunky low-poly 3D with visible flat facets, like an early PlayStation / Saturn game. Bold saturated colours, never pastel. Every surface in three hard flat tones (cool blue-purple shadow to the lower right, base colour, a lighter flat patch to the upper left). Clean dark outline (#14111A) around every object. Kid-friendly and cheerful.

Make ONE landscape image (1536×1024): the whole island seen from above at a 35° isometric-style angle, on plain calm blue water with a white foam line round the beach, island centred with space around it. No characters, no people, no text, letters, numbers, logos or UI.
```

### 1b. Castle
```
ASTRA REQUEST — ISLAND CONCEPT SHEET: CASTLE ISLAND (TwinForge board)

Context: "TwinForge: Toy Box Tactics" is a board-and-battle game for a 4-year-old. Its campaign map is a little 3D tabletop world: five floating low-poly islands over a calm sea, linked by wooden boardwalks on stilts. A dotted path of octagon spaces winds across each island. This sheet is a blueprint for a 3D artist, so clear shapes beat drama.

The island: a green meadow island with stepped grey-brown rock cliffs (two ledges, faceted rock faces, a grassy band between them) and a sand beach. Along the back, a raised grassy plateau with a crenellated stone curtain wall and two small round towers with blue cone roofs. Behind it, on its own taller rocky crag, the hero landmark: a square stone keep with four round corner towers (red cone roofs, gold pennants), one taller central tower with a blue roof, red and blue banners hanging on the keep's face, warm yellow lit windows. A stream starts in a small pool on the plateau and spills as a waterfall down the tier, and a second waterfall pours off the front cliff into the sea. Clusters of round leafy trees and pines, hay bales, an archery target, flower patches, grey boulders. Keep the front half low and open so the winding path is clearly visible.

LOOK: chunky low-poly 3D with visible flat facets, like an early PlayStation / Saturn game. Bold saturated colours, never pastel. Every surface in three hard flat tones (cool blue-purple shadow to the lower right, base colour, a lighter flat patch to the upper left). Clean dark outline (#14111A) around every object. Kid-friendly and cheerful.

Make ONE landscape image (1536×1024): the whole island seen from above at a 35° isometric-style angle, on plain calm blue water with a white foam line round the beach, island centred with space around it. No characters, no people, no text, letters, numbers, logos or UI.
```

### 1c. Fishing Pier
```
ASTRA REQUEST — ISLAND CONCEPT SHEET: FISHING PIER ISLAND (TwinForge board)

Context: "TwinForge: Toy Box Tactics" is a board-and-battle game for a 4-year-old. Its campaign map is a little 3D tabletop world: five floating low-poly islands over a calm sea, linked by wooden boardwalks on stilts. A dotted path of octagon spaces winds across each island. This sheet is a blueprint for a 3D artist, so clear shapes beat drama.

The island: a sunny sandy island with low sandstone cliffs and a grassy ledge band. Along the back, a raised dune with a row of colourful stilt huts (sky blue, red, yellow, green) under leaning palm trees, fishing nets drying on wooden racks, stacked crates and barrels. The hero landmark: "the Beacon", a squat eight-sided tower in alternating yellow and blue bands, a white railing gallery near the top, a round glowing lantern room, a red cone roof and a little gold fish weathervane; a small keeper's cottage beside it. Two wooden docks on posts reach out from the front beach, each with a moored rowboat, a lamp post and a life ring. Beach umbrellas, shells, rocks. Keep the front half low and open so the winding path is clearly visible.

LOOK: chunky low-poly 3D with visible flat facets, like an early PlayStation / Saturn game. Bold saturated colours, never pastel. Every surface in three hard flat tones (cool blue-purple shadow to the lower right, base colour, a lighter flat patch to the upper left). Clean dark outline (#14111A) around every object. Kid-friendly and cheerful.

Make ONE landscape image (1536×1024): the whole island seen from above at a 35° isometric-style angle, on plain calm blue water with a white foam line round the beach and a sailboat or two nearby, island centred with space around it. No characters, no people, no text, letters, numbers, logos or UI.
```

### 1d. Bog Shack
```
ASTRA REQUEST — ISLAND CONCEPT SHEET: BOG SHACK ISLAND (TwinForge board)

Context: "TwinForge: Toy Box Tactics" is a board-and-battle game for a 4-year-old. Its campaign map is a little 3D tabletop world: five floating low-poly islands over a calm sea, linked by wooden boardwalks on stilts. A dotted path of octagon spaces winds across each island. This sheet is a blueprint for a 3D artist, so clear shapes beat drama.

The island: a mossy green marsh island with dark brown earthy cliffs and a muddy beach into teal water. Along the back, a raised mossy plateau. The hero landmark on it: a big crooked wooden shack on stilts with a tilted green roof, a crooked stove pipe, a porch railing, green-glowing lanterns, a warm yellow window, steps down to the meadow and a little washing line with three coloured cloths. Swamp trees on arched mangrove roots with hanging moss, reed clumps with brown cattail tops, lily-pad pools with one pink flower, red spotted mushrooms, fallen logs. A spring pool feeds a waterfall down the plateau and another waterfall off the front cliff into the sea. Out in the shallows, two or three small stilt shacks with rowboats tied up. Cosy and funny, never creepy. Keep the front half low and open so the winding path is clearly visible.

LOOK: chunky low-poly 3D with visible flat facets, like an early PlayStation / Saturn game. Bold saturated colours, never pastel. Every surface in three hard flat tones (cool blue-purple shadow to the lower right, base colour, a lighter flat patch to the upper left). Clean dark outline (#14111A) around every object. Kid-friendly and cheerful.

Make ONE landscape image (1536×1024): the whole island seen from above at a 35° isometric-style angle, on plain calm teal water with a white foam line round the shore, island centred with space around it. No characters, no people, no text, letters, numbers, logos or UI.
```

### 1e. Haunted Forest (and the mountain behind it)
```
ASTRA REQUEST — ISLAND CONCEPT SHEET: HAUNTED FOREST ISLAND (TwinForge board)

Context: "TwinForge: Toy Box Tactics" is a board-and-battle game for a 4-year-old. Its campaign map is a little 3D tabletop world: five floating low-poly islands over a calm sea, linked by wooden boardwalks on stilts. A dotted path of octagon spaces winds across each island. This sheet is a blueprint for a 3D artist, so clear shapes beat drama.

The island: a dusky purple island at twilight, spooky-cute and friendly, NEVER scary (no skulls, no faces in trees, no blood, no sharp teeth). Dark violet rock cliffs, a lilac sand beach, deep indigo water. Along the back, a raised plateau. The hero landmark: "the Great Hollow Tree", a fat friendly old tree with a round glowing door, two small warm windows, a big rounded canopy in purple and teal, a ring of lanterns on posts and a fairy ring of glowing blue, violet and pink mushrooms. Around it: twisted dark trees with round purple and teal canopies, dark pines, glowing crystal clusters, orange pumpkins (some with a soft glow inside), fireflies. Behind the island rises a tall dark triangular mountain with a softly glowing red-orange peak (the villain's lair, shown only as a mountain; no figure on it). Keep the front half low and open so the winding path is clearly visible.

LOOK: chunky low-poly 3D with visible flat facets, like an early PlayStation / Saturn game. Bold saturated colours, never pastel. Every surface in three hard flat tones (cool blue-purple shadow to the lower right, base colour, a lighter flat patch to the upper left). Clean dark outline (#14111A) around every object. Kid-friendly, cosy and magical.

Make ONE landscape image (1536×1024): the whole island and the mountain seen from above at a 35° isometric-style angle, on calm indigo water with a soft foam line round the shore, centred with space around it. No characters, no people, no text, letters, numbers, logos or UI.
```

Where the result goes: `docs/art/board/<world>-concept.png` (reference only, not shipped), plus a rights entry (section 3).

## 2. Blender plan (landmark GLBs)

The code-built landmarks stay as the fallback forever. A Blender piece only replaces the code version of that one landmark when its GLB is present, exactly like `models.js` does for toys.

### Worth modelling (in this order)
| id | what | triangle budget (lo) | hi tier budget | why it's worth it |
|---|---|---|---|---|
| `board-keep` | Castle keep on its crag, 4 corner towers + central tower, banners | 2,500 | 12,000 | Biggest silhouette on the board; code version is all cylinders |
| `board-hollow-tree` | Great Hollow Tree with door, windows, roots, canopy | 2,500 | 12,000 | The forest centrepiece; organic shapes are hard in code |
| `board-beacon` | The Beacon (banded tower, gallery, lantern room, fish vane) + keeper's cottage | 1,800 | 8,000 | Hero of the pier; the gallery railing reads better modelled |
| `board-bog-shack` | Stilt shack with tilted roof, stove pipe, porch, steps, wash line | 1,800 | 8,000 | Crooked charm needs hand placement |
| `board-block-castle` | Toy-block castle (cubes, ramp arch, cylinder towers, pencil) | 1,500 | 6,000 | Already strong in code; model last, mainly for bevels and wood-grain facets |
| `board-mountain` | Czernobog's mountain with crags and a crater rim for the glow | 3,000 | 10,000 | Optional: replaces the single cone; must keep the summit point at y = 390 so the villain, dancers and embers still line up |

Total extra: about 13k triangles (the board already draws about 50k at the follow camera), so keep each piece at or under its budget.

`tools/blender/board_landmarks.py` builds both tiers: `build(ids, outdir, tier='lo')` is the original low-poly kit; `tier='hi'` is the mid-high detail pass (block courses, quoins, corbels, tiled roofs, plank boards, faceted rock chunks, foliage clusters, baked-in props) with the same silhouettes, palette, origins, part names, flag points and the mountain summit at z = 390. The hi tier totals about 56k triangles if all six are used, so it needs a decision on board-wide budget (or LOD switching) before it ships. Builds over budget raise instead of exporting.

### Modelling rules
- Low-poly with visible facets: flat-shaded, no subdivision, no bevel modifiers over 1 segment.
- Colour: **vertex colours or one tiny palette texture** (a 16×16 swatch PNG, nearest filtering). No baked lighting, no gradients, no normal/roughness maps; the toon shader does the lighting. Glowing parts (windows, lanterns, lantern room) go in a separate mesh named `glow_*` so the loader can give them the unlit material.
- Scale and origin: 1 Blender unit = 1 board unit. Origin at the centre of the base, base on z = 0 (exported as y = 0), front facing -Y in Blender (+z in three.js, toward the camera). Rough footprints: keep 200 × 130, Hollow Tree 140 × 120, Beacon 70 × 70 (+ cottage), bog shack 110 × 80, block castle 180 × 90.
- Names: objects `body`, `roof`, `glow_windows`, `flag_<n>` (empties where waving flags attach). No armature, no animation.
- Export: glTF 2.0 binary, +Y up, apply modifiers, no cameras/lights. Then run it through the same importer as the toys (`npm run model:import -- <id> <file.glb>` already caps triangles and compresses) or a board variant of it.
- Folder: `assets/board/<id>/<id>.glb` (a new folder, so toy models stay separate). build.mjs would list it like it lists `assets/models/`.

### How board3d.js would load them (not built yet)
1. build.mjs adds a `__BOARD_MODELS__` manifest from `assets/board/` (same pattern as `__MODELS__`).
2. A small `board-models.js` preloads the GLBs the manifest lists with the same GLTFLoader as `models.js`, keeping a `ready(id)` flag. It never blocks the board: if a file is missing or fails, nothing changes.
3. In `landmark()` (board-dress.js) each world checks `ready(id)`: if ready, it skips baking the code version and returns a `{ gltf, at }` entry instead; board3d.js clones that scene, swaps every material for `bakedMat(darkU)` (toon + gloom, colours from the vertex colours) or the unlit material for `glow_*` meshes, adds `inkModelMesh` outlines, places it at the landmark spot, and hangs waving flags on the `flag_*` empties.
4. If the GLB finishes loading after the board is built, it is used next time the board opens (no mid-game swap).
5. Tests: the e2e board check already counts a landmark per island, so it passes with or without the GLBs.

This was not built in this pass on purpose: until a GLB exists there's nothing to load, and the fallback path is the shipping path.

## 3. Rights entry for every generated asset (required)

Nothing generated goes into the repo without a rights entry. Add one row per file to `docs/ASSET_RIGHTS.md` (create it with this header the first time) in the same commit as the file:

| file | made with (tool + plan) | date | prompt / source file | made by | licence / terms checked | notes |
|---|---|---|---|---|---|---|
| `docs/art/board/castle-concept.png` | ChatGPT (Astra), Plus | 2026-10-xx | BOARD_ART_REQUESTS.md 1b | Matt Headland | OpenAI terms: output owned by user | reference only, not shipped |
| `assets/board/board-keep/board-keep.glb` | Blender 4.x (hand-modelled) | 2026-10-xx | from castle-concept.png | Matt Headland | own work | 2,380 tris |

Rules:
- One row per committed file; a replaced file gets a new row (keep the old one, mark it replaced).
- "made with" names the tool and the plan or tier used (free tiers sometimes restrict commercial use: write what the terms said on the day).
- The prompt column points at the exact prompt in this file (or pastes it if it was changed).
- No reference images from other games, films or brands are ever attached to a request or committed; concept sheets made from this pack use the text prompt only.
- Images of the real toys stay private (ASSET_PIPELINE.md); the board art never needs them.
