# TwinForge: Toy Box Tactics

A turn-based toy battle game for Luca (age 4), built as an installable web app for iPhone. His real toys become heroes; counting powers attacks and letter matching powers specials. Private family project.

## Play
Open the GitHub Pages link in **Safari on the iPhone**, tap **Share → Add to Home Screen**, then launch it from the home screen. It opens full-screen, works offline and keeps its save. (The Safari tab and the home-screen app keep separate saves on iOS, so install first, then play.)

Grown-up settings: on the title screen, **press and hold the gear for 1.5 seconds**.

## Phase 1 (current)
- Title → pick a toy → VS → one full battle in the Bedroom Block Fortress → win (stars) or nap (retry).
- Attack (counting), Defend (shield), Special (letter match, needs 3 energy). Wrong answers never cause a miss: first wrong removes that choice and gives a hint, second wrong shows full support, every path ends in a hit.
- Foe telegraphs its big move (glow + "!"). Defending turns it into a PERFECT block.
- Synthesized original music and effects, haptics where supported, reduced motion, separate music/effects volume.
- Auto-save at every turn, resume after closing the app, backup export/import, two-tap reset.
- Look: STYLE_GUIDE v4, an '80s 8-bit game with modern motion. Art renders on a coarse ~200 px grid with a fixed palette and dithered background (Comfort → 8-bit pixels), while sprites, camera and effects move smoothly at full resolution. Bitmap-font lettering, segmented health bars meeting at a K.O. badge, ROUND 1 / FIGHT!, a bobbing toy crowd, optional scanlines (Comfort → TV look).
- Placeholder toys (Captain Blocko, Stompy) and arena are drawn in code to that guide and marked TEMP ART.

## Develop
```
npm install
npm test           # rules, challenges, difficulty, saves, music data
node build.mjs     # → dist/ (single-file index.html + manifest, service worker, icons)
node test/e2e.mjs  # headless playthrough + screenshots (Chromium, not Safari)
npm run deploy     # build and push to the gh-pages branch that GitHub Pages serves
```
Code map: `src/logic` (pure rules, no DOM) · `src/game` (battle state machine, choreography) · `src/render` (canvas stage, toys, arena, effects) · `src/ui` (HUD, challenges, menus) · `src/audio` · `src/save.js` · `src/data` (characters as editable data).

Art: see `docs/STYLE_GUIDE.md` and `docs/ASSET_PIPELINE.md`. No third-party code or assets are bundled; the only dependency is the esbuild bundler at build time.
