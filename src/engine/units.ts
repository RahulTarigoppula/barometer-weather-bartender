import { cToF } from './comfort';

export type TempUnit = 'C' | 'F';
export type WindUnit = 'kmh' | 'mph' | 'kn';
export interface Units {
  temp: TempUnit;
  wind: WindUnit;
}
export const METRIC: Units = { temp: 'C', wind: 'kmh' };

const MINUS = '−';

/** Real minus sign, never a hyphen. "−0.0" collapses to "0.0". */
export function signed(n: number, dp: number): string {
  const s = n.toFixed(dp);
  if (/^-0(\.0+)?$/.test(s)) return s.slice(1);
  return s.replace('-', MINUS);
}

export const fmtTemp = (c: number, unit: TempUnit = 'C'): string => `${signed(unit === 'F' ? cToF(c) : c, 1)}°`;

/** Whole degrees, for compact places like the Tab row. */
export const fmtTempShort = (c: number, unit: TempUnit = 'C'): string => `${signed(unit === 'F' ? cToF(c) : c, 0)}°`;

export const windValue = (kmh: number, unit: WindUnit = 'kmh'): number =>
  Math.round(unit === 'mph' ? kmh / 1.609344 : unit === 'kn' ? kmh / 1.852 : kmh);

export const windLabel = (unit: WindUnit): string => (unit === 'mph' ? 'mph' : unit === 'kn' ? 'kn' : 'km/h');

export const fmtWind = (kmh: number, unit: WindUnit = 'kmh'): string => `${windValue(kmh, unit)} ${windLabel(unit)}`;

/** "19.07N 72.88E" */
export function fmtCoords(lat: number, lng: number): string {
  return `${Math.abs(lat).toFixed(2)}${lat >= 0 ? 'N' : 'S'} ${Math.abs(lng).toFixed(2)}${lng >= 0 ? 'E' : 'W'}`;
}
