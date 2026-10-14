# Asset pipeline: toy photos → reference art → 3D toy

Style: **STYLE_GUIDE v5** (low-poly early-3D toys with '80s cartoon shading). Earlier pipelines are superseded.

## What changed in v5
The game now renders toys as **3D models**. Image generators like Astra can't produce game-ready 3D models, so the work splits like this:

| Who | Makes | Used for |
|---|---|---|
| Matt | Photos of the real toy | Likeness (private, never in the repo) |
| Astra | A **turnaround sheet** (front, side, back, 3/4) in the v5 look | The blueprint Claude models from |
| Astra | A **face sheet** (the toy's eyes and mouth in each expression, flat on white) | Painted onto the model's face |
| Claude | The low-poly model, rig, face textures and stats, built in code | The toy in the game |

Captain Blocko and Stompy were built this way (without Astra) and show the target level of detail.

Toy **photos stay private**. They go to Astra only as references and never into the game repo, which is public.

Loop per toy: photos → Astra turnaround → Matt approves → Astra face sheet → Matt sends both to Claude → Claude builds the model and sends screenshots → Matt approves or asks for changes.

## 0. One-time Astra setup (fresh chat)
Start a **fresh Astra chat** so the older looks don't leak in, and send:
```
We're making reference art for "TwinForge: Toy Box Tactics," a battle game for my 4-year-old starring his real toys. The game shows each toy as a LOW-POLY 3D model (like a 1996 PlayStation or Sega Saturn fighting game) shaded like a 1980s action cartoon such as He-Man or ThunderCats. Your images are blueprints a 3D modeler builds from, so clarity beats drama.

LOOK: the toy as a chunky low-poly 3D action figure: visible flat facets, simple geometric parts (boxes, faceted spheres, cones, cylinders). Bold saturated colors, never pastel. Every surface in three hard flat tones (cool blue-purple shadow toward the lower right, base color, a flat lighter patch toward the upper left). Small hard white glints on shiny plastic. A clean dark outline (#14111A) around the silhouette. Attitude: confident and heroic, kid-friendly, never scary.

Keep the toy recognizable: same silhouette, proportions, colors, markings and accessories as the real toy. Never add letters, numbers or words. Plain flat light-gray background. I'll send requests one at a time. Don't draw anything yet; just reply "Ready."
```

## 0b. Style test (once, before any real toy)
```
ASTRA REQUEST — STYLE-TEST v5
Purpose: lock the look before we draw any real toys. Judge only the style.
Draw ONE landscape image (1536 × 1024 if available): an original, made-up chunky toy robot (boxy body, box head with a dark face screen, one antenna with a ball on top, red body, blue arms and legs, yellow fists) shown twice at the same size as a low-poly 3D action figure in the locked look, standing on a faceted wooden floor.
  Left: front 3/4 view, idle fighting stance, fists up.
  Right: side view facing right, punching forward.
Visible flat facets, three hard flat tones per surface, small hard white glints, clean dark outline. Plain light-gray background behind the floor.
Do not: add text, letters, numbers, logos, UI, or other characters.
```
What to look for: it should read as a simple polygon model (flat facets, hard tone steps, dark outline), not a smooth painting or a detailed render. If it comes back too detailed or soft, reply: "simpler and blockier: fewer polygons, three flat tones per surface, no gradients, thicker outline." Send the approved image to Claude before moving on.

## 1. Photos per toy
Front, back, left side, right side, 3/4 view, top, and close-ups of the face and any accessory. Plain background, daylight, no flash, the whole toy in frame. A ruler or hand in one shot helps with scale.

## 2. Turnaround sheet (one per toy)
```
ASTRA REQUEST — <TOY NAME> TURNAROUND v5
References: the attached photos of the real toy.
First, list in 3–6 short bullets the details you must keep (shape, face, colors, markings, accessories) and anything the photos don't show that you'll have to guess.
Then draw ONE landscape image: the same toy as a low-poly 3D action figure in the locked look, shown 4 times side by side at the same size on one floor line: front view, right side view (facing right), back view, 3/4 view. Neutral standing pose, arms slightly away from the body so their shape is clear. Plain flat light-gray background (#EEEEEE).
Do not: add text, labels, numbers, color swatches, scenery, shadows on the ground or other characters. Don't crop any part (check ears, tails, horns, wheels, capes, weapons).
```
What to look for: the same toy in all four views, clear simple shapes, colors that match the real toy.

## 3. Face sheet (after the turnaround is approved)
```
ASTRA REQUEST — <TOY NAME> FACE SHEET v5
Reference: the approved <TOY NAME> TURNAROUND v5.
Draw ONLY the toy's eyes and mouth, flat and front-on, as a 3×3 grid on plain white, each cell the same size and framing. Flat cartoon style, thick dark #14111A lines, no shading, no rest of the head.
  Row 1: eyes open (confident) · eyes angry (determined, brows down at the inner ends) · eyes happy (upside-down U arcs)
  Row 2: eyes squeezed shut in surprise · eyes closed (sleepy) · eyes dizzy (spirals)
  Row 3: mouth smirk · mouth open shout · mouth gritted teeth
Do not: add text, numbers or labels.
```

## 4. Building the toy (Claude)
Claude models the toy from the turnaround in `src/render3d/rigs.js` (low-poly parts, shoulder and head pivots, face texture from the face sheet), registers it in `src/data/characters.js` with `art: { kind: 'procedural', draw: '<toy-id>' }`, sets name, hearts, punch, special move and shield look, then sends screenshots of idle, attack, hurt, victory and tired poses for approval.

## Not needed any more
Stage paintings and pose sprites: the stage and all poses are 3D now. The old FX sprite request is optional (the game draws its own effects).
