import type { Drink, Verdict } from './types';
import { fmtCoords, fmtTemp, type Units, windLabel, windValue } from './units';
import { wmoLabel } from './wmo';

export const RECEIPT_WIDTH = 32;

export type ReceiptLine =
  | { kind: 'head'; text: string }
  | { kind: 'text'; text: string }
  | { kind: 'row'; label: string; value: string }
  | { kind: 'rule' }
  | { kind: 'globe' };

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** "2026-09-06" → "06 SEP 2026" */
export function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d} ${MONTHS[Number(m) - 1] ?? '???'} ${y}`;
}

/** Hard-wrap at the thermal width, breaking on spaces where possible. */
export function wrap(text: string, width = RECEIPT_WIDTH): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (word.length > width) {
      if (line) out.push(line);
      for (let i = 0; i < word.length; i += width) out.push(word.slice(i, i + width));
      line = '';
      continue;
    }
    const next = line ? `${line} ${word}` : word;
    if (next.length > width) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

const row = (label: string, value: string): ReceiptLine => {
  const room = RECEIPT_WIDTH - value.length - 1;
  return { kind: 'row', label: label.slice(0, Math.max(0, room)), value };
};

/** The register receipt. Every printed line is ≤ 32 characters (a property test covers every fixture). */
export function receiptLines(v: Verdict, drink: Drink, units: Units, stampText: string): ReceiptLine[] {
  const f = v.features;
  const t = (c: number): string => fmtTemp(c, units.temp);
  const lines: ReceiptLine[] = [
    { kind: 'head', text: 'MAUSAM KA MAHAUL' },
    ...wrap(v.place.short).map((text): ReceiptLine => ({ kind: 'text', text })),
    { kind: 'text', text: fmtCoords(v.lat, v.lng) },
    { kind: 'text', text: `${fmtDate(f.localDate)} · ${v.localTime} LOCAL` },
    { kind: 'globe' },
    { kind: 'rule' },
    row('APPARENT', t(f.apparentC)),
    row('DEW POINT', t(f.dewPointC)),
    row('WIND', `${windValue(f.windKmh, units.wind)} ${windLabel(units.wind).toUpperCase()}`),
    row('UV', String(Math.round(f.uv))),
    row('AQI (US)', f.usAqi === null ? '—' : String(Math.round(f.usAqi))),
  ];
  if (f.marine) {
    lines.push(row('SST', t(f.marine.sstC)), row('WAVES', `${f.marine.waveHeightM.toFixed(1)} M`));
  }
  lines.push(
    ...wrap(`SKY ${wmoLabel(f.wmo).toUpperCase()}`).map((text): ReceiptLine => ({ kind: 'text', text })),
    { kind: 'rule' },
    ...wrap(`${stampText} ${drink.name.toUpperCase()}`).map((text): ReceiptLine => ({ kind: 'head', text })),
    { kind: 'rule' },
    { kind: 'text', text: 'WEATHER BY OPEN-METEO.COM' },
  );
  const credits = [v.sources.air ? 'CAMS' : '', v.sources.marine ? 'DWD' : '', 'NASA', 'NATURAL EARTH']
    .filter(Boolean)
    .join(' · ');
  lines.push(...wrap(credits).map((text): ReceiptLine => ({ kind: 'text', text })));
  return lines;
}

export const lineText = (l: ReceiptLine): string =>
  l.kind === 'row'
    ? `${l.label}${' '.repeat(Math.max(1, RECEIPT_WIDTH - l.label.length - l.value.length))}${l.value}`
    : l.kind === 'head' || l.kind === 'text'
      ? l.text
      : '';
