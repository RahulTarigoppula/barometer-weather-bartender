# Barometer — The Globe Bar

*Spin. Tap. Survive.*

**Live:** https://rahultarigoppula.github.io/barometer-weather-bartender/

A brass-cradled planet on a mahogany counter under a buzzing neon sign. Flick the globe, tap anywhere on Earth, and a judgmental bartender reads that spot's weather *right now* — apparent temperature, dew point, wind, UV, air quality, rain, snow, storms, the local hour — and slides you a printed coaster with the one drink you need to survive it.

Aggressively iced Mojito for Mumbai's soup air. Hot Buttered Rum, no arguments, for a Yakutsk January. A Dark 'n' Stormy if you clicked the sea. Flip the BAR sign to BARISTA for the alcohol-free twin (he suggests it himself before 11:00 local).

- **Everything is a thing in the bar.** The weather is on the window glass. The temperature is a needle on a brass wall barometer. The verdict is letterpressed on a coaster. The stats are a thermal receipt from the register. The bottle he reached for lights up on the shelf before you read a word.
- **Free, private, offline-capable.** No accounts, no analytics, no cookies, no server, no API key. The only network calls go to [Open-Meteo](https://open-meteo.com/), and only when you tap the planet. Reverse geocoding is fully offline (Natural Earth). The Tab (your history) lives in IndexedDB on your device.
- **Deterministic.** The same place, local hour and menu always pour the same drink and the same insult — a seeded engine with 9 golden fixtures and ~280 unit tests behind it.

## What's in the bar

| Feature | Where |
|---|---|
| WebGL globe with a real day/night terminator (NASA Blue Marble by day, Black Marble city lights by night), flick + damping, idle drift, tap to pour, brass pin + ripple, fly-to | `src/features/globe/globeThree.ts` |
| Engraved canvas globe — first paint, no-WebGL and context-lost path; still drag/tap/keyboard | `src/features/globe/fallbackGlobe.ts` |
| The engine: comfort formulas, 34 weather/time/place tags, driving-tag priority, weighted drink scoring, seeded pick, intensifier stamps, day-parts across time zones | `src/engine/` (pure, no I/O) |
| Offline "where is this": spherical point-in-polygon over Natural Earth countries + marine polygons, k-d tree nearest town | `src/engine/geocode.ts` |
| The bartender's voice: a seeded Tracery grammar, ≥ 8 variants per tag, 349 distinct Mumbai jabs per 1,000 pours | `src/wit/` |
| 40 drinks (20 cocktails + 20 alcohol-free twins), nine glassware shapes, twelve bottles | `src/data/bar-menu.json` |
| Coaster (skeleton → printed in place), recipe on the back, second opinion, barista flip | `src/features/verdict/` |
| Wall barometer, bottle shelf, BAR/BARISTA neon | `src/features/backbar/` |
| Window weather on the glass: droplets, three rain speeds, snow, fog, glare, frost creep, one lightning frame | `src/features/window/`, `src/engine/window.ts` |
| Register: VFD ticker of real local clocks ("LAST ORDERS IN LISBON · 23:58"), thermal receipt, TEAR → 1080×1350 share card | `src/features/register/` |
| The Tab (IndexedDB history, re-pour without a request, JSON export/import), Back Office (shift, units, sound, haptics, motion, gentler bartender) | `src/features/tab/`, `src/features/office/` |
| Sound: every bar sound synthesised live with Web Audio (tink, shhk, clinks, kettle, paper feed, tear, thunder, neon buzz, rain bed) | `src/audio/sfx.ts` |
| PWA (installable, offline shell + geo data precached), Capacitor Android shell | `vite.config.ts`, `capacitor.config.ts` |

Day shift / night shift follows the clicked place's daylight; reduced motion is honoured (OS setting or the Back Office lever); every control is keyboard reachable with a visible brass focus ring.

## Quickstart

Node ≥ 22.12.

```bash
npm ci
npm run dev            # http://localhost:5173
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
- **Android (optional):** pushing a tag `v*` runs `android-release.yml`, which builds the same `dist/` into the Capacitor shell and signs an APK. It needs four repository secrets — `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` — see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Without them the job fails loudly rather than ship an unsigned APK.
- **Weekly live probe:** `live.yml` checks that Open-Meteo still answers with CORS from the deployed origin.

## Documents

| File | What |
|---|---|
| [docs/IMPLEMENTATION-PROMPT.md](docs/IMPLEMENTATION-PROMPT.md) | The build spec. Its §0 conflict ledger records every decision taken while building (C13–C27) |
| [GOAL.md](GOAL.md) | Goal, vibe, success criteria, non-goals |
| [docs/DESIGN.md](docs/DESIGN.md) · [design/preview.html](design/preview.html) | The design system and the visual contract |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · [docs/PLAN.md](docs/PLAN.md) · [docs/TESTING.md](docs/TESTING.md) · [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) · [docs/RESEARCH.md](docs/RESEARCH.md) | Original planning documents |

## Privacy

No analytics, telemetry, crash reporting, accounts or cookies, in any build. The coordinates you tap are sent only to Open-Meteo (required to get weather), rounded to 0.01°. "Where am I" asks for your location only when tapped, and resolves it offline. A Content-Security-Policy restricts the page to its own origin plus the four Open-Meteo hosts. Weather is cached for 15 minutes per 0.25° cell, so repeat taps make no request at all.

Open-Meteo's free tier is for non-commercial use; this project has no ads, sponsorships or store listing, and never will.

## Attribution

App code, illustrations (bottles, glassware, dial, cradle, pin, neon) and the bartender's grammar are MIT. The bar bundles or depends on:

| Source | Licence | Used for |
|---|---|---|
| [Open-Meteo (forecast, air quality, marine, geocoding)](https://open-meteo.com/) | CC BY 4.0 | Weather data — "Weather data by Open-Meteo.com", non-commercial free tier |
| [CAMS ENSEMBLE (Copernicus)](https://atmosphere.copernicus.eu/) | CC BY 4.0 | Air quality, via Open-Meteo |
| [DWD](https://www.dwd.de/) | CC BY 4.0 | Marine data, via Open-Meteo |
| [Natural Earth](https://www.naturalearthdata.com/) | Public domain | Offline reverse geocoding: countries, populated places, marine polygons, land |
| [NASA Earth Observatory — Blue Marble & Black Marble](https://earthobservatory.nasa.gov/) | Public domain | Globe day and night textures (no endorsement implied) |
| [three-globe example textures](https://github.com/vasturiano/three-globe) | MIT | First-paint day texture (NASA-derived) |
| [rasmusab/iba-cocktails](https://github.com/rasmusab/iba-cocktails) | MIT | IBA recipe quantities; method text rewritten in-house |
| [alfg/opendrinks](https://github.com/alfg/opendrinks) | MIT | Recipe quantities incl. alcohol-free entries; method text rewritten in-house |
| [Righteous, Space Grotesk, JetBrains Mono](https://fontsource.org/) | SIL OFL 1.1 | Typefaces, self-hosted via Fontsource |
| [three.js](https://threejs.org/) | MIT | The WebGL globe |
| [d3-geo, kdbush, geokdbush](https://github.com/d3/d3-geo) | ISC | Spherical point-in-polygon and nearest town |
| [suncalc](https://github.com/mourner/suncalc) | BSD-2-Clause | Golden hour and sunset times |
| [tracery-grammar, seedrandom](https://github.com/v21/tracery) | ISC / MIT | The bartender's voice, deterministic per click |
| [React, Zustand, Dexie](https://react.dev/) | MIT / Apache-2.0 | UI, state and the Tab |
| [Lucide](https://lucide.dev/) | ISC | Icons in the Back Office and search only |
| [Capacitor](https://capacitorjs.com/) | MIT | Android shell and native plugins |
| [Sounds](https://developer.mozilla.org/docs/Web/API/Web_Audio_API) | Original (MIT) | Every bar sound is synthesised live with Web Audio — no recordings |

**Never used:** BigDataCloud (its policy forbids map-click coordinates), TheCocktailDB (its test key is not licensed for published apps), PlanetPixelEmporium textures, Pixabay audio, GPL code.

## Licence

MIT © Rahul Tarigoppula
