# v6 Render Audit — TwinForge's Three.js renderer

Status: documentation only. Nothing under `src/`, `test/`, `public/` or `assets/` was changed. No look, sound or gameplay change is proposed for implementation here.

Why this exists: the v6 directive's "Rendering Requirements" says to audit the existing Three.js implementation before proposing an engine replacement, and to prefer improving the established renderer. Target: smooth 60 FPS on capable phones, scalable quality below that. iPhone, Android, desktop, PWA/offline and the no-WebGL fallback must all stay compatible.

Conclusion up front: the renderer is already small, cheap by design and well factored (custom flat-shaded toon shader, no lights, no shadow maps, no postprocessing, tree-shaken three.js). Nothing found justifies an engine replacement. The real gaps are **no measured device data, no automatic quality scaling, and a few cheap-to-add safeguards** (see Follow-ups).

## 1. What was and was not measured

Environment this audit ran in (a headless cloud runner, **not a phone**):

| Item | Value | Source command |
|---|---|---|
| OS | Linux 6.17.0-1022-azure | session environment report (not a command run) |
| Node | v22.23.3 | printed by `node build.mjs` error output |
| Unit tests | **138 pass, 0 fail, 0 skipped**, 4.2 s | `npm test` |
| Build | **UNKNOWN** | `node build.mjs` failed: `Cannot find package 'esbuild'` — `node_modules/` is not installed in this checkout |
| `npm run perf` | **UNKNOWN** | needs the build (`node build.mjs && node test/perf.mjs`) plus `@sparticuz/chromium` / `puppeteer-core`, none installed |
| `node test/viewports.mjs` | **UNKNOWN** | same missing dependencies |
| Bundle sizes (index.html, three-*.js) | **UNKNOWN** | would come from the last line of `npm run build` |

What happened: I tried `npm ci` to install the locked dependencies, but the sandbox required interactive approval for it and it did not run. So no frame-time numbers, no leak-check numbers and no bundle sizes exist in this document. I did not estimate any of them. **No iPhone or Android number of any kind was measured**, and the headless numbers `test/perf.mjs` produces are software-GL (SwiftShader-style) with a 4x CPU throttle by default — its own header says "absolute numbers are pessimistic; compare scenes against each other". They can rank scenes but cannot say whether a phone holds 60 FPS.

To fill the UNKNOWNs, someone with network access runs, in a clean checkout:

```
npm ci
npm run build          # prints "built <stamp>: index.html N KB + three-<hash>.js N KB"
npm run perf           # = node build.mjs && node test/perf.mjs  (4x CPU throttle; viewport 874x402 @ DPR 3)
node test/viewports.mjs
```

and pastes the output into section 4 below. `npm run perf` also prints the per-file sizes of `dist/` and a geometry/texture leak check.

What `test/perf.mjs` will measure when it runs (read from the script, not run): median / p95 / worst frame interval over 120 `requestAnimationFrame` ticks for six scenes (bedroom with code toys, bedroom with the Rex model, castle, haunted forest with a 1.22x giant, bog shack with a minion, campaign board), then a 2-lap arena/fighter switching loop that fails if GPU geometries or textures grow by more than 5 between laps.

## 2. Findings per investigation area

### 2.1 Antialiasing
- `Stage3D` constructor (`src/render3d/stage3d.js`) creates `new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false })`. **No MSAA.**
- Edges are instead handled by the art style: an inverted-hull ink outline (`inked()` / `inkModelMesh()` in `toon.js`) hides jaggies on silhouettes, and in the default "pixel art" mode (`settings.pixelArt !== false`, `main.js applySettings`) the chunky low-res look is intentional (`RETRO_H = 400`, nearest-neighbour canvas via the `.pixel` CSS class).
- Textures: arena textures use `anisotropy = 4` (`arena-image.js tex()`); small canvas textures for faces and board tops disable mipmaps (`rigs.js`, `roster-rigs.js`, `board3d.js` uses `NearestFilter`).
- No FXAA/SMAA/TAA. Cel-shaded face edges inside a mesh are aliased by the shader's hard `if` steps (`toon.js` FRAG).

