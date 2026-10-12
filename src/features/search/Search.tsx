import { LocateFixed, Search as SearchIcon } from 'lucide-react';
import { type KeyboardEvent, type ReactElement, useEffect, useId, useRef, useState } from 'react';
import { BarBusyError, type SearchResult, searchPlaces } from '../../api/openMeteo';
import { unlockAudio } from '../../audio/sfx';
import { LocationDeniedError, whereAmI } from '../../platform/geolocation';
import { useBar } from '../../state/store';
import { pour } from '../verdict/pour';

type Phase =
  | { kind: 'idle' }
  | { kind: 'results'; rows: SearchResult[] }
  | { kind: 'none' }
  | { kind: 'error'; text: string };

/** The classified-ad search: Open-Meteo forward geocoding, debounced 250 ms, two letters minimum. */
export function Search(): ReactElement {
  const online = useBar((s) => s.online);
  const [q, setQ] = useState('');
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [sel, setSel] = useState(0);
  const listId = useId();
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    const term = q.trim();
    abort.current?.abort();
    if (term.length < 2) {
      setPhase({ kind: 'idle' });
      return;
    }
    const ctl = new AbortController();
    abort.current = ctl;
    const t = window.setTimeout(() => {
      searchPlaces(term, ctl.signal)
        .then((rows) => {
          setSel(0);
          setPhase(rows.length ? { kind: 'results', rows } : { kind: 'none' });
        })
        .catch((e: unknown) => {
          if (ctl.signal.aborted) return;
          setPhase({
            kind: 'error',
            text: e instanceof BarBusyError ? 'Bar’s busy. Give it a minute.' : 'The directory is not answering.',
          });
        });
    }, 250);
    return () => {
      window.clearTimeout(t);
      ctl.abort();
    };
  }, [q]);

  const choose = (r: SearchResult): void => {
    unlockAudio();
    setQ('');
    setPhase({ kind: 'idle' });
    void pour(r.lat, r.lng);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (phase.kind !== 'results') return;
    if (e.key === 'ArrowDown') setSel((s) => Math.min(phase.rows.length - 1, s + 1));
    else if (e.key === 'ArrowUp') setSel((s) => Math.max(0, s - 1));
    else if (e.key === 'Enter') {
      const r = phase.rows[sel];
      if (r) choose(r);
    } else if (e.key === 'Escape') setQ('');
    else return;
    e.preventDefault();
  };

  return (
    <div className="search-box">
      <div className="search" title={online ? undefined : 'No signal. Search needs the internet.'}>
        <SearchIcon size={20} strokeWidth={1.75} aria-hidden="true" />
        <input
          type="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="Wanted: somewhere with weather. Type a city…"
          aria-label="Search for a place"
          role="combobox"
          aria-expanded={phase.kind === 'results'}
          aria-controls={listId}
          aria-activedescendant={phase.kind === 'results' ? `${listId}-${sel}` : undefined}
          disabled={!online}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
        />
      </div>
      {phase.kind === 'results' && (
        <div className="results" id={listId} role="listbox" aria-label="Search results">
          {phase.rows.map((r, i) => (
            <button
              key={`${r.lat},${r.lng}`}
              type="button"
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === sel}
              tabIndex={-1}
              onClick={() => choose(r)}
            >
              <span>{r.name}</span>
              <span className="co">
                {[r.admin1, r.country].filter(Boolean).join(', ')} · {r.lat.toFixed(2)}, {r.lng.toFixed(2)}
              </span>
            </button>
          ))}
        </div>
      )}
      {phase.kind === 'none' && <p className="results__none">Never heard of it.</p>}
      {phase.kind === 'error' && <p className="results__none">{phase.text}</p>}
    </div>
  );
}

export function WhereAmI(): ReactElement {
  const online = useBar((s) => s.online);
  const showToast = useBar((s) => s.showToast);
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="plate plate--ghost"
      disabled={!online || busy}
      title={online ? 'Uses your device location, resolved offline' : 'No signal'}
      onClick={() => {
        unlockAudio();
        setBusy(true);
        whereAmI()
          .then(({ lat, lng }) => pour(lat, lng))
          .catch((e: unknown) =>
            showToast(
              e instanceof LocationDeniedError ? e.message : 'The bar respects your privacy. Spin the globe instead.',
            ),
          )
          .finally(() => setBusy(false));
      }}
    >
      <LocateFixed size={18} strokeWidth={1.75} aria-hidden="true" /> Where am I
    </button>
  );
}
