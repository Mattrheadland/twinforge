// Player profiles: the kid-facing "who's playing?" picker, and the grown-up
// editor (name, picture, learning pathway, delete). Up to three players; each
// keeps its own stars, learning, runs and toys (save.js).
import { h, onTap, onHold } from './dom.js';
import { ICON } from './icons.js';
import { portrait } from './hud.js';
import { pixelLabel } from '../render/pixel.js';
import { NAME_MAX, PATHWAYS } from '../save.js';
import { levelBadge } from './level-badge.js';

export const PATHWAY_LABEL = {
  early: 'Early learner, 3–5',
  growing: 'Growing learner, 5–7',
};
const SLOT_COLOR = ['#D7263D', '#1B4FD8', '#2E9E44'];

const avatarOf = (p, slot, chars, roster) => chars[p.avatar] || chars[roster[slot % roster.length]];

// ---------------- who's playing? ----------------
// onPick(slot) for a player; onCreate(slot) after a grown-up press-and-hold on an open slot.
export function showProfiles(ui, { profiles, chars, roster, onPick, onCreate, onHome }) {
  ui.clear();
  let busy = false;
  const cards = profiles.map((p, i) => {
    const style = { '--c': SLOT_COLOR[i % SLOT_COLOR.length], '--d': i * 90 + 'ms' };
    if (p.empty) {
      const b = h('button', { class: 'mode-card profile-card empty', style, 'aria-label': 'New player: grown-ups press and hold' },
        h('span', { class: 'profile-plus' }),
        h('i', { class: 'hold-ring' }));
      onHold(b, 1500, () => onCreate(i));
      return b;
    }
    const b = h('button', { class: `mode-card profile-card${p.active ? ' active' : ''}`, style, 'aria-label': `Play as ${p.name}` },
      h('span', { class: 'profile-face' }, portrait(avatarOf(p, i, chars, roster), 96, ui.app.px)),
      h('span', { class: 'mode-name' }, pixelLabel(p.name.toUpperCase(), 17, '#FFC914', { maxW: 150 })),
      levelBadge({ xp: p.xp || 0, level: p.level || 1 }),
      h('span', { class: 'mode-badge' }, h('i', { html: ICON.star }), pixelLabel(String(p.stars), 12, '#ffffff')));
    onTap(b, () => {
      if (busy) return;
      busy = true;
      ui.app.audio.sfx('select');
      onPick(i);
    }, 500);
    return b;
  });
  const home = h('button', { class: 'corner-btn home-btn', 'aria-label': 'Home', html: ICON.home });
  onTap(home, onHome, 500);
  const scr = h('div', { class: 'screen modes-screen profiles-screen' }, h('div', { class: 'modes-row' }, ...cards), home);
  ui.layer.appendChild(scr);
  return scr;
}

// ---------------- grown-up editor ----------------
// profile = null for a new player. onDelete(typedName) is offered only when canDelete.
export function showProfileEditor(layer, { slot, profile, chars, roster, canDelete, onSave, onDelete, onClose }) {
  const isNew = !profile;
  const name = h('input', { type: 'text', maxlength: NAME_MAX, value: profile?.name || '', placeholder: `Player ${slot + 1}`, autocomplete: 'off', autocapitalize: 'words', spellcheck: 'false' });
  const avatar = h('select', {}, ...roster.map((id) => h('option', { value: id }, chars[id].name)));
  avatar.value = profile?.avatar && chars[profile.avatar] ? profile.avatar : roster[slot % roster.length];
  const pathway = h('select', {}, ...PATHWAYS.map((p) => h('option', { value: p }, PATHWAY_LABEL[p])));
  pathway.value = profile?.pathway || PATHWAYS[0];
  const save = h('button', { class: 'pbtn primary' }, isNew ? 'Add player' : 'Save');
  const cancel = h('button', { class: 'pbtn' }, 'Cancel');
  const close = () => { scr.remove(); onClose && onClose(); };
  save.addEventListener('click', () => {
    onSave({ name: name.value, avatar: avatar.value, pathway: pathway.value });
    scr.remove();
  });
  cancel.addEventListener('click', close);

  let del = null;
  if (!isNew && canDelete) {
    // Deleting is the one thing that can't be undone, so the grown-up types the name.
    const typed = h('input', { type: 'text', maxlength: NAME_MAX, placeholder: profile.name, autocomplete: 'off', spellcheck: 'false' });
    const go = h('button', { class: 'pbtn danger', disabled: true }, `Delete ${profile.name}`);
    typed.addEventListener('input', () => { go.disabled = typed.value !== profile.name; });
    go.addEventListener('click', () => {
      if (typed.value !== profile.name) return;
      onDelete(typed.value);
      scr.remove();
    });
    const confirmRow = h('div', { class: 'row del-confirm hidden' },
      h('span', {}, `Type ${profile.name} to delete`, h('small', {}, 'Their stars, learning report, toys and runs are erased from this device. Other players are not touched.')),
      typed, go);
    const open = h('button', { class: 'pbtn danger' }, 'Delete player…');
    open.addEventListener('click', () => { confirmRow.classList.remove('hidden'); open.remove(); typed.focus(); });
    del = h('section', {}, h('h3', {}, 'Delete'), open, confirmRow);
  }

  const scr = h('div', { class: 'overlay parent profile-editor' },
    h('div', { class: 'parent-card' },
      h('h2', {}, isNew ? `New player ${slot + 1}` : `Player ${slot + 1}: ${profile.name}`),
      h('section', {},
        h('label', { class: 'row' }, h('span', {}, 'Name', h('small', {}, 'A first name or nickname is plenty. It stays on this device.')), name),
        h('label', { class: 'row' }, h('span', {}, 'Picture', h('small', {}, 'The toy shown on their player card')), avatar),
        h('label', { class: 'row' }, h('span', {}, 'Learning pathway', h('small', {}, 'Where their questions start and how far they go. Math and reading each still move up or down with how they do. Changing it never erases progress.')), pathway)),
      del,
      h('div', { class: 'pbtns' }, cancel),
      save));
  layer.appendChild(scr);
  setTimeout(() => name.focus(), 60);
  return scr;
}

// ---------------- players list in grown-up settings ----------------
export function playersSection({ profiles, onEdit, onAdd, onSwitch }) {
  const rows = profiles.map((p) => {
    if (p.empty) {
      const add = h('button', { class: 'pbtn' }, 'Add player');
      add.addEventListener('click', () => onAdd(p.slot));
      return h('div', { class: 'row' }, h('span', {}, `Player ${p.slot + 1}`, h('small', {}, 'Open slot')), add);
    }
    const edit = h('button', { class: 'pbtn' }, 'Edit');
    edit.addEventListener('click', () => onEdit(p.slot));
    const btns = [edit];
    if (!p.active) {
      const sw = h('button', { class: 'pbtn' }, 'Switch to');
      sw.addEventListener('click', () => onSwitch(p.slot));
      btns.unshift(sw);
    }
    return h('div', { class: 'row' },
      h('span', {}, `${p.name}${p.active ? ' (playing now)' : ''}`, h('small', {}, `${PATHWAY_LABEL[p.pathway]} · level ${p.level} · ${p.stars} stars`)),
      h('div', { class: 'pbtns' }, ...btns));
  });
  return h('section', {}, h('h3', {}, 'Players'),
    ...rows,
    h('p', { class: 'note' }, 'Settings below (learning levels, report, progress) are for the player shown as playing now. Sound and screen settings are shared. On iPhone, Safari and the home-screen app keep separate saves; Export backup moves every player at once.'));
}
