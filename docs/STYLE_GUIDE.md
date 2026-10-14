# TwinForge: Toy Box Tactics: art style guide (v2, 2026-10-13)

v2 replaces v1 (2026-10-10). v1 read too young: soft purple lines, candy colors, one gentle shade band. v2 targets the look of an early-'90s Saturday-morning action cartoon: hand-inked cels over painted backgrounds. Think heavy black ink, hard shadows, heroic poses, bold comic-book color. Still made for a 4-year-old, so it's cool, not scary.

Production specs (canvas, anchor, scale, file names) are unchanged from v1. Only the look changes, so nothing in the game code that places sprites has to move.

## Look: characters (the "cels")
- **Ink:** near-black **#14111A** lines. Variable weight, like a brush pen: heavy on the outer silhouette and on the shadow side (≈1.5% of character height, ≈12 px on an 820 px toy), thinner for interior detail (≈5 px). Lines taper at the ends. Same rules on every toy.
- **Shading:** flat color plus a **hard-edged shadow shape** on every surface, big and graphic, covering roughly a third of the form. Light from the **upper left**. A third, darker tone is allowed in deep creases (under arms, under a chin, inside a mouth).
- **Shadow color:** shift shadows cool, toward blue-violet, instead of just making the base color darker. Red goes to crimson-purple, yellow goes to ochre-olive, skin goes to dusty mauve.
- **Highlights:** hard-edged white or pale-tint glints, not soft blobs. Shiny plastic gets a sharp streak or a couple of angular glints. Matte parts get none.
- **Rim light:** a thin hard rim of pale color on the right-side edge (the side away from the key light) for a "backlit hero" pop. Optional on small parts.
- **No** gradients, airbrush, textures or painterly strokes on characters. They're flat cels; the painting lives in the background.
- **Toys stay true:** real silhouette, face, proportions, markings, colors and accessories. Colors get more saturated and slightly deeper, never pastel.
- **Attitude:** confident and determined. Furrowed brows, a cocky grin, a squared stance. Not cutesy, not angry, never scary. A beaten toy is worn out, not hurt.

## Color
Characters keep their own toy colors. Shared accent and effects palette:

| Name | Hex | Use |
|---|---|---|
| Hero red | #D7263D | impacts, player 1 accents |
| Blaze orange | #F46036 | fire, energy |
| Gold | #FFC914 | stars, win effects |
| Turtle green | #2E9E44 | nature, heal |
| Hero blue | #1B4FD8 | player 2 accents, shields |
| Sky | #4EA8DE | ice, sky |
| Royal purple | #6A3FA0 | special moves |
| Teal | #1F8A8A | tech, water |
| Ink | #14111A | all line work |
| Cool shadow tint | #3A2F5B | multiply tint for shadow shapes |

## Camera and framing (characters)
- Eye-level or **slightly low** camera (a touch heroic), slight 3/4 view, **facing right**. The game mirrors the art for the opponent.
- Attack and victory poses can use foreshortening (fist or head coming toward the right side of the frame) and a stronger diagonal in the body.
- If a toy has asymmetric details that must not flip (printed words, a logo, a one-sided accessory), say so; it then needs left-facing poses too.
- Canvas **1024 × 1024**, transparent background, feet on an invisible floor line at **y = 960**, centered (anchor = bottom-center of the feet, x 512, y 960).
- Character height about **820 px** in idle, same scale in every pose. At least 40 px clear margin on all sides. No cast shadow (the game draws it).

## Environments (arenas)
This is where the '90s look really comes from: **painted backgrounds behind flat cels.**
- Backgrounds are painted, gouache-style: soft gradients, airbrushed glows, visible but gentle brush texture, dramatic lighting (moonlight, lamp pools, neon, sunset). This is the one place gradients are welcome.
- Line work in backgrounds is thin or absent. Shapes are defined by value and color. That separation is what makes the inked toys pop.
- Moodier and deeper than v1: dusk and night palettes, strong shadows, a few bright light sources.
- Lower middle stays an open, clear, evenly lit floor where two toys stand.
- **No letters, numbers or words** anywhere. The game draws every letter and number itself.
- No characters, UI, health bars or buttons baked in.

## Effects (new)
Wordless effect sprites drawn in the cel style: impact starbursts, speed-line bursts, energy rings, shield flashes, dust puffs. Thick ink, flat color, hard glints. **No** "POW" or "BAM" text; the game adds any words in its own lettering.

## Game-side finishing (Claude handles this, not Astra)
- Light film grain, faint scanlines and a slight warm cast over the whole screen for the TV feel. On by default; grown-ups can switch it off under Comfort → "TV look" if it hurts readability.
- UI in the same spirit: chunky italic title lettering, beveled health bars with hard highlights, comic-panel portrait frames with thick ink borders, slashing "VS" splash between rounds.
- Numbers and letters in the learning challenges stay in the upright rounded font with no glints over them, so a 4-year-old reads the shapes cleanly.
- Assets from Astra stay clean so these effects can change without new art.

## Code-drawn placeholders
Until Astra art arrives, the toys, arena and effects are drawn in code to this guide. `src/render/draw.js` holds the cel rules in one place (`toon()`: brush ink heavier on the shadow side, cool multiply shadow covering about a third of each part, right-edge rim light, angular glints, optional crease tone). `src/render/arena-bedroom.js` paints the night bedroom with gradients and glows and no ink, except the foreground props, which are inked cels.

## Production deliverables
- PNG, sRGB. Transparent assets need real alpha. If Astra can't do transparency, use a flat **#FF00FF** magenta background and the pipeline keys it out.
- File names: `<id>_<pose>_v<version>.png`, e.g. `luca-dino_idle_v2.png`. Art made to v2 starts at v2.
- Approved files are never regenerated for a new arena; they are reused.
