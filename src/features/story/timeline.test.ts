import { describe, expect, it } from 'vitest';
import { ease, ramp, SCENES, sceneAt, TOTAL } from './timeline';

describe('the opening story', () => {
  it('runs galaxy → solar → planets → earth → title → meaning → app in about half a minute', () => {
    expect(SCENES.map((s) => s.id)).toEqual(['galaxy', 'solar', 'planets', 'earth', 'title', 'meaning', 'app']);
    expect(TOTAL).toBeGreaterThanOrEqual(28);
    expect(TOTAL).toBeLessThanOrEqual(40);
    for (const s of SCENES) expect(s.end - s.start).toBeGreaterThanOrEqual(3);
    expect(SCENES.find((s) => s.id === 'title')?.line).toBe('Mausam ka Mahaul');
  });
  it('finds the scene and progress at any time, clamped', () => {
    expect(sceneAt(0).scene.id).toBe('galaxy');
    expect(sceneAt(-5).p).toBe(0);
    const mid = sceneAt(SCENES[1]!.start + 2.5);
    expect(mid.scene.id).toBe('solar');
    expect(mid.p).toBeCloseTo(0.5);
    expect(sceneAt(TOTAL + 10).scene.id).toBe('app');
  });
  it('eases and ramps within 0..1', () => {
    expect(ease(-1)).toBe(0);
    expect(ease(0.5)).toBe(0.5);
    expect(ease(2)).toBe(1);
    expect(ease(0.25)).toBeLessThan(0.25);
    expect(ramp(5, 4, 6)).toBe(0.5);
    expect(ramp(1, 4, 6)).toBe(0);
  });
});
