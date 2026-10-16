# v6 character rebuild 1 of 4: Jack-Knife (for Founder review)

Branch `v6/jackknife-rebuild`. Not merged, not deployed. Internal id `jackknife`, saves untouched.

## What was wrong
The four new toys were built on the same plan: a solid column body, a full-width vest or coat, a solid cape. Measured with `scripts/silhouette-sheet.mjs` (black silhouettes scaled to the same height and stood on the same spot, then overlapped), any two of them shared 65–85% of their outline. Wolfgang vs Galactic Hunter was the worst at 85%. Rex and Young Arthur, which are proper Hunyuan models, overlap each other 40–75% depending on the angle.

## What changed (src/render3d/villain-rigs.js, buildJackKnife only)
- Stick-thin bones with gaps: open ribcage of separate ribs and a sternum, bare lumbar spine between ribs and pelvis, twin forearm bones, long fingers reaching his knees.
- Taller and lankier, oversized pumpkin head on top.
- Poster vest kept as a short open bolero so the ribs show; the solid cape is now a tall vampire collar plus ragged strips that hang apart.
- Movement: loose dangling arms and a bobbing head at idle, a real high kick on Rattle Kick, bones rattle when he's hit, and Fold Up actually folds him (knees buckle, body drops, arms wrap, pumpkin sinks into the collar).

## Numbers (overlap with each other toy, worst of three angles; lower = more distinct)
| vs | before | after |
|---|---|---|
| Crookhook | 0.73 | 0.54 |
| Wolfgang | 0.69 | 0.48 |
| Galactic Hunter | 0.65 | 0.47 |
| Young Arthur | 0.68 | 0.53 |
| Battle Rex | 0.70 | 0.53 |

Full tables: `silhouettes-before.json`, `silhouettes-after.json`.

## Evidence
- `jackknife-gameplay-before-after.jpg`: real battles (Pumpkin Patch vs Crookhook, Grandma's Woods vs Wolfgang), main vs this branch.
- `silhouettes-before.png` / `silhouettes-after.png`: colour and silhouette at 3/4, side and front.
- `jackknife-fold-up.png`: the Fold Up guard pose.

## Honest limits
- This is still a code-built toy. It fixes the shape problem; it is not the premium look the v6 directive asks for. The way the first eight toys got that look was Astra's painted sheets → Hunyuan 3D → `npm run model:import`. The painted turnarounds for all four new toys already exist in `assets/characters/`. Running them through Hunyuan needs Matt's Chrome.
- The code rig stays useful either way: it's the fallback when a model fails to load and when WebGL is off.
- Not yet checked on a real phone. The rig adds parts but drops the big cape and vest meshes; frame rate has not been measured.
- Crookhook, Wolfgang and Galactic Hunter are untouched until the direction is approved.

## Decision needed
Approve this direction (thin, see-through, character-specific anatomy) for the other three code rigs, and/or go straight to Hunyuan models for all four.
