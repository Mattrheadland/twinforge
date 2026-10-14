# TwinForge audit, checklist and performance plan (2026-10-14)

## 1. Target criteria
Pulled from Matt's requests, STYLE_GUIDE v5 and the project rules.

| # | Criterion | Source |
|---|---|---|
| T1 | Plays on iPhone 16 Pro in landscape as a home-screen web app; saves survive closing | NEXT_STEPS / memory |
| T2 | Low-poly early-3D toys with '80s three-tone shading and ink outlines; retro HUD + CRT | STYLE_GUIDE v5 |
| T3 | Every toy has 4 moves (quick, power, guard, special) that fit its look and lore | Matt |
| T4 | Learning challenges (math on power, reading on special) with a grown-up on/off toggle | Matt |
| T5 | Kid-facing screens work with pictures; no reading needed to play | STYLE_GUIDE |
| T6 | No toy photos in the repo or game; Hocus Pocus / Chernabog stay as original stand-ins | Rules |
| T7 | Modes: Arcade = pick toy, opponent and arena, then fight. Tournament = beat every toy, then the boss. Campaign = board game against wild creatures (minions) and every boss, ending with Czernobog | Matt, 2026-10-14 |
| T8 | Minions: at least one per main character, fit its lore, cheap and simple to build. Czernobog's crew: dancing shadow imps and skeletons (Matt's reference, our own kid-friendly designs) | Matt, 2026-10-14 |
| T12 | Campaign board looks like a little 3D diorama: low-poly islands over water, octagon spaces, path, toy pieces (Matt's five board references) | Matt, 2026-10-14 |
| T9 | Real 3D models from the turnaround sheets via a free tool, falling back to the code-built toy | Option A |
| T10 | npm test before every push; commits by Matt Headland | Rules |
| T11 | Smooth on the phone: no visible stutter in battle, board or menus | Implied |

## 2. Audit (state before this round)

| Area | Finding | Status |
|---|---|---|
| T6 photos | `git ls-files` has no photos; only sheets, arena art, UI sheets, one GLB | OK |
| T6 stand-ins | Wanda Wickwhistle and Czernobog are original code-built designs | OK |
| T2 models | Only Battle Rex is a real model (6k tris, toy joints, swappable eyes); five more are generated and waiting on the PC | In progress |
| T2 models | Rex Cannon: the model's cannon doesn't swing forward like the code rig's; the beam still starts at the muzzle anchor | Known, minor |
| T2 arenas | Four painted arenas + bedroom; Bog Shack floor borrowed from the pier (tinted) | OK; Astra request out |
| T2 2D fallback | Without WebGL there are no arenas or models (bedroom only); new minions need a 2D look | Fix: generic 2D minion |
| T7 modes | Current modes don't match the new definition: Story should be Tournament; Arcade is an endless streak; Quick Fight should be Arcade; no Campaign board | **Fix** |
| T8 minions | None exist | **Build** |
| T5 menus | Mode, arena, map and gallery screens are icon-first with pixel labels | OK |
| T1 saves | Runs and records save; old saves migrate (unknown run shapes are dropped safely) | OK; re-check after mode rename |
| T10 tests | 29 unit tests, 49 e2e checks | Extend for the board and minions |
| T11 perf | Headless with 4x CPU throttle: imported Rex draws about as fast as code toys at 6k triangles | OK; add board + leak checks |
| Bug | Billy Bass's far eye never updated its expression | Fixed this session |

## 3. Implementation checklist
- [x] Modes renamed and rebuilt: **Campaign** (board), **Tournament** (every toy, then giant boss), **Arcade** (pick toy → opponent or Surprise → arena or Surprise → fight), **Toy Box**
- [x] Minions data: 9 wild creatures, at least one per main character (Czernobog has Shadow Imp + Jitterbones), with lore, 4 themed moves, ~55–60 HP, softer hits, no specials
- [x] Minion 3D rigs: one cheap builder per creature from boxes/cones/spheres (≤ ~25 parts), painted-eye decal, same pose interface
- [x] Board: fixed 5-zone path (Bedroom → Castle → Fishing Pier → Bog Shack → Haunted Forest), fight / star / lucky / boss spaces, boss gates you can't roll past, Czernobog giant at the end
- [x] Hero-is-boss rule: that boss space becomes a GIANT version of the hero's own minion (final boss falls back to giant Spooky Tree if you play as Czernobog)
- [x] Board screen: 3D island diorama (render3d/board3d.js) with the hero's real toy as the piece, foe standees, follow camera, sky and water shifting per world, Czernobog's mountain at the end; DOM board kept as the no-WebGL fallback; hero token, big die (1–3, pips for counting), hop-by-hop counting, FIGHT button on a fight space, star bursts
- [x] Board battles: zone arena, minion size, win clears the space, lose returns to the board (no penalty), progress saved; campaign clear → trophy and record
- [x] Arcade opponent pick with a Surprise card; arena pick reused
- [x] Save migration for the renamed modes and records
- [x] Unit tests: board layout, rolls stop at boss gates, hero-is-boss swap, minion balance (every hero beats every minion), mode runs
- [x] e2e: modes screen, Arcade flow, Tournament map, Campaign roll/hop/fight/return, gallery
- [x] Docs: NEXT_STEPS, ASSETS, this file (Project + repo)

## 4. Performance test plan
Automated (`npm run perf`, headless Chromium with 4x CPU throttle, iPhone-landscape viewport at DPR 3; software GL, so compare scenes rather than trust absolute numbers):

| Check | Budget |
|---|---|
| Median frame, battle scenes (bedroom code toys; Rex model in bedroom, castle, forest; giant fight; minion fight) | No scene more than 1.5x the bedroom code-toy baseline |
| Median frame, campaign board screen (3D diorama) | ≤ the bedroom baseline |
| Leak check: switch arenas and fighters 20 times, through the campaign board every fifth switch | GPU geometries and textures return to within +5 of the starting count |
| Asset sizes | Each GLB ≤ 600 KB; each arena folder ≤ 1 MB; index.html ≤ 1 MB |

Manual on the iPhone (grown-up panel → "Show FPS"):
1. Campaign board: roll and hop for a minute; no hitches.
2. Battle in each arena with Rex (the model) vs a minion and vs a giant; FPS stays near 60, worst frame under ~50 ms.
3. Tournament map → fight → map five times; no slowdown over time.
4. Lock the phone mid-battle, reopen: the battle resumes; close the app on the board: the board resumes.

## 5. Results (2026-10-14, cloud run)

| Check | Result |
|---|---|
| Unit tests (`npm test`) | 43/43 pass (after merging the learning-report chat) |
| e2e (`test/e2e.mjs`) | 66/66 pass twice in a row, no page errors (a roll-vs-fight race in the test was fixed) |
| Median frame, bedroom code toys (baseline) | 50.0 ms |
| Rex model: bedroom / castle / forest giant / bog minion | 66.6 / 50.0 / 50.1 / 50.0 ms (worst 1.33x baseline, under the 1.5x budget) |
| Campaign board (3D diorama) | 50.0 ms median, p95 116.6 ms (= baseline) |
| Leak check | geometries 186 → 186 → 186, textures 29 → 37 → 37 (arena art cached on purpose in lap 1, then flat) |
| Sizes | index.html 933 KB · battle-rex.glb 469 KB · arenas 66–902 KB |

Headless numbers are software GL with a 4x CPU throttle, so they only compare scenes. The iPhone steps in section 4 still need Matt's phone.

Found and fixed during the run:
- GPU leaks: Room3D was never disposed; code-toy outline hulls were skipped on dispose; each Rex rebuild left a bone texture (skeleton) behind; the board's painted eyes and standees are disposed with it.
- Board diorama: outlines were added before props were scaled, which made giant black shards; scale now goes in first.
- Without WebGL, minions draw with the generic 2D toy (Blocko). Fine for a fallback; nobody plays that way on the iPhone.

## 6. Learning pool round (2026-10-14, evening)
Target: enough variety that Luca learns the skill instead of memorising answers, plus early spelling.

| Check | Result |
|---|---|
| Question types | 22 (was 11): +quick look, one more/less, missing number, bigger/smaller, story problems, teen numbers; +pick-a-picture starts, ends with, missing letter, sight words, spelling |
| Distinct questions per subject (6,000 draws, unit test) | math 281 / 493 / 970 / 821 and reading 182 / 327 / 360 / 312 at levels 2–5; level 1 is ~30 / 26 on purpose |
| Repeats | none within the last 25 per subject (unit test, 200 questions per level) |
| Second tries | missed skill returns after 3–5 questions in a new form, max twice (unit test) |
| Picture words | every word has an emoji and starts/ends/rhymes as listed (unit test); ambiguous pictures removed (ladybug, panda, rabbit, gift, fork, pan, hen, van…) |
| Unit / e2e | 54/54 · 77/77 twice (every type renders and is answered in e2e, spelling letter by letter) |
| Perf | all scenes within 1.0x of baseline; leak check flat; index.html 972 KB (budget 1 MB) |
| Not testable headless | the read-aloud voice (needs an iPhone check) |
