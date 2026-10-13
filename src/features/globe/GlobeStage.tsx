import { Home, Minus, Orbit, Plus } from 'lucide-react';
import { type KeyboardEvent, type ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import { unlockAudio } from '../../audio/sfx';
import { fmtTempShort } from '../../engine/units';
import { haptic } from '../../platform/haptics';
import { reducedMotion, useSettings } from '../../state/settings';
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
    ? window.requestIdleCallback(fn, { timeout: 1200 })
    : window.setTimeout(fn, 200);

/** The planet. The canvas globe paints first; the WebGL planet mounts on idle and takes over. */
export function GlobeStage(): ReactElement {
  const fallbackRef = useRef<HTMLDivElement>(null);
  const webglRef = useRef<HTMLDivElement>(null);
  const active = useRef<GlobeController | null>(null);
  const fallback = useRef<GlobeController | null>(null);
  const webgl = useRef<GlobeController | null>(null);
  const status = useBar((s) => s.globe);
  const pin = useBar((s) => s.pin);
  const patch = useBar((s) => s.patch);
  const cityTemps = useBar((s) => s.cityTemps);
  const tempUnit = useSettings((s) => s.units.temp);
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

  // The canvas globe, mounted once (StrictMode-safe: the cleanup disposes the first instance).
  useEffect(() => {
    const el = fallbackRef.current;
    if (!el) return;
    const g = createFallbackGlobe(el, callbacks());
    fallback.current = g;
    if (!active.current) active.current = g;
    const p = useBar.getState().pin;
    if (p) {
      g.setPin(p);
      g.flyTo(p.lat, p.lng);
    }
    return () => {
      g.dispose();
      if (active.current === g) active.current = null;
      fallback.current = null;
    };
  }, [callbacks]);

  // The WebGL planet, lazily. `seat` re-mounts a NEW canvas after context loss.
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
          if (p) mine.setPin(p);
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

  // Live temperatures beside the city labels (re-applied when the WebGL planet takes over).
  // biome-ignore lint/correctness/useExhaustiveDependencies: `status` flips when a new globe mounts
  useEffect(() => {
    const out: Record<string, string> = {};
    for (const [name, c] of Object.entries(cityTemps)) out[name] = fmtTempShort(c, tempUnit);
    for (const g of [fallback.current, webgl.current]) g?.setCityTemps?.(out);
  }, [cityTemps, tempUnit, status]);

  // Pause the render loop when the tab is hidden or a full-screen overlay covers the planet.
  const stagePaused = useBar((s) => s.stagePaused);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `status` flips when a new globe mounts
  useEffect(() => {
    const apply = (): void => {
      for (const g of [fallback.current, webgl.current]) g?.pause(document.hidden || stagePaused);
    };
    apply();
    document.addEventListener('visibilitychange', apply);
    return () => document.removeEventListener('visibilitychange', apply);
  }, [stagePaused, status]);

  // Past the planet's far limit is the universe: zoom out (button, key or two wheel notches) to open it.
  const openCosmos = useCallback(() => patch({ cosmos: true }), [patch]);
  // Coming back from the universe lands on India, the way the story does.
  const cosmosOpen = useBar((s) => s.cosmos);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !cosmosOpen) active.current?.home();
    wasOpen.current = cosmosOpen;
  }, [cosmosOpen]);
  const wheelAtLimit = useRef(0);
  const zoomOut = useCallback(() => {
    const g = active.current;
    if (!g) return;
    if (g.atFarLimit()) openCosmos();
    else g.zoom(1.18);
  }, [openCosmos]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>): void => {
    const g = active.current;
    if (!g) return;
    const k = e.key;
    if (k === 'ArrowLeft') g.nudge(0, -5);
    else if (k === 'ArrowRight') g.nudge(0, 5);
    else if (k === 'ArrowUp') g.nudge(5, 0);
    else if (k === 'ArrowDown') g.nudge(-5, 0);
    else if (k === '+' || k === '=') g.zoom(0.85);
    else if (k === '-' || k === '_') zoomOut();
    else if (k === 'h' || k === 'H') g.home();
    else if (k === 'Enter' || k === ' ') {
      unlockAudio();
      const c = g.center();
      void pour(c.lat, c.lng);
    } else return;
    e.preventDefault();
  };

  const webglOn = status === 'webgl';
  return (
    <div className="stage">
      <div
        className="stage__globe"
        role="application"
        tabIndex={0}
        aria-label="Planet Earth, centred on India. Drag to spin, tap anywhere for its weather. Arrow keys rotate, Enter chooses the centre, H returns to India."
        aria-roledescription="globe"
        onKeyDown={onKey}
        onPointerDown={() => {
          unlockAudio();
          haptic('light');
        }}
        onWheel={(e) => {
          const g = active.current;
          if (e.deltaY > 0 && g?.atFarLimit()) {
            wheelAtLimit.current += 1;
            if (wheelAtLimit.current >= 3) {
              wheelAtLimit.current = 0;
              openCosmos();
            }
          } else wheelAtLimit.current = 0;
        }}
      >
        <div ref={fallbackRef} className={`globe-layer${webglOn ? ' globe-layer--hidden' : ''}`} />
        <div ref={webglRef} className={`globe-layer${webglOn ? '' : ' globe-layer--hidden'}`} />
      </div>
      <div className="stage__tools" role="group" aria-label="Globe controls">
        <button type="button" className="icon-btn" aria-label="Back to India" onClick={() => active.current?.home()}>
          <Home size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <button type="button" className="icon-btn" aria-label="Zoom in" onClick={() => active.current?.zoom(0.85)}>
          <Plus size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <button type="button" className="icon-btn" aria-label="Zoom out" onClick={zoomOut}>
          <Minus size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--cosmos"
          aria-label="Zoom out to the universe"
          title="Zoom out to the universe"
          onClick={openCosmos}
        >
          <Orbit size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
      {status === 'seized' && (
        <button
          type="button"
          className="chip chip--warn stage__seized"
          onClick={() => {
            patch({ globe: 'svg' });
            setSeat((n) => n + 1);
          }}
        >
          The 3D planet stalled. Tap to restart it.
        </button>
      )}
    </div>
  );
}
