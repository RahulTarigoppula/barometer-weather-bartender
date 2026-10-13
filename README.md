# Mausam ka Mahaul

*The vibe of the weather. Read the sky, beat the jam, pour the right drink.*

**Live:** https://rahultarigoppula.github.io/barometer-weather-bartender/

## The story, and why

In India nobody steps out without asking *"mausam kaisa hai?"*, how's the weather? The answer decides the day: whether the monsoon will flood the underpass, whether Delhi's air needs a mask, whether the evening commute will crawl, and whether the night ends with cutting chai and pakoras or something stronger on a rooftop.

**Mausam** is the weather. **Mahaul** is the mood it creates, the feeling in the air, on the roads and at the table. Weather apps give you numbers; this one reads the *mahaul*: the sky and the air first, then the roads, then the drink and the snack that weather calls for, at the budget you actually have.

It began as **Barometer**, a joke about a judgmental bartender who reads the weather. It grew into the thing you open before leaving home, so it got an Indian name. (The repository keeps its original name so links never break.)

### The maker, and the opening film

I'm Rahul, a passionate lover of stories in every form: mostly movies and series, manhwa and anime, and above all the all-mighty books and audiobooks. Every story I love knows the setting is half the feeling, so this app treats your day like a story: the **mausam** is the setting, the **mahaul** is the mood, each day gets a genre, and the mahaul line can read itself to you like an audiobook.

Every visit opens with a ~41-second film, drawn live in canvas 2D (no video, no music) and skippable at any moment, told through those forms: a movie's letterboxed wide shot of the known universe, a series' cold open at the Sun, anime's love of skies over Earth, a manhwa's vertical panels as we scroll down through the clouds to India, a book's opening setting in the Western Ghats as Neelakurinji turns the slopes blue, and an audiobook's voice in the monsoon ("Chhata le ja, baarish hogi"). Then the title card, and the app underneath. After it, zoom out from the globe to travel back out to the known universe.

## What it does

A big 3D planet in deep space opens on **India**. Spin it, tap any place, or pick an Indian city, and you get, in this order:

1. **The weather, right now**, temperature and feels-like, comfort scale, humidity, wind, air quality (EU + US AQI), UV, rain chance, pressure, sunrise and sunset, plus **today's tips** (heat, hydrate, mask, umbrella, sunscreen, layers, fog).
2. **The outlook**, a 24-hour temperature and rain chart, the next 7 days as range bars, and a daylight arc.
3. **The bartender**, the one drink that weather calls for, a snack on the side (rain means pakoras), and **four budgets**: Extreme Cheap, Budget, Mid-range, High-end, with the pour, the place and a ₹ range per glass. Flip to **Barista** for the alcohol-free twin.
4. **The roads**, how busy the city is likely to be right now, minutes for a 10 km trip, and when it eases over the next 12 hours.
5. **India right now**, twelve cities at a glance (temperature, sky, US AQI; hottest, coolest, worst air), also shown live on the globe labels.

Star a place to keep it one tap away under the globe. Scrub the next 24 hours and watch the page change with the light; tap "Surprise me" for a place with weather worth a story; touch the weather card; tap the glass to say cheers.

### About traffic: honestly

There is no free, key-less, open live-traffic API that a static web app can call. So the Roads card is two layers:

