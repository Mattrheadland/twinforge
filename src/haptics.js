// Optional haptics. Android/desktop: Vibration API. iPhone: Safari has no
// Vibration API; on iOS 18+ toggling a native switch control gives a light tick,
// which we use when available. Anywhere else this silently does nothing.
let label = null;
let enabled = true;

function iosSwitch() {
  if (label) return label;
  try {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.id = 'tbb-haptic';
    label = document.createElement('label');
    label.htmlFor = 'tbb-haptic';
    label.setAttribute('aria-hidden', 'true');
    label.style.cssText = 'position:fixed;left:-100px;top:-100px;width:1px;height:1px;opacity:0;pointer-events:none';
    label.appendChild(input);
    document.body.appendChild(label);
  } catch {
    label = null;
  }
  return label;
}

export function setHaptics(on) {
  enabled = !!on;
}

export function buzz(kind = 'light') {
  if (!enabled) return;
  try {
    if (navigator.vibrate) {
      navigator.vibrate(kind === 'heavy' ? [30, 40, 40] : kind === 'medium' ? 25 : 12);
      return;
    }
    const l = iosSwitch();
    if (l) {
      l.click();
      if (kind === 'heavy') setTimeout(() => l.click(), 90);
    }
  } catch {}
}
