import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { openDrawer } from '../../app/route';
import cities from '../../data/cities-ticker.json';
import { tickerLines } from '../../engine/ticker';

/** A world clock of last orders and first coffees, and the credits. */
export function Footer(): ReactElement {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  const tape = useMemo(() => tickerLines(now, cities).join('  ·  '), [now]);
  return (
    <footer className="footer">
      <div className="ticker" role="marquee" aria-label="World clock">
        <span className="ticker__tape num" style={{ ['--tape-dur' as string]: `${Math.max(24, tape.length / 4)}s` }}>
          {`${tape}  ·  ${tape}  ·  `}
        </span>
      </div>
      <p className="footer__credits">
        Weather data by{' '}
        <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">
          Open-Meteo.com
        </a>{' '}
        (CC BY 4.0) · Planet: NASA Earth Observatory · Places: Natural Earth · Free, private, no tracking ·{' '}
        <button type="button" className="link" onClick={() => openDrawer('about')}>
          Credits
        </button>
      </p>
      <p className="footer__credits">Drink responsibly. Prices are indicative ranges per glass in Indian cities.</p>
    </footer>
  );
}
