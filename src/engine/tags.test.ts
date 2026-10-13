import { describe, expect, it } from 'vitest';
import { FIXTURES, type FixtureName, judgeFixture } from '../test/helpers';
import { dial, drivingTag, extractTags, gradeFamily, RING, thermalTag } from './tags';
import type { Features, PlaceHit, Tag, TagScore } from './types';

const LAND: PlaceHit = { kind: 'land', polar: false, label: 'x', short: 'X' };
const base: Features = {
  apparentC: 15,
  tempC: 15,
  heatIndexC: null,
  humidexC: null,
  windChillC: null,
  dewPointC: 8,
  rh: 60,
  beaufort: 2,
  uv: 2,
  euAqi: 20,
  usAqi: 30,
  dust: 0,
  wmo: 1,
  precipMm: 0,
  precipProb: 0,
  snowCm: 0,
  cloudCover: 20,
  pressureHpa: 1012,
  windKmh: 10,
  gustKmh: 15,
  isDay: true,
  localHour: 14,
  localMinute: 0,
  localWeekday: 2,
  localDate: '2026-09-08',
  minutesToSunrise: -400,
  minutesToSunset: 300,
  polarApproximateTime: false,
  dayPart: 'afternoon',
  place: LAND,
};
const tagsOf = (p: Partial<Features>): Tag[] => extractTags({ ...base, ...p }).map((t) => t.tag);
const ts = (...t: Tag[]): TagScore[] => t.map((tag) => ({ tag, family: 'temp', intensity: 0, weight: 1 }));

const EXPECTED: Record<FixtureName, { tags: Tag[]; driving: Tag; dial: string; shift: 'day' | 'night' }> = {
  mumbai: {
    tags: ['oppressive', 'hot', 'still', 'drizzle', 'late'],
    driving: 'oppressive',
    dial: 'SOUP',
    shift: 'night',
  },
  yakutsk: { tags: ['arctic', 'snow', 'still', 'late'], driving: 'arctic', dial: 'ARCTIC', shift: 'night' },
  reykjavik: { tags: ['chilly', 'rain', 'breezy', 'afternoon'], driving: 'rain', dial: 'CHILLY', shift: 'day' },
  'dubai-noon': {
    tags: ['scorching', 'uv-extreme', 'smog', 'dust', 'afternoon'],
    driving: 'scorching',
    dial: 'SCORCHING',
    shift: 'day',
  },
  'arabian-sea': {
    tags: ['oppressive', 'hot', 'breezy', 'ocean', 'late'],
    driving: 'oppressive',
    dial: 'SOUP',
    shift: 'night',
  },
  'south-pole': { tags: ['arctic', 'polar', 'morning'], driving: 'arctic', dial: 'ARCTIC', shift: 'night' },
  'denver-hail': { tags: ['hail', 'warm', 'gale', 'afternoon'], driving: 'hail', dial: 'FAIR', shift: 'day' },
  'lisbon-golden': { tags: ['warm', 'golden'], driving: 'warm', dial: 'FAIR', shift: 'day' },
  'oslo-brunch': { tags: ['mild', 'brunch'], driving: 'mild', dial: 'FAIR', shift: 'day' },
};

describe('fixture tag sets (§6.3)', () => {
  it.each(FIXTURES)('%s', (name) => {
    const v = judgeFixture(name);
    const e = EXPECTED[name];
    expect(new Set(v.tags.map((t) => t.tag))).toEqual(new Set(e.tags));
    expect(v.drivingTag).toBe(e.driving);
    expect(v.dial).toBe(e.dial);
    expect(v.shift).toBe(e.shift);
    expect(v.tags.filter((t) => t.family === 'daypart')).toHaveLength(1);
    for (let i = 1; i < v.tags.length; i++) {
      expect(v.tags[i - 1]!.weight).toBeGreaterThanOrEqual(v.tags[i]!.weight);
    }
  });

  it('Mumbai weights: oppressive 1.43 > hot 1.35 > late 1.02 > drizzle 0.78 > still 0.20', () => {
    const w = judgeFixture('mumbai').tags.map((t) => [t.tag, Number(t.weight.toFixed(2))]);
    expect(w).toEqual([
      ['oppressive', 1.43],
      ['hot', 1.35],
      ['late', 1.02],
      ['drizzle', 0.78],
      ['still', 0.2],
    ]);
  });
});

