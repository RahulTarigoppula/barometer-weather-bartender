import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import attribution from './attribution.json';

const readme = readFileSync(fileURLToPath(new URL('../../README.md', import.meta.url)), 'utf8');

describe('attribution: attribution.json ↔ README ↔ #/about', () => {
  it('every attribution row appears in the README table with the same licence', () => {
    const table = readme.slice(readme.indexOf('## Attribution'));
    for (const a of attribution) {
      const line = table.split('\n').find((l) => l.startsWith('|') && l.includes(a.name));
      expect(line, a.name).toBeDefined();
      expect(line, a.name).toContain(a.licence);
    }
  });
  it('the README table has no rows the app does not show', () => {
    const table = readme.slice(readme.indexOf('## Attribution'));
    const rows = table
      .split('\n')
      .filter((l) => /^\| [^-|]/.test(l))
      .slice(1); // header
    expect(rows).toHaveLength(attribution.length);
  });
  it('the About screen renders straight from attribution.json', () => {
    const about = readFileSync(fileURLToPath(new URL('../features/about/About.tsx', import.meta.url)), 'utf8');
    expect(about).toContain("from '../../data/attribution.json'");
  });
});
