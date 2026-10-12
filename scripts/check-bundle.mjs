// The §10.8 budget gate. Run after `npm run build`; exits 1 on any breach.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = 'dist';
const KB = 1024;
const MB = 1024 * KB;
const gz = (file) => gzipSync(readFileSync(join(DIST, file))).length;
const fails = [];
const report = (name, value, limit, unit = KB) => {
  const ok = value <= limit;
  console.log(
    `${ok ? '✓' : '✗'} ${name.padEnd(40)} ${(value / unit).toFixed(1).padStart(8)} / ${(limit / unit).toFixed(0)} ${unit === KB ? 'KB' : 'MB'}`,
  );
  if (!ok) fails.push(name);
};

// Initial JS: the entry script plus everything it modulepreloads (the globe chunk is lazy and excluded).
const html = readFileSync(join(DIST, 'index.html'), 'utf8');
const initial = new Set();
for (const m of html.matchAll(/<(?:script[^>]+src|link[^>]+rel="modulepreload"[^>]+href)="([^"]+\.js)"/g)) {
  initial.add(m[1].replace(/^.*\/assets\//, 'assets/'));
}
if (initial.size === 0) throw new Error('no entry script found in dist/index.html');
let initialGz = 0;
for (const f of initial) initialGz += gz(f);
report('initial JS (gzip)', initialGz, 180 * KB);

const assets = readdirSync(join(DIST, 'assets'));
const globe = assets.filter((f) => /^globeThree-.*\.js$/.test(f));
if (globe.length !== 1) throw new Error(`expected one globe chunk, found ${globe.length}`);
report('globe chunk (gzip, lazy)', gz(`assets/${globe[0]}`), 320 * KB);

const geoCore = ['countries-110m.json', 'places.json', 'marine-50m.json'].reduce((n, f) => n + gz(`geo/${f}`), 0);
report('geo core data (gzip)', geoCore, 900 * KB);
report('geo 50 m countries (gzip, lazy)', gz('geo/countries-50m.json'), 1200 * KB);

report('first-paint texture earth-day.jpg', statSync(join(DIST, 'textures/earth-day.jpg')).size, 260 * KB);
let textures = 0;
for (const f of readdirSync(join(DIST, 'textures'))) {
  const size = statSync(join(DIST, 'textures', f)).size;
  textures += size;
  if (f.endsWith('.webp')) report(`texture ${f}`, size, 3 * MB, MB);
}
report('all textures', textures, 10 * MB, MB);

// Precache: every URL in the Workbox manifest.
const sw = readFileSync(join(DIST, 'sw.js'), 'utf8');
let precache = 0;
for (const m of sw.matchAll(/url:"([^"]+)"/g)) {
  try {
    precache += statSync(join(DIST, m[1])).size;
  } catch {
    // navigation fallbacks etc.
  }
}
report('precache total', precache, 12 * MB, MB);
if (/textures\/[^"]+\.webp/.test(sw.match(/precacheAndRoute\(\[[\s\S]*?\]/)?.[0] ?? '')) fails.push('webp in precache');

const walk = (d) =>
  readdirSync(d).reduce((n, f) => {
    const p = join(d, f);
    return n + (statSync(p).isDirectory() ? walk(p) : statSync(p).size);
  }, 0);
report('total dist/', walk(DIST), 25 * MB, MB);

// Privacy / licence strings that must never ship.
const banned =
  /bigdatacloud|api-bdc\.io|thecocktaildb|timeapi\.io|planetpixelemporium|teijo\/iba-cocktails|AIza[0-9A-Za-z_-]{30,}|sk-[A-Za-z0-9]{20,}/;
for (const f of assets.filter((a) => a.endsWith('.js'))) {
  if (banned.test(readFileSync(join(DIST, 'assets', f), 'utf8'))) fails.push(`banned string in ${f}`);
}

if (fails.length) {
  console.error(`\nBudget breached: ${fails.join(', ')}`);
  process.exit(1);
}
console.log('\nAll budgets held.');
