# Toy Box Battleground: art style guide (v1, approved 2026-10-10)

Every image Astra makes for the game follows these rules, so toys from different photos look like they belong in the same world.

## Look
- Crisp, high-resolution 2D toy illustration.
- One consistent dark outline on every shape: deep ink purple **#1D1530**, about 1.2% of the character's height (≈10 px on a 820 px tall toy). Same weight on every toy and prop.
- Flat colors with **one** cel-shade band per surface, light coming from the **upper left**. One small soft highlight per big surface. No gradients on characters, no textures, no painterly brushwork.
- Colors stay true to the real toy, pushed slightly brighter and cleaner. The game's shared accent palette: red #EF4B3C, orange #FF9F1C, yellow #FFD23F, green #5CC95A, blue #3D7BF2, sky #7FD3F7, purple #8E5CF2, pink #FF7AA8.
- Toys keep their real silhouette, face, proportions, colors and accessories. Cute and readable beats realistic.
- Combat is playful. No blood, wounds, scary faces or weapons pointed at the viewer. A beaten toy is tired, not hurt.

## Camera and framing (characters)
- Eye-level camera, slight 3/4 view, **facing right**. The game mirrors the art for the opponent.
- If a toy has asymmetric details that must not flip (printed words, a logo, a one-sided accessory), say so; it then needs left-facing poses too.
- Canvas **1024 × 1024**, transparent background, feet resting on an invisible floor line at **y = 960**, horizontally centered (anchor point = bottom-center of the feet, x 512, y 960).
- Character height about **820 px** in the idle pose, the same scale in every pose. At least 40 px of clear margin on all sides. No cast shadow (the game draws it).

## Environments (arenas)
- Same outline and cel-shade rules, slightly softer outline (≈60% weight) and slightly less saturated than the characters so toys pop in front.
- Eye-level view of a floor that the toys stand on, with a clear open area in the lower middle.
- **No letters, numbers or words** anywhere in backgrounds or props. The game draws every letter and number itself so they are always correct and legible.
- No characters, UI, health bars or buttons baked in.

## Production deliverables
- PNG, sRGB. Transparent assets need real alpha. If Astra can't do transparency, use a flat **#FF00FF** magenta background and the game pipeline keys it out.
- File names: `<id>_<pose>_v<version>.png`, e.g. `luca-dino_idle_v1.png`.
- Approved files are never regenerated for a new arena; they are reused.
