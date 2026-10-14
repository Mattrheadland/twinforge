# Asset pipeline

Style: STYLE_GUIDE v5 (low-poly early-3D, '80s cartoon shading). File locations and names: ASSETS.md.

## Rules
- Toy **photos stay private**: they go to Astra only, never into the repo (public) or the game.
- Finished Astra art goes into `assets/` in the repo, named per ASSETS.md. Claude Project docs can't store images.
- No known characters from films, shows or brands; those spots get original stand-ins.
- Every Astra prompt below is one self-contained message (style included) that asks for all its images at once. If Astra makes one image per reply, reply "next".

## 1. Character pack (one per toy; attach the toy's photos)
```
ASTRA REQUEST — <TOY NAME> COMPLETE CHARACTER PACK (TwinForge v5)

Context: "TwinForge: Toy Box Tactics" is a battle game for my 4-year-old starring his real toys. Each toy becomes a LOW-POLY 3D model (like a 1996 PlayStation / Sega Saturn fighting game) shaded like a 1980s action cartoon (He-Man, ThunderCats). Your images are the blueprints a 3D modeler builds from, so clarity beats drama.

The toy: <TOY NAME> — <one line: what it is>. Use the attached photos for likeness: same silhouette, proportions, colors, markings and accessories. Don't invent new details; if the photos don't show something, keep it simple.

LOOK for everything: chunky low-poly 3D action figure, visible flat facets, simple geometric parts. Bold saturated colors, never pastel. Every surface in three hard flat tones (cool blue-purple shadow toward the lower right, base color, flat lighter patch toward the upper left). Small hard white glints on shiny plastic. Clean dark outline (#14111A). Confident and heroic, kid-friendly, never scary. No letters, numbers, words or labels anywhere.

Make TWO separate images in this one reply:

IMAGE 1 — TURNAROUND (landscape, 1536×1024): the full toy shown 4 times side by side, same size, on one floor line: front view, right side view (facing right), back view, 3/4 view. Neutral standing pose, arms slightly away from the body. Face in its normal confident expression. Plain flat light-gray background (#EEEEEE). No ground shadows, scenery or other characters. Nothing cropped.

IMAGE 2 — FACE SHEET (square, 1024×1024): a 3×3 grid on plain white. Each cell shows the toy's WHOLE HEAD front-on (same head shape, colors and outline as Image 1), same size and framing in every cell, only the expression changes:
  Row 1: confident · angry/determined · happy (eyes as upside-down U arcs, relaxed brows)
  Row 2: eyes squeezed shut in surprise (being hit) · sleepy, eyes closed, relaxed brows · dizzy, spiral eyes
  Row 3: smirk · open-mouth shout · gritted teeth
Flat, clean, thick dark lines, same three-tone shading as Image 1.

If you can only make one image per reply, make IMAGE 1 now, then make IMAGE 2 when I reply "next" — without changing anything about the toy.
```

## 2. Arena pack (one per arena)
```
ASTRA REQUEST — ARENA PACK: <ARENA NAME>

Context: "TwinForge: Toy Box Tactics" is a battle game for my 4-year-old starring his real toys. The game is a 2.5D arena fighter: two toys fight side by side on a flat stage, seen from the front at toy eye level, like a 1996 PlayStation / Sega Saturn fighting game. The stage art is shaded like a 1980s action cartoon (He-Man, ThunderCats).

The arena: <one or two lines describing it>.

LOOK for every image: chunky low-poly 3D world with visible flat facets. Bold saturated colors, never pastel. Three hard flat tones per surface (cool blue-purple shadow toward the lower right, base color, a lighter patch toward the upper left). Dramatic but kid-friendly lighting: one or two clear light sources. Big simple shapes; no fine clutter or texture noise. Not scary. No characters, no people, no toys standing in the arena, no text, letters, numbers, logos or UI anywhere. No fake pixel art.

Make THREE separate images in this one reply:

IMAGE 1 — BACKDROP (landscape, 1536×1024): the back of the arena seen straight on from toy eye level: the far wall or sky and scenery. The far edge of the floor meets the backdrop at about 60% of the way down the image; below that, just a little plain floor. Keep the middle third calm and evenly lit (the fighters stand in front of it). Put the most interesting shapes toward the left and right edges. Nothing important in the top 10% or bottom 15%.

IMAGE 2 — FLOOR TEXTURE (square, 1024×1024): the arena floor seen from directly above, flat and evenly lit, SEAMLESS and tileable on all four edges. Same colors and three-tone style as Image 1. No objects, shadows or perspective.

IMAGE 3 — PROP SHEET (landscape, 1536×1024): 4 to 6 standalone props from this arena, each shown once in a clean 3/4 view, spread out with space between them on a plain flat light-gray background (#EEEEEE). Same low-poly three-tone look with a clean dark outline (#14111A). No floor, no shadows on the ground.

If you can only make one image per reply, make IMAGE 1 now, then IMAGE 2 and IMAGE 3 each time I reply "next", without changing the arena.
```

## 3. Effects & menu pack
Done (see ASSETS.md → UI and effects). To redo or extend it, ask Astra for sheets on flat #FF00FF magenta, one item per equal grid cell, no text, same style block as above.

## 4. Characters in 3D (option A)
Turnaround sheet → image-to-3D → `assets/models/<id>/<id>.glb` → loaded by `src/render3d/models.js`, which swaps in the toon shader and ink outlines, scales the toy to ~190 units, turns it to face the foe, plays its clips and falls back to the code-built toy if the file is missing or broken.

**Tool: Meshy** (meshy.ai, checked Oct 2026). Free plan: 100 credits a month, about 25 per generation; remesh, auto-rig and animation clips cost 0. Exports GLB. Auto-rig knows humanoid and four-legged bodies only. Backup: **Tripo** (rigs for creatures, fish and birds too; free plan is non-commercial and multi-view is paid).

1. Split the sheet into four clean views: `python3 scripts/split-turnaround.py <id>` → `assets/characters/<id>/views/`.
2. Meshy → Workspace → **Image to 3D** → **Multi-image**; upload front, side, back, three-quarter (or only the three-quarter view if multi-image is locked).
3. Newest model, **Remesh on**, target **≈3,000** polycount, **Quad**, texture on, PBR off. Generate; regenerate once if the silhouette is off.
4. **Animate / Rig** → auto-detect (humanoid first, then quadruped). Add one clip per action: idle, attack, hit reaction, block, roar or power-up, victory, tired. Names don't have to match; the game matches by keyword (`src/render3d/clipmap.js`), and `art.clips` in `src/data/characters.js` can pin a clip to an action.
5. Download **GLB** (all files, if it gives one per clip). Rigging failed? Download the unrigged GLB; the game still moves it with lean, squash, bob and hit flash.
6. In the repo: `npm run model:import -- <id> rex.glb [more.glb ...]` merges clips, shrinks textures to 1024 px and writes the asset. `npm run model:check -- <character>` screenshots the toy in every action into `scratch/model/` and prints the clip → action mapping and found bones.
7. Set `art.model: '<id>'` on the character. Tune `art.anchors.muzzle` (where shots start), `art.face` (eye decal) and `art.height` if needed.

**Faces.** The 3×3 faces sheets show whole heads with lighting baked in, so they can't be pasted onto a 3D head. Imported toys keep the eyes painted in their texture, or get a swappable eye decal (`art.face`) painted by the same code as the code-built toys: open, angry, happy, squint, closed, dizzy. The mouth is the jaw bone when the rig has one. For hand-painted eyes, ask Astra:
```
ASTRA REQUEST — <TOY NAME> EYE DECALS (TwinForge v5)

Same toy as the attached faces sheet. Make ONE square image (1024×1024) on flat magenta (#FF00FF): a 3×3 grid of equal cells. Each cell shows ONLY the pair of eyes (and brows/lids if the toy has them), front-on, flat colors, thick #14111A outlines, no skin, snout, helmet, shading or highlights beyond one small white glint. Same eye shapes and colors as the faces sheet, same size and spacing in every cell.
  Row 1: confident · angry/determined · happy (upside-down U arcs)
  Row 2: squeezed shut (being hit, > <) · sleepy closed · dizzy spirals
  Row 3: half-lidded smirk · wide open (shouting) · narrowed (gritting teeth)
No text, letters or numbers.
```
