// Grown-up learning report and question preview, opened from the parent panel.
// Text-heavy on purpose: this is the one place in the game written for adults.
import { h } from './dom.js';
import { ChallengeUI } from './challenge.js';
import { buildReport, reportText, KIND_LABEL, KIND_ORDER } from '../logic/learning-log.js';
import { KINDS, kindsAt, makeMath, makeReading } from '../logic/challenges.js';
import { MIN_LEVEL, MAX_LEVEL } from '../logic/difficulty.js';
import { Rng } from '../logic/rng.js';

const STATUS = {
  solid: ['Solid', 'Right first try 8+ of the last 10'],
  ok: ['Learning', 'Mixed results so far'],
  tough: ['Tough', 'Needed full help 2+ times recently, or under half first try'],
  slow: ['Slow', 'Getting it right, but thinking over 15 seconds'],
  new: ['Not yet', 'Hasn’t come up yet'],
};
const QUALITY = { indep: 'first try', hint: 'after a hint', support: 'needed help' };
const pctTxt = (p) => (p == null ? '–' : `${p}%`);
const secTxt = (ms) => (ms == null ? '–' : `${(ms / 1000).toFixed(1)}s`);

export function ago(t, now = Date.now()) {
  if (!t) return 'never';
  const m = Math.round((now - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const hr = Math.round(m / 60);
  if (hr < 24) return `${hr} hr ago`;
  const d = Math.round(hr / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

// ---------------- report ----------------
// opts: { save, onChange, onPreview, onClose, showText }
export function showReport(layer, opts) {
  const { save } = opts;
  const scr = h('div', { class: 'overlay parent report' });
  const render = () => {
    const d = save.data;
    const off = d.settings.offKinds || (d.settings.offKinds = []);
    const R = buildReport(d.learning, d.skills, off);
    const copy = h('button', { class: 'pbtn' }, 'Copy as text');
    copy.addEventListener('click', () => opts.showText('Learning report', reportText(R)));
    const prev = h('button', { class: 'pbtn' }, 'Preview questions');
    prev.addEventListener('click', () => opts.onPreview());
    const done = h('button', { class: 'pbtn primary' }, 'Done');
    done.addEventListener('click', () => { scr.remove(); opts.onClose && opts.onClose(); });

    const chip = (label, x) => h('div', { class: 'rp-chip' }, h('b', {}, String(x.n)), h('span', {}, `${label} · ${pctTxt(x.firstTry)} first try`));

    const domainCard = (dm) => {
      const last = dm.history[0];
      return h('div', { class: 'rp-domain' },
        h('div', { class: 'rp-dhead' }, h('b', {}, dm.name), h('span', { class: 'rp-lv' }, `Level ${dm.level}`), h('small', {}, dm.auto ? 'Auto' : 'Pinned')),
        h('small', {}, dm.askedAtLevel
          ? `${dm.askedAtLevel} asked at this level, ${pctTxt(dm.firstTryAtLevel)} first try${dm.auto ? ` · ${dm.streak}/3 toward the next level` : ''}`
          : 'Nothing asked at this level yet'),
        h('small', {}, last ? `Last change: ${last.from} → ${last.to} (${last.why === 'manual' ? 'by hand' : 'auto'}), ${ago(last.t)}` : 'No level changes yet'),
        h('small', { class: 'rp-mix' }, `Mix at this level: ${[...new Set(kindsAt(dm.key === 'math' ? 'math' : 'reading', dm.level))].map((k) => KIND_LABEL[k]).join(', ')}`));
    };

    const row = (r) => {
      const t = h('input', { type: 'checkbox', 'aria-label': `${r.label} on` });
      t.checked = !r.off;
      t.addEventListener('change', () => {
        const i = off.indexOf(r.kind);
        if (t.checked && i >= 0) off.splice(i, 1);
        if (!t.checked && i < 0) off.push(r.kind);
        opts.onChange();
        render();
      });
      const [stLabel, stTip] = STATUS[r.status];
      return h('tr', { class: `${r.off ? 'off' : ''} ${r.n ? '' : 'none'}` },
        h('td', {}, r.label, r.n ? null : h('small', {}, ` from level ${r.from}`)),
        h('td', {}, String(r.n || '–')),
        h('td', {}, pctTxt(r.firstTry)),
        h('td', {}, r.recentN ? `${pctTxt(r.recentFirstTry)}` : '–', r.recentSupport ? h('small', { class: 'rp-help' }, ` ${r.recentSupport} help`) : null),
        h('td', {}, secTxt(r.thinkMs)),
        h('td', {}, h('span', { class: `rp-pill rp-${r.status}`, title: stTip }, stLabel)),
        h('td', {}, t));
    };
    const table = (domain) => h('table', { class: 'rp-table' },
      h('thead', {}, h('tr', {}, ...[domain === 'math' ? 'Math' : 'Reading', 'Asked', 'First try', 'Last 10', 'Think', 'How it’s going', 'On'].map((x) => h('th', {}, x)))),
      h('tbody', {}, ...R.rows.filter((r) => r.domain === domain).map(row)));

    const misses = R.misses.length
      ? h('ul', { class: 'rp-misses' }, ...R.misses.map((m) => h('li', {},
        h('small', {}, `${ago(m.t)} · L${m.lv} ${m.label}`),
        h('span', {}, m.d),
        h('small', {}, [
          m.w.length ? `tapped ${m.w.join(', then ')} before the right one` : null,
          QUALITY[m.q],
          m.ms != null ? `${secTxt(m.ms)} to first tap${m.slow ? ' (slow)' : ''}` : null,
        ].filter(Boolean).join(' · ')))))
      : h('p', { class: 'note' }, 'No misses yet. Every answer so far was right first try and quick.');

    const card = h('div', { class: 'parent-card rp-card' },
      h('div', { class: 'rp-top' }, h('h2', {}, 'Learning report'), h('div', { class: 'pbtns' }, prev, copy)),
      h('p', { class: 'note' }, R.lastPlayed ? `Last question ${ago(R.lastPlayed)}. “First try” = right with no wrong taps. Think = typical seconds before his first tap.` : 'No questions answered yet. Play a few battles with Learning on and check back.'),
      h('div', { class: 'rp-chips' }, chip('today', R.today), chip('last 7 days', R.week), chip('all time', R.all), chip('second tries', R.reviews)),
      h('div', { class: 'rp-domains' }, ...R.domains.map(domainCard)),
      R.tips.length ? h('section', { class: 'rp-tips' }, h('h3', {}, 'Worth a look'), h('ul', {}, ...R.tips.map((t) => h('li', {}, t)))) : null,
      h('section', {}, h('h3', {}, 'By question type'), table('math'), table('reading'),
        h('p', { class: 'note' }, 'Untick a type to stop it coming up for now. If that leaves nothing at his level, the normal mix is used.')),
      h('section', {}, h('h3', {}, 'Recent misses and slow ones'), misses),
      done);
    scr.replaceChildren(card);
  };
  render();
  layer.appendChild(scr);
  return scr;
}

// ---------------- preview ----------------
// Shows real question cards exactly as Luca sees them. Nothing here is recorded.
// opts: { save, audio, buzz, onClose }
export function showPreview(layer, opts) {
  const { save } = opts;
  const rng = new Rng((Date.now() ^ 0xbeef) >>> 0);
  let domain = 'math';
  let kind = 'mix';
  let level = save.data.skills.math.level;
  const scr = h('div', { class: 'overlay preview' });
  const stage = h('div', { class: 'pv-stage' });
  const ui = new ChallengeUI(stage, opts.audio, opts.buzz);

  const domainSel = h('select', { 'aria-label': 'Subject' }, h('option', { value: 'math' }, 'Math'), h('option', { value: 'reading' }, 'Reading'));
  const kindSel = h('select', { 'aria-label': 'Question type' });
  const lvVal = h('b', {}, String(level));
  const minus = h('button', { class: 'mini' }, '–');
  const plus = h('button', { class: 'mini' }, '+');
  const next = h('button', { class: 'pbtn' }, 'Another');
  const done = h('button', { class: 'pbtn primary' }, 'Done');
  const result = h('span', { class: 'pv-result' }, '');

  const fillKinds = () => {
    kindSel.replaceChildren(h('option', { value: 'mix' }, `His mix at level ${level}`),
      ...KIND_ORDER.filter((k) => KINDS[k].domain === domain).map((k) => h('option', { value: k }, `${KIND_LABEL[k]}${KINDS[k].from > level ? ` (normally from L${KINDS[k].from})` : ''}`)));
    kindSel.value = kind;
    if (kindSel.value !== kind) kindSel.value = kind = 'mix';
  };
  const ask = () => {
    stage.replaceChildren();
    result.textContent = '';
    const force = kind === 'mix' ? undefined : kind;
    const off = save.data.settings.offKinds;
    const ch = domain === 'math' ? makeMath(level, rng, force, off) : makeReading(level, rng, force, off);
    scr.dataset.kind = ch.kind;
    const my = ui.run(ch, domain === 'math' ? 'attack' : 'special');
    ui._current = my;
    my.then((q) => {
      if (ui._current !== my || !scr.isConnected) return;
      result.textContent = q === 'indep' ? 'Right first try' : q === 'hint' ? 'Right after a hint' : 'Right with full help';
      setTimeout(() => ui._current === my && scr.isConnected && ask(), 900);
    });
  };
  domainSel.addEventListener('change', () => {
    domain = domainSel.value;
    level = save.data.skills[domain === 'math' ? 'math' : 'letters'].level;
    lvVal.textContent = String(level);
    kind = 'mix';
    fillKinds();
    ask();
  });
  kindSel.addEventListener('change', () => { kind = kindSel.value; ask(); });
  const bump = (n) => {
    level = Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, level + n));
    lvVal.textContent = String(level);
    fillKinds();
    ask();
  };
  minus.addEventListener('click', () => bump(-1));
  plus.addEventListener('click', () => bump(1));
  next.addEventListener('click', ask);
  done.addEventListener('click', () => { ui._current = null; scr.remove(); opts.onClose && opts.onClose(); });

  scr.append(stage, h('div', { class: 'pv-bar' },
    h('b', { class: 'pv-title' }, 'Preview'), domainSel, kindSel,
    h('div', { class: 'stepper' }, h('small', {}, 'Level'), minus, lvVal, plus),
    next, result, done));
  fillKinds();
  layer.appendChild(scr);
  ask();
  return scr;
}
