import { loadGeo, upgradeCoastlines } from '../../api/geo';
import { BarBusyError, NowhereError } from '../../api/openMeteo';
import { getWeather } from '../../api/weather';
import { play } from '../../audio/sfx';
import { DRINKS, GRAMMAR } from '../../data/menu';
import { judge, served } from '../../engine/index';
import type { Verdict } from '../../engine/types';
import { haptic } from '../../platform/haptics';
import { useSettings } from '../../state/settings';
import { type ErrorKind, useBar } from '../../state/store';
import { addToTab, isStale } from '../tab/repo';

let seq = 0;
let pinSeq = 0;
let warnedTabFull = false;

const wrapLng = (lng: number): number => ((((lng + 180) % 360) + 360) % 360) - 180;
const r4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** "#/v/19.07,72.88" — 2 dp (~1 km) and nothing else. */
export const verdictHash = (lat: number, lng: number): string => `#/v/${lat.toFixed(2)},${lng.toFixed(2)}`;

function setHash(lat: number, lng: number): void {
  const h = verdictHash(lat, lng);
  if (window.location.hash !== h) window.history.replaceState(null, '', h);
}

function announce(v: Verdict): void {
  const s = useSettings.getState();
  const drink = served(v, DRINKS, s.menu, 0, s.gentler).drink;
  play('shhk');
  haptic('light');
  window.setTimeout(() => play('clunk'), 140);
  if (drink.serve === 'iced' || drink.serve === 'frozen') {
    for (let i = 0; i < 3; i++) play('clink', { delay: 0.3 + i * 0.09, rate: 0.96 + Math.random() * 0.08 });
  } else if (drink.serve === 'hot' || drink.serve === 'warm') {
    play('kettle', { delay: 0.25 });
  }
  if (v.tags.some((t) => t.tag === 'storm' || t.tag === 'hail')) {
    play('thunder', { delay: 1.1 + Math.random() * 0.5 });
    window.setTimeout(() => haptic('heavy'), 700);
  }
  if (v.stamp.tier === 2) window.setTimeout(() => haptic('warning'), 300);
}

function landPin(lat: number, lng: number): void {
  useBar.getState().patch({ pin: { lat, lng, n: ++pinSeq } });
  play('tink');
  haptic('medium');
}

/** Shows a verdict on the counter. Pour is the only writer of the coaster. */
function present(v: Verdict, note: 'stale' | 'repoured' | null, slide: boolean): void {
  const bar = useBar.getState();
  bar.patch({
    coaster: { kind: 'verdict', verdict: v, note },
    lastDrinkId: v.drinkId,
    ...(slide ? { slide: bar.slide + 1 } : {}),
  });
  setHash(v.lat, v.lng);
  announce(v);
}

/**
 * The orchestrator: pin + fly immediately, a blank coaster within one frame, then
 * geocode (offline) and weather (cached / Open-Meteo) in parallel, then judge().
 */
export async function pour(latIn: number, lngIn: number): Promise<void> {
  const my = ++seq;
  const bar = useBar.getState();
  if (!Number.isFinite(latIn) || !Number.isFinite(lngIn) || Math.abs(latIn) > 90 || Math.abs(lngIn) > 540) {
    bar.patch({ coaster: { kind: 'error', error: 'nowhere', lat: 0, lng: 0, retryAt: 0 }, slide: bar.slide + 1 });
    return;
  }
  const lat = r4(latIn);
  const lng = r4(wrapLng(lngIn));
  landPin(lat, lng);
  bar.patch({
    coaster: { kind: 'pouring', lat, lng },
    slide: bar.slide + 1,
    opinion: 0,
    flipped: false,
  });

  try {
    const geo = await loadGeo();
    const place = geo.locate(lat, lng);
    const weather = await getWeather(lat, lng, { ocean: place.kind === 'ocean' });
    if (my !== seq) return; // a newer pour won
    const s = useSettings.getState();
    const v = judge({
      now: new Date(),
      lat,
      lng,
      snapshot: weather.snapshot,
      place,
      menu: s.menu,
      drinks: DRINKS,
      grammar: GRAMMAR,
      settings: { gentler: s.gentler },
      lastDrinkId: useBar.getState().lastDrinkId,
    });
    if (weather.stale) v.stale = true;
    present(v, weather.stale ? 'stale' : null, false);
    upgradeCoastlines();
    try {
      await addToTab(v);
    } catch {
      if (!warnedTabFull) {
        warnedTabFull = true;
        useBar.getState().showToast('The Tab is full. Export and clear.');
      }
    }
  } catch (e) {
    if (my !== seq) return;
    const error: ErrorKind = e instanceof BarBusyError ? 'busy' : e instanceof NowhereError ? 'nowhere' : 'silent';
    useBar.getState().patch({
      coaster: { kind: 'error', error, lat, lng, retryAt: error === 'busy' ? Date.now() + 60_000 : 0 },
    });
    haptic('warning');
  }
}

/** Re-print a stored verdict from The Tab: no request unless it is older than 15 minutes. */
export async function repour(v: Verdict): Promise<void> {
  if (isStale(v, Date.now())) {
    await pour(v.lat, v.lng);
    const c = useBar.getState().coaster;
    if (c.kind === 'verdict') useBar.getState().patch({ coaster: { ...c, note: 'repoured' } });
    return;
  }
  ++seq;
  landPin(v.lat, v.lng);
  useBar.getState().patch({ opinion: 0, flipped: false, coaster: { kind: 'pouring', lat: v.lat, lng: v.lng } });
  present(v, null, true);
}

/** Deep link: a fresh Tab row for this cell re-prints without a request; anything else pours. */
export async function pourFromHash(lat: number, lng: number, recent: Verdict | undefined): Promise<void> {
  if (recent && !isStale(recent, Date.now())) return repour(recent);
  return pour(lat, lng);
}

/** The default pour: New Delhi. India first. */
export const DEFAULT_PLACE = { name: 'New Delhi', lat: 28.61, lng: 77.21 };

export function backToBar(): void {
  void pour(DEFAULT_PLACE.lat, DEFAULT_PLACE.lng);
}
