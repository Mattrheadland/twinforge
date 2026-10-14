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

## Next
1. **Option A: characters as real 3D models.** Turn each turnaround in `assets/characters/` into a `.glb` with an image-to-3D tool, load it with the toon shader and outlines, and rig or animate it for idle, attack, hit, guard, special, win and tired. Start with Battle Rex as the test case, then the rest. Remy Roo and Billy Bass are new and need moves and stats.
2. **Arenas:** build Castle, Fishing Pier, Haunted Forest and Bog Shack from `assets/arenas/` (backdrop plane + tiled floor + props) and add an arena pick or rotation. Bog Shack still needs a floor texture.
3. **UI and effects art:** swap the code-drawn effects and menu frames for `assets/ui/` sheets where they look better.
4. Matt plays it with Luca and reports moves or questions that feel off. Confirm or rename Wanda Wickwhistle and Gloomwing.
5. Then game modes (campaign / tournament / arcade).
