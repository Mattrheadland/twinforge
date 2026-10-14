// Chunky outlined SVG icons in the game's style. Kids navigate by these, not words.
const S = (body, vb = '0 0 100 100') =>
  `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" stroke="#14111A" stroke-width="7" stroke-linejoin="round" stroke-linecap="round">${body}</svg>`;

export const ICON = {
  play: S('<path d="M34 20 L82 50 L34 80 Z" fill="#fff"/>'),
  fist: S(`
    <path d="M22 44 Q22 30 34 30 L70 30 Q84 30 84 46 L84 62 Q84 80 66 80 L40 80 Q22 80 22 62 Z" fill="#FFC914"/>
    <path d="M40 30 L40 50 M54 30 L54 50 M68 31 L68 50" fill="none" stroke-width="5"/>
    <path d="M22 54 Q36 50 44 58" fill="none" stroke-width="5"/>
    <path d="M8 20 L18 28 M6 44 L16 44 M10 66 L19 60" fill="none" stroke="#fff" stroke-width="6"/>`),
  shield: S(`
    <path d="M50 12 L82 24 Q84 62 50 88 Q16 62 18 24 Z" fill="#4EA8DE"/>
    <path d="M50 22 L72 30 Q72 58 50 76 Z" fill="#1B4FD8" stroke-width="0"/>
    <path d="M50 12 L82 24 Q84 62 50 88 Q16 62 18 24 Z" fill="none"/>`),
  bolt: S('<path d="M58 8 L22 56 L46 56 L38 92 L78 40 L54 40 Z" fill="#FFC914"/>'),
  heart: S('<path d="M50 84 C20 62 10 46 14 32 C18 18 38 14 50 30 C62 14 82 18 86 32 C90 46 80 62 50 84 Z" fill="#D7263D"/>'),
  star: S('<path d="M50 8 L61 36 L91 37 L67 56 L76 86 L50 69 L24 86 L33 56 L9 37 L39 36 Z" fill="#FFC914"/>'),
  starEmpty: S('<path d="M50 8 L61 36 L91 37 L67 56 L76 86 L50 69 L24 86 L33 56 L9 37 L39 36 Z" fill="rgba(255,255,255,.25)"/>'),
  home: S('<path d="M14 50 L50 18 L86 50 L76 50 L76 84 L24 84 L24 50 Z" fill="#fff"/><path d="M42 84 L42 62 L58 62 L58 84" fill="#F46036"/>'),
  retry: S(`<path d="M76 54 A28 28 0 1 1 64 26" fill="none" stroke-width="12"/><path d="M76 54 A28 28 0 1 1 64 26" fill="none" stroke="#fff" stroke-width="5"/>
    <path d="M56 12 L80 26 L58 42 Z" fill="#fff"/>`),
  pause: S('<rect x="26" y="20" width="16" height="60" rx="5" fill="#fff"/><rect x="58" y="20" width="16" height="60" rx="5" fill="#fff"/>'),
  gear: S(`<path d="M50 14 l7 0 l3 11 l10 5 l10 -6 l5 5 l-6 10 l5 10 l11 3 l0 7 l-11 3 l-5 10 l6 10 l-5 5 l-10 -6 l-10 5 l-3 11 l-7 0 l-3 -11 l-10 -5 l-10 6 l-5 -5 l6 -10 l-5 -10 l-11 -3 l0 -7 l11 -3 l5 -10 l-6 -10 l5 -5 l10 6 l10 -5 Z" fill="#c9cfdc" stroke-width="5"/>
    <circle cx="53" cy="50" r="12" fill="#fff" stroke-width="5"/>`),
  check: S('<path d="M18 52 L40 74 L84 26" fill="none" stroke="#fff" stroke-width="12"/>'),
  moon: S('<path d="M64 14 A38 38 0 1 0 86 64 A30 30 0 1 1 64 14 Z" fill="#fff4c2"/>'),
  dizzy: S(`<path d="M50 20 L56 36 L74 36 L60 46 L66 64 L50 53 L34 64 L40 46 L26 36 L44 36 Z" fill="#FFC914" stroke-width="5"/>`),
  fire: S('<path d="M50 90 C24 90 18 66 30 48 C34 60 40 62 42 58 C38 40 48 22 60 10 C60 30 82 40 80 64 C78 82 66 90 50 90 Z" fill="#F46036"/>'),
  phone: S('<rect x="28" y="10" width="44" height="80" rx="9" fill="#fff"/><circle cx="50" cy="78" r="4" fill="#14111A" stroke-width="0"/>'),
  hand: S(`<path d="M40 88 L40 52 Q40 44 47 44 Q54 44 54 52 L54 40 Q54 32 61 32 Q68 32 68 40 L68 48 Q68 42 75 42 Q82 42 82 50 L82 70 Q82 90 64 92 L52 92 Q46 92 40 88 Z" fill="#ffe0c2" stroke-width="5"/>
    <path d="M40 60 L40 16 Q40 8 47 8 Q54 8 54 16 L54 52" fill="#ffe0c2" stroke-width="5"/>`, '0 0 100 100'),
  sound: S('<path d="M14 40 L30 40 L52 22 L52 78 L30 60 L14 60 Z" fill="#fff"/><path d="M64 36 Q74 50 64 64 M74 26 Q92 50 74 74" fill="none" stroke-width="7"/>'),
  muted: S('<path d="M14 40 L30 40 L52 22 L52 78 L30 60 L14 60 Z" fill="#fff"/><path d="M66 38 L88 62 M88 38 L66 62" fill="none" stroke-width="8"/>'),
  vs: S(`<path d="M8 22 L28 22 L40 58 L52 22 L72 22 L50 82 L30 82 Z" fill="#FFC914"/>`, '0 0 80 100'),
  // ---- challenge cues ----
  most: S(`<rect x="34" y="62" width="32" height="22" rx="3" fill="#D7263D"/><rect x="34" y="40" width="32" height="22" rx="3" fill="#FFC914"/><rect x="34" y="18" width="32" height="22" rx="3" fill="#1B4FD8"/><path d="M14 46 L14 16 M6 24 L14 14 L22 24" fill="none" stroke-width="6"/><path d="M86 46 L86 16 M78 24 L86 14 L94 24" fill="none" stroke-width="6"/>`),
  fewest: S(`<rect x="38" y="60" width="24" height="22" rx="3" fill="#2E9E44"/><path d="M14 30 L14 62 M6 54 L14 64 L22 54" fill="none" stroke-width="6"/><path d="M86 30 L86 62 M78 54 L86 64 L94 54" fill="none" stroke-width="6"/>`),
  note: S(`<path d="M38 72 L38 22 L78 14 L78 62" fill="none" stroke-width="7"/><ellipse cx="30" cy="74" rx="11" ry="8" fill="#6A3FA0"/><ellipse cx="70" cy="64" rx="11" ry="8" fill="#6A3FA0"/>`),
  // ---- move icons ----
  tail: S(`<path d="M14 70 Q40 74 58 56 Q72 42 88 18 Q86 46 70 66 Q52 86 16 84 Z" fill="#D7263D"/><path d="M40 72 L48 62 M56 64 L64 52" stroke-width="5"/>`),
  jaw: S(`<path d="M10 40 Q50 6 90 40 L82 46 L74 38 L66 46 L58 38 L50 46 L42 38 L34 46 L26 38 L18 46 Z" fill="#fff"/><path d="M10 60 Q50 94 90 60 L82 54 L74 62 L66 54 L58 62 L50 54 L42 62 L34 54 L26 62 L18 54 Z" fill="#fff"/>`),
  armor: S(`<path d="M20 22 L50 12 L80 22 L76 60 Q66 80 50 88 Q34 80 24 60 Z" fill="#A9B4C8"/><path d="M50 22 L50 78 M32 40 L68 40" stroke-width="5"/>`),
  cannon: S(`<rect x="18" y="30" width="58" height="28" rx="6" fill="#8E9AAE"/><rect x="74" y="26" width="14" height="36" rx="3" fill="#5A6578"/><circle cx="32" cy="70" r="12" fill="#5A6578"/><path d="M92 44 L98 44" stroke="#FF7A1A" stroke-width="7"/><rect x="28" y="36" width="12" height="8" fill="#D7263D" stroke-width="3"/>`),
  branch: S(`<path d="M20 88 L44 50 L30 22 M44 50 L74 34 L86 16 M74 34 L90 40" fill="none" stroke="#3a2a2a" stroke-width="12"/><path d="M20 88 L44 50 L30 22 M44 50 L74 34 L86 16 M74 34 L90 40" fill="none" stroke="#6B4A3A" stroke-width="5"/>`),
  root: S(`<path d="M8 70 L92 70" stroke-width="6"/><path d="M30 70 Q24 44 36 22 M50 70 Q54 40 48 14 M70 70 Q78 46 68 26" fill="none" stroke="#3a2a2a" stroke-width="12"/><path d="M30 70 Q24 44 36 22 M50 70 Q54 40 48 14 M70 70 Q78 46 68 26" fill="none" stroke="#8A5A3C" stroke-width="5"/>`),
  forest: S(`<path d="M14 86 L26 30 L38 86 Z M38 86 L52 16 L66 86 Z M62 86 L74 34 L86 86 Z" fill="#2B2B36"/><circle cx="48" cy="48" r="3.5" fill="#FF8A1F" stroke-width="0"/><circle cx="57" cy="48" r="3.5" fill="#FF8A1F" stroke-width="0"/><circle cx="24" cy="58" r="3" fill="#FF8A1F" stroke-width="0"/><circle cx="76" cy="60" r="3" fill="#FF8A1F" stroke-width="0"/>`),
  scales: S(`<path d="M50 10 L86 26 Q86 66 50 90 Q14 66 14 26 Z" fill="#9AA3B8"/><path d="M22 40 Q32 50 42 40 Q52 50 62 40 Q72 50 80 40 M26 58 Q36 68 46 58 Q56 68 66 58 Q72 64 76 58" fill="none" stroke-width="4"/>`),
  wave: S(`<path d="M6 80 Q10 40 40 26 Q70 14 86 34 Q66 26 56 40 Q74 44 72 62 Q90 58 96 80 Z" fill="#33AFE4"/><path d="M20 70 Q30 54 46 50" fill="none" stroke="#fff" stroke-width="5"/>`),
  sword: S(`<path d="M74 10 L88 12 L86 26 L42 70 L30 58 Z" fill="#DDE6F2"/><path d="M22 52 L48 78" stroke-width="9"/><path d="M22 52 L48 78" stroke="#FFC914" stroke-width="3"/><path d="M32 68 L14 86" stroke="#8A5A3C" stroke-width="9"/>`),
  charge: S(`<path d="M30 20 L84 50 L30 80 Z" fill="#FFC914"/><path d="M6 32 L22 32 M2 50 L20 50 M6 68 L22 68" stroke-width="6"/>`),
  ward: S(`<circle cx="50" cy="50" r="38" fill="#4EA8DE"/><circle cx="50" cy="50" r="26" fill="#9AD8FF"/><path d="M50 30 L54 46 L70 50 L54 54 L50 70 L46 54 L30 50 L46 46 Z" fill="#fff" stroke-width="3"/>`),
  stone: S(`<path d="M14 88 L22 58 L42 50 L64 52 L82 62 L88 88 Z" fill="#9AA3B8"/><path d="M50 52 L50 10" stroke-width="9"/><path d="M50 52 L50 10" stroke="#DDE6F2" stroke-width="4"/><path d="M38 22 L62 22" stroke="#FFC914" stroke-width="8"/>`),
  spark: S(`<path d="M50 6 L58 40 L92 50 L58 60 L50 94 L42 60 L8 50 L42 40 Z" fill="#5CE07A"/>`),
  cauldron: S(`<path d="M14 40 L86 40 Q86 84 50 86 Q14 84 14 40 Z" fill="#3A3A48"/><path d="M10 40 L90 40" stroke-width="8"/><circle cx="36" cy="28" r="8" fill="#5CE07A"/><circle cx="58" cy="20" r="10" fill="#5CE07A"/><circle cx="72" cy="32" r="6" fill="#5CE07A"/>`),
  broom: S(`<path d="M80 10 L44 58" stroke="#8A5A3C" stroke-width="9"/><path d="M44 58 L20 90 L10 80 L36 52 Z" fill="#E0B95A"/><path d="M38 54 L48 64" stroke-width="6"/>`),
  potion: S(`<path d="M40 12 L60 12 L60 34 Q84 48 80 72 Q74 90 50 90 Q26 90 20 72 Q16 48 40 34 Z" fill="#5CE07A"/><path d="M36 12 L64 12" stroke-width="8"/><circle cx="40" cy="64" r="5" fill="#fff" stroke-width="0"/>`),
  claw: S(`<path d="M24 14 Q40 50 22 88 M48 10 Q64 50 46 90 M72 14 Q88 50 70 86" fill="none" stroke="#A777E0" stroke-width="10"/><path d="M24 14 Q40 50 22 88 M48 10 Q64 50 46 90 M72 14 Q88 50 70 86" fill="none" stroke="#fff" stroke-width="3"/>`),
  flames: S(`<path d="M26 86 C10 86 8 66 18 56 C20 64 24 66 26 62 C24 50 30 40 36 34 C36 48 46 56 44 70 C44 80 36 86 26 86 Z" fill="#FF7A1A"/><path d="M68 86 C52 86 50 64 62 52 C64 62 68 64 70 60 C68 44 76 32 82 26 C82 42 92 52 90 68 C88 80 80 86 68 86 Z" fill="#FFC914"/>`),
  wings: S(`<path d="M50 40 Q30 10 6 20 Q14 40 10 62 Q24 52 30 66 Q38 54 50 62 Z" fill="#6A3FA0"/><path d="M50 40 Q70 10 94 20 Q86 40 90 62 Q76 52 70 66 Q62 54 50 62 Z" fill="#6A3FA0"/>`),
  ghost: S(`<path d="M22 88 L22 44 Q22 14 50 14 Q78 14 78 44 L78 88 L68 78 L58 88 L50 78 L42 88 L32 78 Z" fill="#E6D8FF"/><circle cx="40" cy="44" r="6" fill="#14111A" stroke-width="0"/><circle cx="60" cy="44" r="6" fill="#14111A" stroke-width="0"/>`),
};

export function block(ch, color, size = 1) {
  return `<span class="blk" style="--c:${color};--z:${size}">${ch}</span>`;
}
