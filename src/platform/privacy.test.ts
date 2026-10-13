import { describe, expect, it } from 'vitest';
import { HISTORY_KEEP_MS, HISTORY_MAX, hashKey, roundForStorage, WEATHER_KEEP_MS } from './privacy';

describe('privacy on this device', () => {
  it('hashes cache keys one way, stably, and differently per place', async () => {
    const a = await hashKey('19,73');
    expect(a).toMatch(/^[0-9a-f]{24}$/);
    expect(await hashKey('19,73')).toBe(a);
    expect(await hashKey('28.5,77.25')).not.toBe(a);
    expect(a).not.toContain('19');
  });
  it('rounds stored places to about a kilometre and keeps little, briefly', () => {
    expect(roundForStorage(19.07612)).toBe(19.08);
    expect(roundForStorage(-72.8843)).toBe(-72.88);
    expect(WEATHER_KEEP_MS).toBe(86_400_000);
    expect(HISTORY_MAX).toBe(100);
    expect(HISTORY_KEEP_MS).toBe(30 * 86_400_000);
  });
});
