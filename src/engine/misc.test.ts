import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DRINKS, FIXTURES, judgeFixture } from '../test/helpers';
import { bucket, cellKey, isFresh, isUsableStale } from './cache';
import { served } from './index';
import { lineText, RECEIPT_WIDTH, receiptLines, wrap } from './receipt';
import { fmtCoords, fmtTemp, fmtTempShort, fmtWind, METRIC, signed } from './units';

describe('cache keys (C10)', () => {
  it.each([
    [19.07, 72.88, '19,73'],
    [19.08, 72.88, '19,73'],
    [64.13, -21.9, '64.25,-22'],
    [0.124, -140.13, '0,-140.25'],
    [-89.9, 0, '-90,0'],
    [-17.7, 179.9, '-17.75,-180'],
    [-17.7, -179.9, '-17.75,-180'],
    [10, 180.1, '10,-180'],
  ])('(%s, %s) → %s', (lat, lng, key) => expect(cellKey(lat, lng)).toBe(key));
  it('15-minute buckets', () => {
    const t = 1788635700 * 1000;
    expect(bucket(t)).toBe(1987373);
    expect(bucket(t + 899_000)).toBe(1987373);
    expect(bucket(t + 900_000)).toBe(1987374);
  });
  it('fresh for 15 minutes, usable stale for 24 hours', () => {
    expect(isFresh(0, 14 * 60_000)).toBe(true);
    expect(isFresh(0, 16 * 60_000)).toBe(false);
    expect(isUsableStale(0, 23 * 3600_000)).toBe(true);
    expect(isUsableStale(0, 25 * 3600_000)).toBe(false);
  });
});

describe('units', () => {
  it('formats with a real minus and tabular-friendly decimals', () => {
    expect(fmtTemp(31.5, 'C')).toBe('31.5°');
    expect(fmtTemp(31.5, 'F')).toBe('88.7°');
    expect(fmtTemp(-48.7, 'C')).toBe('−48.7°');
    expect(fmtTemp(-0.01, 'C')).toBe('0.0°');
    expect(fmtTempShort(-48.7)).toBe('−49°');
    expect(signed(-3, 0)).toBe('−3');
  });
  it('wind in three units', () => {
    expect(fmtWind(1.9, 'kmh')).toBe('2 km/h');
    expect(fmtWind(1.9, 'mph')).toBe('1 mph');
    expect(fmtWind(1.9, 'kn')).toBe('1 kn');
  });
  it('coordinates', () => expect(fmtCoords(19.07, -72.88)).toBe('19.07N 72.88W'));
});

describe('receipt', () => {
  it('every line is ≤ 32 characters across every fixture, menu and unit', () => {
    for (const n of FIXTURES) {
      for (const menu of ['bar', 'barista'] as const) {
        const v = judgeFixture(n, menu);
        for (const units of [METRIC, { temp: 'F', wind: 'mph' } as const]) {
          const s = served(v, DRINKS, menu, 0, false);
          for (const l of receiptLines(v, s.drink, units, s.stamp.text)) {
            expect(lineText(l).length, `${n}: ${lineText(l)}`).toBeLessThanOrEqual(RECEIPT_WIDTH);
          }
        }
      }
    }
  });
  it('Mumbai prints US AQI 55 and the CAMS credit', () => {
    const v = judgeFixture('mumbai');
    const s = served(v, DRINKS, 'bar', 0, false);
    const text = receiptLines(v, s.drink, METRIC, s.stamp.text).map(lineText);
    expect(text).toContain('MAUSAM KA MAHAUL');
    expect(text).toContain('MUMBAI, IN');
    expect(text.some((l) => /^AQI \(US\)\s+55$/.test(l))).toBe(true);
    expect(text.some((l) => /^APPARENT\s+31\.5°$/.test(l))).toBe(true);
    expect(text).toContain('06 SEP 2026 · 00:45 LOCAL');
    expect(text).toContain('WEATHER BY OPEN-METEO.COM');
    expect(text.join(' ')).toMatch(/CAMS/);
    expect(text.join(' ')).not.toMatch(/DWD/);
  });
  it('the ocean receipt adds SST, waves and DWD', () => {
    const v = judgeFixture('arabian-sea');
    const s = served(v, DRINKS, 'bar', 0, false);
    const text = receiptLines(v, s.drink, METRIC, s.stamp.text).map(lineText).join('\n');
    expect(text).toMatch(/SST\s+28\.9°/);
    expect(text).toMatch(/WAVES\s+2\.4 M/);
    expect(text).toMatch(/DWD/);
  });
  it('wraps hard on long words', () => {
    expect(wrap('A'.repeat(40), 32)).toEqual(['A'.repeat(32), 'A'.repeat(8)]);
  });
});

describe('served(), barista flip and second opinion without re-scoring', () => {
  const v = judgeFixture('mumbai');
  it('flips to the twin and back', () => {
    expect(served(v, DRINKS, 'barista', 0, false).drink.id).toBe('virgin-mojito');
    const b = judgeFixture('mumbai', 'barista');
    expect(served(b, DRINKS, 'bar', 0, false).drink.id).toBe('mojito');
  });
  it('walks the runners-up', () => {
    const s = served(v, DRINKS, 'bar', 1, false);
    expect(s.drink.id).toBe(v.runnersUp[0]);
    expect(s.second).toBe(true);
    expect(served(v, DRINKS, 'bar', v.runnersUp.length + 1, false).second).toBe(false);
  });
});

describe('engine purity', () => {
  it('src/engine imports nothing from React, state, features, api or the DOM', () => {
    const dir = join(__dirname);
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.ts') && !x.endsWith('.test.ts'))) {
      const src = readFileSync(join(dir, f), 'utf8');
      expect(src, f).not.toMatch(/from '(react|zustand|dexie)/);
      expect(src, f).not.toMatch(/from '\.\.\/(features|api|state|app|platform|audio)/);
      expect(src, f).not.toMatch(/\bfetch\(|Date\.now\(|document\.|window\./);
    }
  });
});
