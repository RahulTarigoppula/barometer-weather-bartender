import { Menu as MenuIcon } from 'lucide-react';
import { type ReactElement, useEffect, useRef, useState } from 'react';
import { openDrawer } from '../../app/route';
import { play } from '../../audio/sfx';
import { DRINKS } from '../../data/menu';
import { served } from '../../engine/index';
import { RING } from '../../engine/tags';
import type { BottleId } from '../../engine/types';
import { fmtTemp } from '../../engine/units';
import { haptic } from '../../platform/haptics';
import { reducedMotion, useSettings } from '../../state/settings';
import { currentVerdict, useBar } from '../../state/store';
import { BOTTLES, SHAPES } from './bottles';

function BottleSvg({ shape, h, glass, label }: (typeof BOTTLES)[number]): ReactElement {
  const w = Math.round(h * 0.34);
  const labelY = shape === 'flask' ? 52 : 46;
  return (
    <svg viewBox="0 0 34 100" width={w} height={h} aria-hidden="true">
      <path
        d={SHAPES[shape]}
        fill={glass}
        stroke="#8A6414"
        strokeWidth={shape === 'sprig' ? 1.6 : 1.7}
        strokeLinejoin="round"
      />
      {shape !== 'sprig' && (
        <>
          <rect x="7.5" y={labelY} width="19" height="20" rx="1.5" fill={label} opacity=".9" />
          <rect x="9.5" y={labelY + 4} width="7" height="2" rx="1" fill="#1A0F0A" opacity=".55" />
          <rect x="9.5" y={labelY + 9} width="13" height="1.6" rx=".8" fill="#1A0F0A" opacity=".35" />
          <path d="M10 20 L10 96" stroke="#F5C860" strokeWidth="1.4" opacity=".16" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

function Shelf(): ReactElement {
  const verdict = useBar((s) => currentVerdict(s));
  const opinion = useBar((s) => s.opinion);
  const { menu, gentler } = useSettings();
  const picked: BottleId | null = verdict ? served(verdict, DRINKS, menu, opinion, gentler).drink.bottle : null;
  const showToast = useBar((s) => s.showToast);
  const shelf = useRef<HTMLDivElement>(null);

  // On a narrow shelf, slide the picked bottle into view.
  useEffect(() => {
    const el = shelf.current;
    const btn = picked ? el?.querySelector<HTMLElement>(`[data-bottle="${picked}"]`) : null;
    if (!el || !btn) return;
    const left = btn.offsetLeft - el.clientWidth / 2 + btn.clientWidth / 2;
    el.scrollTo({ left, behavior: reducedMotion() ? 'auto' : 'smooth' });
  }, [picked]);

  return (
    <div ref={shelf} className="shelf" role="group" aria-label="Bottle shelf">
      {BOTTLES.map((b) => {
        const isPick = picked === b.id;
        const cls = `bottle${isPick ? ' bottle--picked' : picked ? ' bottle--dimmed' : ''}`;
        return (
          <button
            key={b.id}
            type="button"
            className={cls}
            data-bottle={b.id}
            data-family={b.family}
            aria-label={isPick ? `${b.name} — the bartender's pick` : b.name}
            onClick={() => {
              play('clunk');
              haptic('selection');
              showToast(isPick ? `${b.name}. He already reached for it.` : `${b.name}. Not tonight.`);
            }}
          >
            <span className="bottle__tip">{isPick ? 'The pick' : b.name}</span>
            <BottleSvg {...b} />
          </button>
        );
      })}
    </div>
  );
}

export function NeonSwitch(): ReactElement {
  const menu = useSettings((s) => s.menu);
  const set = useSettings((s) => s.set);
  const [flipping, setFlipping] = useState(false);
  const barista = menu === 'barista';
  return (
    <button
      type="button"
      className={`signswitch${flipping ? ' signswitch--flipping' : ''}`}
      role="switch"
      aria-checked={barista}
      aria-label="Alcohol-free menu"
      onClick={() => {
        play('clack');
        haptic('selection');
        if (reducedMotion()) {
          set({ menu: barista ? 'bar' : 'barista' });
          return;
        }
        setFlipping(true);
        window.setTimeout(() => {
          set({ menu: barista ? 'bar' : 'barista' });
          setFlipping(false);
        }, 240);
      }}
    >
      <span className="signswitch__face">
        <span className="neon neon-sign">{barista ? 'Barista' : 'Bar'}</span>
      </span>
      <span className="signswitch__hint" aria-hidden="true">
        TAP TO FLIP
      </span>
    </button>
  );
}

const TICKS = Array.from({ length: 25 }, (_, i) => {
  const id = `tick-${i}`;
  const a = ((-120 + i * 10) * Math.PI) / 180;
  const r1 = i % 4 === 0 ? 30 : 33.5;
  return {
    x1: 50 + r1 * Math.sin(a),
    y1: 50 - r1 * Math.cos(a),
    x2: 50 + 36 * Math.sin(a),
    y2: 50 - 36 * Math.cos(a),
    w: i % 4 === 0 ? 1.4 : 0.7,
    id,
  };
});

/** The aneroid barometer: the needle reports the thermal tag; the window rolls the apparent temperature. */
export function WallDial(): ReactElement {
  const verdict = useBar((s) => currentVerdict(s));
  const unit = useSettings((s) => s.units.temp);
  const angle = verdict?.dialAngle ?? 0;
  const target = verdict ? verdict.features.apparentC : null;
  const [shown, setShown] = useState<number | null>(target);
  const [settled, setSettled] = useState(target);
  const from = useRef<number | null>(target);

  useEffect(() => {
    if (target === null) {
      setShown(null);
      setSettled(null);
      return;
    }
    const start = from.current ?? target;
    from.current = target;
    if (reducedMotion() || start === target) {
      setShown(target);
      setSettled(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number): void => {
      const k = Math.min(1, (t - t0) / 600);
      const e = 1 - (1 - k) ** 4;
      setShown(start + (target - start) * e);
      if (k < 1) raf = requestAnimationFrame(step);
      else setSettled(target); // aria-valuetext updates once, after the swing
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  const label = verdict?.dial ?? 'FAIR';
  return (
    <div
      className="dial"
      role="meter"
      aria-label="Wall barometer"
      aria-valuemin={-120}
      aria-valuemax={120}
      aria-valuenow={angle}
      aria-valuetext={
        settled === null ? 'No reading' : `Feels like ${settled.toFixed(1)} degrees, tag: ${label.toLowerCase()}`
      }
    >
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="48" fill="url(#brassV)" />
        <circle cx="50" cy="50" r="41" fill="#1A0F0A" />
        <circle cx="50" cy="50" r="40" fill="none" stroke="#C9962B" strokeWidth=".7" opacity=".65" />
        <g stroke="#C9962B" opacity=".85">
          {TICKS.map((t) => (
            <line key={t.id} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} strokeWidth={t.w} />
          ))}
        </g>
        <path id="dialArcPath" d="M 16 66 A 40 40 0 1 1 84 66" fill="none" />
        <text
          className="dial-ring-text"
          fontFamily="'Space Grotesk Variable', sans-serif"
          fontSize="4.4"
          fontWeight="700"
          letterSpacing="0.42"
          fill="#C9B28C"
        >
          <textPath href="#dialArcPath" startOffset="1%">
            {RING.join(' · ')}
          </textPath>
        </text>
        <rect x="32" y="58" width="36" height="14" rx="2" fill="#0D0704" stroke="#8A6414" strokeWidth=".6" />
        <text className="dial__num" x="50" y="68.4" textAnchor="middle" fontSize="8.5" fill="#F5C860">
          {shown === null ? '—' : fmtTemp(shown, unit)}
        </text>
        <g className="dial__needle" style={{ transform: `rotate(${angle}deg)` }}>
          <path d="M50 50 L47.6 52 L50 16 L52.4 52 Z" fill="#F0564B" />
          <circle cx="50" cy="50" r="4" fill="url(#brassV)" stroke="#5A3F0C" strokeWidth=".6" />
        </g>
      </svg>
    </div>
  );
}

export function BackBar(): ReactElement {
  return (
    <header className="backbar grain">
      <div className="backbar__row">
        <Shelf />
        <span className="backbar__plate">The Globe Bar</span>
        <div className="backbar__tools">
          <NeonSwitch />
          <WallDial />
          <button type="button" className="plate" aria-label="Back office" onClick={() => openDrawer('office')}>
            <MenuIcon size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
