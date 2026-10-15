# TwinForge master handoff (start here)

Last updated 2026-10-15, 5 PM. `main` is ahead of the live site: the music engine, arena tracks, Czernobog's piece and storm are committed but NOT deployed (Matt is reviewing the renders). Everything before the music (spelling ladder, specials, power moves, portraits, sounds) is live.

## How to start a new chat
Paste this:

> TwinForge: continue the build. Clone Mattrheadland/twinforge, read docs/HANDOFF.md first, then docs/NEXT_STEPS.md, docs/STYLE_GUIDE.md and docs/ASSET_PIPELINE.md. Pick up at "Next up" in HANDOFF.md. Matt is the creative director; you run the studio. Constant status updates.

## DEADLINE: a full, polished, playable game (all modes incl. campaign) deployed by 8 PM ET on 2026-10-15. Whatever is not done by then keeps going afterwards.

## Matt's direction from today (2026-10-15 afternoon), in his words where it matters
- **Music**: "needs to absolutely crank." Fighting music and adventure themes, catchy, not Pokémon, and "not Nintendo Game Boy music from the 90s"; "a sophisticated video game." The chiptune engine was replaced by `src/audio/synth.js` (supersaw, bass, sub, pad, brass, pluck, bell, modern drum kit, reverb, delay, sidechain). He heard round 2 (title, battle, boss, board, victory on the new engine): "way better." He wants **several different tracks so it's not the same music all the time** (done: one battle track per arena + boss + Czernobog, see below) and is open to improving the existing ones further. Renders of the five newest tracks are in `scratch/music-*.wav` (rendered by `scratch/render-music.mjs`), not yet heard by Matt.
- **Produced music option**: ChatGPT does not make music. Suno free: ~10 songs/day but downloads only for accounts made before 2026-09-03 (7 trial downloads for life), non-commercial. Udio free: 1–3 songs/day, downloads intermittent. Ask Matt whether he has an older Suno account; if yes, 5 tracks (title, battle, boss, board, Czernobog) via his Chrome, dropped in as `TRACKS[name].file` (mp3 loop support with loop points and synth fallback is already in `audio.js`). Matt offered style references; ask for them (game titles per mood).
- **Czernobog**: the ultimate villain. His music must resemble *Night on Bald Mountain* (Mussorgsky 1867 / Rimsky-Korsakov 1886, public domain; Disney's 1940 Fantasia arrangement is NOT to be copied). `czernobog` track written in that idiom. His fight gets its own screen effects (storm: purple vignette, embers, lightning + thunder, in; still to add: fire underglow pulsing with the kicks, rising spirit wisps, heavier shake and a red flash on his special). Visual/environment mood reference, for reference only: the Kingdom Hearts 1 Chernabog fight (giant on a peak, black sky, dark cloud sea, fire glow from below, spirits streaming up). Lore reference, as spin-offs never copies: Fantasia's ghost storm, dancing fire minions, and dark shadow minions. Our originals: Shadow Imp and Jitterbones exist; add **fire dancers** (flame bodies with little arms and a grin) and **shadow peekers** (flat-eyed silhouettes rising from the ground). Never faces or shapes from Disney or Square Enix.
- **Campaign board, "Mario Party-style"**: a fully animated board with a free camera. (1) Free look: pinch to zoom, drag to pan, wheel + drag on the laptop; snaps back to the piece on the next roll; a recenter button. (2) Czernobog alive on his mountain: full 3D toy on the peak, idle animation, glowing summit, embers, lightning over that end of the board, so zooming there shows him waiting. (3) Ambient life everywhere: water shimmer, waving flags and banners, lighthouse beam, swaying reeds and trees, fireflies, pulsing moon; wild creatures and bosses bob and idle on their spaces (standees first, real 3D where smooth). (4) A short fly-over when the board opens; a swoop to the boss on landing on a boss space. (5) **Cutscenes between turns**: every few rounds a 3–5 s skippable cinematic: camera swoops to the mountain, Czernobog stirs (roar, lightning, summit flare) and darkness spreads across the board (water darkens island by island, more wisps and fire dancers, redder sky), escalating with how many worlds Luca has cleared.
- **Spelling**: real 3–5 letter words, not letter matching (done: the spelling ladder).
- **Portraits**: all aligned, Billy Bass no longer cut off (done).
- Matt wants **constant status updates** and plain "blocked" calls. Helper agents: he now says to split into multiple agents (a "digital game studio") where it saves time; his permission prompt may still decline them, so ask once and fall back to solo.

## Studio plan (agents, if the harness allows them)
- **Lead / integrator (this chat)**: owns `main`, tests, deploys, HANDOFF. Merges the others' work.
- **Board agent**: `src/render3d/board3d.js`, `src/ui/board-ui.js`: free look camera, fly-over, ambient animation, Czernobog on the peak, cutscenes. Must keep `test/e2e.mjs` board tests and `test/campaign-run.mjs` passing and 60 fps on the iPhone/laptop.
- **Villain agent**: Czernobog fight effects (underglow, wisps, special flash), fire dancers and shadow peekers (`src/render3d/minion-rigs.js` style, cheap), `docs/lore/czernobog.md`.
- **Music agent**: tune tracks from Matt's notes; optional Suno pipeline when the laptop is on. `scratch/render-music.mjs <name,name>` renders any track to WAV for review.
- **QA agent**: `npm test`, `npm run e2e` (run alone), `node test/campaign-run.mjs tree@desktop nightwing@iphone`, perf; laptop timing pass when Chrome is visible.
Each agent commits small, with tests, as Matt Headland; the lead deploys.


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
| Music | `src/audio/music.js` (tracks on a 16th grid; `battleTrackFor(arenaId, boss)`), `src/audio/synth.js` (voices, fx, modern kit), sequencer + mp3 loop player in `audio.js`; render any track: `node scratch/render-music.mjs battle,boss` |
| Czernobog storm | `Director.setStorm()` in `src/game/director.js`; `stage.vignette`; sfx `thunder` |
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

## Next up (ordered for the 8 PM deploy)
1. **Deploy what's on main once Matt OKs the music** (he has heard round 2 and liked it; send him the renders of the four arena tracks + Czernobog, `scratch/music-*.wav` → mp3). If he hasn't answered by 7:30 PM, deploy anyway: round 2 is already approved and the new ones are the same engine.
2. **Board free look** (pinch/drag/wheel, snap-back, recenter) and **Czernobog alive on the peak**. Deploy by ~7:15 PM.
3. **First ambient layer** on the board: water shimmer, flags, bobbing creatures. Deploy with 2 if it fits.
4. **Czernobog fight extras**: fire underglow pulsing on kicks, spirit wisps, special flash/shake.
5. After 8 PM, keep going: fire dancers and shadow peekers; fly-over and boss swoop; between-turn cutscenes with escalating darkness; all creatures as bobbing/3D figures; remaining ambient props.
6. Matt's inputs when he has them: music verdicts per track and style references; Suno account age; Luca's learning report (spelling ladder tuning); sounds mp3 verdict.
7. Laptop (any time Chrome is in front): 8-min timing pass (Jack-Knife, Wolfgang, Payne, mouse campaign); Bog Shack floor from the ChatGPT project; Astra packs → Hunyuan for the new four (separate evening).

## Known gaps
- Read-aloud can't be tested headless; it uses the iPhone's built-in voice (Web Speech API) and needs a real-device check.
- Level 1 is small on purpose (about 30 math and 26 letter questions); three right in a row moves him up.
- Rex's model cannon doesn't swing forward like the code rig's (the beam still starts at the muzzle).
- Without WebGL, minions draw as the generic 2D toy and arenas fall back to the bedroom.
- The Bog Shack floor borrows the pier texture until Astra's floor comes back.
- The new four have no home arenas yet (Skull Cove, Midnight Pumpkin Patch, Grandma's Woods, Star Fortress Bridge are specs only), and no sitrep coverage (`docs/SITREP_2026-10-14.pdf` predates them).
- Resizing the laptop window invalidates the select-card portrait cache (the card pixel size is part of the key), so the next visit re-renders them (~430 ms). Harmless on the phone.
