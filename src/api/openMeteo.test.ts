import { describe, expect, it, vi } from 'vitest';
import { rawFixture } from '../test/helpers';
import {
  airUrl,
  BarBusyError,
  type FetchLike,
  fetchWeather,
  forecastUrl,
  ModelsSilentError,
  marineUrl,
  NowhereError,
  normalise,
  searchPlaces,
  searchUrl,
} from './openMeteo';

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function routed(map: (url: string) => Response | Promise<Response>): { f: FetchLike; calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    f: async (url) => {
      calls.push(url);
      return map(url);
    },
  };
}

describe('URL builders', () => {
  it('match the documented requests', () => {
    expect(forecastUrl(19.07, 72.88)).toBe(
      'https://api.open-meteo.com/v1/forecast?latitude=19.07&longitude=72.88' +
        '&current=temperature_2m,relative_humidity_2m,apparent_temperature,dew_point_2m,precipitation,rain,showers,' +
        'snowfall,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_gusts_10m,wind_direction_10m,is_day' +
        '&hourly=uv_index,temperature_2m,precipitation_probability' +
        '&daily=sunrise,sunset,uv_index_max,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1',
    );
    expect(airUrl(15, 65)).toBe(
      'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=15&longitude=65&current=european_aqi,us_aqi,pm2_5,pm10,ozone,uv_index,dust&timezone=auto',
    );
    expect(marineUrl(15, 65)).toBe(
      'https://marine-api.open-meteo.com/v1/marine?latitude=15&longitude=65&current=wave_height,sea_surface_temperature,wind_wave_height&timezone=auto',
    );
    expect(searchUrl('São Paulo')).toBe(
      'https://geocoding-api.open-meteo.com/v1/search?name=S%C3%A3o%20Paulo&count=5&language=en&format=json',
    );
  });
  it('only ever targets open-meteo.com', () => {
    for (const u of [forecastUrl(0, 0), airUrl(0, 0), marineUrl(0, 0), searchUrl('x')]) {
      expect(new URL(u).hostname).toMatch(/(^|\.)open-meteo\.com$/);
      expect(u).not.toMatch(/bigdatacloud|api-bdc\.io|thecocktaildb|timeapi\.io/);
    }
  });
});

describe('normalise', () => {
  const m = rawFixture('mumbai');
  const s = normalise(m.forecast, m.airQuality, undefined, 19.07, 72.88, 1);
  it('keeps local time, coerces is_day and picks the matching hourly row', () => {
    expect(s.current.time).toBe('2026-09-06T00:45');
    expect(s.current.isDay).toBe(false);
    expect(s.current.apparentC).toBe(31.5);
    expect(s.hourNow.precipProb).toBe(70);
    expect(s.cellKey).toBe('19,73');
    expect(s.air?.usAqi).toBe(55);
    expect(s.marine).toBeUndefined();
  });
  it('keeps nulls as null, never 0', () => {
    const p = rawFixture('south-pole');
    const n = normalise(p.forecast, p.airQuality, undefined, -89.9, 0, 1);
    expect(n.air?.euAqi).toBeNull();
    expect(n.daily.sunrise).toBe('');
  });
  it('reads marine data', () => {
    const a = rawFixture('arabian-sea');
    expect(normalise(a.forecast, a.airQuality, a.marine, 15, 65, 1).marine).toEqual({
      waveHeightM: 2.4,
      sstC: 28.9,
      windWaveM: 0.9,
    });
  });
  it('treats marine nulls as no marine data, and rejects a forecast without temperature', () => {
    const a = rawFixture('arabian-sea');
    expect(normalise(a.forecast, undefined, { current: { wave_height: null } }, 15, 65, 1).marine).toBeUndefined();
    expect(() => normalise({ current: {} }, undefined, undefined, 0, 0, 1)).toThrow(ModelsSilentError);
    expect(() => normalise('nope', undefined, undefined, 0, 0, 1)).toThrow(ModelsSilentError);
  });
});

