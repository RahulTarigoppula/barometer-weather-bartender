import { Dices, Star } from 'lucide-react';
import { type ReactElement, useEffect, useRef, useState } from 'react';
import { play, unlockAudio } from '../../audio/sfx';
import { INDIA_CITIES, pickSurprise, type QuickPlace, WORLD_PLACES } from '../../data/places';
import { fmtTempShort } from '../../engine/units';
import { haptic } from '../../platform/haptics';
import { useSettings } from '../../state/settings';
import { currentVerdict, useBar } from '../../state/store';
import { GlobeStage } from '../globe/GlobeStage';
import { pour } from '../verdict/pour';
import { NowPeek } from './NowPeek';

/** Fly somewhere whose weather is a story of its own, and say why. */
function Surprise(): ReactElement {
  const [spin, setSpin] = useState(0);
  return (
    <button
      type="button"
      className="chip chip--action chip--surprise"
      onClick={() => {
        unlockAudio();
        const v = currentVerdict(useBar.getState());
        const s = pickSurprise(Math.random(), v ?? undefined);
        setSpin((n) => n + 1);
        play('clack');
        haptic('medium');
        useBar.getState().showToast(`${s.name}: ${s.fact}`);
        void pour(s.lat, s.lng, s.name);
      }}
    >
      <Dices key={spin} className="surprise__dice" size={14} strokeWidth={2} aria-hidden="true" />
      Surprise me
    </button>
  );
}

function Chips({
  label,
  places,
  active,
  starred = false,
  lead,
}: {
  label: string;
  places: QuickPlace[];
  active: string | null;
  starred?: boolean;
  lead?: ReactElement;
}): ReactElement {
  const temps = useBar((s) => s.cityTemps);
  const unit = useSettings((s) => s.units.temp);
  return (
    <div className="chips-row">
      {lead}
      <div className={`chips${starred ? ' chips--saved' : ''}`} role="group" aria-label={label}>
        {places.map((p) => (
          <button
            key={`${p.name}-${p.lat}`}
            type="button"
            className={`chip chip--action${active === p.name ? ' chip--on' : ''}`}
            onClick={() => {
              unlockAudio();
              void pour(p.lat, p.lng, p.name);
            }}
          >
            {starred && <Star size={12} strokeWidth={2} fill="currentColor" aria-hidden="true" />}
            {p.name}
            {temps[p.name] !== undefined && (
              <span className="chip__t num">{fmtTempShort(temps[p.name] as number, unit)}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

type Tab = 'india' | 'world' | 'saved';

/** The planet, big, opening on India. Below it, one row to explore: India, the world, or your places. */
export function Hero(): ReactElement {
  const v = useBar((s) => currentVerdict(s));
  const saved = useSettings((s) => s.saved);
  const [tab, setTab] = useState<Tab>('india');
  // Saving a place shows it straight away in "Saved", so you can see it landed.
  const savedCount = useRef(saved.length);
  useEffect(() => {
    if (saved.length > savedCount.current) setTab('saved');
    if (saved.length === 0 && tab === 'saved') setTab('india');
    savedCount.current = saved.length;
  }, [saved.length, tab]);
  const active = v?.place.nearestCity && v.place.nearestCity.distanceKm < 30 ? v.place.nearestCity.name : null;
  const tabs: [Tab, string][] = [
    ['india', 'India'],
    ['world', 'World'],
    ...(saved.length > 0 ? ([['saved', `Saved · ${saved.length}`]] as [Tab, string][]) : []),
  ];
  return (
    <section className="hero" aria-label="Globe">
      <GlobeStage />
      <div className="hero__overlay">
        <NowPeek />
        <p className="hero__hint">Spin it, tap anywhere. I’ll tell you what the sky is up to, and what to pour.</p>
        <div className="explore__tabs" role="group" aria-label="Explore">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`explore__tab${tab === id ? ' is-on' : ''}`}
              aria-pressed={tab === id}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === 'india' && (
          <Chips label="Indian cities" places={INDIA_CITIES.slice(0, 12)} active={active} lead={<Surprise />} />
        )}
        {tab === 'world' && (
          <Chips label="Around the world" places={WORLD_PLACES} active={active} lead={<Surprise />} />
        )}
        {tab === 'saved' && <Chips label="Your places" places={saved} active={active} starred lead={<Surprise />} />}
      </div>
    </section>
  );
}
