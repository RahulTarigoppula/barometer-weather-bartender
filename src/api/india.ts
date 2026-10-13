import { INDIA_CITIES, type QuickPlace } from '../data/places';
import { AIR_HOST, type FetchLike, FORECAST_HOST } from './openMeteo';

export interface CityNow {
  name: string;
  lat: number;
  lng: number;
  tempC: number;
  apparentC: number | null;
  wmo: number;
  isDay: boolean;
  usAqi: number | null;
}

/** The first twelve cities: one forecast call and one air-quality call for all of them. */
export const NOW_CITIES: QuickPlace[] = INDIA_CITIES.slice(0, 12);

const list = (xs: number[]): string => xs.map((n) => String(n)).join(',');
export const indiaForecastUrl = (cities: QuickPlace[]): string =>
  `${FORECAST_HOST}/v1/forecast?latitude=${list(cities.map((c) => c.lat))}&longitude=${list(cities.map((c) => c.lng))}` +
  '&current=temperature_2m,apparent_temperature,weather_code,is_day&timezone=Asia%2FKolkata';
export const indiaAirUrl = (cities: QuickPlace[]): string =>
  `${AIR_HOST}/v1/air-quality?latitude=${list(cities.map((c) => c.lat))}&longitude=${list(cities.map((c) => c.lng))}` +
  '&current=us_aqi&timezone=Asia%2FKolkata';

type Rec = Record<string, unknown>;
const isRec = (x: unknown): x is Rec => typeof x === 'object' && x !== null && !Array.isArray(x);
const rec = (x: unknown): Rec => (isRec(x) ? x : {});
const num = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null);
/** Open-Meteo answers a multi-location request with an array (one location: a bare object). */
const rows = (x: unknown): Rec[] => (Array.isArray(x) ? x.map(rec) : x ? [rec(x)] : []);

export function parseIndiaNow(cities: QuickPlace[], forecast: unknown, air: unknown): CityNow[] {
  const f = rows(forecast);
  const a = rows(air);
  return cities.flatMap((c, i): CityNow[] => {
    const cur = rec(f[i]?.current);
    const t = num(cur.temperature_2m);
    if (t === null) return [];
    return [
      {
        name: c.name,
        lat: c.lat,
        lng: c.lng,
        tempC: t,
        apparentC: num(cur.apparent_temperature),
        wmo: num(cur.weather_code) ?? -1,
        isDay: cur.is_day === 1,
        usAqi: num(rec(a[i]?.current).us_aqi),
      },
    ];
  });
}

let cache: { at: number; data: CityNow[] } | null = null;

/** India right now. Cached for 15 minutes; air quality is best-effort. */
export async function fetchIndiaNow(now = Date.now(), f: FetchLike = (u, i) => fetch(u, i)): Promise<CityNow[]> {
  if (cache && now - cache.at < 15 * 60_000) return cache.data;
  const get = async (url: string): Promise<unknown> => {
    const res = await f(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };
  const [forecast, air] = await Promise.all([
    get(indiaForecastUrl(NOW_CITIES)),
    get(indiaAirUrl(NOW_CITIES)).catch(() => null),
  ]);
  const data = parseIndiaNow(NOW_CITIES, forecast, air);
  cache = { at: now, data };
  return data;
}

export const clearIndiaCache = (): void => {
  cache = null;
};
