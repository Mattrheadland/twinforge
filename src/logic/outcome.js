// What a finished battle does to the save, and how to retry it. Pure: no DOM.
//
// A win adds stars and XP. A loss only counts the battle: it never takes stars,
// XP, levels, campaign spaces or run progress away. A retry is a fresh battle
// against the same foe in the same place (full health, empty meters), not a penalty.
import { starsFor, createBattle } from './battle.js';
import { awardXp, xpForWin } from './progression.js';

// progress: save.data.progress, player: save.data.player.
// Returns { progress, player, stars } as new objects.
export function settleBattle({ progress, player }, state) {
  const p = { ...progress, battles: (progress.battles || 0) + 1 };
  let stars = 0;
  let pl = player;
  if (state.result === 'win') {
    stars = starsFor(state);
    p.wins = (p.wins || 0) + 1;
    p.stars = (p.stars || 0) + stars;
    pl = awardXp(player, xpForWin(stars)).player;
  }
  return { progress: p, player: pl, stars };
}

// The `stop` that restarts the same fight (see BattleController / main.startBattle):
// same foe, arena, giant size, and where it came from (campaign space, run mode).
export function retryStop(state) {
  return {
    foeId: state.foeId,
    arenaId: state.arenaId,
    boss: !!state.boss,
    scale: state.foeScale || null,
    kind: state.from || null,
    at: state.at,
    mode: state.runMode || null,
  };
}

// A fresh battle for a retry (what startBattle builds from retryStop).
export function retryBattle(state, chars) {
  const st = retryStop(state);
  return createBattle({ heroId: state.heroId, foeId: st.foeId, chars, arenaId: st.arenaId, boss: st.boss, pathway: state.pathway });
}
