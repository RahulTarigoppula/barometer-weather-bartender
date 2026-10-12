import { type KeyboardEvent, type ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import { unlockAudio } from '../../audio/sfx';
import { haptic } from '../../platform/haptics';
import { reducedMotion } from '../../state/settings';
import { useBar } from '../../state/store';
import { pour } from '../verdict/pour';
import type { GlobeCallbacks, GlobeController } from './controller';
import { createFallbackGlobe } from './fallbackGlobe';

const hasWebGL = (): boolean => {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
};

const whenIdle = (fn: () => void): number =>
  typeof window.requestIdleCallback === 'function'
    ? window.requestIdleCallback(fn, { timeout: 1500 })
    : window.setTimeout(fn, 300);

function CradleArt(): ReactElement {
  return (
    <svg className="cradle__ring" viewBox="0 0 200 240" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <g transform="rotate(-15 100 96)">
        <circle cx="100" cy="96" r="93" fill="none" stroke="url(#brassV)" strokeWidth="5.5" />
        <circle cx="100" cy="3" r="4.6" fill="url(#brassV)" />
        <circle cx="100" cy="189" r="4.6" fill="url(#brassV)" />
        <g stroke="#F5C860" strokeWidth=".9" opacity=".55">
          <path d="M100 186 v6" />
          <path d="M76 183 l-2 5.7" />
          <path d="M124 183 l2 5.7" />
          <path d="M53 173 l-3 5" />
          <path d="M147 173 l3 5" />
        </g>
      </g>
      <path d="M86 196 L114 196 L110 216 L90 216 Z" fill="url(#woodG)" stroke="#8A6414" strokeWidth="1" />
      <ellipse cx="100" cy="221" rx="38" ry="9" fill="url(#woodG)" stroke="#8A6414" strokeWidth="1" />
      <ellipse cx="100" cy="227" rx="31" ry="5" fill="url(#brassH)" opacity=".9" />
    </svg>
  );
}

/** The brass-cradled planet. The engraved canvas globe paints first; WebGL mounts on idle. */
export function GlobeCradle(): ReactElement {
  const fallbackRef = useRef<HTMLDivElement>(null);
  const webglRef = useRef<HTMLDivElement>(null);
  const active = useRef<GlobeController | null>(null);
  const fallback = useRef<GlobeController | null>(null);
  const webgl = useRef<GlobeController | null>(null);
  const status = useBar((s) => s.globe);
  const pin = useBar((s) => s.pin);
  const patch = useBar((s) => s.patch);
  const [seat, setSeat] = useState(0);

  const callbacks = useCallback(
    (): GlobeCallbacks => ({
      onPick: (lat, lng) => {
        unlockAudio();
        void pour(lat, lng);
      },
      onCenter: (lat, lng) => useBar.getState().patch({ center: { lat, lng } }),
      onLost: () => {
        webgl.current?.dispose();
        webgl.current = null;
        active.current = fallback.current;
        useBar.getState().patch({ globe: 'seized' });
      },
      reduced: reducedMotion,
    }),
    [],
  );

  // The engraved globe — mounted once (StrictMode-safe: the cleanup disposes the first instance).
  useEffect(() => {
    const el = fallbackRef.current;
    if (!el) return;
    const g = createFallbackGlobe(el, callbacks());
    fallback.current = g;
    if (!active.current) active.current = g;
    return () => {
      g.dispose();
      if (active.current === g) active.current = null;
      fallback.current = null;
    };
  }, [callbacks]);

  // The WebGL globe, lazily, after first paint. `seat` re-mounts a NEW canvas after context loss.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `seat` is the re-seat trigger, by design
  useEffect(() => {
    const el = webglRef.current;
    if (!el || !hasWebGL()) return;
    let cancelled = false;
    let mine: GlobeController | null = null;
    const handle = whenIdle(() => {
      void import('./globeThree')
        .then(({ createThreeGlobe }) => {
          if (cancelled) return;
          mine = createThreeGlobe(el, callbacks());
          webgl.current = mine;
          active.current = mine;
          const p = useBar.getState().pin;
          if (p) {
            mine.setPin(p);
            mine.flyTo(p.lat, p.lng);
          }
          patch({ globe: 'webgl' });
        })
        .catch(() => patch({ globe: 'svg' }));
    });
    return () => {
      cancelled = true;
      if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(handle);
      window.clearTimeout(handle);
      mine?.dispose();
      if (webgl.current === mine) webgl.current = null;
      if (active.current === mine) active.current = fallback.current;
    };
  }, [callbacks, patch, seat]);

  // Pin + fly on every pour.
  useEffect(() => {
    for (const g of [fallback.current, webgl.current]) {
      g?.setPin(pin);
      if (pin) g?.flyTo(pin.lat, pin.lng);
    }
  }, [pin]);

  // Pause the render loop when the tab is hidden.
  useEffect(() => {
    const onVis = (): void => {
      for (const g of [fallback.current, webgl.current]) g?.pause(document.hidden);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const onKey = (e: KeyboardEvent<HTMLDivElement>): void => {
    const g = active.current;
    if (!g) return;
    const k = e.key;
    if (k === 'ArrowLeft') g.nudge(0, -5);
    else if (k === 'ArrowRight') g.nudge(0, 5);
    else if (k === 'ArrowUp') g.nudge(5, 0);
    else if (k === 'ArrowDown') g.nudge(-5, 0);
    else if (k === '+' || k === '=') g.zoom(0.85);
    else if (k === '-' || k === '_') g.zoom(1.18);
    else if (k === 'Enter' || k === ' ') {
      unlockAudio();
      const c = g.center();
      void pour(c.lat, c.lng);
    } else return;
    e.preventDefault();
  };

  const webglOn = status === 'webgl';
  return (
    <div className="cradle">
      <div
        className="globe-holder"
        role="application"
        tabIndex={0}
        aria-label="World globe. Arrow keys rotate, Enter chooses the centre."
        aria-roledescription="globe"
        onKeyDown={onKey}
        onPointerDown={() => {
          unlockAudio();
          haptic('light');
        }}
      >
        <div ref={fallbackRef} className={`globe-layer${webglOn ? ' globe-layer--hidden' : ''}`} />
        <div ref={webglRef} className={`globe-layer${webglOn ? '' : ' globe-layer--hidden'}`} />
      </div>
      <CradleArt />
      {status === 'seized' && (
        <button
          type="button"
          className="tag-brass seized"
          onClick={() => {
            patch({ globe: 'svg' });
            setSeat((n) => n + 1);
          }}
        >
          <b>Brass tag</b> The globe’s bearings seized. Tap to re-seat.
        </button>
      )}
    </div>
  );
}
