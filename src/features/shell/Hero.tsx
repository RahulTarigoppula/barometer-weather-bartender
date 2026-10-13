import type { ReactElement } from 'react';
import { unlockAudio } from '../../audio/sfx';
import { INDIA_CITIES, type QuickPlace, WORLD_PLACES } from '../../data/places';
import { currentVerdict, useBar } from '../../state/store';
import { GlobeStage } from '../globe/GlobeStage';
import { pour } from '../verdict/pour';

function Chips({
  label,
  places,
  active,
}: {
  label: string;
  places: QuickPlace[];
  active: string | null;
}): ReactElement {
  return (
    <div className="chips" role="group" aria-label={label}>
      {places.map((p) => (
        <button
          key={p.name}
          type="button"
          className={`chip chip--action${active === p.name ? ' chip--on' : ''}`}
          onClick={() => {
            unlockAudio();
            void pour(p.lat, p.lng);
          }}
        >
          {p.name}
        </button>
      ))}
    </div>
  );
}

/** The planet, big, opening on India; one-tap Indian cities first, the world after. */
export function Hero(): ReactElement {
  const v = useBar((s) => currentVerdict(s));
  const active = v?.place.nearestCity && v.place.nearestCity.distanceKm < 30 ? v.place.nearestCity.name : null;
  return (
    <section className="hero" aria-label="Globe">
      <GlobeStage />
      <div className="hero__overlay">
        <p className="hero__hint">Spin the planet. Tap anywhere for live weather — and the drink it calls for.</p>
        <Chips label="Indian cities" places={INDIA_CITIES.slice(0, 12)} active={active} />
        <Chips label="Around the world" places={WORLD_PLACES} active={active} />
      </div>
    </section>
  );
}
