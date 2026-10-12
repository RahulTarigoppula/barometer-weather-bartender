import { type ReactElement, useEffect, useMemo, useRef, useState } from 'react';
import { loadDots } from '../../api/geo';
import { useReduced } from '../../app/useReduced';
import { play } from '../../audio/sfx';
import cities from '../../data/cities-ticker.json';
import { DRINKS } from '../../data/menu';
import { served } from '../../engine/index';
import { lineText, receiptLines } from '../../engine/receipt';
import { tickerLines } from '../../engine/ticker';
import { useSettings } from '../../state/settings';
import { currentVerdict, useBar } from '../../state/store';
import { tearReceipt } from './tear';

function DotGlobe({ lat, lng }: { lat: number; lng: number }): ReactElement {
  const [dots, setDots] = useState<[number, number][]>([]);
  useEffect(() => {
    void loadDots().then(setDots);
  }, []);
  const px = ((lng + 180) / 360) * 176;
  const py = ((90 - lat) / 180) * 88;
  return (
    <svg viewBox="0 0 176 88" width="176" height="88" aria-hidden="true">
      {dots.map(([x, y]) => (
        <circle
          key={`${x},${y}`}
          cx={((x + 180) / 360) * 176}
          cy={((90 - y) / 180) * 88}
          r=".9"
          fill="currentColor"
          opacity=".55"
        />
      ))}
      <circle cx={px} cy={py} r="3" fill="#A0281F" />
    </svg>
  );
}

function useTicker(): string {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  return useMemo(() => tickerLines(now, cities).join(' · '), [now]);
}

/** The register: an amber VFD ticker of real local clocks, and the thermal receipt for the verdict. */
export function Register(): ReactElement {
  const verdict = useBar((s) => currentVerdict(s));
  const receipt = useBar((s) => s.receipt);
  const tornAt = useBar((s) => s.tornAt);
  const online = useBar((s) => s.online);
  const opinion = useBar((s) => s.opinion);
  const { menu, gentler, units } = useSettings();
  const reduced = useReduced();
  const ticker = useTicker();
  const [paused, setPaused] = useState(false);
  const hold = useRef(0);

  const lines = useMemo(() => {
    if (!verdict) return [];
    const s = served(verdict, DRINKS, menu, opinion, gentler);
    return receiptLines(verdict, s.drink, units, s.second ? 'SECOND OPINION:' : s.stamp.text);
  }, [verdict, menu, opinion, gentler, units]);

  // Paper feed: a tick every three lines while it prints.
  useEffect(() => {
    if (receipt !== 'printing' || reduced || lines.length === 0) return;
    const timers = Array.from({ length: Math.ceil(lines.length / 3) }, (_, i) =>
      window.setTimeout(() => play('feed'), i * 180),
    );
    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  }, [receipt, lines.length, reduced]);

  const tape = online ? ticker : 'NO SIGNAL · SERVING FROM THE TAB';
  const state = !verdict ? 'idle' : receipt === 'torn' ? 'torn' : 'ready';

  return (
    <section className="register" aria-label="Register">
      <div
        className={`vfd${paused ? ' vfd--paused' : ''}`}
        title="Long-press to pause the ticker"
        onPointerDown={() => {
          hold.current = window.setTimeout(() => setPaused((p) => !p), 450);
        }}
        onPointerUp={() => window.clearTimeout(hold.current)}
        onPointerLeave={() => window.clearTimeout(hold.current)}
      >
        <span className="vfd__tape num" style={{ ['--tape-dur' as string]: `${Math.max(18, tape.length / 4)}s` }}>
          {`${tape} · ${tape} · `}
        </span>
      </div>
      <div className="register__foot">
        <span className="register__label">Register · {state}</span>
        <button
          type="button"
          className="plate"
          disabled={!verdict || receipt === 'torn'}
          onClick={() => void tearReceipt()}
          aria-label="Tear off the receipt and share it"
        >
          Tear
        </button>
      </div>
      {verdict && receipt === 'printing' && (
        <div className="paper receipt" key={`${verdict.createdAt}-${menu}-${opinion}`}>
          <table>
            <caption className="sr">Receipt for {verdict.place.label}</caption>
            <tbody>
              {lines.map((l, i) => {
                const style = { ['--i' as string]: i };
                const k = `${i}-${l.kind}`;
                if (l.kind === 'rule')
                  return (
                    <tr key={k} className="receipt__line" style={style}>
                      <td colSpan={2}>
                        <hr className="receipt__rule" />
                      </td>
                    </tr>
                  );
                if (l.kind === 'globe')
                  return (
                    <tr key={k} className="receipt__line" style={style}>
                      <td colSpan={2} className="receipt__globe">
                        <DotGlobe lat={verdict.lat} lng={verdict.lng} />
                      </td>
                    </tr>
                  );
                if (l.kind === 'row')
                  return (
                    <tr key={k} className="receipt__line" style={style}>
                      <th scope="row">{l.label}</th>
                      <td className="receipt__value">{l.value}</td>
                    </tr>
                  );
                return (
                  <tr key={k} className={`receipt__line${l.kind === 'head' ? ' receipt__head' : ''}`} style={style}>
                    <td colSpan={2}>{lineText(l)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {receipt === 'torn' && <p className="receipt__stub">receipt torn {tornAt} · saved as a 1080×1350 card</p>}
    </section>
  );
}
