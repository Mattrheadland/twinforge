// What Luca was asked, how it went and how long he thought about it.
// Plain data kept in the save (save.data.learning); pure functions only, so the
// report can be tested without a browser.
//
// quality: 'indep' = right first try · 'hint' = one wrong tap · 'support' = needed the glowing answer
import { KINDS, wordLabel } from './challenges.js';
import { defaultMem, normalizeMem, rememberAnswer } from './question-picker.js';

export const LOG_MAX = 120; // individual answers kept for "recent" figures and the misses list
export const LEVEL_LOG_MAX = 40;
export const DAYS_MAX = 45;
export const SLOW_MS = 15000; // "took a while"

export const KIND_LABEL = {
  count: 'Counting', flash: 'Quick look (dots)', shape: 'Same shape', compare: 'Most / fewest', pattern: 'What comes next',
  numeral: 'Number → group', oneMore: 'One more / one less', seq: 'Missing number', bigger: 'Bigger / smaller number',
  add: 'Adding', sub: 'Take away', story: 'Story problems', teen: 'Teen numbers',
  letter: 'Letter match', starts: 'Starts with (letter)', pickStart: 'Starts with (picture)', ends: 'Ends with',
  rhyme: 'Rhymes', missing: 'Missing letter', word: 'Read a word', sight: 'Sight words', spell: 'Spelling',
};
export const KIND_ORDER = Object.keys(KIND_LABEL);

export function defaultLearning() {
  return { v: 1, stats: {}, log: [], levels: [], days: {}, mem: defaultMem() };
}

// Bring a stored learning object up to shape (old saves have none).
export function normalizeLearning(raw) {
  const base = defaultLearning();
  if (!raw || typeof raw !== 'object') return base;
  return {
    v: 1,
    stats: raw.stats && typeof raw.stats === 'object' ? raw.stats : {},
    log: Array.isArray(raw.log) ? raw.log.slice(-LOG_MAX) : [],
    levels: Array.isArray(raw.levels) ? raw.levels.slice(-LEVEL_LOG_MAX) : [],
    days: raw.days && typeof raw.days === 'object' ? raw.days : {},
    mem: normalizeMem(raw.mem), // recent questions and pending reviews (logic/question-picker.js)
  };
}

export const dayKey = (t) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Mutates and returns `L`. ch = the challenge, stats = { wrongPicks, firstMs, totalMs } from ChallengeUI.
export function recordAnswer(L, ch, quality, stats = {}, now = Date.now()) {
  const kind = ch.kind;
  const s = (L.stats[kind] ||= { n: 0, indep: 0, hint: 0, support: 0 });
  s.n++;
  s[quality] = (s[quality] || 0) + 1;
  const ms = Number.isFinite(stats.firstMs) ? Math.round(stats.firstMs) : null;
  L.mem = L.mem ? L.mem : defaultMem();
  rememberAnswer(L.mem, ch, quality);
  L.log.push({
    t: now, k: kind, lv: ch.level, q: quality, ms, ...(ch.review ? { r: 1 } : {}),
    w: (stats.wrongPicks || []).map((o) => optLabel(ch, o)),
    d: describe(ch), a: optLabel(ch, ch.answer),
  });
  if (L.log.length > LOG_MAX) L.log.splice(0, L.log.length - LOG_MAX);
  const dk = dayKey(now);
  const day = (L.days[dk] ||= { n: 0, indep: 0 });
  day.n++;
  if (quality === 'indep') day.indep++;
  const keys = Object.keys(L.days).sort();
  while (keys.length > DAYS_MAX) delete L.days[keys.shift()];
  return L;
}

// domain: 'math' | 'letters' (the skill keys in save.data.skills); why: 'auto' | 'manual'
export function noteLevel(L, domain, from, to, why = 'auto', now = Date.now()) {
  if (from === to) return L;
  L.levels.push({ t: now, domain, from, to, why });
  if (L.levels.length > LEVEL_LOG_MAX) L.levels.splice(0, L.levels.length - LEVEL_LOG_MAX);
  return L;
}

// ---------- words for a grown-up ----------
const TOKEN_WORD = (tok) => {
  const [shape, color] = String(tok).split(':');
  return color ? `${color} ${shape}` : shape;
};

export function optLabel(ch, o) {
  if (ch.optType === 'pic') return wordLabel(String(o));
  if (ch.optType === 'token') return TOKEN_WORD(o);
  if (ch.optType === 'group') return `${o} dots`;
  return String(o);
}

function patternName(seq) {
  const unit = [];
  for (const t of seq) {
    if (unit.length && t === seq[0] && unit.length >= 2) break;
    unit.push(t);
  }
  const map = new Map();
  return unit.map((t) => (map.has(t) ? map.get(t) : (map.set(t, 'ABC'[map.size]), map.get(t)))).join('');
}

