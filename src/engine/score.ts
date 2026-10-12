import seedrandom from 'seedrandom';
import type { Drink, Menu, Serve, Tag, TagScore } from './types';

const WARM_SIDE: Tag[] = ['hot', 'scorching', 'muggy', 'oppressive'];
const COLD_SIDE: Tag[] = ['cold', 'freezing', 'arctic'];
const SERVE_BONUS: Record<'warm' | 'cold' | 'chilly', Record<Serve, number>> = {
  warm: { frozen: 3, iced: 2, chilled: 1, neat: 0, warm: -2, hot: -3 },
  cold: { frozen: -4, iced: -3, chilled: -1, neat: 1, warm: 2, hot: 2 },
  chilly: { frozen: -2, iced: -1, chilled: 0, neat: 1, warm: 1, hot: 1 },
};

export interface Ranked {
  drink: Drink;
  score: number;
}

export function scoreDrinks(
  tags: TagScore[],
  menu: Drink[],
  opts: { lastDrinkId?: string | undefined } = {},
): Ranked[] {
  const has = (t: Tag): boolean => tags.some((s) => s.tag === t);
  const warm = WARM_SIDE.some(has);
  const cold = COLD_SIDE.some(has);
  const chilly = has('chilly');
  return menu
    .map((drink) => {
      let s = 0;
      for (const t of tags) s += (drink.affinity[t.tag] ?? 0) * t.weight;
      if (warm) s += SERVE_BONUS.warm[drink.serve];
      if (cold) s += SERVE_BONUS.cold[drink.serve];
      if (chilly) s += SERVE_BONUS.chilly[drink.serve];
      if (opts.lastDrinkId === drink.id) s -= 2; // session-scoped repeat penalty
      return { drink, score: s };
    })
    .sort((a, b) => b.score - a.score || a.drink.id.localeCompare(b.drink.id));
}

export const seedFor = (lat: number, lng: number, localHour: number, menu: Menu): string =>
  `${lat.toFixed(1)}|${lng.toFixed(1)}|${localHour}|${menu}`;

export interface Pick {
  pick: Drink;
  runnersUp: Drink[];
}

export function pick(ranked: Ranked[], seed: string, tags: TagScore[]): Pick {
  let top = ranked.slice(0, 3).filter((r) => r.score > 0); // never draw a negative-score drink
  if (top.length === 0) top = ranked.slice(0, 1);
  const [first, second] = top;
  if (!first) throw new Error('pick(): empty menu');

  // Ocean rule: an ocean click must be able to reach a marine drink.
  if (tags.some((t) => t.tag === 'ocean')) {
    const marine = ranked.find((r) => (r.drink.affinity.ocean ?? 0) >= 5);
    if (marine) {
      if (!top.includes(marine)) top = [marine, ...top].slice(0, 3);
      return { pick: marine.drink, runnersUp: top.filter((r) => r !== marine).map((r) => r.drink) };
    }
  }

  const dominant = second === undefined || first.score - second.score >= 4;
  let idx = 0;
  if (!dominant) {
    const r = seedrandom(seed)();
    idx = r < 0.85 ? 0 : r < 0.96 ? 1 : 2; // 85 / 11 / 4 %
    if (idx >= top.length) idx = top.length - 1;
  }
  const chosen = top[idx] ?? first;
  return { pick: chosen.drink, runnersUp: top.filter((t) => t !== chosen).map((t) => t.drink) };
}
