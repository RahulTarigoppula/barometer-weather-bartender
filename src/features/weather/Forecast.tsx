import { Droplets } from 'lucide-react';
import type { ReactElement } from 'react';
import { fmtDuration } from '../../engine/daypart';
import { dayName, hourLabel, sunArc, tempPath, weekRange } from '../../engine/outlook';
import type { Verdict } from '../../engine/types';
import { fmtTempShort } from '../../engine/units';
import { wmoLabel } from '../../engine/wmo';
import { useSettings } from '../../state/settings';
import { currentVerdict, useBar } from '../../state/store';
import { iconFor } from './icons';

const W = 960;
const H = 96;

function Hours({ v }: { v: Verdict }): ReactElement | null {
  const temp = useSettings((s) => s.units.temp);
  const hours = (v.forecast?.hours ?? []).slice(0, 24);
  if (hours.length < 2) return null;
  const { line, area, points } = tempPath(hours, W, H, 14);
  const every = 3;
  return (
    <section className="fc fc--hours" aria-label="Next 24 hours">
      <h3 className="h3">Next 24 hours</h3>
      <div className="hours" role="list">
        <svg className="hours__chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="hoursFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--sky)" stopOpacity="0.35" />
              <stop offset="1" stopColor="var(--sky)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#hoursFill)" />
          <path d={line} fill="none" stroke="var(--sky)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
          {points.map(([x, y], i) =>
            i % every === 0 ? <circle key={hours[i]?.time} cx={x} cy={y} r="3.5" fill="var(--sky)" /> : null,
          )}
        </svg>
        <div className="hours__cols">
          {hours.map((h, i) => {
            if (i % every !== 0) return null;
            const Icon = iconFor(h.wmo, h.isDay);
            return (
              <div key={h.time} className="hours__col" role="listitem">
                <span className="hours__t num">{fmtTempShort(h.tempC, temp)}</span>
                <Icon size={18} strokeWidth={1.75} aria-label={wmoLabel(h.wmo)} />
                <span className="hours__rain num" data-wet={h.precipProb >= 40 ? 'true' : undefined}>
                  <Droplets size={11} aria-hidden="true" /> {Math.round(h.precipProb)}%
                </span>
                <span className="hours__h num">{hourLabel(h.time, i)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Days({ v }: { v: Verdict }): ReactElement | null {
  const temp = useSettings((s) => s.units.temp);
  const days = v.forecast?.days ?? [];
  if (days.length < 2) return null;
  const { lo, hi } = weekRange(days);
  const pct = (c: number): number => ((c - lo) / (hi - lo)) * 100;
  return (
    <section className="fc fc--days" aria-label="Next 7 days">
      <h3 className="h3">Next {days.length} days</h3>
      <ul className="days">
        {days.map((d, i) => {
          const Icon = iconFor(d.wmo, true);
          return (
            <li key={d.date} className="day">
              <span className="day__name">{i === 0 ? 'Today' : dayName(d.date)}</span>
              <Icon size={18} strokeWidth={1.75} aria-label={wmoLabel(d.wmo)} />
              <span className="day__rain num" data-wet={d.precipProbMax >= 40 ? 'true' : undefined}>
                {Math.round(d.precipProbMax)}%
              </span>
              <span className="day__lo num">{fmtTempShort(d.tMinC, temp)}</span>
              <span className="day__bar" aria-hidden="true">
                <span style={{ left: `${pct(d.tMinC)}%`, right: `${100 - pct(d.tMaxC)}%` }} />
              </span>
              <span className="day__hi num">{fmtTempShort(d.tMaxC, temp)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Sun({ v }: { v: Verdict }): ReactElement | null {
  const arc = sunArc(v.features);
  if (arc.daylightMin === null) return null;
  const p = arc.progress;
  const angle = Math.PI * (1 - (p ?? 0));
  const x = 100 + Math.cos(angle) * 84;
  const y = 96 - Math.sin(angle) * 80;
  return (
    <section className="fc fc--sun" aria-label="Daylight">
      <h3 className="h3">Daylight</h3>
      <svg viewBox="0 0 200 110" className="sun" aria-hidden="true">
        <path d="M16 96 A84 80 0 0 1 184 96" fill="none" stroke="var(--line-strong)" strokeDasharray="4 5" />
        <line x1="6" x2="194" y1="96" y2="96" stroke="var(--line)" />
        {p !== null && <circle cx={x} cy={y} r="9" fill="#ffc94d" className="sun__dot" />}
      </svg>
      <p className="sun__text">
        {fmtDuration(arc.daylightMin)} of daylight
        {p === null ? ' · the sun is down' : ` · ${Math.round(p * 100)}% through the day`}
      </p>
    </section>
  );
}

/** The outlook: the next day by the hour, the week by the day, and the sun. */
export function Forecast(): ReactElement | null {
  const v = useBar((s) => currentVerdict(s));
  if (!v?.forecast) return null;
  return (
    <section className="card forecast" aria-label="Forecast">
      <p className="eyebrow">The outlook</p>
      <Hours v={v} />
      <div className="forecast__row">
        <Days v={v} />
        <Sun v={v} />
      </div>
    </section>
  );
}
