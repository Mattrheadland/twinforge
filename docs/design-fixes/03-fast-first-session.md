# Design fix 3: one tap to the first fight

Goal: a brand-new player tapped 6-8 times through text menus (Play, who's playing, modes, toy, foe, go) before doing anything. Get a 3-year-old from launch to the first action in one tap, with a fight they can't lose.

## What changes
- logic/first-session.js: `isFirstSession(data, playerCount)` is true for a lone player who has never fought and has no fight saved. `FIRST_BATTLE` is Battle Rex vs Spooky Tree in the bedroom.
- On that player's first Play, the title goes straight into a guided battle (main.js `startFirst`). The title already shows those two toys. The Play tap stays: phones only allow sound and speech after a tap.
- Guided battle rules (logic/battle.js, `guided: true`): foe health x0.5, foe hits x0.5, the charge meter never moves, and the hero's health stops at 1 ("the foe gets tired"). It saves and resumes like any battle.
- The helper hand's steps are spoken in the guided fight: "Tap the glowing button to attack!", the star when it's full, the shield before a big hit, and "You did it! You won your first battle!".
- The win counts normally, so the next Play goes through the usual menus, and Again starts a normal fight.

## Out of scope
- Moving profile and age setup behind the parent gate after the first fight (the default player is used; a grown-up can rename and set the pathway any time under Players).
- A scripted first evolution in battle 2-3 (skill 6a).
- Recorded voice lines; this uses device text-to-speech like the questions.

## Acceptance criteria and checks
Run `node --test test/*.test.mjs` (no install needed): 149 pass on this branch (rebased on main after PR #15).
- test/first-session.test.mjs: first-session rules (new lone player only; not with a saved fight, a past battle or several players); guided health; meter never moves; hero never knocked out.
- Sim, 200 guided fights per row, all won, no charged attacks. Hero turns median / longest: half right 4 / 6, mostly right 3 / 5, random taps 6 / 9. The same fight unguided: 8 / 11, 6 / 9, 11 / 16. With learning off, the guided fight uses the same timing ring or cheer tap as any fight.
- Taps from launch to first action: 1 (Play), down from 6-8. Needs a phone or browser check before merge.

## Decision to confirm
The Oct 16 rule "Play always asks who's playing first" is skipped only for a lone brand-new player's first fight. A household with two or more players still sees "who's playing?" first.
