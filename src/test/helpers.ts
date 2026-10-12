import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalise } from '../api/openMeteo';
import rawMenu from '../data/bar-menu.json';
import { type CountryFeature, createGeoIndex, type GeoIndex, type MarineFeature, type Place } from '../engine/geocode';
import { judge } from '../engine/index';
import { parseMenu } from '../engine/menu';
import type { Grammar, Menu, Verdict, WeatherSnapshot } from '../engine/types';
import voice from '../wit/grammar/voice.json';

export const FIXTURES = [
  'mumbai',
  'yakutsk',
  'reykjavik',
  'dubai-noon',
  'arabian-sea',
  'south-pole',
  'denver-hail',
  'lisbon-golden',
  'oslo-brunch',
] as const;
export type FixtureName = (typeof FIXTURES)[number];

export const DRINKS = parseMenu(rawMenu);
export const GRAMMAR: Grammar = voice;

const root = fileURLToPath(new URL('../..', import.meta.url));
const readJson = (p: string): unknown => JSON.parse(readFileSync(join(root, p), 'utf8'));

interface RawFixture {
  forecast: { latitude: number; longitude: number; utc_offset_seconds: number; current: { time: string } };
  airQuality: unknown;
  marine?: unknown;
}
function isRawFixture(x: unknown): x is RawFixture {
  return typeof x === 'object' && x !== null && 'forecast' in x;
}

export function rawFixture(name: FixtureName): RawFixture {
  const raw = readJson(`src/test/fixtures/openmeteo/${name}.json`);
  if (!isRawFixture(raw)) throw new Error(`bad fixture ${name}`);
  return raw;
}

/** The instant the fixture's local `current.time` happened. */
export function nowFor(raw: RawFixture): Date {
  const t = raw.forecast.current.time;
  const local = Date.parse(`${t}:00Z`);
  return new Date(local - raw.forecast.utc_offset_seconds * 1000);
}

export interface Loaded {
  name: FixtureName;
  lat: number;
  lng: number;
  now: Date;
  snapshot: WeatherSnapshot;
}

const COORDS: Record<FixtureName, [number, number]> = {
  mumbai: [19.07, 72.88],
  yakutsk: [62.03, 129.73],
  reykjavik: [64.13, -21.9],
  'dubai-noon': [25.2, 55.27],
  'arabian-sea': [15, 65],
  'south-pole': [-89.9, 0],
  'denver-hail': [39.74, -104.99],
  'lisbon-golden': [38.72, -9.14],
  'oslo-brunch': [59.91, 10.75],
};

export function loadFixture(name: FixtureName): Loaded {
  const raw = rawFixture(name);
  const [lat, lng] = COORDS[name];
  const now = nowFor(raw);
  return {
    name,
    lat,
    lng,
    now,
    snapshot: normalise(raw.forecast, raw.airQuality, raw.marine, lat, lng, now.getTime()),
  };
}

let geo: GeoIndex | undefined;
export function geoIndex(): GeoIndex {
  if (!geo) {
    const countries = readJson('public/geo/countries-110m.json') as { features: CountryFeature[] };
    const places = readJson('public/geo/places.json') as Place[];
    const marine = readJson('public/geo/marine-50m.json') as { features: MarineFeature[] };
    geo = createGeoIndex({ countries, places, marine });
  }
  return geo;
}

export function judgeFixture(name: FixtureName, menu: Menu = 'bar', gentler = false): Verdict {
  const f = loadFixture(name);
  return judge({
    now: f.now,
    lat: f.lat,
    lng: f.lng,
    snapshot: f.snapshot,
    place: geoIndex().locate(f.lat, f.lng),
    menu,
    drinks: DRINKS,
    grammar: GRAMMAR,
    settings: { gentler },
  });
}
