# TwinForge: status and next steps

## Shipped (2026-10-14)
- **4-move battle menu** (Pokémon-style 2×2): quick · power / guard · special. Each character has its own four moves (src/data/characters.js).
  - quick: reliable hit, no question
  - power: bigger hit, asks a **math** question when Learning is on
  - guard: block / reflect (Blazing Bark singes the attacker) / dodge; can't be used twice in a row
  - special: needs 3 energy, asks a **reading** question when Learning is on
- **Opponents fight with their own moves**, telegraph their special with a charge-up, then use it.
- **Learning on/off** (grown-up settings → Learning questions). Off = moves fire straight away.
- **Learning questions: 22 types over 5 auto-adjusting levels** (`src/logic/challenges.js`, words in `src/logic/words.js`):
  - Math: count, quick look (dots flash then hide), same shape, most/fewest, patterns, find the group, one more / one less, missing number in a row (counting up and down), bigger / smaller number, add, take away, toy story problems ("Rex has 3 balls…"), teen numbers on ten-frames
  - Reading: letter match, starts with (picture → letter), which picture starts with a letter, ends with, rhymes (26 families), missing letter (_at, ca_, c_t), read a word (41 words), sight words (44), spelling (letter by letter)
  - About 120 picture words, several per letter, chosen so the picture is named the way the answer expects
  - **No repeats**: the last 25 questions of each subject aren't asked again. **Second tries**: a missed skill comes back 3–5 questions later in a new form (missed "B" in starts-with comes back as "which picture starts with B"), up to twice
  - **Read aloud**: the phone's voice reads each question (speaker button to hear it again; grown-up toggle "Read questions aloud")
  - A tap that lands on an answer in the first 0.8 s doesn't count (kids hammer the move button)
- **Six characters in 3D**: Battle Rex, Spooky Tree, Ragin' Rockfish, Young Arthur (from Matt's sheets), plus two originals, Wanda Wickwhistle (witch) and Czernobog (night creature), standing in for Hocus Pocus and The Chernabog, which are Disney characters and aren't modeled as-is.
- **Learning report** (grown-up settings → Learning report): every question is logged in the save (`src/logic/learning-log.js`) with its type, level, first try / after a hint / needed help, the wrong answers tapped and seconds to first tap. The report shows today / 7-day / all-time first-try rates, where each level is parked and why it last moved, a per-type table (asked, first try, last 10, think time, Solid / Learning / Tough / Slow), recent misses and slow ones, and plain-language notes. Each type can be switched off. "Copy as text" gives a summary to paste to Claude for tuning.
- **Question preview** (settings or the report): any question type at any level, exactly as Luca sees it. Nothing in preview is recorded.
- **Question fixes**: starts-with never offers K for cat or C for kite; lowercase levels 3–4 never pair a letter with its mirror twin (b/d/p/q, m/w, n/u); the level descriptions in settings now match what each level actually asks.
- Signature specials: Rex Cannon, Haunted Forest, Tidal Rage (wave + rockfish school), Sword in the Stone, Potion Storm, Midnight Storm (ghost storm). Czernobog's power move is Flame Dance.

## In progress: option A (characters as real 3D models)
- **Loader shipped** (`src/render3d/models.js`): GLBs in `assets/models/<id>/` get the toon shader and ink outlines, are scaled and turned to face the foe, play clips matched to idle / attack / hit / guard / special / win / tired, pose the bones from the old pose values when a clip is missing, keep the head / center / muzzle anchors, and fall back to the code-built toy if the file is missing or broken. Tested with a stand-in rigged model.
- **Toy joints**: static models (what free image-to-3D tools export) get head / jaw / arm / tail bones cut by region (`art.joints`), so no rigging tool is needed.
- **Real 3D models in game**: Battle Rex, Young Arthur, Ragin' Rockfish and Spooky Tree (Hunyuan 3D, free). Remy Roo and Billy Bass are generating (Hunyuan runs 3 jobs at a time). Claude drives Hunyuan in Matt's Chrome and pulls the GLBs from his Downloads folder.
- **Arenas**: Castle, Fishing Pier, Haunted Forest and Bog Shack are in; each opponent fights on its home turf (`src/data/arenas.js`). Bedroom stays for Rex, Remy and the title screen.
- **Effects art**: Astra's effects sheet is in as painted sprites on hits, shots, splashes, heals, dizzy and power-ups.
- **Game modes** (`src/game/modes.js`, `src/game/campaign.js`, `src/ui/modes-ui.js`, `src/ui/board-ui.js`, `src/render3d/board3d.js`): Play opens four cards.
  - **Campaign**: a board game across five island worlds (Bedroom → Castle → Fishing Pier → Bog Shack → Haunted Forest). Roll a 1–3 die, hop the spaces, fight wild creatures, grab stars, beat each world's boss (boss spaces are gates). Czernobog waits as a GIANT at the end, in front of his mountain. Play as a boss and that boss space becomes a giant of your own creature. The board is a 3D diorama with your real toy as the piece; a flat DOM board is the no-WebGL fallback.
  - **Tournament**: beat six of the other toys on their home turf (a different six each time now that there are twelve), then a GIANT boss. Trophy at the end.
  - **Arcade**: pick your toy, the opponent (or SURPRISE) and the arena (or SURPRISE), then fight.
  - **Toy Box**: spin any toy and try its moves.
