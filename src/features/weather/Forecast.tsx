import { Droplets, Moon, Sunrise, Sunset } from 'lucide-react';
import { type PointerEvent, type ReactElement, useState } from 'react';
import { fmtDuration } from '../../engine/daypart';
import { dayName, dayStory, hourLabel, sunArc, sunTurns, tempPath, weekRange, weekStory } from '../../engine/outlook';
import type { Verdict } from '../../engine/types';
import { fmtTempShort } from '../../engine/units';
import { wmoLabel } from '../../engine/wmo';
import { useSettings } from '../../state/settings';
import { currentVerdict, useBar } from '../../state/store';
import { iconFor } from './icons';

const W = 960;
const H = 110;
const RAIN_H = 26; // the band at the foot of the chart where rain chance is drawn

/** "06:22" from the local clock plus a minute offset. */
function clockPlus(localTime: string, minutes: number): string {
  if (!Number.isFinite(minutes)) return 'n/a';
  const [h = 0, m = 0] = localTime.split(':').map(Number);
  const t = (((h * 60 + m + Math.round(minutes)) % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

function Hours({ v }: { v: Verdict }): ReactElement | null {
  const temp = useSettings((s) => s.units.temp);
  const [hover, setHover] = useState<number | null>(null);
  const hours = (v.forecast?.hours ?? []).slice(0, 24);
  if (hours.length < 2) return null;
  const fmt = (c: number): string => fmtTempShort(c, temp);
  const { line, points } = tempPath(hours, W, H - RAIN_H, 16);
  const step = W / (hours.length - 1);
  const scrub = (e: PointerEvent<HTMLDivElement>): void => {
    const r = e.currentTarget.getBoundingClientRect();
    const k = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    setHover(Math.round(k * (hours.length - 1)));
  };
  const hv = hover === null ? null : hours[hover];
  const hp = hover === null ? null : points[hover];
  const hiI = hours.reduce((b, h, i, a) => (h.tempC > (a[b] as typeof h).tempC ? i : b), 0);
  const loI = hours.reduce((b, h, i, a) => (h.tempC < (a[b] as typeof h).tempC ? i : b), 0);
  const pct = (i: number): string => `${((i / (hours.length - 1)) * 100).toFixed(2)}%`;
  const yPct = (i: number): string => `${(((points[i]?.[1] ?? 0) / H) * 100).toFixed(2)}%`;
  const every = 3;
  return (
    <section className="fc fc--hours" aria-label="Next 24 hours">
      <div className="fc__head">
        <h3 className="h3">Next 24 hours</h3>
        <p className="fc__story">{dayStory(hours, fmt)}</p>
      </div>
      <div className="hours" role="list">
        <div
          className="hours__plot"
          onPointerMove={scrub}
          onPointerDown={scrub}
          onPointerLeave={() => setHover(null)}
          aria-hidden="true"
        >
          <svg className="hours__chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="hoursFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="var(--sky)" stopOpacity="0.32" />
                <stop offset="1" stopColor="var(--sky)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Night falls across the strip: the dark hours are shaded. */}
            {hours.map((h, i) =>
              h.isDay ? null : (
                <rect
                  key={`n${h.time}`}
                  x={Math.max(0, (i - 0.5) * step)}
                  width={Math.min(W, (i + 0.5) * step) - Math.max(0, (i - 0.5) * step)}
                  y={0}
                  height={H - RAIN_H}
                  fill="rgba(80,100,200,0.07)"
                />
              ),
            )}
            {/* Rain chance, as bars at the foot. */}
            {hours.map((h, i) =>
              h.precipProb > 0 ? (
                <rect
                  key={`r${h.time}`}
                  x={i * step - step * 0.32}
                  width={step * 0.64}
                  y={H - (RAIN_H * h.precipProb) / 100}
                  height={(RAIN_H * h.precipProb) / 100}
                  rx="2"
                  fill={h.precipProb >= 50 ? 'rgba(124,196,255,0.85)' : 'rgba(124,196,255,0.35)'}
                />
              ) : null,
            )}
            <path d={`${line} L${W} ${H - RAIN_H} L0 ${H - RAIN_H} Z`} fill="url(#hoursFill)" />
            <path d={line} fill="none" stroke="var(--sky)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
          </svg>
          <span className="hours__peak hours__peak--hi num" style={{ left: pct(hiI), top: yPct(hiI) }}>
            {fmt(hours[hiI]?.tempC ?? 0)}
          </span>
          <span className="hours__peak hours__peak--lo num" style={{ left: pct(loI), top: yPct(loI) }}>
            {fmt(hours[loI]?.tempC ?? 0)}
          </span>
          {sunTurns(hours).map((s) => (
            <span key={s.index} className={`hours__sun hours__sun--${s.kind}`} style={{ left: pct(s.index) }}>
              {s.kind === 'sunrise' ? (
                <Sunrise size={13} aria-hidden="true" />
              ) : (
                <Sunset size={13} aria-hidden="true" />
              )}
            </span>
          ))}
          {hv && hp && (
            <div className="hours__mark" style={{ left: `${(hp[0] / W) * 100}%` }}>
              <span className="hours__dot" style={{ top: `${(hp[1] / H) * 100}%` }} />
              <span className="hours__tip num">
                {hourLabel(hv.time, hover ?? 0)} · {fmt(hv.tempC)} · {Math.round(hv.precipProb)}% rain
              </span>
            </div>
          )}
        </div>
        <div className="hours__cols">
          {hours.map((h, i) => {
            if (i % every !== 0) return null;
            const Icon = iconFor(h.wmo, h.isDay);
            return (
              <div key={h.time} className="hours__col" role="listitem">
                <span className="hours__h num">{hourLabel(h.time, i)}</span>
                <Icon size={20} strokeWidth={1.75} aria-label={wmoLabel(h.wmo)} />
                <span className="hours__t num">{fmt(h.tempC)}</span>
                <span className="hours__rain num" data-wet={h.precipProb >= 40 ? 'true' : undefined}>
                  <Droplets size={11} aria-hidden="true" /> {Math.round(h.precipProb)}%
                </span>
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
  const fmt = (c: number): string => fmtTempShort(c, temp);
  const { lo, hi } = weekRange(days);
  const pct = (c: number): number => ((c - lo) / (hi - lo)) * 100;
  return (
    <section className="fc fc--days" aria-label="Next 7 days">
      <div className="fc__head">
        <h3 className="h3">The week</h3>
        <p className="fc__story">{weekStory(days, fmt)}</p>
      </div>
      <ul className="days">
        {days.map((d, i) => {
          const Icon = iconFor(d.wmo, true);
          return (
            <li
              key={d.date}
              className={`day${i === 0 ? ' day--today' : ''}`}
              data-wet={d.precipProbMax >= 50 ? 'true' : undefined}
            >
              <span className="day__name">{i === 0 ? 'Today' : dayName(d.date)}</span>
              <Icon size={18} strokeWidth={1.75} aria-label={wmoLabel(d.wmo)} />
              <span className="day__rain num" data-wet={d.precipProbMax >= 40 ? 'true' : undefined}>
                {d.precipProbMax >= 10 ? `${Math.round(d.precipProbMax)}%` : ''}
              </span>
              <span className="day__lo num">{fmt(d.tMinC)}</span>
              <span className="day__bar" aria-hidden="true">
                <span style={{ left: `${pct(d.tMinC)}%`, right: `${100 - pct(d.tMaxC)}%` }} />
              </span>
              <span className="day__hi num">{fmt(d.tMaxC)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Sun({ v }: { v: Verdict }): ReactElement | null {
  const f = v.features;
  const arc = sunArc(f);
  if (arc.daylightMin === null) return null;
  const p = arc.progress;
  const angle = Math.PI * (1 - (p ?? 0));
  const x = 100 + Math.cos(angle) * 84;
  const y = 96 - Math.sin(angle) * 80;
  const rise = clockPlus(v.localTime, f.minutesToSunrise);
  const set = clockPlus(v.localTime, f.minutesToSunset);
  const next =
    p !== null
      ? `Sunset in ${fmtDuration(f.minutesToSunset)}`
      : f.minutesToSunrise > 0
        ? `Sunrise in ${fmtDuration(f.minutesToSunrise)}`
        : `Sunrise tomorrow around ${rise}`;
  return (
    <section className="fc fc--sun" aria-label="Daylight">
      <div className="fc__head">
        <h3 className="h3">Daylight</h3>
        <p className="fc__story">
          {fmtDuration(arc.daylightMin)} of light today. {next}.
        </p>
      </div>
      <svg viewBox="0 0 200 118" className="sun" aria-hidden="true">
        <defs>
          <linearGradient id="arcGlow" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#ffb870" />
            <stop offset="0.5" stopColor="#ffe08a" />
            <stop offset="1" stopColor="#ff8a6a" />
          </linearGradient>
        </defs>
        <path d="M16 96 A84 80 0 0 1 184 96" fill="none" stroke="var(--line-strong)" strokeDasharray="3 5" />
        {p !== null && (
          <path
            d="M16 96 A84 80 0 0 1 184 96"
            fill="none"
            stroke="url(#arcGlow)"
            strokeWidth="2.5"
            pathLength={1}
            strokeDasharray={`${p} 1`}
          />
        )}
        <line x1="6" x2="194" y1="96" y2="96" stroke="var(--line)" />
        {p !== null ? (
          <circle cx={x} cy={y} r="9" fill="#ffc94d" className="sun__dot" />
        ) : (
          <g className="sun__moon" transform="translate(88 40)">
            <Moon size={24} color="#cfd9ff" />
          </g>
        )}
        <text x="16" y="112" className="sun__time" textAnchor="middle">
          {rise}
        </text>
        <text x="184" y="112" className="sun__time" textAnchor="middle">
          {set}
        </text>
      </svg>
    </section>
  );
}

/** The outlook: the next day by the hour, the week by the day, and the sun, each with a line in plain words. */
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
