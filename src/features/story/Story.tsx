import { type ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import { useReduced } from '../../app/useReduced';
import { createCosmos } from './cosmos';
import { SCENES, sceneAt, TOTAL } from './timeline';

const FADE = 1.2; // the last seconds fade the story into the app

/** The opening story. Full screen, skippable (button or Esc), about half a minute. */
export function Story({ onDone }: { onDone: () => void }): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const reduced = useReduced();
  const [index, setIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
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
    if (import.meta.env.DEV) {
      (window as unknown as { __storySeek?: (s: number) => void }).__storySeek = (s) => {
        t = s;
      };
    }
    const frame = (now: number): void => {
      // A long pause (hidden tab) does not skip the story ahead.
      t += Math.min(0.25, (now - last) / 1000);
      last = now;
      cosmos.draw(t);
      const s = sceneAt(t);
      setIndex(s.index);
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
  const big = scene?.id === 'title';
  return (
    <div className="story-intro" role="dialog" aria-modal="true" aria-label="Our story" ref={rootRef}>
      <canvas
        ref={canvasRef}
        className="story-intro__canvas"
        role="img"
        aria-label="From the Milky Way to the Sun, past the planets, down to Earth and India"
      />
      <div className="story-intro__scrim" aria-hidden="true" />
      <div className={`story-intro__text${big ? ' story-intro__text--title' : ''}`} key={scene?.id} aria-live="polite">
        {big ? (
          <>
            <p className="story-intro__dev" lang="hi">
              मौसम का माहौल
            </p>
            <h2 className="story-intro__title">Mausam ka Mahaul</h2>
            <p className="story-intro__sub">the vibe of the weather</p>
          </>
        ) : (
          <>
            <p className="story-intro__line">{scene?.line}</p>
            {scene?.id === 'app' ? (
              <ul className="story-intro__chips">
                {['The weather, right now', "Today's tips", 'The right drink, at your budget', 'The roads'].map(
                  (c, i) => (
                    <li key={c} style={{ animationDelay: `${250 + i * 220}ms` }}>
                      {c}
                    </li>
                  ),
                )}
              </ul>
            ) : (
              <p className="story-intro__sub">{scene?.sub}</p>
            )}
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