- **Wild creatures** (minions, `src/data/characters.js` + `src/render3d/minion-rigs.js`): Rexlet (Rex), Spooky Sprout (Tree), Rock Minnow (Rockfish), Little Squire (Arthur), Bog Frog (Wanda), Sneaky Squirrel (Remy), Bubble Crab (Billy), and Czernobog's night crew: Shadow Imp and Jitterbones. Each is a cheap code-built toy (a couple dozen boxes and cones), not playable.
- **Rex's face**: swappable eyes on both sides of his snout, so his expressions change like the code-built toys.
- **Astra**: `docs/ASTRA_REQUESTS.md` has paste-ready requests for the Bog Shack floor and Wanda / Czernobog sheets.
- **Remy Roo** (the family dog) and **Billy Bass** (the talking wall fish) are in the roster with code-built 3D stand-ins:
  - Remy Roo: Zoomies (dash) · Big Bark (two bark blasts, math) · Roll Over (dodge) · Power Paws (glowing paw-print flurry and a pounce, then heals him: "GOOD BOY!"). 108 HP, +2 attack.
  - Billy Bass: Tail Flop · Take Me to the River (a river surge, math) · Wall Mount (block) · Encore! (music notes spin the foe dizzy). 104 HP, +2 attack.
  - The select screen is now 4 × 2.

## Shipped later on 2026-10-14: the new four
- **Four original toys**, playable in Arcade, Tournament and Toy Box (not the campaign board): Capt'n Crookhook (110 HP, +2; Hook Swipe · Squawks Attack · Barrel Roll · Cannon Broadside), Jack-Knife (98 HP, +3; Rattle Kick · Pumpkin Toss · Fold Up · Pumpkin Bomb Barrage), Big Bad Wolfgang (115 HP, +1; Paw Swat · Howl · Sheep's Disguise · Huff & Puff) and Commander Payne (118 HP, +1; Halberd Sweep · Gravity Grip · Deflector Shield · Orbital Strike). Code-built 3D toys (`src/render3d/villain-rigs.js`), data in `src/data/characters-new-four.js`, lore in `docs/lore/`.
- **Select screen** fits 12 (two rows of six, scaled). New pumpkin and gust move icons.
- Concept sheets, views, palettes, move sheets, arena specs and mockups are in `assets/`; Astra prompts in `docs/ASTRA_REQUESTS_NEW_FOUR.md`.

