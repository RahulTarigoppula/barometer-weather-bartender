import { reducedMotion } from '../../state/settings';

/**
 * Touch the weather: a small splash where you tap the weather card, in the language of the sky.
 * Rain ripples, sunshine sparkles, night twinkles, cold drifts as snow. Pure DOM, removed when done.
 */
export function splash(card: HTMLElement, clientX: number, clientY: number): void {
  if (reducedMotion()) return;
  const root = document.documentElement;
  const sky = root.dataset.sky;
  const hour = root.dataset.hour;
  const kind = sky === 'rain' ? 'ripple' : sky === 'cold' ? 'snow' : hour === 'night' ? 'twinkle' : 'sparkle';
  const r = card.getBoundingClientRect();
  const host = document.createElement('span');
  host.className = `splash splash--${kind}`;
  host.style.left = `${clientX - r.left}px`;
  host.style.top = `${clientY - r.top}px`;
  const n = kind === 'ripple' ? 3 : 8;
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    p.style.setProperty('--a', `${(360 / n) * i + Math.random() * 20}deg`);
    p.style.setProperty('--d', `${kind === 'ripple' ? i * 140 : Math.random() * 80}ms`);
    p.style.setProperty('--r', `${26 + Math.random() * 26}px`);
    host.appendChild(p);
  }
  card.appendChild(host);
  window.setTimeout(() => host.remove(), 1100);
}
