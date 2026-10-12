export type WmoKind =
  | 'clear'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'freezing-drizzle'
  | 'rain'
  | 'downpour'
  | 'freezing-rain'
  | 'snow'
  | 'heavy-snow'
  | 'snow-grains'
  | 'showers'
  | 'snow-showers'
  | 'heavy-snow-showers'
  | 'storm'
  | 'hail'
  | 'unknown';

const TABLE: Record<number, WmoKind> = {
  0: 'clear',
  1: 'cloudy',
  2: 'cloudy',
  3: 'cloudy',
  45: 'fog',
  48: 'fog',
  51: 'drizzle',
  53: 'drizzle',
  55: 'drizzle',
  56: 'freezing-drizzle',
  57: 'freezing-drizzle',
  61: 'rain',
  63: 'rain',
  65: 'downpour',
  66: 'freezing-rain',
  67: 'freezing-rain',
  71: 'snow',
  73: 'snow',
  75: 'heavy-snow',
  77: 'snow-grains',
  80: 'showers',
  81: 'showers',
  82: 'downpour',
  85: 'snow-showers',
  86: 'heavy-snow-showers',
  95: 'storm',
  96: 'hail',
  99: 'hail',
};

/** Never throws: anything outside the WMO 4677 subset Open-Meteo uses is 'unknown'. */
export const wmoKind = (code: number): WmoKind => TABLE[code] ?? 'unknown';

const LABEL: Record<number, string> = {
  0: 'clear sky',
  1: 'mainly clear',
  2: 'partly cloudy',
  3: 'overcast',
  45: 'fog',
  48: 'rime fog',
  51: 'light drizzle',
  53: 'drizzle',
  55: 'dense drizzle',
  56: 'freezing drizzle',
  57: 'freezing drizzle',
  61: 'light rain',
  63: 'rain',
  65: 'heavy rain',
  66: 'freezing rain',
  67: 'freezing rain',
  71: 'light snow',
  73: 'snow',
  75: 'heavy snow',
  77: 'snow grains',
  80: 'rain showers',
  81: 'rain showers',
  82: 'violent showers',
  85: 'snow showers',
  86: 'heavy snow showers',
  95: 'thunderstorm',
  96: 'storm with hail',
  99: 'storm with heavy hail',
};
export const wmoLabel = (code: number): string => LABEL[code] ?? 'unclassified sky';
