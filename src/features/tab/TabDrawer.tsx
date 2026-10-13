import { useLiveQuery } from 'dexie-react-hooks';
import { type ChangeEvent, type ReactElement, useRef, useState } from 'react';
import { drinkById } from '../../data/menu';
import type { Verdict } from '../../engine/types';
import { fmtTempShort } from '../../engine/units';
import { downloadText } from '../../platform/share';
import { db } from '../../state/db';
import { useSettings } from '../../state/settings';
import { useBar } from '../../state/store';
import { repour } from '../verdict/pour';
import { iconFor } from '../weather/icons';
import { clearTab, exportTab, importTab, isStale, WrongTabError } from './repo';

const placeName = (v: Verdict): string =>
  v.place.nearestCity && v.place.nearestCity.distanceKm < 25 ? v.place.nearestCity.name : v.place.label;

function RowIcon({ wmo, isDay }: { wmo: number; isDay: boolean }): ReactElement {
  const Icon = iconFor(wmo, isDay);
  return <Icon className="tabrow__icon" size={22} strokeWidth={1.6} aria-hidden="true" />;
}

/** History: every place you looked at, newest first, on this device only. A row flies the globe back. */
export function TabList({ onPick }: { onPick: () => void }): ReactElement {
  const rows = useLiveQuery(() => db.verdicts.orderBy('createdAt').reverse().limit(200).toArray(), []);
  const unit = useSettings((s) => s.units.temp);
  const showToast = useBar((s) => s.showToast);
  const [confirm, setConfirm] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const now = Date.now();

  const onImport = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const n = await importTab(JSON.parse(await f.text()));
      showToast(`${n} places added to your history.`);
    } catch (err) {
      showToast(err instanceof WrongTabError ? err.message : 'That file is not a history I can read.');
    }
  };

  return (
    <>
      {rows === undefined ? null : rows.length === 0 ? (
        <p className="empty-note">
          Nothing here yet.
          <br />
          Spin the planet and go somewhere.
        </p>
      ) : (
        <ul className="tablist">
          {rows.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                className="tabrow"
                onClick={() => {
                  onPick();
                  void repour(v);
                }}
              >
                <RowIcon wmo={v.features.wmo} isDay={v.features.isDay} />
                <span className="tabrow__main">
                  <span className="tabrow__place">{placeName(v)}</span>
                  <span className="tabrow__sub">
                    {new Date(v.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} ·{' '}
                    {v.localTime} local · {drinkById(v.drinkId)?.name ?? v.drinkId}
                    {isStale(v, now) ? ' · will refresh' : ''}
                  </span>
                </span>
                <span className="tabrow__temp">{fmtTempShort(v.features.apparentC, unit)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="drawer__actions">
        <button
          type="button"
          className="plate plate--ghost"
          disabled={!rows?.length}
          onClick={async () =>
            downloadText(JSON.stringify(await exportTab(Date.now()), null, 2), 'mausam-history.json')
          }
        >
          Export JSON
        </button>
        <button type="button" className="plate plate--ghost" onClick={() => file.current?.click()}>
          Import
        </button>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => void onImport(e)} />
        {confirm ? (
          <span className="confirm">
            <span className="caps">Clear all of your history?</span>
            <button
              type="button"
              className="plate"
              onClick={async () => {
                await clearTab();
                setConfirm(false);
                showToast('History cleared. Fresh start.');
              }}
            >
              Confirm
            </button>
            <button type="button" className="plate plate--ghost" onClick={() => setConfirm(false)}>
              Keep it
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="plate plate--ghost"
            disabled={!rows?.length}
            onClick={() => setConfirm(true)}
          >
            Clear history
          </button>
        )}
      </div>
      <p className="attrib">Kept only on this device. Nothing leaves your phone.</p>
    </>
  );
}
