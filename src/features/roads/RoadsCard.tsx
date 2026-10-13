import { Car, Radio } from 'lucide-react';
import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { fetchFlow, type LiveFlow } from '../../api/tomtom';
import { openDrawer } from '../../app/route';
import { LEVEL_LABEL, levelOf, liveIndex, roadOutlook } from '../../engine/traffic';
import type { Verdict } from '../../engine/types';
import { useSettings } from '../../state/settings';
import { currentVerdict, useBar } from '../../state/store';

type Live =
  | { state: 'off' }
  | { state: 'loading' }
  | { state: 'ok'; flow: LiveFlow }
  | { state: 'none' }
  | { state: 'refused' };

function useLive(v: Verdict, key: string): Live {
  const [live, setLive] = useState<Live>({ state: 'off' });
  useEffect(() => {
    if (!key) {
      setLive({ state: 'off' });
      return;
    }
    let alive = true;
    setLive({ state: 'loading' });
    fetchFlow(v.lat, v.lng, key)
      .then((flow) => alive && setLive(flow ? { state: 'ok', flow } : { state: 'none' }))
      .catch(
        (e: unknown) =>
          alive && setLive(e instanceof Error && /refused/.test(e.message) ? { state: 'refused' } : { state: 'none' }),
      );
    return () => {
      alive = false;
    };
  }, [v.lat, v.lng, key]);
  return live;
}

const hh = (h: number): string => `${String(h).padStart(2, '0')}`;

function Roads({ v }: { v: Verdict }): ReactElement {
  const key = useSettings((s) => s.tomtomKey);
  const india = v.place.country?.iso2 === 'IN';
  const o = useMemo(
    () =>
      roadOutlook({
        lat: v.lat,
        lng: v.lng,
        hour: v.features.localHour,
        minute: v.features.localMinute,
        weekday: v.features.localWeekday,
        tags: v.tags,
        india,
      }),
    [v, india],
  );
  const live = useLive(v, key);
  const liveIx = live.state === 'ok' ? liveIndex(live.flow.currentKmh, live.flow.freeFlowKmh) : null;
  const ix = liveIx ?? o.index;
  const lvl = levelOf(ix);
  const where = o.metro ? `${o.metro.name} roads` : india ? 'Town roads' : 'Local roads';
  return (
    <section className="card roads" aria-label="Roads">
      <div className="roads__head">
        <p className="eyebrow">
          <Car size={14} aria-hidden="true" /> {where}
        </p>
        <span className={`badge${liveIx !== null ? ' badge--live' : ''}`}>
          {liveIx !== null ? (
            <>
              <Radio size={12} aria-hidden="true" /> Live · TomTom
            </>
          ) : (
            'Estimate'
          )}
        </span>
      </div>
      <div className="roads__now">
        <p className="roads__level" data-level={lvl}>
          {LEVEL_LABEL[lvl]}
        </p>
        <div
          className="roads__meter"
          role="meter"
          aria-label="Congestion"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={ix}
        >
          <span style={{ width: `${Math.max(4, ix)}%` }} data-level={lvl} />
        </div>
        {live.state === 'ok' ? (
          <p className="roads__trip num">
            {Math.round(live.flow.currentKmh)} km/h now vs {Math.round(live.flow.freeFlowKmh)} km/h when clear
            {live.flow.roadClosure ? ' · road closure reported' : ''}
          </p>
        ) : (
          <p className="roads__trip num">
            ~{o.tripMin} min for 10 km <span className="muted">(≈{o.freeMin} min on empty roads)</span>
          </p>
        )}
        {o.reason && <p className="chip chip--warn">{o.reason}</p>}
        <p className="roads__advice">{o.advice}</p>
      </div>
      <div className="roads__strip" role="list" aria-label="Next 12 hours">
        {o.next.map((h) => (
          <div
            key={h.hour}
            className="roads__hour"
            role="listitem"
            title={`${hh(h.hour)}:00 · ${LEVEL_LABEL[h.level]}`}
          >
            <span className="roads__bar" data-level={h.level} style={{ height: `${Math.max(8, h.index)}%` }} />
            <span className="roads__h num">{hh(h.hour)}</span>
          </div>
        ))}
      </div>
      <p className="credit">
        {live.state === 'refused'
          ? 'Your TomTom key was refused — check it in Settings. Showing the estimate.'
          : live.state === 'ok'
            ? 'Live speed on the nearest road by TomTom · the hourly strip is an estimate.'
            : 'Estimate from typical rush hours and today’s weather — not live.'}{' '}
        {!key && (
          <button type="button" className="link" onClick={() => openDrawer('office')}>
            Add a free live key
          </button>
        )}
      </p>
    </section>
  );
}

/** How the roads look right now, and when they ease. */
export function RoadsCard(): ReactElement | null {
  const v = useBar((s) => currentVerdict(s));
  if (v?.place.kind !== 'land') return null;
  return <Roads v={v} />;
}
