# TwinForge: status and next steps

## Shipped (2026-10-14)
- **4-move battle menu** (Pokémon-style 2×2): quick · power / guard · special. Each character has its own four moves (src/data/characters.js).
  - quick: reliable hit, no question
  - power: bigger hit, asks a **math** question when Learning is on
  - guard: block / reflect (Blazing Bark singes the attacker) / dodge; can't be used twice in a row
  - special: needs 3 energy, asks a **reading** question when Learning is on
- **Opponents fight with their own moves**, telegraph their special with a charge-up, then use it.
- **Learning on/off** (grown-up settings → Learning questions). Off = moves fire straight away.
- **New challenges** over 5 auto-adjusting levels:
  - Math: count, same shape, most/fewest, what comes next (patterns), find the group for a number, add, take away
  - Reading: letter match, upper→lower, tricky letters, starts-with, rhymes, read a word → find the picture
- **Six characters in 3D**: Battle Rex, Spooky Tree, Ragin' Rockfish, Young Arthur (from Matt's sheets), plus two originals, Wanda Wickwhistle (witch) and Czernobog (night creature), standing in for Hocus Pocus and The Chernabog, which are Disney characters and aren't modeled as-is.
- **Learning report** (grown-up settings → Learning report): every question is logged in the save (`src/logic/learning-log.js`) with its type, level, first try / after a hint / needed help, the wrong answers tapped and seconds to first tap. The report shows today / 7-day / all-time first-try rates, where each level is parked and why it last moved, a per-type table (asked, first try, last 10, think time, Solid / Learning / Tough / Slow), recent misses and slow ones, and plain-language notes. Each type can be switched off. "Copy as text" gives a summary to paste to Claude for tuning.
- **Question preview** (settings or the report): any question type at any level, exactly as Luca sees it. Nothing in preview is recorded.
- **Question fixes**: starts-with never offers K for cat or C for kite; lowercase levels 3–4 never pair a letter with its mirror twin (b/d/p/q, m/w, n/u); the level descriptions in settings now match what each level actually asks.
- Signature specials: Rex Cannon, Haunted Forest, Tidal Rage (wave + rockfish school), Sword in the Stone, Potion Storm, Midnight Storm (ghost storm). Czernobog's power move is Flame Dance.

## In progress: option A (characters as real 3D models)
- **Loader shipped** (`src/render3d/models.js`): GLBs in `assets/models/<id>/` get the toon shader and ink outlines, are scaled and turned to face the foe, play clips matched to idle / attack / hit / guard / special / win / tired, pose the bones from the old pose values when a clip is missing, keep the head / center / muzzle anchors, and fall back to the code-built toy if the file is missing or broken. Tested with a stand-in rigged model.
- **Toy joints**: static models (what free image-to-3D tools export) get head / jaw / arm / tail bones cut by region (`art.joints`), so no rigging tool is needed.
- **Battle Rex**: in game as a real 3D model (Hunyuan 3D, free). Spooky Tree, Ragin' Rockfish and Young Arthur are generating; Remy Roo and Billy Bass are next (Hunyuan runs 3 jobs at a time). Claude drives Hunyuan in Matt's Chrome and pulls the GLBs from his Downloads folder.
- **Arenas**: Castle, Fishing Pier, Haunted Forest and Bog Shack are in; each opponent fights on its home turf (`src/data/arenas.js`). Bedroom stays for Rex, Remy and the title screen.
- **Effects art**: Astra's effects sheet is in as painted sprites on hits, shots, splashes, heals, dizzy and power-ups.
- **Game modes** (`src/game/modes.js`, `src/game/campaign.js`, `src/ui/modes-ui.js`, `src/ui/board-ui.js`, `src/render3d/board3d.js`): Play opens four cards.
  - **Campaign**: a board game across five island worlds (Bedroom → Castle → Fishing Pier → Bog Shack → Haunted Forest). Roll a 1–3 die, hop the spaces, fight wild creatures, grab stars, beat each world's boss (boss spaces are gates). Czernobog waits as a GIANT at the end, in front of his mountain. Play as a boss and that boss space becomes a giant of your own creature. The board is a 3D diorama with your real toy as the piece; a flat DOM board is the no-WebGL fallback.
  - **Tournament**: beat every other toy on its home turf, then a GIANT boss. Trophy at the end.
  - **Arcade**: pick your toy, the opponent (or SURPRISE) and the arena (or SURPRISE), then fight.
  - **Toy Box**: spin any toy and try its moves.
- **Wild creatures** (minions, `src/data/characters.js` + `src/render3d/minion-rigs.js`): Rexlet (Rex), Spooky Sprout (Tree), Rock Minnow (Rockfish), Little Squire (Arthur), Bog Frog (Wanda), Sneaky Squirrel (Remy), Bubble Crab (Billy), and Czernobog's night crew: Shadow Imp and Jitterbones. Each is a cheap code-built toy (a couple dozen boxes and cones), not playable.
- **Rex's face**: swappable eyes on both sides of his snout, so his expressions change like the code-built toys.
- **Astra**: `docs/ASTRA_REQUESTS.md` has paste-ready requests for the Bog Shack floor and Wanda / Czernobog sheets.
- **Remy Roo** (the family dog) and **Billy Bass** (the talking wall fish) are in the roster with code-built 3D stand-ins:
  - Remy Roo: Zoomies (dash) · Big Bark (two bark blasts, math) · Roll Over (dodge) · Power Paws (glowing paw-print flurry and a pounce, then heals him: "GOOD BOY!"). 108 HP, +2 attack.
  - Billy Bass: Tail Flop · Take Me to the River (a river surge, math) · Wall Mount (block) · Encore! (music notes spin the foe dizzy). 104 HP, +2 attack.
  - The select screen is now 4 × 2.

## Next
1. Import the other five sheet characters as their Hunyuan models finish.
2. Send Astra the three requests in ASTRA_REQUESTS.md; then Wanda and Czernobog go through Hunyuan too.
3. Matt plays the new modes with Luca, then sends the learning report ("Copy as text") plus what felt too hard, too long or confusing, and any moves or questions that feel off. Confirm or rename Wanda Wickwhistle and Czernobog.
