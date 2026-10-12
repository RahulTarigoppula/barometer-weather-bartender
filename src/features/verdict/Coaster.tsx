import {
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useReduced } from '../../app/useReduced';
import { play } from '../../audio/sfx';
import { DRINKS, GRAMMAR } from '../../data/menu';
import { fmtDuration, sunsetSoon } from '../../engine/daypart';
import { served } from '../../engine/index';
import { twinOf } from '../../engine/menu';
import type { Drink, Verdict } from '../../engine/types';
import { fmtTemp, windLabel, windValue } from '../../engine/units';
import { haptic } from '../../platform/haptics';
import { useSettings } from '../../state/settings';
import { type ErrorKind, useBar } from '../../state/store';
import { plain, speak, splitIntensifier } from '../../wit/speak';
import { tearReceipt } from '../register/tear';
import { Glassware, glassLabel } from './Glassware';
import { backToBar, pour } from './pour';

const Loud = ({ text }: { text: string }): ReactElement => (
  <>
    {splitIntensifier(text).map((seg, i) =>
      seg.loud ? (
        // biome-ignore lint/suspicious/noArrayIndexKey: segments of one immutable sentence
        <em key={i} className="intensifier">
          {seg.text}
        </em>
      ) : (
        // biome-ignore lint/suspicious/noArrayIndexKey: segments of one immutable sentence
        <span key={i}>{seg.text}</span>
      ),
    )}
  </>
);

