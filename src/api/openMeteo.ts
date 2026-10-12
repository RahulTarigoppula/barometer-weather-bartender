import { cellKey } from '../engine/cache';
import type { WeatherSnapshot } from '../engine/types';

export const FORECAST_HOST = 'https://api.open-meteo.com';
export const AIR_HOST = 'https://air-quality-api.open-meteo.com';
export const MARINE_HOST = 'https://marine-api.open-meteo.com';
export const GEOCODE_HOST = 'https://geocoding-api.open-meteo.com';

const CURRENT = [
  'temperature_2m',
  'relative_humidity_2m',
  'apparent_temperature',
  'dew_point_2m',
  'precipitation',
  'rain',
  'showers',
  'snowfall',
  'weather_code',
  'cloud_cover',
  'pressure_msl',
  'wind_speed_10m',
  'wind_gusts_10m',
  'wind_direction_10m',
  'is_day',
];
const HOURLY = ['uv_index', 'temperature_2m', 'precipitation_probability'];
const DAILY = ['sunrise', 'sunset', 'uv_index_max', 'temperature_2m_max', 'temperature_2m_min'];

const c4 = (n: number): string => String(Math.round(n * 100) / 100);

/** Requests with more than ~10 variables count as fractional extra calls; keep the forecast at ≈ 2. */
export function forecastUrl(lat: number, lng: number): string {
  const vars = CURRENT.length + HOURLY.length + DAILY.length;
  if (vars > 23) throw new Error(`forecast request has ${vars} variables (limit 23)`);
  return (
    `${FORECAST_HOST}/v1/forecast?latitude=${c4(lat)}&longitude=${c4(lng)}` +
    `&current=${CURRENT.join(',')}&hourly=${HOURLY.join(',')}&daily=${DAILY.join(',')}` +
    '&timezone=auto&forecast_days=1'
  );
}
export const airUrl = (lat: number, lng: number): string =>
  `${AIR_HOST}/v1/air-quality?latitude=${c4(lat)}&longitude=${c4(lng)}` +
  '&current=european_aqi,us_aqi,pm2_5,pm10,ozone,uv_index,dust&timezone=auto';
export const marineUrl = (lat: number, lng: number): string =>
  `${MARINE_HOST}/v1/marine?latitude=${c4(lat)}&longitude=${c4(lng)}` +
  '&current=wave_height,sea_surface_temperature,wind_wave_height&timezone=auto';
export const searchUrl = (name: string): string =>
  `${GEOCODE_HOST}/v1/search?name=${encodeURIComponent(name)}&count=5&language=en&format=json`;

// ───────────── errors (each has a bar-voiced coaster) ─────────────
export class BarBusyError extends Error {
  readonly retryAfterMs = 60_000;
  constructor() {
    super("Bar's busy. Give it a minute.");
    this.name = 'BarBusyError';
  }
}
export class ModelsSilentError extends Error {
  constructor(cause?: unknown) {
    super('The models are not answering.');
    this.name = 'ModelsSilentError';
    this.cause = cause;
  }
}
export class NowhereError extends Error {
  constructor() {
    super('Nowhere on Earth has those coordinates. Impressive.');
    this.name = 'NowhereError';
  }
}

// ───────────── response guards ─────────────
type Rec = Record<string, unknown>;
const isRec = (x: unknown): x is Rec => typeof x === 'object' && x !== null && !Array.isArray(x);
const num = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null);
const numOr = (x: unknown, d: number): number => num(x) ?? d;
const str = (x: unknown): string => (typeof x === 'string' ? x : '');
const arr = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);
const rec = (x: unknown): Rec => (isRec(x) ? x : {});

