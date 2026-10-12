// raw/ textures (git-ignored) → public/textures/ (committed). Requires sharp (dev only).
// Day:   three-globe example `earth-day.jpg` (first paint, copied as-is) and `earth-blue-marble.jpg`
//        (NASA Blue Marble, via the MIT three-globe repo) → 4K WebP.
// Night: NASA Black Marble 2016 (public domain, NASA Earth Observatory) → 4K / 8K WebP.
import { copyFileSync, mkdirSync, statSync } from 'node:fs';
import sharp from 'sharp';

const OUT = 'public/textures';
mkdirSync(OUT, { recursive: true });

const jobs = [
  ['raw/earth-blue-marble.jpg', 'blue-marble-4k.webp', 4096],
  ['raw/BlackMarble_2016_3km.jpg', 'black-marble-4k.webp', 4096],
  ['raw/BlackMarble_2016_3km.jpg', 'black-marble-8k.webp', 8192],
];

for (const [src, name, width] of jobs) {
  await sharp(src, { limitInputPixels: false })
    .resize({ width, height: width / 2, fit: 'fill' })
    .webp({ quality: 82, effort: 6 })
    .toFile(`${OUT}/${name}`);
}
for (const f of ['earth-day.jpg', 'earth-topology.png', 'earth-water.png']) copyFileSync(`raw/${f}`, `${OUT}/${f}`);

let total = 0;
for (const f of ['earth-day.jpg', 'earth-topology.png', 'earth-water.png', ...jobs.map((j) => j[1])]) {
  const kb = statSync(`${OUT}/${f}`).size / 1024;
  total += kb;
  console.log(`${f.padEnd(24)} ${kb.toFixed(0).padStart(6)} KB`);
  if (f.endsWith('.webp') && kb > 3 * 1024) throw new Error(`${f} exceeds 3 MB`);
}
console.log(`total ${(total / 1024).toFixed(2)} MB (budget 10 MB)`);
