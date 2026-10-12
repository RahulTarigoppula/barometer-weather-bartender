import { describe, expect, it } from 'vitest';
import { judge } from '../engine/index';
import { TAGS } from '../engine/types';
import { DRINKS, FIXTURES, GRAMMAR, geoIndex, judgeFixture, loadFixture } from '../test/helpers';
import denylist from './lint-denylist.json';
import { plain, speak, splitIntensifier, tidy } from './speak';

const SERVES = ['frozen', 'iced', 'chilled', 'neat', 'warm', 'hot'];
const CLOSERS = ['default', 'late', 'dawn', 'morning', 'brunch', 'afternoon', 'golden', 'evening', 'ocean', 'polar'];

describe('grammar coverage', () => {
  it('every Tag has a jab pool of ≥ 8 variants', () => {
    for (const t of TAGS) expect(GRAMMAR[`jab_${t}`]?.length ?? 0, t).toBeGreaterThanOrEqual(8);
  });
  it('every serve, closer and the hedge have ≥ 8 variants', () => {
    for (const s of SERVES) expect(GRAMMAR[`serveLine_${s}`]?.length ?? 0, s).toBeGreaterThanOrEqual(8);
    for (const c of CLOSERS) expect(GRAMMAR[`closer_${c}`]?.length ?? 0, c).toBeGreaterThanOrEqual(8);
    expect(GRAMMAR.hedge?.length ?? 0).toBeGreaterThanOrEqual(8);
    expect(GRAMMAR.drinkLine?.length ?? 0).toBeGreaterThanOrEqual(8);
  });
  it('every #symbol# referenced exists', () => {
    const dynamic = new Set(['place', 'time', 'drink', 'stamp', 'feels', 'dew', 'wind']);
    for (const [k, pool] of Object.entries(GRAMMAR)) {
      for (const line of pool) {
        for (const m of line.matchAll(/#([\w-]+)(\.\w+)*#/g)) {
          const sym = m[1] ?? '';
          expect(dynamic.has(sym) || sym in GRAMMAR, `${k}: #${sym}#`).toBe(true);
        }
      }
    }
  });
  it('passes the protected-characteristics deny-list', () => {
    const all = Object.values(GRAMMAR).flat().join('\n').toLowerCase();
    for (const word of denylist.words) {
      expect(all, word).not.toMatch(new RegExp(`\\b${word}\\b`));
    }
  });
});

describe('flattened output rules', () => {
  it('every fixture × menu × 50 seeds reads clean', () => {
    for (const n of FIXTURES) {
      for (const menu of ['bar', 'barista'] as const) {
        const v = judgeFixture(n, menu);
        const drink = DRINKS.find((d) => d.id === v.drinkId);
        if (!drink) throw new Error(v.drinkId);
        for (let s = 0; s < 50; s++) {
          const lines = speak({ ...v, seed: `${v.seed}|${s}` }, GRAMMAR, drink);
          for (const [k, line] of Object.entries(lines)) {
            if (line === undefined) continue;
            expect(line, k).not.toMatch(/#|\(\(|\)\)| {2}/);
            expect(line.length, `${k}: ${line}`).toBeLessThanOrEqual(k === 'jab' ? 200 : 130);
            if (k !== 'time') expect(line, `${k}: ${line}`).toMatch(/[.!?]»?$/);
          }
          expect(lines.drink.split(drink.name).length - 1).toBe(1);
          expect(lines.drink).toMatch(/«[^»]+»/);
          const coaster = `${lines.place} ${lines.time}. ${lines.jab} ${plain(lines.drink)}`;
          expect(coaster.length).toBeLessThanOrEqual(400);
        }
      }
    }
  });
  it('is deterministic per seed', () => {
    expect(judgeFixture('mumbai').lines).toEqual(judgeFixture('mumbai').lines);
  });
  it('the barista flip keeps the same insult', () => {
    const v = judgeFixture('mumbai');
    const twin = DRINKS.find((d) => d.id === 'virgin-mojito');
    if (!twin) throw new Error('twin');
    expect(speak(v, GRAMMAR, twin).jab).toBe(v.lines.jab);
  });
  it('hedges precipitation the models are unsure about, and only then', () => {
    expect(judgeFixture('yakutsk').lines.hedge).toBeDefined(); // snow at 40 %
    expect(judgeFixture('reykjavik').lines.hedge).toBeUndefined(); // rain at 80 %
    expect(judgeFixture('lisbon-golden').lines.hedge).toBeUndefined(); // no precipitation
  });
  it('the polar clock is hedged', () => expect(judgeFixture('south-pole').lines.time).toMatch(/give or take/));
  it('the ocean has no bar', () =>
    expect(judgeFixture('arabian-sea').lines.place).toMatch(/^You are in the Arabian Sea\./));
  it('pin, then guard: every fixture line', () => {
    expect(FIXTURES.map((n) => judgeFixture(n).lines)).toMatchSnapshot();
  });
});

describe('variety', () => {
  it('1,000 Mumbai verdicts across seeds yield ≥ 300 distinct jabs', () => {
    const f = loadFixture('mumbai');
    const place = geoIndex().locate(f.lat, f.lng);
    const jabs = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const v = judge({
        now: f.now,
        lat: f.lat + (i % 40) * 0.1,
        lng: f.lng + Math.floor(i / 40) * 0.1,
        snapshot: f.snapshot,
        place,
        menu: 'bar',
        drinks: DRINKS,
        grammar: GRAMMAR,
        settings: { gentler: false },
      });
      jabs.add(v.lines.jab);
    }
    expect(jabs.size).toBeGreaterThanOrEqual(300);
  });
  it('neighbouring clicks 0.5° apart do not print identical coasters', () => {
    const f = loadFixture('mumbai');
    const place = geoIndex().locate(f.lat, f.lng);
    let prev = '';
    for (let i = 0; i < 20; i++) {
      const v = judge({
        now: f.now,
        lat: f.lat + i * 0.5,
        lng: f.lng,
        snapshot: f.snapshot,
        place,
        menu: 'bar',
        drinks: DRINKS,
        grammar: GRAMMAR,
        settings: { gentler: false },
      });
      const coaster = Object.values(v.lines).join(' ');
      expect(coaster).not.toBe(prev);
      prev = coaster;
    }
  });
});

describe('helpers', () => {
  it('splits the shouted words', () => {
    expect(splitIntensifier('«AGGRESSIVELY ICED» Mojito.')).toEqual([
      { text: 'AGGRESSIVELY ICED', loud: true },
      { text: ' Mojito.', loud: false },
    ]);
    expect(splitIntensifier('One Mojito, «ICED».')).toHaveLength(3);
  });
  it('tidies whitespace and ends with punctuation', () => {
    expect(tidy('a  b ,c')).toBe('a b,c.');
    expect(tidy('Done!')).toBe('Done!');
  });
});
