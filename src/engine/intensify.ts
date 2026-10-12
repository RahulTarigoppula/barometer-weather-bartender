import INTENSIFIERS from '../wit/grammar/intensifiers.json';
import type { Drink, Menu, Stamp, Tag, TagScore } from './types';

const COLD_INTEN: Tag[] = ['chilly', 'cold', 'freezing', 'arctic'];
const inten = (tags: TagScore[], ...names: Tag[]): number =>
  Math.max(0, ...tags.filter((t) => names.includes(t.tag)).map((t) => t.intensity));
const has = (tags: TagScore[], t: Tag): boolean => tags.some((s) => s.tag === t);

type Ladder = [string, string, string];
const LADDERS: Record<string, Ladder | undefined> = {
  frozen: INTENSIFIERS.iced.frozen as Ladder,
  iced: INTENSIFIERS.iced.iced as Ladder,
  chilled: INTENSIFIERS.iced.chilled as Ladder,
  neat: INTENSIFIERS.hot.neat as Ladder,
  warm: INTENSIFIERS.hot.warm as Ladder,
  hot: INTENSIFIERS.hot.hot as Ladder,
  storm: INTENSIFIERS.storm.storm as Ladder,
};

/** The intensifier stamp. `intensifiers.json` is the single source of every stamp string (C12). */
export function stampFor(tags: TagScore[], drink: Drink, menu: Menu, gentler: boolean): Stamp {
  const stormy = has(tags, 'storm') || has(tags, 'hail');
  const coldServe = drink.serve === 'hot' || drink.serve === 'warm' || drink.serve === 'neat';

  const score = coldServe
    ? inten(tags, ...COLD_INTEN) + (has(tags, 'arctic') ? 0.5 : 0) + (has(tags, 'gale') ? 0.3 : 0)
    : inten(tags, 'hot', 'scorching') +
      inten(tags, 'muggy', 'oppressive') +
      (has(tags, 'oppressive') ? 0.5 : 0) +
      (has(tags, 'scorching') ? 0.5 : 0);

  let tier: 0 | 1 | 2 = score < 0.5 ? 0 : score < 1.2 ? 1 : 2;
  const family = stormy ? 'storm' : coldServe ? 'hot' : 'iced';
  if (stormy) tier = 2; // a storm is never understated…
  if (gentler && tier === 2) tier = 1; // …unless the gentler lever is on
  const ladder = LADDERS[family === 'storm' ? 'storm' : drink.serve] ?? LADDERS.iced;
  return { text: ladder?.[tier] ?? 'ICED', tier, ink: menu === 'barista' ? 'barista' : family };
}
