// Explicit battle state machine. Rules come from logic/battle.js, animation from
// Director, questions from ChallengeUI. Input is only accepted in CHOOSE, and the
// first accepted tap locks it until the whole turn has resolved.
import { arenaFor } from '../data/arenas.js';
import { battleTrackFor } from '../audio/music.js';
import { BOSS_SCALE } from './modes.js';
import { createBattle, heroAct, foeAct, canAct, foeIntent, RULES, moveFor, learningFor, meterOf } from '../logic/battle.js';
import { settleBattle } from '../logic/outcome.js';
import { pickQuestion } from '../logic/question-picker.js';
import { recordResult, playLevel, bandFor } from '../logic/difficulty.js';
import { awardXp, xpForAnswer, xpForWin } from '../logic/progression.js';
import { awardToyXp, levelOf } from '../logic/gear.js';
import { recordAnswer, noteLevel } from '../logic/learning-log.js';
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
  // stop: { arenaId, boss } from a game-mode run (game/modes.js)
  // startEnergy: a retry hand (logic/outcome.js); 0 for a first try
  constructor({ app, chars, heroId, foeId, resume, stop = null, startEnergy = 0 }) {
    this.app = app;
    this.chars = chars;
    this.stage = app.stage;
    this.audio = app.audio;
    this.save = app.save;
    this.rng = new Rng((Date.now() ^ 0x5eed) >>> 0);
    // the player's pathway sets the stakes (charge meter, foe strength); a resumed battle keeps its own
    this.state = resume || createBattle({ heroId, foeId, chars, arenaId: stop?.arenaId || arenaFor(foeId), boss: !!stop?.boss, pathway: this.save.pathway, startEnergy });
    if (!resume && stop?.scale) this.state.foeScale = stop.scale;
    this.resumed = !!resume;
    this.phase = PHASE.INTRO;
    this.locked = true;
    this.token = 0;
    this.log = []; // phase history, used by tests
    this.currentChallenge = null;
    this.fails = 0;
    this.xpStart = this.save.data.player?.xp || 0; // for the level-up celebration afterwards
    const toy = (this.save.data.toys || {})[this.state.heroId] || {};
    this.toyStart = { xp: toy.xp || 0, level: levelOf(toy) }; // this toy's own level (logic/gear.js)
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
    this.stage.setArena(s.arenaId || arenaFor(s.foeId));
    this.stage.setFighters(heroDef, foeDef, { foeBig: s.foeScale || (s.boss ? BOSS_SCALE : 1) });
    this.director = new Director(this.stage, this.audio);
    this.hud = new Hud(this.app.ui.layer, { heroDef, foeDef, px: this.app.px, toVirtual: this.app.ui.toVirtual, learning: this.learning });
    this.challenge = new ChallengeUI(this.app.ui.layer, this.audio, buzz);
    this.hud.on('action', (k) => this.guard(this.onAction(k)));
    this.hud.on('pause', () => this.pause());
    this.hud.setHP('hero', s.hero.hp, s.hero.maxHp, true);
    this.hud.setHP('foe', s.foe.hp, s.foe.maxHp, true);
    this.hud.setEnergy(s.hero.energy);
    this.syncStatus();
    const vsCzernobog = this.state.foeId === 'nightwing';
    this.audio.play(vsCzernobog ? 'czernobog' : battleTrackFor(this.state.arenaId || arenaFor(this.state.foeId), this.state.boss));
    this.director.setStorm(vsCzernobog);
    this.app.wakeLock(true);
    const tok = ++this.token;
    this.setPhase(PHASE.INTRO);
    await this.director.intro();
    if (tok !== this.token) return;
    // restore visual statuses when resuming
    const f = this.stage.fighters;
    f.foe.charged = !!(s.foe.charged || s.foe.windup);
    f.foe.dizzy = s.foe.dizzy;
    if (f.foe.charged) f.foe.aura = 0.45;
    if (s.hero.guard || s.hero.shield) {
      const gm = moveFor(heroDef, 'guard') || {};
      f.hero.guardType = s.hero.guard || 'block';
      f.hero.guardColor = gm.color;
      f.hero.shield = 1;
    }
    if (s.turn === 'foe') return this.foeTurn();
    return this.heroTurn();
  }

  // Every async battle step runs through here: if one throws, log it and put
  // the battle back on its feet instead of leaving a 4-year-old stuck.
  guard(p) {
    return Promise.resolve(p).catch((e) => {
      console.error('[twinforge] battle step failed', e);
      this.recover();
    });
  }

  recover() {
    if (this.phase === PHASE.GONE) return;
    // the results screen itself failed, or this keeps failing: back to the menu (the battle is saved)
    if (this.phase === PHASE.END || ++this.fails > 3) return this.app.goModes();
    this.token++; // stop whatever was still running
    this.currentChallenge = null;
    this.app.ui.layer.querySelectorAll('.challenge').forEach((n) => n.remove());
    this.stage.dim = 0;
    const s = this.state;
    try {
      for (const f of Object.values(this.stage.fighters)) f && this.director.reset(f);
      this.hud.setHP('hero', s.hero.hp, s.hero.maxHp, true);
      this.hud.setHP('foe', s.foe.hp, s.foe.maxHp, true);
      this.syncStatus();
    } catch {}
    if (s.result) return this.guard(this.end());
    return this.guard(s.turn === 'foe' ? this.foeTurn() : this.heroTurn());
  }

  syncStatus() {
    const s = this.state;
    this.hud.setStatus('hero', { shield: !!(s.hero.guard || s.hero.shield) });
    this.hud.setStatus('foe', { charged: s.foe.charged, dizzy: s.foe.dizzy });
    this.hud.setMeter(meterOf(s));
  }

  // the foe shows its red "!" while it's charged up (its own charge, or a full meter)
  syncFoeLook() {
    const foe = this.stage.fighters.foe;
    if (foe) foe.charged = !!(this.state.foe.charged || this.state.foe.windup);
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
    // a big hit is coming: the foe's own slam, or a charged attack from a full meter
    const threat = intent === 'slam' || (s.foe.windup && (intent === 'quick' || intent === 'power'));
    const tut = this.save.data.progress.tutorial;
    this.hud.setEnergy(s.hero.energy);
    this.hud.btn.guard.classList.toggle('locked', !canAct(s, 'guard'));
    this.hud.showActions(true, {
      suggestDefend: threat,
      suggestSpecial: canAct(s, 'special'),
    });
    // first-battle helper hand
    const first = this.learning ? 'power' : 'quick';
    if (!tut[first]) this.hud.pointAt(first);
    else if (canAct(s, 'special') && !tut.special) this.hud.pointAt('special');
    else if (threat && !tut.guard) this.hud.pointAt('guard');
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
      const pathway = this.save.pathway;
      const lvl = playLevel(this.save.data.skills[skillKey], pathway);
      const force = window.__TBB_FORCE__ || {};
      const off = this.save.data.settings.offKinds;
      const L = this.save.data.learning;
      const ch = pickQuestion(domain === 'math' ? 'math' : 'reading', lvl, this.rng, { force: domain === 'math' ? force.math : force.reading, off, mem: L && L.mem });
      this.currentChallenge = ch;
      this.stage.dim = 0.35;
      quality = await this.challenge.run(ch, kind === 'special' ? 'special' : 'attack', moveFor(this.chars[this.state.heroId], kind));
      this.currentChallenge = null;
      this.stage.dim = 0;
      if (tok !== this.token) return;
      this.save.data.skills[skillKey] = recordResult(this.save.data.skills[skillKey], quality, bandFor(pathway));
      recordAnswer(L, ch, quality, this.challenge.lastStats || {});
      noteLevel(L, skillKey, lvl, playLevel(this.save.data.skills[skillKey], pathway), 'auto');
      this.save.data.player = awardXp(this.save.data.player, xpForAnswer(quality)).player;
      this.save.data.toys = awardToyXp(this.save.data.toys, this.state.heroId, xpForAnswer(quality)).toys; // the toy learns with you
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
    if (kind === 'quick' || kind === 'power') {
      await d.attack(hero, foe, move, { quality, applyHit });
      const heal = kind === 'power' && events.find((e) => e.type === 'heal'); // HEAL power style (logic/gear.js)
      if (heal) {
        this.hud.setHP('hero', heal.hp, heal.maxHp);
        if (heal.amount > 0) d.healGlow(hero, heal.amount, 'HEAL!');
      }
    } else if (kind === 'guard') await d.guardUp(hero, move);
    else if (kind === 'special') {
      this.hud.setEnergy(this.state.hero.energy); // a FAST special leaves the extra pip
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
        await d.energyOrbs(e.gained, (i) => this.app.toStage(this.hud.energyAnchor(i)), start);
        this.hud.setEnergy(e.energy, true);
        { const c = this.state.hero.specialCost || RULES.maxEnergy; if (e.gained > 0 && e.energy >= c && e.energy - e.gained < c) this.audio.sfx('ready'); }
      }
      // charge meter: wrong taps light flames, a first-try answer puts one out
      if (e.type === 'meter') {
        this.hud.setMeter({ meter: e.meter, max: e.max, windup: false }, true);
        this.audio.sfx(e.reason === 'wrong' ? 'blockDrop' : 'pop');
        await d.wait(300);
      }
      if (e.type === 'windup') {
        this.hud.setMeter(meterOf(this.state));
        const foeDef = this.chars[this.state.foeId];
        await d.foeWindup(moveFor(foeDef, 'special')?.color, this.app.toStage(this.hud.meterAnchor()));
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
      // a charged attack (full meter) plays as the foe's big special, wind-up and all
      if (act.action === 'slam' || act.charged) await d.special(foe, hero, moveFor(foeDef, 'special'), { ev: dmg, applyHit });
      else await d.attack(foe, hero, moveFor(foeDef, act.action), { ev: dmg, applyHit });
      if (reflect) d.singe(foe, () => this.hud.setHP('foe', reflect.hp, reflect.maxHp));
      foe.aura = 0;
    }
    if (tok !== this.token) return;
    this.syncFoeLook();
    for (const e of events) {
      if (e.type === 'meter') this.hud.setMeter({ meter: e.meter, max: e.max, windup: false });
      if (e.type === 'secondwind') { // once a battle, at low health: a breath, not a rescue
        this.stage.fx.word('HANG ON!', hero.center().x, hero.center().y - 150, { size: 40, color: '#FFC914' });
        this.audio.sfx('powerUp');
        await d.wait(350);
      }
      if (e.type === 'energy' && e.gained > 0) {
        await d.energyOrbs(e.gained, (i) => this.app.toStage(this.hud.energyAnchor(i)), e.energy - e.gained);
        this.hud.setEnergy(e.energy, true);
        { const c = this.state.hero.specialCost || RULES.maxEnergy; if (e.gained > 0 && e.energy >= c && e.energy - e.gained < c) this.audio.sfx('ready'); }
      }
      if (e.type === 'shield' && !e.on) d.shieldOff(this.stage.fighters.hero);
    }
    this.syncStatus();
    if (this.state.result) return this.end();
    await d.wait(200);
    return this.heroTurn();
  }

  async end() {
    if (this.phase === PHASE.END) return;
    this.setPhase(PHASE.END);
    this.hud.showActions(false);
    this.hud.setPauseVisible(false);
    const s = this.state;
    // a win adds stars and XP; a loss only counts the battle (logic/outcome.js)
    const settled = settleBattle(this.save.data, s);
    const p = Object.assign(this.save.data.progress, settled.progress);
    this.save.data.player = settled.player;
    const stars = settled.stars;
    if (s.result === 'win') this.save.data.toys = awardToyXp(this.save.data.toys, s.heroId, xpForWin(stars)).toys;
    this.save.data.battle = null;
    this.save.save();
    // a broken victory dance must never cost the stars or the results screen
    try {
      this.audio.stopMusic(s.result === 'win' ? 0.2 : 0.4);
      await (s.result === 'win' ? this.director.win() : this.director.lose());
      this.audio.play(s.result === 'win' ? 'victory' : 'nap');
      await this.director.wait(500);
    } catch (e) {
      console.error('[twinforge] ending animation failed', e);
    }
    this.app.wakeLock(false);
    if (this.phase !== PHASE.END) return;
    const toyNow = (this.save.data.toys || {})[s.heroId] || {};
    this.app.onBattleEnd({ win: s.result === 'win', stars, total: p.stars, state: s, xpStart: this.xpStart,
      toy: { id: s.heroId, from: this.toyStart, to: { xp: toyNow.xp || 0, level: levelOf(toyNow) } } });
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
        try {
          this.app.goTitle();
        } catch (e) {
          console.error('[twinforge] going home failed', e);
          location.reload(); // the battle is saved; the title offers to resume it
        }
      },
    });
  }

  destroy() {
    this.token++;
    this.setPhase(PHASE.GONE);
    this.hud && this.hud.destroy();
    this.app.ui.layer.querySelectorAll('.challenge').forEach((n) => n.remove());
    this.stage.dim = 0;
    this.stage.vignette = 0;
    this.director.storm = null;
    this.stage.fx.clear();
    this.app.wakeLock(false);
  }
}
