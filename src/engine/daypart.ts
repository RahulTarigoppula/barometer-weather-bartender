import { getTimes } from 'suncalc';
import type { DayPart } from './types';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface LocalClock {
  hour: number;
  minute: number;
  weekday: number;
  label: string;
  /** "2026-09-06" in the place's own calendar. */
  date: string;
  /** Local wall-clock time as if it were UTC, only for differences between local timestamps. */
  wallMs: number;
}

/** Formats `now` in the place's timezone. Never reads the browser's timezone. */
export function localClock(now: Date, tz: string): LocalClock {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(now);
  const get = (t: Intl.DateTimeFormatPartTypes): string => parts.find((p) => p.type === t)?.value ?? '0';
  const [y, mo, d, h, mi] = [get('year'), get('month'), get('day'), get('hour'), get('minute')];
  return {
    hour: +h,
    minute: +mi,
    weekday: WEEKDAYS.indexOf(get('weekday')),
    label: `${h}:${mi}`,
    date: `${y}-${mo}-${d}`,
    wallMs: Date.UTC(+y, +mo - 1, +d, +h, +mi),
  };
}

/** Parses an Open-Meteo local ISO string ("2026-09-06T19:58", no offset) as a wall-clock timestamp. */
export function wallMs(localIso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(localIso);
  if (!m) return null;
  return Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!);
}

export interface DayPartInput {
  now: Date;
  lat: number;
  lng: number;
  clock: LocalClock;
  sunrise: string;
  sunset: string;
}

export interface DayPartResult {
  dayPart: DayPart;
  minutesToSunrise: number;
  minutesToSunset: number;
  polarApproximateTime: boolean;
}

/** Minutes of golden hour before sunset at this place and date, from suncalc (sun 6° above the horizon). */
function goldenMinutes(now: Date, lat: number, lng: number): number {
  const t = getTimes(now, lat, lng);
  if (!t.sunset || !t.goldenHour) return 45;
  const gap = (t.sunset.getTime() - t.goldenHour.getTime()) / 60000;
  return Number.isFinite(gap) && gap > 0 && gap < 240 ? gap : 45;
}

export function dayPartFor(i: DayPartInput): DayPartResult {
  const m = i.clock.hour * 60 + i.clock.minute;
  const rise = wallMs(i.sunrise);
  const set = wallMs(i.sunset);
  const minutesToSunrise = rise === null ? Number.POSITIVE_INFINITY : (rise - i.clock.wallMs) / 60000;
  const minutesToSunset = set === null ? Number.POSITIVE_INFINITY : (set - i.clock.wallMs) / 60000;

  // 1. Polar day/night: no sunrise/sunset row (or a 24-hour "day"), clock only, and the copy hedges.
  const allDayOrNight =
    rise !== null && set !== null && Math.abs(i.lat) >= 66.5 && (set - rise >= 1430 * 60000 || set - rise <= 0);
  if (rise === null || set === null || allDayOrNight) {
    const dayPart: DayPart =
      m >= 23 * 60 || m < 4 * 60 ? 'late' : m < 10 * 60 ? 'morning' : m < 18 * 60 ? 'afternoon' : 'evening';
    return { dayPart, minutesToSunrise, minutesToSunset, polarApproximateTime: true };
  }
  const out = (dayPart: DayPart): DayPartResult => ({
    dayPart,
    minutesToSunrise,
    minutesToSunset,
    polarApproximateTime: false,
  });
  if (m >= 23 * 60 || m < 4 * 60) return out('late');
  if (Math.abs(minutesToSunrise) <= 45) return out('dawn');
  if (minutesToSunset >= 0 && minutesToSunset <= goldenMinutes(i.now, i.lat, i.lng)) return out('golden');
  if (minutesToSunset < 0) return out('evening');
  if (m < 10 * 60) return out('morning');
  if ((i.clock.weekday === 0 || i.clock.weekday === 6) && m < 13 * 60) return out('brunch');
  return out('afternoon');
}

/** `late` peaks at 01:30 and fades to 0 at 23:00 / 04:00. Every other day-part has intensity 0. */
export function dayPartIntensity(dayPart: DayPart, hour: number, minute: number): number {
  if (dayPart !== 'late') return 0;
  const m = hour * 60 + minute;
  const d = m >= 12 * 60 ? 24 * 60 - m + 90 : Math.abs(m - 90);
  return Math.max(0, Math.min(1, 1 - d / 150));
}

export const dayPartBase = (dayPart: DayPart): number => (dayPart === 'brunch' || dayPart === 'late' ? 0.6 : 0.4);

/** "5h42m" / "23m" / "n/a". */
export function fmtDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) return 'n/a';
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const mm = total % 60;
  return h > 0 ? `${h}h${String(mm).padStart(2, '0')}m` : `${mm}m`;
}

export const sunsetSoon = (minutesToSunset: number): boolean => minutesToSunset > 0 && minutesToSunset <= 45;
