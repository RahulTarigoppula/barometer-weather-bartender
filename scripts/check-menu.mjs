// Asserts the bar menu's shape rules without a test runner (CI runs it before the unit suite).
import { readFileSync } from 'node:fs';

const menu = JSON.parse(readFileSync('src/data/bar-menu.json', 'utf8'));
const TAGS =
  'scorching hot warm mild chilly cold freezing arctic muggy oppressive bone-dry drizzle rain downpour snow blizzard hail storm fog still breezy gale uv-extreme smog dust dawn morning brunch afternoon golden evening late ocean polar'.split(
    ' ',
  );
const GLASSES = 'rocks highball coupe mug copper-mug tiki flute pint teacup'.split(' ');
const BOTTLES = 'rum gin whisky tequila vodka vermouth bitters syrup tea cocoa ginger-beer mint'.split(' ');
const errors = [];
const ids = new Set(menu.map((d) => d.id));

if (menu.filter((d) => d.alcoholic).length !== 20) errors.push('need exactly 20 cocktails');
if (menu.filter((d) => !d.alcoholic).length !== 20) errors.push('need exactly 20 mocktails');
if (ids.size !== menu.length) errors.push('duplicate ids');
const claimed = new Set();
for (const d of menu) {
  if (!GLASSES.includes(d.glass)) errors.push(`${d.id}: glass ${d.glass}`);
  if (!BOTTLES.includes(d.bottle)) errors.push(`${d.id}: bottle ${d.bottle}`);
  if (!['cubes', 'crushed', 'none'].includes(d.ice)) errors.push(`${d.id}: ice ${d.ice}`);
  for (const [t, v] of Object.entries(d.affinity)) {
    if (!TAGS.includes(t)) errors.push(`${d.id}: unknown tag ${t}`);
    if (!Number.isInteger(v) || v < 0 || v > 8) errors.push(`${d.id}: affinity ${t}=${v}`);
  }
  if (d.alcoholic) {
    const twin = menu.find((x) => x.id === d.virginTwin);
    if (!twin || twin.alcoholic) errors.push(`${d.id}: twin ${d.virginTwin}`);
    if (claimed.has(d.virginTwin)) errors.push(`${d.id}: twin claimed twice`);
    claimed.add(d.virginTwin);
  }
}
let min = Infinity;
for (const t of TAGS) {
  const n = menu.filter((d) => (d.affinity[t] ?? 0) >= 3).length;
  min = Math.min(min, n);
  if (n < 3) errors.push(`tag ${t} has only ${n} drinks at affinity ≥ 3`);
}
for (const g of GLASSES) if (!menu.some((d) => d.glass === g)) errors.push(`glass ${g} unused`);
for (const b of BOTTLES) if (!menu.some((d) => d.bottle === b)) errors.push(`bottle ${b} never nods`);

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`✓ ${menu.length} drinks, every twin resolves, every tag covered (min ${min} drinks at affinity ≥ 3)`);
