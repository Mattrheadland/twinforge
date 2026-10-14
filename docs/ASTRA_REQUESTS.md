# Astra requests log

Style: STYLE_GUIDE v4 ('80s 8-bit look). Send these only after STYLE-TEST v4 is approved (see ASSET_PIPELINE §0). Earlier arena requests are superseded; don't use any earlier bedroom art.

## ARENA-01 Bedroom Block Fortress — background v4 (priority 1)

```
ASTRA ASSET REQUEST — ARENA-01-BG v4
File: arena-bedroom_bg_v4.png · Priority: 1 (first arena) · Production asset, opaque.
Reference: the approved STYLE-TEST v4 (for the background treatment only).
Purpose: battle background for a kids' toy battle game played sideways on an iPhone. Two toys stand on the floor in front of it; the game draws the toys, health bars and buttons on top.
Prompt: A kid's bedroom at night, seen from a toy's eye level, wide landscape view, drawn as a stage for a 1980s 8-bit fighting game: big simple shapes, strong lighting, no clutter. Deep blue-violet shadows. Cool moonlight pours through a window in the upper middle (curtains drawn back, crescent moon, a few stars) and lays a pale band of light across the floor. A warm desk-lamp glow spills in from the left edge. Glow-in-the-dark star stickers on the wall give off a faint green glow. Shelves at far left and far right hold books, a ball and a toy rocket as dark silhouettes with a few lit edges. On the floor: wooden planks running toward the back, and a big round teal rug in the lower middle, lit by the moonlight. Behind the right side of the rug, a small fortress built from toy blocks (red, yellow, blue, green) with two little flags, catching a warm rim of lamp light. A toy chest at the back left, mostly in shadow.
Style (must follow): big bold shapes with strong lighting; soft gradients and glows are fine (the game dithers them into its palette), but no fine texture or small clutter, which turns to noise at 200 px tall. Thin or no outlines; shapes are defined by light and color. No fake pixel grid. Wooden planks clearly visible on the floor for depth. Moody, but the rug area is the brightest, clearest part of the image. Block accents in #D7263D, #FFC914, #1B4FD8, #2E9E44.
Composition: keep the lower-middle floor and rug open, evenly lit and clear (two toys stand there: one at about 25% from the left near the front, one at about 75% from the left a little further back). Keep the top 12% and bottom 12% as plain extension (more wall, more floor) because the game crops to a wider strip. Nothing important touching the edges.
Do not include: any letters, numbers or words (including on blocks, books or posters), characters or toys standing on the rug, UI, frames, or a vignette.
Size: the largest landscape size available (e.g., 1536 × 1024).
Acceptance: rug area clear and well lit; no text anywhere; painted, not outlined; no fake pixels; nothing important in the outer 12% top/bottom.
```

## ARENA-01 foreground props v4 (priority 2, after the background is approved)

```
ASTRA ASSET REQUEST — ARENA-01-FG v4
File: arena-bedroom_fg_v4.png · Priority: 2 · Production asset, transparent.
Reference: the approved ARENA-01-BG v4 (attached).
Prompt: Only foreground props for the bedroom scene, very close to the camera and mostly in shadow: a large blue toy block cut off by the bottom-left corner, and a large yellow toy block with a small red ball cut off by the bottom-right corner. Lit by the same moonlight and lamp glow as the background, with a hard rim of light on their top edges. Everything else fully transparent.
Style: like the characters (even dark #14111A outline, three hard flat tones, no gradients, no fake pixel grid), since they sit in front of the toys.
Size: same pixel size as ARENA-01-BG v4, transparent background (or flat #FF00FF if transparency isn't possible).
Do not include: letters, numbers, shadows on the transparent area, any other objects.
Acceptance: props stay inside the bottom 20% corners; clean transparent edges.
```
