import { describe, expect, it } from 'vitest';
import { judgeFixture } from '../test/helpers';
import { subsolar } from './terminator';
import { windowWeather } from './window';

describe('window weather', () => {
  it('Mumbai sweats and drizzles at night', () => {
    const w = windowWeather(judgeFixture('mumbai'));
    expect([...w.on].sort()).toEqual(['drops', 'rain2']);
    expect(w.lightning).toBe(false);
  });
  it('Yakutsk frosts over and snows', () => {
    const w = windowWeather(judgeFixture('yakutsk'));
    expect(w.on.has('frost')).toBe(true);
    expect(w.on.has('snow')).toBe(true);
  });
  it('Denver flashes once and rains', () => {
    const w = windowWeather(judgeFixture('denver-hail'));
    expect(w.lightning).toBe(true);
    expect(w.on.has('rain')).toBe(true);
  });
  it('Dubai glares through the dust', () => {
    const w = windowWeather(judgeFixture('dubai-noon'));
    expect(w.on.has('glare')).toBe(true);
    expect(w.on.has('fog')).toBe(true);
  });
  it('Oslo brunch is a clean pane', () => {
    expect(windowWeather(judgeFixture('oslo-brunch')).on.size).toBe(0);
  });
});

describe('subsolar point', () => {
  it('sits near the equator and the Greenwich meridian at the March equinox noon', () => {
    const [lng, lat] = subsolar(new Date('2026-03-20T12:00:00Z'));
    expect(Math.abs(lat)).toBeLessThan(0.5);
    expect(Math.abs(lng)).toBeLessThan(3);
  });
  it('reaches the Tropic of Cancer in June and moves west through the day', () => {
    const [lng1, lat] = subsolar(new Date('2026-06-21T06:00:00Z'));
    expect(lat).toBeGreaterThan(23.3);
    expect(lng1).toBeGreaterThan(85);
    expect(lng1).toBeLessThan(95);
  });
});
