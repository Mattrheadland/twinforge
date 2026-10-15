# TwinForge master handoff (start here)

Last updated 2026-10-14 (evening). This replaces the handoffs from the two parallel chats (modes/campaign and learning report). Everything from both is merged on `main`.

## How to start a new chat
Paste this:

> TwinForge: continue the build. Clone Mattrheadland/twinforge, read docs/HANDOFF.md first, then docs/NEXT_STEPS.md, docs/STYLE_GUIDE.md and docs/ASSET_PIPELINE.md. Pick up at "Next up" in HANDOFF.md.

## Project in one paragraph
"TwinForge: Toy Box Tactics" is a turn-based battle game for Matt's son Luca (4), starring his real toys rebuilt as low-poly, '80s-cartoon-shaded 3D toys. It's a single-file web app (three.js, esbuild) played on an iPhone 16 Pro in landscape from the home screen, hosted on GitHub Pages (`gh-pages` branch). Power moves ask a math question and specials ask a reading question when Learning is on.

## Rules (from Matt, keep these)
- Toy photos never go in the repo or the game.
- Hocus Pocus and The Chernabog stay as original stand-ins: **Wanda Wickwhistle** (a tall, wicked, cackling sorceress since the 2026-10-14 redesign) and **Czernobog** (a giant obsidian demon god with horns and tattered wings since the same redesign; the old chubby night creature is gone). Matt wanted both menacing; keep them scary-fun, never gory.
- Free tools only (Hunyuan 3D for models, no paid generators).
- Run `npm test` before every push. Commits by Matt Headland <mattrheadland@gmail.com>.
- Keep replies brief and end with next steps. Human-sounding writing; documents as PDF unless asked otherwise.
- Matt wants a status line at least every 10 minutes during long work, and to be told plainly when something is blocked. Helper agents get declined by a permission prompt on his side; work solo unless he says otherwise.
- Targets: iPhone 16 Pro landscape AND Matt's Windows laptop "FastWillie" (Chrome, i5-1135G7, Iris Xe, DPR 1.5, ~1280x700 window, mouse + touch). Chrome on the laptop must be the front window for Claude in Chrome to work; hidden tabs are throttled to a crawl.

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
| Learning questions (22 types) | `src/logic/challenges.js`; word banks in `src/logic/words.js`; card UI in `src/ui/challenge.js` |
| No repeats + second tries | `src/logic/question-picker.js` (memory kept in `save.data.learning.mem`) |
| Read aloud | `src/audio/speech.js` (phone's built-in voice; setting `readAloud`) |
| Learning log + report | `src/logic/learning-log.js`, `src/ui/learning-report.js` |
| Save + migration | `src/save.js` |
| Audit, checklist, perf results | `docs/AUDIT.md` |
| Art requests for Astra | `docs/ASTRA_REQUESTS.md` |

Commands: `npm test` (unit), `npm run build`, `npm run e2e` (Puppeteer, ~5 min), `npm run perf`, `npm run model:import <id> <file.glb>`, `npm run model:check` (CHAR=<id>, FOE=<id>), `npm run deploy` (set GIT_AUTHOR_/GIT_COMMITTER_ name+email to Matt).

## State as of this handoff (2026-10-14, 8:30 PM)
- **Roster (8)**: Battle Rex, Spooky Tree, Ragin' Rockfish, Young Arthur, Wanda Wickwhistle, Czernobog, Remy Roo (family dog; special Power Paws), Billy Bass (wall fish; power Take Me to the River).
- **3D models (8 of 8 in game)**: every toy is a real Hunyuan model (6k triangles, 365–572 KB) with toy joints in `characters.js`. Hunyuan's asset list API (`POST /api/3d/creations/list`, page/pageSize) returns signed GLB links, so a model can be fetched without the viewer; the viewer and Download button only work while the Chrome window is visible.
- **Modes**: Campaign (board over five worlds, giant Czernobog at the end), Tournament, Arcade, Toy Box. Each mode keeps its own saved run now.
- **Wild creatures (9)**: Rexlet, Spooky Sprout, Rock Minnow, Little Squire, Bog Frog, Sneaky Squirrel, Bubble Crab, Shadow Imp, Jitterbones (the last two are lanky dancing silhouettes).
- **Learning**: 22 question types (13 math, 9 reading incl. spelling and sight words) over 5 auto levels; word banks now live in `public/words.json` (fetched lazily) to keep the bundle at 974 KB. The last 25 questions per subject never repeat; a missed skill comes back later in a new form; the phone reads each question aloud.
- **Laptop support (new today)**: rotate-phone overlay only on touch phones; screens fit from 4:3 to 21:9; portraits cached so the select screen doesn't stutter; keyboard (Enter/Space/arrows/Escape); a battle step that throws recovers instead of freezing; WebGL context loss handled; save reset/backup bugs fixed.
- **Full-campaign test**: `node test/campaign-run.mjs tree@desktop nightwing@iphone` plays a whole campaign through the real UI and counts sounds. Measured run: 15 battles, 61 turns, 48 questions, 18 rolls, 4.5 min of animation. For a 4-year-old that's about 25–45 minutes per campaign, usually 2–3 sittings.
- **Tests**: 65 unit, ~80 e2e. e2e runs that overlap with other headless runs on the same box fail spuriously (load avg 20+); run them alone.

## Next up
1. Laptop playtest in Matt's Chrome (frame times per scene, a full campaign with the mouse). Fix anything not smooth.
2. Sitrep PDF for Matt (status, bugs fixed, durations, risks).
3. Matt and Luca play; tune from the learning report.
4. Bog Shack floor from Astra is in the ChatGPT TwinForge project ("Bog Shack Floor Texture" chat); download it to `assets/arenas/bog-shack/arena-bog-shack-floor.png` and run `scripts/build-arenas.py`.

## Known gaps
- Read-aloud can't be tested headless; it uses the iPhone's built-in voice (Web Speech API) and needs a real-device check.
- Level 1 is small on purpose (about 30 math and 26 letter questions); three right in a row moves him up.
- index.html is 972 KB against a 1 MB budget; the next big feature should move the word banks or rigs out of the main bundle if it grows.
- Rex's model cannon doesn't swing forward like the code rig's (the beam still starts at the muzzle).
- Without WebGL, minions draw as the generic 2D toy and arenas fall back to the bedroom.
- The Bog Shack floor borrows the pier texture until Astra's floor comes back.
