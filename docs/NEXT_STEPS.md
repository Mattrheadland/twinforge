# Work in progress: move engine (branch wip-move-engine)

Done on this branch (not deployed; main/live game unchanged):
- src/logic/battle.js: 4-move system (quick/power/guard/special), guard types block/reflect/dodge, special effects dizzy/shield/heal, quality 'none' when Learning is off. Battle save version 2.
- src/data/characters.js: Battle Rex, Spooky Tree, Ragin' Rockfish, Young Arthur, plus two ORIGINAL stand-ins (Wanda Wickwhistle witch, Gloomwing night creature) with their moves. Hocus Pocus and The Chernabog are not modeled as-is (Disney characters).
- src/logic/challenges.js: math (count, shape, most/fewest, pattern, numeral, add, sub) and reading (letter, starts-with, rhyme, word→picture) over 5 levels; fuzz-tested.
- src/ui/challenge.js + icons: renderer for every challenge type, move icons.

Still to do:
1. HUD: 2×2 move menu (replace 3 buttons), energy on special, learning badges.
2. battle-controller + director: wire moves, learning toggle (settings.learning), per-move animations, foe uses its own moves, 6 specials.
3. Settings toggle "Learning questions", select screen grid for 6 characters, CSS for new challenge types.
4. 3D rigs for the 6 characters from the reference sheets (not in repo: photos/sheets stay private).
5. Update tests + e2e, deploy.