- **Estimate (default, no key, no network):** a transparent model of Indian rush hours (weekday morning and evening peaks, lighter weekends), relative city severity for 12 metros, and the weather that really slows Indian roads, rain, downpours, storms, fog. It is always labelled *Estimate*.
- **Live (optional):** paste your own free [TomTom](https://developer.tomtom.com/) key in Settings and the card shows live speed vs free-flow on the nearest road. The key stays on your device and is sent only to `api.tomtom.com`.

### Principles

- **India first.** The camera's home is India; India's outline (Natural Earth, India point of view) is drawn in saffron with its major cities lit and tappable; Indian search results come first; the app opens on New Delhi (or the last place you looked at); prices are in rupees with Indian-market labels.
- **Free, private, offline-capable.** No accounts, no analytics, no cookies, no server. Weather and air come from [Open-Meteo](https://open-meteo.com/). Reverse geocoding is fully offline (Natural Earth). History and saved places live on your device.
- **Deterministic.** The same place, local hour and menu always give the same drink and the same line, a seeded engine with 9 golden fixtures and ~290 unit tests behind it.

## What's inside

| Feature | Where |
|---|---|
| A planet in space: WebGL Earth with a real day/night terminator (NASA Blue Marble by day, Black Marble city lights by night), atmosphere, starfield, India's outline and city lights with live temperatures, tap to pick, fly-to, zoom, "back to India" | `src/features/globe/globeThree.ts` |
| Canvas globe: first paint, no-WebGL and context-lost path | `src/features/globe/fallbackGlobe.ts` |
| Weather card, today's tips, save-star; the outlook (24 h chart, 7 days, daylight) | `src/features/weather/`, `src/engine/outlook.ts` |
| Bartender card: the pick, the line, glassware, snack pairing, second opinion, alcohol-free twin, recipe, share card | `src/features/drink/` |
| Budget tiers with Indian-market pours, places and ₹ ranges (≈ $ abroad) | `src/engine/budget.ts` |
| Roads: rush-hour + weather estimate, optional TomTom live flow | `src/engine/traffic.ts`, `src/api/tomtom.ts`, `src/features/roads/` |
| India right now: 12 cities in two batched requests, cached 15 min | `src/api/india.ts`, `src/features/india/` |
| The engine: comfort formulas, 34 weather/time/place tags, weighted drink scoring, seeded pick, intensity stamps, day-parts across time zones | `src/engine/` (pure, no I/O) |
| Offline "where is this": spherical point-in-polygon over Natural Earth + k-d tree nearest town | `src/engine/geocode.ts` |
| The bartender's voice: a seeded Tracery grammar, ≥ 8 variants per tag | `src/wit/` |
| 40 drinks (20 cocktails + 20 alcohol-free twins, several Indian), nine glassware shapes | `src/data/bar-menu.json` |
| India-first search, "Near me" resolved offline | `src/features/search/`, `src/api/openMeteo.ts` |
| History (IndexedDB, JSON export/import), Settings (budget, units, menu, live-roads key, saved places, sound, haptics, motion) | `src/features/tab/`, `src/features/office/` |
| 1080×1350 share card; sound synthesised with Web Audio; PWA; Capacitor Android shell | `src/features/register/`, `src/audio/`, `vite.config.ts` |

Reduced motion is honoured (OS setting or the Settings lever); every control is keyboard reachable with a visible focus ring; the globe takes arrows, Enter, +/− and H (home to India).

## Quickstart

Node ≥ 22.12.

```bash
npm ci
npm run dev            # Vite dev server
npm test               # Vitest (engine, wit, API, cache, Tab)
npm run build          # type-check + production build into dist/
npm run test:e2e       # Playwright against `vite preview` (Open-Meteo always mocked)
```

| Script | What it checks |
|---|---|
| `npm run test:unit` | Vitest with coverage gates (≥ 95 % lines on `src/engine`, 100 % on comfort / tags / score / cache) |
| `npm run check:menu` | 40 drinks, every twin resolves, every one of the 34 tags has ≥ 3 drinks at affinity ≥ 3 |
| `npm run check:bundle` | Initial JS ≤ 180 KB gzip, globe chunk ≤ 320 KB, geo ≤ 900 KB, textures ≤ 10 MB, precache ≤ 12 MB, banned hosts/keys absent |
| `npm run check:licenses` | Production dependencies are OSI / OFL only |
| `npm run sample:voice -- mumbai 1000` | How many distinct jabs the bartender has for a fixture |
| `npm run prep:geo` / `prep:textures` / `prep:icons` | Regenerate `public/geo`, `public/textures`, `public/icons` from `raw/` (git-ignored) and `design/icon.svg` |

## Deployment

- **Web:** every push to `main` runs `.github/workflows/pages.yml` (unit tests → build with `VITE_BASE_PATH=/<repo>/` → GitHub Pages). Heavy gates (lint, types, coverage, licences, bundle budget, Playwright) run separately in `ci.yml` so a flaky browser can never block a deploy.
- **Android (optional):** pushing a tag `v*` runs `android-release.yml`, which builds the same `dist/` into the Capacitor shell and signs an APK. It needs four repository secrets, `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Without them the job fails loudly rather than ship an unsigned APK.
- **Weekly live probe:** `live.yml` checks that Open-Meteo still answers with CORS from the deployed origin.

## Documents

| File | What |
|---|---|
| [docs/IMPLEMENTATION-PROMPT.md](docs/IMPLEMENTATION-PROMPT.md) | The original build spec. Its §0 ledger records every decision taken while building (C13–C33, including the v1 redesign) |
| [GOAL.md](GOAL.md) | Goal, vibe, success criteria, non-goals |
| [docs/DESIGN.md](docs/DESIGN.md) · [design/preview.html](design/preview.html) | The design system and the visual contract |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · [docs/PLAN.md](docs/PLAN.md) · [docs/TESTING.md](docs/TESTING.md) · [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) · [docs/RESEARCH.md](docs/RESEARCH.md) | Original planning documents |

## Privacy

No analytics, telemetry, crash reporting, accounts or cookies, in any build. On open, the app fetches the weather for New Delhi (or the last place you looked at) and one batched reading for twelve Indian cities. The coordinates you tap are sent only to Open-Meteo (required to get weather), rounded to 0.01°; search terms go to Open-Meteo's geocoder. "Where am I" asks for your location only when tapped, and resolves it offline. If you add a TomTom key, the coordinates of the place you are viewing go to TomTom for the live road speed, nothing else does. A Content-Security-Policy restricts the page to its own origin, the four Open-Meteo hosts and api.tomtom.com. Weather is cached for 15 minutes per 0.25° cell, so repeat taps make no request at all.

Open-Meteo's free tier is for non-commercial use; this project has no ads, sponsorships or store listing, and never will.

## Attribution

App code, illustrations (bottles, glassware, dial, cradle, pin, neon) and the bartender's grammar are MIT. The bar bundles or depends on:

| Source | Licence | Used for |
|---|---|---|
| [Open-Meteo (forecast, air quality, marine, geocoding)](https://open-meteo.com/) | CC BY 4.0 | Weather data ("Weather data by Open-Meteo.com"), non-commercial free tier |
| [CAMS ENSEMBLE (Copernicus)](https://atmosphere.copernicus.eu/) | CC BY 4.0 | Air quality, via Open-Meteo |
| [DWD](https://www.dwd.de/) | CC BY 4.0 | Marine data, via Open-Meteo |
| [Natural Earth](https://www.naturalearthdata.com/) | Public domain | Offline reverse geocoding; India's outline from the India point-of-view dataset |
| [NASA Earth Observatory: Blue Marble & Black Marble](https://earthobservatory.nasa.gov/) | Public domain | Globe day and night textures (no endorsement implied) |
| [three-globe example textures](https://github.com/vasturiano/three-globe) | MIT | First-paint day texture (NASA-derived) |
| [rasmusab/iba-cocktails](https://github.com/rasmusab/iba-cocktails) | MIT | IBA recipe quantities; method text rewritten in-house |
| [alfg/opendrinks](https://github.com/alfg/opendrinks) | MIT | Recipe quantities incl. alcohol-free entries; method text rewritten in-house |
| [Space Grotesk, JetBrains Mono](https://fontsource.org/) | SIL OFL 1.1 | Typefaces, self-hosted via Fontsource |
| [three.js](https://threejs.org/) | MIT | The WebGL globe |
| [d3-geo, kdbush, geokdbush](https://github.com/d3/d3-geo) | ISC | Spherical point-in-polygon and nearest town |
| [suncalc](https://github.com/mourner/suncalc) | BSD-2-Clause | Golden hour and sunset times |
| [tracery-grammar, seedrandom](https://github.com/v21/tracery) | ISC / MIT | The bartender's voice, deterministic per click |
| [React, Zustand, Dexie](https://react.dev/) | MIT / Apache-2.0 | UI, state and the Tab |
| [Lucide](https://lucide.dev/) | ISC | Interface and weather icons |
| [Capacitor](https://capacitorjs.com/) | MIT | Android shell and native plugins |
| [Sounds](https://developer.mozilla.org/docs/Web/API/Web_Audio_API) | Original (MIT) | Every bar sound is synthesised live with Web Audio, no recordings |

**Never used:** BigDataCloud (its policy forbids map-click coordinates), TheCocktailDB (its test key is not licensed for published apps), PlanetPixelEmporium textures, Pixabay audio, GPL code.

## Licence

MIT © Rahul Tarigoppula
