// v6 Phase 4: the gear-up screen. Choose Character → Choose Armor → Choose Moves → Battle, in the
// spirit of picking a kart and parts: the toy turns on its stand on the left, big picture tiles on
// the right, one tap to pick, one big button to fight. Locked things show a padlock and the toy level
// that opens them, so a child can see what's coming. Grown-up words (what a choice does) sit in a
// small caption under the tiles; the tiles themselves need no reading.
//
// Data and rules: logic/gear.js. Toy Box opens this screen as a preview (`preview: true`): no fight,
// just DONE.
import { h, onTap } from './dom.js';
import { ICON } from './icons.js';
import { pixelLabel } from '../render/pixel.js';
import { ARMORS, ARMOR_ORDER, STYLES, SLOT_ORDER, EVOLUTIONS, unlocks, normalizeKit, toyProgress, nextUnlock, awardToyXp } from '../logic/gear.js';

const SLOT_COLOR = { quick: '#F46036', power: '#FFC914', guard: '#4EA8DE', special: '#A8EE8C' };

// def: the toy (plain CHARACTERS entry). rec: its record from the save ({ xp, level, kit }).
// onChange(kit): every pick (the caller saves it and refreshes the preview). onGo(kit) / onBack().
export function showGear(ui, { def, rec, preview = false, onChange, onGo, onBack }) {
  ui.clear();
  const u = unlocks(rec);
  let kit = normalizeKit(rec && rec.kit, rec);
  const caption = h('div', { class: 'gear-caption' });
  const say = (text) => caption.replaceChildren(text ? pixelLabel(text, 13, '#ffffff', { maxW: 440 }) : '');

  // ---- header: toy name, its level coin and bar, its evolution
  const prog = toyProgress(rec && rec.xp);
  const lvl = Math.max(prog.level, u.level);
  const pct = prog.needed ? Math.round((100 * prog.into) / prog.needed) : 100;
  const head = h('div', { class: 'gear-head' },
    pixelLabel(def.name, 26, '#FFC914', { chunk: 2, maxW: 250 }),
    h('div', { class: 'lvl-badge small toy-lvl', 'aria-label': `Toy level ${lvl}` },
      h('span', { class: 'lvl-num' }, pixelLabel(String(lvl), 18, '#ffffff')),
      h('span', { class: 'xp-bar' }, h('i', { style: { width: pct + '%' } }))),
    null);

  // ---- armor row
  const armorRow = h('div', { class: 'gear-row gear-armor' });
  const drawArmor = () => armorRow.replaceChildren(...ARMOR_ORDER.map((id) => {
    const a = ARMORS[id], open = u.armors.includes(id), on = kit.armor === id;
    const b = h('button', { class: `gear-tile ${on ? 'on' : ''} ${open ? '' : 'locked'}`, style: { '--gc': a.color || def.color }, 'aria-label': open ? `${a.name} armor` : `${a.name} armor, toy level ${a.level}` },
      h('span', { class: 'gear-ico', html: open ? ICON[a.icon] || ICON.armor : ICON.lock }),
      h('span', { class: 'gear-lbl' }, pixelLabel(open ? a.name : `LV ${a.level}`, 11, '#ffffff', { maxW: 74 })));
    onTap(b, () => {
      if (!open) { ui.app?.audio?.sfx('tap'); return say(`${a.name} armor opens at toy level ${a.level}`); }
      kit = { ...kit, armor: id };
      ui.app?.audio?.sfx('select');
      say(a.says);
      redraw();
    }, 250);
    return b;
  }));

  // ---- one row per move slot: the toy's own move, then the styles
  const moveRows = h('div', { class: 'gear-moves' });
  const drawMoves = () => moveRows.replaceChildren(...SLOT_ORDER.map((slot) => {
    const own = (def.moves || []).find((m) => m.slot === slot) || { name: slot, icon: 'fist', color: SLOT_COLOR[slot] };
    const styles = Object.values(STYLES[slot]);
    const opts = styles.filter((st) => u.styles[slot].includes(st.id) || st === styles.find((x) => !u.styles[slot].includes(x.id)));
    return h('div', { class: 'gear-move', style: { '--mc': own.color || SLOT_COLOR[slot] } },
      h('span', { class: 'gear-move-ico', html: ICON[own.icon] || ICON.fist }),
      ...opts.map((st) => {
        const open = u.styles[slot].includes(st.id), on = kit.moves[slot] === st.id;
        const label = st.id === 'signature' ? own.name : st.tag;
        const b = h('button', { class: `gear-chip ${on ? 'on' : ''} ${open ? '' : 'locked'}`, 'aria-label': open ? label : `${st.tag}, toy level ${st.level}` },
          open ? null : h('span', { class: 'chip-lock', html: ICON.lock }),
          pixelLabel(open ? label : `LV ${st.level}`, 11, '#ffffff', { maxW: 116 }));
        onTap(b, () => {
          if (!open) { ui.app?.audio?.sfx('tap'); return say(`${st.tag} opens at toy level ${st.level}`); }
          kit = { ...kit, moves: { ...kit.moves, [slot]: st.id } };
          ui.app?.audio?.sfx('select');
          say(st.says);
          redraw();
        }, 250);
        return b;
      }));
  }));

  // ---- forms (only once an evolution is unlocked): show any unlocked look
  const formRow = u.forms.length > 1 ? h('div', { class: 'gear-row gear-forms' }) : null;
  const drawForms = () => formRow && formRow.replaceChildren(...u.forms.map((tier) => {
    const e = EVOLUTIONS[tier], on = (kit.form ?? u.evolution.tier) === tier;
    const b = h('button', { class: `gear-form ${on ? 'on' : ''}`, 'aria-label': e.name },
      ...Array.from({ length: Math.max(1, tier) }, () => h('i', { class: tier ? 'gem' : 'dot' })));
    onTap(b, () => { kit = { ...kit, form: tier === u.evolution.tier ? null : tier }; ui.app?.audio?.sfx('select'); say(e.name); redraw(); }, 250);
    return b;
  }));

  const nxt = nextUnlock(rec);
  const teaser = nxt ? h('div', { class: 'gear-next' }, h('span', { html: ICON.lock }), pixelLabel(`LV ${nxt.level}: ${nxt.name}`, 11, '#FFE7A0', { maxW: 260 })) : null;

  function redraw() {
    drawArmor();
    drawMoves();
    drawForms();
    if (onChange) onChange(kit);
  }

  const go = h('button', { class: `go-btn gear-go ${preview ? 'done' : ''}`, 'aria-label': preview ? 'Done' : 'Fight', html: preview ? ICON.check : ICON.play });
  onTap(go, () => { ui.app?.audio?.sfx('powerUp'); (preview ? onBack : onGo)(kit); }, 800);
  const back = h('button', { class: 'corner-btn home-btn', 'aria-label': 'Back', html: ICON.arrowL });
  onTap(back, () => onBack(kit), 500);

  if (formRow) head.appendChild(formRow); // the toy's unlocked looks sit next to its level
  const panel = h('div', { class: 'gear-panel' },
    head,
    h('div', { class: 'gear-h' }, h('span', { html: ICON.armor }), pixelLabel('ARMOR', 13, '#FFC914')),
    armorRow,
    h('div', { class: 'gear-h' }, h('span', { html: ICON.fist }), pixelLabel('MOVES', 13, '#FFC914')),
    moveRows,
    caption,
    teaser);
  ui.layer.appendChild(h('div', { class: 'screen gear-screen' }, h('div', { class: 'gear-spin' }), panel, back, go));
  // drag on the toy's side to spin it (same as the toy gallery)
  const spin = ui.layer.querySelector('.gear-spin');
  let lastX = null;
  spin.addEventListener('pointerdown', (e) => { lastX = e.clientX; spin.setPointerCapture(e.pointerId); });
  spin.addEventListener('pointermove', (e) => { if (lastX != null && ui.app?.stage?.showcase) { ui.app.stage.showcase.yaw += (e.clientX - lastX) / 120; lastX = e.clientX; } });
  spin.addEventListener('pointerup', () => { lastX = null; });
  spin.addEventListener('pointercancel', () => { lastX = null; });
  redraw();
  return { get kit() { return kit; } };
}

