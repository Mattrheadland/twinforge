// TwinForge: Toy Box Tactics — app shell: layout, screens, audio unlock, saves, PWA.
import { CHARACTERS, ROSTER, opponentFor } from './data/characters.js';
import { VH } from './render/stage.js';
import { createStage } from './render3d/stage3d.js';
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
import { showBoard } from './ui/board-ui.js';
import { Board3D } from './render3d/board3d.js';
import { Director } from './game/director.js';
import { h } from './ui/dom.js';

const BUILD = typeof __BUILD__ !== 'undefined' ? __BUILD__ : 'dev';

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
    window.__tbb = { app: this, phase: null };
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
    this.requestPersistence();
    this.registerSW();
    if (this.save.recovered) setTimeout(() => this.ui.toast('Save restored from backup'), 800);
    this.goTitle();
  }

  get standalone() {
    return navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  }

  layout() {
    const vw = window.innerWidth, vh = window.innerHeight;
    // landscape world is always 450 units tall; width follows the screen
    const s = vh / VH;
    this.scale = s;
    this.W = vw / s;
    this.px = s * Math.min(window.devicePixelRatio || 1, 3);
    this.layerEl.style.width = this.W + 'px';
    this.layerEl.style.height = VH + 'px';
    this.layerEl.style.transform = `scale(${s})`;
    this.stage.resize(vw, vh, window.devicePixelRatio || 1);
    // safe-area insets in world units
    const probe = document.getElementById('safe-probe');
    const cs = getComputedStyle(probe);
    const L = parseFloat(cs.paddingLeft) || 0, R = parseFloat(cs.paddingRight) || 0, B = parseFloat(cs.paddingBottom) || 0;
    this.layerEl.style.setProperty('--sl', Math.max(L / s, 10) + 'px');
    this.layerEl.style.setProperty('--sr', Math.max(R / s, 10) + 'px');
    this.layerEl.style.setProperty('--sb', Math.max(B / s, 6) + 'px');
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
        navigator.serviceWorker.register('./sw.js').catch(() => {});
      }
    } catch {}
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
      hasBattle: !!d.battle,
      showInstallTip: !this.standalone && !this.debug,
      onPlay: () => {
        this.audio.sfx('select');
        buzz('light');
        if (this.save.data.battle) this.resumeBattle();
        else this.goModes();
      },
      onParent: () => this.openParent(),
    });
  }

  // ---------------- game modes (game/modes.js, game/campaign.js) ----------------
  get records() {
    return this.save.data.records;
  }

  goModes() {
    this.endBattle();
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
      if (c && !c.done) return this.goBoard();
      return this.goSelect((heroId) => {
        this.save.data.campaign = newCampaign(heroId);
        this.save.save();
        this.goBoard();
      }, () => this.goModes());
    }
    const run = this.save.data.run;
    if (mode === 'tournament' && run && run.mode === 'tournament' && !run.done) return this.showRunMap();
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

  beginRun(run) {
    this.save.data.run = run;
    this.save.save();
    if (run.mode === 'tournament') this.showRunMap();
    else this.playStop();
  }

  showRunMap() {
    const run = this.save.data.run;
    this.audio.play('title');
    this.stage.setFighters(null, null);
    this.stage.dim = 0.35;
    showLadder(this.ui, {
      run,
      chars: CHARACTERS,
      onGo: () => this.playStop(),
      onHome: () => this.goModes(),
    });
  }

  async playStop() {
    const run = this.save.data.run;
    const stop = current(run);
    this.audio.sfx('powerUp');
    await this.ui.showVS(CHARACTERS[run.heroId], CHARACTERS[stop.foeId], { boss: stop.boss });
    this.startBattle(run.heroId, stop.foeId, null, { ...stop, kind: 'run' });
  }

  // ---------------- campaign board ----------------
  goBoard() {
    this.endBattle();
    this.leaveGallery();
    const c = this.save.data.campaign;
    const board = buildBoard(c.heroId);
    this.audio.play('title'); // the board had no music after the first fight's victory jingle
    this.stage.setFighters(null, null);
    this.stage.dim = this.stage.is3D ? 0 : 0.6;
    this.boardView = showBoard(this.ui, {
      campaign: c,
      board,
      chars: CHARACTERS,
      make3D: this.stage.is3D ? (opts) => {
        const b = new Board3D(this.stage, opts);
        this.stage.setBoard(b, opts.owner);
        return b;
      } : null,
      onRoll: async (api) => {
        const roll = rollDie();
        const res = move(this.save.data.campaign, board, roll);
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
      this.startBattle(c.heroId, stop.foeId, null, { ...stop, kind: 'campaign', at: c.pos });
    } finally {
      this._boardFighting = false;
    }
  }

  // Called by the battle when it's over.
  onBattleEnd({ win, stars, total, state }) {
    const home = () => this.goModes();
    // campaign board fight
    const c = this.save.data.campaign;
    if (state.from === 'campaign' && c && !c.done && c.pos === state.at && c.heroId === state.heroId) {
      const board = buildBoard(c.heroId);
      if (!win) return showRunResult(this.ui, { win, stars, total, onAgain: () => this.boardFight(), onHome: () => this.goBoard() });
      const next = winSpace(c, board, stars);
      this.save.data.campaign = next;
      if (next.done) this.save.data.records = recordRun(this.records, { mode: 'campaign', done: true, heroId: next.heroId });
      this.save.save();
      if (next.done) {
        this.stage.fx.confetti(this.stage.W, 450);
        this.audio.sfx('perfect');
        return showRunResult(this.ui, { win, stars, total, onNext: () => showTrophy(this.ui, { mode: 'campaign', heroDef: CHARACTERS[next.heroId], stars: next.stars, onHome: () => { this.save.data.campaign = null; this.save.save(); home(); } }), onHome: home });
      }
      return showRunResult(this.ui, { win, stars, total, onNext: () => this.goBoard(), onHome: home });
    }
    const run = this.save.data.run;
    const stop = current(run);
    const inRun = state.from === 'run' && run && stop && stop.foeId === state.foeId && run.heroId === state.heroId;
    if (!inRun) {
      return showRunResult(this.ui, { win, stars, total, onAgain: () => this.startBattle(state.heroId, state.foeId), onHome: home });
    }
    if (run.mode === 'arcade') {
      if (win) {
        this.save.data.records = recordRun(this.records, winStop(run, stars));
        this.save.save();
      }
      return showRunResult(this.ui, { win, stars, total, onAgain: () => this.playStop(), onHome: home });
    }
    // tournament
    if (!win) return showRunResult(this.ui, { win, stars, total, onAgain: () => this.playStop(), onHome: home });
    const next = winStop(run, stars);
    this.save.data.run = next.done ? null : next;
    this.save.data.records = recordRun(this.records, next);
    this.save.save();
    if (next.done) {
      this.stage.fx.confetti(this.stage.W, 450);
      this.audio.sfx('perfect');
      return showRunResult(this.ui, { win, stars, total, onNext: () => showTrophy(this.ui, { mode: next.mode, heroDef: CHARACTERS[next.heroId], stars: next.stars, onHome: home }), onHome: home });
    }
    return showRunResult(this.ui, { win, stars, total, onNext: () => this.showRunMap(), onHome: home });
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
        if (onHero) return onHero(heroId);
        this.audio.sfx('powerUp');
        const foeId = opponentFor(heroId);
        await this.ui.showVS(CHARACTERS[heroId], CHARACTERS[foeId]);
        this.startBattle(heroId, foeId);
      },
      onHome: () => (onBack ? onBack() : this.goTitle()),
    });
  }

  startBattle(heroId, foeId, resume = null, stop = null) {
    this.endBattle();
    this.leaveGallery();
    this.ui.clear();
    this.stage.cam.drift = 0;
    this.stage.cam.zoom = 1;
    this.stage.dim = 0;
    this.battle = new BattleController({ app: this, chars: CHARACTERS, heroId, foeId, resume, stop });
    if (stop && !resume) {
      // remember where this fight came from (saved with the battle, so a resume knows too)
      this.battle.state.from = stop.kind;
      if (stop.kind === 'campaign') this.battle.state.at = stop.at;
    }
    this.battle.start();
  }

  resumeBattle() {
    const b = this.save.data.battle;
    if (!b) return this.goModes();
    this.startBattle(b.heroId, b.foeId, b);
  }

  // ---------------- toy gallery ----------------
  goGallery() {
    this.endBattle();
    this.stage.setArena('bedroom');
    this.stage.dim = 0;
    this.stage.cam.drift = 0;
    const cam = this.stage.cam;
    cam.zoom = 1.3; cam.fx = 0.5; cam.fy = 0.52;
    this.stage.showcase = { yaw: -0.6 };
    this.gallery = { director: new Director(this.stage, this.audio), busy: false };
    const lastHero = this.save.data.progress.lastHero;
    showGallery(this.ui, {
      roster: ROSTER,
      chars: CHARACTERS,
      index: Math.max(0, ROSTER.indexOf(lastHero)),
      onShow: (id) => {
        this.stage.setFighters(CHARACTERS[id], null);
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
    this.ui.showParent({
      save: this.save,
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
