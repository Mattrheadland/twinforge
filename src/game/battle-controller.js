// Explicit battle state machine. Rules come from logic/battle.js, animation from
// Director, questions from ChallengeUI. Input is only accepted in CHOOSE, and the
// first accepted tap locks it until the whole turn has resolved.
import { arenaFor } from '../data/arenas.js';
import { createBattle, heroAct, foeAct, canAct, foeIntent, RULES, starsFor, moveFor, learningFor } from '../logic/battle.js';
import { makeMath, makeReading } from '../logic/challenges.js';
import { recordResult } from '../logic/difficulty.js';
import { Rng } from '../logic/rng.js';
import { Hud } from '../ui/hud.js';
import { ChallengeUI } from '../ui/challenge.js';
import { Director } from './director.js';
import { buzz } from '../haptics.js';

export const PHASE = {
  INTRO: 'intro', CHOOSE: 'choose', CHALLENGE: 'challenge', HERO_ANIM: 'hero-anim',
  FOE: 'foe', END: 'end', PAUSED: 'paused', GONE: 'gone',
};

export class BattleController {
  constructor({ app, chars, heroId, foeId, resume }) {
    this.app = app;
    this.chars = chars;
    this.stage = app.stage;
    this.audio = app.audio;
    this.save = app.save;
    this.rng = new Rng((Date.now() ^ 0x5eed) >>> 0);
    this.state = resume || createBattle({ heroId, foeId, chars });
    this.resumed = !!resume;
    this.phase = PHASE.INTRO;
    this.locked = true;
    this.token = 0;
    this.log = []; // phase history, used by tests
    this.currentChallenge = null;
  }

  get learning() {
    return this.save.data.settings.learning !== false;
  }

  setPhase(p) {
    this.phase = p;
    this.log.push(p);
    this.app.debug && (window.__tbb.phase = p);
  }

  async start() {
    const s = this.state;
    const heroDef = this.chars[s.heroId], foeDef = this.chars[s.foeId];
    this.stage.setArena(arenaFor(s.foeId));
    this.stage.setFighters(heroDef, foeDef);
    this.director = new Director(this.stage, this.audio);
    this.hud = new Hud(this.app.ui.layer, { heroDef, foeDef, px: this.app.px, toVirtual: this.app.ui.toVirtual, learning: this.learning });
    this.challenge = new ChallengeUI(this.app.ui.layer, this.audio, buzz);
    this.hud.on('action', (k) => this.onAction(k));
    this.hud.on('pause', () => this.pause());
    this.hud.setHP('hero', s.hero.hp, s.hero.maxHp, true);
    this.hud.setHP('foe', s.foe.hp, s.foe.maxHp, true);
    this.hud.setEnergy(s.hero.energy);
    this.syncStatus();
    this.audio.play('battle');
    this.app.wakeLock(true);
    const tok = ++this.token;
    this.setPhase(PHASE.INTRO);
    await this.director.intro();
    if (tok !== this.token) return;
    // restore visual statuses when resuming
    const f = this.stage.fighters;
    f.foe.charged = s.foe.charged;
    f.foe.dizzy = s.foe.dizzy;
    if (s.foe.charged) f.foe.aura = 0.45;
    if (s.hero.guard || s.hero.shield) {
      const gm = moveFor(heroDef, 'guard') || {};
      f.hero.guardType = s.hero.guard || 'block';
      f.hero.guardColor = gm.color;
      f.hero.shield = 1;
    }
    if (s.turn === 'foe') return this.foeTurn();
    return this.heroTurn();
  }

  syncStatus() {
    const s = this.state;
    this.hud.setStatus('hero', { shield: !!(s.hero.guard || s.hero.shield) });
    this.hud.setStatus('foe', { charged: s.foe.charged, dizzy: s.foe.dizzy });
  }

  persist() {
    const d = this.save.data;
    d.battle = this.state.result ? null : this.state;
    this.save.save();
  }

