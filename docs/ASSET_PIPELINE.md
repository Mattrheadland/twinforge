# Asset pipeline: toy photos → Astra → game

Loop: Claude writes the request → Matt sends it plus references to Astra → Astra generates → Matt approves and sends the files back → Claude checks size, alpha, anchor and fit, then wires them in. Placeholders stay in place until real art passes the checks.

Toy **photos stay private**. They go to Astra only as references and never into the game repo, which is public.

Style: **STYLE_GUIDE v2** (early-'90s Saturday-morning action cartoon). Any v1 art is superseded.

## 0. Style test (do this once, before any toy)
Astra has already seen the v1 setup in its chat, so start a **fresh Astra chat** for v2. Otherwise the soft v1 look tends to leak back in.

Send the one-time setup message first:
```
We're making art for "TwinForge: Toy Box Tactics," a turn-based battle game for my 4-year-old starring his real toys. Every image in this project uses one locked style: an early-1990s American Saturday-morning action cartoon, hand-inked animation cels over painted backgrounds.

CHARACTERS (the cels): near-black ink lines (#14111A) with brush-pen weight — heavy on the outer silhouette and shadow side, thin on interior detail, tapered ends. Flat color with a HARD-EDGED shadow shape on every surface (about a third of each form), light from the upper left. Shadows shift cool toward blue-violet rather than just darker. A third, darker tone only in deep creases. Hard-edged white glints on shiny plastic, a thin hard rim light on the right-hand edge. No gradients, airbrush or texture on characters. Saturated, slightly deep comic-book colors, never pastel. Attitude: confident and heroic — furrowed brows, determined grins, strong stances — but always kid-friendly, never scary or violent.

BACKGROUNDS: painted gouache style with soft gradients, airbrushed glows and dramatic lighting, little or no line work, so the inked characters pop in front.

Toys must stay recognizable as the real toy: same silhouette, face, proportions, colors, markings and accessories. Never add letters, numbers or words to any image. I'll send requests one at a time. Don't generate anything yet. Just reply "Ready."
```

Then the style test (uses a made-up toy so we judge the look, not the likeness):
```
ASTRA ASSET REQUEST — STYLE-TEST v2
Purpose: lock the TwinForge v2 look before we draw any real toys. Judge only the style.
Draw ONE landscape image (1536 × 1024 if available): an original, made-up chunky plastic toy robot (boxy body, round head with a visor, one antenna, red and blue with silver joints) shown twice at the same size, standing on the floor of a painted night-time kid's bedroom.
  Left: idle pose, facing right, arms relaxed, confident half-smile.
  Right: attack pose, lunging to the right with a punch coming toward the viewer's right, gritted determined grin, with a wordless cel-style impact starburst at its fist.
Characters in the locked cel style (heavy tapered #14111A ink, hard cool shadows, sharp glints, rim light on the right edge). Background painted, soft, moonlit, with a warm lamp glow, almost no outlines.
Do not: add any text, letters, numbers, logos, "POW"-style words, UI, or other characters.
```
What to look for: thick black silhouette line, obvious hard shadow shapes, background clearly softer than the robots. If it still looks soft or pastel, reply to Astra with "heavier ink, harder and bigger shadows, deeper colors" and regenerate. Approve one image as **STYLE-TEST v2** and attach it to every later request as the style reference.

## 1. Photos per toy
Front, back, left side, right side, 3/4 view, close-ups of the face and any accessory. Plain background, daylight, no flash, the whole toy in frame. A ruler or hand in one shot helps with scale.

## 2. Reference plate (one per toy, approve before poses)
One plate request per toy, one toy per message, with that toy's photos and the approved STYLE-TEST v2 attached.

```
ASTRA ASSET REQUEST — <TOY NAME> reference plate v2
Purpose: master reference for this toy in TwinForge. All later game art is drawn from this, so accuracy matters more than flair.
References: the attached photos of the real toy (for likeness) and the approved STYLE-TEST v2 image (for style only).
Before drawing, list in 3–6 short bullets the details you must keep (shape, face, colors, markings, accessories) and anything the photos don't show that you'll have to guess.
Then draw ONE landscape image: the same toy shown 4 times side by side at the same size, all standing on one invisible floor line: front view, 3/4 view facing right, right side view, back view. Neutral heroic standing pose, confident expression. Plain flat light gray background (#EEEEEE).
Style: the locked TwinForge v2 cel style, matching STYLE-TEST v2 (heavy tapered #14111A ink, hard-edged cool shadows, sharp glints, thin rim light on the right edge, saturated colors).
Do not: add text, labels, numbers, logos, color swatches, a floor, shadows on the ground, scenery or other characters. Do not crop any part of the toy (check ears, tails, horns, wheels, capes, weapons).
If anything is unclear in the photos, keep it simple and true to the toy rather than inventing new details.
```

## 3. Battle poses (after the plate is approved)
One request per toy; Astra can return the poses one at a time.

```
ASTRA ASSET REQUEST — <TOY-ID>-POSES v2 (production assets)
Purpose: in-game sprites for "<NAME>". Reference: the APPROVED plate <TOY-ID>-PLATE v2 (attached). Match it exactly: same colors, proportions, ink weight and shadow shapes.
Style: TwinForge v2 cel style (heavy tapered #14111A ink, hard cool shadows, sharp glints, rim light on the right edge). Slightly low, heroic camera.
Canvas for EVERY image: 1024 × 1024 px, transparent background (if transparency is impossible: flat #FF00FF magenta). Toy faces RIGHT in a slight 3/4 view. Feet on an invisible floor line at y = 960, centered at x = 512. Toy height ≈ 820 px in idle; same scale in all poses. ≥ 40 px margin on every side. No cast shadow, no floor, no effects, no text.
Poses (one PNG each):
  idle — ready stance, weight slightly forward, confident half-smile
  attack — powerful lunge to the right, strong diagonal, fist/head/front foreshortened toward the right, gritted determined grin
  defend — braced low, arms/front raised to block, eyes narrowed and focused
  hurt — knocked back to the LEFT, eyes squeezed, mouth open in surprise (cartoon, no injury)
  victory — fist pumped high or a hero leap, big triumphant grin
  tired — sitting down, slumped, eyes closed, dizzy-sleepy (used when it loses; not hurt)
  portrait — head and shoulders only, centered, facing right, determined look, same canvas
Files: <toy-id>_<pose>_v2.png
Acceptance: same toy in every pose; nothing cropped (check ears, tails, antennas, accessories); same scale and floor line; clean transparent edges; no text or shadows.
```

## 4. Effects (once, shared by all toys)
```
ASTRA ASSET REQUEST — FX v2 (production assets)
Reference: the approved STYLE-TEST v2.
Draw each as its own PNG, 512 × 512, transparent background (or flat #FF00FF), centered, ≥ 24 px margin, in the cel style (heavy #14111A ink, flat color, hard glints):
  fx_impact — jagged starburst, red #D7263D and gold #FFC914
  fx_speed — burst of speed lines radiating from the left edge toward the right
  fx_shield — round energy shield flash, hero blue #1B4FD8 and sky #4EA8DE
  fx_special — swirling energy ring, royal purple #6A3FA0 with gold sparks
  fx_dust — small cartoon dust puff, warm gray
  fx_stars — three small dizzy stars in a loose ring
No text, letters or "POW"-style words anywhere.
Files: <name>_v2.png
```
Until these arrive, the game draws code versions of the same effects (impact starbursts, speed lines, dust puffs, shield shell) in `src/render/fx.js` and `src/render/fighter.js`.

## 5. Wiring a toy in (Claude does this)
In `src/data/characters.js`, the toy's `art` changes from `procedural` to sprites:

```js
art: {
  kind: 'sprites',
  height: 200,            // world units the 1024 canvas maps to
  anchor: [0.5, 0.9375],  // 960 / 1024 = feet line
  poses: { idle: 'assets/chars/luca-dino/luca-dino_idle_v2.png', attack: '…', defend: '…', hurt: '…', victory: '…', tired: '…' },
  portrait: 'assets/chars/luca-dino/luca-dino_portrait_v2.png',
},
```
Name, hearts, punch, special move and shield look are set in the same file.