### 2.2 Resolution scaling
- `Stage3D.resize(cssW, cssH, dpr)`: pixel ratio `r = min(dpr, 3)`. In pixel-art mode a whole-number divisor `k = max(1, round(cssH*r / RETRO_H))` is applied: `renderer.setPixelRatio(r / k)`, so the 3D layer renders at about 400 px tall and is scaled up. This is a real, working resolution scale — but it is only used for the retro look, not as a performance control.
- In non-pixel mode the 3D canvas renders at the full `cssSize x min(dpr,3)`. A DPR-3 phone at 874x402 CSS is 2622x1206 ≈ 3.2 Mpx per frame (arithmetic from the viewport in `perf.mjs`; GPU cost UNKNOWN).
- There is **no dynamic resolution**: the FPS counter (`Stage.trackFps`, shown via the `showFps` setting) only displays; nothing reads it to lower the pixel ratio.
- `main.js layout()` re-runs `stage.resize` on window changes; the overlay 2D canvas uses the same ratio.

### 2.3 Materials and lighting
- **No Three.js lights, no shadow maps, no tone mapping, color management disabled** (`THREE.ColorManagement.enabled = false`; `outputColorSpace = LinearSRGBColorSpace`). A project grep for `shadowMap|toneMapping|EffectComposer` finds nothing in `src/`.
- Every toy material is a custom `ShaderMaterial` (`toonMat` for code-built toys, `modelMat` for GLBs in `toon.js`). Lighting is one fixed direction in view space with three hard steps, faceted normals from `dFdx/dFdy`, optional glint, plus v6 additions: arena `uTint` and a hard rim light (`uRim`/`uRimK`, set globally by `setLighting`, pulsed by `Stage3D.lightPulse/applyPulse`). Uniforms are shared objects, so a relight is a handful of uniform writes.
- Ink outline = a second back-face mesh per part (`inked`, `inkModelMesh`), so **every drawn part costs roughly 2 draw calls**. Hull geometry and hull materials are cached (`hullGeoCache`, `hullMats`, `modelHullCache`, `modelHullMats`).
- Contact shadow = one blended `CircleGeometry` per fighter (`Fighter3D` constructor), not a shadow map.
- Arenas: `Room3D` (built bedroom, `room.js`) and `ImageArena3D` (painted cards). The latter is all `MeshBasicMaterial` (unlit): backdrop card, one 5200x1200 floor plane with repeating tile, prop cards (`alphaTest: 0.5`), plus additive atmosphere: 3 mist planes, an optional `THREE.Points` firefly set updated per frame on the CPU, light pools (`buildAtmosphere`).
- Overdraw risk: additive full-width mist planes and the aura/halo meshes are large transparent quads; cost UNKNOWN on device.

### 2.4 Optimized GLB assets
- Loader: `GLTFLoader` with `MeshoptDecoder` (`models.js getLoader`), so meshopt-compressed GLBs are supported. Draco and KTX2/Basis loaders are **not** wired up.
- Eight GLBs ship (sizes in section 3). Per-model triangle counts, texture dimensions and whether they are meshopt-compressed are **UNKNOWN** from this audit — `modelInfo(id)` in `models.js` reports `tris/meshes/skinned/clips` at runtime, and `npm run model:check` (`test/model-check.mjs`) exists for inspecting them, but needs the missing dependencies. `scripts/import-model.mjs` and the `@gltf-transform/*`, `meshoptimizer` and `sharp` devDependencies suggest an optimisation pipeline exists; I did not run or read it.
- On load, each GLB is normalised to ~190 units tall, every material is replaced with `modelMat`, and `mesh.frustumCulled = false` is set on all model meshes and hulls (cheap for 2 fighters, but means no culling).
- The textured shader posterises (`uSteps` 10) and boosts saturation (`uSat` 1.15) per fragment.

### 2.5 Efficient animation systems
- Code-built rigs (`rigs.js`, `roster-rigs.js`, `villain-rigs.js`, `minion-rigs.js`, `family-rigs.js`) share one interface `{ root, apply(pose), anchors, headR, flash }` and are posed procedurally each frame.
- Model rigs (`buildModelRig`) use `THREE.AnimationMixer` clips matched by name (`clipmap.js`) with procedural bone layers on top; static GLBs are cut into joint regions at load (`autoJoints`, cached per geometry in `entry.skinCache`).
- Per-frame costs worth knowing: `Fighter3D.sync` runs every frame for both fighters; `Fighter3D.project()` calls `sync()` again and `updateMatrixWorld(true)` and clones a `Vector3` on each effect-position query (`head()`, `center()`, `point()`); `buildModelRig.apply` calls `root.updateMatrixWorld(true)` twice and `turnBone` clones quaternions per bone per frame. These allocate small objects per frame (GC pressure on low-end phones is **UNKNOWN**, not measured).
- `ImageArena3D.update` rewrites a `Float32Array` position/colour buffer for every firefly each frame and flags both attributes `needsUpdate`.
- The render loop (`Stage.start`) clamps frame delta to 50 ms and always calls `render()` each rAF; there is no pause-render when the 3D scene is static or the tab is hidden beyond what the browser does. `main.js onVisibility()` handles audio/pause; I did not trace whether it stops rendering.

