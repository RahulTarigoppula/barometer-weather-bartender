import type { Tag, TagScore } from './types';

/**
 * Road outlook — a transparent ESTIMATE, not live data. No free, key-less live-traffic feed exists,
 * so this models the typical daily rush of Indian metros (morning and evening peaks, lighter
 * weekends; relative city severity after published congestion rankings) and adds the weather
 * that actually slows Indian roads: rain, downpours, storms and fog.
 */

export interface Metro {
  name: string;
  lat: number;
  lng: number;
  /** 0..1: how bad a normal rush hour gets here, relative to the worst Indian metro. */
  severity: number;
}

export const METROS: Metro[] = [
  { name: 'Bengaluru', lat: 12.97, lng: 77.59, severity: 1 },
  { name: 'Kolkata', lat: 22.57, lng: 88.36, severity: 0.95 },
  { name: 'Pune', lat: 18.52, lng: 73.86, severity: 0.9 },
  { name: 'Mumbai', lat: 19.07, lng: 72.88, severity: 0.88 },
  { name: 'New Delhi', lat: 28.61, lng: 77.21, severity: 0.82 },
  { name: 'Hyderabad', lat: 17.39, lng: 78.49, severity: 0.78 },
  { name: 'Chennai', lat: 13.08, lng: 80.27, severity: 0.76 },
  { name: 'Ahmedabad', lat: 23.02, lng: 72.57, severity: 0.66 },
  { name: 'Jaipur', lat: 26.91, lng: 75.79, severity: 0.58 },
  { name: 'Lucknow', lat: 26.85, lng: 80.95, severity: 0.56 },
  { name: 'Kochi', lat: 9.93, lng: 76.27, severity: 0.52 },
  { name: 'Guwahati', lat: 26.14, lng: 91.74, severity: 0.5 },
];

const R_KM = 6371;
const RAD = Math.PI / 180;
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = (bLat - aLat) * RAD;
  const dLng = (bLng - aLng) * RAD;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * RAD) * Math.cos(bLat * RAD) * Math.sin(dLng / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.sqrt(s));
}

/** The metro whose roads you are on (within 60 km), if any. */
export function nearestMetro(lat: number, lng: number): Metro | null {
  let best: Metro | null = null;
  let bd = 60;
  for (const m of METROS) {
    const d = distanceKm(lat, lng, m.lat, m.lng);
    if (d < bd) {
      bd = d;
      best = m;
    }
  }
  return best;
}

/** Typical demand (0..1) at a local hour; two humps on weekdays, a softer midday one at weekends. */
export function demand(hour: number, weekday: number): number {
  const bump = (h: number, centre: number, width: number): number =>
    Math.exp(-((h - centre) ** 2) / (2 * width * width));
  const weekend = weekday === 0 || weekday === 6;
  const base = 0.08 + (hour >= 7 && hour <= 22 ? 0.18 : 0);
  const peaks = weekend
    ? 0.45 * bump(hour, 13, 3) + 0.5 * bump(hour, 19, 2.2)
    : 0.85 * bump(hour, 9.5, 1.4) + 0.95 * bump(hour, 18.8, 1.8) + 0.25 * bump(hour, 13.5, 2);
  return Math.min(1, base + peaks);
}

/** How much the weather adds to congestion (multiplier ≥ 1). */
export function weatherDrag(tags: TagScore[]): { factor: number; reason: string | null } {
  const has = (...t: Tag[]): boolean => tags.some((s) => t.includes(s.tag));
  if (has('downpour', 'storm', 'hail')) return { factor: 1.35, reason: 'Heavy rain: waterlogging and slow lanes' };
  if (has('rain')) return { factor: 1.2, reason: 'Rain slows everything down' };
  if (has('fog')) return { factor: 1.18, reason: 'Fog: low visibility, slower roads' };
  if (has('drizzle')) return { factor: 1.08, reason: 'Wet roads' };
  if (has('blizzard', 'snow')) return { factor: 1.3, reason: 'Snow on the roads' };
  return { factor: 1, reason: null };
}

export type TrafficLevel = 'light' | 'moderate' | 'heavy' | 'severe';
export const LEVEL_LABEL: Record<TrafficLevel, string> = {
  light: 'Light',
  moderate: 'Moderate',
  heavy: 'Heavy',
  severe: 'Gridlock-prone',
};

const level = (index: number): TrafficLevel =>
  index < 30 ? 'light' : index < 55 ? 'moderate' : index < 75 ? 'heavy' : 'severe';

export interface HourOutlook {
  hour: number;
  index: number;
  level: TrafficLevel;
}

export interface RoadOutlook {
  metro: Metro | null;
  /** 0..100 congestion index right now. */
  index: number;
  level: TrafficLevel;
  /** Minutes for a typical 10 km city trip right now, and with empty roads. */
  tripMin: number;
  freeMin: number;
  reason: string | null;
  /** The next 12 hours. */
  next: HourOutlook[];
  /** A friendly "when to go" line. */
  advice: string;
}

const FREE_KMH = 32; // a clear Indian city road, signals included

function indexAt(hour: number, weekday: number, severity: number, factor: number): number {
  return Math.min(100, Math.round(demand(hour, weekday) * severity * factor * 100));
}

const tripMinutes = (index: number): number => Math.round((10 / FREE_KMH) * 60 * (1 + (index / 100) * 1.9));

/** The road outlook for a place at a local time. Outside the big metros it softens to a town profile. */
export function roadOutlook(input: {
  lat: number;
  lng: number;
  hour: number;
  minute: number;
  weekday: number;
  tags: TagScore[];
  india: boolean;
}): RoadOutlook {
  const metro = input.india ? nearestMetro(input.lat, input.lng) : null;
  const severity = metro?.severity ?? (input.india ? 0.4 : 0.35);
  const drag = weatherDrag(input.tags);
  const h = input.hour + input.minute / 60;
  const index = indexAt(h, input.weekday, severity, drag.factor);
  const next: HourOutlook[] = Array.from({ length: 12 }, (_, i) => {
    const hour = (input.hour + i + 1) % 24;
    const wd = (input.weekday + (input.hour + i + 1 >= 24 ? 1 : 0)) % 7;
    const ix = indexAt(hour, wd, severity, drag.factor);
    return { hour, index: ix, level: level(ix) };
  });
  // The first hour that is clearly better (a level lighter, or 25 points down) — not the 3 a.m. minimum.
  const eases = next.find((h) => h.index <= Math.max(29, index - 25));
  const hh = (n: number): string => `${String(n).padStart(2, '0')}:00`;
  const advice =
    level(index) === 'light'
      ? 'Roads should be easy right now.'
      : eases
        ? `Eases by ${hh(eases.hour)}, about ${tripMinutes(eases.index)} min for 10 km.`
        : 'It stays busy for a while. Leave a buffer.';
  return {
    metro,
    index,
    level: level(index),
    tripMin: tripMinutes(index),
    freeMin: tripMinutes(0),
    reason: drag.reason,
    next,
    advice,
  };
}

/** Live flow from TomTom (with the user's own key) → a 0..100 index comparable to the estimate. */
export function liveIndex(currentKmh: number, freeFlowKmh: number): number {
  if (freeFlowKmh <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((1 - currentKmh / freeFlowKmh) * 125)));
}
export const levelOf = level;
