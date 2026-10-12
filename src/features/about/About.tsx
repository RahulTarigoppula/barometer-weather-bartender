import type { ReactElement } from 'react';
import attribution from '../../data/attribution.json';

/** #/about — the attribution table (it matches the README three ways, enforced by a test). */
export function About(): ReactElement {
  return (
    <div className="about">
      <p>
        The Globe Bar is free, offline-capable and non-commercial. It talks to exactly one service — Open-Meteo — and
        only when you tap the planet. No analytics, no telemetry, no accounts, no cookies.
      </p>
      <table>
        <thead>
          <tr>
            <th scope="col">Source</th>
            <th scope="col">Licence</th>
            <th scope="col">Used for</th>
          </tr>
        </thead>
        <tbody>
          {attribution.map((a) => (
            <tr key={a.name}>
              <td>
                <a href={a.url} target="_blank" rel="noopener noreferrer">
                  {a.name}
                </a>
              </td>
              <td>{a.licence}</td>
              <td>{a.use}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="attrib">
        App code, illustrations and the bartender’s grammar: MIT. Source:{' '}
        <a
          href="https://github.com/RahulTarigoppula/barometer-weather-bartender"
          target="_blank"
          rel="noopener noreferrer"
        >
          github.com/RahulTarigoppula/barometer-weather-bartender
        </a>
        <br />
        Version {__APP_VERSION__}
      </p>
    </div>
  );
}
