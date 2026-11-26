# Design fix 2: a question ladder for ages 3 to 10

Goal: questions stopped around Pre-K to grade 1 (levels 1-5, all 3 choices), so a 7-10 year old had nothing to grow into. Extend the ladder to L1-L6, and adapt per skill strand so one weak spot doesn't hold a whole subject back.

## What changes
- Levels 1-8, shown to a grown-up as L1-L6 (`LADDER` in logic/challenges.js): L1-L3 are the old levels 1-5, L4-L6 are new.
  - Math L4 (6-7): add and take away to 20, missing number, tens and ones. L5 (7-8): to 100, equal groups, skip counting. L6 (8-10): times tables, sharing, fractions, two-step stories.
  - Reading L4: sh/ch/th, read a sentence. L5: longer words, story questions. L6: same/opposite words, read a paragraph and answer.
  - New types have 4 choices (logic/challenges-upper.js); the UI shows a fourth colour and a text card for sentences.
- A third pathway, Older learner 8-10, plays levels 5-8. Growing now reaches level 6 (L4); Early is unchanged.
- Per-strand skill (logic/elo.js): every question kind keeps its own rating. P(first try) = g + (1-g)·sigmoid(k(rating - level)), g = 1/choices; step U(n) = 1/(1 + 0.05n).
  - Kinds near the pathway target (0.85 Early, 0.8 Growing, 0.75 Older) come up more often; every kind keeps some chance.
  - A strand predicted under 50% is asked one level easier, quietly. Those answers don't step the subject level up.
- The parent panel shows the rung with each level ("L4: Add & take away to 20...") and the three pathways.

## Out of scope
- Strand lines in the parent report ("Mastered / Practising / Tricky"): the ratings are saved now, the report reads them next.
- Spoken lines for the new prompts beyond device text-to-speech; pictures for paragraph questions.
- Learning off (PR #15) and the first session (fix 3).

## Acceptance criteria and checks
Run `node --test test/*.test.mjs` (no install needed): 156 pass.
- test/ladder.test.mjs: L1-L6 map; L4-L6 valid, 4 choices, one right; Older band; Elo behaviour; strands are separate; quiet step down; kind choice leans to target; a simulated 9-year-old with one weak strand gets 65-90% first try and the weak strand is eased.
- test/questions.test.mjs: every type at every level 1-8 gives a full card; no repeats at L5/L6.
- test/balance.test.mjs and test/balance-off.test.mjs: Older band added, both modes (396 battles a cell, measured on main after PR #15):

| Pathway | 90% right | 50% right | random | giants at 50% |
|---|---|---|---|---|
| Early | 100 | 99.7 | 93.2 | 83.7 |
| Growing | 100 | 95.2 | 68.9 | 67.4 |
| Older, learning on (new) | 99.5 | 92.7 | 51.8 | 57.2 |
| Older, learning off, timing ring (new) | 99.5 | 92.7 | 35.1 | 57.2 |

Early and Growing are unchanged by this PR.

## Waiting on
- Screenshots of the 4-choice card and sentence card need a browser (`npm ci` plus a Playwright browser), which needs Matt's yes.
- Playtest: does a 7-10 year old find L5-L6 "not baby-ish"? Watch time per question and replays.
