import { type ReactElement, useEffect, useState } from 'react';
import { type CityNow, fetchIndiaNow } from '../../api/india';
import { unlockAudio } from '../../audio/sfx';
import { fmtTempShort } from '../../engine/units';
import { wmoLabel } from '../../engine/wmo';
import { useSettings } from '../../state/settings';
import { useBar } from '../../state/store';
import { pour } from '../verdict/pour';
import { iconFor } from '../weather/icons';

const aqiTone = (a: number | null): string =>
  a === null
    ? 'unknown'
    : a <= 50
      ? 'good'
      : a <= 100
        ? 'moderate'
        : a <= 150
          ? 'poor'
          : a <= 200
            ? 'very-poor'
            : 'extremely-poor';

const by = <T,>(xs: T[], f: (x: T) => number): T | undefined =>
  xs.reduce<T | undefined>((a, b) => (a === undefined || f(b) > f(a) ? b : a), undefined);

/** Twelve Indian cities in two requests, refreshed every 15 minutes. Tap one to pour it. */
export function IndiaNow(): ReactElement | null {
  const temp = useSettings((s) => s.units.temp);
  const online = useBar((s) => s.online);
  const [rows, setRows] = useState<CityNow[] | null>(null);

  useEffect(() => {
    if (!online) return;
    let alive = true;
    const load = (): void => {
      fetchIndiaNow()
        .then((r) => {
          if (!alive) return;
          setRows(r);
          useBar.getState().patch({ cityTemps: Object.fromEntries(r.map((c) => [c.name, c.tempC])) });
        })
        .catch(() => undefined);
    };
    load();
    const t = window.setInterval(load, 15 * 60_000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [online]);

  if (!rows || rows.length === 0) return null;
  const hottest = by(rows, (c) => c.apparentC ?? c.tempC);
  const coolest = by(rows, (c) => -(c.apparentC ?? c.tempC));
  const smoggiest = by(
    rows.filter((c) => c.usAqi !== null),
    (c) => c.usAqi ?? 0,
  );
  const badge = (c: CityNow): string | null =>
    c === hottest
      ? 'Hottest'
      : c === coolest
        ? 'Coolest'
        : c === smoggiest && (c.usAqi ?? 0) > 100
          ? 'Worst air'
          : null;

  return (
    <section className="card india" aria-label="India right now">
      <p className="eyebrow">India right now</p>
      <ul className="india__grid">
        {rows.map((c) => {
          const Icon = iconFor(c.wmo, c.isDay);
          const b = badge(c);
          return (
            <li key={c.name}>
              <button
                type="button"
                className="city"
                onClick={() => {
                  unlockAudio();
                  void pour(c.lat, c.lng, c.name);
                }}
                aria-label={`${c.name}: ${fmtTempShort(c.tempC, temp)}, ${wmoLabel(c.wmo)}${c.usAqi === null ? '' : `, US AQI ${Math.round(c.usAqi)}`}`}
              >
                <span className="city__name">{c.name}</span>
                <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                <span className="city__t num">{fmtTempShort(c.tempC, temp)}</span>
                {c.usAqi !== null && (
                  <span className="city__aqi num" data-tone={aqiTone(c.usAqi)}>
                    AQI {Math.round(c.usAqi)}
                  </span>
                )}
                {b && <span className="city__badge">{b}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="credit">Open-Meteo · CAMS air quality (US AQI) · refreshed every 15 minutes</p>
    </section>
  );
}
