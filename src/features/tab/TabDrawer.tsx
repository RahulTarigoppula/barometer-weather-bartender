import { useLiveQuery } from 'dexie-react-hooks';
import { type ChangeEvent, type ReactElement, useRef, useState } from 'react';
import { drinkById } from '../../data/menu';
import { fmtTempShort } from '../../engine/units';
import { downloadText } from '../../platform/share';
import { db } from '../../state/db';
import { useSettings } from '../../state/settings';
import { useBar } from '../../state/store';
import { repour } from '../verdict/pour';
import { clearTab, exportTab, importTab, isStale, WrongTabError } from './repo';

/** The Tab: every verdict, newest first, on this device only. A row re-flies the globe. */
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
      showToast(`${n} rounds added to the Tab.`);
    } catch (err) {
      showToast(err instanceof WrongTabError ? err.message : 'That file is not a Tab I can read.');
    }
  };

  return (
    <>
      {rows === undefined ? null : rows.length === 0 ? (
        <p className="empty-note">
          No tab yet.
          <br />
          Go somewhere.
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
                <span className="tabrow__id">#{String(v.id ?? 0).padStart(4, '0')}</span>
                <span>
                  <span className="tabrow__place">{v.place.short}</span>
                  <span className="tabrow__sub">
                    {v.localTime} local · {drinkById(v.drinkId)?.name ?? v.drinkId}
                    {isStale(v, now) ? ' · re-pour' : ''}
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
          onClick={async () => downloadText(JSON.stringify(await exportTab(Date.now()), null, 2), 'globe-bar-tab.json')}
        >
          Export JSON
        </button>
        <button type="button" className="plate plate--ghost" onClick={() => file.current?.click()}>
          Import
        </button>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => void onImport(e)} />
        {confirm ? (
          <span className="confirm">
            <span className="caps">Clear every round?</span>
            <button
              type="button"
              className="plate"
              onClick={async () => {
                await clearTab();
                setConfirm(false);
                showToast('Tab cleared. Fresh start.');
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
            Clear tab
          </button>
        )}
      </div>
      <p className="attrib">Stored on this device in IndexedDB. Nothing leaves the bar.</p>
    </>
  );
}
