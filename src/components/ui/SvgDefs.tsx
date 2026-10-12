import type { ReactElement } from 'react';

/** Shared SVG <defs>, injected once: brass and wood gradients and the torn-paper filter. */
export function SvgDefs(): ReactElement {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
      <defs>
        <linearGradient id="brassH" x1="0" y1="0" x2="1" y2="0.25">
          <stop offset="0%" stopColor="#8A6414" />
          <stop offset="35%" stopColor="#C9962B" />
          <stop offset="52%" stopColor="#F5C860" />
          <stop offset="68%" stopColor="#C9962B" />
          <stop offset="100%" stopColor="#8A6414" />
        </linearGradient>
        <linearGradient id="brassV" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#8A6414" />
          <stop offset="30%" stopColor="#C9962B" />
          <stop offset="50%" stopColor="#F5C860" />
          <stop offset="72%" stopColor="#C9962B" />
          <stop offset="100%" stopColor="#8A6414" />
        </linearGradient>
        <linearGradient id="woodG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5A3520" />
          <stop offset="100%" stopColor="#24140C" />
        </linearGradient>
        <filter id="tornEdge" x="-6%" y="-30%" width="112%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04 0.7" numOctaves="3" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}
