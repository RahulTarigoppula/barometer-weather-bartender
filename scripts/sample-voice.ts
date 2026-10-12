// npx tsx scripts/sample-voice.ts mumbai 1000 — how many distinct jabs does the bartender have for a fixture?
import { judge } from '../src/engine/index';
import { DRINKS, FIXTURES, type FixtureName, GRAMMAR, geoIndex, loadFixture } from '../src/test/helpers';

const name = (process.argv[2] ?? 'mumbai') as FixtureName;
const n = Number(process.argv[3] ?? 1000);
if (!FIXTURES.includes(name)) throw new Error(`unknown fixture ${name}`);
const f = loadFixture(name);
const place = geoIndex().locate(f.lat, f.lng);
const jabs = new Map<string, number>();
for (let i = 0; i < n; i++) {
  const v = judge({
    now: f.now,
    lat: f.lat + (i % 40) * 0.1,
    lng: f.lng + Math.floor(i / 40) * 0.1,
    snapshot: f.snapshot,
    place,
    menu: 'bar',
    drinks: DRINKS,
    grammar: GRAMMAR,
    settings: { gentler: false },
  });
  jabs.set(v.lines.jab, (jabs.get(v.lines.jab) ?? 0) + 1);
}
const top = [...jabs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
console.log(`${name}: ${jabs.size} distinct jabs over ${n} verdicts`);
for (const [line, count] of top) console.log(`  ${String(count).padStart(3)} × ${line}`);
