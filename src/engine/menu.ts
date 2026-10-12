import { BOTTLE_IDS, type Drink, GLASSES, type Menu, type Serve, TAGS, type Tag } from './types';

const SERVES: readonly Serve[] = ['frozen', 'iced', 'chilled', 'neat', 'warm', 'hot'];
const ICES = ['cubes', 'crushed', 'none'] as const;
const BASES = [
  'rum',
  'gin',
  'whisky',
  'tequila',
  'vodka',
  'brandy',
  'wine',
  'beer',
  'amaro',
  'tea',
  'coffee',
  'cocoa',
  'soda',
  'juice',
  'none',
] as const;
const SOURCES = ['iba', 'opendrinks', 'house'] as const;

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const isStr = (x: unknown): x is string => typeof x === 'string' && x.length > 0;
const oneOf = <T extends string>(list: readonly T[], x: unknown): x is T =>
  typeof x === 'string' && (list as readonly string[]).includes(x);
const isTag = (x: string): x is Tag => (TAGS as readonly string[]).includes(x);

/** Validates bar-menu.json at load time; a malformed row is a build-breaking bug, so it throws. */
export function parseMenu(raw: unknown): Drink[] {
  if (!Array.isArray(raw)) throw new Error('bar menu must be an array');
  return raw.map((row: unknown, i): Drink => {
    const where = `bar menu row ${i}`;
    if (!isObj(row)) throw new Error(`${where}: not an object`);
    const { id, name, base, alcoholic, abv, serve, glass, ice, colour, bottle, virginTwin, affinity, recipe } = row;
    if (!isStr(id) || !isStr(name) || !isStr(colour)) throw new Error(`${where}: id/name/colour`);
    if (!oneOf(BASES, base) || !oneOf(SERVES, serve) || !oneOf(GLASSES, glass) || !oneOf(ICES, ice)) {
      throw new Error(`${where} (${id}): base/serve/glass/ice`);
    }
    if (!oneOf(BOTTLE_IDS, bottle)) throw new Error(`${where} (${id}): bottle`);
    if (typeof alcoholic !== 'boolean' || typeof abv !== 'number') throw new Error(`${where} (${id}): alcoholic/abv`);
    if (!isObj(affinity)) throw new Error(`${where} (${id}): affinity`);
    const aff: Partial<Record<Tag, number>> = {};
    for (const [k, v] of Object.entries(affinity)) {
      if (!isTag(k) || typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 8) {
        throw new Error(`${where} (${id}): affinity ${k}`);
      }
      aff[k] = v;
    }
    if (!isObj(recipe) || !Array.isArray(recipe.ingredients) || !Array.isArray(recipe.method)) {
      throw new Error(`${where} (${id}): recipe`);
    }
    if (!oneOf(SOURCES, recipe.source)) throw new Error(`${where} (${id}): recipe source`);
    const ingredients = recipe.ingredients.map((r: unknown) => {
      if (!isObj(r) || !isStr(r.amount) || !isStr(r.ingredient)) throw new Error(`${where} (${id}): ingredient`);
      return { amount: r.amount, ingredient: r.ingredient };
    });
    const method = recipe.method.map((m: unknown) => {
      if (!isStr(m)) throw new Error(`${where} (${id}): method`);
      return m;
    });
    const drink: Drink = {
      id,
      name,
      base,
      alcoholic,
      abv,
      serve,
      glass,
      ice,
      colour,
      bottle,
      affinity: aff,
      recipe: { ingredients, method, source: recipe.source },
    };
    if (isStr(virginTwin)) drink.virginTwin = virginTwin;
    return drink;
  });
}

export const menuFor = (drinks: Drink[], menu: Menu): Drink[] => drinks.filter((d) => d.alcoholic === (menu === 'bar'));

/** The other menu's version of a drink: a cocktail's virgin twin, or a mocktail's parent cocktail. */
export function twinOf(drinks: Drink[], drink: Drink, target: Menu): Drink | undefined {
  if (drink.alcoholic === (target === 'bar')) return drink;
  if (drink.alcoholic) return drinks.find((d) => d.id === drink.virginTwin);
  return drinks.find((d) => d.virginTwin === drink.id);
}
