# Design fix 1: learning off is a fair battle mode

Status: draft PR, waiting on Matt. Flaw 1 of the Nov 2026 research doc.

## Problem
With learning questions off, a power move hit for 20 and a special for 35 (a perfect answer was 22 / 38, a wrong one 14 / 28), and the foe's charge meter never moved. In the sim learning off won 100% of fights, giants included. Turning learning off was a cheat button, and a wrong answer did less than not answering at all.

## Change
1. One damage formula for both modes: `hit = base x skillBonus` (logic/battle.js). Base power 16, special 28. Bonus: first try 1.4, second try 1.15, cheer 1.15, miss / shown the answer / no input 1.0. A wrong answer now hits for the full base, never less than learning off.
2. Same foe in both modes: same turn pattern, same charge meter, same wind-up and charged attack.
3. Learning off asks for a little skill on power moves and specials (logic/skill-input.js, ui/skill-input.js):
   - Growing learner (5-7): a timing ring that lands on the move button on a slow beat (1.6 s), generous window (spot on within 0.14 s, close within 0.32 s), three beats before it counts as a miss. Misses light the meter like wrong answers.
   - Early learner (3-5), or anyone with "Timing taps" switched off: one big cheer star, no timing. Always a modest bonus; every second cheer lights one pip of the foe's meter (the foe gets braver), so guard still matters and the mode can be lost.
4. Same XP in both modes: a learning-off input earns the toy and player XP of the matching answer quality. Nothing goes in the learning log.
5. Grown-up settings: the "Learning questions" note explains the fair off mode; new "Timing taps (learning off)" toggle (default on).
6. FAST special (gear) power 0.62 -> 0.68 to stay within the gear balance test after power's base went 14 -> 16.

## Out of scope
Wrong taps on the youngest band still light the meter in learning on (flaw 5). Question content and levels (fix 2). First session (fix 3). Evolution pacing (flaw 4).

## Acceptance criteria
- [x] `node --test test/*.test.mjs` passes (144 tests).
- [x] test/balance-off.test.mjs: learning off with the ring is never easier than answering at the same accuracy; random tapping loses some fights; cheer giants are no easier than a child answering half right; no learning-off giant fight is a sure win.
- [x] Existing learning-on bands in test/balance.test.mjs still hold.
- [ ] Played on a phone: ring and cheer star readable, spoken, big enough for small hands (needs a build; not run here).

## Sim, before and after (win rate, 396 battles a cell, giants 264)
| | Before: on | Before: off | After: on | After: off |
|---|---|---|---|---|
| Early, 90% right | 100 | 100 | 100 | 100 (cheer, 8.3 turns vs 6.7 answering) |
| Early, giants at 50% | 84.5 | 100 | 83.7 | 87.1 (cheer) |
| Growing, 50% right | 93.7 | 100 | 95.2 | 95.2 (ring) |
| Growing, random taps | 65.2 | 100 | 68.9 | 48.0 (ring) |
| Growing, giants at 50% | 65.9 | 100 | 67.4 | 67.4 (ring), 68.9 (cheer) |
