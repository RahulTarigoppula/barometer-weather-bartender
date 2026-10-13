# Barometer

*Weather first. Then a drink.*

**Live:** https://rahultarigoppula.github.io/barometer-weather-bartender/

A big 3D planet in deep space that opens on **India**. Spin it, tap any place — or pick an Indian city — and Barometer shows the weather there *right now*: temperature and feels-like, humidity and dew point, wind and gusts, air quality, UV, rain chance, pressure, sunrise and sunset. Then a judgmental bartender recommends the one drink that weather calls for, **at your budget**: Extreme Cheap, Budget, Mid-range or High-end, with the pour, the place and a ₹ range per glass.

Aggressively iced Mojito for Mumbai's soup air. Hot Buttered Rum, no arguments, for a Yakutsk January. A Dark 'n' Stormy if you tapped the sea. Flip to **Barista** for the alcohol-free twin — Nimbu Soda, Jaljeera Cooler, Aam Panna Slush, Masala Chai, Filter Coffee Tonic.

- **India first.** The camera's home is India; India's outline (Natural Earth, India point of view) is drawn in saffron with its major cities lit and tappable; Indian search results come first; the app opens on New Delhi (or the last place you looked at); prices are in rupees with Indian-market labels.
- **Weather first.** The weather card leads; the bartender follows.
- **Free, private, offline-capable.** No accounts, no analytics, no cookies, no server, no API key. The only network calls go to [Open-Meteo](https://open-meteo.com/). Reverse geocoding is fully offline (Natural Earth). History lives in IndexedDB on your device.
- **Deterministic.** The same place, local hour and menu always give the same drink and the same line — a seeded engine with 9 golden fixtures and ~270 unit tests behind it.

## What's inside

| Feature | Where |
|---|---|
| A planet in space: WebGL Earth with a real day/night terminator (NASA Blue Marble by day, Black Marble city lights by night), a soft blue atmosphere, a starfield, India's outline and city lights, tap to pick, fly-to, zoom, "back to India" | `src/features/globe/globeThree.ts` |
| Canvas globe — first paint, no-WebGL and context-lost path; still drag/tap/keyboard, also opens on India | `src/features/globe/fallbackGlobe.ts` |
| Weather card: place, local time, big temperature, condition, comfort scale, eight metric tiles, ambient rain/snow/fog/frost/lightning | `src/features/weather/` |
| Bartender card: the pick, the line, glassware, second opinion, alcohol-free twin, recipe, share card | `src/features/drink/` |
| Budget tiers: Extreme Cheap · Budget · Mid-range · High-end — pour (Indian-market labels), where to drink it, ₹ range per glass (≈ $ for international places), a tip | `src/engine/budget.ts` |
| The engine: comfort formulas, 34 weather/time/place tags, driving-tag priority, weighted drink scoring, seeded pick, intensity stamps, day-parts across time zones | `src/engine/` (pure, no I/O) |
| Offline "where is this": spherical point-in-polygon over Natural Earth countries + marine polygons, k-d tree nearest town | `src/engine/geocode.ts` |
| The bartender's voice: a seeded Tracery grammar, ≥ 8 variants per tag, 349 distinct Mumbai jabs per 1,000 pours | `src/wit/` |
| 40 drinks (20 cocktails + 20 alcohol-free twins, several Indian), nine glassware shapes | `src/data/bar-menu.json` |
| India-first search (Open-Meteo geocoding, Indian matches first), "Near me" resolved offline | `src/features/search/`, `src/api/openMeteo.ts` |
| History (IndexedDB, re-show without a request, JSON export/import), Settings (budget, units, menu, sound, haptics, motion, gentler bartender) | `src/features/tab/`, `src/features/office/` |
| World-clock ticker ("LAST ORDERS IN LISBON · 23:58"), 1080×1350 share card | `src/features/shell/`, `src/features/register/` |
| Sound synthesised live with Web Audio; PWA (installable, offline shell + geo data precached); Capacitor Android shell | `src/audio/`, `vite.config.ts`, `capacitor.config.ts` |

Reduced motion is honoured (OS setting or the Settings lever); every control is keyboard reachable with a visible focus ring; the globe takes arrows, Enter, +/− and H (home to India).

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
| [docs/IMPLEMENTATION-PROMPT.md](docs/IMPLEMENTATION-PROMPT.md) | The original build spec. Its §0 ledger records every decision taken while building (C13–C33, including the v1 redesign) |
| [GOAL.md](GOAL.md) | Goal, vibe, success criteria, non-goals |
| [docs/DESIGN.md](docs/DESIGN.md) · [design/preview.html](design/preview.html) | The design system and the visual contract |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · [docs/PLAN.md](docs/PLAN.md) · [docs/TESTING.md](docs/TESTING.md) · [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) · [docs/RESEARCH.md](docs/RESEARCH.md) | Original planning documents |

## Privacy

No analytics, telemetry, crash reporting, accounts or cookies, in any build. On open, the app fetches the weather for New Delhi (or the last place you looked at). The coordinates you tap are sent only to Open-Meteo (required to get weather), rounded to 0.01°; search terms go to Open-Meteo's geocoder. "Where am I" asks for your location only when tapped, and resolves it offline. A Content-Security-Policy restricts the page to its own origin plus the four Open-Meteo hosts. Weather is cached for 15 minutes per 0.25° cell, so repeat taps make no request at all.

Open-Meteo's free tier is for non-commercial use; this project has no ads, sponsorships or store listing, and never will.

## Attribution

App code, illustrations (bottles, glassware, dial, cradle, pin, neon) and the bartender's grammar are MIT. The bar bundles or depends on:

| Source | Licence | Used for |
|---|---|---|
| [Open-Meteo (forecast, air quality, marine, geocoding)](https://open-meteo.com/) | CC BY 4.0 | Weather data — "Weather data by Open-Meteo.com", non-commercial free tier |
| [CAMS ENSEMBLE (Copernicus)](https://atmosphere.copernicus.eu/) | CC BY 4.0 | Air quality, via Open-Meteo |
| [DWD](https://www.dwd.de/) | CC BY 4.0 | Marine data, via Open-Meteo |
| [Natural Earth](https://www.naturalearthdata.com/) | Public domain | Offline reverse geocoding; India's outline from the India point-of-view dataset |
| [NASA Earth Observatory — Blue Marble & Black Marble](https://earthobservatory.nasa.gov/) | Public domain | Globe day and night textures (no endorsement implied) |
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
| [Sounds](https://developer.mozilla.org/docs/Web/API/Web_Audio_API) | Original (MIT) | Every bar sound is synthesised live with Web Audio — no recordings |

**Never used:** BigDataCloud (its policy forbids map-click coordinates), TheCocktailDB (its test key is not licensed for published apps), PlanetPixelEmporium textures, Pixabay audio, GPL code.

## Licence

MIT © Rahul Tarigoppula
