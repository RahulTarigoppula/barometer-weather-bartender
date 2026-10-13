import { type ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import { useReduced } from '../../app/useReduced';
import { createCosmos } from './cosmos';
import { SCENES, sceneAt, TOTAL } from './timeline';

const FADE = 1.2; // the last seconds fade the story into the app
const CHIPS = ['The weather, right now', 'Today’s tips', 'The right drink, at your budget', 'The roads'];

/** The opening story. Full screen, skippable (button or Esc), under forty seconds. */
export function Story({ onDone }: { onDone: () => void }): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const reduced = useReduced();
  const [index, setIndex] = useState(0);
  const done = useRef(false);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    onDone();
  }, [onDone]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cosmos = createCosmos(canvas, { reduced, texture: `${import.meta.env.BASE_URL}textures/earth-day.jpg` });
    const onResize = (): void => cosmos.resize();
    window.addEventListener('resize', onResize);
    let raf = 0;
    let last = performance.now();
    let t = 0;
    let shown = 0;
    if (import.meta.env.DEV) {
      const w = window as unknown as Record<string, unknown>;
      w.__storySeek = (s: number) => {
        t = s;
      };
      // Average draw cost in ms at a given story time, for performance checks.
      w.__storyBench = (s: number, n = 60) => {
        const t0 = performance.now();
        for (let i = 0; i < n; i++) cosmos.draw(s + i / 60);
        return (performance.now() - t0) / n;
      };
    }
    const frame = (now: number): void => {
      // A long pause (hidden tab) does not skip the story ahead.
      t += Math.min(0.25, (now - last) / 1000);
      last = now;
      cosmos.draw(t);
      const i = sceneAt(t).index;
      if (i !== shown) {
        shown = i;
        setIndex(i);
      }
      if (barRef.current) barRef.current.style.transform = `scaleX(${t / TOTAL})`;
      if (rootRef.current) rootRef.current.style.opacity = String(1 - Math.max(0, (t - (TOTAL - FADE)) / FADE));
      if (t >= TOTAL) {
        finish();
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [reduced, finish]);

  useEffect(() => {
    skipRef.current?.focus();
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish]);

  const scene = SCENES[index] ?? SCENES[0];
  const id = scene?.id;
  return (
    <div className="story-intro" role="dialog" aria-modal="true" aria-label="Our story" ref={rootRef}>
      <canvas
        ref={canvasRef}
        className="story-intro__canvas"
        role="img"
        aria-label="From the Milky Way to the Sun, past the planets, down to Earth and India"
      />
      <div className="story-intro__scrim" aria-hidden="true" />
      <div className={`story-intro__text story-intro__text--${id}`} key={id} aria-live="polite">
        {id === 'title' ? (
          <>
            <p className="story-intro__dev" lang="hi">
              मौसम का माहौल
            </p>
            <h2 className="story-intro__title">Mausam ka Mahaul</h2>
            <p className="story-intro__sub">the vibe of the weather</p>
          </>
        ) : (
          <>
            <p className="story-intro__line" lang={id === 'memory' ? 'hi-Latn' : undefined}>
              {scene?.line}
            </p>
            {id === 'app' && (
              <ul className="story-intro__chips">
                {CHIPS.map((c, i) => (
                  <li key={c} style={{ animationDelay: `${250 + i * 220}ms` }}>
                    {c}
                  </li>
                ))}
              </ul>
            )}
            <p className="story-intro__sub">{scene?.sub}</p>
          </>
        )}
      </div>
      <div className="story-intro__bar" aria-hidden="true">
        <span ref={barRef} />
      </div>
      <button ref={skipRef} type="button" className="btn story-intro__skip" onClick={finish}>
        Skip story
      </button>
    </div>
  );
}
