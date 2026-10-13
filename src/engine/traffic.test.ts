import { describe, expect, it } from 'vitest';
import { judgeFixture } from '../test/helpers';
import { demand, distanceKm, levelOf, liveIndex, nearestMetro, roadOutlook, weatherDrag } from './traffic';

const tags = (name: Parameters<typeof judgeFixture>[0]) => judgeFixture(name).tags;

describe('road outlook (estimate)', () => {
  it('finds the metro you are in, and none in the countryside', () => {
    expect(nearestMetro(12.95, 77.6)?.name).toBe('Bengaluru');
    expect(nearestMetro(19.07, 72.88)?.name).toBe('Mumbai');
    expect(nearestMetro(23.5, 80)).toBeNull();
    expect(Math.round(distanceKm(19.07, 72.88, 28.61, 77.21))).toBe(1148);
  });

  it('weekday rush hours peak, nights are quiet, weekends are softer', () => {
    expect(demand(9.5, 2)).toBeGreaterThan(0.9);
    expect(demand(19, 3)).toBeGreaterThan(0.9);
    expect(demand(3, 3)).toBeLessThan(0.15);
    expect(demand(9.5, 0)).toBeLessThan(demand(9.5, 2));
  });

  it('rain and fog slow the roads; dry weather does not', () => {
    expect(weatherDrag(tags('reykjavik')).factor).toBe(1.2);
    expect(weatherDrag(tags('denver-hail')).factor).toBe(1.35);
    expect(weatherDrag(tags('mumbai')).factor).toBe(1.08);
    expect(weatherDrag(tags('lisbon-golden'))).toEqual({ factor: 1, reason: null });
    expect(weatherDrag([{ tag: 'fog', family: 'precip', intensity: 0, weight: 1 }]).factor).toBe(1.18);
    expect(weatherDrag([{ tag: 'snow', family: 'precip', intensity: 0, weight: 1 }]).factor).toBe(1.3);
  });

  it('Bengaluru at 9:30 on a rainy Tuesday is heavy; at 3 am it is light', () => {
    const rush = roadOutlook({
      lat: 12.97,
      lng: 77.59,
      hour: 9,
      minute: 30,
      weekday: 2,
      tags: tags('reykjavik'),
      india: true,
    });
    expect(rush.metro?.name).toBe('Bengaluru');
    expect(['heavy', 'severe']).toContain(rush.level);
    expect(rush.tripMin).toBeGreaterThan(rush.freeMin);
    expect(rush.reason).toMatch(/Rain/);
    expect(rush.next).toHaveLength(12);
    expect(rush.advice).toMatch(/^Eases by 1[1-3]:00/);
    const evening = roadOutlook({ lat: 19.07, lng: 72.88, hour: 20, minute: 0, weekday: 2, tags: [], india: true });
    expect(evening.advice).toMatch(/^Eases by 2[12]:00/);
    const night = roadOutlook({ lat: 12.97, lng: 77.59, hour: 3, minute: 0, weekday: 2, tags: [], india: true });
    expect(night.level).toBe('light');
    expect(night.advice).toBe('Roads should be easy right now.');
    expect(night.freeMin).toBe(19);
  });

  it('outside India and outside metros it softens; the next-hours wrap past midnight', () => {
    const abroad = roadOutlook({ lat: 51.5, lng: -0.1, hour: 23, minute: 0, weekday: 6, tags: [], india: false });
    expect(abroad.metro).toBeNull();
    expect(abroad.next[0]?.hour).toBe(0);
  });

  it('live TomTom speeds map onto the same index', () => {
    expect(liveIndex(40, 40)).toBe(0);
    expect(liveIndex(20, 40)).toBe(63);
    expect(liveIndex(0, 40)).toBe(100);
    expect(liveIndex(10, 0)).toBe(0);
    expect(levelOf(20)).toBe('light');
    expect(levelOf(60)).toBe('heavy');
    expect(levelOf(90)).toBe('severe');
  });
});
