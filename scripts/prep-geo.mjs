// Natural Earth GeoJSON (raw/, git-ignored) → public/geo/* (committed).
// Idempotent: re-running it on the same raw files produces byte-identical output.
// Sources: https://github.com/nvkelso/natural-earth-vector (public domain). See raw/SOURCES.txt.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { geoArea, geoBounds, geoContains } from 'd3-geo';

const RAW = 'raw';
const OUT = 'public/geo';
mkdirSync(OUT, { recursive: true });

const read = (f) => JSON.parse(readFileSync(`${RAW}/${f}`, 'utf8'));
const r4 = (n) => Math.round(n * 1e4) / 1e4;
const r2 = (n) => Math.round(n * 100) / 100;

/** Round coordinates to `dp` decimals and drop consecutive duplicates. */
function roundGeometry(geom, round) {
  const ring = (r) => {
    const out = [];
    for (const [x, y] of r) {
      const p = [round(x), round(y)];
      const last = out[out.length - 1];
      if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p);
    }
    return out;
  };
  if (geom.type === 'Polygon') return { type: 'Polygon', coordinates: geom.coordinates.map(ring) };
  if (geom.type === 'MultiPolygon') {
    return { type: 'MultiPolygon', coordinates: geom.coordinates.map((poly) => poly.map(ring)) };
  }
  throw new Error(`unexpected geometry ${geom.type}`);
}

/** d3-geo uses spherical winding: a polygon whose area exceeds 2π is inside-out. */
function rewind(feature) {
  if (geoArea(feature) > 2 * Math.PI) {
    const g = feature.geometry;
    if (g.type === 'Polygon') g.coordinates = g.coordinates.map((r) => r.slice().reverse());
    else g.coordinates = g.coordinates.map((poly) => poly.map((r) => r.slice().reverse()));
  }
  // Rewind each polygon of a MultiPolygon independently too.
  if (feature.geometry.type === 'MultiPolygon') {
    feature.geometry.coordinates = feature.geometry.coordinates.map((poly) => {
      const f = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: poly } };
      return geoArea(f) > 2 * Math.PI ? poly.map((r) => r.slice().reverse()) : poly;
    });
  }
  return feature;
}

const bbox = (f) => geoBounds(f).flat().map(r4);

function iso2(p) {
  for (const k of ['ISO_A2', 'ISO_A2_EH', 'WB_A2']) {
    const v = p[k];
    if (typeof v === 'string' && /^[A-Z]{2}$/.test(v)) return v;
  }
  return '??';
}

function countries(file, round) {
  const fc = read(file);
  const features = fc.features
    .map((f) => {
      const p = f.properties;
      const feat = rewind({ type: 'Feature', properties: {}, geometry: roundGeometry(f.geometry, round) });
      feat.properties = {
        ADMIN: p.ADMIN,
        NAME: p.NAME,
        ISO_A2: iso2(p),
        CONTINENT: p.CONTINENT,
        SUBREGION: p.SUBREGION,
      };
      feat.bbox = bbox(feat);
      return feat;
    })
    .sort((a, b) => a.properties.ADMIN.localeCompare(b.properties.ADMIN));
  return { type: 'FeatureCollection', features };
}

const c110 = countries('ne_110m_admin_0_countries.geojson', r2);
const c50 = countries('ne_50m_admin_0_countries.geojson', r2);

// Smoke assertions, the most likely silent bug is an inside-out polygon.
const find = (fc, iso) => fc.features.find((f) => f.properties.ISO_A2 === iso);
for (const fc of [c110, c50]) {
  if (!geoContains(find(fc, 'IN'), [72.88, 19.07])) throw new Error('IN must contain Mumbai');
  if (geoContains(find(fc, 'RU'), [72.88, 19.07])) throw new Error('RU must not contain Mumbai');
  if (!geoContains(find(fc, 'LS'), [28.2, -29.6])) throw new Error('LS must contain Maseru');
}

