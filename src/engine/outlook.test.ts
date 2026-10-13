import { describe, expect, it } from 'vitest';
import { DRINKS, judgeFixture, loadFixture } from '../test/helpers';
import { dayName, hourLabel, mahaulBrief, snackFor, sunArc, tempPath, tipsFor, weekRange } from './outlook';
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

describe('the mahaul brief', () => {
  const base = {
    place: 'New Delhi',
    condition: 'Clear sky',
    temp: '27°',
    feels: '31°',
    isDay: false,
    localHour: 21,
    roads: { level: 'Heavy', eases: '22:00' },
    drink: 'Mojito',
  };
  it('reads the day in a few honest sentences, most urgent advice first', () => {
    const tips = [{ id: 'mask', label: 'Mask outdoors', detail: '', tone: 'alert' } as const];
    expect(mahaulBrief({ ...base, tips: [...tips] })).toBe(
      'Clear sky over New Delhi tonight, 27° that feels like 31°. Mask up outside; the air is unhealthy. Roads are heavy for now, easing by 22:00. Tonight’s pour: Mojito.',
    );
  });
  it('morning, calm, no roads, same feel', () => {
    const s = mahaulBrief({ ...base, isDay: true, localHour: 8, feels: '27°', tips: [], roads: null });
    expect(s).toBe(
      'Clear sky over New Delhi this morning, 27°. Nothing out there to worry about. Today’s pour: Mojito.',
    );
    expect(s).not.toMatch(/—/);
  });
  it('afternoon and evening wording; roads without an easing hour', () => {
    expect(
      mahaulBrief({ ...base, isDay: true, localHour: 14, tips: [], roads: { level: 'Light', eases: null } }),
    ).toMatch(/this afternoon.*Roads look light\. Today’s pour/);
    expect(mahaulBrief({ ...base, isDay: true, localHour: 18, tips: [] })).toMatch(/this evening.*Tonight’s pour/);
  });
});

describe('the mahaul brief, casing', () => {
  it('starts with a capital whatever the label casing', () => {
    const s = mahaulBrief({
      place: 'Pune',
      condition: 'light drizzle',
      temp: '24°',
      feels: '24°',
      isDay: true,
      localHour: 9,
      tips: [],
      roads: null,
      drink: 'Masala Chai',
    });
    expect(s.startsWith('Light drizzle over Pune this morning, 24°.')).toBe(true);
  });
});

describe('scrubbing the next 24 hours', () => {
  const h = (time: string, wmo: number, isDay: boolean) => ({ time, tempC: 25, precipProb: 0, wmo, isDay });
  it('reads the light from the clock and the sky from the code', async () => {
    const { hourMood, peekLabel } = await import('./outlook');
    expect(hourMood(h('2026-09-06T06:00', 0, true))).toMatchObject({ hour: 'dawn', sky: 'clear', rain: 0 });
    expect(hourMood(h('2026-09-06T13:00', 2, true))).toMatchObject({ hour: 'day', sky: 'clear' });
    expect(hourMood(h('2026-09-06T18:00', 61, true))).toMatchObject({ hour: 'dusk', sky: 'rain', rain: 0.6 });
    expect(hourMood(h('2026-09-06T23:00', 95, false))).toMatchObject({ hour: 'night', sky: 'rain', rain: 1 });
    expect(hourMood(h('2026-09-06T10:00', 51, true)).rain).toBe(0.3);
    expect(hourMood(h('2026-09-06T10:00', 45, true)).sky).toBe('fog');
    expect(hourMood(h('2026-09-06T10:00', 71, true))).toMatchObject({ sky: 'cold', snow: true });
    expect(peekLabel('2026-09-06T18:00', 0)).toBe('Now');
    expect(peekLabel('2026-09-06T18:00', 7)).toBe('18:00 · in 7 h');
  });
});

describe('twilight by the clock', () => {
  it('keeps dusk glowing after the daylight flag flips', async () => {
    const { hourMood } = await import('./outlook');
    expect(hourMood({ time: '2026-10-13T18:00', tempC: 30, precipProb: 0, wmo: 0, isDay: false }).hour).toBe('dusk');
    expect(hourMood({ time: '2026-10-13T20:00', tempC: 30, precipProb: 0, wmo: 0, isDay: false }).hour).toBe('night');
    expect(hourMood({ time: '2026-10-13T05:00', tempC: 30, precipProb: 0, wmo: 0, isDay: false }).hour).toBe('dawn');
  });
});
