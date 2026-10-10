# Asset pipeline: toy photos → Astra → game

Loop: Claude writes the request → Matt sends it plus references to Astra → Astra generates → Matt approves and sends the files back → Claude checks size, alpha, anchor and fit, then wires them in. Placeholders stay in place until real art passes the checks.

Toy **photos stay private**. They go to Astra only as references and never into the game repo, which is public.

## 1. Photos per toy
Front, back, left side, right side, 3/4 view, close-ups of the face and any accessory. Plain background, daylight, no flash, the whole toy in frame. A ruler or hand in one shot helps with scale.

## 2. Reference plate (one per toy, approve before poses)
Paste into Astra with the photos attached:

```
ASTRA ASSET REQUEST — <TOY-ID>-PLATE v1 (reference plate, not a game asset)
Purpose: master look for Luca's toy "<NAME>" in Toy Box Battleground. Everything later is drawn from this.
References: the attached photos of the real toy.
Style (must follow): crisp 2D toy illustration; one dark outline #1D1530 on every shape, even weight; flat colors with ONE cel-shade band per surface, light from the upper left; one small soft highlight per large surface; no gradients, textures or painterly strokes. Keep the toy's exact silhouette, face, proportions, colors and accessories: <LIST THE MUST-KEEP DETAILS>.
Layout: one landscape sheet showing the same toy 4 times at the same scale, standing on one invisible floor line: front, 3/4 facing right, right side, back. Plain light gray background (#EEEEEE). Neutral idle pose, friendly expression.
Do not: add text, labels, color swatches, shadows, a floor, scenery or other characters. Do not crop any part of the toy.
Deliver: 1 PNG, the largest landscape size available.
Acceptance: all 4 views clearly the same toy, matching the photos; nothing cropped; no text.
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
