import { describe, expect, it } from 'vitest';
import { judgeFixture } from '../test/helpers';
import { dayPartFor, dayPartIntensity, fmtDuration, localClock, sunsetSoon, wallMs } from './daypart';

const clockAt = (iso: string, weekday = 2) => {
  const ms = wallMs(iso) ?? 0;
  const d = new Date(ms);
  return {
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    weekday,
    label: iso.slice(11, 16),
    date: iso.slice(0, 10),
    wallMs: ms,
  };
};
const part = (iso: string, sunrise: string, sunset: string, weekday = 2, lat = 40) =>
  dayPartFor({ now: new Date(Date.parse(`${iso}:00Z`)), lat, lng: 0, clock: clockAt(iso, weekday), sunrise, sunset });

describe('localClock', () => {
  it('formats in the place timezone, never the browser one', () => {
    const now = new Date('2026-09-05T19:15:00Z');
    expect(localClock(now, 'Asia/Kolkata')).toMatchObject({ hour: 0, minute: 45, weekday: 0, label: '00:45' });
    expect(localClock(now, 'America/Denver').label).toBe('13:15');
    expect(localClock(now, 'UTC').date).toBe('2026-09-05');
  });
  it('rejects malformed local ISO strings', () => expect(wallMs('soon')).toBeNull());
});

describe('day-part ladder', () => {
  it.each([
    ['mumbai', 'late'],
    ['yakutsk', 'late'],
    ['reykjavik', 'afternoon'],
    ['lisbon-golden', 'golden'],
    ['oslo-brunch', 'brunch'],
    ['dubai-noon', 'afternoon'],
    ['south-pole', 'morning'],
  ] as const)('%s → %s', (name, dp) => expect(judgeFixture(name).features.dayPart).toBe(dp));

  it('hedges the polar clock', () => {
    expect(judgeFixture('south-pole').features.polarApproximateTime).toBe(true);
    expect(judgeFixture('reykjavik').features.polarApproximateTime).toBe(false);
  });
  it('Mumbai is a Sunday', () => expect(judgeFixture('mumbai').features.localWeekday).toBe(0));

  it('late runs 23:00–03:59', () => {
    expect(part('2026-01-14T03:59', '2026-01-14T10:12', '2026-01-14T15:40').dayPart).toBe('late');
    expect(part('2026-01-14T04:00', '2026-01-14T10:12', '2026-01-14T15:40').dayPart).toBe('morning');
    expect(part('2026-01-14T23:00', '2026-01-14T10:12', '2026-01-14T15:40').dayPart).toBe('late');
  });
  it('dawn is ±45 minutes around sunrise', () => {
    const rise = '2026-09-06T06:22';
    const set = '2026-09-06T19:00';
    expect(part('2026-09-06T05:40', rise, set).dayPart).toBe('dawn');
    expect(part('2026-09-06T07:06', rise, set).dayPart).toBe('dawn');
    expect(part('2026-09-06T07:08', rise, set).dayPart).toBe('morning');
  });
  it('brunch is a weekend thing', () => {
    const rise = '2026-09-06T06:32';
    const set = '2026-09-06T20:14';
    expect(part('2026-09-06T10:40', rise, set, 0).dayPart).toBe('brunch');
    expect(part('2026-09-06T10:40', rise, set, 6).dayPart).toBe('brunch');
    expect(part('2026-09-06T10:40', rise, set, 1).dayPart).toBe('afternoon');
  });
  it('evening comes after sunset', () => {
    expect(part('2026-09-06T21:30', '2026-09-06T06:32', '2026-09-06T20:14').dayPart).toBe('evening');
  });
  it('a 24-hour polar day falls back to the clock', () => {
    const r = part('2026-10-13T12:00', '2026-10-13T00:00', '2026-10-14T00:00', 2, -89.9);
    expect(r.polarApproximateTime).toBe(true);
    expect(r.dayPart).toBe('afternoon');
    expect(part('2026-10-13T19:00', '', '', 2, -89.9).dayPart).toBe('evening');
  });
});

describe('sunset copy hooks', () => {
  it('Reykjavík sunset is in 5h42m', () => {
    expect(fmtDuration(judgeFixture('reykjavik').features.minutesToSunset)).toBe('5h42m');
  });
  it('Lisbon sunset is in 23m and soon', () => {
    const m = judgeFixture('lisbon-golden').features.minutesToSunset;
    expect(fmtDuration(m)).toBe('23m');
    expect(sunsetSoon(m)).toBe(true);
    expect(fmtDuration(Number.POSITIVE_INFINITY)).toBe('—');
  });
  it('late peaks at 01:30', () => {
    expect(dayPartIntensity('late', 1, 30)).toBe(1);
    expect(dayPartIntensity('late', 0, 45)).toBeCloseTo(0.7, 5);
    expect(dayPartIntensity('late', 23, 0)).toBe(0);
    expect(dayPartIntensity('golden', 19, 0)).toBe(0);
  });
});

describe('barista suggestion', () => {
  it('suggests coffee at Oslo brunch, not after midnight in Mumbai, not in Reykjavík afternoon', () => {
    expect(judgeFixture('oslo-brunch').suggestBarista).toBe(true);
    expect(judgeFixture('mumbai').suggestBarista).toBe(false);
    expect(judgeFixture('reykjavik').suggestBarista).toBe(false);
    expect(judgeFixture('oslo-brunch', 'barista').suggestBarista).toBe(false);
  });
});
