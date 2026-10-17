// Screens for the game modes: mode pick, arena pick, the run map (ladder),
// run results, the trophy, and the toy gallery. Pictures first; the pixel
// labels are for grown-ups reading along.
import { h, onTap } from './dom.js';
import { ICON } from './icons.js';
import { portrait } from './hud.js';
import { pixelLabel } from '../render/pixel.js';
import { ARENAS } from '../data/arenas.js';
import { levelBadge, xpResult } from './level-badge.js';
import { toyResult } from './gear-ui.js';

const bg = (id) => (ARENAS[id] ? `arenas/${id}/backdrop.jpg` : '');

function homeBtn(onHome) {
  const b = h('button', { class: 'corner-btn home-btn', 'aria-label': 'Home', html: ICON.home });
  onTap(b, onHome, 500);
  return b;
}

// ---------------- mode pick ----------------
// player: the active player's { xp, level }, shown top left
export function showModes(ui, { records, campaign, chars, player = null, onPick, onHome }) {
  ui.clear();
  const card = (mode, icon, label, color, badge, i) => {
    const b = h('button', { class: `mode-card mode-${mode}`, style: { '--c': color, '--d': i * 90 + 'ms' }, 'aria-label': label },
      h('span', { class: 'mode-icon', html: ICON[icon] }),
      h('span', { class: 'mode-name' }, pixelLabel(label, 17, '#FFC914', { maxW: 160 })),
      badge || null);
    onTap(b, () => onPick(mode), 500);
    return b;
  };
  const camp = campaign && !campaign.done ? campaign : null;
  const campBadge = camp
    ? h('span', { class: 'mode-badge' }, portrait(chars[camp.heroId], 34, ui.app.px), h('i', { html: ICON.star }), pixelLabel(String(camp.stars), 12, '#ffffff'))
    : Object.keys(records.campaignCleared || {}).length ? h('span', { class: 'mode-badge', html: ICON.checkBadge }) : null;
  const cupBadge = records.trophies ? h('span', { class: 'mode-badge' }, h('i', { html: ICON.trophy }), pixelLabel('x' + records.trophies, 12, '#ffffff')) : null;
  const scr = h('div', { class: 'screen modes-screen' },
    h('div', { class: 'modes-row' },
      card('campaign', 'map', 'CAMPAIGN', '#D7263D', campBadge, 0),
      card('tournament', 'trophy', 'TOURNAMENT', '#1B4FD8', cupBadge, 1),
      card('arcade', 'fist', 'ARCADE', '#2E9E44', null, 2),
      card('gallery', 'gallery', 'TOY BOX', '#6A3FA0', null, 3)),
    player ? levelBadge(player, { size: 'big', cls: 'corner-lvl' }) : null,
    homeBtn(onHome));
  ui.layer.appendChild(scr);
}

// ---------------- arena pick ----------------
export function showArenaPick(ui, { onPick, onHome }) {
  ui.clear();
  const cards = Object.values(ARENAS).map((a, i) => {
    const b = h('button', { class: 'arena-card', style: { '--d': i * 80 + 'ms', backgroundImage: `url(${bg(a.id)})` }, 'aria-label': a.name },
      h('span', { class: 'arena-name' }, pixelLabel(a.name, 13, '#ffffff', { maxW: 150 })));
    onTap(b, () => onPick(a.id), 500);
    return b;
  });
  const shuffle = h('button', { class: 'arena-card shuffle', style: { '--d': cards.length * 80 + 'ms' }, 'aria-label': 'Surprise me' },
    h('span', { class: 'shuffle-icon', html: ICON.shuffle }), h('span', { class: 'arena-name' }, pixelLabel('SURPRISE!', 13, '#FFC914')));
  onTap(shuffle, () => onPick(null), 500);
  // two rows at most: 3, 4 or 5 columns as the arena list grows (the new four's arenas join as their art lands)
  const n = cards.length + 1, cols = n <= 6 ? 3 : n <= 8 ? 4 : 5;
  const cw = { 3: 210, 4: 186, 5: 164 }[cols];
  const grid = h('div', { class: 'arena-grid', style: { '--cols': cols, '--cw': cw + 'px', '--ch': Math.round(cw * 0.667) + 'px' } }, ...cards, shuffle);
  ui.layer.appendChild(h('div', { class: 'screen arena-screen' }, grid, homeBtn(onHome)));
}

