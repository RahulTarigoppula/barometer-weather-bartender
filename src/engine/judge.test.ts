import { describe, expect, it } from 'vitest';
import { DRINKS, FIXTURES, GRAMMAR, geoIndex, judgeFixture, loadFixture } from '../test/helpers';
import { buildFeatures, judge } from './index';

const EXPECTED = {
  mumbai: { drink: 'mojito', driving: 'oppressive', dial: 'SOUP', tier: 1 },
  yakutsk: { drink: 'hot-buttered-rum', driving: 'arctic', dial: 'ARCTIC', tier: 2 },
  reykjavik: { drink: 'hot-toddy', driving: 'rain', dial: 'CHILLY', tier: 1 },
  'dubai-noon': { drink: 'margarita', driving: 'scorching', dial: 'SCORCHING', tier: 2 },
  'arabian-sea': { drink: 'dark-n-stormy', driving: 'oppressive', dial: 'SOUP', tier: 2 },
  'south-pole': { drink: 'hot-buttered-rum', driving: 'arctic', dial: 'ARCTIC', tier: 2 },
  'denver-hail': { drink: 'dark-n-stormy', driving: 'hail', dial: 'FAIR', tier: 2 },
  'lisbon-golden': { drink: 'gin-tonic', driving: 'warm', dial: 'FAIR', tier: 0 },
  'oslo-brunch': { drink: 'bloody-mary', driving: 'mild', dial: 'FAIR', tier: 0 },
} as const;

describe('judge(), the nine golden fixtures', () => {
  it.each(FIXTURES)('%s', (name) => {
    const v = judgeFixture(name);
    const e = EXPECTED[name];
    expect([v.drinkId, v.drivingTag, v.dial, v.stamp.tier]).toEqual([e.drink, e.driving, e.dial, e.tier]);
    expect(v.dialAngle).toBe(
      ['ARCTIC', 'FREEZING', 'CHILLY', 'FAIR', 'MUGGY', 'SOUP', 'SCORCHING'].indexOf(e.dial) * 40 - 120,
    );
  });

  it('shows the API apparent temperature, never the engine heat index', () => {
    const v = judgeFixture('mumbai');
    expect(v.features.apparentC).toBe(31.5);
    expect(v.features.heatIndexC).toBeNull();
  });

  it('ignores the process timezone entirely', () => {
    const before = judgeFixture('reykjavik');
    const tz = process.env.TZ;
    process.env.TZ = 'UTC';
    try {
      expect(judgeFixture('reykjavik')).toEqual(before);
    } finally {
      process.env.TZ = tz;
    }
  });

  it('records sources for the credit line', () => {
    expect(judgeFixture('arabian-sea').sources).toEqual({ air: true, marine: true });
    expect(judgeFixture('mumbai').sources).toEqual({ air: true, marine: false });
  });

  it('falls back to wind chill / heat index / dew-point maths when the API omits fields', () => {
    const f = loadFixture('yakutsk');
    const s = { ...f.snapshot, current: { ...f.snapshot.current, apparentC: null, dewPointC: null } };
    const feats = buildFeatures({
      now: f.now,
      lat: f.lat,
      lng: f.lng,
      snapshot: s,
      place: geoIndex().locate(f.lat, f.lng),
    });
    expect(feats.apparentC).toBeCloseTo(-48.7, 1);
    expect(feats.dewPointC).toBeLessThan(-41);
    const d = loadFixture('dubai-noon');
    const s2 = { ...d.snapshot, current: { ...d.snapshot.current, apparentC: null } };
    const f2 = buildFeatures({
      now: d.now,
      lat: d.lat,
      lng: d.lng,
      snapshot: s2,
      place: geoIndex().locate(d.lat, d.lng),
    });
    expect(f2.apparentC).toBeGreaterThan(43);
  });

  it('1,000 calls average ≤ 5 ms', () => {
    const f = loadFixture('mumbai');
    const place = geoIndex().locate(f.lat, f.lng);
    const t0 = performance.now();
    for (let i = 0; i < 1000; i++) {
      judge({
        now: f.now,
        lat: f.lat,
        lng: f.lng,
        snapshot: f.snapshot,
        place,
        menu: 'bar',
        drinks: DRINKS,
        grammar: GRAMMAR,
        settings: { gentler: false },
      });
    }
    expect((performance.now() - t0) / 1000).toBeLessThan(5);
  });
});
