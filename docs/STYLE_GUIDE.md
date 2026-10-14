# TwinForge: Toy Box Tactics: art style guide (v4, 2026-10-13)

v4 replaces v3 and v2 (same day) and v1 (2026-10-10). Target: **an '80s game that moves like a modern one.** The look is the 8-bit arcade and home-console era (Karate Champ, Double Dragon, Punch-Out!!, the first TMNT arcade): chunky square pixels, a small fixed color palette, two or three tones per surface, blocky bitmap lettering, segmented health bars, CRT scanlines. The motion is modern: 60 fps, eased movement, squash and stretch, screen shake, particles, and sprites that glide smoothly instead of hopping a pixel at a time (the Shovel Knight approach). Still made for a 4-year-old: tough, never scary.

Production specs (canvas, anchor, scale) are unchanged from v1. Only the look changes, so nothing in the game code that places sprites has to move.

## How the pixel look works
- The game draws art on a coarse grid, about **200 pixels tall** for the whole scene, and scales it up by a whole number of screen pixels so every art pixel is the same chunky square.
- Every sprite, portrait and background is snapped to **one fixed, original 8-bit-style palette** (about 60 colors, a few ramps per hue plus deep night blues). Backgrounds are ordered-dithered into it, the classic 8-bit gradient.
- The screen itself stays full resolution. Sprites, camera shake and effects are placed at smooth sub-pixel positions, so the art is 8-bit but the motion is fluid.

**Astra should not fake pixel art.** Image models draw "pixels" on an uneven grid, and resampling that onto the game's grid turns it to mush. Astra draws clean, bold, flat art; the game does the pixels and palette. An 820 px idle toy ends up about **90 art pixels tall**, so everything must read at that size.

## Look: characters (8-bit sprites)
- **Outline:** dark **#14111A** outline around the whole silhouette, about **1% of character height** (≈8 px on an 820 px toy). Few interior lines, and only bold ones.
- **Three tones per surface:** shadow, base, light. Hard edges, no blending. Shadow on the lower right, a light patch on the upper left. A fourth, darker tone only in deep creases.
- **Flat, saturated colors** from a small set per toy (ideally 4–6 colors plus outline). Never pastel, never airbrushed.
- **Highlights:** one small hard white glint on shiny plastic. Matte parts get none.
- **Big, simple shapes:** bold silhouette, oversized readable face and eyes, no detail thinner than about 10 px at 820 px tall. If it disappears when the image is shrunk to 90 px tall, it's too fine.
- **Toys stay true:** real silhouette, face, proportions, markings, colors and accessories.
- **Attitude:** confident '80s fighter. Determined brows, a smirk or gritted teeth, a squared ready stance. A beaten toy is worn out, not hurt.

## Color
Characters keep their own toy colors. Shared accent and effects palette:

| Name | Hex | Use |
|---|---|---|
| Hero red | #D7263D | impacts, player 1 accents |
| Blaze orange | #F46036 | fire, energy, FIGHT! |
| Gold | #FFC914 | stars, win effects, arcade lettering |
| Turtle green | #2E9E44 | nature, heal |
| Hero blue | #1B4FD8 | player 2 accents, shields |
| Sky | #4EA8DE | ice, sky |
| Royal purple | #6A3FA0 | special moves |
| Teal | #1F8A8A | tech, water |
| Ink | #14111A | all outlines |
| Cool shadow tint | #3A2F5B | multiply tint for shadow tones |

## Camera and framing (characters)
- Eye-level or **slightly low** camera, slight 3/4 view, **facing right**. The game mirrors the art for the opponent.
- Attack and victory poses can use foreshortening and a stronger diagonal in the body.
- If a toy has asymmetric details that must not flip (printed words, a logo, a one-sided accessory), say so; it then needs left-facing poses too.
- Canvas **1024 × 1024**, transparent background, feet on an invisible floor line at **y = 960**, centered (anchor = bottom-center of the feet, x 512, y 960).
- Character height about **820 px** in idle, same scale in every pose. At least 40 px clear margin on all sides. No cast shadow (the game draws a hard floor shadow).

## Stages (arenas)
- Simple, bold stage art: large clear shapes, strong lighting, a few bright light sources, night and dusk palettes. Soft gradients are fine; the game dithers them into the palette. Fine texture and small clutter just turn to noise at 200 px tall, so keep it big.
- Little or no outline in backgrounds, so the outlined sprites pop in front.
- A clear, evenly lit floor in the lower middle where two toys stand, with visible floor detail (planks, tiles) for depth.
- **No letters, numbers or words** anywhere. The game draws every letter and number itself.
- No characters, crowd, UI, health bars or buttons baked in. The game animates its own background crowd (toys that bob along and jump on big hits).

## Effects
Wordless effect sprites in the sprite style: impact starbursts, speed lines, energy rings, shield flashes, dust puffs. Dark outline, two or three flat tones, hard glints. **No** "POW" text; the game adds words in its own bitmap lettering.

## Game-side finishing (Claude handles this, not Astra)
- **8-bit pixels:** the coarse grid, fixed palette and dithered backgrounds above. Grown-ups can switch it off under Comfort → "8-bit pixels" for the smooth version.
- **Modern motion:** full 60 fps, sub-pixel sprite and camera movement, eased lunges, squash and stretch, afterimage trails, hit-stop, screen shake, particles.
- **Lettering:** a hand-made 5×7 bitmap font scaled in whole steps, with three color bands (light, base, dark), a 1-pixel ink outline and a hard drop shadow. Used for the logo, names, VS, K.O., ROUND 1, FIGHT!, hit words and results.
- **HUD:** segmented yellow health bars in gold frames that start at the center K.O. badge and drain toward the corners (lost health shows red), portraits in the corners, names under the bars, arcade-cabinet push buttons.
- **Screens:** attract-style title with blinking PUSH START, player-select tiles with a blinking 1P frame, split-screen VS, ROUND 1 → FIGHT! before each battle.
- **TV look:** scanlines like an old arcade monitor. On by default, switch off under Comfort → "TV look".
- Numbers and letters in the learning challenges stay in the upright rounded font with no glints, so a 4-year-old reads the shapes cleanly.

## Code-drawn placeholders
Until Astra art arrives, the toys, arena and effects are drawn in code to this guide. `src/render/draw.js` holds the sprite rules (`toon()`: outline under the fill, three tones nested toward the light, rim, glints). `src/render/pixel.js` holds the palette, dithering, sprite clean-up and the bitmap font. `src/render/stage.js` composites the art-resolution layers onto the full-resolution screen for smooth motion. `src/render/arena-bedroom.js` paints the night bedroom and its bobbing crowd (a teddy bear and a rubber duck).

## Production deliverables
- PNG, sRGB. Transparent assets need real alpha. If Astra can't do transparency, use a flat **#FF00FF** magenta background and the pipeline keys it out.
- File names: `<id>_<pose>_v<version>.png`, e.g. `luca-dino_idle_v4.png`. Art made to v4 starts at v4.
- Approved files are never regenerated for a new arena; they are reused.
