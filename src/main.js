// TwinForge: Toy Box Tactics — app shell: layout, screens, audio unlock, saves, PWA.
import { CHARACTERS, ROSTER, opponentFor } from './data/characters.js';
import { VH } from './render/stage.js';
import { createStage, headFrame } from './render3d/stage3d.js';
import { preloadModels } from './render3d/models.js';
import { preloadFxSprites } from './render/fx.js';
import { Audio } from './audio/audio.js';
import { SaveStore } from './save.js';
import { UI } from './ui/screens.js';
import { BattleController } from './game/battle-controller.js';
import { buzz, setHaptics } from './haptics.js';
import { setSpeech, unlockSpeech } from './audio/speech.js';
import { showReport, showPreview } from './ui/learning-report.js';
import { newRun, winStop, current, recordRun, BOSS_SCALE } from './game/modes.js';
import { buildBoard, move, rollDie, winSpace, stopFor, newCampaign } from './game/campaign.js';
import { showModes, showArenaPick, showLadder, showRunResult, showTrophy, showGallery } from './ui/modes-ui.js';
import { showProfiles, showProfileEditor, playersSection } from './ui/profiles-ui.js';
import { showBoard } from './ui/board-ui.js';
import { Board3D } from './render3d/board3d.js';
import { Director } from './game/director.js';
import { h } from './ui/dom.js';
import { loadWords } from './logic/words.js';
import { awardXp, XP } from './logic/progression.js';
import { retryStop } from './logic/outcome.js';
import { kitChars, kitDef, normalizeKit, hasChoices } from './logic/gear.js';
import { showGear } from './ui/gear-ui.js';

const BUILD = typeof __BUILD__ !== 'undefined' ? __BUILD__ : 'dev';
const MIN_W = 976; // narrowest UI world (the select grid + GO button); the iPhone landscape is ~978 wide, so it is never scaled

class App {
  constructor() {
    this.root = document.getElementById('app');
    this.canvas = document.getElementById('stage');
    this.layerEl = document.getElementById('ui');
    this.stage = createStage(this.canvas);
    if (this.stage.is3D) preloadModels(Object.values(CHARACTERS));
    preloadFxSprites();
    this.audio = new Audio();
    this.save = new SaveStore(CHARACTERS);
    this.ui = new UI(this.layerEl, this);
    this.battle = null;
    this.buzz = buzz;
    this.debug = /[?&]debug/.test(location.search) || !!window.__TBB_TEST__;
    this.fpsEl = h('div', { class: 'fps hidden' });
    this.layerEl.appendChild(this.fpsEl);
    window.__tbb = { app: this, phase: null, chars: CHARACTERS, roster: ROSTER, headFrame };
  }

  init() {
    this.applySettings();
    this.layout();
    addEventListener('resize', () => this.layout());
    addEventListener('orientationchange', () => setTimeout(() => this.layout(), 250));
    this.guardGestures();
    this.stage.start();
    this.stage.onFrameExtra = null;
    setInterval(() => this.updateFps(), 500);
    document.addEventListener('visibilitychange', () => this.onVisibility());
    // iOS audio unlock: every gesture tries until the context is running
    const unlock = () => {
      this.audio.unlock();
    };
    document.addEventListener('pointerdown', unlock, true);
    document.addEventListener('touchend', unlock, true);
    this.safetyNet();
    loadWords();
    this.keyboard();
    this.requestPersistence();
    this.registerSW();
    if (this.save.recovered) setTimeout(() => this.ui.toast('Save restored from backup'), 800);
    this.goTitle();
  }