  async heroTurn() {
    if (this.phase === PHASE.GONE) return;
    this.persist();
    this.setPhase(PHASE.CHOOSE);
    this.director.setTurn('hero');
    this.audio.sfx('turn');
    const s = this.state;
    const intent = foeIntent({ ...s, turn: 'foe' }, this.chars);
    const tut = this.save.data.progress.tutorial;
    this.hud.setEnergy(s.hero.energy);
    this.hud.btn.guard.classList.toggle('locked', !canAct(s, 'guard'));
    this.hud.showActions(true, {
      suggestDefend: intent === 'slam',
      suggestSpecial: canAct(s, 'special'),
    });
    // first-battle helper hand
    const first = this.learning ? 'power' : 'quick';
    if (!tut[first]) this.hud.pointAt(first);
    else if (canAct(s, 'special') && !tut.special) this.hud.pointAt('special');
    else if (intent === 'slam' && !tut.guard) this.hud.pointAt('guard');
    else this.hud.pointAt(null);
    this.locked = false;
  }

  // Button handler. Guards against double taps, wrong phase, and locked specials.
  async onAction(kind) {
    if (this.phase !== PHASE.CHOOSE || this.locked) return;
    if (!canAct(this.state, kind)) {
      const b = this.hud.btn[kind];
      if (b) {
        this.audio.sfx('tryAgain');
        b.classList.remove('nudge');
        void b.offsetWidth;
        b.classList.add('nudge');
      }
      return;
    }
    this.locked = true;
    this.audio.sfx('select');
    buzz('light');
    const tut = this.save.data.progress.tutorial;
    tut[kind] = true;
    this.hud.pointAt(null);
    this.hud.showActions(false);
    this.director.setTurn(null);
    const tok = this.token;

    let quality = 'none';
    const domain = this.learning ? learningFor(kind) : null;
    if (domain) {
      this.setPhase(PHASE.CHALLENGE);
      const skillKey = domain === 'math' ? 'math' : 'letters';
      const lvl = this.save.data.skills[skillKey].level;
      const force = window.__TBB_FORCE__ || {};
      const ch = domain === 'math' ? makeMath(lvl, this.rng, force.math) : makeReading(lvl, this.rng, force.reading);
      this.currentChallenge = ch;
      this.stage.dim = 0.35;
      quality = await this.challenge.run(ch, kind === 'special' ? 'special' : 'attack', moveFor(this.chars[this.state.heroId], kind));
      this.currentChallenge = null;
      this.stage.dim = 0;
      if (tok !== this.token) return;
      this.save.data.skills[skillKey] = recordResult(this.save.data.skills[skillKey], quality);
    }

    this.setPhase(PHASE.HERO_ANIM);
    const before = this.state;
    const { state, events } = heroAct(before, kind, quality, this.chars);
    this.state = state;
    await this.playHeroEvents(kind, quality, events, before);
    if (tok !== this.token) return;
    this.syncStatus();
    if (this.state.result) return this.end();
    await this.director.wait(250);
    return this.foeTurn();
  }

  async playHeroEvents(kind, quality, events, before) {
    const d = this.director;
    const { hero, foe } = this.stage.fighters;
    const move = moveFor(this.chars[this.state.heroId], kind) || { slot: kind, name: kind, color: '#FFC914' };
    const dmg = events.find((e) => e.type === 'damage');
    const applyHit = () => dmg && this.hud.setHP('foe', dmg.hp, dmg.maxHp);
    if (kind === 'quick' || kind === 'power') await d.attack(hero, foe, move, { quality, applyHit });
    else if (kind === 'guard') await d.guardUp(hero, move);
    else if (kind === 'special') {
      this.hud.setEnergy(0);
      await d.special(hero, foe, move, { quality, applyHit });
      const dz = events.find((e) => e.type === 'dizzy');
      if (dz) {
        d.setDizzy(foe, true);
        if (dz.cancelledCharge) {
          const hd = foe.head();
          this.stage.fx.word('FIZZLE!', hd.x, hd.top - 30, { size: 40, color: '#F46036' });
        }
      }
      const sh = events.find((e) => e.type === 'shield' && e.on);
      if (sh) await d.guardUp(hero, { name: 'Shielded', guard: 'block', color: move.color });
      const heal = events.find((e) => e.type === 'heal');
      if (heal) {
        this.hud.setHP('hero', heal.hp, heal.maxHp);
        if (heal.amount > 0) d.healGlow(hero, heal.amount, move.healWord);
      }
    }
    for (const e of events) {
      if (e.type === 'ko') return d.wait(200);
      if (e.type === 'energy' && e.gained > 0) {
        const start = e.energy - e.gained;
        if (e.reason === 'bonus') this.stage.fx.word('BONUS!', hero.center().x, hero.center().y - 150, { size: 40, color: '#FFC914' });
        await d.energyOrbs(e.gained, (i) => this.hud.energyAnchor(i), start);
        this.hud.setEnergy(e.energy, true);
        if (e.energy >= RULES.maxEnergy) this.audio.sfx('ready');
      }
    }
  }

