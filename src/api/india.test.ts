import { describe, expect, it } from 'vitest';
import { clearIndiaCache, fetchIndiaNow, indiaAirUrl, indiaForecastUrl, NOW_CITIES, parseIndiaNow } from './india';
import { fetchFlow, flowUrl, parseFlow } from './tomtom';

const json = (b: unknown, status = 200): Response => new Response(JSON.stringify(b), { status });

describe('India right now', () => {
  it('asks for twelve cities in one forecast and one air-quality call', () => {
    expect(NOW_CITIES).toHaveLength(12);
    const u = new URL(indiaForecastUrl(NOW_CITIES));
    expect(u.hostname).toBe('api.open-meteo.com');
    expect(u.searchParams.get('latitude')?.split(',')).toHaveLength(12);
    expect(new URL(indiaAirUrl(NOW_CITIES)).searchParams.get('current')).toBe('us_aqi');
  });
  it('parses the array answer and skips cities without data', () => {
    const cities = NOW_CITIES.slice(0, 3);
    const forecast = [
      { current: { temperature_2m: 31, apparent_temperature: 36, weather_code: 2, is_day: 1 } },
      { current: {} },
      { current: { temperature_2m: 24, weather_code: 61, is_day: 0 } },
    ];
    const air = [{ current: { us_aqi: 160 } }];
    const rows = parseIndiaNow(cities, forecast, air);
    expect(rows.map((r) => [r.name, r.tempC, r.usAqi, r.isDay])).toEqual([
      ['New Delhi', 31, 160, true],
      ['Bengaluru', 24, null, false],
    ]);
    expect(parseIndiaNow(cities.slice(0, 1), { current: { temperature_2m: 5 } }, null)[0]?.tempC).toBe(5);
    expect(parseIndiaNow(cities, null, null)).toEqual([]);
  });
  it('fetches once per 15 minutes; air quality is best-effort', async () => {
    clearIndiaCache();
    let calls = 0;
    const f = async (u: string): Promise<Response> => {
      calls++;
      if (u.includes('air-quality')) return json({}, 500);
      return json(NOW_CITIES.map(() => ({ current: { temperature_2m: 30, weather_code: 0, is_day: 1 } })));
    };
    const a = await fetchIndiaNow(0, f);
    expect(a).toHaveLength(12);
    expect(a[0]?.usAqi).toBeNull();
    await fetchIndiaNow(60_000, f);
    expect(calls).toBe(2);
    await fetchIndiaNow(16 * 60_000, f);
    expect(calls).toBe(4);
  });
});

describe('TomTom live flow (optional, own key)', () => {
  it('builds the request and parses speeds', async () => {
    expect(flowUrl(12.97, 77.59, 'k y')).toBe(
      'https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=12.9700,77.5900&unit=KMPH&key=k%20y',
    );
    expect(parseFlow({ flowSegmentData: { currentSpeed: 18, freeFlowSpeed: 42, confidence: 0.9 } })).toEqual({
      currentKmh: 18,
      freeFlowKmh: 42,
      confidence: 0.9,
      roadClosure: false,
    });
    expect(parseFlow({})).toBeNull();
    expect(parseFlow({ flowSegmentData: { currentSpeed: 1 } })).toBeNull();
    expect(
      await fetchFlow(1, 1, 'k', async () => json({ flowSegmentData: { currentSpeed: 5, freeFlowSpeed: 10 } })),
    ).toMatchObject({
      currentKmh: 5,
    });
    expect(await fetchFlow(1, 1, 'k', async () => json({}, 400))).toBeNull();
    await expect(fetchFlow(1, 1, 'k', async () => json({}, 403))).rejects.toThrow(/refused/);
  });
});

describe('surprise me', () => {
  it('picks a storied place, never the one you are looking at', async () => {
    const { pickSurprise, SURPRISES } = await import('../data/places');
    expect(SURPRISES.length).toBeGreaterThanOrEqual(15);
    for (const s of SURPRISES) expect(s.fact).not.toMatch(/—/);
    const here = { lat: 25.3, lng: 91.58 };
    for (let i = 0; i < 20; i++) expect(pickSurprise(i / 20, here).name).not.toBe('Mawsynram');
    expect(pickSurprise(0).name).toBe(SURPRISES[0]?.name);
    expect(pickSurprise(0.9999).name).toBe(SURPRISES.at(-1)?.name);
  });
});