describe('fetchWeather', () => {
  const m = rawFixture('mumbai');
  const a = rawFixture('arabian-sea');
  it('makes 2 requests for land and 3 for ocean', async () => {
    const land = routed((u) => json(u.includes('air-quality') ? m.airQuality : m.forecast));
    await fetchWeather(19.07, 72.88, { ocean: false, fetchImpl: land.f });
    expect(land.calls).toHaveLength(2);
    const sea = routed((u) => json(u.includes('marine') ? a.marine : u.includes('air') ? a.airQuality : a.forecast));
    const s = await fetchWeather(15, 65, { ocean: true, fetchImpl: sea.f });
    expect(sea.calls).toHaveLength(3);
    expect(s.marine?.sstC).toBe(28.9);
  });
  it('a failed AQI does not fail the verdict', async () => {
    const r = routed((u) => (u.includes('air') ? json({}, 500) : json(m.forecast)));
    const s = await fetchWeather(19.07, 72.88, { ocean: false, fetchImpl: r.f });
    expect(s.air).toBeUndefined();
  });
  it('429 → BarBusyError with retryAfterMs, never retried', async () => {
    const r = routed(() => json({ error: true }, 429));
    const err = await fetchWeather(19.07, 72.88, { ocean: false, fetchImpl: r.f }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(BarBusyError);
    expect(err instanceof BarBusyError && err.retryAfterMs).toBe(60_000);
    expect(r.calls.filter((u) => u.includes('/forecast'))).toHaveLength(1);
  });
  it('5xx retries exactly once after 1.5 s, then gives up', async () => {
    vi.useFakeTimers();
    try {
      const r = routed(() => json({}, 503));
      const p = fetchWeather(19.07, 72.88, { ocean: false, fetchImpl: r.f, timeoutMs: 60_000 }).catch(
        (e: unknown) => e,
      );
      await vi.advanceTimersByTimeAsync(1600);
      expect(await p).toBeInstanceOf(ModelsSilentError);
      expect(r.calls.filter((u) => u.includes('/forecast'))).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });
  it('network failure → ModelsSilentError; bad coordinates → NowhereError', async () => {
    const r = routed(() => Promise.reject(new TypeError('failed')));
    await expect(fetchWeather(1, 1, { ocean: false, fetchImpl: r.f })).rejects.toBeInstanceOf(ModelsSilentError);
    await expect(fetchWeather(999, 999, { ocean: false })).rejects.toBeInstanceOf(NowhereError);
    const bad = routed(() => json({ error: true }, 400));
    await expect(fetchWeather(1, 1, { ocean: false, fetchImpl: bad.f })).rejects.toBeInstanceOf(NowhereError);
    const junk = routed(() => new Response('not json', { status: 200 }));
    await expect(fetchWeather(1, 1, { ocean: false, fetchImpl: junk.f })).rejects.toBeInstanceOf(ModelsSilentError);
  });
});

describe('searchPlaces', () => {
  it('maps results and skips junk rows', async () => {
    const r = routed(() =>
      json({
        results: [
          { name: 'Mumbai', country: 'India', admin1: 'Maharashtra', latitude: 19.07, longitude: 72.88 },
          { name: 'Broken' },
        ],
      }),
    );
    expect(await searchPlaces('Mum', undefined, r.f)).toEqual([
      { name: 'Mumbai', country: 'India', admin1: 'Maharashtra', lat: 19.07, lng: 72.88, india: true },
    ]);
    expect(r.calls.some((u) => u.endsWith('&countryCode=IN'))).toBe(true);
  });
  it('puts Indian matches first, then the world, de-duplicated', async () => {
    const r = routed((u) =>
      json({
        results: u.includes('countryCode=IN')
          ? [{ name: 'Hyderabad', country: 'India', country_code: 'IN', latitude: 17.38, longitude: 78.49 }]
          : [
              { name: 'Hyderabad', country: 'Pakistan', country_code: 'PK', latitude: 25.39, longitude: 68.37 },
              { name: 'Hyderabad', country: 'India', country_code: 'IN', latitude: 17.38, longitude: 78.49 },
            ],
      }),
    );
    const rows = await searchPlaces('Hyderabad', undefined, r.f);
    expect(rows.map((x) => [x.country, x.india])).toEqual([
      ['India', true],
      ['Pakistan', false],
    ]);
    const half = routed((u) => (u.includes('countryCode') ? json({}, 500) : json({ results: [] })));
    expect(await searchPlaces('x', undefined, half.f)).toEqual([]);
    expect(await searchPlaces('zzz', undefined, routed(() => json({})).f)).toEqual([]);
    await expect(searchPlaces('x', undefined, routed(() => json({}, 429)).f)).rejects.toBeInstanceOf(BarBusyError);
    await expect(searchPlaces('x', undefined, routed(() => json({}, 500)).f)).rejects.toBeInstanceOf(ModelsSilentError);
  });
});
