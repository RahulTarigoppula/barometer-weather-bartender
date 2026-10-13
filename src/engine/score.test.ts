import seedrandom from 'seedrandom';
import { describe, expect, it } from 'vitest';
import { DRINKS, FIXTURES, judgeFixture } from '../test/helpers';
import { stampFor } from './intensify';
import { menuFor } from './menu';
import { pick, type Ranked, scoreDrinks, seedFor } from './score';
import type { Drink, Tag, TagScore } from './types';

const BAR = menuFor(DRINKS, 'bar');
const byId = (id: string): Drink => {
  const d = DRINKS.find((x) => x.id === id);
  if (!d) throw new Error(id);
  return d;
};
const scoreOf = (r: Ranked[], id: string): number => r.find((x) => x.drink.id === id)?.score ?? Number.NaN;
const t = (tag: Tag, weight: number, intensity = 0): TagScore => ({ tag, family: 'temp', weight, intensity });

describe('worked example A, Mumbai, BAR', () => {
  const v = judgeFixture('mumbai');
  const r = scoreDrinks(v.tags, BAR);
  it.each([
    ['mojito', 12.79],
    ['caipirinha', 10.54],
    ['espresso-martini', 6.43],
    ['moscow-mule', 6.05],
    ['dark-n-stormy', 3.35],
    ['hot-toddy', -1.44],
  ])('%s scores %s', (id, s) => expect(scoreOf(r, id)).toBeCloseTo(s, 1));
  it('top three are Mojito, Caipirinha, Espresso Martini', () => {
    expect(r.slice(0, 3).map((x) => x.drink.id)).toEqual(['mojito', 'caipirinha', 'espresso-martini']);
  });
  it('the pinned seed rolls 0.320658…, so Mumbai deterministically prints the Mojito', () => {
    expect(seedrandom('19.1|72.9|0|bar')()).toBeCloseTo(0.320658, 6);
    expect(seedrandom('19.1|72.9|0|barista')()).toBeCloseTo(0.065045, 6);
    expect(seedrandom('19.1|72.9|0|voice')()).toBeCloseTo(0.993421, 6);
    expect(v.seed).toBe('19.1|72.9|0|bar');
    expect(v.drinkId).toBe('mojito');
    expect(judgeFixture('mumbai', 'barista').drinkId).toBe('virgin-mojito');
  });
});

describe('worked example B, Yakutsk, BAR', () => {
  const r = scoreDrinks(judgeFixture('yakutsk').tags, BAR);
  it.each([
    ['hot-buttered-rum', 19.95],
    ['mulled-wine', 13.69],
    ['hot-toddy', 9.8],
    ['mojito', -2.2],
  ])('%s scores %s', (id, s) => expect(scoreOf(r, id)).toBeCloseTo(s, 1));
  it('is dominant (margin ≥ 4) and never rolls', () => {
    expect((r[0]?.score ?? 0) - (r[1]?.score ?? 0)).toBeGreaterThanOrEqual(4);
    for (let i = 0; i < 50; i++) expect(pick(r, `seed-${i}`, []).pick.id).toBe('hot-buttered-rum');
  });
});

describe('other hand-checked fixtures', () => {
  it('Denver: Dark ’n’ Stormy 17.53, margin 7.45', () => {
    const r = scoreDrinks(judgeFixture('denver-hail').tags, BAR);
    expect(r[0]?.drink.id).toBe('dark-n-stormy');
    expect(r[0]?.score).toBeCloseTo(17.53, 1);
    expect((r[0]?.score ?? 0) - (r[1]?.score ?? 0)).toBeCloseTo(7.45, 1);
  });
  it('South Pole: Hot Buttered Rum 20.80, margin 6.80', () => {
    const r = scoreDrinks(judgeFixture('south-pole').tags, BAR);
    expect(r[0]?.drink.id).toBe('hot-buttered-rum');
    expect(r[0]?.score).toBeCloseTo(20.8, 1);
    expect((r[0]?.score ?? 0) - (r[1]?.score ?? 0)).toBeCloseTo(6.8, 1);
  });
  it('the ocean rule forces a marine drink', () => {
    expect(judgeFixture('arabian-sea').drinkId).toBe('dark-n-stormy');
    expect(judgeFixture('arabian-sea', 'barista').drinkId).toBe('virgin-stormy');
  });
  it('the Mumbai fixture is iced, the Yakutsk fixture is a hot dark-rum drink', () => {
    expect(byId(judgeFixture('mumbai').drinkId).serve).toBe('iced');
    const y = byId(judgeFixture('yakutsk').drinkId);
    expect([y.serve, y.base]).toEqual(['hot', 'rum']);
  });
});

