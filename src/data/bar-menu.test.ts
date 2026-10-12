import { describe, expect, it } from 'vitest';
import { parseMenu, twinOf } from '../engine/menu';
import { BOTTLE_IDS, GLASSES, TAGS } from '../engine/types';
import { DRINKS } from '../test/helpers';
import raw from './bar-menu.json';

describe('bar-menu.json', () => {
  it('has 20 cocktails and 20 mocktails with unique ids', () => {
    expect(DRINKS.filter((d) => d.alcoholic)).toHaveLength(20);
    expect(DRINKS.filter((d) => !d.alcoholic)).toHaveLength(20);
    expect(new Set(DRINKS.map((d) => d.id)).size).toBe(40);
  });
  it('every cocktail names a unique, existing non-alcoholic twin', () => {
    const claimed = new Set<string>();
    for (const d of DRINKS.filter((x) => x.alcoholic)) {
      const twin = DRINKS.find((x) => x.id === d.virginTwin);
      expect(twin, d.id).toBeDefined();
      expect(twin?.alcoholic).toBe(false);
      expect(claimed.has(d.virginTwin ?? '')).toBe(false);
      claimed.add(d.virginTwin ?? '');
      expect(twin && twinOf(DRINKS, twin, 'bar')?.id).toBe(d.id);
    }
  });
  it('every one of the 34 tags has ≥ 3 drinks at affinity ≥ 3', () => {
    for (const t of TAGS) {
      const n = DRINKS.filter((d) => (d.affinity[t] ?? 0) >= 3).length;
      expect(n, t).toBeGreaterThanOrEqual(3);
    }
  });
  it('uses all nine glasses and nods to all twelve bottles', () => {
    expect(new Set(DRINKS.map((d) => d.glass))).toEqual(new Set(GLASSES));
    expect(new Set(DRINKS.map((d) => d.bottle))).toEqual(new Set(BOTTLE_IDS));
  });
  it('every recipe has ingredients and ≤ 3 method lines', () => {
    for (const d of DRINKS) {
      expect(d.recipe.ingredients.length, d.id).toBeGreaterThan(1);
      expect(d.recipe.method.length, d.id).toBeLessThanOrEqual(3);
      for (const i of d.recipe.ingredients) expect(i.ingredient.length).toBeLessThanOrEqual(60);
    }
  });
  it('rejects malformed rows loudly', () => {
    expect(() => parseMenu({})).toThrow();
    expect(() => parseMenu([{ id: 'x' }])).toThrow();
    const row = structuredClone(raw[0]);
    expect(() => parseMenu([{ ...row, affinity: { sunny: 3 } }])).toThrow(/affinity/);
    expect(() => parseMenu([{ ...row, bottle: 'absinthe' }])).toThrow(/bottle/);
    expect(() => parseMenu([{ ...row, recipe: { ...row?.recipe, source: 'web' } }])).toThrow(/source/);
  });
});
