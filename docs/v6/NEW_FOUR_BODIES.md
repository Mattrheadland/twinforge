# v6: a unique body for each of the new four (for Founder review)

Branch `v6/new-four-bodies`. Not merged, not deployed. Internal ids, names, moves and saves are unchanged.

## Why
Founder, 2026-10-16: "Jack knife better but still too generic looking. Each of the new 4 needs unique body shape & build."

Astra's painted turnarounds (`assets/characters/*/…-turnaround.png`) drew all four on one template: the same upright stance, proportions, legs and boots, just different costumes. The code rigs copied that template. These rebuilds keep each costume, colours and props, and give each toy its own body plan.

| Toy | Body plan | Moves like |
|---|---|---|
| Capt'n Crookhook | Pot-bellied barrel captain: narrow shoulders over a wide round belly, short legs with a wooden peg on the camera side, coat flaring only behind, oversized tricorn, the beard spilling over his chest like a bib | Rocks on the peg, chest puffs, coat flicks back on lunges |
| Jack-Knife | Bone puppet: a giant pumpkin (about three times his shoulder width) on a stick-thin frame, long bare spine curled forward into a hunch, arms hanging past his knees, knees bent and turned in, big curled boots | Arms swing on their own clocks, the pumpkin wobbles on the neck, bones rattle when hit, Fold Up folds him into a ball, Rattle Kick is a real high kick |
| Big Bad Wolfgang | Upright wolf, not a man in a suit: reverse-jointed wolf legs (stands on his toes, heel high), deep chest and puffed coat shoulders over a narrow waist, whole spine hunched so the head and long muzzle lead, long arms with heavy clawed paws, big bushy tail | Heavy breathing, sniffs, tail sways, ears flatten when hit, springs off the back leg on lunges |
| Galactic Hunter | Walking fortress: layered, spiked pauldrons that make him nearly as wide as he is tall, a small horned helmet sunk between collar plates, massive gauntlets, short thick legs planted wide, halberd taller than he is, cape, jet pack | Moves like a machine: stepped bob, helmet snaps between scan angles, reactor pulses |

## Evidence
- `new-four-gameplay-before-after.jpg`: real battles, main vs this branch.
- `silhouettes-before.png` / `silhouettes-after.png`: colour and black silhouette at 3/4, side and front, with Battle Rex and Young Arthur for reference.
- `new-four-poses.jpg`: guard, attack and victory poses.

Worst-angle outline overlap (0–1, lower = more distinct; same height, same footing):

| Pair | Before | After |
|---|---|---|
| Wolfgang / Galactic Hunter | 0.85 | 0.58 |
| Crookhook / Galactic Hunter | 0.76 | 0.60 |
| Crookhook / Jack-Knife | 0.73 | 0.44 |
| Jack-Knife / Wolfgang | 0.69 | 0.43 |
| Jack-Knife / Galactic Hunter | 0.65 | 0.28 |
| Crookhook / Wolfgang | 0.75 | 0.73* |

\*Front view only. From the side they're 0.35 (peg leg and round belly vs reverse-jointed legs, hunch and tail). From the front, both are wide shapes of the same height, so the score can't see the difference between a pot-belly under a tricorn and a V-shaped chest under tall ears. Judge that pair from the pictures.

## Honest limits
- Still code-built toys. The shapes are now distinct, but the surface finish is the same low-poly toon look as before. The premium finish the v6 directive asks for comes from proper models: painted sheets → Hunyuan 3D → `npm run model:import`. The current sheets carry the old template's anatomy, so they'd need redrawing to match these body plans first. These rigs make good reference renders for that.
- Not timed on a phone yet. Part counts are similar to before (Galactic Hunter a little higher, Jack-Knife lower).
- HUD portrait framing re-tuned for Crookhook and Galactic Hunter.
