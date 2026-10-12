import Dexie, { type Table } from 'dexie';
import type { Verdict, WeatherCacheEntry } from '../engine/types';

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

/** On boot: keep only the newest 200 weather rows. Never touches `verdicts` — the Tab is user data. */
export async function pruneWeatherCache(keep = 200, database: BarDB = db): Promise<number> {
  const count = await database.weatherCache.count();
  if (count <= keep) return 0;
  const old = await database.weatherCache
    .orderBy('fetchedAt')
    .limit(count - keep)
    .primaryKeys();
  await database.weatherCache.bulkDelete(old);
  return old.length;
}