// After a battle, under the player's level: the toy's own level, and the big news when it evolved or
// opened new armor / moves. toy: { id, name, from: { xp, level }, to: { xp, level } }. Null = nothing to say.
export function toyResult(ui, toy) {
  const gained = Math.max(0, (toy.to.xp || 0) - (toy.from.xp || 0));
  if (!gained) return null;
  const r = awardToyXp({ t: { xp: toy.from.xp || 0, level: toy.from.level || 1 } }, 't', gained);
  const up = r.to > r.from;
  const p = toyProgress(toy.to.xp);
  const pct = p.needed ? Math.round((100 * p.into) / p.needed) : 100;
  const box = h('div', { class: `toy-result ${r.evolved ? 'evolved' : ''}` },
    pixelLabel(toy.name, 13, '#ffffff', { maxW: 170 }),
    h('div', { class: 'lvl-badge small toy-lvl', 'aria-label': `${toy.name} level ${r.to}` },
      h('span', { class: 'lvl-num' }, pixelLabel(String(r.to), 16, '#ffffff')),
      h('span', { class: 'xp-bar' }, h('i', { style: { width: pct + '%' } }))),
    r.evolved ? h('span', { class: 'evo-shout' }, pixelLabel('EVOLVED!', 20, '#FFC914', { chunk: 2 }))
      : up ? pixelLabel('LEVEL UP!', 13, '#8CF29B') : null);
  if (r.evolved) setTimeout(() => { ui.app?.audio?.sfx('perfect'); ui.app?.stage?.fx?.confetti?.(ui.app.stage.W, 400); }, 2600);
  const news = [...(r.evolved ? [r.evolved.name.toUpperCase()] : []), ...r.unlocked.slice(0, 3).map((x) => (x.kind === 'armor' ? x.name + ' ARMOR' : x.name))];
  if (news.length) box.appendChild(h('div', { class: 'toy-new' }, pixelLabel('NEW:', 11, '#FFC914'), ...news.map((x) => pixelLabel(x, 11, '#ffffff', { maxW: 150 }))));
  return box;
}
