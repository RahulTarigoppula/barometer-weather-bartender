import type { ReactElement } from 'react';
import attribution from '../../data/attribution.json';

/** #/about, the attribution table (it matches the README three ways, enforced by a test). */
export function About(): ReactElement {
  return (
    <div className="about">
      <section className="story" aria-label="Our story">
        <h3 className="h3">Mausam ka Mahaul: the vibe of the weather</h3>
        <p>
          In India, nobody steps out without asking “<i>mausam kaisa hai?</i>” (how’s the weather?) The answer decides
          everything: whether the monsoon will flood the underpass, whether the Delhi air needs a mask, whether the
          evening commute will crawl, and whether the day ends with cutting chai and pakoras or something stronger on a
          rooftop.
        </p>
        <p>
          <b>Mausam</b> is the weather. <b>Mahaul</b> is the mood it creates: the feeling in the air, on the roads and
          at the table. This app reads both: the sky and the air quality first, then the roads, then the drink and the
          snack that weather calls for, at the budget you actually have.
        </p>
        <p>
          It started as a joke about a judgmental bartender who reads the weather. It grew into the thing we open before
          leaving home. India first, the whole planet supported.
        </p>
      </section>
      <section className="story story--me" aria-label="About the maker">
        <h3 className="h3">Hi, I’m Rahul</h3>
        <p>
          I am a passionate lover of stories, in every form they come in. Mostly movies and series, manhwa and anime,
          and above all the all-mighty books and audiobooks.
        </p>
        <p>
          Every story I love knows that the setting is half the feeling: the rain in an anime, the fog in a noir, the
          monsoon in a Hindi film. So this app treats your day like a story too. The <b>mausam</b> is the setting, the{' '}
          <b>mahaul</b> is the mood, each day gets a genre, and the mahaul line will read itself to you like an
          audiobook.
        </p>
        <p>
          Made with love, for everyone who was ever told to carry an umbrella. Source on{' '}
          <a
            href="https://github.com/RahulTarigoppula/barometer-weather-bartender"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          .
        </p>
        <button
          type="button"
          className="btn"
          onClick={() => {
            window.location.hash = '#/story';
          }}
        >
          Watch the story again
        </button>{' '}
        <a className="btn" href="#/made">
          How MkM is made
        </a>
      </section>
      <p>
        Free, offline-capable and non-commercial. It talks to Open-Meteo for weather and air, and to TomTom only if you
        add your own key for live roads. No analytics, no telemetry, no accounts, no cookies.
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
