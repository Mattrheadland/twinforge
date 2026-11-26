# TwinForge: Toy Box Tactics: art style guide (v5.1, 2026-10-14)

**Official poster (2026-10-15): `docs/art/official-poster.png` is the cast reference** (v2, 9:45 PM: Galactic Hunter as the space villain, Rockfish as the silver bass mech, Spooky Tree and Czernobog matched to the game, "Coming Soon v.2: Custom Toy Uploads" badge; the original is official-poster-v1.png). Crookhook, Jack-Knife and Wolfgang rigs were rebuilt to match it.

v5 replaces v1–v4; v5.1 adds the campaign board, wild creatures, giants and the learning cards. Target: **chunky 1980s action figures brought to life inside an early-3D arcade engine.** Low-poly faceted models like PS1 / Sega Saturn / Virtua Fighter-era fighters, shaded and inked like a 1980s action cartoon (He-Man, ThunderCats), on a 2.5D stage: the fight stays on a flat line, but the room has real polygon depth. The HUD stays 2D arcade (segmented bars, bitmap lettering, cabinet buttons) with CRT scanlines on top. Motion is modern: 60 fps, eased lunges, squash and stretch, shake, hit-stop, particles. Still made for a 4-year-old: tough, never scary.

## How it's built
- **3D engine:** three.js (WebGL) renders the toys and the stage. The battle logic is unchanged. Toys are posed by the same values as before (arm swings, lean, squash, head bob, face), and their 3D positions are projected so hit effects, words and status icons land on the right spot.
- **Layers, back to front:** 3D scene → 2D effects layer (impact bursts, POW words, shields, dizzy stars, "!" bubble, turn arrow) → HTML HUD → CRT overlay.
- **Retro resolution:** the 3D scene renders about **400 pixels tall** and scales up with hard pixels, for an early-3D arcade crunch. Grown-ups can switch it off under Comfort → "Retro resolution" for a sharp image.
- **Fallback:** if a device can't run WebGL, the game falls back to the v4 2D renderer automatically.

## Geometry
- **Low-poly on purpose:** boxes, low-segment spheres (8–10 sides), icosahedrons, 4–8-sided cones and cylinders. Facets should be visible. A code-built toy is roughly 300–800 triangles; an imported model (image-to-3D) up to about 6,000.
- **Faceted shading:** every polygon is lit flat (normals come from the face, not smoothed), so curved parts read as clean facets.
- **Toy scale:** about 190 units tall, feet at y = 0, facing +x. In battle, toys turn about 50° toward the camera (3/4 view). The opponent is a mirror image.
- **Faces** are textures painted onto the model (a screen for robots, a decal on the head and snout for creatures). They switch expression live: open, angry, happy, squint, closed, dizzy swirl; mouths smile, open, grit, o, flat.

## Shading: '80s cartoon logic on polygons
- **Bold, saturated base colors.** Unmixed primaries and secondaries, never pastel or airbrushed.
- **Three hard steps per surface:** cool shadow (base color multiplied toward **#3A2F5B**), base, and a flat lighter patch. Sharp, unblended edges. Light comes from the upper left, so shadows fall to the lower right.
- **Hard glints:** shiny plastic and metal get small hard white glints (a facet that catches the light turns pure white). Matte parts get none.
- **Ink outlines:** dark **#14111A** outlines around every toy and prop silhouette (an inverted-hull outline). Toys about 3 units thick, props about 1.6, big foreground props about 2.4. Floor and walls have none.
- **Hit flash:** a struck toy flashes toward white for a moment.
- **Imported models** use the same shader with their texture as the base color, slightly posterized and saturated so baked gradients read as flat paint, plus the same ink outline (`modelMat` / `inkModelMesh` in toon.js).
- Unlit (always full-bright) only for things that glow: the lamp shade, the moon and sky, robot screens.

## Color
Toys keep their own colors. Shared palette:

| Name | Hex | Use |
|---|---|---|
| Hero red | #D7263D | impacts, curtains, player 1 accents |
| Blaze orange | #F46036 | fire, energy, aura |
| Gold | #FFC914 | stars, trims, win effects, lettering |
| Turtle green | #2E9E44 | nature, heal |
| Hero blue | #1B4FD8 | player 2 accents, shields |
| Sky | #4EA8DE | ice, robot heads |
| Royal purple | #6A3FA0 | specials, wainscot, toy chest |
| Teal | #1F8A8A | rug, tech |
| Ink | #14111A | all outlines |
| Cool shadow tint | #3A2F5B | shadow multiply |

## Wild creatures (campaign minions)
- Cheap on purpose: one builder each in `minion-rigs.js`, about two dozen boxes, cones and low spheres, one painted-eye decal. No sheets or image-to-3D needed.
- Built about 120–150 units tall (smaller than the main toys), shown at 1.2× in battle.
- Each fits its boss's lore: Rexlet (baby Rex), Spooky Sprout (walking stump), Rock Minnow, Little Squire, Bog Frog, Sneaky Squirrel (Remy's backyard rival), Bubble Crab, and Czernobog's night crew, who dance on his mountaintop like ink spilled in moonlight (Matt's mountaintop reference): lanky silhouettes with crooked bent knees and elbows, long spread claw fingers, arms flung about in a wild dance. Shadow Imp (inky indigo, swept-back horns, glowing pink eyes, a grin, a whip tail) and Jitterbones (chunky rounded skeleton in a purple bow tie, arms flung over its head). Spooky-cute, never scary: no skulls with teeth bared at the camera, no gore. Our own designs only: no known game or film characters.

