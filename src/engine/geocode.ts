import { geoContains, geoDistance } from 'd3-geo';
import type { MultiPolygon, Polygon } from 'geojson';
import { around } from 'geokdbush';
import KDBush from 'kdbush';
import type { PlaceHit } from './types';

type PolygonGeometry = Polygon | MultiPolygon;
export interface CountryFeature {
  type: 'Feature';
  bbox: [number, number, number, number];
  properties: { ADMIN: string; NAME: string; ISO_A2: string; CONTINENT: string; SUBREGION: string };
  geometry: PolygonGeometry;
}
export interface MarineFeature {
  type: 'Feature';
  bbox: [number, number, number, number];
  properties: { name: string; featurecla: string };
  geometry: PolygonGeometry;
}
export interface Place {
  name: string;
  adm0name: string;
  iso_a2: string;
  lat: number;
  lng: number;
  pop_max: number;
  featurecla: string;
}
export interface GeoData {
  countries: { features: CountryFeature[] };
  places: Place[];
  marine: { features: MarineFeature[] };
}

export interface GeoIndex {
  locate(lat: number, lng: number): PlaceHit;
  /** Swap in finer coastlines (the lazy 50 m countries file) without rebuilding the place index. */
  setCountries(countries: { features: CountryFeature[] }): void;
}

const EARTH_KM = 6371;
const RADIUS_KM = 400; // C1
const COASTAL_KM = 15;

/** A bbox from d3.geoBounds may cross the antimeridian (west > east). */
export function inBBox(b: readonly number[], lng: number, lat: number): boolean {
  const [w = -180, s = -90, e = 180, n = 90] = b;
  if (lat < s || lat > n) return false;
  return w <= e ? lng >= w && lng <= e : lng >= w || lng <= e;
}

const upper = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

/** "the Arabian Sea", "the Gulf of Aden", "Hudson Bay" */
function withArticle(name: string): string {
  return /^(Gulf|Bay|Sea|Strait|Bight|Golfe|Golfo|Mar)\b/.test(name) ||
    /\b(Sea|Ocean|Gulf|Strait|Channel|Passage|Sound)$/.test(name)
    ? `the ${name}`
    : name;
}

export function createGeoIndex(data: GeoData): GeoIndex {
  let countries = data.countries.features;
  const { places } = data;
  const marine = data.marine.features;
  const index = new KDBush(places.length);
  for (const p of places) index.add(p.lng, p.lat); // NOTE: lng FIRST
  index.finish();

  function locate(lat: number, lng: number): PlaceHit {
    const pt: [number, number] = [lng, lat];
    const nearIdx = around(index, lng, lat, 1, RADIUS_KM)[0];
    const city = nearIdx === undefined ? undefined : places[nearIdx];
    const distanceKm = city ? geoDistance(pt, [city.lng, city.lat]) * EARTH_KM : Number.POSITIVE_INFINITY;
    const near = city
      ? {
          nearestCity: {
            name: city.name,
            country: city.adm0name,
            iso2: city.iso_a2,
            distanceKm,
            isCapital: city.featurecla === 'Admin-0 capital',
            pop: city.pop_max,
          },
        }
      : {};
    const polar = Math.abs(lat) >= 66.5;

    const townLabel = (admin: string): string => {
      const km = Math.round(distanceKm);
      const name = city?.name ?? '';
      return km < 3 ? `In ${name}, ${admin}` : `~${km} km from ${name}, ${admin}`;
    };

    // Precedence (C13): country polygon → coastal town → marine polygon → polar ice → open water.
    // No country polygon covers an inland sea (the Caspian at (42, 51) is not inside any of them),
    // so land-first is safe; and the coarse marine polygons overlap real coastlines, which is why a
    // point inside the sea polygon but within a few km of a town is still that town.
    const country = countries.find((c) => inBBox(c.bbox, lng, lat) && geoContains(c, pt));
    if (country) {
      const p = country.properties;
      const countryInfo = { name: p.ADMIN, iso2: p.ISO_A2, continent: p.CONTINENT, subregion: p.SUBREGION };
      if (city) {
        return {
          kind: 'land',
          polar,
          country: countryInfo,
          ...near,
          label: townLabel(p.ADMIN),
          short: upper(`${city.name}, ${p.ISO_A2 === '??' ? p.NAME : p.ISO_A2}`),
        };
      }
      return { kind: 'land', polar, country: countryInfo, label: `Somewhere in ${p.ADMIN}`, short: upper(p.NAME) };
    }

    if (city && distanceKm <= COASTAL_KM) {
      return {
        kind: 'land',
        polar,
        country: { name: city.adm0name, iso2: city.iso_a2, continent: '', subregion: '' },
        ...near,
        label: townLabel(city.adm0name),
        short: upper(`${city.name}, ${city.iso_a2 === '??' ? city.adm0name : city.iso_a2}`),
      };
    }

    const water = marine.find((m) => inBBox(m.bbox, lng, lat) && geoContains(m, pt));
    if (water) {
      const name = water.properties.name;
      return {
        kind: 'ocean',
        polar,
        water: { name, featurecla: water.properties.featurecla },
        ...near,
        label: `You are in ${withArticle(name)}`,
        short: upper(name),
      };
    }

    if (polar) {
      return {
        kind: 'ice',
        polar,
        label: lat > 0 ? 'On the Arctic ice' : 'On the Antarctic ice',
        short: lat > 0 ? 'ARCTIC ICE' : 'ANTARCTIC ICE',
      };
    }

    return {
      kind: 'ocean',
      polar,
      ...near,
      label: city ? `Open water, ~${Math.round(distanceKm)} km off ${city.name}` : 'The middle of nowhere, at sea',
      short: 'OPEN WATER',
    };
  }

  return {
    locate,
    setCountries(c) {
      countries = c.features;
    },
  };
}