export function describe(ch) {
  switch (ch.kind) {
    case 'count': return `Count ${ch.n} ${ch.item}${ch.n === 1 ? '' : 's'}`;
    case 'add': return `${ch.a} + ${ch.b}`;
    case 'sub': return `${ch.a} take away ${ch.b}`;
    case 'numeral': return `Find the group of ${ch.n}`;
    case 'compare': return `Which has the ${ch.mode} (${ch.options.join(', ')})`;
    case 'shape': return `Match the ${ch.target}`;
    case 'pattern': return `${patternName(ch.seq)} pattern, next is ${TOKEN_WORD(ch.answer)}`;
    case 'letter': return `${ch.shown} → ${ch.answer} (from ${ch.options.join(' ')})`;
    case 'starts': return `${wordLabel(ch.word)} starts with ${ch.answer} (from ${ch.options.join(' ')})`;
    case 'rhyme': return `${wordLabel(ch.word)} rhymes with ${wordLabel(ch.answer)}`;
    case 'word': return `Read “${ch.word}”`;
    case 'flash': return `Quick look at ${ch.n} dots`;
    case 'story': return `${ch.prompt} (${ch.a} ${ch.op === 'add' ? '+' : '−'} ${ch.b})`;
    case 'oneMore': return `One ${ch.dir} than ${ch.n}`;
    case 'seq': return `${ch.seq.map((x) => (x == null ? '_' : x)).join(' ')}`;
    case 'bigger': return `The ${ch.mode} of ${ch.options.join(', ')}`;
    case 'teen': return `Ten and ${ch.n - 10} more (${ch.n})`;
    case 'pickStart': return `Which starts with ${ch.letter}: ${ch.options.map(wordLabel).join(', ')}`;
    case 'ends': return `${wordLabel(ch.word)} ends with ${ch.answer} (from ${ch.options.join(' ')})`;
    case 'missing': return `${[...ch.word].map((c, i) => (i === ch.pos ? '_' : c)).join('')} (${ch.word})`;
    case 'sight': return `Find “${ch.word}”`;
    case 'spell': return `${{ copy: 'Copy', peek: 'Peek and spell', sound: 'Spell' }[ch.mode] || 'Spell'} “${ch.word}”`;
    default: return ch.kind;
  }
}

// ---------- the report ----------
const pct = (a, n) => (n ? Math.round((100 * a) / n) : null);
const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// skills = save.data.skills; off = kinds switched off. Returns plain data for the UI and for text export.
export function buildReport(L, skills, off = [], now = Date.now()) {
  L = normalizeLearning(L);
  const today = dayKey(now);
  const weekAgo = now - 7 * 864e5;
  const inWeek = L.log.filter((e) => e.t >= weekAgo);
  const dayT = L.days[today] || { n: 0, indep: 0 };
  const allN = Object.values(L.stats).reduce((a, s) => a + s.n, 0);
  const allIndep = Object.values(L.stats).reduce((a, s) => a + (s.indep || 0), 0);

  const rows = KIND_ORDER.map((kind) => {
    const s = L.stats[kind] || { n: 0, indep: 0, hint: 0, support: 0 };
    const mine = L.log.filter((e) => e.k === kind);
    const last = mine.slice(-10);
    const lastIndep = last.filter((e) => e.q === 'indep').length;
    const lastSupport = last.filter((e) => e.q === 'support').length;
    const think = median(mine.slice(-20).map((e) => e.ms).filter((x) => x != null));
    const info = KINDS[kind] || { domain: 'math', from: 1 };
    let status = 'new';
    if (s.n) status = 'ok';
    if (last.length >= 5 && pct(lastIndep, last.length) >= 80) status = 'solid';
    if (last.length >= 3 && (lastSupport >= 2 || pct(lastIndep, last.length) < 50)) status = 'tough';
    if (think != null && think > SLOW_MS && status !== 'tough') status = 'slow';
    return {
      kind, label: KIND_LABEL[kind], domain: info.domain, from: info.from, off: off.includes(kind),
      n: s.n, firstTry: pct(s.indep || 0, s.n), hint: s.hint || 0, support: s.support || 0,
      recentN: last.length, recentFirstTry: pct(lastIndep, last.length), recentSupport: lastSupport,
      thinkMs: think, lastLevel: mine.length ? mine[mine.length - 1].lv : null, status,
    };
  });

  const domains = ['math', 'letters'].map((key) => {
    const sk = skills?.[key] || { level: 1, auto: true };
    const changes = L.levels.filter((c) => c.domain === key);
    const lastChange = changes[changes.length - 1] || null;
    const since = lastChange ? lastChange.t : null;
    const domainName = key === 'math' ? 'math' : 'reading';
    const atLevel = L.log.filter((e) => KINDS[e.k]?.domain === domainName && e.lv === sk.level && (!since || e.t >= since));
    return {
      key, name: key === 'math' ? 'Math' : 'Reading', level: sk.level, auto: sk.auto !== false,
      streak: sk.streak || 0, since, askedAtLevel: atLevel.length,
      firstTryAtLevel: pct(atLevel.filter((e) => e.q === 'indep').length, atLevel.length),
      history: changes.slice(-5).reverse(),
    };
  });

  const misses = L.log.filter((e) => e.q !== 'indep' || (e.ms != null && e.ms > SLOW_MS)).slice(-12).reverse()
    .map((e) => ({ ...e, label: KIND_LABEL[e.k] || e.k, slow: e.ms != null && e.ms > SLOW_MS }));

  return {
    now,
    lastPlayed: L.log.length ? L.log[L.log.length - 1].t : null,
    today: { n: dayT.n, firstTry: pct(dayT.indep, dayT.n) },
    week: { n: inWeek.length, firstTry: pct(inWeek.filter((e) => e.q === 'indep').length, inWeek.length) },
    all: { n: allN, firstTry: pct(allIndep, allN) },
    // a missed skill asked again later in a new form (logic/question-picker.js)
    reviews: { n: L.log.filter((e) => e.r).length, firstTry: pct(L.log.filter((e) => e.r && e.q === 'indep').length, L.log.filter((e) => e.r).length) },
    domains, rows, misses,
    tips: tipsFor(rows, domains),
  };
}

