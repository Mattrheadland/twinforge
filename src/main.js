// TwinForge: Toy Box Tactics — app shell: layout, screens, audio unlock, saves, PWA.
import { CHARACTERS, ROSTER, opponentFor } from './data/characters.js';
import { VH } from './render/stage.js';
import { createStage } from './render3d/stage3d.js';
import { Audio } from './audio/audio.js';
import { SaveStore } from './save.js';
import { UI } from './ui/screens.js';
import { BattleController } from './game/battle-controller.js';
import { buzz, setHaptics } from './haptics.js';
import { h } from './ui/dom.js';

const BUILD = typeof __BUILD__ !== 'undefined' ? __BUILD__ : 'dev';

class App {
  constructor() {
    this.root = document.getElementById('app');
    this.canvas = document.getElementById('stage');
    this.layerEl = document.getElementById('ui');
    this.stage = createStage(this.canvas);
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
  }

  applySettings() {
    const st = this.save.data.settings;
    this.audio.setVolumes(st.music, st.sfx);
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
    const heroId = d.progress.lastHero || ROSTER[0];
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
        else this.goSelect();
      },
      onParent: () => this.openParent(),
    });
  }

  goSelect() {
    this.stage.setFighters(null, null);
    this.stage.dim = 0.25;
    this.ui.showSelect({
      chars: CHARACTERS,
      roster: ROSTER,
      lastHero: this.save.data.progress.lastHero,
      onPick: async (heroId) => {
        this.save.data.progress.lastHero = heroId;
        this.save.save();
        this.audio.sfx('powerUp');
        await this.ui.showVS(CHARACTERS[heroId], CHARACTERS[opponentFor(heroId)]);
        this.startBattle(heroId, opponentFor(heroId));
      },
      onHome: () => this.goTitle(),
    });
  }

  startBattle(heroId, foeId, resume = null) {
    this.endBattle();
    this.ui.clear();
    this.stage.cam.drift = 0;
    this.stage.cam.zoom = 1;
    this.stage.dim = 0;
    this.battle = new BattleController({ app: this, chars: CHARACTERS, heroId, foeId, resume });
    this.battle.start();
  }

  resumeBattle() {
    const b = this.save.data.battle;
    if (!b) return this.goSelect();
    this.startBattle(b.heroId, b.foeId, b);
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
      onClose: () => this.goTitle(),
    });
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