## Shipped 2026-10-15
- **Spelling ladder** (Matt's ask: real 3–5 letter words, not letter matching): copy a printed word letter by letter (L2: 3 letters, L3: 3–4), peek then spell (L4), spell from sound (L5: 3–5 letters). Vowel spots offer vowels. Word banks `SPELL` / `SPELL_LONG` / `SPELL_LONGER` in `public/words.json`.
- **Laptop pass** on FastWillie: 60 fps everywhere measured; install tip hidden off-iOS; select portraits pre-warmed on the title screen.
- **Bundle**: three.js split into its own cached file; index.html 383 KB.
- **Signature specials** for the new four: Cannon Broadside, Pumpkin Bomb Barrage, Huff and Puff, Orbital Strike (`src/game/director.js`, pieces in `src/render/fx-moves.js`).
- **Signature power moves** for the new four (parrot, howl rings, pumpkin lob, gravity well) and **HUD portrait framing** fixed per toy (Billy Bass was cut off).
- **Sounds** for all 16 new-four moves plus win stings (`move.sfx`, `move.sfxHit`, `def.winSfx`).

## Board night crew (done)
`src/render3d/board3d.js`, rigs from `src/render3d/night-crew.js`.
- **Fire dancers**: five on Czernobog's summit slope (spread across the face the camera sees, feet on the cone) and three along the Haunted Forest's back edge, left of the mountain's foot. Each hops on its own beat at about 2 Hz, scaled 1.2–1.3 so they read at the follow camera.
- **Shadow peekers**: round(gloom × 6) rise behind the path, only on islands the darkness has reached (world `dark` > 0.05). Spots are dealt round-robin from the mountain end so they spread across the dark islands instead of piling into the forest. Each runs its own rise / look / sink timer. They stay ≥ 90 units from every space centre and sit behind the path, so the piece is never covered.
- **Villain scene**: dancers leap about 2.6× higher while Czernobog stirs. As the camera swings back to the piece (k > 0.8, or on a tap-skip), two extra peekers rise behind it, one at each shoulder, then sink and go.
- **Cost**: 8 dancers + 8 peekers, all built once with the board. Nothing allocated per frame; peekers that aren't out don't animate.
- **Verified headless** with `scratch/board-look.mjs` (mountain close-up, forest-edge wide view, gloom 0.95 with three worlds cleared, villain scene mid-strike and right after). The script lives in the git-ignored scratch folder.
- **Fire dancers v2** (lead's note: they read as traffic cones): each is now three stacked, flattened teardrop flames (deep orange shell, yellow body, white-hot heart), unlit so they glow, on separate flicker clocks so the tips lick; two tongues peel off the top and rise; teardrop arms flick; two tiny bright eye slits, no face decal. Geometry and materials shared by all dancers. The summit five are ~30% smaller, circle the peak below Czernobog's feet at their own height, pace and hop beat (1.75–2.25 Hz), and turn to face the camera.
- **Peeker cycle bug fixed** in night-crew.js (`k` now wraps into 0..1); board3d.js `peekAt` just offsets the rig's phase.

## Next (see HANDOFF.md "Next up" for the 8 PM order)
- Deploy the music engine + arena tracks + Czernobog piece after Matt's listen.
- Campaign board: free look, Czernobog alive on the peak, ambient animation, fly-over, between-turn cutscenes (Mario Party-style).
- Czernobog fight extras; fire dancers and shadow peekers (original spin-offs of the Fantasia ghost storm / dancing fire / shadow minions).
1. Matt reviews the sounds mp3; Luca plays the spelling ladder; tune both.
2. Send Astra the new-four packs; Hunyuan for each toy as the painted sheets come back. Wanda and Czernobog too (ASTRA_REQUESTS.md).
2. ~~Arenas for the new four~~ done 2026-10-15 10 PM: Skull Cove, Midnight Pumpkin Patch, Grandma's Woods, Star Fortress Bridge are live (READY_NEW_ARENAS in arenas.js; Star Bridge floor cropped to whole hex repeats so it tiles). Optional: per-arena battle tracks for them (TRACKS[`battle-<id>`]).
3. Matt plays the new modes with Luca, then sends the learning report ("Copy as text") plus what felt too hard, too long or confusing, and any moves or questions that feel off. Confirm or rename Wanda Wickwhistle and Czernobog.

## v6 Phase 4 (branch v6/evolution, stacked on v6/challenge): toy levels, evolutions, armor, move styles
- **Every toy has its own level** per player (`save.toys[id] = { xp, level, kit }`), separate from the player level and
  the learning levels. A toy earns the XP the player earns in the battles it fights. Curve in `src/logic/gear.js`:
  Evolution I at toy level 15 (about 25 battles with one toy), II at 35 (~125), Ultimate at 65 (~400).
- **Armor** (5): Classic, Tough (lv 8: more health, softer hits), Speedy (lv 15: starts with an energy pip, less health),
  Mighty (lv 35: hits harder, less health), Legend (lv 65). **Move styles** keep each toy's own move and animation and
  change its numbers: ZIPPY quick (lv 5), HEAVY (10) and HEAL (25) power, COUNTER guard (20), FAST (30) and SUPER (35)
  special. Every choice stays within 10 points of the plain toy's win rate in the battle simulator (test/gear.test.mjs).
- **Flow:** Choose toy → gear-up screen (armor + moves, toy turning on its stand) → fight. Skipped while a toy has nothing
  to choose yet, so a brand-new player's flow is unchanged. Toy Box has a gear button that opens the same screen as a
  preview. Picks are saved per toy and per player; a battle keeps the kit it started with (resume-safe).
- **Results:** under the player's level, the toy's own level, LEVEL UP!, EVOLVED!, and what just unlocked.
- **Evolution looks are placeholders for the Founder's call:** a glowing floor ring in the armor colour and one floating gem
  per evolution tier, slightly bigger toy. Bodies never change, so a wolf stays a wolf. Real evolved art per toy is Phase 6.
- Captures: docs/v6/phase4-*.jpg. Browser test: `node test/gear-e2e.mjs` (19 checks).
