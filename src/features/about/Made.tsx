import type { ReactElement } from 'react';

interface Source {
  name: string;
  url: string;
  licence: string;
  what: string;
  how: string;
  clean: string;
}

const SOURCES: Source[] = [
  {
    name: 'Open-Meteo Forecast',
    url: 'https://open-meteo.com/',
    licence: 'CC BY 4.0',
    what: 'Temperature, feels-like, humidity, dew point, rain, showers, snow, cloud, pressure, wind, gusts and the sky code right now; the next 25 hours (temperature, rain chance, UV, sky, day or night); the next 7 days (high, low, rain chance, UV, sunrise, sunset).',
    how: 'Everything on the weather card, the outlook, the scrubber, the tips, the mahaul line, the genre and the drink.',
    clean:
      'Every field is checked to be a real number, with a safe default when it is missing. A reply with too few fields is refused rather than half shown. Hours start from the current hour. Each reading is cached for 15 minutes per 0.25° patch of the map and kept for 24 hours for offline use.',
  },
  {
    name: 'Open-Meteo Air Quality (CAMS)',
    url: 'https://atmosphere.copernicus.eu/',
    licence: 'CC BY 4.0',
    what: 'US AQI, European AQI, PM2.5, PM10, ozone, dust and UV.',
    how: 'The air quality tile, the mask and lungs tips, the haze tint on the page, and the “Dystopian sci-fi” days.',
    clean:
      'Asked for alongside the forecast but never allowed to block it. A missing reading shows “n/a” instead of a guess.',
  },
  {
    name: 'Open-Meteo Marine (DWD)',
    url: 'https://www.dwd.de/',
    licence: 'CC BY 4.0',
    what: 'Wave height, wind-wave height and sea surface temperature.',
    how: 'Only when you tap the sea: the sea line on the weather card and the sailor’s drinks.',
    clean: 'Fetched only for ocean taps, so land taps cost one request less.',
  },
  {
    name: 'Open-Meteo Geocoding',
    url: 'https://open-meteo.com/en/docs/geocoding-api',
    licence: 'CC BY 4.0',
    what: 'Place names and coordinates for search.',
    how: 'The search box. Two queries run side by side, one limited to India, so Indian places come first.',
    clean: 'Results from both queries are merged and duplicates removed.',
  },
  {
    name: 'Natural Earth',
    url: 'https://www.naturalearthdata.com/',
    licence: 'Public domain',
    what: 'Country borders at two detail levels, 7,000+ populated places, named seas and oceans, the land outline, and India’s borders from the India point-of-view dataset.',
    how: 'Naming any spot you tap, fully offline: country, nearest town, sea or ice. The saffron India outline on the globe.',
    clean:
      'Coordinates rounded (2 decimals for borders, 4 for towns) and repeated points dropped. Every polygon rewound so the spherical maths reads inside and outside correctly. Smoke tests on every build: India must contain Mumbai, Russia must not. Towns sorted by population, smaller seas before bigger ones so a gulf wins over its ocean. India’s outline thinned to about one point every 0.08°. The output is byte-identical on every run.',
  },
  {
    name: 'NASA Blue Marble and Black Marble',
    url: 'https://earthobservatory.nasa.gov/',
    licence: 'Public domain',
    what: 'The Earth by day and the city lights by night.',
    how: 'The 3D planet, its day and night line, and the dive into India in the story.',
    clean: 'Resized and compressed to WebP in two sizes; a small first-paint image loads first and the 4K one after.',
  },
  {
    name: 'IBA cocktails and Open Drinks',
    url: 'https://github.com/rasmusab/iba-cocktails',
    licence: 'MIT',
    what: 'Recipe quantities for the cocktails and several alcohol-free drinks.',
    how: 'The 40-drink menu: 20 cocktails, each with an alcohol-free twin, several of them Indian (Nimbu Soda, Jaljeera Cooler, Aam Panna Slush, Kokum Soda, Masala Chai, Filter Coffee Tonic).',
    clean:
      'Quantities checked by hand and every method rewritten in our own words. A build check makes sure every drink has a twin and every kind of weather has at least four good drinks.',
  },
  {
    name: 'TomTom Traffic Flow (optional)',
    url: 'https://developer.tomtom.com/',
    licence: 'Your own free key',
    what: 'Live speed and free-flow speed on the nearest road.',
    how: 'Only if you add your own key in Settings. Otherwise the roads card is an honest estimate.',
    clean: 'The key stays on your device. A refused key falls back to the estimate and says so.',
  },
  {
    name: 'suncalc',
    url: 'https://github.com/mourner/suncalc',
    licence: 'BSD-2-Clause',
    what: 'Sunrise, sunset and golden hour for any place and date.',
    how: 'The daylight arc, the time of day, golden-hour drinks, and where the sun is lighting the globe.',
    clean: 'Polar days and nights, when the sun never sets or rises, are handled and labelled.',
  },
];

