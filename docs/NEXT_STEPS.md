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
- **Battle Rex**: Matt is generating him free in Hunyuan 3D (steps in ASSET_PIPELINE §4). Then: import, set joints, muzzle, face and height, check in game, then the other five sheet characters.
- **Remy Roo** (the family dog) and **Billy Bass** (the talking wall fish) are in the roster with code-built 3D stand-ins:
  - Remy Roo: Zoomies (dash) · Big Bark (two bark blasts, math) · Roll Over (dodge) · Fetch Frenzy (tennis-ball volley, then heals him: "GOOD BOY!"). 108 HP, +2 attack.
  - Billy Bass: Tail Flop · Song Blast (math) · Wall Mount (block) · Encore! (music notes spin the foe dizzy). 104 HP, +2 attack.
  - The select screen is now 4 × 2.

## Next
1. Battle Rex in game and looking right, then the other four sheet characters the same way.
2. **Arenas:** build Castle, Fishing Pier, Haunted Forest and Bog Shack from `assets/arenas/` (backdrop plane + tiled floor + props) and add an arena pick or rotation. Bog Shack still needs a floor texture.
3. **UI and effects art:** swap the code-drawn effects and menu frames for `assets/ui/` sheets where they look better.
4. Matt plays it with Luca and reports moves or questions that feel off. Confirm or rename Wanda Wickwhistle and Gloomwing.
5. Then game modes (campaign / tournament / arcade).
