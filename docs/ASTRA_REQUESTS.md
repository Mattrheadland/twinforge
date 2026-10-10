# Astra requests log

## ARENA-01 Bedroom Block Fortress — background v1 (priority 1)

```
ASTRA ASSET REQUEST — ARENA-01-BG v1
File: arena-bedroom_bg_v1.png · Priority: 1 (first arena) · Production asset, opaque.
Purpose: battle background for a kids' toy battle game played sideways on an iPhone. Two toys stand on the floor in front of it; the game draws the toys, health bars and buttons on top.
Prompt: A cozy kid's bedroom at night seen at a toy's eye level, wide landscape view. Purple-lavender striped wallpaper with a few glow-in-the-dark star stickers. A window in the upper middle with pink curtains, a crescent moon and twinkling stars outside. Simple wall shelves at the far left and far right with books, a ball and a toy rocket. On the floor: warm wooden planks running toward the back, and a big round teal rug with a dashed yellow stitched border filling the lower middle of the image. Behind the right side of the rug, a small castle built from plain colored toy blocks with two little yellow flags. A purple toy chest at the back left.
Style (must follow): crisp 2D illustration; dark outline #1D1530 at a soft, even weight; flat colors with one cel-shade band, light from the upper left; slightly softer and less saturated than a foreground character so toys pop in front. Palette: purple/lavender walls, warm wood floor, teal rug, toy-block accents in red #EF4B3C, yellow #FFD23F, blue #3D7BF2, green #5CC95A.
Composition: keep the lower-middle floor and rug open and clear (two toys stand there: one at about 25% from the left near the front, one at about 75% from the left a little further back). Keep the top 12% and bottom 12% as plain extension (more wall, more floor) because the game crops to a wider strip. Nothing important touching the edges.
Do not include: any letters, numbers or words (including on blocks or books), characters or toys standing on the rug, UI, frames, or a vignette.
Size: the largest landscape size available (e.g., 1536 × 1024).
Acceptance: rug area clear; no text anywhere; outlines consistent; nothing important in the outer 12% top/bottom.
```

## ARENA-01 foreground props v1 (priority 2, after the background is approved)

```
ASTRA ASSET REQUEST — ARENA-01-FG v1
File: arena-bedroom_fg_v1.png · Priority: 2 · Production asset, transparent.
Reference: the approved ARENA-01-BG v1 (attached).
Prompt: Only foreground props for the bedroom scene, seen close to the camera: a large blue toy block cut off by the bottom-left corner, and a large yellow toy block with a small red ball cut off by the bottom-right corner. Everything else fully transparent.
Style: same as ARENA-01-BG (dark outline #1D1530, flat color, one cel-shade band, light upper left).
Size: same pixel size as ARENA-01-BG, transparent background (or flat #FF00FF if transparency isn't possible).
Do not include: letters, numbers, shadows on the transparent area, any other objects.
Acceptance: props stay inside the bottom 20% corners; clean transparent edges.
```
