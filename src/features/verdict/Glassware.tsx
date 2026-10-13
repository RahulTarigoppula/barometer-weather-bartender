import type { ReactElement } from 'react';
import type { Drink, Glass } from '../../engine/types';

interface Shape {
  d: string;
  top: number;
  bot: number;
  x: number;
  w: number;
}

/** All nine `Glass` shapes, own line-art. */
const GLASS: Record<Glass, Shape> = {
  highball: { d: 'M18 6 L19.5 78 Q19.5 82 23.5 82 L36.5 82 Q40.5 82 40.5 78 L42 6', top: 24, bot: 79, x: 20, w: 20 },
  rocks: { d: 'M15 30 L18 76 Q18 80 22 80 L38 80 Q42 80 42 76 L45 30', top: 48, bot: 78, x: 18, w: 24 },
  coupe: {
    d: 'M12 22 Q12 48 30 50 Q48 48 48 22 M30 50 L30 72 M20 78 L40 78 Q40 74 30 72 Q20 74 20 78',
    top: 30,
    bot: 48,
    x: 14,
    w: 32,
  },
  mug: {
    d: 'M15 26 L17 76 Q17 80 21 80 L37 80 Q41 80 41 76 L43 26 Z M43 36 Q54 36 54 48 Q54 60 42 60',
    top: 32,
    bot: 78,
    x: 17,
    w: 25,
  },
  'copper-mug': {
    d: 'M14 24 L14 78 Q14 82 18 82 L38 82 Q42 82 42 78 L42 24 Z M42 34 Q55 34 55 48 Q55 62 42 62 M14 30 L42 30',
    top: 30,
    bot: 80,
    x: 16,
    w: 24,
  },
  tiki: {
    d: 'M15 12 L13 40 Q13 56 18 68 L20 82 Q20 84 24 84 L34 84 Q38 84 38 82 L40 68 Q45 56 45 40 L43 12 Z M20 24 L38 24 M22 34 Q29 40 36 34 M24 48 L26 56 M32 48 L34 56',
    top: 18,
    bot: 80,
    x: 16,
    w: 26,
  },
  flute: {
    d: 'M23 6 L24 42 Q24 52 29 56 L29 76 M22 82 L38 82 Q38 78 31 76 L31 56 Q36 52 36 42 L37 6',
    top: 12,
    bot: 52,
    x: 24,
    w: 12,
  },
  pint: { d: 'M16 8 L20 78 Q20 82 24 82 L38 82 Q42 82 42 78 L45 8 Z', top: 16, bot: 80, x: 18, w: 25 },
  teacup: {
    d: 'M14 30 Q16 62 30 64 Q44 62 46 30 Z M46 38 Q56 38 56 48 Q56 57 45 58 M16 74 L44 74',
    top: 34,
    bot: 62,
    x: 16,
    w: 28,
  },
};

const GLASS_NAME: Record<Glass, string> = {
  highball: 'highball',
  rocks: 'rocks glass',
  coupe: 'coupe',
  mug: 'mug',
  'copper-mug': 'copper mug',
  tiki: 'tiki mug',
  flute: 'flute',
  pint: 'pint glass',
  teacup: 'teacup',
};

export function glassLabel(d: Drink): string {
  const hot = d.serve === 'hot' || d.serve === 'warm';
  const extra = hot
    ? 'with steam'
    : d.ice === 'crushed'
      ? 'with crushed ice'
      : d.ice === 'cubes'
        ? 'with ice'
        : 'no ice';
  return `${GLASS_NAME[d.glass]} ${extra}`;
}

export function Glassware({ drink, size = 66 }: { drink: Drink; size?: number }): ReactElement {
  const g = GLASS[drink.glass];
  const hot = drink.serve === 'hot' || drink.serve === 'warm';
  const liqTop = g.top + (hot ? 2 : 0);
  const clipId = `glass-clip-${drink.glass}`;
  const cubes = !hot && drink.ice !== 'none' ? 3 : 0;
  const cw = drink.ice === 'crushed' ? 7 : 9;
  return (
    <svg
      viewBox="0 0 60 88"
      width={size}
      height={(size * 88) / 60}
      role="img"
      aria-label={glassLabel(drink)}
      style={{ overflow: 'visible' }}
    >
      <clipPath id={clipId}>
        <path d={`${g.d} Z`} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <rect x={g.x} y={liqTop} width={g.w} height={g.bot - liqTop} fill={drink.colour} opacity=".85" />
      </g>
      {Array.from({ length: cubes }, (_, i) => {
        const cx = g.x + 2 + (i * (g.w - cw - 4)) / Math.max(1, cubes - 1);
        const cy = liqTop + 3 + (i % 2) * 7;
        return (
          <rect
            key={`cube-${cx}`}
            className="icecube"
            x={cx.toFixed(1)}
            y={cy}
            width={cw}
            height={cw}
            rx="2"
            fill="#EAF6F2"
            opacity=".75"
            stroke="#7cc4ff"
            strokeWidth=".8"
          />
        );
      })}
      {hot &&
        [24, 30, 36].map((x, i) => (
          <path
            key={x}
            className="steam"
            d={`M${x} ${g.top - (i === 1 ? 8 : 6)} q4 -5 0 -10 q-4 -5 0 -10`}
            fill="none"
            stroke="#9fb0d4"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        ))}
      <path d={g.d} fill="none" stroke="#cfe3ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
