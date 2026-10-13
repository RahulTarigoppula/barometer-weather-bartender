import { describe, expect, it } from 'vitest';
import { beaufort, cToF, dewPoint, euAqiBand, fToC, heatIndex, humidex, uvBand, windChill } from './comfort';
import { wmoKind, wmoLabel } from './wmo';

const near = (a: number | null, b: number, tol = 0.1): void => {
  expect(a).not.toBeNull();
  expect(Math.abs((a ?? Number.NaN) - b)).toBeLessThanOrEqual(tol);
};

describe('heatIndex', () => {
  it('does not apply to Mumbai at 02:00 — the simple formula is under 80 °F', () => {
    const r = heatIndex(25.4, 94);
    expect(r.applies).toBe(false);
    near(r.hiF, 79.6);
    near(r.hiC, 26.5);
    // The display rule: the coaster shows the API's apparent 31.5, never this.
    expect(r.hiC).toBeLessThan(31.5);
  });
  it.each([
    [32.2, 70, 105.8, 41.0, 0],
    [40.0, 20, 102.9, 39.4, null],
    [35.0, 10, 89.4, 31.9, -0.75],
    [29.4, 90, 101.5, 38.6, 0.21],
    [38.0, 60, 130.9, 55.0, null],
    [26.7, 50, 80.9, 27.1, null],
  ])('(%s °C, %s %%) → %s °F', (t, rh, f, c, adj) => {
    const r = heatIndex(t, rh);
    expect(r.applies).toBe(true);
    near(r.hiF, f);
    near(r.hiC, c);
    if (adj !== null) near(r.adjustment, adj, 0.01);
  });
});

describe('humidex', () => {
  it.each([
    [30, 25, 42.3],
    [25.4, 24.4, 37.1],
    [35, 28, 50.9],
    [20, 10, 21.3],
    [40, 5, 39.3],
  ])('(%s, %s) → %s', (t, d, h) => near(humidex(t, d).value, h));
  it('flags a dew point above the air temperature without throwing', () => {
    const r = humidex(20, 25);
    expect(r.suspicious).toBe(true);
    expect(r.value).toBeGreaterThanOrEqual(20);
  });
});

describe('windChill', () => {
  it('is −48.7 for the Yakutsk verdict', () => near(windChill(-41, 5.5), -48.7));
  it.each([
    [-45, 8, -55.6],
    [-40, 5, -47.0],
    [4, 30, -1.3],
    [6, 21, 2.2],
    [-20, 40, -34.1],
    [0, 15, -4.4],
    [-10, 10, -15.3],
    [5, 4.9, 4.1],
    [10, 5, 9.8],
  ])('(%s, %s) → %s', (t, v, w) => near(windChill(t, v), w));
  it.each([
    [10.1, 20],
    [5, 4],
  ])('(%s, %s) → null', (t, v) => expect(windChill(t, v)).toBeNull());
});

describe('dewPoint', () => {
  it('matches the API for Mumbai', () => near(dewPoint(25.4, 94), 24.4));
  it.each([
    [35, 20, 8.7],
    [0, 100, 0.0],
    [30, 50, 18.4],
    [40, 10, 2.6],
    [-10, 80, -12.8],
  ])('(%s, %s) → %s', (t, rh, d) => near(dewPoint(t, rh), d));
  it('guards ln(0)', () => expect(dewPoint(20, 0)).toBeNull());
});

describe('bands and scales', () => {
  it('beaufort', () => {
    const v = [0.5, 1.9, 8, 15, 24, 33, 45, 55, 70, 80, 95, 110, 118, 200].map(beaufort);
    expect(v).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12]);
  });
  it('uvBand', () => {
    expect([0, 2.9, 3, 5.9, 6, 7.9, 8, 10.9, 11, 14].map(uvBand)).toEqual([
      'low',
      'low',
      'moderate',
      'moderate',
      'high',
      'high',
      'very-high',
      'very-high',
      'extreme',
      'extreme',
    ]);
  });
  it('euAqiBand', () => {
    expect([0, 19.9, 20, 34, 40, 60, 80, 100.1, null].map(euAqiBand)).toEqual([
      'good',
      'good',
      'fair',
      'fair',
      'moderate',
      'poor',
      'very-poor',
      'extremely-poor',
      'unknown',
    ]);
  });
  it('converts both ways', () => {
    expect(cToF(100)).toBe(212);
    expect(fToC(32)).toBe(0);
  });
  it('maps WMO codes and never throws on unknown ones', () => {
    expect(wmoKind(96)).toBe('hail');
    expect(wmoKind(42)).toBe('unknown');
    expect(wmoLabel(42)).toBe('unclassified sky');
    expect(wmoLabel(61)).toBe('light rain');
  });
});

describe('US AQI bands', () => {
  it('maps every band and the missing reading', async () => {
    const { usAqiBand } = await import('./comfort');
    expect([null, 30, 80, 140, 180, 250, 400].map((a) => usAqiBand(a).label)).toEqual([
      'No reading',
      'Good',
      'Moderate',
      'Unhealthy for some',
      'Unhealthy',
      'Very unhealthy',
      'Hazardous',
    ]);
    expect(usAqiBand(166).tone).toBe('very-poor');
  });
});
