import { useLiveQuery } from 'dexie-react-hooks';
import type { ReactElement } from 'react';
import { openDrawer } from '../../app/route';
import { drinkById } from '../../data/menu';
import { fmtTempShort } from '../../engine/units';
import { db } from '../../state/db';
import { useSettings } from '../../state/settings';
import { repour } from '../verdict/pour';
import { iconFor } from '../weather/icons';

/** The last few places you looked at, one tap to see them again. */
export function RecentRounds(): ReactElement | null {
  const rows = useLiveQuery(() => db.verdicts.orderBy('createdAt').reverse().limit(4).toArray(), []);
  const unit = useSettings((s) => s.units.temp);
  if (!rows?.length) return null;
  return (
    <section className="card recent" aria-label="Recent places">
      <div className="recent__head">
        <h3 className="h3">Where you’ve been</h3>
        <button type="button" className="link" onClick={() => openDrawer('tab')}>
          All history
        </button>
      </div>
      <ul className="tablist">
        {rows.map((v) => {
          const Icon = iconFor(v.features.wmo, v.features.isDay);
          const name =
            v.place.nearestCity && v.place.nearestCity.distanceKm < 25 ? v.place.nearestCity.name : v.place.label;
          return (
            <li key={v.id}>
              <button type="button" className="tabrow" onClick={() => void repour(v)}>
                <Icon className="tabrow__icon" size={22} strokeWidth={1.6} aria-hidden="true" />
                <span className="tabrow__main">
                  <span className="tabrow__place">{name}</span>
                  <span className="tabrow__sub">
                    {v.localTime} local · {drinkById(v.drinkId)?.name ?? v.drinkId}
                  </span>
                </span>
                <span className="tabrow__temp num">{fmtTempShort(v.features.apparentC, unit)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
