import { describe, expect, it } from 'vitest';
import { ease, ramp, SCENES, sceneAt, TOTAL } from './timeline';

describe('the opening story', () => {
  it('descends from the known universe to the Ghats in the monsoon, then names itself, in under forty seconds', () => {
    expect(SCENES.map((s) => s.id)).toEqual([
      'universe',
      'galaxy',
      'solar',
      'earth',
      'descent',
      'ghats',
      'monsoon',
      'title',
      'app',
    ]);
    expect(TOTAL).toBeGreaterThanOrEqual(30);
    expect(TOTAL).toBeLessThanOrEqual(42);
    for (const s of SCENES) expect(s.end - s.start).toBeGreaterThanOrEqual(3.5);
    expect(SCENES.find((s) => s.id === 'title')?.line).toBe('Mausam ka Mahaul');
  });
  it('is told in the author’s own voice, through every kind of story they love', () => {
    const all = SCENES.map((s) => `${s.line} ${s.sub}`).join(' ');
    expect(all).toMatch(/I’m Rahul/);
    for (const form of ['movies', 'series', 'manhwa', 'anime', 'books', 'audiobook'])
      expect(all.toLowerCase()).toContain(form);
    expect(SCENES[0]?.chapter).toMatch(/^Prologue/);
  });
  it('uses no em dashes anywhere in its copy', () => {
    for (const s of SCENES) expect(`${s.chapter} ${s.line} ${s.sub}`).not.toMatch(/—/);
  });
  it('finds the scene and progress at any time, clamped', () => {
    expect(sceneAt(0).scene.id).toBe('universe');
    expect(sceneAt(-5).p).toBe(0);
    const g = SCENES[1]!;
    const mid = sceneAt((g.start + g.end) / 2);
    expect(mid.scene.id).toBe('galaxy');
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
