const q = (n: number): number => Math.round(n * 4) / 4; // 0.25° quantisation

/** C10: default JS number formatting — "19,73", "64.25,-22", "-17.75,-180". */
export function cellKey(lat: number, lng: number): string {
  let x = q(((((lng + 180) % 360) + 360) % 360) - 180);
  if (x === 180) x = -180; // antimeridian normalisation
  const y = q(lat);
  return `${y === 0 ? 0 : y},${x === 0 ? 0 : x}`;
}

/** 15-minute buckets. */
export const bucket = (epochMs: number): number => Math.floor(epochMs / 900_000);

export const FRESH_MS = 15 * 60 * 1000;
export const STALE_MS = 24 * 60 * 60 * 1000;

export const isFresh = (fetchedAt: number, now: number): boolean => now - fetchedAt < FRESH_MS;
export const isUsableStale = (fetchedAt: number, now: number): boolean => now - fetchedAt < STALE_MS;