const ALGORITHMS: [string, string][] = [
  [
    'Feels like',
    'The US National Weather Service heat index (Rothfusz, with its corrections) in the heat, the Canadian humidex for muggy air, the JAG/TI wind chill in the cold, the Magnus formula when dew point is missing, and the Beaufort scale for wind.',
  ],
  [
    'Reading the weather',
    'Every reading becomes up to 34 tags (scorching, muggy, drizzle, smog, golden hour, ocean and so on), each with a strength. One tag leads, chosen by a fixed priority list so a storm always outranks a nice sunset.',
  ],
  [
    'Choosing the drink',
    'Each of the 40 drinks has a liking for each tag. The tags and their strengths score every drink; the top few go into a seeded draw, so the same place, hour and menu always pour the same drink, and it avoids pouring the same one twice in a row.',
  ],
  [
    'Naming a place offline',
    'A spherical point-in-polygon test over the borders, then a k-d tree for the nearest town. The order is: a country, a coastal town within 15 km, a named sea, ice, then open water.',
  ],
  [
    'Today’s tips',
    'Plain thresholds you can check: feels like 41° or more is a heat warning, 35° means hydrate; US AQI 151 or more means mask up, 101 or more means go easy; rain chance 50% or more means an umbrella; UV 6 or more means sunscreen; gusts of 50 km/h or more, fog, freezing and chilly days each get their own line.',
  ],
  [
    'The roads estimate',
    'Two rush-hour peaks on weekdays (around 9:30 and 19:00) and a softer weekend, scaled by how bad each of 12 Indian metros usually gets, then slowed by the weather: rain by 20%, a downpour or storm by 35%, fog by 18%, snow by 30%. It is always labelled an estimate.',
  ],
  [
    'The mahaul line and the genre',
    'A few sentences built from the sky, the most urgent tip, the roads and the drink. The genre comes from the most dramatic thing about the day, and each genre pairs with a story where that weather matters.',
  ],
  [
    'Budget',
    'A price band for each base spirit in Indian bars and shops, scaled for the four budgets, shown in rupees, with dollars abroad.',
  ],
  [
    'The bartender’s voice',
    'A Tracery grammar with at least eight lines for every tag, seeded per pour so it is varied but repeatable.',
  ],
  [
    'The story',
    'Drawn live in canvas 2D, no video. Everything heavy (the stars, the galaxy, the Earth, the hills) is painted once and reused, so a frame takes a few milliseconds.',
  ],
];

/** How MkM is made: every source, how it is used and cleaned, every rule, in plain words. */
export function Made(): ReactElement {
  return (
    <div className="about made">
      <section className="story story--me" aria-label="Sixty-three days">
        <h3 className="h3">63 days, one app</h3>
        <p>
          MkM took me almost 63 days of planning, building, gathering data and cleaning it. Days of reading API
          documentation, checking that Mumbai sits inside India on a sphere, rewriting recipes in my own words, and
          watching the same rain fall on the same hills until it felt right.
        </p>
        <p>This is the result. Here is everything that goes into it, with nothing hidden.</p>
      </section>

      <h3 className="h3 made__title">Where the data comes from</h3>
      <div className="made__sources">
        {SOURCES.map((s) => (
          <article key={s.name} className="made__source">
            <header>
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {s.name}
              </a>
              <span className="made__licence">{s.licence}</span>
            </header>
            <dl>
              <dt>What we take</dt>
              <dd>{s.what}</dd>
              <dt>Where you see it</dt>
              <dd>{s.how}</dd>
              <dt>How it is cleaned</dt>
              <dd>{s.clean}</dd>
            </dl>
          </article>
        ))}
      </div>

      <h3 className="h3 made__title">How it thinks</h3>
      <dl className="made__algos">
        {ALGORITHMS.map(([title, text]) => (
          <div key={title}>
            <dt>{title}</dt>
            <dd>{text}</dd>
          </div>
        ))}
      </dl>

      <h3 className="h3 made__title">What stays on your device, and for how long</h3>
      <dl className="made__algos">
        <div>
          <dt>Weather readings</dt>
          <dd>
            Kept in your browser for at most a day, so a repeat look costs no request and works offline. Stored under a
            one-way SHA-256 key, so the cache does not show which places you looked up.
          </dd>
        </div>
        <div>
          <dt>History</dt>
          <dd>
            The last 100 places at most, none older than 30 days, rounded to about a kilometre. Never your exact
            location. You can switch history off in Settings, which also clears it.
          </dd>
        </div>
        <div>
          <dt>Settings and saved places</dt>
          <dd>Your units, budget, menu and starred places, in this browser only.</dd>
        </div>
        <div>
          <dt>Your TomTom key, if you add one</dt>
          <dd>
            Stays in this browser and is sent only to TomTom. It cannot be hashed, because TomTom needs to read it.
          </dd>
        </div>
        <div>
          <dt>Forget everything</dt>
          <dd>One button in Settings wipes all of the above, and the app’s offline files, from this device.</dd>
        </div>
      </dl>

      <h3 className="h3 made__title">What it never does</h3>
      <p>
        No accounts, no analytics, no cookies, no tracking, no ads. Weather requests go to Open-Meteo with your
        coordinates rounded to about a kilometre. Your history, saved places and settings live only on your device.
        Nothing is sold, because nothing is collected.
      </p>
      <p className="attrib">
        Around three hundred automated tests and forty browser tests check all of the above on every change. Version{' '}
        {__APP_VERSION__}.
      </p>
    </div>
  );
}
