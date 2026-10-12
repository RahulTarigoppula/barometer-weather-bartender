const RAD = Math.PI / 180;

/**
 * The subsolar point [lng, lat] — where the sun is overhead right now. Drives the globe's
 * day/night terminator. Low-precision solar coordinates (±0.3°), plenty for a lit planet.
 */
export function subsolar(now: Date): [number, number] {
  const d = now.getTime() / 86_400_000 - 10_957.5; // days since J2000.0
  const g = (357.529 + 0.98560028 * d) * RAD; // mean anomaly
  const q = 280.459 + 0.98564736 * d; // mean longitude (deg)
  const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD; // ecliptic longitude
  const e = (23.439 - 0.00000036 * d) * RAD; // obliquity
  const dec = Math.asin(Math.sin(e) * Math.sin(L)) / RAD;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)) / RAD;
  const eqTimeMin = 4 * ((((q - ra + 180) % 360) + 360) % 360) - 4 * 180; // equation of time, minutes
  const utcHours = (now.getTime() % 86_400_000) / 3_600_000;
  const lng = -15 * (utcHours - 12 + eqTimeMin / 60);
  return [((((lng + 180) % 360) + 360) % 360) - 180, dec];
}
