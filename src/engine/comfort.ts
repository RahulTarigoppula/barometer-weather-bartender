export const cToF = (c: number): number => (c * 9) / 5 + 32;
export const fToC = (f: number): number => ((f - 32) * 5) / 9;
export const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

export interface HeatIndexResult {
  hiF: number;
  hiC: number;
  applies: boolean;
  adjustment: number;
}

/** NWS / Rothfusz heat index. Below a simple index of 80 °F it does not apply and the simple value is returned. */
export function heatIndex(tempC: number, rh: number): HeatIndexResult {
  const T = cToF(tempC);
  const simple = 0.5 * (T + 61 + 1.2 * (T - 68) + 0.094 * rh);
  if (simple < 80) return { hiF: simple, hiC: fToC(simple), applies: false, adjustment: 0 };
  let HI =
    -42.379 +
    2.04901523 * T +
    10.14333127 * rh -
    0.22475541 * T * rh -
    0.00683783 * T * T -
    0.05481717 * rh * rh +
    0.00122874 * T * T * rh +
    0.00085282 * T * rh * rh -
    0.00000199 * T * T * rh * rh;
  let adjustment = 0;
  if (rh < 13 && T >= 80 && T <= 112) {
    adjustment = -((13 - rh) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
  } else if (rh > 85 && T >= 80 && T <= 87) {
    adjustment = ((rh - 85) / 10) * ((87 - T) / 5);
  }
  HI += adjustment;
  return { hiF: HI, hiC: fToC(HI), applies: true, adjustment };
}

/** Canadian humidex from air temperature and dew point (°C). A dew point above the air temperature is flagged. */
export function humidex(tempC: number, dewC: number): { value: number; suspicious: boolean } {
  const e = 6.11 * Math.exp(5417.753 * (1 / 273.16 - 1 / (273.15 + dewC)));
  const value = tempC + 0.5555 * (e - 10);
  const suspicious = dewC > tempC;
  return { value: suspicious ? Math.max(tempC, value) : value, suspicious };
}

/** JAG/TI 2001 wind chill. null when T > 10 °C or v ≤ 4.8 km/h. */
export function windChill(tempC: number, windKmh: number): number | null {
  if (tempC > 10 || windKmh <= 4.8) return null;
  const v = windKmh ** 0.16;
  return 13.12 + 0.6215 * tempC - 11.37 * v + 0.3965 * tempC * v;
}

/** Magnus dew point — used only when the API omits dew_point_2m. */
export function dewPoint(tempC: number, rh: number): number | null {
  if (rh <= 0) return null;
  if (rh >= 100) return tempC;
  const g = Math.log(rh / 100) + (17.62 * tempC) / (243.12 + tempC);
  return (243.12 * g) / (17.62 - g);
}

const BEAUFORT = [1, 5, 11, 19, 28, 38, 49, 61, 74, 88, 102, 117];
export function beaufort(kmh: number): number {
  const i = BEAUFORT.findIndex((u) => kmh <= u);
  return i === -1 ? 12 : i;
}

export type UvBand = 'low' | 'moderate' | 'high' | 'very-high' | 'extreme';
export const uvBand = (uv: number): UvBand =>
  uv < 3 ? 'low' : uv < 6 ? 'moderate' : uv < 8 ? 'high' : uv < 11 ? 'very-high' : 'extreme';

export type AqiBand = 'unknown' | 'good' | 'fair' | 'moderate' | 'poor' | 'very-poor' | 'extremely-poor';
export const euAqiBand = (a: number | null): AqiBand =>
  a === null
    ? 'unknown'
    : a < 20
      ? 'good'
      : a < 40
        ? 'fair'
        : a < 60
          ? 'moderate'
          : a < 80
            ? 'poor'
            : a <= 100
              ? 'very-poor'
              : 'extremely-poor';