### 2.6 Selective postprocessing
- **None.** There is no `EffectComposer` or render-to-texture pass in the live frame. Screen effects are done by drawing on the transparent 2D overlay canvas that sits on top of the WebGL canvas: dim, vignette, and flash are `fillRect`/radial gradient in `Stage3D.render`, and shake/zoom are applied as `camera.setViewOffset` on the 3D side and a matching canvas transform on the 2D side.
- The only extra render target is `Stage3D.snapshot()` (portraits/select cards): a one-off `WebGLRenderTarget`, read back with `readRenderTargetPixels`, disposed immediately.
- Consequence: any bloom/outline pass would be new cost; the current cheap overlay approach already delivers the needed hit flashes.

### 2.7 Mobile memory optimization
- Disposal exists and is tested: `disposeTree` frees geometry, `map` and skeleton bone textures while skipping `userData.shared` cache entries; `Fighter3D.dispose` removes shadow/aura/gear; `ImageArena3D.dispose` frees geometry/materials but deliberately keeps loaded textures for the session; `Board3D.dispose` exists (`setBoard`).
- `test/perf.mjs` includes a leak check (geometry/texture counts must not grow between two laps of arena/fighter switching) — so this is regression-guarded, but I could not run it here, so **no current memory figures**.
- Textures stay uncompressed (JPG/PNG decoded to RGBA on upload; no KTX2/Basis). Arena textures are kept for the session ("arenas come back often"), so GPU memory grows with each arena visited; the maximum is UNKNOWN.
- `renderer.info.memory` (geometries/textures) is available and already used by the perf script; there is no in-game memory telemetry.
- GPU context loss is handled: `webglcontextlost`/`restored` listeners in `Stage3D`, with `main.js` rebuilding the scene on restore, or reloading in 2D after ~10 s (`sessionStorage 'tbb.no3d'`).

### 2.8 Asset loading and caching
- Build (`build.mjs`): three.js is tree-shaken from the `THREE.X` identifiers and named `three/…` imports actually used in `src/`, built to a hashed `three-<sha1>.js`; the app is one inlined `index.html` (comment in `build.mjs`: "index.html has a 1 MB budget"); targets `safari15`. GLBs are copied as-is and listed in a `__MODELS__` manifest with a 10-char content hash, used as `?v=<hash>` cache-busting by `modelUrl()`.
- Runtime: `preloadModels(Object.values(CHARACTERS))` in `main.js` starts **all** roster GLBs loading at start-up (all 8 currently). `loadModel` caches by id; a failed load falls back to the code-built toy (`buildRig`), and `Fighter3D.upgradeRig` swaps the model in when it arrives. This is good for compatibility; total bytes pulled at start-up are the sum in section 3.
- Arena art loads lazily from `arenas/<id>/` via a `TextureLoader` with an in-memory cache (`arena-image.js tex`); flat colours show until arrival.
- Service worker (`public/sw.js`): install pre-caches only the shell — `./`, `index.html`, the hashed three bundle, manifest, `words.json`, three icons. Navigations are network-first with cache fallback; everything else same-origin is cache-first and cached at first use. **Implication:** GLBs and arena images are *not* precached, so a player who installs the PWA and goes offline before visiting an arena or loading a model sees no painted arena for that arena; models fall back to code-built toys. (This follows from the code; I did not test an offline session.) The SW registers only over `https:` (`main.js`), and the cache name changes every build, deleting old caches on activate.
- No-WebGL: `createStage()` probes `webgl2`/`webgl` and constructs `Stage3D` inside try/catch; otherwise, or when `sessionStorage tbb.no3d` is set, it returns the 2D `Stage`.

