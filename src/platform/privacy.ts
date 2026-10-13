/**
 * Privacy on this device. MkM has no server: nothing about you is ever sent to us. What the browser
 * keeps is the minimum, for the shortest useful time, and hashed wherever it does not need to be read.
 */

/** Weather readings are kept only as long as they are useful offline. */
export const WEATHER_KEEP_MS = 24 * 3600_000;
/** History: at most this many places, for at most this long. */
export const HISTORY_MAX = 100;
export const HISTORY_KEEP_MS = 30 * 24 * 3600_000;

/** About a kilometre: enough to show a place again, never your exact spot. */
export const roundForStorage = (n: number): number => Math.round(n * 100) / 100;

/**
 * A one-way SHA-256 key (first 12 bytes, hex), so the browser's storage does not reveal which
 * places were looked up. Falls back to FNV-1a where Web Crypto is missing (very old browsers).
 */
export async function hashKey(text: string): Promise<string> {
  const input = `mkm:${text}`;
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const buf = await subtle.digest('SHA-256', new TextEncoder().encode(input));
    return [...new Uint8Array(buf)]
      .slice(0, 12)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `f${h.toString(16).padStart(8, '0')}`;
}

/** Forget everything on this device: history, weather, settings and the app's offline caches. */
export async function forgetEverything(dbName = 'barometer'): Promise<void> {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    // storage may be blocked; nothing to clear then
  }
  await new Promise<void>((resolve) => {
    try {
      const req = indexedDB.deleteDatabase(dbName);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });
  try {
    if ('caches' in globalThis) for (const k of await caches.keys()) await caches.delete(k);
  } catch {
    // ignore
  }
}