// ---------------- run map ----------------
export function showLadder(ui, { run, chars, onGo, onHome }) {
  ui.clear();
  const px = ui.app.px;
  const nodes = run.path.map((s, i) => {
    const state = i < run.step ? 'done' : i === run.step ? 'now' : 'next';
    const size = s.boss ? 86 : 64;
    return h('div', { class: `ladder-node ${state} ${s.boss ? 'boss' : ''}`, style: { '--c': chars[s.foeId].color, '--d': i * 70 + 'ms', backgroundImage: `url(${bg(s.arenaId)})` } },
      portrait(chars[s.foeId], size, px),
      s.boss ? h('span', { class: 'node-crown', html: ICON.crown }) : null,
      state === 'done' ? h('span', { class: 'node-check', html: ICON.checkBadge }) : null,
      state === 'next' && !s.boss ? h('span', { class: 'node-lock' }) : null);
  });
  const hero = h('div', { class: 'ladder-hero', style: { '--c': chars[run.heroId].color } }, portrait(chars[run.heroId], 92, px));
  const go = h('button', { class: 'go-btn', 'aria-label': 'Go', html: ICON.play });
  onTap(go, onGo, 800);
  const title = 'TOURNAMENT';
  ui.layer.appendChild(h('div', { class: `screen ladder-screen mode-${run.mode}` },
    h('div', { class: 'ladder-title' }, pixelLabel(title, 26, '#FFC914', { chunk: 2 })),
    h('div', { class: 'ladder' }, hero, h('div', { class: 'ladder-path' }, ...nodes)),
    h('div', { class: 'ladder-stars' }, h('span', { html: ICON.star }), pixelLabel(String(run.stars), 18, '#FFC914')),
    go, homeBtn(onHome)));
}

// ---------------- run results ----------------
// win: stars + NEXT (or AGAIN for a single fight); lose: nap + AGAIN.
// xp: { from, to } player XP before and after the battle (ui/level-badge.js)
export function showRunResult(ui, { win, stars, total, streak = null, best = null, xp = null, toy = null, onNext, onAgain, onHome }) {
  ui.clear();
  const home = h('button', { class: 'round-btn home', 'aria-label': 'Home', html: ICON.home });
  const btns = [home];
  let busy = false;
  const guard = (fn) => () => { if (!busy) { busy = true; ui.app.audio.sfx('select'); fn(); } };
  onTap(home, guard(onHome), 800);
  if (win && onNext) {
    const next = h('button', { class: 'round-btn again pulse', 'aria-label': 'Next', html: ICON.play });
    onTap(next, guard(onNext), 800);
    btns.push(next);
  } else if (onAgain) {
    // after a loss: one big pulsing "Try again" that restarts the same fight
    const again = h('button', { class: `round-btn again ${win ? '' : 'pulse big'}`, 'aria-label': win ? 'Play again' : 'Try again', html: ICON.retry });
    onTap(again, guard(onAgain), 800);
    btns.push(again);
  }
  let body;
  if (win) {
    const slots = [0, 1, 2].map(() => h('span', { class: 'star-slot', html: ICON.starEmpty }));
    body = h('div', { class: 'result-card win' },
      h('div', { class: 'result-title' }, pixelLabel('YOU WIN!', 72, '#FFC914', { chunk: 2 })),
      h('div', { class: 'star-slots' }, ...slots),
      h('div', { class: 'star-total' }, h('span', { html: ICON.star }), h('b', { class: 'total-num' }, String(total - stars))),
      streak != null ? h('div', { class: 'streak' }, h('span', { html: ICON.flame }), pixelLabel(String(streak), 26, '#FF9A3A')) : null);
    setTimeout(() => ui.fillStars(slots, stars, body.querySelector('.total-num'), total - stars), 700);
  } else {
    body = h('div', { class: 'result-card nap' },
      h('div', { class: 'nap-moon', html: ICON.moon }),
      h('div', { class: 'result-title small' }, pixelLabel('NAP TIME!', 52, '#9FD0FF', { chunk: 2 })),
      streak != null
        ? h('div', { class: 'streak' }, h('span', { html: ICON.flame }), pixelLabel(String(streak), 26, '#FF9A3A'), best != null ? h('span', { class: 'best' }, h('i', { html: ICON.crown }), pixelLabel(String(best), 18, '#FFC914')) : null)
        : h('div', { class: 'nap-sub' }, pixelLabel('TRY AGAIN?', 18, '#ffffff')));
  }
  if (xp) body.appendChild(xpResult(ui, xp));
  if (toy) { const t = toyResult(ui, toy); if (t) body.appendChild(t); }
  ui.layer.appendChild(h('div', { class: 'overlay result' }, body, h('div', { class: 'result-btns' }, ...btns)));
}