### 2.9 Quality presets
- **None exist as a system.** The only render-related user settings found in `main.js applySettings` are `pixelArt` (retro-resolution look), `reducedMotion` (damps shake/zoom/flash/light pulse via `Stage.setReduced`, `lightPulse`), `tvLook` (a CSS class), and `showFps`. Hard-coded: pixel-ratio cap 3, anisotropy 4, firefly count from arena data, ink on every part.
- Because pixel mode already renders at ~400 px tall, most of the pieces of a preset system (pixel ratio control in `resize`, ink on/off, atmosphere on/off) exist as isolated code paths; they are just not connected to a setting or to measured frame time.

## 3. Asset and bundle sizes

GLB sizes — command: `ls -l assets/models/*/` (bytes, from this checkout):

| File | Bytes | KB (bytes/1024) |
|---|---:|---:|
| battle-rex/battle-rex.glb | 479,948 | 468.7 |
| billy-bass/billy-bass.glb | 439,548 | 429.2 |
| czernobog/czernobog.glb | 438,076 | 427.8 |
| ragin-rockfish/ragin-rockfish.glb | 572,104 | 558.7 |
| remy-roo/remy-roo.glb | 406,352 | 396.8 |
| spooky-tree/spooky-tree.glb | 373,372 | 364.6 |
| wanda-wickwhistle/wanda-wickwhistle.glb | 463,908 | 453.0 |
| young-arthur/young-arthur.glb | 453,396 | 442.8 |
| **Total** | **3,626,704** | **3,541.7** |

(Totals are the sum of the eight byte counts above; every GLB is preloaded at start-up per 2.8.)

Bundle sizes — command: `npm run build`: **UNKNOWN** (build could not run, see section 1). Arena art sizes (`dist/arenas/*`) are also UNKNOWN; `npm run perf` prints them.

## 4. Headless measurements (to fill in)

Not taken. Paste here after running the commands in section 1, labelled with the machine used:

```
(npm run perf output)        UNKNOWN
(node test/viewports.mjs)    UNKNOWN
(npm run build last line)    UNKNOWN
```

Reminder for whoever fills this in: these will be cloud-box software-GL numbers, not iPhone or Android numbers, and must not be quoted as device performance. Device numbers need a real phone with the in-game FPS readout (`showFps` setting; shows fps, worst frame ms and the canvas pixel size) or a remote-debugged trace, recorded with the device model and OS version.

## 5. Ranked low-risk follow-ups

Ordered by value over risk. None are implemented here. "Look" column: anything that changes pixels on screen is marked creative.

| # | Follow-up | Files it would touch | Changes the look? | Proof test |
|---|---|---|---|---|
| 1 | **Take the missing measurements.** Run build, perf and viewports on a normal dev box *and* record real-device FPS (showFps overlay) on at least one iPhone and one mid-range Android in the retro and non-retro modes. Paste into section 4. | `docs/v6/RENDER_AUDIT.md` only | No | The doc has no UNKNOWN left in section 4; numbers carry a command and device label. |
| 2 | **Frame-time telemetry in perf output**: also print `renderer.info.render` (draw calls, triangles) per scene and pixel size, so the cost of the ink-hull doubling and overlay quads is visible. | `test/perf.mjs` | No | `npm run perf` prints draw-call and triangle counts per scene; numbers identical across two runs. |
| 3 | **Precache what offline needs**: add GLBs (from the `__MODELS__` list) and arena images to the SW install list or a first-run warm-up so an installed PWA works offline in every arena. | `build.mjs`, `public/sw.js` (maybe `src/main.js`) | No (same pixels, available offline) — but adds ~3.5 MB (+ arena art) to first install, so confirm the size trade-off | Headless browser test: load once, set offline, open each arena and model; no 404s and no code-toy fallback. Plus assert the SW CORE list matches `dist/`. |
| 4 | **Don't render when nothing changes / tab hidden**: skip `renderer.render` while `document.hidden` and keep the loop cheap. Confirm first what `onVisibility` already does. | `src/render/stage.js`, `src/render3d/stage3d.js`, maybe `src/main.js` | No | Unit/e2e: stub `requestAnimationFrame` with `visibilityState = hidden` and assert zero `renderer.render` calls; resumes on visible. |
| 5 | **Reduce per-frame allocation** in `Fighter3D.project`, `buildModelRig.apply`/`turnBone`, firefly update (reuse scratch vectors/quaternions, avoid the double `sync`). | `src/render3d/stage3d.js`, `models.js`, `arena-image.js` | No (must be bit-identical output) | Snapshot/pixel-compare of a few fixed poses before vs after (`test/slice-e2e.mjs` style) must match; `npm run perf` leak check still `ok`. |
| 6 | **Optional frustum culling for models**: enable it with correct bounds instead of `frustumCulled = false`. Low gain with two fighters; only worthwhile if #2 shows it matters. | `src/render3d/models.js` | No, if bounds are right | Visual pixel-compare; fighter never pops while posing. |
| 7 | **GLB size pass**: report triangle count, texture size, and compression for each GLB (`modelInfo`, `model:check`), then recompress textures / simplify only if a model is outsized. Lower-res or recompressed textures can shift colours or softness. | `assets/models/*`, `scripts/import-model.mjs` | **Possibly — creative: needs Founder** (texture re-encode/decimation can alter look) | `npm run model:check` before/after; side-by-side screenshot diff approved by Founder. |
| 8 | **Quality-preset system** (design sketch below). The settings plumbing and a frame-time governor that only *lowers* resolution scale are no-look-change in "High"; "Low" tiers drop effects. | `src/render3d/stage3d.js`, `src/render3d/toon.js` (ink toggle), `src/render3d/arena-image.js`, `src/main.js`, settings UI, `src/data/` | Plumbing: no. Any tier that removes ink, atmosphere or resolution relative to today: **creative: needs Founder** | See sketch below. |
| 9 | **Compressed textures (KTX2/Basis)** for arena art to cut GPU memory. | `build.mjs`, `scripts/build-arenas.py`, `src/render3d/arena-image.js`, new loader in the vendor bundle | **Possibly — creative: needs Founder** (compression artefacts on painted art); also needs a transcoder and bundle-size increase | GPU texture count/bytes drop in `renderer.info`; screenshot diff approved by Founder; works in Safari and Android Chrome. |
| 10 | **Selective postprocessing**: only after #1 shows headroom. Do not add while the overlay-canvas approach works. | New code | **creative: needs Founder** | n/a until requested |