  // Last line of defence: log anything that slips through, and make sure there
  // is always something on screen to tap. Battle steps recover themselves
  // (BattleController.guard); a lost GPU waits for a restore, then falls back to 2D.
  safetyNet() {
    this.errors = [];
    const log = (e) => {
      const msg = String((e && (e.stack || e.message)) || e).slice(0, 400);
      this.errors.push(msg);
      if (this.errors.length > 20) this.errors.shift();
      console.error('[twinforge]', msg);
      // an error outside the battle's own steps (a tween, a timer) can leave an
      // animation waiting forever: if the battle hasn't moved on in 8 s, restart the turn
      const b = this.battle, n = b && b.log.length;
      if (b && !/choose|challenge|end|gone/.test(b.phase)) setTimeout(() => this.battle === b && b.log.length === n && this.stage.clock.scale && b.recover(), 8000);
      clearTimeout(this._rescue);
      this._rescue = setTimeout(() => {
        if (!this.layerEl.querySelector('.screen, .overlay, .hud')) this.goModes();
      }, 1500);
    };
    addEventListener('error', (ev) => log(ev.error || ev.message));
    addEventListener('unhandledrejection', (ev) => {
      ev.preventDefault();
      log(ev.reason);
    });
    const st = this.stage;
    st.onContextLost = () => {
      console.warn('[twinforge] GPU context lost');
      if (this.battle) this.battle.persist();
      clearInterval(this._lostT);
      let waited = 0;
      this._lostT = setInterval(() => {
        if (!st.lost) return clearInterval(this._lostT);
        // still gone after ~10 s on screen: reload with the 2D stage (everything is saved)
        if (!document.hidden && (waited += 2) >= 10) {
          try { sessionStorage.setItem('tbb.no3d', '1'); } catch {}
          location.reload();
        }
      }, 2000);
    };
    // back from a GPU reset: textures and canvases drawn before the loss are gone,
    // so rebuild whatever is on screen (the board goes black otherwise)
    st.onContextRestored = () => {
      console.warn('[twinforge] GPU context restored');
      clearInterval(this._lostT);
      try {
        if (this.battle) {
          const id = st.arenaId; st.arenaId = null; st.setArena(id);
          const b = this.battle;
          st.setFighters(b.chars[b.state.heroId], b.chars[b.state.foeId], { foeBig: st.fighters.foe?.big || 1 });
        } else if (this.boardView && this.ui.layer.querySelector('.board-screen')) this.goBoard();
        else if (this.ui.layer.querySelector('.title-screen')) this.goTitle();
      } catch (e) { console.error('[twinforge] rebuild after restore failed', e); }
    };
  }

