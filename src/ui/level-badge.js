// The player's level and XP bar (logic/progression.js), shown on the who's-playing
// cards, the title and mode screens, and after a battle. No reading needed: a gold
// coin with the level number and a bar that fills toward the next level.
import { h } from './dom.js';
import { pixelLabel } from '../render/pixel.js';
import { xpProgress } from '../logic/progression.js';

const pct = (p) => (p.needed ? Math.round((100 * p.into) / p.needed) : 100);
const reduced = () => typeof document !== 'undefined' && document.documentElement.classList.contains('reduced');

// The bar for a save's `player` ({ xp, level }) or a bare XP number. A stored level
// above what the XP gives (an imported save) is shown as is, with an empty bar.
function progressOf(player) {
  if (typeof player !== 'object' || !player) return xpProgress(player);
  const p = xpProgress(player.xp);
  return player.level > p.level ? { ...p, level: player.level, into: 0 } : p;
}

// size: 'big' (title / results) or 'small' (cards, mode screen)
export function levelBadge(player, { size = 'small', cls = '' } = {}) {
  const p = progressOf(player);
  const numPx = size === 'big' ? 26 : 18;
  const num = h('span', { class: 'lvl-num' }, pixelLabel(String(p.level), numPx, '#ffffff'));
  const fill = h('i', { style: { width: pct(p) + '%' } });
  const el = h('div', { class: `lvl-badge ${size} ${cls}`.trim(), 'aria-label': `Level ${p.level}` },
    num, h('span', { class: 'xp-bar' }, fill));
  el._fill = fill;
  el._num = num;
  el._numPx = numPx;
  return el;
}

function setLevel(el, level) {
  el._num.replaceChildren(pixelLabel(String(level), el._numPx, '#ffffff'));
  el.setAttribute('aria-label', `Level ${level}`);
}

// After a battle: the bar fills from `from` XP to `to` XP. A level gained gets a
// short celebration (LEVEL UP!, the coin pops, a fanfare). Reduced motion: the bar
// and the new level just appear, with the same words and sound.
export function xpResult(ui, { from, to }) {
  const a = xpProgress(from), b = xpProgress(to);
  const el = levelBadge(from, { size: 'big', cls: 'result-lvl' });
  const up = to > from && b.level > a.level;
  // beside the badge, its room kept from the start so the card never jumps
  const shout = up ? h('div', { class: 'lvl-up waiting' }, pixelLabel('LEVEL UP!', 26, '#FFC914', { chunk: 2 })) : null;
  const box = h('div', { class: 'result-xp' }, el, shout);
  if (to <= from) return box;
  const celebrate = () => {
    setLevel(el, b.level);
    if (!up) return;
    shout.classList.remove('waiting');
    el.classList.add('leveled');
    ui.app?.audio?.sfx('powerUp');
    if (!reduced()) ui.app?.stage?.fx?.confetti?.(ui.app.stage.W, 300);
  };
  if (reduced()) {
    el._fill.style.width = pct(b) + '%';
    setTimeout(celebrate, 400);
    return box;
  }
  // after the stars have landed: fill to the top on a level-up, then start the new level
  setTimeout(() => {
    el._fill.style.width = (up ? 100 : pct(b)) + '%';
    if (!up) return;
    setTimeout(() => {
      celebrate();
      el._fill.style.transition = 'none';
      el._fill.style.width = '0%';
      void el._fill.offsetWidth;
      el._fill.style.transition = '';
      el._fill.style.width = pct(b) + '%';
    }, 700);
  }, 1700);
  return box;
}