### Design sketch: quality presets (not implemented)

Goal: 60 FPS on capable phones, graceful scaling below, no change to what a "High" device sees today.

- Setting: `settings.quality` in the save (`src/logic/save.js`-style migration; default `auto`), with values `auto | high | balanced | low`. Read in `main.js applySettings` next to `pixelArt` and `reducedMotion`, and handed to `Stage3D.setQuality(level)`.
- Knobs (all existing code paths, none new visuals at `high`):

| Knob | high (= today) | balanced | low |
|---|---|---|---|
| Pixel-ratio cap in `Stage3D.resize` | 3 | 2 | 1.5 |
| Retro divisor `RETRO_H` (pixel-art mode) | 400 | 400 | 400 (already cheap) |
| Ink hulls (`inked`, `inkModelMesh`) | on | on | on for fighters, off for set dressing — *look change* |
| Arena atmosphere (`buildAtmosphere`: mist, fireflies, pools) | on | fewer fireflies | off — *look change* |
| Texture anisotropy (`arena-image.js tex`) | 4 | 2 | 1 |
| Aura/halo/gem gear effects | on | on | simplified |

- `auto`: a governor using the existing `Stage.fps` data (`trackFps`). Rule sketch: if the median of the last N seconds is under ~50 FPS, step the quality down one tier; never step back up within the same session; never step down during a battle's question card or animation; persist the chosen tier so the next launch starts there. Always show the manual choice in settings so a parent can override. The governor must degrade resolution first, effects second.
- Safety: `reducedMotion` and the no-WebGL/2D path remain separate and unchanged; changing tier calls `resize()` and flags materials, with no scene rebuild.
- Test that would prove it: (a) unit test of the governor with a fake FPS sequence (steps down once, never up, ignores a single slow frame); (b) headless test that `quality=high` produces a screenshot pixel-identical to the current build for the fixed scenes used by `test/slice-e2e.mjs`; (c) `quality=low` reduces `renderer.info.render.calls` / pixel count in `npm run perf`; (d) save-migration test: old saves load with `auto`.

## 6. Sources

Everything in this audit comes from reading the repo at this commit (`src/render3d/stage3d.js`, `toon.js`, `models.js`, `arena-image.js`, `board3d.js` (header and first 200 lines), `src/render/stage.js`, `src/main.js`, `build.mjs`, `public/sw.js`, `test/perf.mjs`, `package.json`) and from running `npm test`, `ls -l assets/models/*/` and `node build.mjs` in the environment above. No external web sources were used. Items I did not read in full: the remainder of `board3d.js`, `room.js`, the rig files, `test/viewports.mjs`, `scripts/*`.
