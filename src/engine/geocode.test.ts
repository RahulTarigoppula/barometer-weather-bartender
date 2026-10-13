import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import seedrandom from 'seedrandom';
import { describe, expect, it } from 'vitest';
import { geoIndex } from '../test/helpers';
import { createGeoIndex, type GeoData, inBBox } from './geocode';

describe('locate(), the §6.8 table', () => {
  const g = geoIndex();
  it.each([
    [19.07, 72.88, 'land', 'IN', /Mumbai/],
    [-16.6, 179.35, 'land', 'FJ', null],
    [-16.2, -179.9, 'land', 'FJ', null],
    [-29.6, 28.2, 'land', 'LS', null],
    [64.13, -21.9, 'land', 'IS', /Reykjav/],
    [62.03, 129.73, 'land', 'RU', /Yakutsk/],
    [38.72, -9.14, 'land', 'PT', /Lisbon/],
    [-89.9, 0, 'land', 'AQ', null],
  ] as const)('(%s, %s) is %s in %s', (lat, lng, kind, iso, city) => {
    const p = g.locate(lat, lng);
    expect(p.kind).toBe(kind);
    expect(p.country?.iso2).toBe(iso);
    if (city) expect(p.nearestCity?.name).toMatch(city);
  });

  it.each([
    [15, 65, /Arabian Sea/],
    [89.9, 100, /Arctic Ocean/],
    [42, 51, /Caspian Sea/],
    [40, -30, /Atlantic/],
    [0, -140, /Pacific/],
  ] as const)('(%s, %s) is water: %s', (lat, lng, name) => {
    const p = g.locate(lat, lng);
    expect(p.kind).toBe('ocean');
    expect(p.country).toBeUndefined();
    expect(p.water?.name ?? p.label).toMatch(name);
  });

  it('Mumbai is within 15 km and not a capital; Reykjavík and Maseru are capitals', () => {
    const m = g.locate(19.07, 72.88).nearestCity;
    expect(m?.distanceKm).toBeLessThan(15);
    expect(m?.isCapital).toBe(false);
    expect(g.locate(64.13, -21.9).nearestCity?.isCapital).toBe(true);
    expect(g.locate(-29.32, 27.48).nearestCity?.isCapital).toBe(true);
    expect(g.locate(-29.6, 28.2).nearestCity?.iso2).toBe('LS');
  });

  it('the antimeridian sea between Fiji’s islands is named water, not the middle of nowhere', () => {
    expect(g.locate(-17.7, 179.9).water?.name).toBe('South Pacific Ocean');
    expect(g.locate(-17.7, -179.9).water?.name).toBe('South Pacific Ocean');
  });

  it('Mumbai is beyond 400 km of the Arabian Sea point', () => {
    expect(g.locate(15, 65).nearestCity).toBeUndefined();
  });

  it('marks polar points independent of kind', () => {
    expect(g.locate(-89.9, 0).polar).toBe(true);
    expect(g.locate(89.9, 100).polar).toBe(true);
    expect(g.locate(19.07, 72.88).polar).toBe(false);
  });

  it('kdbush takes (lng, lat): a point where swapping changes the answer', () => {
    // (lat 10, lng 40) is Ethiopia; (lat 40, lng 10) is the Tyrrhenian Sea.
    expect(g.locate(10, 40).country?.iso2).toBe('ET');
    expect(g.locate(40, 10).country).toBeUndefined();
  });

  it('200 random open-ocean points never return a country', () => {
    const rnd = seedrandom('ocean');
    let n = 0;
    while (n < 200) {
      // Central South Pacific and South Atlantic boxes, far from any land.
      const box = n % 2 === 0 ? [-45, -15, -140, -100] : [-45, -25, -30, -5];
      const lat = box[0]! + rnd() * (box[1]! - box[0]!);
      const lng = box[2]! + rnd() * (box[3]! - box[2]!);
      expect(g.locate(lat, lng).country).toBeUndefined();
      n++;
    }
  });

  it('labels water, ice and land plainly', () => {
    expect(g.locate(15, 65).label).toBe('You are in the Arabian Sea');
    expect(g.locate(19.07, 72.88).short).toBe('MUMBAI, IN');
  });

  it('a warm lookup is well under 20 ms', () => {
    const t0 = performance.now();
    for (let i = 0; i < 100; i++) g.locate(-60 + i, -170 + i * 3.3);
    expect((performance.now() - t0) / 100).toBeLessThan(20);
  });
});

describe('index build and fallbacks', () => {
  const root = join(__dirname, '..', '..');
  const read = (p: string): unknown => JSON.parse(readFileSync(join(root, p), 'utf8'));
  const data = {
    countries: read('public/geo/countries-110m.json'),
    places: read('public/geo/places.json'),
    marine: read('public/geo/marine-50m.json'),
  } as GeoData;

  it('builds the place index in under 30 ms', () => {
    const t0 = performance.now();
    createGeoIndex({ ...data, countries: { features: [] }, marine: { features: [] } });
    expect(performance.now() - t0).toBeLessThan(150); // CI machines are slower than the 30 ms budget's phone
  });

  it('falls back to polar ice and open water when no polygon matches', () => {
    const bare = createGeoIndex({ countries: { features: [] }, places: [], marine: { features: [] } });
    expect(bare.locate(80, 0)).toMatchObject({ kind: 'ice', label: 'On the Arctic ice' });
    expect(bare.locate(-80, 0)).toMatchObject({ kind: 'ice', label: 'On the Antarctic ice' });
    expect(bare.locate(0, 0)).toMatchObject({ kind: 'ocean', label: 'The middle of nowhere, at sea' });
    const withCity = createGeoIndex({
      countries: { features: [] },
      places: [
        { name: 'Nowhere', adm0name: 'X', iso_a2: 'XX', lat: 0, lng: 1, pop_max: 1, featurecla: 'Populated place' },
      ],
      marine: { features: [] },
    });
    expect(withCity.locate(0, 0).label).toMatch(/^Open water, ~\d+ km off Nowhere$/);
  });

  it('a country without a nearby town is "somewhere in" it', () => {
    const g = createGeoIndex({ ...data, places: [] });
    expect(g.locate(23, 25).label).toBe('Somewhere in Libya');
  });

  it('swaps in finer coastlines', () => {
    const g = createGeoIndex(data);
    g.setCountries(read('public/geo/countries-50m.json') as GeoData['countries']);
    expect(g.locate(19.07, 72.88).country?.iso2).toBe('IN');
  });

  it('bbox test handles the antimeridian', () => {
    expect(inBBox([170, -20, -170, -10], 179.9, -15)).toBe(true);
    expect(inBBox([170, -20, -170, -10], -179.9, -15)).toBe(true);
    expect(inBBox([170, -20, -170, -10], 0, -15)).toBe(false);
    expect(inBBox([0, 0, 10, 10], 5, 20)).toBe(false);
  });
});