/** Open-Meteo forecast (+ optional air quality / marine) → the normalised snapshot. `null` stays null, never 0. */
export function normalise(
  forecast: unknown,
  air: unknown,
  marine: unknown,
  lat: number,
  lng: number,
  fetchedAt: number,
): WeatherSnapshot {
  if (!isRec(forecast) || !isRec(forecast.current)) throw new ModelsSilentError('malformed forecast');
  const c = forecast.current;
  const temp = num(c.temperature_2m);
  if (temp === null) throw new ModelsSilentError('forecast without temperature');
  const time = str(c.time);
  const hourly = rec(forecast.hourly);
  const hTimes = arr(hourly.time).map(str);
  const hourIdx = hTimes.findIndex((t) => t.slice(0, 13) === time.slice(0, 13));
  const at = (k: string): number | null => (hourIdx < 0 ? null : num(arr(hourly[k])[hourIdx]));
  const daily = rec(forecast.daily);
  const first = (k: string): unknown => arr(daily[k])[0];

  const snap: WeatherSnapshot = {
    fetchedAt,
    cellKey: cellKey(lat, lng),
    timezone: str(forecast.timezone) || 'UTC',
    utcOffsetSeconds: numOr(forecast.utc_offset_seconds, 0),
    current: {
      time,
      tempC: temp,
      apparentC: num(c.apparent_temperature),
      rh: numOr(c.relative_humidity_2m, 50),
      dewPointC: num(c.dew_point_2m),
      precipMm: numOr(c.precipitation, 0),
      rainMm: numOr(c.rain, 0),
      showersMm: numOr(c.showers, 0),
      snowCm: numOr(c.snowfall, 0),
      wmo: numOr(c.weather_code, -1),
      cloudCover: numOr(c.cloud_cover, 0),
      pressureHpa: numOr(c.pressure_msl, 1013),
      windKmh: numOr(c.wind_speed_10m, 0),
      gustKmh: numOr(c.wind_gusts_10m, numOr(c.wind_speed_10m, 0)),
      windDir: numOr(c.wind_direction_10m, 0),
      isDay: c.is_day === 1 || c.is_day === true,
    },
    hourNow: { uv: at('uv_index') ?? 0, precipProb: at('precipitation_probability') ?? 0 },
    daily: {
      sunrise: str(first('sunrise')),
      sunset: str(first('sunset')),
      uvMax: numOr(first('uv_index_max'), 0),
      tMaxC: numOr(first('temperature_2m_max'), temp),
      tMinC: numOr(first('temperature_2m_min'), temp),
    },
  };
  if (isRec(air) && isRec(air.current)) {
    const a = air.current;
    snap.air = {
      euAqi: num(a.european_aqi),
      usAqi: num(a.us_aqi),
      pm25: num(a.pm2_5),
      pm10: num(a.pm10),
      ozone: num(a.ozone),
      dust: num(a.dust),
      uv: num(a.uv_index),
    };
  }
  if (isRec(marine) && isRec(marine.current)) {
    const m = marine.current;
    const wave = num(m.wave_height);
    const sst = num(m.sea_surface_temperature);
    if (wave !== null || sst !== null) {
      snap.marine = { waveHeightM: wave, sstC: sst, windWaveM: num(m.wind_wave_height) };
    }
  }
  return snap;
}

// ───────────── transport ─────────────
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function getJson(url: string, signal: AbortSignal, f: FetchLike, retry5xx: boolean): Promise<unknown> {
  let res: Response;
  try {
    res = await f(url, { signal, headers: { Accept: 'application/json' } });
  } catch (e) {
    throw new ModelsSilentError(e);
  }
  if (res.status === 429) throw new BarBusyError(); // never retried
  if (res.status >= 500) {
    if (!retry5xx) throw new ModelsSilentError(`HTTP ${res.status}`);
    await sleep(1500);
    return getJson(url, signal, f, false); // exactly one retry
  }
  if (res.status >= 400) throw new NowhereError();
  try {
    return await res.json();
  } catch (e) {
    throw new ModelsSilentError(e);
  }
}

export interface FetchWeatherOptions {
  ocean: boolean;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  now?: () => number;
}

/** Forecast is mandatory; air quality and marine are best-effort and only remove tags when they fail. */
export async function fetchWeather(lat: number, lng: number, opts: FetchWeatherOptions): Promise<WeatherSnapshot> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw new NowhereError();
  }
  const f = opts.fetchImpl ?? ((u, i) => fetch(u, i));
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), opts.timeoutMs ?? 6000);
  try {
    const [forecast, air, marine] = await Promise.all([
      getJson(forecastUrl(lat, lng), ctl.signal, f, true),
      getJson(airUrl(lat, lng), ctl.signal, f, false).catch(() => undefined),
      opts.ocean ? getJson(marineUrl(lat, lng), ctl.signal, f, false).catch(() => undefined) : undefined,
    ]);
    return normalise(forecast, air, marine, lat, lng, (opts.now ?? Date.now)());
  } finally {
    clearTimeout(timer);
  }
}

export interface SearchResult {
  name: string;
  country: string;
  admin1: string;
  lat: number;
  lng: number;
}

export async function searchPlaces(name: string, signal?: AbortSignal, f: FetchLike = fetch): Promise<SearchResult[]> {
  const res = await f(searchUrl(name), signal ? { signal } : {});
  if (res.status === 429) throw new BarBusyError();
  if (!res.ok) throw new ModelsSilentError(`HTTP ${res.status}`);
  const body: unknown = await res.json();
  return arr(rec(body).results).flatMap((r): SearchResult[] => {
    const o = rec(r);
    const lat = num(o.latitude);
    const lng = num(o.longitude);
    if (lat === null || lng === null || !str(o.name)) return [];
    return [{ name: str(o.name), country: str(o.country), admin1: str(o.admin1), lat, lng }];
  });
}