describe('pick()', () => {
  const ranked = (...scores: number[]): Ranked[] => scores.map((score, i) => ({ drink: BAR[i] ?? BAR[0]!, score }));
  it('draws 85 / 11 / 4 over 1,000 seeds and never a negative score', () => {
    const r = ranked(10, 9, 8);
    const counts = [0, 0, 0];
    for (let i = 0; i < 1000; i++) {
      const p = pick(r, `s${i}`, []);
      counts[r.findIndex((x) => x.drink === p.pick)]! += 1;
    }
    expect(counts[0]! / 1000).toBeGreaterThan(0.82);
    expect(counts[0]! / 1000).toBeLessThan(0.88);
    expect(counts[1]! / 1000).toBeGreaterThan(0.08);
    expect(counts[1]! / 1000).toBeLessThan(0.14);
    expect(counts[2]! / 1000).toBeGreaterThan(0.02);
    expect(counts[2]! / 1000).toBeLessThan(0.06);
    const neg = ranked(3, -1, -2);
    for (let i = 0; i < 200; i++) expect(pick(neg, `n${i}`, []).pick).toBe(neg[0]!.drink);
  });
  it('falls back to the least-bad drink when everything is negative', () => {
    const r = ranked(-1, -2);
    expect(pick(r, 'x', []).pick).toBe(r[0]!.drink);
  });
  it('throws on an empty menu', () => expect(() => pick([], 'x', [])).toThrow());
  it('is deterministic per seed and the seed has 0.1° resolution', () => {
    expect(seedFor(19.07, 72.88, 0, 'bar')).toBe(seedFor(19.08, 72.88, 0, 'bar'));
    expect(seedFor(19.14, 72.88, 0, 'bar')).not.toBe(seedFor(19.16, 72.88, 0, 'bar'));
    const r = ranked(10, 9, 8);
    expect(pick(r, 'abc', []).pick).toBe(pick(r, 'abc', []).pick);
  });
  it('the repeat penalty flips the order only when the margin is under 2', () => {
    const tags = [t('hot', 1)];
    const a: Drink = { ...BAR[0]!, id: 'a', affinity: { hot: 5 }, serve: 'neat' };
    const b: Drink = { ...BAR[0]!, id: 'b', affinity: { hot: 4 }, serve: 'neat' };
    expect(scoreDrinks(tags, [a, b])[0]?.drink.id).toBe('a');
    expect(scoreDrinks(tags, [a, b], { lastDrinkId: 'a' })[0]?.drink.id).toBe('b');
    const c: Drink = { ...b, affinity: { hot: 2 } };
    expect(scoreDrinks(tags, [a, c], { lastDrinkId: 'a' })[0]?.drink.id).toBe('a');
  });
  it('the barista menu only holds non-alcoholic drinks', () => {
    expect(menuFor(DRINKS, 'barista').every((d) => !d.alcoholic)).toBe(true);
    expect(menuFor(DRINKS, 'barista')).toHaveLength(20);
    expect(BAR).toHaveLength(20);
  });
});

describe('stampFor (§6.6)', () => {
  it.each([
    ['mumbai', 'AGGRESSIVELY ICED', 1],
    ['yakutsk', 'SCALDING. DO NOT GO OUTSIDE.', 2],
    ['reykjavik', 'HOT, NO ARGUMENTS', 1],
    ['denver-hail', 'DO NOT GO OUTSIDE.', 2],
    ['dubai-noon', 'SERVED IN A BUCKET', 2],
  ] as const)('%s → %s', (name, text, tier) => {
    const v = judgeFixture(name);
    expect(v.stamp.text).toBe(text);
    expect(v.stamp.tier).toBe(tier);
  });
  it('the gentler lever downgrades the danger tier', () => {
    expect(judgeFixture('denver-hail', 'bar', true).stamp).toMatchObject({ text: 'INDOORS. NOW.', tier: 1 });
  });
  it('barista mode inks the stamp green but keeps the ladder', () => {
    const v = judgeFixture('mumbai', 'barista');
    expect(v.stamp).toMatchObject({ text: 'AGGRESSIVELY ICED', ink: 'barista' });
    expect(judgeFixture('denver-hail').stamp.ink).toBe('storm');
    expect(judgeFixture('yakutsk').stamp.ink).toBe('hot');
    expect(judgeFixture('mumbai').stamp.ink).toBe('iced');
  });
  it('covers neat and frozen ladders', () => {
    expect(stampFor([t('chilly', 1, 0.2)], byId('old-fashioned'), 'bar', false).text).toBe('NEAT');
    expect(stampFor([t('scorching', 2, 1)], byId('frozen-daiquiri'), 'bar', false).text).toBe(
      'A SLUSHIE. YOU EARNED IT.',
    );
  });
});

describe('pin, then guard', () => {
  it('nine fixtures × {bar, barista}', () => {
    const table = FIXTURES.map((n) => {
      const b = judgeFixture(n);
      const z = judgeFixture(n, 'barista');
      return `${n}: ${b.drinkId} [${b.runnersUp.join(', ')}] ${b.stamp.text} | ${z.drinkId} [${z.runnersUp.join(', ')}]`;
    });
    expect(table).toMatchSnapshot();
  });
});
