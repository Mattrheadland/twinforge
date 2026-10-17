# Asset rights register

One place to see where every generated or imported asset came from, what it is allowed for, and who said yes. Facts here come from the repo (docs and git history) as of 2026-10-17. Anything the repo does not confirm is marked **UNKNOWN**. Nothing is assumed.

## 1. Rules

1. **Every generated asset gets an entry.** That means every image, GLB model, audio file, texture and generated sound or music track, whether made by an outside tool, by an in-game generator, or imported by hand. A set of files made in one request (for example a character's turnaround, faces and views) may share one entry if the entry lists each file.
2. **Commits are authored as Matt Headland.** Asset commits, and any commit that adds or changes a register entry, use that author.
3. **Reference images are for body shape only.** Outfits and colours follow the official poster (`docs/art/official-poster.png`). The two exceptions are recorded in `docs/HANDOFF.md`: Ragin' Rockfish stays the silver striped bass mech, and Commander Payne is a space villain.
4. **Nothing about children or real people is sent to outside tools.** That covers names, photos, ages and any other personal data. Prompts are written as product descriptions only.
5. **UNKNOWN is the default.** A status is only marked cleared when its terms have been read and the source is recorded. The current ChatGPT (Astra) commercial terms are **not cleared**, so commercial use of Astra output is UNKNOWN.
6. **Approval is recorded by name.** "Approved by" holds the person who said yes and the source (file, date). If nothing is recorded, write UNKNOWN. Being the commit author is not approval.

## 2. Entry template

Copy this block for each new asset (or group of assets). Keep it free of personal data.

```markdown
### <short id, e.g. MOD-battle-rex>
- **Asset path:** `assets/...` (list each file if grouped)
- **What it is:** <image / GLB model / audio / texture, and what it shows>
- **Tool or service used:** <name and URL, or "in-game code" / "none", or UNKNOWN>
- **Date:** YYYY-MM-DD (date made or imported; say which if the commit date differs)
- **Prompt or source summary:** <what was asked for or what it was made from, with no personal data>
- **Licence or terms status:** <cleared with source, or UNKNOWN>
- **Commercial-use status:** <cleared with source, NOT CLEARED, or UNKNOWN>
- **Approved by:** <name, date, and where recorded; or UNKNOWN>
```

## 3. Register

Dates are from git commit dates unless a doc gives a different date. "Commit" means the commit that last touched the file in this repo.

### 3a. 3D models (Hunyuan 3D, GLB)

Tool for all eight: **Hunyuan 3D** (Tencent, https://3d.hunyuanglobal.com), free tier, checked Oct 2026 per `docs/ASSET_PIPELINE.md`. Terms are not recorded in the repo, so licence and commercial status are UNKNOWN for all eight. Source views are the split turnaround views in `assets/characters/<id>/views/`.

| Entry | Asset path | What it is | Tool or service | Date | Prompt or source summary | Licence or terms | Commercial use | Approved by |
|---|---|---|---|---|---|---|---|---|
| MOD-battle-rex | `assets/models/battle-rex/battle-rex.glb` | Battle Rex toy model, about 6k triangles, toy joints | Hunyuan 3D | 2026-10-14 (commit 937eeb8) | Image-to-3D, multi-view, from `assets/characters/battle-rex/views/` | UNKNOWN (Hunyuan terms not recorded) | UNKNOWN | UNKNOWN |
| MOD-young-arthur | `assets/models/young-arthur/young-arthur.glb` | Young Arthur toy model, head and arm joints | Hunyuan 3D | 2026-10-14 (commit 937eeb8) | Image-to-3D, multi-view, from `assets/characters/young-arthur/views/` | UNKNOWN (Hunyuan terms not recorded) | UNKNOWN | UNKNOWN |
| MOD-ragin-rockfish | `assets/models/ragin-rockfish/ragin-rockfish.glb` | Ragin' Rockfish toy model, silver striped bass mech | Hunyuan 3D | 2026-10-14 (commit 937eeb8) | Image-to-3D, multi-view, from `assets/characters/ragin-rockfish/views/` | UNKNOWN (Hunyuan terms not recorded) | UNKNOWN | UNKNOWN |
| MOD-spooky-tree | `assets/models/spooky-tree/spooky-tree.glb` | Spooky Tree toy model, branch arms | Hunyuan 3D | 2026-10-14 (commit 937eeb8) | Image-to-3D, multi-view, from `assets/characters/spooky-tree/views/` | UNKNOWN (Hunyuan terms not recorded) | UNKNOWN | UNKNOWN |
| MOD-remy-roo | `assets/models/remy-roo/remy-roo.glb` | Remy Roo toy model | Hunyuan 3D | 2026-10-14 (commit 937eeb8) | Image-to-3D, multi-view, from `assets/characters/remy-roo/views/` (sheet faces left, so side and side-mirrored are swapped per the pipeline) | UNKNOWN (Hunyuan terms not recorded) | UNKNOWN | UNKNOWN |
| MOD-billy-bass | `assets/models/billy-bass/billy-bass.glb` | Billy Bass toy model | Hunyuan 3D | 2026-10-14 (commit 937eeb8) | Image-to-3D, multi-view, from `assets/characters/billy-bass/views/` | UNKNOWN (Hunyuan terms not recorded) | UNKNOWN | UNKNOWN |
| MOD-wanda-wickwhistle | `assets/models/wanda-wickwhistle/wanda-wickwhistle.glb` | Wanda Wickwhistle original stand-in model | Hunyuan 3D | 2026-10-14 (commit 937eeb8) | Image-to-3D, multi-view, from `assets/characters/wanda-wickwhistle/views/` | UNKNOWN (Hunyuan terms not recorded) | UNKNOWN | UNKNOWN |
| MOD-czernobog | `assets/models/czernobog/czernobog.glb` | Czernobog original night-creature model | Hunyuan 3D | 2026-10-14 (commit 937eeb8) | Image-to-3D, multi-view, from `assets/characters/czernobog/views/` | UNKNOWN (Hunyuan terms not recorded) | UNKNOWN | UNKNOWN |

### 3b. Character sheets (turnarounds, faces, views)

| Entry | Asset path | What it is | Tool or service | Date | Prompt or source summary | Licence or terms | Commercial use | Approved by |
|---|---|---|---|---|---|---|---|---|
| CHR-original-8 | `assets/characters/{battle-rex,spooky-tree,ragin-rockfish,young-arthur,remy-roo,billy-bass}/` (turnaround, faces, `views/`) | Painted character sheets for the six original toys | Astra (image assistant, see note below) | 2026-10-14 (commit 937eeb8) | Astra character pack: turnaround plus 3×3 face sheet, from the toy's own photos (photos kept out of the repo) | NOT CLEARED: Astra terms not read (see note) | NOT CLEARED (Astra terms not cleared) | UNKNOWN |
| CHR-wanda | `assets/characters/wanda-wickwhistle/` (turnaround, faces, `views/`) | Wanda Wickwhistle original stand-in sheets | Astra (see note below) | 2026-10-14 (commit 937eeb8) | Astra character pack from `docs/ASTRA_REQUESTS.md` | NOT CLEARED | NOT CLEARED | UNKNOWN |
| CHR-czernobog | `assets/characters/czernobog/` (turnaround, faces, `views/`) | Czernobog original night-creature sheets | Astra (see note below) | 2026-10-14 (commit 937eeb8) | Astra character pack from `docs/ASTRA_REQUESTS.md`. Note: `docs/ASSETS.md` says these sheets do not exist yet; the files are in git history and the working tree, so that doc is out of date | NOT CLEARED | NOT CLEARED | UNKNOWN |
| CHR-new-four-painted | `assets/characters/{capn-crookhook,jack-knife,big-bad-wolfgang,commander-payne}/*-turnaround.png`, `*-faces.png` | Painted sheets for the four new toys, poster look | Astra (see note below) | 2026-10-15 (commits cd3b932, 3f03b4c) | Astra requests in `docs/ASTRA_REQUESTS_NEW_FOUR.md`. Body shape from the concept turnaround; outfit and colour from the official poster; Young Arthur sheet attached for style | NOT CLEARED | NOT CLEARED | UNKNOWN |
| CHR-new-four-concept | `assets/characters/{capn-crookhook,jack-knife,big-bad-wolfgang,commander-payne}/*-concept.png` | Code-rig renders of the four new toys, kept as reference | In-game code (toon shader, `src/render3d/villain-rigs.js`); no outside tool | 2026-10-15 (commit cd3b932) | Rendered from the game's own rigs. No prompt | Own code output; no third-party terms. UNKNOWN for the project's asset licence (none stated in repo) | UNKNOWN | UNKNOWN |
| CHR-new-four-moves-palette | `assets/characters/{capn-crookhook,jack-knife,big-bad-wolfgang,commander-payne}/*-moves.png`, `*-palette.png` | Move sheets and colour palettes for the four new toys | UNKNOWN (not recorded in repo) | 2026-10-14 (commit d80fb43) | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| CHR-roster-lineup | `assets/characters/roster-lineup.png` | Side-by-side lineup of the twelve toys | UNKNOWN (not recorded in repo) | 2026-10-14 (commit d80fb43) | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| CHR-views | `assets/characters/*/views/*.png` (all toys) | Transparent 1024×1024 views cut from each turnaround | `scripts/split-turnaround.py` (in-repo script; no outside tool) | 2026-10-14 | Split of the turnaround sheet listed above | Inherits the status of its source sheet | Inherits the status of its source sheet | UNKNOWN |

### 3c. Effects and UI sheets

| Entry | Asset path | What it is | Tool or service | Date | Prompt or source summary | Licence or terms | Commercial use | Approved by |
|---|---|---|---|---|---|---|---|---|
| FX-sheet-1 | `assets/ui/fx-sheet-1-battle-effects.png` | 4×4 battle effects sheet (impact, spark, dust, fire, splash, magic, slash, swirl, dizzy, shield, muzzle, aura, heal, leaves, sleepy) on #FF00FF | Astra (see note below) | 2026-10-14 (commit 937eeb8) | Astra effects request on flat magenta, one item per cell, no text | NOT CLEARED | NOT CLEARED | UNKNOWN (in use per `docs/NEXT_STEPS.md`; no approval recorded) |
| UI-sheet-2 | `assets/ui/ui-sheet-2-menu-pieces.png` | 3×3 menu pieces (plates, frames, star, ribbon); not used in game yet | UNKNOWN (not recorded in repo) | 2026-10-14 (commit 937eeb8) | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| UI-sheet-3 | `assets/ui/ui-sheet-3-transitions.png` | 2×2 transitions (stripe wipe, radial burst, starry swirl); not used in game yet | UNKNOWN (not recorded in repo) | 2026-10-14 (commit 937eeb8) | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |

Pending, not in repo: `assets/ui/fx-sheet-4-new-four.png` is requested in `docs/ASTRA_REQUESTS_NEW_FOUR.md` (section 9) but does not exist yet. It gets an entry when it lands.

### 3d. Arenas (generated backdrops, floors, props)

Arena images are generated the same way as the character sheets, so they are listed here too. Tool for all: Astra (see note below), using the arena pack in `docs/ASSET_PIPELINE.md` §2 or the new-four requests. Commercial and licence status for all are NOT CLEARED.

| Entry | Asset path | What it is | Tool or service | Date | Prompt or source summary | Licence or terms | Commercial use | Approved by |
|---|---|---|---|---|---|---|---|---|
| ARN-bog-shack | `assets/arenas/bog-shack/*.png` (backdrop, backdrop-alt, floor, props) | Pondside cabin arena | Astra (backdrop and props); floor from Astra (commit f4dc09d) | 2026-10-14 (commit 937eeb8); floor 2026-10-15 (commit f4dc09d) | Arena pack, weathered dock floor with moss for the floor | NOT CLEARED | NOT CLEARED | UNKNOWN |
| ARN-castle | `assets/arenas/castle/*.png` | Courtyard arena (backdrop, floor, props) | Astra | 2026-10-14 (commit 937eeb8) | Arena pack | NOT CLEARED | NOT CLEARED | UNKNOWN |
| ARN-fishing-pier | `assets/arenas/fishing-pier/*.png` | Sunny bay pier arena (backdrop, floor, props) | Astra | 2026-10-14 (commit 937eeb8) | Arena pack | NOT CLEARED | NOT CLEARED | UNKNOWN |
| ARN-haunted-forest | `assets/arenas/haunted-forest/*.png` | Moonlit forest arena (backdrop, floor, props) | Astra | 2026-10-14 (commit 937eeb8) | Arena pack | NOT CLEARED | NOT CLEARED | UNKNOWN |
| ARN-skull-cove | `assets/arenas/skull-cove/*.png` (backdrop, floor, props) | Moonlit pirate cove, Capt'n Crookhook's home | Astra | 2026-10-15 (commit 0acac77) | Arena pack from `docs/ASTRA_REQUESTS_NEW_FOUR.md` | NOT CLEARED | NOT CLEARED | UNKNOWN |
| ARN-pumpkin-patch | `assets/arenas/pumpkin-patch/*.png` (backdrop, floor, props) | Midnight Pumpkin Patch, Jack-Knife's home | Astra | 2026-10-15 (commit 0acac77) | Arena pack from `docs/ASTRA_REQUESTS_NEW_FOUR.md` | NOT CLEARED | NOT CLEARED | UNKNOWN |
| ARN-grandmas-woods | `assets/arenas/grandmas-woods/*.png` (backdrop, floor, props) | Grandma's Woods, Wolfgang's home | Astra | 2026-10-15 (commit 5543164) | Arena pack from `docs/ASTRA_REQUESTS_NEW_FOUR.md` | NOT CLEARED | NOT CLEARED | UNKNOWN |
| ARN-star-bridge | `assets/arenas/star-bridge/*.png` (backdrop, floor, props) | Star Fortress Bridge, Payne's home | Astra | 2026-10-15 (commit 85f1521) | Arena pack from `docs/ASTRA_REQUESTS_NEW_FOUR.md` | NOT CLEARED | NOT CLEARED | UNKNOWN |
| ARN-new-four-mockups | `assets/arenas/{skull-cove,pumpkin-patch,grandmas-woods,star-bridge}/` (`ARENA.md`, `*-mockup-empty.png`, `*-mockup-fighters.png`) | Specs and layout mockups for the four new arenas (mockups are layout references, not game art) | UNKNOWN (not recorded in repo) | 2026-10-14 (commit d80fb43) | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |

### 3e. Sounds

There are no sound files in the repo. Sound effects are synthesized in code (`src/audio/audio.js` `SFX` table, `src/audio/synth.js`). The README says the project uses no third-party art or sounds.

| Entry | Asset path | What it is | Tool or service | Date | Prompt or source summary | Licence or terms | Commercial use | Approved by |
|---|---|---|---|---|---|---|---|---|
| SFX-core | `src/audio/audio.js` (SFX table; synthesized, no file) | Game sound effects, synthesized in code | In-game code (`src/audio/synth.js`); no outside tool | UNKNOWN (code history) | Synthesized effects tuned by hand | Own code output; no third-party terms. Project asset licence not stated, so UNKNOWN | UNKNOWN | UNKNOWN |
| SFX-new-four | Synthesized in `src/audio/audio.js` (20 effects for the new four); Matt's mp3 review copy is outside the repo | Wind-up, impact and win sounds for the new four, following each lore file's sound notes | In-game code; no outside tool | 2026-10-15 (per `docs/HANDOFF.md`) | Sound notes in `docs/lore/<id>.md` | Same as SFX-core: UNKNOWN for the project asset licence | UNKNOWN | UNKNOWN; Matt's verdict pending (`docs/HANDOFF.md`) |

### 3f. Music

Music is written in code (`src/audio/music.js` on a 16th grid, rendered by `src/audio/synth.js`). No mp3 or WAV is in the repo. No Suno or Udio tracks have been made; those options are listed in `docs/HANDOFF.md` and are not assets yet.

| Entry | Asset path | What it is | Tool or service | Date | Prompt or source summary | Licence or terms | Commercial use | Approved by |
|---|---|---|---|---|---|---|---|---|
| MUS-round-2 | Tracks in `src/audio/music.js`: title, battle, boss, board, victory, plus battle track per arena | Background music, round 2 | In-game code (synth); no outside tool | 2026-10-15 (per `docs/HANDOFF.md`) | Written by hand in the project's own style | Own code output; project asset licence not stated, so UNKNOWN | UNKNOWN | Matt Headland heard round 2 and liked it (`docs/HANDOFF.md`, 2026-10-15). Not a formal sign-off |
| MUS-czernobog-and-arena | `src/audio/music.js`: Czernobog track and four newest arena tracks; WAV renders in `scratch/music-*.wav` (outside repo) | Newest battle and boss tracks | In-game code (synth); no outside tool | 2026-10-15 (per `docs/HANDOFF.md`) | Czernobog track written in the idiom of Mussorgsky's *Night on Bald Mountain* (1867, public domain). The Disney 1940 arrangement is not copied. The track is original | Own code output; the composition it is inspired by is public domain. Project asset licence not stated, so UNKNOWN | UNKNOWN | UNKNOWN; Matt's OK pending (`docs/HANDOFF.md`) |

## 4. Tool notes

- **Astra** (the image assistant the art requests are sent to). `docs/HANDOFF.md` also refers to a "ChatGPT project", so Astra is probably ChatGPT; the repo does not confirm that. Per the brief, ChatGPT's commercial terms are not cleared, so every Astra output is NOT CLEARED for commercial use.
- **Hunyuan 3D** (https://3d.hunyuanglobal.com). Free tier; its terms were not read and are not recorded. Licence and commercial status are UNKNOWN for all GLB models.
- **Suno and Udio.** Not used. `docs/HANDOFF.md` notes that Suno's free tier is non-commercial and that downloads depend on account age. Nothing from them may be added until its entry is cleared.

## 5. Open items

1. **Personal data in outside-tool requests.** The Astra request blocks in `docs/ASTRA_REQUESTS.md`, `docs/ASTRA_REQUESTS_NEW_FOUR.md` and `docs/ASSET_PIPELINE.md` say "my 4-year-old" and "his real toys". That is a child-related detail sent to an outside tool, which the rules in §1 prohibit. The owner of those docs should remove it. This register does not repeat it.
2. **Astra terms.** Commercial use of Astra output is NOT CLEARED. Until the terms are read and recorded, nothing made with Astra is cleared for commercial use.
3. **Hunyuan terms.** Read the terms and record them here. Until then, all eight GLB models are UNKNOWN.
4. **Approvals.** No formal approval is recorded for most assets. Record names and dates in the "Approved by" column as they come in.
5. **Missing sources.** The tool for `ui-sheet-2`, `ui-sheet-3`, the moves and palette sheets, `roster-lineup.png` and the arena mockups is not recorded in the repo. Find out and record it.
6. **Stale status in `docs/ASSETS.md`.** It says the four new arenas and the Wanda and Czernobog sheets do not exist yet. Git history and the files in `assets/` show they do. This register follows the files and commits. `docs/ASSETS.md` needs updating by its owner.
7. **Extra scope.** Section 3 covers the items asked for (Hunyuan models, Astra sheets, effects sheet, sounds and music) and also the arena images, which are generated the same way.