// ---------------- trophy ----------------
export function showTrophy(ui, { mode, heroDef, stars, onHome }) {
  ui.clear();
  const icon = mode === 'campaign' ? ICON.crown : ICON.trophy;
  const title = mode === 'campaign' ? 'HERO OF TOWN!' : 'CHAMPION!';
  const home = h('button', { class: 'round-btn again pulse', 'aria-label': 'Home', html: ICON.home });
  onTap(home, () => { ui.app.audio.sfx('select'); onHome(); }, 800);
  ui.layer.appendChild(h('div', { class: 'overlay result trophy' },
    h('div', { class: 'trophy-card' },
      h('div', { class: 'trophy-icon', html: icon }),
      h('div', { class: 'trophy-hero', style: { '--c': heroDef.color } }, portrait(heroDef, 110, ui.app.px)),
      h('div', { class: 'result-title' }, pixelLabel(title, 54, '#FFC914', { chunk: 2 })),
      h('div', { class: 'star-total' }, h('span', { html: ICON.star }), pixelLabel(String(stars), 26, '#FFC914'))),
    h('div', { class: 'result-btns' }, home)));
}

// ---------------- toy gallery ----------------
// The toy stands center stage on its turntable. Drag to spin it; arrows switch
// toys; the four move buttons show off its moves.
export function showGallery(ui, { roster, chars, index, onShow, onMove, onSpin, onHome, onGear = null }) {
  ui.clear();
  let i = index;
  const name = h('div', { class: 'gal-name' });
  const moves = h('div', { class: 'gal-moves' });
  const render = () => {
    const def = chars[roster[i]];
    name.replaceChildren(pixelLabel(def.name, 30, '#FFC914', { chunk: 2, maxW: 420 }));
    moves.replaceChildren(...def.moves.map((m) => {
      const b = h('button', { class: `act move-${m.slot}`, style: { '--mc': m.color }, 'aria-label': m.name },
        h('span', { class: 'gal-move-icon', html: ICON[m.icon] || ICON.fist }),
        h('span', { class: 'gal-move-name' }, pixelLabel(m.name, 11, '#ffffff', { maxW: 120 })));
      onTap(b, () => onMove(m), 700);
      return b;
    }));
    onShow(roster[i]);
  };
  const prev = h('button', { class: 'gal-arrow left', 'aria-label': 'Previous toy', html: ICON.arrowL });
  const next = h('button', { class: 'gal-arrow right', 'aria-label': 'Next toy', html: ICON.arrowR });
  onTap(prev, () => { i = (i + roster.length - 1) % roster.length; render(); }, 350);
  onTap(next, () => { i = (i + 1) % roster.length; render(); }, 350);
  // drag anywhere on the open stage to spin the toy
  const spin = h('div', { class: 'gal-spin' });
  let lastX = null;
  spin.addEventListener('pointerdown', (e) => { lastX = e.clientX; spin.setPointerCapture(e.pointerId); });
  spin.addEventListener('pointermove', (e) => { if (lastX != null) { onSpin((e.clientX - lastX) / 120); lastX = e.clientX; } });
  const end = () => { lastX = null; };
  spin.addEventListener('pointerup', end);
  spin.addEventListener('pointercancel', end);
  // v6 Phase 4: open the toy's armor and moves (preview, no fight)
  const gear = onGear ? h('button', { class: 'corner-btn gal-gear', 'aria-label': 'Armor and moves', html: ICON.armor }) : null;
  if (gear) onTap(gear, () => onGear(roster[i]), 600);
  ui.layer.appendChild(h('div', { class: 'screen gallery-screen' }, spin, name, prev, next, moves, homeBtn(onHome), gear));
  render();
}
