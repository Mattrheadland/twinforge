# TwinForge master handoff (start here)

Last updated 2026-10-15 (midday). Everything is merged on `main` and deployed.

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
| Characters, moves, minions | `src/data/characters.js` (`ROSTER`, `MINIONS`, `MINION_OF`); the four arcade-only toys in `src/data/characters-new-four.js` |
| Battle rules | `src/logic/battle.js` |
| Modes: Tournament, Arcade | `src/game/modes.js`, `src/ui/modes-ui.js` |
| Campaign board logic | `src/game/campaign.js` (`WORLDS`, `buildBoard`, `move`, `winSpace`) |
| Campaign board view | `src/render3d/board3d.js` (3D diorama), `src/ui/board-ui.js` (HUD + flat fallback) |
| 3D stage | `src/render3d/stage3d.js` (`setArena`, `setFighters`, `setBoard`, `snapshot`) |
| Code-built toys | `src/render3d/roster-rigs.js`, `family-rigs.js`, `minion-rigs.js`, `villain-rigs.js` (the new four) |
| Lore for the new four | `docs/lore/<id>.md` (story, personality, moves, taunts, sound notes) |
| Imported models | `src/render3d/models.js` (GLB loader, toy joints), `model-face.js` (painted eyes) |
| Learning questions (22 types) | `src/logic/challenges.js` (spelling ladder: `SPELL_MODE`, `spellBank`); word banks in `public/words.json` via `src/logic/words.js`; card UI in `src/ui/challenge.js` |
| No repeats + second tries | `src/logic/question-picker.js` (memory kept in `save.data.learning.mem`) |
| Read aloud | `src/audio/speech.js` (phone's built-in voice; setting `readAloud`) |
| Learning log + report | `src/logic/learning-log.js`, `src/ui/learning-report.js` |
| Save + migration | `src/save.js` |
| Sounds | `src/audio/audio.js` (`SFX` table; a move's `sfx` / `sfxHit`, a toy's `winSfx`) |
| Build | `build.mjs`: index.html (app) + `three-<hash>.js` (three.js, generated from what src/ uses) |
| Audit, checklist, perf results | `docs/AUDIT.md` |
| Art requests for Astra | `docs/ASTRA_REQUESTS.md` |

Commands: `npm test` (unit, 68), `npm run build`, `npm run e2e` (Puppeteer, ~5 min), `npm run perf`, `npm run model:import <id> <file.glb>`, `npm run model:check` (CHAR=<id>, FOE=<id>), `npm run deploy` (set GIT_AUTHOR_/GIT_COMMITTER_ name+email to Matt).

## State as of this handoff (2026-10-15, midday)
- **Laptop playtest (FastWillie, Chrome, Iris Xe, DPR 1.5)**: measured with a frame sampler in the live page. Title, mode cards, select (12 toys), a Fishing Pier battle with real models, learning cards and a full Crookhook battle (quick, power with math card, Cannon Broadside with reading card, win) all hold a locked 60 fps with 0–2 dropped frames per scene; no JS errors. The one stall was the first entry to the select screen (750 ms rendering 12 portraits), now pre-warmed on the title screen. Screens fit at 1280×495, 729×488 and 510×494. Not yet timed on the laptop: Jack-Knife, Wolfgang and Payne battles, the mouse campaign. The iPhone "Add to Home Screen" tip now only shows on iPhone/iPad.
- **Spelling ladder (new today, Matt's ask)**: spelling joins reading at level 2 and climbs. Levels 2–3 **copy**: the word is printed above the slots, he builds it letter by letter with the current letter lit in the word (3 letters at L2, 3–4 at L3). Level 4 **peek**: the word shows for ~3 s then hides; a wrong tap shows it again. Level 5 **sound**: picture only, phone says the word and its letters, 3–5 letter words (truck, train, plant, snake, apple…). Vowel spots offer vowels, consonant spots consonants. Banks: `SPELL` (3), `SPELL_LONG` (4), `SPELL_LONGER` (5) in `public/words.json`. Level descriptions in settings updated; report lines say Copy / Peek and spell / Spell.
- **Bundle**: three.js moved out of index.html into `dist/three-<hash>.js` (627 KB, precached by the service worker, entry generated by `build.mjs` from the `THREE.X` names src/ uses so it stays tree-shaken). index.html is 383 KB against the 1 MB budget. The claude.ai preview file still inlines everything.
- **Signature specials for the new four**: Cannon Broadside (brace, four cannonballs with fuse sparks 220 ms apart, splash), Pumpkin Bomb Barrage (fold up with a giggle, spring open, five carved pumpkins lob in and burst), Huff and Puff (one-second inhale swelling him up, then a gale of wind streaks and flying straw that shoves the foe back), Orbital Strike (halberd up, reticle locks through three beeps, beam drops from the top of the screen). Each is timed to its sound.
- **Signature power moves for the new four**: Squawks the parrot launches off Crookhook's shoulder, swoops and pecks twice, flies home; Wolfgang throws his head back and two howl rings race across; Jack-Knife lobs a real carved pumpkin; Payne opens a gravity well that lifts the foe and snaps shut. Quick and guard moves still use the shared lunge / dodge / reflect.
- **HUD portraits**: `art.portrait = { x, y, r }` nudges the head frame per toy (Billy Bass, Wanda, Crookhook, Payne, Tree, Rockfish, Czernobog, Jack-Knife set); `headFrame()` in stage3d.js prints a toy's anchor and box for tooling.
- **Sounds for the new four**: 20 synthesized effects following each lore file's sound notes, wired through `move.sfx` (wind-up), `move.sfxHit` (impact) and `def.winSfx`. Matt has an mp3 of all 20 to review; retune on his notes.
- **Roster (12)**: Battle Rex, Spooky Tree, Ragin' Rockfish, Young Arthur, Wanda Wickwhistle, Czernobog, Remy Roo, Billy Bass, plus the new four (`arcadeOnly: true`): Capt'n Crookhook, Jack-Knife, Big Bad Wolfgang, Commander Payne. The new four are code-built toys (`villain-rigs.js`) with signature specials (`spCannonBroadside`, `spPumpkinBarrage`, `spHuffAndPuff`, `spOrbitalStrike` in `director.js`; effect pieces `cannonball`, `pumpkin`, `gust`, `reticle` in `fx-moves.js`) and signature power moves (`parrotAttack`, `howlAttack`, `pumpkinToss`, `gravityGrip`; pieces `parrot`, `howlRing`, `gravityWell`); their arenas are specs only and they fight in the Bedroom. Astra packs in `docs/ASTRA_REQUESTS_NEW_FOUR.md`.
- **Tournament** stays 7 fights; **select screen** two rows of six past 8 toys; **3D models** 8 of 8 original roster from Hunyuan; **modes** Campaign / Tournament / Arcade / Toy Box, each with its own saved run; **wild creatures** 9; **learning** 22 types over 5 levels, no repeats in the last 25, second tries, read-aloud.
- **Tests**: 68 unit, 89 e2e (run e2e alone; overlapping headless runs fail spuriously).
- Matt's save on the laptop gained 3 stars from Claude's Crookhook test win and one "after a hint" quick-look entry (Claude, not Luca).

## Next up
1. Matt listens to the new-four sounds mp3 and says which miss; retune. Matt and Luca play; tune from the learning report, especially the new spelling ladder (too easy / too hard per level, whether "copy" holds his attention). Luca's verdict on the new four and their names.
2. Finish the laptop pass when Chrome is open and in front: Jack-Knife, Wolfgang, Payne battles (frame times) and a mouse campaign.
3. Send Astra the new-four packs (`docs/ASTRA_REQUESTS_NEW_FOUR.md`), then Hunyuan for each toy as painted sheets come back; arenas through `scripts/build-arenas.py` and `src/data/arenas-new-four.js`.
4. Bog Shack floor from Astra (ChatGPT TwinForge project, "Bog Shack Floor Texture" chat) → `assets/arenas/bog-shack/arena-bog-shack-floor.png`, then `scripts/build-arenas.py`.

## Known gaps
- Read-aloud can't be tested headless; it uses the iPhone's built-in voice (Web Speech API) and needs a real-device check.
- Level 1 is small on purpose (about 30 math and 26 letter questions); three right in a row moves him up.
- Rex's model cannon doesn't swing forward like the code rig's (the beam still starts at the muzzle).
- Without WebGL, minions draw as the generic 2D toy and arenas fall back to the bedroom.
- The Bog Shack floor borrows the pier texture until Astra's floor comes back.
- The new four have no home arenas yet (Skull Cove, Midnight Pumpkin Patch, Grandma's Woods, Star Fortress Bridge are specs only), and no sitrep coverage (`docs/SITREP_2026-10-14.pdf` predates them).
- Resizing the laptop window invalidates the select-card portrait cache (the card pixel size is part of the key), so the next visit re-renders them (~430 ms). Harmless on the phone.
