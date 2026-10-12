import { getTimes } from 'suncalc';
import { localClock } from './daypart';
import type { TickerCity } from './types';

const inWindow = (m: number, from: number, to: number): boolean => m >= from && m < to;

const upper = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

/** The register's VFD lines for this minute, iterated in longitude order. */
export function tickerLines(now: Date, cities: TickerCity[]): string[] {
  const sorted = [...cities].sort((a, b) => a.lng - b.lng);
  const out: string[] = [];
  for (const c of sorted) {
    const k = localClock(now, c.tz);
    const m = k.hour * 60 + k.minute;
    if (m >= 23 * 60 + 30 || m < 15) out.push(`LAST ORDERS IN ${upper(c.name)} · ${k.label}`);
    else if (inWindow(m, 6 * 60 + 30, 7 * 60 + 15)) out.push(`FIRST COFFEE IN ${upper(c.name)} · ${k.label}`);
    else {
      const sunset = getTimes(now, c.lat, c.lng).sunset?.getTime() ?? Number.NaN;
      if (Number.isFinite(sunset) && Math.abs(sunset - now.getTime()) <= 20 * 60 * 1000) {
        out.push(`SUN SETTING OVER ${upper(c.name)} · ${k.label}`);
      }
    }
  }
  if (out.length === 0) {
    const utc = localClock(now, 'UTC');
    out.push(`THE BAR IS OPEN · ${utc.label} UTC`);
  }
  return out;
}