function hourWords(h: number): string {
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${h < 12 ? 'a.m.' : 'p.m.'}`;
}

function Strip({ v, drink }: { v: Verdict; drink: Drink }): ReactElement {
  const units = useSettings((s) => s.units);
  const f = v.features;
  const t = (c: number): string => fmtTemp(c, units.temp);
  return (
    <div className="strip num" data-drink={drink.id}>
      <span>
        FEELS <b>{t(f.apparentC)}</b>
      </span>
      <span>
        DEW <b>{t(f.dewPointC)}</b>
      </span>
      <span>
        WIND <b>{windValue(f.windKmh, units.wind)}</b> {windLabel(units.wind).toUpperCase()}
      </span>
      <span>
        UV <b>{Math.round(f.uv)}</b>
      </span>
      <span>
        AQI <b>{f.euAqi === null ? '—' : Math.round(f.euAqi)}</b> EU
      </span>
      {f.marine && (
        <>
          <span>
            SST <b>{t(f.marine.sstC)}</b>
          </span>
          <span>
            WAVES <b>{f.marine.waveHeightM.toFixed(1)}</b> M
          </span>
        </>
      )}
      <span>
        LOCAL <b>{v.localTime}</b>
      </span>
      <span>
        <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">
          Weather data by Open-Meteo.com
        </a>
        {v.sources.air ? ' · CAMS' : ''}
        {v.sources.marine ? ' · DWD' : ''}
      </span>
    </div>
  );
}

function Recipe({ drink, onFlipBack }: { drink: Drink; onFlipBack: () => void }): ReactElement {
  const set = useSettings((s) => s.set);
  const twin = twinOf(DRINKS, drink, drink.alcoholic ? 'barista' : 'bar');
  return (
    <div
      className="paper coaster__face coaster__face--back recipe"
      role="group"
      aria-label={`Recipe for ${drink.name}`}
    >
      <span className="coaster-ring" aria-hidden="true" />
      <h3>{drink.name}</h3>
      <p className="coaster__meta">
        {glassLabel(drink)} · {drink.serve}
        {drink.alcoholic ? ` · ${drink.abv}% abv` : ' · alcohol-free'}
      </p>
      <hr className="recipe__rule" />
      <table>
        <tbody>
          {drink.recipe.ingredients.map((r) => (
            <tr key={r.ingredient}>
              <th scope="row" className="num">
                {r.amount}
              </th>
              <td>{r.ingredient}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <hr className="recipe__rule" />
      <ol>
        {drink.recipe.method.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ol>
      <div className="coaster__serve" style={{ marginTop: 'var(--space-3)' }}>
        <Glassware drink={drink} size={44} />
        <span>{glassLabel(drink)}</span>
      </div>
      <div className="coaster__actions">
        {twin && twin.id !== drink.id ? (
          <button
            type="button"
            className="plate plate--ghost"
            onClick={() => set({ menu: drink.alcoholic ? 'barista' : 'bar' })}
          >
            {drink.alcoholic ? '◎ Make it virgin' : '◎ Make it a cocktail'}
          </button>
        ) : (
          <p className="recipe__credit">No twin for this one. Have a lime soda and think about it.</p>
        )}
        <button type="button" className="plate" onClick={onFlipBack}>
          Flip back
        </button>
      </div>
      <p className="recipe__credit">
        Recipe frame:{' '}
        {drink.recipe.source === 'iba' ? 'IBA' : drink.recipe.source === 'opendrinks' ? 'Open Drinks' : 'house'}
        {drink.recipe.source === 'house' ? '' : ' (MIT)'} · method written in-house.
      </p>
    </div>
  );
}

function Printed({ v, note }: { v: Verdict; note: 'stale' | 'repoured' | null }): ReactElement {
  const { menu, gentler, units } = useSettings();
  const setSettings = useSettings((s) => s.set);
  const opinion = useBar((s) => s.opinion);
  const flipped = useBar((s) => s.flipped);
  const patch = useBar((s) => s.patch);
  const reduced = useReduced();
  const s = served(v, DRINKS, menu, opinion, gentler);
  const lines = useMemo(
    () => speak({ ...v, stamp: s.stamp }, GRAMMAR, s.drink, { units, second: s.second }),
    [v, s.stamp, s.drink, s.second, units],
  );
  const iced = s.drink.serve === 'iced' || s.drink.serve === 'frozen';
  const [wet, setWet] = useState(false);
  useEffect(() => {
    setWet(false);
    if (!iced) return;
    const t = window.setTimeout(() => setWet(true), reduced ? 0 : 260);
    return () => window.clearTimeout(t);
  }, [iced, reduced]);

  const flip = (to: boolean): void => {
    play('shhk');
    patch({ flipped: to });
  };
  const second = (): void => {
    const n = v.runnersUp.length + 1;
    patch({ opinion: (opinion + 1) % n });
    play('clunk');
    haptic('selection');
  };
  const swipe = useRef<number | null>(null);
  const onDown = (e: PointerEvent): void => {
    swipe.current = e.clientX;
  };
  const onUp = (e: PointerEvent): void => {
    if (swipe.current !== null && e.pointerType !== 'mouse' && swipe.current - e.clientX > 60) second();
    swipe.current = null;
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter') {
      flip(!flipped);
      e.preventDefault();
    } else if (e.key === 'Escape' && flipped) {
      flip(false);
      e.preventDefault();
    }
  };
  const onFaceClick = (e: { target: EventTarget }): void => {
    if (e.target instanceof Element && e.target.closest('button, a')) return;
    flip(!flipped);
  };

  const sunset = sunsetSoon(v.features.minutesToSunset)
    ? ` · sunset in ${fmtDuration(v.features.minutesToSunset)}`
    : '';
  let tags: ReactNode = null;
  if (note === 'stale')
    tags = (
      <span className="tag-brass">
        <b>Brass tag</b> Re-poured from memory — the models are not answering.
      </span>
    );
  else if (note === 'repoured')
    tags = (
      <span className="tag-brass">
        <b>Brass tag</b> Re-poured. The first one went warm.
      </span>
    );
  if (v.suggestBarista && menu === 'bar') {
    tags = (
      <>
        {tags}
        <button type="button" className="tag-brass" onClick={() => setSettings({ menu: 'barista' })}>
          <b>Brass tag</b> It’s {hourWords(v.features.localHour)} there. I am legally a barista now. Flip the sign?
        </button>
      </>
    );
  }

  return (
    <div
      className={`coaster${flipped ? ' coaster--flipped' : ''}`}
      role="article"
      tabIndex={0}
      aria-label={`Verdict for ${v.place.label}: ${s.stamp.text.toLowerCase()} ${s.drink.name}`}
      onKeyDown={onKey}
      onPointerDown={onDown}
      onPointerUp={onUp}
    >
      <div className="paper coaster__face" onClick={onFaceClick} aria-hidden={flipped}>
        <span className="coaster__glowring" aria-hidden="true" />
        <span className="coaster-ring" aria-hidden="true" />
        <p className="coaster__place">{lines.place}</p>
        <p className="coaster__meta">
          {lines.time}
          {sunset}
        </p>
        {tags}
        <p className="coaster__jab">{lines.jab}</p>
        {lines.hedge && <p className="coaster__hedge">{lines.hedge}</p>}
        <span className="coaster__stamp" data-ink={s.stamp.ink} data-tier={s.stamp.tier}>
          {s.second ? 'Second opinion' : s.stamp.text}
        </span>
        <h2 className="coaster__drink">{s.drink.name}</h2>
        <div className="coaster__serve">
          <span className={`condensation${wet ? ' condensation--on' : ''}`} aria-hidden="true" />
          <Glassware key={`${s.drink.id}-${v.createdAt}`} drink={s.drink} />
          <span>
            <Loud text={lines.drink} /> {lines.serve}
            <span className="coaster__closer">{lines.closer}</span>
          </span>
        </div>
        <Strip v={v} drink={s.drink} />
        <div className="coaster__actions">
          <button type="button" className="plate" onClick={() => flip(true)}>
            Flip for recipe
          </button>
          <button type="button" className="plate plate--ghost" onClick={() => void tearReceipt()}>
            Tear off
          </button>
          {v.runnersUp.length > 0 && (
            <button type="button" className="plate plate--ghost" onClick={second}>
              {s.second ? 'His first answer' : 'Second opinion'}
            </button>
          )}
        </div>
      </div>
      <Recipe drink={s.drink} onFlipBack={() => flip(false)} />
      <span className="sr">{plain(lines.drink)}</span>
    </div>
  );
}

function Skeleton(): ReactElement {
  return (
    <div className="coaster" aria-busy="true">
      <div className="paper coaster__face">
        <span className="sr">The bartender is pouring.</span>
        <span className="coaster-ring" aria-hidden="true" />
        <div className="skel skel--a" />
        <div className="skel skel--b" />
        <div className="skel skel--c" />
        <div className="skel skel--d" />
        <div className="skel skel--e" />
        <div className="skel skel--f" />
      </div>
    </div>
  );
}

const ERRORS: Record<ErrorKind, { stamp: string; head: string; jab: string }> = {
  busy: {
    stamp: 'ONE MINUTE',
    head: 'Bar’s busy. Give it a minute.',
    jab: 'The weather service has a house limit and somebody has been leaning on it. Probably not you.',
  },
  silent: {
    stamp: 'NO SIGNAL',
    head: 'The models are not answering. Try again.',
    jab: 'The forecast has gone quiet, and I am not going to invent weather for you. That is what the other apps do.',
  },
  nowhere: {
    stamp: 'NOWHERE',
    head: 'Nowhere on Earth has those coordinates. Impressive.',
    jab: 'Latitude runs to ninety and longitude to one-eighty. You found the bit in between that does not exist.',
  },
};

function ErrorCoaster({
  error,
  lat,
  lng,
  retryAt,
}: {
  error: ErrorKind;
  lat: number;
  lng: number;
  retryAt: number;
}): ReactElement {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (error !== 'busy') return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [error]);
  const left = Math.max(0, Math.ceil((retryAt - now) / 1000));
  const e = ERRORS[error];
  return (
    <div className="coaster" role="article" aria-label={e.head}>
      <div className="paper coaster__face" data-error={error}>
        <span className="coaster-ring" aria-hidden="true" />
        <p className="coaster__place">The Globe Bar</p>
        <p className="coaster__meta">no verdict · the counter is still open</p>
        <span className="coaster__stamp" style={{ ['--stamp' as string]: 'var(--paper-warning)' }}>
          {e.stamp}
        </span>
        <h2 className="coaster__drink">{e.head}</h2>
        <p className="coaster__jab">{e.jab}</p>
        {error === 'busy' && (
          <div className="strip">
            <span>
              RETRY IN <b className="countdown">{left}</b> S
            </span>
          </div>
        )}
        <div className="coaster__actions">
          {error !== 'nowhere' && (
            <button
              type="button"
              className="plate"
              disabled={error === 'busy' && left > 0}
              onClick={() => void pour(lat, lng)}
            >
              Retry
            </button>
          )}
          <button type="button" className="plate plate--ghost" onClick={backToBar}>
            Back to the bar
          </button>
        </div>
      </div>
    </div>
  );
}

/** The coaster: skeleton → printed in the SAME node (keyed by the slide counter, not by content). */
export function CoasterSlot(): ReactElement | null {
  const coaster = useBar((s) => s.coaster);
  const slide = useBar((s) => s.slide);
  if (coaster.kind === 'empty') return null;
  return (
    <div className="coaster-wrap coaster--slide" key={slide}>
      {coaster.kind === 'pouring' && <Skeleton />}
      {coaster.kind === 'verdict' && <Printed v={coaster.verdict} note={coaster.note} />}
      {coaster.kind === 'error' && <ErrorCoaster {...coaster} />}
    </div>
  );
}
