import { useLiveQuery } from 'dexie-react-hooks';
import type { ReactElement } from 'react';
import { drinkById } from '../../data/menu';
import { fmtTempShort } from '../../engine/units';
import { db } from '../../state/db';
import { useSettings } from '../../state/settings';
import { repour } from '../verdict/pour';

/** The last three rounds on the Tab, chalked on the counter. */
export function RecentRounds(): ReactElement | null {
  const rows = useLiveQuery(() => db.verdicts.orderBy('createdAt').reverse().limit(3).toArray(), []);
  const unit = useSettings((s) => s.units.temp);
  if (!rows?.length) return null;
  return (
    <section aria-label="Recent rounds">
      <p className="caps" style={{ margin: 'var(--space-2) 0 0' }}>
        Recent rounds
      </p>
      <ul className="tablist">
        {rows.map((v) => (
          <li key={v.id}>
            <button type="button" className="tabrow" onClick={() => void repour(v)}>
              <span className="tabrow__id">#{String(v.id ?? 0).padStart(4, '0')}</span>
              <span>
                <span className="tabrow__place">{v.place.short}</span>
                <span className="tabrow__sub">
                  {v.localTime} local · {drinkById(v.drinkId)?.name ?? v.drinkId}
                </span>
              </span>
              <span className="tabrow__temp">{fmtTempShort(v.features.apparentC, unit)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
