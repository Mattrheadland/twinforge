# v6: a unique body for each of the new four (for Founder review)

Branch `v6/new-four-bodies`. Not merged, not deployed. Internal ids, names, moves and saves are unchanged.

## Why
Founder, 2026-10-16: "Jack knife better but still too generic looking. Each of the new 4 needs unique body shape & build."

Astra's painted turnarounds (`assets/characters/*/…-turnaround.png`) drew all four on one template: the same upright stance, proportions, legs and boots, just different costumes. The code rigs copied that template. These rebuilds keep each costume, colours and props, and give each toy its own body plan.

Round 2 (Founder, 10:22 ET): body shapes now follow the Founder's three reference images (body shape only). Clothing, colours and final outfit follow the official poster. Galactic Hunter had no reference and keeps the round-1 fortress build.

| Toy | Body (from the reference) | Outfit (from the poster) | Moves like |
|---|---|---|---|
| Capt'n Crookhook | Stocky and heavy-set: very broad chest and shoulders, thick arms held away from the body, big cuffs and fists, short sturdy legs in a wide stance, big boots. No peg leg. | Teal long coat open at the front, gold epaulets, lapels and cuffs, red sash, cream shirt, black tricorn with teal plume, white beard, eyepatch, silver hook, cutlass | Shifts his weight boot to boot, chest heaves, coat flicks back on lunges |
| Jack-Knife | Very tall and thin: legs well over half his height, a short narrow torso, narrow shoulders, long thin arms with long spidery fingers held a little out, slight stoop | Carved pumpkin head, gold vest with buttons over the ribs, vine belt, purple cape with tall collar, green-and-purple striped socks, black buckled boots | Loose and dangly, head wobbles, bones rattle when hit, Fold Up folds the long legs, Rattle Kick is a high kick |
| Big Bad Wolfgang | Lean, muscular upright wolf: long reverse-jointed wolf legs, broad chest over a narrow waist, slight forward lean, long muzzle ahead of the chest, long arms reaching mid-thigh, big clawed hands | Grey fur, cream chest ruff, red long coat open at the front with black lapels and gold buttons, dark ragged trousers, snarl | Heavy breathing, sniffs, tail sways, ears flatten when hit |
| Galactic Hunter | (round 1) Walking fortress: huge layered spiked pauldrons, small sunken helmet, wide stance | Dark armour, crimson cape, cyan reactor, red visor, plasma halberd | Stepped machine idle, helmet snaps between scan angles |

## Evidence
- `new-four-gameplay-before-after.jpg`: real battles, main vs this branch.
- `silhouettes-before.jpg` / `silhouettes-after.jpg`: colour and black silhouette at 3/4, side and front, with Battle Rex and Young Arthur for reference.
- `new-four-poses.jpg`: guard, attack and victory poses.

Worst-angle outline overlap (0 to 1, lower = more distinct; same height, same footing):

| Pair | Live game | Now |
|---|---|---|
| Wolfgang / Galactic Hunter | 0.85 | 0.49 |
| Crookhook / Galactic Hunter | 0.76 | 0.67 |
| Crookhook / Wolfgang | 0.75 | 0.56 |
| Crookhook / Jack-Knife | 0.73 | 0.34 |
| Jack-Knife / Wolfgang | 0.69 | 0.41 |
| Jack-Knife / Galactic Hunter | 0.65 | 0.24 |

Crookhook and Galactic Hunter are both meant to be broad and heavy, so their score stays the highest. From the side, his coat and hat against the pauldrons and cape still separate them (0.59).

## Honest limits
- Still code-built toys. The shapes are now distinct, but the surface finish is the same low-poly toon look as before. The premium finish the v6 directive asks for comes from proper models: painted sheets → Hunyuan 3D → `npm run model:import`. The current sheets carry the old template's anatomy, so they'd need redrawing to match these body plans first. These rigs make good reference renders for that.
- Not timed on a phone yet. Part counts are similar to before (Galactic Hunter a little higher, Jack-Knife lower).
- HUD portrait framing re-tuned for Crookhook, Jack-Knife and Galactic Hunter.
- Jack-Knife is now the tallest toy on screen; he fits in every arena captured (see the before/after grid).
