import {
  Droplets,
  Gauge,
  type LucideIcon,
  Star,
  Sun,
  Sunrise,
  Sunset,
  Thermometer,
  Umbrella,
  Wind,
} from 'lucide-react';
import { type ReactElement, useEffect, useState } from 'react';
import { useReduced } from '../../app/useReduced';
import { euAqiBand, uvBand } from '../../engine/comfort';
import { fmtDuration } from '../../engine/daypart';
import { tipsFor } from '../../engine/outlook';
import { fmtDate } from '../../engine/receipt';
import { RING } from '../../engine/tags';
import type { Verdict } from '../../engine/types';
import { fmtTemp, fmtTempShort, windLabel, windValue } from '../../engine/units';
import { LAYERS, windowWeather } from '../../engine/window';
import { wmoLabel } from '../../engine/wmo';
import { samePlace, useSettings } from '../../state/settings';
import { type ErrorKind, useBar } from '../../state/store';
import { backToBar, pour } from '../verdict/pour';
import { iconFor } from './icons';

/** "06:22" from the local clock plus a minute offset. */
function clockPlus(localTime: string, minutes: number): string {
  if (!Number.isFinite(minutes)) return '—';
  const [h = 0, m = 0] = localTime.split(':').map(Number);
  const t = (((h * 60 + m + Math.round(minutes)) % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

const AQI_LABEL: Record<string, string> = {
  good: 'Good',
  fair: 'Fair',
  moderate: 'Moderate',
  poor: 'Poor',
  'very-poor': 'Very poor',
  'extremely-poor': 'Severe',
  unknown: 'No reading',
};

interface TileProps {
  icon: LucideIcon;
  label: string;
  value: string;
  note?: string | undefined;
  tone?: string | undefined;
}

function Tile({ icon: Icon, label, value, note, tone }: TileProps): ReactElement {
  return (
    <div className="tile" data-tone={tone}>
      <span className="tile__label">
        <Icon size={15} strokeWidth={1.75} aria-hidden="true" /> {label}
      </span>
      <span className="tile__value num">{value}</span>
      {note && <span className="tile__note">{note}</span>}
    </div>
  );
}

/** The thermometer bar: the seven-word comfort scale with the needle on the thermal tag. */
function Comfort({ v }: { v: Verdict }): ReactElement {
  const i = RING.indexOf(v.dial);
  const pct = ((i + 0.5) / RING.length) * 100;
  return (
    <div
      className="comfort"
      role="meter"
      aria-label="Comfort scale"
      aria-valuemin={-120}
      aria-valuemax={120}
      aria-valuenow={v.dialAngle}
      aria-valuetext={`Feels like ${v.features.apparentC.toFixed(1)} degrees, tag: ${v.dial.toLowerCase()}`}
    >
      <div className="comfort__bar">
        <span className="comfort__needle" style={{ left: `${pct}%` }} />
      </div>
      <div className="comfort__labels" aria-hidden="true">
        {RING.map((r) => (
          <span key={r} className={r === v.dial ? 'is-on' : undefined}>
            {r}
          </span>
        ))}
      </div>
    </div>
  );
}

function Ambient({ v }: { v: Verdict }): ReactElement {
  const reduced = useReduced();
  const w = windowWeather(v);
  const [strike, setStrike] = useState(0);
  useEffect(() => {
    if (!w.lightning) return;
    const t = window.setTimeout(() => setStrike((n) => n + 1), 700);
    return () => window.clearTimeout(t);
  }, [w.lightning]);
  return (
    <div className="weather__ambient" aria-hidden="true">
      {LAYERS.map((l) => (
        <div
          key={l}
          className={`wx wx--${l}${w.on.has(l) ? ' wx--on' : ''}`}
          data-static={reduced ? 'true' : undefined}
        />
      ))}
      <div key={strike} className={`wx wx--flash${strike ? (reduced ? ' wx--step' : ' wx--strike') : ''}`} />
    </div>
  );
}

function SaveStar({ name, lat, lng }: { name: string; lat: number; lng: number }): ReactElement {
  const saved = useSettings((s) => s.saved.some((p) => samePlace(p, { lat, lng })));
  const toggle = useSettings((s) => s.toggleSaved);
  return (
    <button
      type="button"
      className="icon-btn star"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from saved places` : `Save ${name}`}
      title={saved ? 'Saved' : 'Save this place'}
      onClick={() => toggle({ name, lat, lng })}
    >
      <Star size={20} strokeWidth={1.75} aria-hidden="true" fill={saved ? 'currentColor' : 'none'} />
    </button>
  );
}

function Report({ v, note }: { v: Verdict; note: 'stale' | 'repoured' | null }): ReactElement {
  const units = useSettings((s) => s.units);
  const f = v.features;
  const Icon = iconFor(f.wmo, f.isDay);
  const t = (c: number): string => fmtTemp(c, units.temp);
  const aqi = euAqiBand(f.euAqi);
  const uv = uvBand(f.uv);
  const sunrise = clockPlus(v.localTime, f.minutesToSunrise);
  const sunset = clockPlus(v.localTime, f.minutesToSunset);
  const nextSun =
    f.minutesToSunset > 0 && Number.isFinite(f.minutesToSunset)
      ? `Sunset in ${fmtDuration(f.minutesToSunset)}`
      : f.minutesToSunrise > 0 && Number.isFinite(f.minutesToSunrise)
        ? `Sunrise in ${fmtDuration(f.minutesToSunrise)}`
        : f.polarApproximateTime
          ? 'Polar day or night'
          : '';
  const country = v.place.country?.name ?? v.place.water?.name ?? '';
  const name =
    v.place.nearestCity?.distanceKm !== undefined && v.place.nearestCity.distanceKm < 25
      ? v.place.nearestCity.name
      : v.place.label;
  const tips = tipsFor(f, v.forecast?.hours);
  return (
    <>
      <Ambient v={v} />
      <header className="weather__head">
        <p className="eyebrow">
          {v.place.country?.iso2 === 'IN' ? 'India · ' : ''}
          {f.isDay ? 'Daytime' : 'Night'} · {v.localTime} local · {fmtDate(f.localDate)}
        </p>
        <div className="weather__title">
          <h1 className="weather__place">{name}</h1>
          <SaveStar name={name} lat={v.lat} lng={v.lng} />
        </div>
        {country && <p className="weather__country">{v.place.label === country ? '' : country}</p>}
        {note === 'stale' && <p className="chip chip--warn">Offline — showing the last reading for this spot</p>}
      </header>
      <div className="weather__now">
        <Icon className="weather__icon" size={88} strokeWidth={1.25} aria-hidden="true" />
        <div>
          <p className="weather__temp num">{fmtTempShort(f.tempC, units.temp)}</p>
          <p className="weather__cond">{wmoLabel(f.wmo)}</p>
          <p className="weather__feels">
            Feels like <b className="num">{t(f.apparentC)}</b>
          </p>
        </div>
      </div>
      <Comfort v={v} />
      {tips.length > 0 && (
        <ul className="tips" aria-label="Today's tips">
          {tips.map((tip) => (
            <li key={tip.id} className="tip" data-tone={tip.tone}>
              <b>{tip.label}</b> <span>{tip.detail}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="tiles">
        <Tile icon={Droplets} label="Humidity" value={`${Math.round(f.rh)}%`} note={`Dew point ${t(f.dewPointC)}`} />
        <Tile
          icon={Wind}
          label="Wind"
          value={`${windValue(f.windKmh, units.wind)} ${windLabel(units.wind)}`}
          note={`Gusts ${windValue(f.gustKmh, units.wind)}`}
        />
        <Tile
          icon={Gauge}
          label="Air quality"
          value={f.euAqi === null ? '—' : String(Math.round(f.euAqi))}
          note={`${AQI_LABEL[aqi] ?? ''}${f.usAqi === null ? '' : ` · US ${Math.round(f.usAqi)}`}`}
          tone={aqi}
        />
        <Tile
          icon={Sun}
          label="UV index"
          value={String(Math.round(f.uv))}
          note={uv.replace('-', ' ')}
          tone={`uv-${uv}`}
        />
        <Tile
          icon={Umbrella}
          label="Rain chance"
          value={`${Math.round(f.precipProb)}%`}
          note={`${f.precipMm.toFixed(1)} mm now`}
        />
        <Tile
          icon={Thermometer}
          label="Pressure"
          value={`${Math.round(f.pressureHpa)}`}
          note={`hPa · cloud ${Math.round(f.cloudCover)}%`}
        />
        <Tile icon={Sunrise} label="Sunrise" value={sunrise} />
        <Tile icon={Sunset} label="Sunset" value={sunset} note={nextSun} />
      </div>
      {f.marine && (
        <p className="weather__marine num">
          Sea surface {t(f.marine.sstC)} · waves {f.marine.waveHeightM.toFixed(1)} m
        </p>
      )}
      <p className="credit">
        <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">
          Weather data by Open-Meteo.com
        </a>
        {v.sources.air ? ' · CAMS' : ''}
        {v.sources.marine ? ' · DWD' : ''}
      </p>
    </>
  );
}

const ERRORS: Record<ErrorKind, { head: string; body: string }> = {
  busy: { head: 'Too many requests', body: 'The weather service needs a minute. The bartender is polishing glasses.' },
  silent: { head: 'No signal from the weather service', body: 'Check your connection and try again.' },
  nowhere: { head: 'Nowhere on Earth has those coordinates.', body: 'Impressive. Pick a real place on the globe.' },
};

function ErrorReport({
  error,
  lat,
  lng,
  retryAt,
}: {
  error: ErrorKind;
  lat: number;
  lng: number;
  retryAt: number;
}): ReactElement {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (error !== 'busy') return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [error]);
  const left = Math.max(0, Math.ceil((retryAt - now) / 1000));
  const e = ERRORS[error];
  return (
    <div className="weather__error" role="alert">
      <h1 className="weather__place">{e.head}</h1>
      <p>{e.body}</p>
      {error === 'busy' && (
        <p className="num">
          Retry in <span className="countdown">{left}</span> s
        </p>
      )}
      <div className="row">
        {error !== 'nowhere' && (
          <button
            type="button"
            className="btn btn--primary"
            disabled={error === 'busy' && left > 0}
            onClick={() => void pour(lat, lng)}
          >
            Retry
          </button>
        )}
        <button type="button" className="btn" onClick={backToBar}>
          Back to New Delhi
        </button>
      </div>
    </div>
  );
}

function Skeleton(): ReactElement {
  return (
    <div className="weather__skeleton" aria-busy="true">
      <span className="sr">Reading the sky…</span>
      <div className="skel skel--sm" />
      <div className="skel skel--lg" />
      <div className="skel skel--xl" />
      <div className="skel-grid">
        {['a', 'b', 'c', 'd'].map((k) => (
          <div key={k} className="skel skel--tile" />
        ))}
      </div>
    </div>
  );
}

/** Weather first: the place, the sky, and every number that matters, before the bartender speaks. */
export function WeatherCard(): ReactElement {
  const coaster = useBar((s) => s.coaster);
  return (
    <section className="card weather" aria-label="Weather" data-state={coaster.kind}>
      {coaster.kind === 'verdict' && <Report v={coaster.verdict} note={coaster.note} />}
      {(coaster.kind === 'pouring' || coaster.kind === 'empty') && <Skeleton />}
      {coaster.kind === 'error' && <ErrorReport {...coaster} />}
    </section>
  );
}
