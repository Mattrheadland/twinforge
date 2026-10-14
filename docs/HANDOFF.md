# TwinForge master handoff (start here)

Last updated 2026-10-14. This replaces the handoffs from the two parallel chats (modes/campaign and learning report). Everything from both is merged on `main`.

## How to start a new chat
Paste this:

> TwinForge: continue the build. Clone Mattrheadland/twinforge, read docs/HANDOFF.md first, then docs/NEXT_STEPS.md, docs/STYLE_GUIDE.md and docs/ASSET_PIPELINE.md. Pick up at "Next up" in HANDOFF.md.

## Project in one paragraph
"TwinForge: Toy Box Tactics" is a turn-based battle game for Matt's son Luca (4), starring his real toys rebuilt as low-poly, '80s-cartoon-shaded 3D toys. It's a single-file web app (three.js, esbuild) played on an iPhone 16 Pro in landscape from the home screen, hosted on GitHub Pages (`gh-pages` branch). Power moves ask a math question and specials ask a reading question when Learning is on.

## Rules (from Matt, keep these)
- Toy photos never go in the repo or the game.
- Hocus Pocus and The Chernabog stay as original stand-ins: **Wanda Wickwhistle** and **Czernobog** (renamed from Gloomwing on 2026-10-14; the look is our own chubby night creature).
- Free tools only (Hunyuan 3D for models, no paid generators).
- Run `npm test` before every push. Commits by Matt Headland <mattrheadland@gmail.com>.
- Keep replies brief and end with next steps. Human-sounding writing; documents as PDF unless asked otherwise.

## Where things are
| What | Where |
|---|---|
| Characters, moves, minions | `src/data/characters.js` (`ROSTER`, `MINIONS`, `MINION_OF`) |
| Battle rules | `src/logic/battle.js` |
| Modes: Tournament, Arcade | `src/game/modes.js`, `src/ui/modes-ui.js` |
| Campaign board logic | `src/game/campaign.js` (`WORLDS`, `buildBoard`, `move`, `winSpace`) |
| Campaign board view | `src/render3d/board3d.js` (3D diorama), `src/ui/board-ui.js` (HUD + flat fallback) |
| 3D stage | `src/render3d/stage3d.js` (`setArena`, `setFighters`, `setBoard`, `snapshot`) |
| Code-built toys | `src/render3d/roster-rigs.js`, `family-rigs.js`, `minion-rigs.js` |
| Imported models | `src/render3d/models.js` (GLB loader, toy joints), `model-face.js` (painted eyes) |
| Learning log + report | `src/logic/learning-log.js`, `src/ui/learning-report.js` |
| Save + migration | `src/save.js` |
| Audit, checklist, perf results | `docs/AUDIT.md` |
| Art requests for Astra | `docs/ASTRA_REQUESTS.md` |

Commands: `npm test` (unit), `npm run build`, `npm run e2e` (Puppeteer, ~5 min), `npm run perf`, `npm run model:import <id> <file.glb>`, `npm run model:check` (CHAR=<id>, FOE=<id>), `npm run deploy` (set GIT_AUTHOR_/GIT_COMMITTER_ name+email to Matt).

## State as of this handoff
- **Roster (8)**: Battle Rex, Spooky Tree, Ragin' Rockfish, Young Arthur, Wanda Wickwhistle, Czernobog, Remy Roo (family dog; special Power Paws), Billy Bass (wall fish; power Take Me to the River).
- **Modes**: Campaign (board game over five island worlds, wild creatures, a boss per world, giant Czernobog at the end), Tournament (every toy on its home turf, then a giant boss), Arcade (pick toy, opponent or Surprise, arena or Surprise), Toy Box.
- **Wild creatures (9)**: Rexlet, Spooky Sprout, Rock Minnow, Little Squire, Bog Frog, Sneaky Squirrel, Bubble Crab, Shadow Imp and Jitterbones (Czernobog's crew, from Matt's mountaintop reference).
- **3D models**: only Battle Rex is a real model (Hunyuan, 6k triangles, 469 KB). Everyone else is code-built until their GLB arrives.
- **Learning report + question preview** (from the parallel chat): shipped, in grown-up settings.
- **Tests**: 43 unit, 66 e2e, all passing. Perf and leak checks pass (results in `docs/AUDIT.md`).
- **Conflicts settled when merging the two chats**: the name is Czernobog everywhere (not Gloomwing); the mode list is Campaign / Tournament / Arcade / Toy Box (the older Story / endless Arcade / Quick Fight list is gone).

## Next up (needs Matt's PC online with Chrome + the Claude extension)
1. **Pull the finished Hunyuan models.** Open the Hunyuan tabs in Matt's Chrome (hy3d.tencent.ai, free, 20 a day, 3 jobs at once). Download Spooky Tree, Ragin' Rockfish and Young Arthur GLBs. Stage them from `C:\Users\mattr\Downloads` (Matt approved access), then `npm run model:import <id> <file>`.
2. For each: set `art.model`, `art.joints` (head / jaw / arms / tail boxes), `art.face` and anchors in `characters.js`, the way Battle Rex is set up. Check with `CHAR=<id> npm run model:check`, then in game.
3. **Remy Roo**: views are already uploaded in a Hunyuan tab; press Generate once a slot is free. **Billy Bass**: not started. Upload views one at a time about 10 s apart on white backgrounds ("Detection failed" means retry).
4. Import Remy and Billy the same way. Test, commit, deploy after each batch.
5. **Astra**: send the three requests in `docs/ASTRA_REQUESTS.md` (Bog Shack floor, Wanda pack, Czernobog pack). When the sheets come back, split them (`scripts/split-turnaround.py`) and run them through Hunyuan too.
6. Matt plays with Luca and sends the learning report ("Copy as text") plus anything too hard, too long or confusing; tune from that.
7. iPhone performance pass (manual steps in `docs/AUDIT.md` §4).

## Known gaps
- Rex's model cannon doesn't swing forward like the code rig's (the beam still starts at the muzzle).
- Without WebGL, minions draw as the generic 2D toy and arenas fall back to the bedroom.
- The Bog Shack floor borrows the pier texture until Astra's floor comes back.
