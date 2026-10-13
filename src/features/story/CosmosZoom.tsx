import { Minus, Plus, X } from 'lucide-react';
import { type ReactElement, useEffect, useRef, useState } from 'react';
import { useReduced } from '../../app/useReduced';
import { createCosmos, EARTH_T, UNIVERSE_T } from './cosmos';
import { sceneAt } from './timeline';

type Level = 'earth' | 'solar' | 'galaxy' | 'universe';
/** z = 0 is the Earth; z = 1 the known universe. */
const tAt = (z: number): number => UNIVERSE_T + (EARTH_T - UNIVERSE_T) * (1 - z);
const LEVEL: Record<Level, { name: string; fact: string }> = {
  earth: { name: 'Earth', fact: 'Zoom back in to return to the weather.' },
  solar: { name: 'The Solar System', fact: 'Earth is the third planet, 150 million km from the Sun.' },
  galaxy: { name: 'The Milky Way', fact: 'About 100,000 light-years across. We are two-thirds of the way out.' },
  universe: {
    name: 'The known universe',
    fact: 'Hundreds of billions of galaxies. Life has been found on exactly one planet.',
  },
};
const levelAt = (z: number): Level => {
  const id = sceneAt(tAt(z)).scene.id;
  return id === 'universe' ? 'universe' : id === 'galaxy' ? 'galaxy' : id === 'solar' ? 'solar' : 'earth';
};

/**
 * Zoom out from the planet to the known universe, and back. `z` is 0 at the Earth and 1 at the
 * full Milky Way; it maps onto the story's camera, run backwards. Wheel, pinch, keys, buttons or slider.
 */
export function CosmosZoom({ onClose }: { onClose: () => void }): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const target = useRef(0.55);
  const [z, setZ] = useState(0);
  const reduced = useReduced();
  const closing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cosmos = createCosmos(canvas, { reduced, texture: `${import.meta.env.BASE_URL}textures/earth-day.jpg` });
    const onResize = (): void => cosmos.resize();
    window.addEventListener('resize', onResize);
    let cur = 0;
    let shown = -1;
    let raf = 0;
    const t0 = performance.now();
    const frame = (now: number): void => {
      const clock = (now - t0) / 1000;
      cur = reduced ? target.current : cur + (target.current - cur) * 0.08;
      cosmos.draw(tAt(cur), clock + 6);
      const rounded = Math.round(cur * 100) / 100;
      if (rounded !== shown) {
        shown = rounded;
        setZ(rounded);
      }
      if (target.current <= 0 && cur < 0.01 && !closing.current) {
        closing.current = true;
        onClose();
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const nudge = (d: number): void => {
      target.current = Math.max(0, Math.min(1, target.current + d));
    };
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault();
      nudge(e.deltaY * 0.0009);
    };
    const pts = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    const span = (): number => {
      const [a, b] = [...pts.values()];
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    };
    const onDown = (e: PointerEvent): void => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      pinch = span();
    };
    const onMove = (e: PointerEvent): void => {
      if (!pts.has(e.pointerId)) return;
      const before = pts.get(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) {
        const s = span();
        if (pinch > 0 && s > 0) nudge(Math.log(pinch / s) * 0.6);
        pinch = s;
      } else if (before) nudge((before.y - e.clientY) * -0.0025);
    };
    const onUp = (e: PointerEvent): void => {
      pts.delete(e.pointerId);
      pinch = span();
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') target.current = 0;
      else if (e.key === '-' || e.key === '_') nudge(0.12);
      else if (e.key === '+' || e.key === '=') nudge(-0.12);
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('keydown', onKey);
    };
  }, [reduced, onClose]);

  const level = LEVEL[levelAt(z)];
  return (
    <div className="cosmos" role="dialog" aria-modal="true" aria-label="Zoom out to the universe">
      <canvas
        ref={canvasRef}
        className="story-intro__canvas cosmos__canvas"
        role="img"
        aria-label={`${level.name}. ${level.fact}`}
      />
      <div className="cosmos__label" aria-live="polite">
        <p className="cosmos__name">{level.name}</p>
        <p className="cosmos__fact">{level.fact}</p>
      </div>
      <div className="cosmos__tools">
        <button
          type="button"
          className="icon-btn"
          aria-label="Zoom out"
          onClick={() => {
            target.current = Math.min(1, target.current + 0.15);
          }}
        >
          <Minus size={18} aria-hidden="true" />
        </button>
        <input
          className="cosmos__slider"
          type="range"
          min={0}
          max={100}
          value={Math.round(z * 100)}
          aria-label="Zoom from Earth to the known universe"
          onChange={(e) => {
            target.current = Number(e.target.value) / 100;
          }}
        />
        <button
          type="button"
          className="icon-btn"
          aria-label="Zoom in"
          onClick={() => {
            target.current = Math.max(0, target.current - 0.15);
          }}
        >
          <Plus size={18} aria-hidden="true" />
        </button>
      </div>
      <button
        type="button"
        className="btn cosmos__back"
        onClick={() => {
          target.current = 0;
        }}
      >
        <X size={16} aria-hidden="true" /> Back to Earth
      </button>
    </div>
  );
}