  async foeTurn() {
    if (this.phase === PHASE.GONE) return;
    this.setPhase(PHASE.FOE);
    this.persist();
    const tok = this.token;
    const d = this.director;
    d.setTurn('foe');
    this.audio.sfx('foeTurn');
    await d.wait(550);
    if (tok !== this.token) return;
    const before = this.state;
    const { state, events } = foeAct(before, this.chars);
    this.state = state;
    const act = events.find((e) => e.type === 'action');
    const dmg = events.find((e) => e.type === 'damage' && e.target === 'hero');
    const reflect = events.find((e) => e.type === 'damage' && e.kind === 'reflect');
    const foeDef = this.chars[this.state.foeId];
    const { hero, foe } = this.stage.fighters;
    d.setTurn(null);
    if (act.action === 'dizzy') await d.foeDizzySkip();
    else if (act.action === 'charge') await d.foeCharge(moveFor(foeDef, 'special'));
    else {
      foe.charged = false;
      const applyHit = () => this.hud.setHP('hero', dmg.hp, dmg.maxHp);
      if (act.action === 'slam') await d.special(foe, hero, moveFor(foeDef, 'special'), { ev: dmg, applyHit });
      else await d.attack(foe, hero, moveFor(foeDef, act.action), { ev: dmg, applyHit });
      if (reflect) d.singe(foe, () => this.hud.setHP('foe', reflect.hp, reflect.maxHp));
    }
    if (tok !== this.token) return;
    for (const e of events) {
      if (e.type === 'energy' && e.gained > 0) {
        await d.energyOrbs(e.gained, (i) => this.hud.energyAnchor(i), e.energy - e.gained);
        this.hud.setEnergy(e.energy, true);
        if (e.energy >= RULES.maxEnergy) this.audio.sfx('ready');
      }
      if (e.type === 'shield' && !e.on) d.shieldOff(this.stage.fighters.hero);
    }
    this.syncStatus();
    if (this.state.result) return this.end();
    await d.wait(200);
    return this.heroTurn();
  }

  async end() {
    this.setPhase(PHASE.END);
    this.hud.showActions(false);
    this.hud.setPauseVisible(false);
    const s = this.state;
    const p = this.save.data.progress;
    p.battles++;
    let stars = 0;
    if (s.result === 'win') {
      stars = starsFor(s);
      p.wins++;
      p.stars += stars;
      this.audio.stopMusic(0.2);
      await this.director.win();
      this.audio.play('victory');
    } else {
      this.audio.stopMusic(0.4);
      await this.director.lose();
      this.audio.play('nap');
    }
    this.save.data.battle = null;
    this.save.save();
    this.app.wakeLock(false);
    await this.director.wait(500);
    this.app.ui.showResult({
      win: s.result === 'win',
      stars,
      total: p.stars,
      onAgain: () => this.app.startBattle(s.heroId, s.foeId),
      onHome: () => this.app.goTitle(),
    });
  }

  pause() {
    if (this.phase === PHASE.END || this.phase === PHASE.GONE) return;
    this.stage.clock.scale = 0;
    this.audio.suspend();
    this.app.ui.showPause({
      onResume: () => {
        this.stage.clock.scale = 1;
        this.audio.resume();
      },
      onHome: () => {
        this.stage.clock.scale = 1;
        this.audio.resume();
        this.app.goTitle();
      },
    });
  }

  destroy() {
    this.token++;
    this.setPhase(PHASE.GONE);
    this.hud && this.hud.destroy();
    this.app.ui.layer.querySelectorAll('.challenge').forEach((n) => n.remove());
    this.stage.dim = 0;
    this.stage.fx.clear();
    this.app.wakeLock(false);
  }
}