// Populated places → the nearest-town index.
const places = read('ne_10m_populated_places_simple.geojson')
  .features.map((f) => {
    const p = f.properties;
    const [lng, lat] = f.geometry.coordinates;
    return {
      name: p.name,
      adm0name: p.adm0name,
      iso_a2: /^[A-Z]{2}$/.test(p.iso_a2 ?? '') ? p.iso_a2 : '??',
      lat: r4(lat),
      lng: r4(lng),
      pop_max: p.pop_max ?? 0,
      featurecla: p.featurecla,
    };
  })
  .sort((a, b) => b.pop_max - a.pop_max || a.name.localeCompare(b.name));

// Marine polygons, names like "Arabian Sea", "Caspian Sea", "North Pacific Ocean".
const marine = {
  type: 'FeatureCollection',
  features: read('ne_50m_geography_marine_polys.geojson')
    .features.filter((f) => f.geometry && f.properties.name)
    .map((f) => {
      const feat = rewind({
        type: 'Feature',
        properties: { name: f.properties.name, featurecla: f.properties.featurecla },
        geometry: roundGeometry(f.geometry, r2),
      });
      feat.bbox = bbox(feat);
      return feat;
    })
    // Smaller water bodies first, so a gulf inside a sea wins over the sea.
    .sort((a, b) => geoArea(a) - geoArea(b) || a.properties.name.localeCompare(b.properties.name)),
};

// Land outline at 110m, rounded hard, used by the canvas fallback globe and the receipt's dotted globe.
const land = read('ne_110m_land.geojson').features.map((f) =>
  roundGeometry(f.geometry, (n) => Math.round(n * 10) / 10),
);
const landRings = [];
for (const g of land) {
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  for (const poly of polys) landRings.push(poly[0]);
}
// Land dots: an equirectangular grid sampled every 3°, kept where it falls on land.
const landFC = {
  type: 'FeatureCollection',
  features: land.map((geometry) => rewind({ type: 'Feature', properties: {}, geometry })),
};
const dots = [];
for (let lat = -84; lat <= 84; lat += 3) {
  for (let lng = -180; lng < 180; lng += 3) {
    if (landFC.features.some((f) => geoContains(f, [lng + 1.5, lat]))) dots.push([lng + 1.5, lat]);
  }
}

const write = (name, data) => {
  const text = JSON.stringify(data);
  writeFileSync(`${OUT}/${name}`, text);
  const gz = gzipSync(text).length;
  console.log(
    `${name.padEnd(22)} ${(text.length / 1024).toFixed(0).padStart(6)} KB  gzip ${(gz / 1024).toFixed(0).padStart(5)} KB`,
  );
  return gz;
};

let core = 0;
core += write('countries-110m.json', c110);
write('countries-50m.json', c50);
core += write('places.json', places);
core += write('marine-50m.json', marine);
write('land-110m.json', landRings);
write('land-dots.json', dots);

// India's outline for the globe, from Natural Earth's India point-of-view dataset (official boundaries).
// Rings of the largest polygons only, decimated to ~0.08° steps so the line stays crisp but light.
const ind = read('ne_10m_admin_0_countries_ind.geojson').features.find(
  (f) => f.properties.ADM0_A3 === 'IND' || f.properties.ISO_A2 === 'IN',
);
if (!ind) throw new Error('India not found in the IND point-of-view file');
const polys = ind.geometry.type === 'Polygon' ? [ind.geometry.coordinates] : ind.geometry.coordinates;
const outline = polys
  .map((poly) => poly[0])
  .filter((ringPts) => ringPts.length > 40)
  .map((ringPts) => {
    const out = [];
    for (const [x, y] of ringPts) {
      const p = [r2(x), r2(y)];
      const last = out[out.length - 1];
      if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) >= 0.08) out.push(p);
    }
    out.push(out[0]);
    return out;
  });
write('india-outline.json', outline);
console.log(`core geo gzip total ${(core / 1024).toFixed(0)} KB (budget 900 KB)`);
if (core > 900 * 1024) throw new Error('geo budget exceeded');
