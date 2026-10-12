import { type ReactElement, useEffect, useRef, useState } from 'react';
import { useReduced } from '../../app/useReduced';
import { LAYERS, windowWeather } from '../../engine/window';
import { currentVerdict, useBar } from '../../state/store';
import { GlobeCradle } from '../globe/GlobeCradle';

/** The window behind the counter: sky, weather on the glass, grade tint, brass mullion, the neon wordmark. */
export function BarWindow(): ReactElement {
  const verdict = useBar((s) => currentVerdict(s));
  const reduced = useReduced();
  const weather = verdict ? windowWeather(verdict) : null;
  const flash = useRef<HTMLDivElement>(null);
  const lastStrike = useRef(0);
  const [strike, setStrike] = useState(0);

  // A11 — one lightning frame per stormy verdict, never twice within a second.
  useEffect(() => {
    if (!verdict || !weather?.lightning) return;
    const t = window.setTimeout(() => {
      const now = performance.now();
      if (now - lastStrike.current < 1000) return;
      lastStrike.current = now;
      setStrike((n) => n + 1);
    }, 700);
    return () => window.clearTimeout(t);
  }, [verdict, weather?.lightning]);

  useEffect(() => {
    const el = flash.current;
    if (!el || strike === 0) return;
    const cls = reduced ? 'wx--step' : 'wx--strike';
    el.classList.remove('wx--strike', 'wx--step');
    void el.offsetWidth;
    el.classList.add(cls);
  }, [strike, reduced]);

  return (
    <section className="window" aria-label="Bar window">
      {LAYERS.map((l) => (
        <div
          key={l}
          className={`wx wx--${l}${weather?.on.has(l) ? ' wx--on' : ''}`}
          data-layer={l}
          data-static={reduced ? 'true' : undefined}
          aria-hidden="true"
        />
      ))}
      <div ref={flash} className="wx wx--flash" data-static={reduced ? 'true' : undefined} aria-hidden="true" />
      <div className="window__grade" aria-hidden="true" />
      <div className="window__mullion" aria-hidden="true" />
      <p className="window__neon" aria-hidden="true">
        <span className="neon neon-sign">The Globe Bar</span>
        <small>Spin · Tap · Survive</small>
      </p>
      <GlobeCradle />
    </section>
  );
}
