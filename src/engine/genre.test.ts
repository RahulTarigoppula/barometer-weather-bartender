import { describe, expect, it } from 'vitest';
import { judgeFixture } from '../test/helpers';
import { genreOf } from './genre';
import type { Tag, TagScore } from './types';

const t = (...tags: Tag[]): TagScore[] => tags.map((tag) => ({ tag, family: 'precip', intensity: 1, weight: 1 }));
const f = { apparentC: 24, usAqi: 40, isDay: true, dayPart: 'afternoon' as const };

describe('today’s genre', () => {
  it('casts every kind of weather, most dramatic first', () => {
    expect(genreOf(f, t('storm', 'rain'), true).name).toBe('Disaster movie');
    expect(genreOf(f, t('rain'), true).name).toBe('Monsoon romance');
    expect(genreOf(f, t('rain'), false).name).toBe('Rainy-day drama');
    expect(genreOf(f, t('snow'), false).name).toBe('Winter fantasy');
    expect(genreOf({ ...f, usAqi: 220 }, t('fog'), true).name).toBe('Dystopian sci-fi');
    expect(genreOf(f, t('fog'), true).name).toBe('Noir');
    expect(genreOf(f, t('drizzle'), true).name).toBe('Slow-burn indie');
    expect(genreOf({ ...f, apparentC: 44 }, [], true).name).toBe('Desert thriller');
    expect(genreOf({ ...f, apparentC: 36 }, t('muggy'), true).name).toBe('Slow-cooked drama');
    expect(genreOf({ ...f, apparentC: -5 }, [], false).name).toBe('Survival epic');
    expect(genreOf({ ...f, apparentC: 8 }, [], false).name).toBe('Cosy mystery');
    expect(genreOf({ ...f, dayPart: 'golden' }, [], true).name).toBe('Golden-hour romance');
    expect(genreOf({ ...f, isDay: false, dayPart: 'late' }, [], true).name).toBe('Stargazing anime');
    expect(genreOf(f, [], true).name).toBe('Slice of life');
    expect(genreOf({ ...f, usAqi: null }, [], true).id).toBe('slice');
  });
  it('gives the golden fixtures a genre, with no em dashes', () => {
    const v = judgeFixture('reykjavik');
    expect(genreOf(v.features, v.tags, false).name).toBe('Rainy-day drama');
    for (const name of ['mumbai', 'yakutsk', 'denver-hail'] as const) {
      const g = judgeFixture(name);
      expect(genreOf(g.features, g.tags, true).line).not.toMatch(/\u2014/);
    }
  });
});

describe('a story to pair with the day', () => {
  it('every genre names one, without em dashes', () => {
    const f = { apparentC: 24, usAqi: 40, isDay: true, dayPart: 'afternoon' as 'afternoon' | 'golden' | 'late' };
    const cases: [Partial<typeof f>, Tag[]][] = [
      [{}, ['storm']],
      [{}, ['rain']],
      [{}, ['snow']],
      [{ usAqi: 300 }, []],
      [{}, ['fog']],
      [{}, ['drizzle']],
      [{ apparentC: 44 }, []],
      [{ apparentC: 36 }, ['muggy']],
      [{ apparentC: -4 }, []],
      [{ apparentC: 8 }, []],
      [{ dayPart: 'golden' }, []],
      [{ isDay: false, dayPart: 'late' }, []],
      [{}, []],
    ];
    const seen = new Set<string>();
    for (const [over, tags] of cases) {
      const g = genreOf({ ...f, ...over }, t(...tags), true);
      seen.add(g.id);
      expect(g.pair.length, g.name).toBeGreaterThan(3);
      expect(`${g.name} ${g.line} ${g.pair}`).not.toMatch(/\u2014/);
    }
    expect(seen.size).toBe(13);
    expect(genreOf(f, t('rain'), true).pair).toMatch(/Monsoon Wedding/);
    expect(genreOf(f, [], true).pair).toMatch(/Malgudi Days/);
  });
});
