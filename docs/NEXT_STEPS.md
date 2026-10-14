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
- **Six characters in 3D**: Battle Rex, Spooky Tree, Ragin' Rockfish, Young Arthur (from Matt's sheets), plus two originals, Wanda Wickwhistle (witch) and Gloomwing (night creature), standing in for Hocus Pocus and The Chernabog, which are Disney characters and aren't modeled as-is.
- Signature specials: Rex Cannon, Haunted Forest, Tidal Rage (wave + rockfish school), Sword in the Stone, Potion Storm, Midnight Storm (ghost storm). Gloomwing's power move is Flame Dance.

## In progress: option A (characters as real 3D models)
- **Loader shipped** (`src/render3d/models.js`): GLBs in `assets/models/<id>/` get the toon shader and ink outlines, are scaled and turned to face the foe, play clips matched to idle / attack / hit / guard / special / win / tired, pose the bones from the old pose values when a clip is missing, keep the head / center / muzzle anchors, and fall back to the code-built toy if the file is missing or broken. Tested with a stand-in rigged model.
- **Toy joints**: static models (what free image-to-3D tools export) get head / jaw / arm / tail bones cut by region (`art.joints`), so no rigging tool is needed.
- **Battle Rex**: in game as a real 3D model (Hunyuan 3D, free). Spooky Tree, Ragin' Rockfish and Young Arthur are generating; Remy Roo and Billy Bass are next (Hunyuan runs 3 jobs at a time). Claude drives Hunyuan in Matt's Chrome and pulls the GLBs from his Downloads folder.
- **Arenas**: Castle, Fishing Pier, Haunted Forest and Bog Shack are in; each opponent fights on its home turf (`src/data/arenas.js`). Bedroom stays for Rex, Remy and the title screen.
- **Effects art**: Astra's effects sheet is in as painted sprites on hits, shots, splashes, heals, dizzy and power-ups.
- **Game modes** (`src/game/modes.js`, `src/ui/modes-ui.js`): Play opens Story (every toy on its home turf, then a GIANT boss: Gloomwing, or the next in line if you're playing as it), Tournament (3 rounds, giant final, trophy), Arcade (endless streak, a giant every 5th fight), Quick Fight (pick an arena or SURPRISE!) and Toy Box (spin any toy, try its moves). Runs and records save.
- **Rex's face**: swappable eyes on both sides of his snout, so his expressions change like the code-built toys.
- **Astra**: `docs/ASTRA_REQUESTS.md` has paste-ready requests for the Bog Shack floor and Wanda / Gloomwing sheets.
- **Remy Roo** (the family dog) and **Billy Bass** (the talking wall fish) are in the roster with code-built 3D stand-ins:
  - Remy Roo: Zoomies (dash) · Big Bark (two bark blasts, math) · Roll Over (dodge) · Power Paws (glowing paw-print flurry and a pounce, then heals him: "GOOD BOY!"). 108 HP, +2 attack.
  - Billy Bass: Tail Flop · Take Me to the River (a river surge, math) · Wall Mount (block) · Encore! (music notes spin the foe dizzy). 104 HP, +2 attack.
  - The select screen is now 4 × 2.

## Next
1. Import the other five sheet characters as their Hunyuan models finish.
2. Send Astra the three requests in ASTRA_REQUESTS.md; then Wanda and Gloomwing go through Hunyuan too.
3. Matt plays the new modes with Luca and reports what's too hard, too long or confusing, and any moves or questions that feel off. Confirm or rename Wanda Wickwhistle and Gloomwing.