// Plain-language suggestions. Kept conservative: they point at a lever, they don't pull it.
export function tipsFor(rows, domains) {
  const tips = [];
  const byDomain = (d) => rows.filter((r) => r.domain === d && r.n && !r.off);
  for (const r of rows) {
    if (r.off || !r.n) continue;
    if (r.status === 'tough')
      tips.push(`${r.label}: needed full help ${r.recentSupport} of his last ${r.recentN}. Try it together in Preview, or switch it off for a while.`);
    else if (r.status === 'slow')
      tips.push(`${r.label}: he's getting there but thinking ~${Math.round(r.thinkMs / 1000)}s per question. Fine if he's counting it out; worth watching if he's stuck.`);
  }
  for (const d of domains) {
    const domainName = d.key === 'math' ? 'math' : 'reading';
    const live = byDomain(domainName);
    if (!d.auto) tips.push(`${d.name} level is pinned at ${d.level} (Auto off).`);
    if (d.auto && d.level < 5 && d.askedAtLevel >= 25 && d.firstTryAtLevel >= 70)
      tips.push(`${d.name} has sat at level ${d.level} for ${d.askedAtLevel} questions with ${d.firstTryAtLevel}% first try. Auto needs 3 in a row to move up; you can bump it by hand.`);
    if (live.length && live.every((r) => r.status === 'solid') && d.level < 5)
      tips.push(`${d.name}: everything he's seen is solid. Ready for level ${d.level + 1}.`);
  }
  return tips;
}

// Text version for pasting into Notes or a chat with Claude.
export function reportText(R) {
  const f = (p) => (p == null ? '–' : `${p}%`);
  const s = (ms) => (ms == null ? '–' : `${(ms / 1000).toFixed(1)}s`);
  const lines = [
    `TwinForge learning report (${new Date(R.now).toLocaleString()})`,
    `Today ${R.today.n} questions, ${f(R.today.firstTry)} first try · last 7 days ${R.week.n}, ${f(R.week.firstTry)} · all time ${R.all.n}, ${f(R.all.firstTry)}`,
    `Second tries (a missed skill asked again later in a new form): ${R.reviews.n}, ${f(R.reviews.firstTry)} first try`,
    ...R.domains.map((d) => `${d.name}: level ${d.level}${d.auto ? ' (auto)' : ' (pinned)'}, ${d.askedAtLevel} asked at this level, ${f(d.firstTryAtLevel)} first try`),
    '',
    'Skill | asked | first try | last 10 | full help (last 10) | think | status',
    ...R.rows.filter((r) => r.n || r.off).map((r) => `${r.label}${r.off ? ' [off]' : ''} | ${r.n} | ${f(r.firstTry)} | ${f(r.recentFirstTry)} | ${r.recentSupport} | ${s(r.thinkMs)} | ${r.status}`),
    '',
    'Recent misses and slow ones:',
    ...R.misses.map((m) => `- L${m.lv} ${m.label}: ${m.d}${m.w.length ? ` · tapped ${m.w.join(', ')} before the right one` : ''} · ${m.q === 'indep' ? 'first try' : m.q === 'hint' ? 'after a hint' : 'needed help'} · ${s(m.ms)}`),
  ];
  if (R.tips.length) lines.push('', 'Notes:', ...R.tips.map((t) => `- ${t}`));
  return lines.join('\n');
}
