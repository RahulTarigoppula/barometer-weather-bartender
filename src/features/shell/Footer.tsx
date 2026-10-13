import { Play } from 'lucide-react';
import type { ReactElement } from 'react';
import { openDrawer } from '../../app/route';

/** Quiet credits. */
export function Footer(): ReactElement {
  return (
    <footer className="footer">
      <button
        type="button"
        className="btn footer__story"
        onClick={() => {
          window.location.hash = '#/story';
        }}
      >
        <Play size={14} strokeWidth={2} aria-hidden="true" /> Watch the story behind the name
      </button>
      <p className="footer__credits">
        Weather by{' '}
        <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">
          Open-Meteo.com
        </a>{' '}
        (CC BY 4.0) · Planet: NASA Earth Observatory · Places: Natural Earth · Free, private, no tracking ·{' '}
        <button type="button" className="link" onClick={() => openDrawer('about')}>
          Our story &amp; credits
        </button>
      </p>
      <p className="footer__signoff">Built by Rahul, between episodes and chapters.</p>
      <p className="footer__credits">
        Road outlook is an estimate unless you add a live key. Drink responsibly. Prices are indicative per glass in
        Indian cities.
      </p>
    </footer>
  );
}
