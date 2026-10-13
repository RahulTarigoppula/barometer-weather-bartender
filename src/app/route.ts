import { useSyncExternalStore } from 'react';

export type Drawer = 'tab' | 'office' | 'about' | 'made';
export type Route =
  | { name: 'bar' }
  | { name: 'verdict'; lat: number; lng: number }
  | { name: 'bad-link' }
  | { name: 'story' }
  | { name: Drawer };

/** Hash routes: #/ · #/v/:lat,:lng · #/tab · #/office · #/about. No server rewrite needed on Pages. */
export function parseRoute(hash: string): Route {
  const h = hash.replace(/^#/, '') || '/';
  if (h === '/' || h === '') return { name: 'bar' };
  if (h === '/tab') return { name: 'tab' };
  if (h === '/office') return { name: 'office' };
  if (h === '/about') return { name: 'about' };
  if (h === '/made') return { name: 'made' };
  if (h === '/story') return { name: 'story' };
  const m = /^\/v\/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(h);
  if (m) {
    const lat = Number(m[1]);
    const lng = Number(m[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { name: 'verdict', lat, lng };
    return { name: 'bad-link' };
  }
  if (h.startsWith('/v/')) return { name: 'bad-link' };
  return { name: 'bar' };
}

const subscribe = (cb: () => void): (() => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

export const useHash = (): string => useSyncExternalStore(subscribe, () => window.location.hash);

let openedInApp = false;

export function openDrawer(d: Drawer): void {
  openedInApp = true;
  window.location.hash = `#/${d}`;
}

/** Close a drawer: step back if we opened it, otherwise land on the counter. */
export function closeDrawer(fallback: string): void {
  if (openedInApp) {
    openedInApp = false;
    window.history.back();
  } else {
    window.location.replace(fallback);
  }
}