## Giants
A boss at the end of a tournament or a campaign world is a GIANT: the same toy at 1.22× (a giant wild creature at 1.6×), more health, a crown on the VS screen.

## Campaign board (diorama)
- A little 3D tabletop world, not a flat map: one chunky low-poly island per world over calm blue water. v6 detail pass: each island has stepped faceted cliffs (rim ink band, cliff, a ledge band, lower cliff), a beach with a white foam line and pale shallows, a raised back tier carrying the world's landmark, and dense themed dressing behind the path (low props only in front, so the path always reads). Arched wooden boardwalks on stilts link the islands along the path; waterfalls (castle, bog) spill off the tier and the front cliff; islets, sea stacks, buoys and drifting boats dot the sea.
- Landmarks (our own designs): Bedroom — a toy-block castle on a book-spine shelf; Castle — the keep on its crag with a curtain wall; Fishing Pier — the Beacon (banded octagonal tower, gallery, lantern room, fish vane) and two docks; Bog Shack — a crooked stilt shack plus little stilt shacks in the shallows; Haunted Forest — the Great Hollow Tree (round glowing door, lantern ring, mushroom fairy ring), spooky-cute, never scary.
- Board dressing is baked: many pieces per island in one vertex-coloured toon mesh plus one ink hull per slice (`board-kit.js`); tiny pieces get no outline.
- Island tops: Bedroom warm wood, Castle green, Fishing Pier sand, Bog Shack mossy green, Haunted Forest dusky purple. Sky and water darken toward the forest.
- Spaces are octagon discs with a flat icon on top: fight red, star yellow, lucky green (dice), boss purple (crown, bigger), start white (house). Cleared spaces dim and show a green check.
- The hero's real 3D toy is the game piece at half size and hops along a dotted pebble path. Foes stand on their spaces as flat "cardboard standee" snapshots that face the camera; giants are bigger.
- Czernobog's dark mountain (now on a craggy base) with a glowing peak behind the last space.
- Same toon shader and ink outlines as the battle. The camera looks down at about 35° and follows the piece.

## Learning cards
- A cream card with a thick ink border, centered over the dimmed battle; picture first, a small grown-up line on top that the phone reads aloud (speaker button top right).
- Pictures are emoji, chosen so the picture is named the way the answer expects. Numbers, letters and words use the upright rounded font.
- Answer buttons: three big colored circles (letters in rounded squares, words in pills). Wrong: the button shakes and drops away. Second wrong: only the right one is left, glowing yellow.
- Number pieces: cream number tiles, purple "?" tiles, dice-face dots for quick look, blue ten-frames for teen numbers; letter slots for missing letters and spelling (dashed when empty, green when filled).

## Arenas
Each arena is a painted backdrop plane behind a 3D floor (seamless floor texture) with a few 3D props at the sides, so the fight still has depth. Art: `assets/arenas/` (see ASSETS.md).

## Stage (Bedroom Block Fortress)
Low-poly bedroom at dusk: faceted wooden floorboards, blue-violet striped wallpaper over a purple wainscot with a gold trim, a window with a moon and city silhouette, pleated red curtains, shelves with books, a ball, a toy rocket and a rubber duck, a toy chest with a teddy bear on it, a nightstand with a glowing lamp, a block fortress with flags, and a big teal rug that marks the arena. Big foreground blocks frame the bottom corners. The teddy and the duck bob along and jump when a big hit shakes the room.

## Effects and HUD (2D, unchanged from v4)
- Effects: inked impact starbursts, speed lines, dust puffs, shield shells, dizzy stars, flame-ray aura (the aura is a 3D layer behind the toy).
- Lettering: hand-made 5×7 bitmap font with three color bands, ink outline and hard drop shadow.
- HUD: segmented yellow health bars meeting at a K.O. badge, corner portraits (rendered from the 3D models), names under the bars, arcade-cabinet buttons. ROUND 1 → FIGHT! before each battle.
- CRT: scanlines and a slight glow, on by default (Comfort → "TV look").
- Numbers and letters in the learning challenges stay in the upright rounded font, so a 4-year-old reads the shapes cleanly.

## Code map
`src/render3d/toon.js` (shader and outlines) · `src/render3d/rigs.js` (code-built toys and faces) · `src/render3d/models.js` (imported GLB toys) · `src/render3d/clipmap.js` (clip → action) · `src/render3d/family-rigs.js` (Remy Roo, Billy Bass) · `src/render3d/room.js` (stage) · `src/render3d/stage3d.js` (camera, layers, projection, portraits) · `src/render3d/minion-rigs.js` (wild creatures) · `src/render3d/board3d.js` (campaign diorama; layout in `board-layout.js`, terrain in `board-terrain.js`, props and landmarks in `board-dress.js`, baking in `board-kit.js`) · `src/ui/challenge.js` (learning cards) · `src/render/` (2D effects, lettering and the 2D fallback).
