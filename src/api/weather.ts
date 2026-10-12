import { cellKey, isFresh, isUsableStale } from '../engine/cache';
import type { WeatherSnapshot } from '../engine/types';
import { type BarDB, db } from '../state/db';
import { type FetchLike, fetchWeather, ModelsSilentError } from './openMeteo';

/** Two tiers (C9): an in-memory Map in front of Dexie's weatherCache. */
const memory = new Map<string, WeatherSnapshot>();

export interface WeatherResult {
  snapshot: WeatherSnapshot;
  /** Served from a cache entry older than 15 minutes because the network failed. */
  stale: boolean;
  /** Made zero requests. */
  cached: boolean;
}

export interface GetWeatherOptions {
  ocean: boolean;
  now?: number;
  fetchImpl?: FetchLike;
  database?: BarDB;
}

async function readCache(key: string, database: BarDB): Promise<WeatherSnapshot | undefined> {
  const hit = memory.get(key);
  if (hit) return hit;
  try {
    const row = await database.weatherCache.get(key);
    if (row) memory.set(key, row.snapshot);
    return row?.snapshot;
  } catch {
    return undefined;
  }
}

/** A repeat click in the same 0.25° cell within 15 minutes makes no request at all. */
export async function getWeather(lat: number, lng: number, opts: GetWeatherOptions): Promise<WeatherResult> {
  const now = opts.now ?? Date.now();
  const database = opts.database ?? db;
  const key = cellKey(lat, lng);
  const cached = await readCache(key, database);
  // An ocean click needs the marine sub-field; a land-cached row without it is not enough.
  const usable = cached && (!opts.ocean || cached.marine !== undefined);
  if (cached && usable && isFresh(cached.fetchedAt, now)) return { snapshot: cached, stale: false, cached: true };
  try {
    const snapshot = await fetchWeather(lat, lng, {
      ocean: opts.ocean,
      now: () => now,
      ...(opts.fetchImpl ? { fetchImpl: opts.fetchImpl } : {}),
    });
    memory.set(key, snapshot);
    void database.weatherCache.put({ key, fetchedAt: snapshot.fetchedAt, snapshot }).catch(() => undefined);
    return { snapshot, stale: false, cached: false };
  } catch (e) {
    if (e instanceof ModelsSilentError && cached && isUsableStale(cached.fetchedAt, now)) {
      return { snapshot: cached, stale: true, cached: true };
    }
    throw e;
  }
}

export const clearWeatherMemory = (): void => memory.clear();
