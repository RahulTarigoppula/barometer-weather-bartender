import type { Base, Drink } from './types';

export const TIERS = ['cheap', 'budget', 'mid', 'high'] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_LABEL: Record<Tier, string> = {
  cheap: 'Extreme Cheap',
  budget: 'Budget',
  mid: 'Mid-range',
  high: 'High-end',
};

/** Where you drink it at each tier, India first. */
const WHERE: Record<Tier, { alcoholic: string; free: string }> = {
  cheap: { alcoholic: 'At home, with a bottle from the local shop', free: 'Street stall or your own kitchen' },
  budget: { alcoholic: 'Neighbourhood bar · house pour', free: 'Café or juice centre' },
  mid: { alcoholic: 'Pub or rooftop lounge', free: 'Specialty café or lounge' },
  high: { alcoholic: 'Premium cocktail bar or five-star hotel', free: 'Five-star hotel lounge' },
};

/** Per-glass price bands in rupees, before the base multiplier. */
const BAND: Record<Tier, { alcoholic: [number, number]; free: [number, number] }> = {
  cheap: { alcoholic: [60, 150], free: [20, 60] },
  budget: { alcoholic: [180, 350], free: [70, 160] },
  mid: { alcoholic: [450, 850], free: [180, 350] },
  high: { alcoholic: [950, 2500], free: [380, 900] },
};

/** Some bases cost more (imported wine, agave) or less (beer, chai) than a rum or vodka pour. */
const BASE_FACTOR: Partial<Record<Base, number>> = {
  beer: 0.75,
  wine: 1.25,
  tequila: 1.4,
  gin: 1.1,
  whisky: 1.1,
  tea: 0.6,
  coffee: 0.9,
  cocoa: 1.1,
};

/** What goes in the glass at each tier: Indian-market labels first. */
const POUR: Record<Base, Record<Tier, string>> = {
  rum: {
    cheap: 'Old Monk or McDowell’s No.1 Celebration',
    budget: 'Old Monk Gold Reserve or Bacardi White',
    mid: 'Bacardi Carta Oro, Camikara 3-year',
    high: 'Diplomático Reserva, Camikara 12-year cask',
  },
  gin: {
    cheap: 'Blue Riband or Gordon’s',
    budget: 'Greater Than or Beefeater',
    mid: 'Stranger & Sons, Hapusa',
    high: 'Monkey 47, Tanqueray No. Ten',
  },
  whisky: {
    cheap: 'Officer’s Choice or McDowell’s No.1',
    budget: 'Royal Stag or Blenders Pride',
    mid: 'Amrut Fusion, Paul John Brilliance',
    high: 'Indri Trini, Glenfiddich 18',
  },
  tequila: {
    cheap: 'Camino Real Blanco',
    budget: 'Jose Cuervo Silver',
    mid: 'Olmeca Altos Plata, Desi Agave (Pistola)',
    high: 'Patrón Silver, Don Julio Blanco',
  },
  vodka: {
    cheap: 'Romanov or White Mischief',
    budget: 'Magic Moments or Smirnoff',
    mid: 'Absolut, Ketel One',
    high: 'Grey Goose, Belvedere',
  },
  brandy: {
    cheap: 'Mansion House',
    budget: 'Honey Bee',
    mid: 'Morpheus XO',
    high: 'Hennessy VSOP',
  },
  wine: {
    cheap: 'Big Banyan or Sula Satori',
    budget: 'Sula Brut, Grover Zampa Art',
    mid: 'Fratelli Sette, York Arros',
    high: 'Imported Champagne or Burgundy',
  },
  beer: {
    cheap: 'Kingfisher Premium',
    budget: 'Bira 91 White or Simba',
    mid: 'Gateway, Kati Patang craft',
    high: 'Imported Belgian or Japanese lager',
  },
  amaro: {
    cheap: 'House bitter',
    budget: 'Campari',
    mid: 'Campari with Antica Formula',
    high: 'Cocchi Rosa and Campari',
  },
  tea: {
    cheap: 'Tapri chai or a home brew',
    budget: 'Tata Tea Gold, Society Masala',
    mid: 'Single-estate Assam CTC',
    high: 'First-flush Darjeeling, Makaibari',
  },
  coffee: {
    cheap: 'Bru or Nescafé instant',
    budget: 'Coorg filter blend',
    mid: 'Blue Tokai, Third Wave single-origin',
    high: 'Subko or KC Roasters specialty lot',
  },
  cocoa: {
    cheap: 'Bournvita or drinking chocolate',
    budget: 'Hershey’s cocoa',
    mid: 'Mason & Co. 70%',
    high: 'Paul & Mike single-origin',
  },
  soda: {
    cheap: 'Banta soda from the stall',
    budget: 'Kinley soda, fresh limes',
    mid: 'Sepoy & Co. tonic or ginger ale',
    high: 'Fever-Tree with house syrups',
  },
  juice: {
    cheap: 'Fresh from the thela',
    budget: 'Real or Paper Boat',
    mid: 'Cold-pressed, Raw Pressery',
    high: 'Hand-pressed with house cordials',
  },
  none: {
    cheap: 'Lime, sugar, mint from the kitchen',
    budget: 'Fresh lime and mint',
    mid: 'Fresh herbs, house syrups',
    high: 'Hand-cut ice, house cordials',
  },
};

const TIP: Record<Tier, string> = {
  cheap: 'Make a jug: four glasses cost what one costs at a bar.',
  budget: 'Ask for the house pour. Nobody will check the label.',
  mid: 'Order it during happy hour and it drops a tier.',
  high: 'Ask the bartender which bottle they would pick. Then tip.',
};

export interface BudgetPlan {
  tier: Tier;
  label: string;
  /** Rupees per glass, rounded to a tidy 10. */
  low: number;
  high: number;
  pour: string;
  where: string;
  tip: string;
}

const round10 = (n: number): number => Math.max(10, Math.round(n / 10) * 10);

/** The same drink at four price points: the pour, the place and a rupee range per glass. */
export function budgetPlan(drink: Drink, tier: Tier): BudgetPlan {
  const kind = drink.alcoholic ? 'alcoholic' : 'free';
  const [lo, hi] = BAND[tier][kind];
  const f = BASE_FACTOR[drink.base] ?? 1;
  return {
    tier,
    label: TIER_LABEL[tier],
    low: round10(lo * f),
    high: round10(hi * f),
    pour: POUR[drink.base][tier],
    where: WHERE[tier][kind],
    tip: TIP[tier],
  };
}

/** "₹180–₹350" with Indian digit grouping. */
export function fmtRupees(low: number, high: number): string {
  const f = (n: number): string => `₹${n.toLocaleString('en-IN')}`;
  return `${f(low)}–${f(high)}`;
}

/** Rough dollar band for international pours (₹84 ≈ $1). */
export function fmtDollars(low: number, high: number): string {
  return `≈ $${Math.max(1, Math.round(low / 84))}–$${Math.max(1, Math.round(high / 84))}`;
}
