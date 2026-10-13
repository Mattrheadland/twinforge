# Asset pipeline: toy photos → Astra → game

Loop: Claude writes the request → Matt sends it plus references to Astra → Astra generates → Matt approves and sends the files back → Claude checks size, alpha, anchor and fit, then wires them in. Placeholders stay in place until real art passes the checks.

Toy **photos stay private**. They go to Astra only as references and never into the game repo, which is public.

## 1. Photos per toy
Front, back, left side, right side, 3/4 view, close-ups of the face and any accessory. Plain background, daylight, no flash, the whole toy in frame. A ruler or hand in one shot helps with scale.

## 2. Reference plate (one per toy, approve before poses)
Send the one-time setup message to Astra first, then one plate request per toy (one toy per message, with that toy's photos attached).

One-time setup:
```
We're making character art for "TwinForge: Toy Box Tactics," a kids' turn-based battle game starring my son's real toys. For every image in this project, use one locked style: crisp 2D toy illustration; one dark outline in deep ink purple (#1D1530) on every shape, same even weight everywhere; flat colors with ONE cel-shade band per surface, light from the upper left; one small soft highlight on big surfaces; no gradients, textures, painterly strokes, or realistic rendering. Toys must stay recognizable as the real toy: same silhouette, face, proportions, colors, markings and accessories, just cleaner and slightly brighter. Friendly and playful, never scary. I'll send one toy at a time with photos. Don't generate anything yet. Just reply "Ready."
```

Per toy:
```
ASTRA ASSET REQUEST — <TOY NAME> reference plate v1
Purpose: master reference for this toy in TwinForge. All later game art will be drawn from this, so accuracy matters more than flair.
References: the attached photos of the real toy.
Before drawing, list in 3–6 short bullets the details you must keep (shape, face, colors, markings, accessories) and anything the photos don't show that you'll have to guess.
Then draw ONE landscape image: the same toy shown 4 times side by side at the same size, all standing on one invisible floor line: front view, 3/4 view facing right, right side view, back view. Neutral standing pose, friendly expression. Plain flat light gray background (#EEEEEE).
Style: the locked TwinForge style (dark #1D1530 outline, flat color, one cel-shade band, light from upper left).
Do not: add text, labels, numbers, logos, color swatches, a floor, shadows, scenery or other characters. Do not crop any part of the toy (check ears, tails, horns, wheels, capes, weapons).
If anything is unclear in the photos, keep it simple and true to the toy rather than inventing new details.
```

## 3. Battle poses (after the plate is approved)
One request per toy; Astra can return the poses one at a time.

```
ASTRA ASSET REQUEST — <TOY-ID>-POSES v1 (production assets)
Purpose: in-game sprites for "<NAME>". Reference: the APPROVED plate <TOY-ID>-PLATE v1 (attached). Match it exactly: same colors, proportions, outline weight and shading.
Style: same as the plate (dark outline #1D1530, flat color, one cel-shade band, light from upper left).
Canvas for EVERY image: 1024 × 1024 px, transparent background (if transparency is impossible: flat #FF00FF magenta). Toy faces RIGHT in a slight 3/4 view. Feet on an invisible floor line at y = 960, centered at x = 512. Toy height ≈ 820 px in idle; same scale in all poses. ≥ 40 px margin on every side. No cast shadow, no floor, no effects, no text.
Poses (one PNG each):
  idle — relaxed, standing, friendly face
  attack — mid-lunge toward the right, punching or bumping forward, determined face
  defend — braced, arms/front raised to block, eyes focused
  hurt — recoiling to the LEFT, squinting, surprised (cartoon, no injury)
  victory — jumping or arms up, big happy face
  tired — sitting down, eyes closed, sleepy (used when it loses; not hurt)
  portrait — head and shoulders only, centered, facing right, same canvas
Files: <toy-id>_<pose>_v1.png
Acceptance: same toy in every pose; nothing cropped (check ears, tails, antennas, accessories); same scale and floor line; clean transparent edges; no text or shadows.
```

## 4. Wiring a toy in (Claude does this)
In `src/data/characters.js`, the toy's `art` changes from `procedural` to sprites:

```js
art: {
  kind: 'sprites',
  height: 200,            // world units the 1024 canvas maps to
  anchor: [0.5, 0.9375],  // 960 / 1024 = feet line
  poses: { idle: 'assets/chars/luca-dino/luca-dino_idle_v1.png', attack: '…', defend: '…', hurt: '…', victory: '…', tired: '…' },
  portrait: 'assets/chars/luca-dino/luca-dino_portrait_v1.png',
},
```
Name, hearts, punch, special move and shield look are set in the same file.
