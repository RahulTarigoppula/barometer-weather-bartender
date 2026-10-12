import { FRESH_MS } from '../../engine/cache';
import type { Verdict } from '../../engine/types';
import { type BarDB, db } from '../../state/db';

export class WrongTabError extends Error {
  constructor(reason: string) {
    super(`That is not a Globe Bar tab: ${reason}`);
    this.name = 'WrongTabError';
  }
}

export interface TabExport {
  app: 'barometer';
  schema: 1;
  exportedAt: number;
  verdicts: Verdict[];
}

export async function addToTab(v: Verdict, database: BarDB = db): Promise<number> {
  const { id: _drop, ...row } = v;
  return database.verdicts.add(row);
}

export const isStale = (v: Pick<Verdict, 'createdAt'>, now: number): boolean => now - v.createdAt > FRESH_MS;

export async function exportTab(now: number, database: BarDB = db): Promise<TabExport> {
  const verdicts = await database.verdicts.orderBy('createdAt').reverse().toArray();
  return { app: 'barometer', schema: 1, exportedAt: now, verdicts };
}

const isRec = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const finiteIn = (x: unknown, lim: number): boolean =>
  typeof x === 'number' && Number.isFinite(x) && Math.abs(x) <= lim;

function isVerdictRow(r: unknown): r is Verdict {
  return (
    isRec(r) &&
    finiteIn(r.lat, 90) &&
    finiteIn(r.lng, 180) &&
    typeof r.drinkId === 'string' &&
    typeof r.createdAt === 'number' &&
    isRec(r.place) &&
    isRec(r.features) &&
    Array.isArray(r.tags) &&
    isRec(r.stamp) &&
    isRec(r.lines)
  );
}

/** Validates a backup. Unknown fields are ignored, never rejected; ids are re-assigned, createdAt kept. */
export function parseTab(raw: unknown): Verdict[] {
  if (!isRec(raw) || raw.app !== 'barometer') throw new WrongTabError('wrong app');
  if (typeof raw.schema !== 'number' || raw.schema > 1) throw new WrongTabError('newer schema');
  if (!Array.isArray(raw.verdicts)) throw new WrongTabError('no verdicts');
  return raw.verdicts.filter(isVerdictRow).map((v) => {
    const { id: _drop, ...row } = v;
    return row;
  });
}

export async function importTab(raw: unknown, database: BarDB = db): Promise<number> {
  const rows = parseTab(raw);
  await database.verdicts.bulkAdd(rows);
  return rows.length;
}

export const clearTab = (database: BarDB = db): Promise<void> => database.verdicts.clear();
