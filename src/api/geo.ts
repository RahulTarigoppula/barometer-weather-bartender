import { type CountryFeature, createGeoIndex, type GeoData, type GeoIndex } from '../engine/geocode';

const base = import.meta.env.BASE_URL;
let ready: Promise<GeoIndex> | null = null;

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${base}${path}`);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

/** Natural Earth, offline: precached by the service worker, loaded once, never re-fetched. */
export function loadGeo(): Promise<GeoIndex> {
  if (!ready) {
    ready = Promise.all([
      getJson<GeoData['countries']>('geo/countries-110m.json'),
      getJson<GeoData['places']>('geo/places.json'),
      getJson<GeoData['marine']>('geo/marine-50m.json'),
    ])
      .then(([countries, places, marine]) => createGeoIndex({ countries, places, marine }))
      .catch((e: unknown) => {
        ready = null;
        throw e;
      });
  }
  return ready;
}

let finer = false;
/** After the first verdict, swap in the 50 m coastlines in the background. */
export function upgradeCoastlines(): void {
  if (finer) return;
  finer = true;
  void Promise.all([loadGeo(), getJson<{ features: CountryFeature[] }>('geo/countries-50m.json')])
    .then(([geo, fine]) => geo.setCountries(fine))
    .catch(() => {
      finer = false;
    });
}

let dots: Promise<[number, number][]> | null = null;
export function loadDots(): Promise<[number, number][]> {
  dots ??= getJson<[number, number][]>('geo/land-dots.json');
  return dots;
}

let india: Promise<[number, number][][]> | null = null;
/** India's outline (Natural Earth, India point of view) for the globe. */
export function loadIndiaOutline(): Promise<[number, number][][]> {
  india ??= getJson<[number, number][][]>('geo/india-outline.json');
  return india;
}

let land: Promise<[number, number][][]> | null = null;
export function loadLand(): Promise<[number, number][][]> {
  land ??= getJson<[number, number][][]>('geo/land-110m.json');
  return land;
}
