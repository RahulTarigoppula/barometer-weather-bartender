// ───────────────────────── geography ─────────────────────────
export interface LatLng {
  lat: number;
  lng: number;
}

export interface PlaceHit {
  kind: 'land' | 'ocean' | 'ice';
  country?: { name: string; iso2: string; continent: string; subregion: string };
  nearestCity?: { name: string; country: string; iso2: string; distanceKm: number; isCapital: boolean; pop: number };
  water?: { name: string; featurecla: string };
  polar: boolean;
  label: string;
  /** Short upper-case name for the receipt: "MUMBAI, IN", "ARABIAN SEA". */
  short: string;
}

// ────────────── weather (normalised from Open-Meteo) ──────────────
export interface WeatherSnapshot {
  fetchedAt: number;
  cellKey: string;
  timezone: string;
  utcOffsetSeconds: number;
  current: {
    time: string;
    tempC: number;
    apparentC: number | null;
    rh: number;
    dewPointC: number | null;
    precipMm: number;
    rainMm: number;
    showersMm: number;
    snowCm: number;
    wmo: number;
    cloudCover: number;
    pressureHpa: number;
    windKmh: number;
    gustKmh: number;
    windDir: number;
    isDay: boolean;
  };
  hourNow: { uv: number; precipProb: number };
  daily: { sunrise: string; sunset: string; uvMax: number; tMaxC: number; tMinC: number };
  air?: {
    euAqi: number | null;
    usAqi: number | null;
    pm25: number | null;
    pm10: number | null;
    ozone: number | null;
    dust: number | null;
    uv: number | null;
  };
  marine?: { waveHeightM: number | null; sstC: number | null; windWaveM: number | null };
  /** Hours from now (local ISO times), for the 24-hour strip. */
  hours?: HourPoint[];
  /** Up to seven days, today first. */
  days?: DayPoint[];
}

export interface HourPoint {
  time: string;
  tempC: number;
  precipProb: number;
  wmo: number;
  isDay: boolean;
}

export interface DayPoint {
  date: string;
  wmo: number;
  tMaxC: number;
  tMinC: number;
  precipProbMax: number;
  uvMax: number;
}

// ───────────────────────── engine ─────────────────────────
export const TAGS = [
  'scorching',
  'hot',
  'warm',
  'mild',
  'chilly',
  'cold',
  'freezing',
  'arctic',
  'muggy',
  'oppressive',
  'bone-dry',
  'drizzle',
  'rain',
  'downpour',
  'snow',
  'blizzard',
  'hail',
  'storm',
  'fog',
  'still',
  'breezy',
  'gale',
  'uv-extreme',
  'smog',
  'dust',
  'dawn',
  'morning',
  'brunch',
  'afternoon',
  'golden',
  'evening',
  'late',
  'ocean',
  'polar',
] as const;
export type Tag = (typeof TAGS)[number];

export type DayPart = 'dawn' | 'morning' | 'brunch' | 'afternoon' | 'golden' | 'evening' | 'late';
export type TagFamily = 'temp' | 'humidity' | 'precip' | 'wind' | 'uv' | 'air' | 'daypart' | 'place';

export interface TagScore {
  tag: Tag;
  family: TagFamily;
  intensity: number;
  weight: number;
}

export interface Features {
  apparentC: number;
  tempC: number;
  heatIndexC: number | null;
  humidexC: number | null;
  windChillC: number | null;
  dewPointC: number;
  rh: number;
  beaufort: number;
  uv: number;
  euAqi: number | null;
  usAqi: number | null;
  dust: number | null;
  wmo: number;
  precipMm: number;
  precipProb: number;
  snowCm: number;
  cloudCover: number;
  pressureHpa: number;
  windKmh: number;
  gustKmh: number;
  isDay: boolean;
  localHour: number;
  localMinute: number;
  localWeekday: number;
  localDate: string;
  minutesToSunrise: number;
  minutesToSunset: number;
  polarApproximateTime: boolean;
  dayPart: DayPart;
  place: PlaceHit;
  marine?: { waveHeightM: number; sstC: number };
}

export type Serve = 'frozen' | 'iced' | 'chilled' | 'neat' | 'warm' | 'hot';
export type Base =
  | 'rum'
  | 'gin'
  | 'whisky'
  | 'tequila'
  | 'vodka'
  | 'brandy'
  | 'wine'
  | 'beer'
  | 'amaro'
  | 'tea'
  | 'coffee'
  | 'cocoa'
  | 'soda'
  | 'juice'
  | 'none';
export const GLASSES = ['rocks', 'highball', 'coupe', 'mug', 'copper-mug', 'tiki', 'flute', 'pint', 'teacup'] as const;
export type Glass = (typeof GLASSES)[number];
export const BOTTLE_IDS = [
  'rum',
  'gin',
  'whisky',
  'tequila',
  'vodka',
  'vermouth',
  'bitters',
  'syrup',
  'tea',
  'cocoa',
  'ginger-beer',
  'mint',
] as const;
export type BottleId = (typeof BOTTLE_IDS)[number];

export interface Recipe {
  ingredients: { amount: string; ingredient: string }[];
  method: string[];
  source: 'iba' | 'opendrinks' | 'house';
}

export interface Drink {
  id: string;
  name: string;
  base: Base;
  alcoholic: boolean;
  abv: number;
  serve: Serve;
  glass: Glass;
  ice: 'cubes' | 'crushed' | 'none';
  colour: string;
  affinity: Partial<Record<Tag, number>>;
  virginTwin?: string;
  bottle: BottleId;
  recipe: Recipe;
}

export type Menu = 'bar' | 'barista';
export type DialLabel = 'ARCTIC' | 'FREEZING' | 'CHILLY' | 'FAIR' | 'MUGGY' | 'SOUP' | 'SCORCHING';
export type GradeFamily = 'heat' | 'muggy' | 'cold' | 'rain' | 'snow' | 'storm' | 'fog' | 'sodium' | 'none';
export type StampInk = 'hot' | 'iced' | 'storm' | 'barista';

export interface Stamp {
  text: string;
  tier: 0 | 1 | 2;
  ink: StampInk;
}

export interface VerdictLines {
  place: string;
  time: string;
  jab: string;
  drink: string;
  serve: string;
  closer: string;
  hedge?: string;
}

export interface Verdict {
  id?: number;
  createdAt: number;
  lat: number;
  lng: number;
  cell: string;
  place: PlaceHit;
  timezone: string;
  localTime: string;
  shift: 'day' | 'night';
  menu: Menu;
  features: Features;
  tags: TagScore[];
  drivingTag: Tag;
  thermalTag: Tag | null;
  dial: DialLabel;
  dialAngle: number;
  gradeFamily: GradeFamily;
  drinkId: string;
  runnersUp: string[];
  stamp: Stamp;
  lines: VerdictLines;
  suggestBarista: boolean;
  stale?: boolean;
  seed: string;
  /** Which weather sources fed this verdict, for the credit line. */
  sources: { air: boolean; marine: boolean };
  /** The next hours and days, kept with the verdict so History re-prints the outlook too. */
  forecast?: { hours: HourPoint[]; days: DayPoint[] };
}

export interface Grammar {
  [symbol: string]: string[];
}

export interface WeatherCacheEntry {
  key: string;
  fetchedAt: number;
  snapshot: WeatherSnapshot;
}
