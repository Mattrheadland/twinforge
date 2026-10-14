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
};

export function block(ch, color, size = 1) {
  return `<span class="blk" style="--c:${color};--z:${size}">${ch}</span>`;
}
