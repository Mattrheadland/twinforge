# Asset pipeline: toy photos → Astra → game

Loop: Claude writes the request → Matt sends it plus references to Astra → Astra generates → Matt approves and sends the files back → Claude checks size, alpha, anchor and fit, then wires them in. Placeholders stay in place until real art passes the checks.

Toy **photos stay private**. They go to Astra only as references and never into the game repo, which is public.

Style: **STYLE_GUIDE v4** ('80s 8-bit look, modern motion). Any earlier art is superseded. The game snaps all art to its own pixel grid and palette, so Astra draws clean, bold, flat art and never fakes pixel art.

## 0. Style test (do this once, before any toy)
Astra has already seen older setups in its chat, so start a **fresh Astra chat** for v4. Otherwise the earlier looks leak back in.

Send the one-time setup message first:
```
We're making art for "TwinForge: Toy Box Tactics," a turn-based battle game for my 4-year-old starring his real toys. The game has an 1980s 8-bit arcade look (think 1985–1989 arcade and console fighters). My game engine turns every image into chunky pixels with a small fixed palette, so I need clean source art that survives that.

CHARACTERS: big, bold, simple shapes. An even dark outline (#14111A) around the whole silhouette, few interior lines. Every surface in exactly THREE flat tones with hard edges (shadow, base, light), light from the upper left. Flat saturated colors, about 4–6 colors per toy plus the outline. One small hard white glint on shiny plastic. No gradients, airbrush, soft glow, texture or fine detail. The game shrinks each character to about 90 pixels tall, so the face and eyes must be oversized and readable. Attitude: confident 1980s fighter (determined brows, smirk or gritted teeth, squared ready stance) but kid-friendly, never scary or violent.

IMPORTANT: do NOT draw fake pixel art or a visible pixel grid. Draw clean, crisp, flat art; the game pixelates it.

STAGES: simple, bold shapes with strong lighting, little or no outline, a clear open floor in the lower middle, no characters or crowd.

Toys must stay recognizable as the real toy: same silhouette, face, proportions, colors, markings and accessories. Never add letters, numbers or words to any image. I'll send requests one at a time. Don't generate anything yet. Just reply "Ready."
```

Then the style test (uses a made-up toy so we judge the look, not the likeness):
```
ASTRA ASSET REQUEST — STYLE-TEST v4
Purpose: lock the TwinForge v4 look before we draw any real toys. Judge only the style.
Draw ONE landscape image (1536 × 1024 if available): an original, made-up chunky plastic toy robot (boxy body, round head with a visor, one antenna, red and blue with silver joints) shown twice at the same size, standing on the floor of a kid's bedroom at night.
  Left: idle fighting stance, facing right, fists up, confident smirk.
  Right: attack pose, lunging to the right with a punch toward the viewer's right, gritted determined grin, with a wordless impact starburst at its fist.
Robots: even dark #14111A outline, exactly three hard flat tones per surface, oversized readable face, no gradients, no fine detail. Background: simple bold shapes, moonlit with a warm lamp glow, almost no outlines. No fake pixel grid.
Do not: add any text, letters, numbers, logos, "POW"-style words, UI, health bars, or other characters.
```
What to look for: thick clean outline, three clearly separate flat tones on the robots, big simple shapes. Shrink the image so the robots are about 90 px tall: if the face and fists still read, it passes. If it looks detailed or airbrushed, reply to Astra with "simpler and bolder: three flat tones per surface, bigger face, no gradients, no small details" and regenerate. Approve one image as **STYLE-TEST v4** and attach it to every later request as the style reference. Send it to Claude too, to check it through the game's pixel grid and palette before you lock it.

## 1. Photos per toy
Front, back, left side, right side, 3/4 view, close-ups of the face and any accessory. Plain background, daylight, no flash, the whole toy in frame. A ruler or hand in one shot helps with scale.

## 2. Reference plate (one per toy, approve before poses)
One plate request per toy, one toy per message, with that toy's photos and the approved STYLE-TEST v4 attached.

```
ASTRA ASSET REQUEST — <TOY NAME> reference plate v4
Purpose: master reference for this toy in TwinForge. All later game art is drawn from this, so accuracy matters more than flair.
References: the attached photos of the real toy (for likeness) and the approved STYLE-TEST v4 image (for style only).
Before drawing, list in 3–6 short bullets the details you must keep (shape, face, colors, markings, accessories) and anything the photos don't show that you'll have to guess.
Then draw ONE landscape image: the same toy shown 4 times side by side at the same size, all standing on one invisible floor line: front view, 3/4 view facing right, right side view, back view. Neutral fighting-ready standing pose, confident expression. Plain flat light gray background (#EEEEEE).
Style: the locked TwinForge v4 style, matching STYLE-TEST v4 (even dark #14111A outline, three hard flat tones per surface, big simple shapes, oversized readable face, no gradients, no fake pixel grid).
Do not: add text, labels, numbers, logos, color swatches, a floor, shadows on the ground, scenery or other characters. Do not crop any part of the toy (check ears, tails, horns, wheels, capes, weapons).
If anything is unclear in the photos, keep it simple and true to the toy rather than inventing new details.
```

## 3. Battle poses (after the plate is approved)
One request per toy; Astra can return the poses one at a time.

```
ASTRA ASSET REQUEST — <TOY-ID>-POSES v4 (production assets)
Purpose: in-game sprites for "<NAME>". Reference: the APPROVED plate <TOY-ID>-PLATE v4 (attached). Match it exactly: same colors, proportions, outline weight and tones.
Style: TwinForge v4 (even dark #14111A outline, three hard flat tones per surface, big simple shapes, no gradients, no fine detail, no fake pixel grid). Slightly low, heroic camera. Must read when shrunk to about 90 px tall.
Canvas for EVERY image: 1024 × 1024 px, transparent background (if transparency is impossible: flat #FF00FF magenta). Toy faces RIGHT in a slight 3/4 view. Feet on an invisible floor line at y = 960, centered at x = 512. Toy height ≈ 820 px in idle; same scale in all poses. ≥ 40 px margin on every side. No cast shadow, no floor, no effects, no text.
Poses (one PNG each):
  idle — fighting stance, fists or front raised, weight slightly forward, confident smirk
  attack — powerful lunge to the right, strong diagonal, fist/head/front foreshortened toward the right, gritted determined grin
  defend — braced low, arms/front raised to block, eyes narrowed and focused
  hurt — knocked back to the LEFT, eyes squeezed, mouth open in surprise (cartoon, no injury)
  victory — fist pumped high or a hero leap, big triumphant grin
  tired — sitting down, slumped, eyes closed, dizzy-sleepy (used when it loses; not hurt)
  portrait — head and shoulders only, centered, facing right, determined look, same canvas
Files: <toy-id>_<pose>_v4.png
Acceptance: same toy in every pose; nothing cropped (check ears, tails, antennas, accessories); same scale and floor line; clean transparent edges; no text or shadows.
```

## 4. Effects (once, shared by all toys)
```
ASTRA ASSET REQUEST — FX v4 (production assets)
Reference: the approved STYLE-TEST v4.
Draw each as its own PNG, 512 × 512, transparent background (or flat #FF00FF), centered, ≥ 24 px margin, in the v4 style (dark #14111A outline, two or three flat tones, hard glints, big simple shapes, no fake pixel grid):
  fx_impact — jagged starburst, red #D7263D and gold #FFC914
  fx_speed — burst of speed lines radiating from the left edge toward the right
  fx_shield — round energy shield flash, hero blue #1B4FD8 and sky #4EA8DE
  fx_special — swirling energy ring, royal purple #6A3FA0 with gold sparks
  fx_dust — small cartoon dust puff, warm gray
  fx_stars — three small dizzy stars in a loose ring
No text, letters or "POW"-style words anywhere.
Files: <name>_v4.png
```
Until these arrive, the game draws code versions of the same effects (impact starbursts, speed lines, dust puffs, shield shell) in `src/render/fx.js` and `src/render/fighter.js`.

## 5. Wiring a toy in (Claude does this)
In `src/data/characters.js`, the toy's `art` changes from `procedural` to sprites:

```js
art: {
  kind: 'sprites',
  height: 200,            // world units the 1024 canvas maps to
  anchor: [0.5, 0.9375],  // 960 / 1024 = feet line
  poses: { idle: 'assets/chars/luca-dino/luca-dino_idle_v4.png', attack: '…', defend: '…', hurt: '…', victory: '…', tired: '…' },
  portrait: 'assets/chars/luca-dino/luca-dino_portrait_v4.png',
},
```
Name, hearts, punch, special move and shield look are set in the same file.
