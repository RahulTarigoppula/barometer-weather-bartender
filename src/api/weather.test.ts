import { afterEach, describe, expect, it } from 'vitest';
import { addToTab, clearTab, exportTab, importTab, isStale, parseTab, WrongTabError } from '../features/tab/repo';
import { BarDB, pruneWeatherCache } from '../state/db';
import { judgeFixture, loadFixture, rawFixture } from '../test/helpers';
import type { FetchLike } from './openMeteo';
import { clearWeatherMemory, getWeather } from './weather';

const m = rawFixture('mumbai');
let n = 0;
const fresh = (): BarDB => new BarDB(`test-${++n}`);

function counting(fail = false): { f: FetchLike; calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    f: async (url) => {
      calls.push(url);
      if (fail) throw new TypeError('offline');
      return new Response(JSON.stringify(url.includes('air-quality') ? m.airQuality : m.forecast), { status: 200 });
    },
  };
}

afterEach(() => clearWeatherMemory());

describe('the two-tier weather cache', () => {
  it('a second click in the same cell within 15 minutes makes no request', async () => {
    const database = fresh();
    const c = counting();
    const a = await getWeather(19.07, 72.88, { ocean: false, now: 1_000_000, fetchImpl: c.f, database });
    expect(a.cached).toBe(false);
    expect(c.calls).toHaveLength(2);
    const b = await getWeather(19.08, 72.9, { ocean: false, now: 1_000_000 + 14 * 60_000, fetchImpl: c.f, database });
    expect(b.cached).toBe(true);
    expect(c.calls).toHaveLength(2);
  });

  it('survives a reload through Dexie, and refetches after 15 minutes', async () => {
    const database = fresh();
    const c = counting();
    await getWeather(19.07, 72.88, { ocean: false, now: 0, fetchImpl: c.f, database });
    await new Promise((r) => setTimeout(r, 20)); // the Dexie write is fire-and-forget
    clearWeatherMemory();
    const again = await getWeather(19.07, 72.88, { ocean: false, now: 60_000, fetchImpl: c.f, database });
    expect(again.cached).toBe(true);
    const later = await getWeather(19.07, 72.88, { ocean: false, now: 16 * 60_000, fetchImpl: c.f, database });
    expect(later.cached).toBe(false);
    expect(c.calls).toHaveLength(4);
  });

  it('re-pours from memory (stale) when the network fails, up to 24 hours', async () => {
    const database = fresh();
    await getWeather(19.07, 72.88, { ocean: false, now: 0, fetchImpl: counting().f, database });
    const offline = counting(true);
    const stale = await getWeather(19.07, 72.88, { ocean: false, now: 3_600_000, fetchImpl: offline.f, database });
    expect(stale).toMatchObject({ stale: true, cached: true });
    await expect(
      getWeather(19.07, 72.88, { ocean: false, now: 25 * 3_600_000, fetchImpl: offline.f, database }),
    ).rejects.toThrow();
  });

  it('an ocean click needs the marine sub-field, so a land-cached cell is fetched again', async () => {
    const database = fresh();
    const c = counting();
    await getWeather(15, 65, { ocean: false, now: 0, fetchImpl: c.f, database });
    await getWeather(15, 65, { ocean: true, now: 1000, fetchImpl: c.f, database });
    expect(c.calls.some((u) => u.includes('marine-api'))).toBe(true);
  });

  it('prunes the weather cache to the newest rows and never touches the Tab', async () => {
    const database = fresh();
    await addToTab(judgeFixture('mumbai'), database);
    const snapshot = loadFixture('mumbai').snapshot;
    for (let i = 0; i < 5; i++) await database.weatherCache.put({ key: `k${i}`, fetchedAt: i, snapshot });
    expect(await pruneWeatherCache(3, database)).toBe(2);
    expect(await database.weatherCache.count()).toBe(3);
    expect(await pruneWeatherCache(3, database)).toBe(0);
    expect(await database.verdicts.count()).toBe(1);
  });
});

describe('The Tab repo', () => {
  it('exports newest first and round-trips with ids re-assigned and createdAt kept', async () => {
    const a = fresh();
    const v1 = { ...judgeFixture('mumbai'), createdAt: 1 };
    const v2 = { ...judgeFixture('yakutsk'), createdAt: 2 };
    await addToTab(v1, a);
    await addToTab(v2, a);
    const out = await exportTab(99, a);
    expect(out).toMatchObject({ app: 'barometer', schema: 1, exportedAt: 99 });
    expect(out.verdicts.map((v) => v.createdAt)).toEqual([2, 1]);
    const b = fresh();
    await addToTab(judgeFixture('reykjavik'), b);
    expect(await importTab(JSON.parse(JSON.stringify(out)), b)).toBe(2);
    const rows = await b.verdicts.toArray();
    expect(rows).toHaveLength(3);
    expect(new Set(rows.map((r) => r.id)).size).toBe(3);
    expect(rows.map((r) => r.createdAt)).toEqual(expect.arrayContaining([1, 2]));
    await clearTab(b);
    expect(await b.verdicts.count()).toBe(0);
  });

  it('rejects other apps and newer schemas, ignores junk rows and unknown fields', () => {
    expect(() => parseTab({ app: 'other', schema: 1, verdicts: [] })).toThrow(WrongTabError);
    expect(() => parseTab({ app: 'barometer', schema: 2, verdicts: [] })).toThrow(WrongTabError);
    expect(() => parseTab({ app: 'barometer', schema: 1 })).toThrow(WrongTabError);
    const ok = { ...judgeFixture('mumbai'), id: 7, extra: 'ignored' };
    const rows = parseTab({ app: 'barometer', schema: 1, verdicts: [ok, { lat: 999 }, 'junk'] });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBeUndefined();
  });

  it('a row older than 15 minutes is stale', () => {
    expect(isStale({ createdAt: 0 }, 16 * 60_000)).toBe(true);
    expect(isStale({ createdAt: 0 }, 14 * 60_000)).toBe(false);
  });
});
