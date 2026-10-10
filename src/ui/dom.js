export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v)) {
        if (sk.startsWith('--')) el.style.setProperty(sk, sv);
        else el.style[sk] = sv;
      }
    }
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
  }
  return el;
}

// Fast, kid-proof tap: fires on pointerdown, ignores multi-touch spam and
// repeated taps within `cooldown` ms. Handler can return false to allow re-tap.
export function onTap(el, fn, cooldown = 250) {
  let last = 0;
  el.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    e.preventDefault();
    const now = performance.now();
    if (now - last < cooldown) return;
    last = now;
    el.classList.add('pressed');
    setTimeout(() => el.classList.remove('pressed'), 140);
    fn(e);
  });
  return el;
}

// Press-and-hold (parent gate). Shows progress via --hold CSS var.
export function onHold(el, ms, fn) {
  let timer = null, start = 0, raf = null;
  const stop = () => {
    clearTimeout(timer);
    cancelAnimationFrame(raf);
    el.style.setProperty('--hold', 0);
    el.classList.remove('holding');
  };
  const prog = () => {
    el.style.setProperty('--hold', Math.min(1, (performance.now() - start) / ms));
    raf = requestAnimationFrame(prog);
  };
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    start = performance.now();
    el.classList.add('holding');
    prog();
    timer = setTimeout(() => {
      stop();
      fn();
    }, ms);
  });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) el.addEventListener(ev, stop);
  return el;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function nextFrame() {
  return new Promise((r) => requestAnimationFrame(() => r()));
}
