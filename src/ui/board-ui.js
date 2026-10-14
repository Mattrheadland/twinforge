// Campaign board screen: a winding path across the five worlds, the hero's
// token, a big die (1–3), and hop-by-hop counting. Logic lives in
// game/campaign.js; this file only draws and animates.
import { h, onTap } from './dom.js';
import { ICON } from './icons.js';
import { portrait } from './hud.js';
import { pixelLabel } from '../render/pixel.js';
import { WORLDS } from '../game/campaign.js';
import { ARENAS } from '../data/arenas.js';

const STEP = 118; // px between spaces
const PAD = 120;
const ROW_Y = 236;
const yAt = (i) => ROW_Y + Math.sin(i * 0.85) * 62;
const xAt = (i) => PAD + i * STEP;

const PIPS = { 1: [[50, 50]], 2: [[28, 28], [72, 72]], 3: [[26, 26], [50, 50], [74, 74]] };
const dieFace = (n) => `<svg viewBox="0 0 100 100"><rect x="6" y="6" width="88" height="88" rx="18" fill="#fff" stroke="#14111A" stroke-width="7"/>${(PIPS[n] || []).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="10" fill="#D7263D"/>`).join('')}</svg>`;

// portraits are 3D snapshots: draw each toy once, then copy
const shots = new Map();
function face(def, size, px) {
  const key = `${def.id}|${size}`;
  if (!shots.has(key)) shots.set(key, portrait(def, size, px));
  const src = shots.get(key);
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  c.style.width = src.style.width; c.style.height = src.style.height;
  c.className = src.className;
  c.getContext('2d').drawImage(src, 0, 0);
  return c;
}

export function showBoard(ui, { campaign, board, chars, onRoll, onFight, onHome, make3D = null }) {
  ui.clear();
  if (make3D) return showBoard3D(ui, { campaign, board, chars, onRoll, onFight, onHome, make3D });
  const px = ui.app.px;
  const hero = chars[campaign.heroId];
  const W = xAt(board.length - 1) + PAD + 200;

  // world strips with the arena art behind them
  const strips = WORLDS.map((w, wi) => {
    const idx = board.map((s, i) => (s.world === wi ? i : -1)).filter((i) => i >= 0);
    const x0 = wi === 0 ? 0 : (xAt(idx[0] - 1) + xAt(idx[0])) / 2;
    const x1 = wi === WORLDS.length - 1 ? W : (xAt(idx.at(-1)) + xAt(idx.at(-1) + 1)) / 2;
    return h('div', { class: 'board-world', style: { left: x0 + 'px', width: x1 - x0 + 'px', backgroundImage: `url(arenas/${w.arena}/backdrop.jpg)` } },
      h('div', { class: 'board-world-name' }, pixelLabel(ARENAS[w.arena].name, 14, '#ffffff')));
  });

  // dotted path
  const pts = board.map((_, i) => `${xAt(i)},${yAt(i)}`).join(' ');
  const path = h('div', { class: 'board-path', html: `<svg width="${W}" height="450" viewBox="0 0 ${W} 450"><polyline points="${pts}" fill="none" stroke="#14111A" stroke-width="16" stroke-linejoin="round" stroke-linecap="round"/><polyline points="${pts}" fill="none" stroke="#FFE7A0" stroke-width="8" stroke-dasharray="2 16" stroke-linejoin="round" stroke-linecap="round"/></svg>` });

  // spaces
  const spaceEls = board.map((sp, i) => {
    const kids = [];
    if (sp.type === 'start') kids.push(h('span', { class: 'sp-icon', html: ICON.home }));
    else if (sp.type === 'star') kids.push(h('span', { class: 'sp-icon', html: ICON.star }));
    else if (sp.type === 'lucky') kids.push(h('span', { class: 'sp-icon', html: dieFace(3) }));
    else {
      const def = chars[sp.foeId];
      kids.push(face(def, sp.type === 'boss' ? 74 : 50, px));
      if (sp.type === 'boss') kids.push(h('span', { class: 'sp-crown', html: ICON.crown }));
    }
    const el = h('div', { class: `space sp-${sp.type} ${sp.giant ? 'giant' : ''} ${sp.final ? 'final' : ''}`, style: { left: xAt(i) + 'px', top: yAt(i) + 'px', '--c': sp.foeId ? chars[sp.foeId].color : '' } }, ...kids,
      h('span', { class: 'sp-check', html: ICON.checkBadge }));
    return el;
  });

  const token = h('div', { class: 'board-token', style: { '--c': hero.color } }, face(hero, 60, px));
  const pop = h('div', { class: 'board-pop' });
  const track = h('div', { class: 'board-track', style: { width: W + 'px' } }, ...strips, path, ...spaceEls, token, pop);

  // HUD
  const starNum = h('span', { class: 'board-stars-num' });
  const stars = h('div', { class: 'board-stars' }, h('span', { html: ICON.star }), starNum);
  const die = h('button', { class: 'board-die', 'aria-label': 'Roll the die', html: dieFace(3) });
  const fight = h('button', { class: 'board-fight hidden', 'aria-label': 'Fight', html: ICON.fist });
  const home = h('button', { class: 'corner-btn home-btn', 'aria-label': 'Home', html: ICON.home });
  onTap(home, onHome, 500);
  const scr = h('div', { class: 'screen board-screen', 'data-spaces': board.length }, h('div', { class: 'board-view' }, track), stars, die, fight, home);
  ui.layer.appendChild(scr);

  let busy = false;
  const view = { cam: 0 };
  const placeToken = (i, hop = false) => {
    token.style.transform = `translate(${xAt(i)}px, ${yAt(i)}px)`;
    if (hop) { token.classList.remove('hop'); void token.offsetWidth; token.classList.add('hop'); }
    const viewW = scr.clientWidth || 874;
    view.cam = Math.max(0, Math.min(W - viewW, xAt(i) - viewW * 0.4));
    track.style.transform = `translateX(${-view.cam}px)`;
  };
  const sync = (c) => {
    starNum.replaceChildren(pixelLabel(String(c.stars), 20, '#FFC914'));
    spaceEls.forEach((el, i) => el.classList.toggle('cleared', c.cleared.includes(i) && i > 0));
    const p = board[c.pos];
    const waiting = (p.type === 'fight' || p.type === 'boss') && !c.cleared.includes(c.pos);
    die.classList.toggle('hidden', waiting || c.done);
    fight.classList.toggle('hidden', !waiting);
  };
  const say = (text, color = '#FFC914', x = null, y = null) => {
    const el = h('div', { class: 'pop-word' }, pixelLabel(text, 30, color, { chunk: 2 }));
    el.style.left = (x ?? xAt(api.campaign.pos)) + 'px';
    el.style.top = (y ?? yAt(api.campaign.pos) - 90) + 'px';
    pop.appendChild(el);
    setTimeout(() => el.remove(), 900);
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const api = {
    campaign,
    // Animate a roll: die tumble, then one hop per space with the count shown.
    async play(roll, result) {
      busy = true;
      die.classList.add('rolling');
      for (let k = 0; k < 6; k++) { die.innerHTML = dieFace(1 + (k % 3)); ui.app.audio.sfx('tap'); await wait(80); }
      die.innerHTML = dieFace(roll);
      die.classList.remove('rolling');
      die.classList.add('landed');
      say(String(roll), '#ffffff');
      await wait(450);
      die.classList.remove('landed');
      for (let k = 0; k < result.hops.length; k++) {
        const i = result.hops[k];
        placeToken(i, true);
        ui.app.audio.sfx('jump');
        ui.app.buzz('light');
        await wait(170);
        say(String(k + 1), '#FFC914', xAt(i), yAt(i) - 96);
        await wait(230);
      }
      api.campaign = result.campaign;
      sync(result.campaign);
      if (result.event === 'star') {
        ui.app.audio.sfx('star', 0);
        say('+1', '#FFC914');
        spaceEls[result.campaign.pos].classList.add('burst');
      } else if (result.event === 'lucky') {
        ui.app.audio.sfx('powerUp');
        say('AGAIN!', '#5CE07A');
      } else if (result.event === 'fight') {
        const sp = board[result.campaign.pos];
        say(sp.type === 'boss' ? 'BOSS!' : 'FIGHT!', '#FF5A4A');
        ui.app.audio.sfx('warn');
      }
      busy = false;
      return result.event;
    },
    get busy() { return busy; },
  };
  onTap(die, () => { if (!busy) onRoll(api); }, 400);
  onTap(fight, () => { if (!busy) onFight(api); }, 600);
  placeToken(campaign.pos);
  sync(campaign);
  return api;
}

// ---------- 3D diorama version (render3d/board3d.js draws the board) ----------
// Same HUD and the same play() contract; the stage renders the island scene
// behind this transparent screen.
function showBoard3D(ui, { campaign, board, chars, onRoll, onFight, onHome, make3D }) {
  const pop = h('div', { class: 'board-pop' });
  const worldName = h('div', { class: 'board-world-name' });
  const starNum = h('span', { class: 'board-stars-num' });
  const stars = h('div', { class: 'board-stars' }, h('span', { html: ICON.star }), starNum);
  const die = h('button', { class: 'board-die', 'aria-label': 'Roll the die', html: dieFace(3) });
  const fight = h('button', { class: 'board-fight hidden', 'aria-label': 'Fight', html: ICON.fist });
  const home = h('button', { class: 'corner-btn home-btn', 'aria-label': 'Home', html: ICON.home });
  onTap(home, onHome, 500);
  const scr = h('div', { class: 'screen board-screen board-3d', 'data-spaces': board.length }, worldName, pop, stars, die, fight, home);
  ui.layer.appendChild(scr);
  const view = make3D({ board, chars, heroDef: chars[campaign.heroId], cleared: campaign.cleared, pos: campaign.pos, owner: scr });

  let busy = false;
  let shownWorld = -1;
  const showWorld = (i) => {
    const wi = board[i].world;
    if (wi === shownWorld) return;
    shownWorld = wi;
    worldName.replaceChildren(pixelLabel(ARENAS[WORLDS[wi].arena].name, 14, '#ffffff'));
    worldName.classList.remove('pop-in'); void worldName.offsetWidth; worldName.classList.add('pop-in');
  };
  const sync = (c) => {
    starNum.replaceChildren(pixelLabel(String(c.stars), 20, '#FFC914'));
    view.setCleared(c.cleared);
    scr.dataset.cleared = c.cleared.filter((i) => i > 0).join(',');
    const p = board[c.pos];
    const waiting = (p.type === 'fight' || p.type === 'boss') && !c.cleared.includes(c.pos);
    die.classList.toggle('hidden', waiting || c.done);
    fight.classList.toggle('hidden', !waiting);
    showWorld(c.pos);
  };
  const say = (text, color, i, up = 150) => {
    const at = view.project(i, up);
    const el = h('div', { class: 'pop-word' }, pixelLabel(text, 30, color, { chunk: 2 }));
    el.style.left = at.x + 'px';
    el.style.top = at.y + 'px';
    pop.appendChild(el);
    setTimeout(() => el.remove(), 900);
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const api = {
    campaign,
    view,
    async play(roll, result) {
      busy = true;
      die.classList.add('rolling');
      for (let k = 0; k < 6; k++) { die.innerHTML = dieFace(1 + (k % 3)); ui.app.audio.sfx('tap'); await wait(80); }
      die.innerHTML = dieFace(roll);
      die.classList.remove('rolling');
      die.classList.add('landed');
      say(String(roll), '#ffffff', api.campaign.pos);
      await wait(450);
      die.classList.remove('landed');
      for (let k = 0; k < result.hops.length; k++) {
        const i = result.hops[k];
        ui.app.audio.sfx('jump');
        ui.app.buzz('light');
        await Promise.race([view.moveTo(i), wait(400)]);
        showWorld(i);
        say(String(k + 1), '#FFC914', i);
        await wait(140);
      }
      api.campaign = result.campaign;
      sync(result.campaign);
      const at = result.campaign.pos;
      if (result.event === 'star') {
        ui.app.audio.sfx('star', 0);
        view.burst(at);
        say('+1', '#FFC914', at);
      } else if (result.event === 'lucky') {
        ui.app.audio.sfx('powerUp');
        say('AGAIN!', '#5CE07A', at);
      } else if (result.event === 'fight') {
        say(board[at].type === 'boss' ? 'BOSS!' : 'FIGHT!', '#FF5A4A', at, 190);
        ui.app.audio.sfx('warn');
      }
      busy = false;
      return result.event;
    },
    get busy() { return busy; },
  };
  onTap(die, () => { if (!busy) onRoll(api); }, 400);
  onTap(fight, () => { if (!busy) onFight(api); }, 600);
  sync(campaign);
  return api;
}