describe('band edges', () => {
  it.each([
    [{ apparentC: -25 }, 'arctic'],
    [{ apparentC: -24.9 }, 'freezing'],
    [{ apparentC: 38 }, 'scorching'],
    [{ apparentC: 37.9 }, 'hot'],
    [{ apparentC: 28 }, 'warm'],
    [{ apparentC: 28.1 }, 'hot'],
    [{ apparentC: 0 }, 'cold'],
    [{ apparentC: 0.1 }, 'chilly'],
    [{ apparentC: 10 }, 'chilly'],
    [{ apparentC: -10 }, 'freezing'],
    [{ dewPointC: 24 }, 'oppressive'],
    [{ dewPointC: 23.9 }, 'muggy'],
    [{ windKmh: 62 }, 'gale'],
    [{ windKmh: 61.9, gustKmh: 60 }, 'gale'],
    [{ uv: 8 }, 'uv-extreme'],
    [{ euAqi: 60 }, 'smog'],
    [{ dust: 100 }, 'dust'],
    [{ wmo: 73, windKmh: 39 }, 'blizzard'],
    [{ wmo: 73, windKmh: 38.9 }, 'snow'],
    [{ wmo: 75 }, 'blizzard'],
    [{ dewPointC: 2, rh: 20 }, 'bone-dry'],
    [{ wmo: 45 }, 'fog'],
    [{ wmo: 95 }, 'storm'],
    [{ wmo: 65 }, 'downpour'],
    [{ wmo: 81 }, 'rain'],
    [{ wmo: 57 }, 'drizzle'],
    [{ windKmh: 5 }, 'still'],
    [{ windKmh: 20 }, 'breezy'],
  ] as [Partial<Features>, Tag][])('%o → %s', (p, tag) => expect(tagsOf(p)).toContain(tag));

  it.each([
    [{ dewPointC: 17.9 }, ['muggy', 'oppressive']],
    [{ windKmh: 61.9, gustKmh: 59.9 }, ['gale']],
    [{ uv: 7.9 }, ['uv-extreme']],
    [{ uv: 9, isDay: false }, ['uv-extreme']],
    [{ dewPointC: 2, rh: 30 }, ['bone-dry']],
    [{ windKmh: 45, gustKmh: 50 }, ['still', 'breezy', 'gale']],
    [{ wmo: 96 }, ['storm']],
    [{ wmo: 75 }, ['snow']],
  ] as [Partial<Features>, Tag[]][])('%o has none of %o', (p, absent) => {
    const t = tagsOf(p);
    for (const a of absent) expect(t).not.toContain(a);
  });

  it('carries day-part, ocean and polar tags', () => {
    expect(tagsOf({ place: { ...LAND, kind: 'ocean', polar: true } })).toEqual(
      expect.arrayContaining(['ocean', 'polar', 'afternoon']),
    );
  });
});

describe('driving tag priority (C6)', () => {
  it.each([
    [['hot', 'storm', 'oppressive'], 'storm'],
    [['oppressive', 'hot'], 'oppressive'],
    [['mild', 'still', 'evening'], 'mild'],
    [['ocean', 'mild', 'late'], 'mild'],
    [['storm'], 'storm'],
  ] as [Tag[], Tag][])('%o → %s', (t, d) => expect(drivingTag(ts(...t))).toBe(d));
  it('falls back to the day-part, then mild', () => {
    expect(drivingTag([{ tag: 'late', family: 'daypart', intensity: 0, weight: 1 }])).toBe('late');
    expect(drivingTag([])).toBe('mild');
  });
});

describe('grade family and the dial', () => {
  it('maps tags to the eight families', () => {
    expect(gradeFamily('hail')).toBe('storm');
    expect(gradeFamily('late')).toBe('sodium');
    expect(gradeFamily('dust')).toBe('fog');
    expect(gradeFamily('mild')).toBe('none');
  });
  it('places all seven ring labels at index × 40 − 120', () => {
    const tagFor: Record<string, Tag> = {
      ARCTIC: 'arctic',
      FREEZING: 'freezing',
      CHILLY: 'chilly',
      FAIR: 'mild',
      MUGGY: 'muggy',
      SOUP: 'oppressive',
      SCORCHING: 'scorching',
    };
    RING.forEach((label, i) => {
      expect(dial(tagFor[label] ?? null, 0).angle).toBe(i * 40 - 120);
    });
  });
  it('reads Mumbai exactly', () => {
    expect(dial('oppressive', 31.5)).toEqual({
      label: 'SOUP',
      angle: 80,
      valuetext: 'Feels like 31.5 degrees, tag: soup',
    });
  });
  it('rests at FAIR with no data', () => {
    expect(dial(null, null)).toEqual({ label: 'FAIR', angle: 0, valuetext: 'No reading' });
  });
  it('is a thermometer: hail at 27.6 ° leaves the needle at FAIR', () => {
    const v = judgeFixture('denver-hail');
    expect(thermalTag(v.tags)).toBe('warm');
    expect(v.dial).toBe('FAIR');
    expect(v.gradeFamily).toBe('storm');
  });
});
