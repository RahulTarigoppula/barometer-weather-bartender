import Dexie, { type Table } from 'dexie';
import type { Verdict, WeatherCacheEntry } from '../engine/types';
import { HISTORY_KEEP_MS, HISTORY_MAX, WEATHER_KEEP_MS } from '../platform/privacy';

export class BarDB extends Dexie {
  verdicts!: Table<Verdict, number>;
  weatherCache!: Table<WeatherCacheEntry, string>;
  constructor(name = 'barometer') {
    super(name);
    this.version(1).stores({
      verdicts: '++id, createdAt, cell, drinkId, [lat+lng]',
      weatherCache: 'key, fetchedAt',
    });
  }
}

export const db = new BarDB();

/** On boot: drop weather older than a day, then keep only the newest `keep` rows. */
export async function pruneWeatherCache(keep = 100, database: BarDB = db, now = Date.now()): Promise<number> {
  const expired = await database.weatherCache
    .where('fetchedAt')
    .below(now - WEATHER_KEEP_MS)
    .primaryKeys();
  await database.weatherCache.bulkDelete(expired);
  const count = await database.weatherCache.count();
  if (count <= keep) return expired.length;
  const old = await database.weatherCache
    .orderBy('fetchedAt')
    .limit(count - keep)
    .primaryKeys();
  await database.weatherCache.bulkDelete(old);
  return old.length + expired.length;
}

/** On boot: history keeps at most HISTORY_MAX places, none older than HISTORY_KEEP_MS. */
export async function pruneHistory(database: BarDB = db, now = Date.now()): Promise<number> {
  const old = await database.verdicts
    .where('createdAt')
    .below(now - HISTORY_KEEP_MS)
    .primaryKeys();
  await database.verdicts.bulkDelete(old);
  const count = await database.verdicts.count();
  if (count <= HISTORY_MAX) return old.length;
  const extra = await database.verdicts
    .orderBy('createdAt')
    .limit(count - HISTORY_MAX)
    .primaryKeys();
  await database.verdicts.bulkDelete(extra);
  return old.length + extra.length;
}
