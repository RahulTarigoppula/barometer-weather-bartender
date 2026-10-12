import { type ReactElement, useEffect, useState } from 'react';
import { unlockAudio } from '../../audio/sfx';
import { DRINKS } from '../../data/menu';
import { served } from '../../engine/index';
import { useSettings } from '../../state/settings';
import { useBar } from '../../state/store';
import { CoasterSlot } from './Coaster';
import { pour } from './pour';

const SUGGESTIONS: [string, number, number][] = [
  ['Mumbai', 19.07, 72.88],
  ['Yakutsk', 62.03, 129.73],
  ['Reykjavík', 64.13, -21.9],
  ['Dubai', 25.2, 55.27],
  ['the Arabian Sea', 15, 65],
];

function EmptyLane(): ReactElement {
  return (
    <div className="lane__empty">
      <span className="lane__ghost" aria-hidden="true" />
      <span className="backbar__plate">Spin. Tap. Survive.</span>
      <p>He has opinions about your humidity.</p>
      <p className="lane__hint">
        Drag the globe, flick it, then tap somewhere you would regret standing.
        <br />
        Keyboard: focus the globe, arrows to rotate, Enter pours at the centre.
      </p>
      <div className="lane__try" role="group" aria-label="Try somewhere">
        {SUGGESTIONS.map(([name, lat, lng]) => (
          <button
            key={name}
            type="button"
            className="plate plate--ghost plate--sm"
            onClick={() => {
              unlockAudio();
              void pour(lat, lng);
            }}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The coaster lane, plus the one polite announcement per printed verdict. */
export function Lane(): ReactElement {
  const coaster = useBar((s) => s.coaster);
  const { menu, gentler } = useSettings();
  const [said, setSaid] = useState('');
  const v = coaster.kind === 'verdict' ? coaster.verdict : null;

  useEffect(() => {
    if (!v) {
      setSaid('');
      return;
    }
    const s = served(v, DRINKS, menu, 0, gentler);
    setSaid(`Verdict for ${v.place.label}: ${s.stamp.text.toLowerCase()} ${s.drink.name}`);
  }, [v, menu, gentler]);

  return (
    <section className="lane" aria-label="Coaster lane">
      {coaster.kind === 'empty' ? <EmptyLane /> : <CoasterSlot />}
      <p className="sr" aria-live="polite">
        {said}
      </p>
    </section>
  );
}
