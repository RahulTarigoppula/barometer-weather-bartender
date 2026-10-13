import { Star } from 'lucide-react';
import type { ReactElement } from 'react';
import { unlockAudio } from '../../audio/sfx';
import { INDIA_CITIES, type QuickPlace, WORLD_PLACES } from '../../data/places';
import { useSettings } from '../../state/settings';
import { currentVerdict, useBar } from '../../state/store';
import { GlobeStage } from '../globe/GlobeStage';
import { pour } from '../verdict/pour';
import { NowPeek } from './NowPeek';

function Chips({
  label,
  places,
  active,
  starred = false,
}: {
  label: string;
  places: QuickPlace[];
  active: string | null;
  starred?: boolean;
}): ReactElement {
  return (
    <div className={`chips${starred ? ' chips--saved' : ''}`} role="group" aria-label={label}>
      {places.map((p) => (
        <button
          key={`${p.name}-${p.lat}`}
          type="button"
          className={`chip chip--action${active === p.name ? ' chip--on' : ''}`}
          onClick={() => {
            unlockAudio();
            void pour(p.lat, p.lng);
          }}
        >
          {starred && <Star size={12} strokeWidth={2} fill="currentColor" aria-hidden="true" />}
          {p.name}
        </button>
      ))}
    </div>
  );
}

/** The planet, big, opening on India; your places first, then Indian cities, then the world. */
export function Hero(): ReactElement {
  const v = useBar((s) => currentVerdict(s));
  const saved = useSettings((s) => s.saved);
  const active = v?.place.nearestCity && v.place.nearestCity.distanceKm < 30 ? v.place.nearestCity.name : null;
  return (
    <section className="hero" aria-label="Globe">
      <GlobeStage />
      <div className="hero__overlay">
        <NowPeek />
        <p className="hero__hint">
          Spin the planet. Tap anywhere for the weather, the roads and the drink it calls for.
        </p>
        {saved.length > 0 && <Chips label="Your places" places={saved} active={active} starred />}
        <Chips label="Indian cities" places={INDIA_CITIES.slice(0, 12)} active={active} />
        <Chips label="Around the world" places={WORLD_PLACES} active={active} />
      </div>
    </section>
  );
}
