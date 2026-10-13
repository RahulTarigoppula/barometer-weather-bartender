import { clamp01 } from './comfort';
import { dayPartBase, dayPartIntensity } from './daypart';
import type { DialLabel, Features, GradeFamily, Tag, TagFamily, TagScore } from './types';

const DRIZZLE: Record<number, number> = { 51: 0.3, 53: 0.5, 55: 0.7, 56: 0.5, 57: 0.7 };
const RAIN: Record<number, number> = { 61: 0.4, 63: 0.6, 66: 0.5, 67: 0.7, 80: 0.4, 81: 0.6 };
const DOWNPOUR: Record<number, number> = { 65: 0.8, 82: 1 };
const SNOW: Record<number, number> = { 71: 0.3, 73: 0.6, 77: 0.3, 85: 0.5 };
const BLIZZARD_CODES = new Set([75, 86]);
const FOG: Record<number, number> = { 45: 0.5, 48: 0.7 };
const HAIL: Record<number, number> = { 96: 0.8, 99: 1 };

/** Features → weighted tags (§6.3, the contract). Sorted by weight, descending. */
export function extractTags(f: Features): TagScore[] {
  const out: TagScore[] = [];
  const add = (tag: Tag, family: TagFamily, intensity: number, base: number): void => {
    const i = clamp01(intensity);
    out.push({ tag, family, intensity: i, weight: base * (1 + i) });
  };
  const A = f.apparentC;
  const Td = f.dewPointC;
  const v = f.windKmh;
  const g = f.gustKmh;
  const w = f.wmo;

  if (A >= 38) add('scorching', 'temp', (A - 38) / 8, 1.3);
  else if (A > 28) add('hot', 'temp', (A - 28) / 10, 1.0);
  else if (A > 22) add('warm', 'temp', (A - 22) / 6, 0.5);
  else if (A > 10) add('mild', 'temp', 0, 0.3);
  else if (A > 0) add('chilly', 'temp', (10 - A) / 10, 0.6);
  else if (A > -10) add('cold', 'temp', (0 - A) / 10, 1.0);
  else if (A > -25) add('freezing', 'temp', (-10 - A) / 15, 1.2);
  else add('arctic', 'temp', (-25 - A) / 25, 1.4);

  if (Td >= 24) add('oppressive', 'humidity', (Td - 24) / 4, 1.3);
  else if (Td >= 18) add('muggy', 'humidity', (Td - 18) / 6, 1.0);
  else if (Td < 5 && f.rh < 25) add('bone-dry', 'humidity', (25 - f.rh) / 25, 0.6);

  const snowCode = w in SNOW || BLIZZARD_CODES.has(w);
  if (w in DRIZZLE) add('drizzle', 'precip', DRIZZLE[w] ?? 0, 0.6);
  else if (w in RAIN) add('rain', 'precip', RAIN[w] ?? 0, 0.8);
  else if (w in DOWNPOUR) add('downpour', 'precip', DOWNPOUR[w] ?? 0, 1.0);
  else if (snowCode && (BLIZZARD_CODES.has(w) || v >= 39)) add('blizzard', 'precip', 1, 1.3);
  else if (snowCode) add('snow', 'precip', SNOW[w] ?? 0, 0.9);
  else if (w in FOG) add('fog', 'precip', FOG[w] ?? 0, 0.7);
  else if (w === 95) add('storm', 'precip', 0.8, 1.4);
  else if (w in HAIL) add('hail', 'precip', HAIL[w] ?? 0, 1.2);

  if (v >= 62 || g >= 60) add('gale', 'wind', Math.max(0, (v - 62) / 40) + (g >= 60 ? 0.2 : 0), 1.0);
  else if (v < 6) add('still', 'wind', 0, 0.2);
  else if (v >= 20 && v < 39) add('breezy', 'wind', (v - 20) / 19, 0.4);

  if (f.uv >= 8 && f.isDay) add('uv-extreme', 'uv', (f.uv - 8) / 4, 0.7);

  if (f.dust !== null && f.dust >= 100) add('dust', 'air', (f.dust - 100) / 200, 1.0);
  if (f.euAqi !== null && f.euAqi >= 60) add('smog', 'air', (f.euAqi - 60) / 40, 0.8);

  add(f.dayPart, 'daypart', dayPartIntensity(f.dayPart, f.localHour, f.localMinute), dayPartBase(f.dayPart));
  if (f.place.kind === 'ocean') add('ocean', 'place', 0, 1.5);
  if (f.place.polar) add('polar', 'place', 0, 1.2);

  return out.sort((a, b) => b.weight - a.weight);
}

/** C6: the driving tag is the first match in this list, not the heaviest tag. */
export const PRIORITY: readonly Tag[] = [
  'hail',
  'storm',
  'arctic',
  'scorching',
  'blizzard',
  'oppressive',
  'downpour',
  'freezing',
  'dust',
  'smog',
  'uv-extreme',
  'gale',
  'snow',
  'hot',
  'muggy',
  'rain',
  'cold',
  'fog',
  'drizzle',
  'chilly',
  'bone-dry',
  'breezy',
  'warm',
  'mild',
  'still',
  'ocean',
  'polar',
];

export function drivingTag(tags: TagScore[]): Tag {
  for (const t of PRIORITY) if (tags.some((s) => s.tag === t)) return t;
  const daypart = tags.find((s) => s.family === 'daypart');
  return daypart?.tag ?? 'mild';
}

/** The dial is a thermometer: the heaviest temp/humidity tag. */
export function thermalTag(tags: TagScore[]): Tag | null {
  return tags.find((t) => t.family === 'temp' || t.family === 'humidity')?.tag ?? null;
}

const GRADE: Partial<Record<Tag, GradeFamily>> = {
  scorching: 'heat',
  hot: 'heat',
  'uv-extreme': 'heat',
  muggy: 'muggy',
  oppressive: 'muggy',
  chilly: 'cold',
  cold: 'cold',
  freezing: 'cold',
  arctic: 'cold',
  rain: 'rain',
  drizzle: 'rain',
  downpour: 'rain',
  snow: 'snow',
  blizzard: 'snow',
  storm: 'storm',
  hail: 'storm',
  gale: 'storm',
  fog: 'fog',
  smog: 'fog',
  dust: 'fog',
  late: 'sodium',
  evening: 'sodium',
};
export const gradeFamily = (t: Tag): GradeFamily => GRADE[t] ?? 'none';

export const RING: readonly DialLabel[] = ['ARCTIC', 'FREEZING', 'CHILLY', 'FAIR', 'MUGGY', 'SOUP', 'SCORCHING'];
const DIAL: Partial<Record<Tag, DialLabel>> = {
  arctic: 'ARCTIC',
  freezing: 'FREEZING',
  cold: 'FREEZING',
  chilly: 'CHILLY',
  mild: 'FAIR',
  warm: 'FAIR',
  'bone-dry': 'FAIR',
  muggy: 'MUGGY',
  oppressive: 'SOUP',
  hot: 'SCORCHING',
  scorching: 'SCORCHING',
};

export interface DialReading {
  label: DialLabel;
  angle: number;
  valuetext: string;
}

export function dial(thermal: Tag | null, apparentC: number | null): DialReading {
  const label = (thermal && DIAL[thermal]) ?? 'FAIR';
  const angle = RING.indexOf(label) * 40 - 120;
  return {
    label,
    angle,
    valuetext:
      apparentC === null ? 'No reading' : `Feels like ${apparentC.toFixed(1)} degrees, tag: ${label.toLowerCase()}`,
  };
}
