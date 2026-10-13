import { describe, expect, it } from 'vitest';
import { DRINKS, judgeFixture, loadFixture } from '../test/helpers';
import { dayName, hourLabel, snackFor, sunArc, tempPath, tipsFor, weekRange } from './outlook';
import type { Features, HourPoint } from './types';

const drink = (id: string) => {
  const d = DRINKS.find((x) => x.id === id);
  if (!d) throw new Error(id);
  return d;
};
const base = judgeFixture('oslo-brunch').features;
const f = (p: Partial<Features>): Features => ({ ...base, ...p });

describe('today’s tips', () => {
  it('Dubai noon: heat warning, sunscreen, and the air', () => {
    const ids = tipsFor(judgeFixture('dubai-noon').features).map((t) => t.id);
    expect(ids).toContain('heat');
    expect(ids).toContain('mask'); // US AQI 152
    expect(ids).toContain('sunscreen');
    expect(ids[0]).toMatch(/heat|mask/); // alerts first
  });
  it('rain soon → umbrella; cold → layers; fog → fog; gusts → gusty', () => {
    const hours: HourPoint[] = [{ time: 'x', tempC: 10, precipProb: 80, wmo: 61, isDay: true }];
    expect(tipsFor(f({ precipProb: 10 }), hours).map((t) => t.id)).toContain('umbrella');
    expect(tipsFor(f({ apparentC: 8 })).map((t) => t.id)).toContain('layers');
    expect(tipsFor(f({ apparentC: -5 })).map((t) => t.id)).toContain('bundle');
    expect(tipsFor(f({ wmo: 45 })).map((t) => t.id)).toContain('fog');
    expect(tipsFor(f({ gustKmh: 70 })).map((t) => t.id)).toContain('wind');
    expect(tipsFor(f({ apparentC: 36 })).map((t) => t.id)).toContain('hydrate');
    expect(tipsFor(f({ usAqi: 120 })).map((t) => t.id)).toContain('sensitive');
  });
  it('a calm golden hour needs no advice, and there are never more than four', () => {
    expect(tipsFor(judgeFixture('lisbon-golden').features)).toEqual([]);
    expect(
      tipsFor(f({ apparentC: 45, usAqi: 200, precipMm: 1, uv: 11, isDay: true, gustKmh: 80, wmo: 45 })).length,
    ).toBe(4);
  });
});

describe('snack pairing', () => {
  it('rain means pakoras; tea means biscuits; late means Maggi', () => {
    expect(snackFor(judgeFixture('reykjavik').tags, drink('hot-toddy')).name).toMatch(/pakora/);
    expect(snackFor(judgeFixture('reykjavik').tags, drink('masala-chai')).name).toMatch(/Parle-G/);
    expect(
      snackFor(
        judgeFixture('mumbai').tags.filter((t) => t.tag !== 'drizzle'),
        drink('mojito'),
      ).name,
    ).toMatch(/Maggi/);
    expect(
      snackFor(
        judgeFixture('yakutsk').tags.filter((t) => t.tag !== 'late'),
        drink('hot-buttered-rum'),
      ).name,
    ).toMatch(/Samosa/);
    expect(snackFor(judgeFixture('oslo-brunch').tags, drink('mimosa')).name).toMatch(/Poha/);
    expect(snackFor(judgeFixture('lisbon-golden').tags, drink('gin-tonic')).name).toMatch(/peanuts/);
    expect(snackFor(judgeFixture('dubai-noon').tags, drink('margarita')).name).toMatch(/chaat/);
    expect(snackFor([], drink('mojito')).name).toMatch(/makhana/);
  });
});

describe('the sun arc', () => {
  it('Reykjavík at 14:30 is well past solar noon', () => {
    const a = sunArc(judgeFixture('reykjavik').features);
    expect(a.progress).toBeGreaterThan(0.55);
    expect(a.progress).toBeLessThan(0.65);
    expect(a.daylightMin).toBe(827);
  });
  it('null at night and in the polar night', () => {
    expect(sunArc(judgeFixture('mumbai').features).progress).toBeNull();
    expect(sunArc(judgeFixture('south-pole').features)).toEqual({ progress: null, daylightMin: null });
    expect(sunArc({ minutesToSunrise: 10, minutesToSunset: 5 }).progress).toBeNull();
  });
});

describe('forecast shaping', () => {
  it('reads hours and days from the snapshot', () => {
    const s = loadFixture('mumbai').snapshot;
    expect(s.hours?.[0]?.time).toBe('2026-09-06T00:00');
    expect(s.hours?.length).toBe(24);
  });
  it('names days and hours', () => {
    expect(dayName('2026-09-06')).toBe('Sun');
    expect(dayName('nope')).toBe('');
    expect(hourLabel('2026-09-06T14:00', 0)).toBe('Now');
    expect(hourLabel('2026-09-06T14:00', 3)).toBe('14:00');
  });
  it('week range and the temperature path', () => {
    expect(weekRange([{ date: 'd', wmo: 0, tMinC: 20, tMaxC: 30, precipProbMax: 0, uvMax: 0 }])).toEqual({
      lo: 20,
      hi: 30,
    });
    expect(weekRange([{ date: 'd', wmo: 0, tMinC: 5, tMaxC: 5, precipProbMax: 0, uvMax: 0 }])).toEqual({
      lo: 4,
      hi: 6,
    });
    const hours: HourPoint[] = [20, 25, 30].map((t, i) => ({
      time: `t${i}`,
      tempC: t,
      precipProb: 0,
      wmo: 0,
      isDay: true,
    }));
    const p = tempPath(hours, 200, 100, 10);
    expect(p.points).toEqual([
      [0, 90],
      [100, 50],
      [200, 10],
    ]);
    expect(p.line.startsWith('M0 90')).toBe(true);
    expect(tempPath(hours.slice(0, 1), 10, 10).line).toBe('');
  });
});