  // Laptop keys: arrows move between the buttons on screen, Enter/Space presses
  // the focused one (or the main one), Escape pauses.
  keyboard() {
    const GROUPS = '.challenge .opt:not(.gone), .actions:not(.hidden) .move, .pick-card, .mode-card, .arena-card, .gal-arrow, .gal-moves .act, .result-btns .round-btn, .overlay.pause button';
    const MAIN = ['.profiles-screen .profile-card.active', '.overlay.pause .big-play', '.result-btns .round-btn.again', '.go-btn:not(.hidden)', '.board-fight:not(.hidden)', '.board-die:not(.hidden)', '.title-screen .big-play'];
    const shown = (el) => el && el.getClientRects().length && !el.closest('.hidden');
    const press = (el) => el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'mouse', button: 0 }));
    document.addEventListener('keydown', (e) => {
      const t = e.target;
      if (e.repeat || e.altKey || e.ctrlKey || e.metaKey || (t && t.closest && t.closest('input, textarea, select, .parent-card, .pv-bar'))) return;
      const k = e.key;
      const focused = this.layerEl.contains(document.activeElement) && shown(document.activeElement) ? document.activeElement : null;
      if (k === 'Escape') {
        const p = this.layerEl.querySelector('.pause-btn');
        if (shown(p)) press(p);
      } else if (k === 'Enter' || k === ' ') {
        const b = focused || MAIN.map((s) => this.layerEl.querySelector(s)).find(shown);
        if (!b) return;
        e.preventDefault();
        press(b);
      } else if (k.startsWith('Arrow')) {
        const all = [...this.layerEl.querySelectorAll(GROUPS)].filter(shown);
        if (!all.length) return;
        e.preventDefault();
        if (!focused || !all.includes(focused)) return all[0].focus();
        // nearest button in the arrow's direction
        const c = (el) => { const r = el.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; };
        const [x0, y0] = c(focused);
        const [dx, dy] = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k] || [0, 0];
        let best = null, bd = Infinity;
        for (const el of all) {
          const [x, y] = c(el);
          const along = (x - x0) * dx + (y - y0) * dy;
          if (along <= 1) continue;
          const d = along + 2 * Math.abs((x - x0) * dy + (y - y0) * dx);
          if (d < bd) { bd = d; best = el; }
        }
        if (best) best.focus();
      }
    });
  }

  get standalone() {
    return navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  }

  // iPhone / iPad (iPadOS reports itself as a Mac with a touch screen). The
  // "Add to Home Screen" tip only makes sense there; laptops never see it.
  get isIOS() {
    const ua = navigator.userAgent || '';
    return /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  layout() {
    const vw = window.innerWidth, vh = window.innerHeight;
    // The 3D stage is always 450 units tall. The UI layer is too, unless the
    // window is narrower than MIN_W (4:3, 16:10, 16:9 laptops): then the UI
    // fits the width and grows taller, and screens center in the extra height.
    const ss = vh / VH;
    const s = Math.min(ss, vw / MIN_W);
    this.scale = s;
    this.uiK = s / ss; // UI units -> stage units
    this.W = vw / s;
    this.H = vh / s;
    this.px = s * Math.min(window.devicePixelRatio || 1, 3);
    this.layerEl.style.width = this.W + 'px';
    this.layerEl.style.height = this.H + 'px';
    this.layerEl.style.transform = `scale(${s})`;
    this.layerEl.style.setProperty('--oy', (this.H - VH) / 2 + 'px');
    this.layerEl.classList.toggle('fit-w', s < ss);
    this.stage.resize(vw, vh, window.devicePixelRatio || 1);
    // safe-area insets in world units
    const probe = document.getElementById('safe-probe');
    const cs = getComputedStyle(probe);
    const L = parseFloat(cs.paddingLeft) || 0, R = parseFloat(cs.paddingRight) || 0, B = parseFloat(cs.paddingBottom) || 0;
    this.layerEl.style.setProperty('--sl', Math.max(L / s, 10) + 'px');
    this.layerEl.style.setProperty('--sr', Math.max(R / s, 10) + 'px');
    this.layerEl.style.setProperty('--sb', Math.max(B / s, 6) + 'px');
  }

  // stage world <-> UI layer coordinates (they differ only on narrow windows)
  toStage(p) {
    const k = this.uiK || 1;
    return { x: p.x * k, y: p.y * k };
  }

  fromStage(p) {
    const k = this.uiK || 1;
    return { x: p.x / k, y: p.y / k };
  }

  guardGestures() {
    const scrollable = (t) => t && t.closest && t.closest('.parent-card, textarea');
    document.addEventListener('touchmove', (e) => { if (!scrollable(e.target)) e.preventDefault(); }, { passive: false });
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('dblclick', (e) => e.preventDefault());
    // iOS only lets a page talk after a tap: wake the voice on the first one
    for (const ev of ['touchend', 'click']) document.addEventListener(ev, unlockSpeech, { once: true, capture: true });
  }

  applySettings() {
    const st = this.save.data.settings;
    this.audio.setVolumes(st.music, st.sfx);
    setSpeech(st.readAloud !== false, Math.min(1, st.sfx * 1.15));
    this.stage.setReduced(!!st.reducedMotion);
    setHaptics(st.haptics);
    this.fpsEl && this.fpsEl.classList.toggle('hidden', !st.showFps);
    document.documentElement.classList.toggle('reduced', !!st.reducedMotion);
    document.documentElement.classList.toggle('tv', st.tvLook !== false);
    const pix = st.pixelArt !== false;
    if (this.stage.pixel !== pix) {
      this.stage.pixel = pix;
      if (this.W) this.layout();
    }
  }

  updateFps() {
    if (!this.save.data.settings.showFps) return;
    const f = this.stage.fps;
    this.fpsEl.textContent = `${f.value} fps · worst ${f.worst}ms · ${this.canvas.width}×${this.canvas.height}`;
  }

  onVisibility() {
    if (document.hidden) {
      this.audio.suspend();
      if (this.battle) this.battle.persist();
    } else {
      this.audio.resume();
      if (this._wantWake) this.wakeLock(true);
    }
  }

  async wakeLock(on) {
    this._wantWake = on;
    try {
      if (on && navigator.wakeLock && !this._lock) {
        this._lock = await navigator.wakeLock.request('screen');
        this._lock.addEventListener('release', () => (this._lock = null));
      } else if (!on && this._lock) {
        await this._lock.release();
        this._lock = null;
      }
    } catch {}
  }

  async requestPersistence() {
    try {
      if (navigator.storage && navigator.storage.persist) await navigator.storage.persist();
    } catch {}
  }

  registerSW() {
    try {
      if ('serviceWorker' in navigator && location.protocol === 'https:' && !this.debug) {
        navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(() => {});
      }
    } catch {}
    this.checkForUpdate();
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && this.checkForUpdate());
  }

  // One game, every device: GitHub Pages caches index.html for ten minutes and an
  // old service worker can keep serving the previous build, so a laptop could lag
  // the phone by a whole deploy. Ask the server which build is current (sw.js is
  // tiny and fetched with no cache); if it's newer than this page and nothing is
  // mid-battle, refresh the worker and reload once.
  async checkForUpdate() {
    if (this.debug || location.protocol !== 'https:' || this._updating) return;
    try {
      const txt = await (await fetch('./sw.js?t=' + Date.now(), { cache: 'no-store' })).text();
      const live = (txt.match(/tbb-(\d{12})/) || [])[1];
      if (!live || live <= BUILD) return;
      let key = null;
      try { key = sessionStorage.getItem('tbb.reloadedFor'); } catch {}
      if (key === live) return; // already reloaded for this build once; don't loop
      this._updating = true;
      const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
      if (reg) {
        await reg.update().catch(() => {});
        // wait (briefly) for the new worker to take over, then reload
        await new Promise((r) => { const t = setTimeout(r, 4000); navigator.serviceWorker.addEventListener('controllerchange', () => { clearTimeout(t); r(); }, { once: true }); });
      }
      const go = () => { try { sessionStorage.setItem('tbb.reloadedFor', live); } catch {} location.replace(location.pathname + '?b=' + live); };
      if (this.battle) this._reloadWhenIdle = go; // never yank a battle away from Luca
      else go();
    } catch { /* offline: keep playing the build we have */ }
  }

  endBattle() {
    if (this.battle) {
      this.battle.destroy();
      this.battle = null;
    }
  }

  // ---------------- screens ----------------
  goTitle() {
    this.endBattle();
    const d = this.save.data;
    const heroId = CHARACTERS[d.progress.lastHero] ? d.progress.lastHero : ROSTER[0];
    this.stage.setArena('bedroom');
    this.stage.setFighters(CHARACTERS[heroId], CHARACTERS[opponentFor(heroId)]);
    this.stage.cam.drift = 1;
    this.stage.cam.zoom = 1;
    this.stage.dim = 0;
    this.audio.play('title');
    this.ui.showTitle({
      stars: d.progress.stars,
      player: d.player,
      hasBattle: !!d.battle,
      showInstallTip: this.isIOS && !this.standalone && !this.debug,
      onPlay: () => {
        this.audio.sfx('select');
        buzz('light');
        this.goPlayers();
      },
      onParent: () => this.openParent(),
    });
    this.ui.warmSelect(CHARACTERS, ROSTER);
  }

  // ---------------- players (save.js profiles, ui/profiles-ui.js) ----------------
  // Play always asks who's playing first (Founder, 2026-10-16), then resumes that
  // player's own unfinished battle or opens the modes.
  goPlayers() {
    const playOn = () => (this.save.data.battle ? this.resumeBattle() : this.goModes());
    const list = this.save.profiles();
    this.leaveGallery();
    this.stage.setArena('bedroom');
    this.stage.setFighters(null, null);
    this.stage.dim = 0.3;
    showProfiles(this.ui, {
      profiles: list,
      chars: CHARACTERS,
      roster: ROSTER,
      onPick: (slot) => {
        this.usePlayer(slot);
        playOn();
      },
      onCreate: (slot) => this.editPlayer(slot, () => this.goPlayers()),
      onHome: () => this.goTitle(),
    });
  }

  usePlayer(slot) {
    if (slot === this.save.slot) return;
    this.save.switchTo(slot);
    this.applySettings();
    if (this.save.recovered) this.ui.toast('Save restored from backup');
  }

  // grown-up editor for one slot (new player when the slot is empty); `back` runs after
  editPlayer(slot, back) {
    const profile = this.save.index.profiles[slot];
    const count = this.save.index.profiles.filter(Boolean).length;
    showProfileEditor(this.ui.layer, {
      slot,
      profile,
      chars: CHARACTERS,
      roster: ROSTER,
      canDelete: count > 1,
      onSave: (changes) => {
        try {
          if (profile) this.save.updateProfile(slot, changes);
          else this.save.createProfile(slot, changes);
          this.ui.toast(profile ? 'Player saved' : 'Player added');
        } catch {
          this.ui.toast('Couldn’t save that player (storage full?)');
        }
        back();
      },
      onDelete: (typed) => {
        try {
          this.save.deleteProfile(slot, typed);
          this.applySettings();
          this.ui.toast('Player deleted');
        } catch {
          this.ui.toast('Player not deleted');
        }
        back();
      },
      onClose: back,
    });
  }

  // ---------------- game modes (game/modes.js, game/campaign.js) ----------------
  get records() {
    return this.save.data.records;
  }

  goModes() {
    this.endBattle();
    if (this._reloadWhenIdle) { const go = this._reloadWhenIdle; this._reloadWhenIdle = null; return go(); } // a new build arrived mid-battle
    this.leaveGallery();
    this.audio.play('title'); // menu music again after a battle (no-op if it's already on)
    this.stage.setArena('bedroom');
    this.stage.setFighters(null, null);
    this.stage.dim = 0.3;
    this.stage.cam.drift = 1;
    showModes(this.ui, {
      records: this.records,
      campaign: this.save.data.campaign,
      chars: CHARACTERS,
      player: this.save.data.player,
      onPick: (mode) => {
        this.audio.sfx('select');
        buzz('light');
        this.chooseMode(mode);
      },
      onHome: () => this.goTitle(),
    });
  }

  chooseMode(mode) {
    if (mode === 'gallery') return this.goGallery();
    if (mode === 'campaign') {
      const c = this.save.data.campaign;
      if (c && !c.done) return this.goBoard({ intro: true });
      return this.goSelect((heroId) => {
        this.save.data.campaign = newCampaign(heroId);
        this.save.save();
        this.goBoard({ intro: true });
      }, () => this.goModes());
    }
    const run = this.save.data.runs.tournament;
    if (mode === 'tournament' && run && !run.done) return this.showRunMap();
    this.goSelect((heroId) => {
      if (mode === 'arcade') {
        // pick the opponent (or SURPRISE!), then the arena (or SURPRISE!)
        this.ui.showSelect({
          chars: CHARACTERS,
          roster: ROSTER.filter((id) => id !== heroId),
          surprise: true,
          vs: true,
          onPick: (foeId) => {
            showArenaPick(this.ui, {
              onPick: (arenaId) => {
                this.audio.sfx('select');
                this.beginRun(newRun('arcade', heroId, { chars: CHARACTERS, roster: ROSTER, foeId, arenaId }));
              },
              onHome: () => this.goModes(),
            });
          },
          onHome: () => this.goModes(),
        });
      } else {
        this.beginRun(newRun('tournament', heroId, { chars: CHARACTERS, roster: ROSTER }));
      }
    }, () => this.goModes());
  }

  // each mode keeps its own run (save.data.runs), so an arcade fight never
  // replaces a tournament in progress
  beginRun(run) {
    this.save.data.runs[run.mode] = run;
    this.save.save();
    if (run.mode === 'tournament') this.showRunMap();
    else this.playStop('arcade');
  }

  showRunMap() {
    const run = this.save.data.runs.tournament;
    this.audio.play('title');
    this.stage.setFighters(null, null);
    this.stage.dim = 0.35;
    showLadder(this.ui, {
      run,
      chars: CHARACTERS,
      onGo: () => this.playStop('tournament'),
      onHome: () => this.goModes(),
    });
  }

  async playStop(mode) {
    const run = this.save.data.runs[mode];
    const stop = current(run);
    if (!stop) return this.goModes();
    this.audio.sfx('powerUp');
    await this.ui.showVS(CHARACTERS[run.heroId], CHARACTERS[stop.foeId], { boss: stop.boss });
    this.startBattle(run.heroId, stop.foeId, null, { ...stop, kind: 'run', mode });
  }

  // ---------------- campaign board ----------------
  // intro: a fly-over of the board when it opens from the menu (not after a battle)
  goBoard({ intro = false } = {}) {
    this.endBattle();
    this.leaveGallery();
    const c = this.save.data.campaign;
    const board = buildBoard(c.heroId);
    this.audio.play('board');
    this.stage.setFighters(null, null);
    this.stage.dim = this.stage.is3D ? 0 : 0.6;
    this.boardView = showBoard(this.ui, {
      campaign: c,
      board,
      chars: CHARACTERS,
      make3D: this.stage.is3D ? (opts) => {
        const clearedWorlds = board.filter((sp, i) => sp.type === 'boss' && c.cleared.includes(i)).length;
        const b = new Board3D(this.stage, { ...opts, audio: this.audio, clearedWorlds, rounds: c.rounds || 0 });
        this.stage.setBoard(b, opts.owner);
        return b;
      } : null,
      intro,
      onRoll: async (api) => {
        const roll = rollDie();
        const res = move(this.save.data.campaign, board, roll);
        res.campaign.rounds = (this.save.data.campaign.rounds || 0) + 1; // every 3rd one, the villain stirs
        this.save.data.campaign = res.campaign;
        if (res.event === 'star') this.save.data.progress.stars++;
        this.save.save();
        const ev = await api.play(roll, res);
        if (ev === 'fight') {
          await new Promise((r) => setTimeout(r, 650));
          // only if he's still looking at this board (not Home, not already tapped FIGHT)
          if (this.boardView === api && this.ui.layer.querySelector('.board-screen')) this.boardFight();
        }
      },
      onFight: () => this.boardFight(),
      onHome: () => this.goModes(),
    });
  }

  async boardFight() {
    // one fight at a time: the FIST tap and the auto-fight after a roll can land together
    if (this._boardFighting) return;
    this._boardFighting = true;
    try {
      const c = this.save.data.campaign;
      const sp = buildBoard(c.heroId)[c.pos];
      const stop = stopFor(sp);
      this.audio.sfx('powerUp');
      await this.ui.showVS(CHARACTERS[c.heroId], CHARACTERS[stop.foeId], { boss: stop.boss });
      // the board or Home came back during the splash (QA race, 2026-10-15): don't start a stale fight
      if (this.ui.layer.querySelector('.screen')) return;
      this.startBattle(c.heroId, stop.foeId, null, { ...stop, kind: 'campaign', at: c.pos });
    } finally {
      this._boardFighting = false;
    }
  }

  // Called by the battle when it's over.
  // xpStart: the player's XP when the battle began (a level gained since then is celebrated)
  onBattleEnd({ win, stars, total, state, xpStart = null, toy = null }) {
    const home = () => this.goModes();
    const toyResult = toy && CHARACTERS[toy.id] ? { ...toy, name: CHARACTERS[toy.id].name } : null;
    const result = (opts) => showRunResult(this.ui, { ...opts, xp: { from: xpStart ?? this.save.data.player.xp, to: this.save.data.player.xp }, toy: toyResult });
    // a lost fight: "Try again" restarts the same fight right away (no VS splash);
    // nothing was taken away, the run or campaign space is still where it was
    const retry = () => this.retryBattle(state);
    // campaign board fight
    const c = this.save.data.campaign;
    if (state.from === 'campaign' && c && !c.done && c.pos === state.at && c.heroId === state.heroId) {
      const board = buildBoard(c.heroId);
      if (!win) return result({ win, stars, total, onAgain: retry, onHome: () => this.goBoard() });
      const next = winSpace(c, board, stars);
      if (!c.cleared.includes(c.pos)) this.save.data.player = awardXp(this.save.data.player, XP.space).player;
      this.save.data.campaign = next;
      if (next.done) this.save.data.records = recordRun(this.records, { mode: 'campaign', done: true, heroId: next.heroId });
      this.save.save();
      if (next.done) {
        this.stage.fx.confetti(this.stage.W, 450);
        this.audio.sfx('perfect');
        return result({ win, stars, total, onNext: () => showTrophy(this.ui, { mode: 'campaign', heroDef: CHARACTERS[next.heroId], stars: next.stars, onHome: () => { this.save.data.campaign = null; this.save.save(); home(); } }), onHome: home });
      }
      return result({ win, stars, total, onNext: () => this.goBoard(), onHome: home });
    }
    const runs = this.save.data.runs;
    const fits = (r) => { const st = current(r); return r && st && st.foeId === state.foeId && r.heroId === state.heroId; };
    // battles saved before runs were split don't know their mode: find the run they belong to
    const mode = state.runMode || ['tournament', 'arcade'].find((m) => fits(runs[m]));
    const run = mode && runs[mode];
    const inRun = state.from === 'run' && fits(run);
    if (!inRun) {
      return result({ win, stars, total, onAgain: win ? () => this.startBattle(state.heroId, state.foeId) : retry, onHome: home });
    }
    if (run.mode === 'arcade') {
      if (win) {
        this.save.data.records = recordRun(this.records, winStop(run, stars));
        this.save.save();
      }
      return result({ win, stars, total, onAgain: win ? () => this.playStop('arcade') : retry, onHome: home });
    }
    // tournament
    if (!win) return result({ win, stars, total, onAgain: retry, onHome: home });
    const next = winStop(run, stars);
    runs.tournament = next.done ? null : next;
    this.save.data.records = recordRun(this.records, next);
    this.save.save();
    if (next.done) {
      this.stage.fx.confetti(this.stage.W, 450);
      this.audio.sfx('perfect');
      return result({ win, stars, total, onNext: () => showTrophy(this.ui, { mode: next.mode, heroDef: CHARACTERS[next.heroId], stars: next.stars, onHome: home }), onHome: home });
    }
    return result({ win, stars, total, onNext: () => this.showRunMap(), onHome: home });
  }

  // Hero pick (the 8-card select screen).
  goSelect(onHero = null, onBack = null) {
    this.stage.setFighters(null, null);
    this.stage.dim = 0.25;
    this.ui.showSelect({
      chars: CHARACTERS,
      roster: ROSTER,
      lastHero: this.save.data.progress.lastHero,
      onPick: async (heroId) => {
        this.save.data.progress.lastHero = heroId;
        this.save.save();
        // v6 Phase 4: Choose Character → Choose Armor → Choose Moves → Battle (skipped while the toy has nothing to choose)
        this.gearUp(heroId, async () => {
          if (onHero) return onHero(heroId);
          this.audio.sfx('powerUp');
          const foeId = opponentFor(heroId);
          await this.ui.showVS(CHARACTERS[heroId], CHARACTERS[foeId]);
          this.startBattle(heroId, foeId);
        }, () => this.goSelect(onHero, onBack));
      },
      onHome: () => (onBack ? onBack() : this.goTitle()),
    });
  }

  // ---------------- gear (v6 Phase 4) ----------------
  toyRec(id) {
    const t = this.save.data.toys || {};
    return t[id] && typeof t[id] === 'object' ? t[id] : {};
  }

  saveKit(id, kit) {
    const toys = this.save.data.toys || (this.save.data.toys = {});
    toys[id] = { ...(toys[id] || { xp: 0, level: 1 }), kit };
    this.save.save();
  }

  // The gear-up screen for one toy. next(): carry on to the fight; back(): the previous screen.
  // preview: from the Toy Box (no fight, just DONE). Without anything to choose yet, go straight on.
  gearUp(heroId, next, back, { preview = false } = {}) {
    const rec = this.toyRec(heroId);
    if (!preview && !hasChoices(rec)) return next();
    this.endBattle();
    this.stage.setArena('bedroom');
    this.stage.dim = 0.1;
    this.stage.cam.drift = 0;
    const cam = this.stage.cam;
    cam.zoom = 1.3; cam.fx = 0.5; cam.fy = 0.52;
    this.stage.showcase = { yaw: -0.6, x: -200 };
    const show = (kit) => this.stage.setFighters(kitDef(CHARACTERS[heroId], normalizeKit(kit, rec), rec), null);
    const leave = () => {
      this.stage.showcase = null;
      cam.zoom = 1; cam.fx = 0.5; cam.fy = 0.55;
      this.stage.setFighters(null, null);
    };
    let shown = null;
    showGear(this.ui, {
      def: CHARACTERS[heroId],
      rec,
      preview,
      onChange: (kit) => {
        const key = JSON.stringify(kit);
        if (key === shown) return;
        shown = key;
        this.saveKit(heroId, kit);
        show(kit);
      },
      onGo: () => { leave(); next(); },
      onBack: () => { leave(); back(); },
    });
  }

  startBattle(heroId, foeId, resume = null, stop = null) {
    this.endBattle();
    this.leaveGallery();
    this.ui.clear();
    this.stage.cam.drift = 0;
    this.stage.cam.zoom = 1;
    this.stage.dim = 0;
    // the hero fights in its equipped armor and move styles (logic/gear.js); a resumed battle keeps the kit it began with
    const rec = this.toyRec(heroId);
    const kit = normalizeKit(resume && resume.kit ? resume.kit : rec.kit, rec);
    this.battle = new BattleController({ app: this, chars: kitChars(CHARACTERS, heroId, kit, rec), heroId, foeId, resume, stop });
    if (!resume) this.battle.state.kit = kit;
    if (stop && !resume) {
      // remember where this fight came from (saved with the battle, so a resume knows too)
      this.battle.state.from = stop.kind;
      if (stop.kind === 'campaign') this.battle.state.at = stop.at;
      if (stop.mode) this.battle.state.runMode = stop.mode;
    }
    this.battle.guard(this.battle.start());
  }

  // The same fight again from the top: same foe, arena, giant size and origin
  // (campaign space or run), full health, empty meters.
  retryBattle(state) {
    this.audio.sfx('powerUp');
    this.startBattle(state.heroId, state.foeId, null, retryStop(state));
  }

  resumeBattle() {
    const b = this.save.data.battle;
    if (!b) return this.goModes();
    this.startBattle(b.heroId, b.foeId, b);
  }

  // ---------------- toy gallery ----------------
  goGallery(startId = null) {
    this.endBattle();
    this.stage.setArena('bedroom');
    this.stage.dim = 0;
    this.stage.cam.drift = 0;
    const cam = this.stage.cam;
    cam.zoom = 1.3; cam.fx = 0.5; cam.fy = 0.52;
    this.stage.showcase = { yaw: -0.6 };
    this.gallery = { director: new Director(this.stage, this.audio), busy: false };
    const lastHero = startId || this.save.data.progress.lastHero;
    const kitted = (id) => kitChars(CHARACTERS, id, this.toyRec(id).kit, this.toyRec(id))[id];
    showGallery(this.ui, {
      roster: ROSTER,
      chars: Object.fromEntries(ROSTER.map((id) => [id, kitted(id)])),
      index: Math.max(0, ROSTER.indexOf(lastHero)),
      onGear: (id) => { this.leaveGallery(); this.gearUp(id, null, () => this.goGallery(id), { preview: true }); },
      onShow: (id) => {
        this.stage.setFighters(kitted(id), null);
        this.gallery.busy = false;
        this.audio.sfx('select');
      },
      onSpin: (d) => { if (this.stage.showcase) this.stage.showcase.yaw += d; },
      onMove: (m) => this.galleryMove(m),
      onHome: () => this.goModes(),
    });
  }

  leaveGallery() {
    if (!this.gallery) return;
    this.gallery = null;
    this.stage.showcase = null;
    const cam = this.stage.cam;
    cam.zoom = 1; cam.fx = 0.5; cam.fy = 0.55;
  }

  async galleryMove(move) {
    const g = this.gallery;
    const f = this.stage.fighters.hero;
    if (!g || g.busy || !f) return;
    g.busy = true;
    const d = g.director;
    const c = f.center();
    try {
      if (move.slot === 'guard') {
        await d.guardUp(f, move);
        await d.wait(700);
        d.shieldOff(f);
      } else if (move.slot === 'special') {
        await d.chargeUp(f, move.color);
        f.cheer = true;
        this.stage.fx.word(move.name.toUpperCase() + '!', c.x, c.y - 170, { size: 40, color: move.color, life: 1000 });
        this.stage.fx.burst(c.x, c.y, { count: 22, colors: [move.color, '#ffffff', '#FFC914'], kind: 'star', speed: 360 });
        await d.wait(1100);
        f.cheer = false;
        f.aura = 0;
        const cam = this.stage.cam;
        cam.fx = 0.5; cam.fy = 0.52;
        await this.stage.zoomTo(1.3, 250);
        d.reset(f);
      } else {
        f.mouth = 'grit';
        await d.to(f, { sx: 1.08, sy: 0.92, armF: -1.4, cannon: move.anim === 'shot' ? 1 : 0 }, 160);
        this.audio.sfx('whoosh');
        await d.to(f, { ox: 60 }, 120);
        const p = f.point('muzzle') || f.center();
        this.stage.fx.sprite(move.anim === 'shot' ? 'muzzle' : move.slot === 'power' ? 'impact' : 'spark', p.x + 60, p.y, { size: move.slot === 'power' ? 170 : 110, life: 360 });
        this.stage.fx.word(move.word || 'POW!', c.x + 120, c.y - 120, { size: 44, color: move.color });
        this.audio.sfx(move.slot === 'power' ? 'bigHit' : 'hit');
        this.stage.shake(0.25);
        await d.wait(200);
        f.mouth = 'smile';
        await d.to(f, { ox: 0, sx: 1, sy: 1, armF: -0.2, cannon: 0 }, 320);
      }
    } finally {
      if (this.gallery === g) g.busy = false;
    }
  }

  openParent() {
    this.audio.sfx('tap');
    const reopen = () => { this.ui.layer.querySelector('.overlay.parent')?.remove(); this.openParent(); };
    const players = playersSection({
      profiles: this.save.profiles(),
      onEdit: (slot) => this.editPlayer(slot, reopen),
      onAdd: (slot) => this.editPlayer(slot, reopen),
      onSwitch: (slot) => {
        this.usePlayer(slot);
        reopen();
      },
    });
    this.ui.showParent({
      save: this.save,
      players,
      build: BUILD,
      storageOk: this.save.available,
      onChange: () => {
        this.applySettings();
        this.save.save();
      },
      onExport: () => this.exportSave(),
      onImport: (txt) => {
        try {
          this.save.importText(txt);
          this.applySettings();
          this.ui.toast('Backup imported');
          this.goTitle();
        } catch (e) {
          this.ui.toast('That file isn’t a TwinForge backup');
        }
      },
      onReset: () => {
        this.save.reset();
        this.ui.toast('Progress reset');
        this.goTitle();
      },
      onReport: () => this.openReport(),
      onPreview: () => this.openPreview(),
      onClose: () => this.goTitle(),
    });
  }

  openReport() {
    showReport(this.ui.layer, {
      save: this.save,
      onChange: () => this.save.save(),
      onPreview: () => this.openPreview(),
      showText: (title, text) => this.ui.showTextBox(title, text, 'Select all and copy. Paste it into Notes, a text, or a chat with Claude to tune the questions.'),
    });
  }

  openPreview() {
    showPreview(this.ui.layer, { save: this.save, audio: this.audio, buzz: this.buzz });
  }

  async exportSave() {
    const txt = this.save.exportText();
    const name = `twinforge-backup-${new Date().toISOString().slice(0, 10)}.json`;
    try {
      const file = new File([txt], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'TwinForge backup' });
        return;
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return;
    }
    try {
      const url = URL.createObjectURL(new Blob([txt], { type: 'application/json' }));
      const a = h('a', { href: url, download: name });
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      this.ui.showTextBox('Backup', txt); // downloads are unreliable in iOS home-screen apps and previews
    } catch {
      this.ui.showTextBox('Backup', txt);
    }
  }
}

const app = new App();
app.init();
