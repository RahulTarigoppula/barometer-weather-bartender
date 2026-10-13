# Barometer — "The Globe Bar" — THE Implementation Prompt

**Read this file and nothing else.** It is self-contained: every token, threshold, endpoint, workflow, formula, fixture and acceptance test you need is inlined below. You do not need `GOAL.md`, `docs/DESIGN.md`, `docs/ARCHITECTURE.md`, `docs/PLAN.md`, `docs/TESTING.md`, `docs/DEPLOYMENT.md`, `docs/RESEARCH.md`, `_shared/DECISIONS.md` or `design/preview.html`. If any of those files exist and disagree with this one, **this one wins** — the conflict ledger in §0 says why.

Target: one solo developer on Windows 11 with Node 22.17, npm, git, Python 3.14, Git Bash, GitHub CLI. **No Java, no Android SDK, no Flutter locally, and none required** — every APK is compiled by GitHub Actions.

---

## 0. Conflict ledger (resolved — do not re-litigate)

The source planning documents disagreed in a handful of places. These are the binding resolutions. Where you find contradicting numbers in any other file, apply these.

| # | Conflict | **Binding resolution** | Why |
|---|---|---|---|
| C1 | Nearest-place search radius: 600 km vs 400 km | **400 km** | The stricter, test-backed value. `geokdbush.around(index, lng, lat, 1, 400)`. Beyond 400 km with no country hit ⇒ open water. |
| C2 | Tag thresholds: two different band tables | **The TESTING §2.3 table, reproduced verbatim in §6.3 below** | It was declared "the contract". Band edges, the `bone-dry` two-part rule, `gale` at 62 km/h, and the **driving-tag priority list** all come from it. Intensity curves and base weights are re-derived onto those edges in §6.3. |
| C3 | Initial JS budget: 250 KB gzip vs 180 KB gzip | **180 KB gzip, hard limit**, enforced by `scripts/check-bundle.mjs` and failing CI | The 250 KB figures elsewhere are stale. The lazy globe chunk is budgeted separately at ≤ 320 KB gzip. |
| C4 | Texture runtime cache: `maxEntries` 8 vs 4 | **4 entries** in the Workbox `CacheFirst` route | Four is the whole texture set actually in play (day 4K/8K, night 4K/8K). |
| C5 | Golden fixture roster: a 12-place list vs a 9-place list | **The 9 weather fixtures + 2 error fixtures defined in §10.2** (`mumbai`, `yakutsk`, `reykjavik`, `dubai-noon`, `arabian-sea`, `south-pole`, `denver-hail`, `lisbon-golden`, `oslo-brunch`, `error-429`, `error-network`) | Singapore, London, Delhi, Phoenix, Bergen, Ushuaia and the Ross Sea are **not** fixtures. Do not invent them. |
| C6 | Driving tag = highest weight vs a priority list | **Priority list** (§6.3). `weight` still orders the tag array and drives drink scoring; the *driving* tag (dial grade, stamp family, window tint) is the first match in the priority list. | The priority list is what the fixture expectations were written against, and it survives all nine of them. |
| C7 | `denver-hail` expected wind tag: `breezy` vs `gale` | **`gale`** (gusts 78 ≥ 60 ⇒ gale by the §6.3 rule). Its driving tag is still `hail` and its dial is still `FAIR`. | The threshold table outranks the illustrative expectation row it contradicts. |
| C8 | Drink scoring maths: `weight = base × (1 + intensity)` vs "driving ×3, others ×1" | **`weight = base × (1 + intensity)`** (§6.5). Serve bonuses use the full table in §6.5, not ±2. Repeat penalty is **−2**, session-scoped. | The simplified ×3/×1 model was a hand-check illustration; it does not reproduce the worked examples. |
| C9 | Weather cache storage: `localStorage` (50 entries) vs memory + Dexie (200 entries) | **In-memory `Map` + Dexie `weatherCache`, pruned to the newest 200 rows on boot.** No `localStorage` cache. | Multi-tab safe and survives the 5 MB `localStorage` ceiling. |
| C10 | Cache cell-key format | **`${round4(lat)},${round4(lng)}` with JavaScript default number formatting** — `19,73`, `64.25,-22`, `0,-140.25`, `-90,0`, `-17.75,-180`. No forced decimal places. | Matches the pinned cache tests. |
| C11 | RNG seed shape | **`` `${lat.toFixed(1)}|${lng.toFixed(1)}|${localHour}|${menu}` ``** — the menu is part of the seed so the barista flip is independently deterministic. | |
| C12 | Intensifier stamp wording per fixture | **`src/wit/grammar/intensifiers.json` (§6.6) is the single source.** Stamp strings are snapshot-pinned after the first green run, not hard-coded in tests. | |
| C13 | Reverse-geocode precedence: marine polygon first vs land first | **Country polygon → coastal town (nearest place ≤ 15 km) → marine polygon → polar ice → open water.** | Natural Earth's 50 m marine polygons overlap real coastlines (Lisbon at (38.72, −9.14) fell into the North Atlantic). No country polygon contains the Caspian point (42, 51) at 110 m or 50 m, so land-first still returns the Caspian Sea. The Fiji golden rows (−17.7, ±179.9) are open sea at NE resolution; the tests now use Fiji land at (−16.6, 179.35) and (−16.2, −179.9) and assert the two antimeridian sea points name the South Pacific Ocean. |
| C14 | Repo name `barometer` | **`barometer-weather-bartender`** (the owner's repository). Pages base path is `/barometer-weather-bartender/`; every workflow derives it from `github.event.repository.name`. | The repository already existed. |
| C15 | globe.gl for the MVP globe | **A lean custom three.js globe** (`src/features/globe/globeThree.ts`): OrbitControls with the §A12 damping, raycast tap → lat/lng, HTML brass pin, surface ripple ring, arcing fly-to, and a day/night terminator shader (Blue Marble by day, Black Marble city lights warmed to sodium by night). | globe.gl pulled in h3-js, tile and hex layers: its lazy chunk was 540 KB gzip against the 320 KB budget (C3). The custom chunk is 136 KB. |
| C16 | Tailwind, shadcn/Base UI, react-router, Motion, Howler | **None of them.** Materials and layout are hand-written CSS reading tokens; Lever / Seg / Knob / Drawer / Toast are small accessible in-house primitives; routing is a `useSyncExternalStore` hash hook; motion is CSS keyframes + the `linear()` spring token; every sound is synthesised with Web Audio (zero audio files, so no CC0 sourcing or sprite). | Smaller initial JS (168 KB gzip, under the 180 KB gate) and fewer moving parts; the visual contract is unchanged. |
| C17 | `prep-drinks.mjs` pipeline from the cloned repos | **Recipes are authored directly in `bar-menu.json`**: quantities from the IBA / Open Drinks (MIT) recipes, method text written in-house, `source` recorded per drink. | 40 curated drinks do not need a 756-recipe import step. |
| C18 | Monthly Blue Marble NG downloads | **One Blue Marble 4K WebP** (from the MIT three-globe repo's NASA-derived `earth-blue-marble.jpg`) plus **NASA Black Marble 2016** 4K/8K WebP from NASA EO. | The monthly BMNG image URLs no longer resolve; the night side matters more than the month. |
| C19 | `gale` intensity formula | **`clamp01(max(0, (v − 62) / 40) + (g ≥ 60 ? 0.2 : 0))`** | The literal formula clamps Denver's gust bonus to zero; this one reproduces the pinned Dark 'n' Stormy 17.53 / margin 7.45. |
| C20 | EU AQI band edges | **Strict `<` edges** (20 → fair, 40 → moderate, 60 → poor, 80 → very-poor). | Matches the §6.1 golden row. |
| C21 | `arabian-sea` timezone | **`Etc/GMT-4`, offset 14400** — probed live on day 1 (D1-2). (0, −140) returns `Etc/GMT+9`. | The 19800 in §10.2 was a placeholder. |
| C22 | Worked example B, Mojito | **−2.20**, not −3.00 — the table omitted Mojito's `late` affinity (1 × 0.80). | Arithmetic. |
| C23 | Lisbon / Oslo driving tags | **`warm` / `mild`** by the C6 priority list (the §6.3 table bolded the day-part). Dial and grade are unchanged (FAIR / none). | C6 is binding. |
| C24 | Licence scanner exclusion | **`suncalc@2.1.1`** is excluded (ESM release, no `license` field; repo LICENSE is BSD-2-Clause). **OFL-1.1** is allowed for the three Fontsource fonts. | Re-check on every bump. |
| C25 | E2E with SwiftShader WebGL | **E2E stubs WebGL** so the flows run on the engraved canvas globe (the real no-WebGL path); Open-Meteo is always routed to fixtures; a catch-all route records any foreign request. | Software WebGL starved the main thread under parallel headless runs. |
| C26 | Polar day-part | **A 24-hour sunrise→sunset row at |lat| ≥ 66.5 also takes the clock-only path** (Open-Meteo returns 00:00→00:00 during polar day). | Probed live at the South Pole. |
| C27 | Stretch features | **AI rungs 1–3 and the Nominatim lever are not shipped**; the Back Office shows rung 0 with the others disabled. The BAR/BARISTA sign and "Menu" in the Back Office are one persisted setting. | Per §13 "if deferred, it does not exist in src/". |
| C28 | The bar's look (mahogany, brass, neon; §3) | **v1 redesign at the owner's request: a planet in deep space.** One dark theme (no day/night shift); a starfield, a soft blue atmosphere, glass panels, saffron (India) and sky-blue (weather) accents, Space Grotesk + JetBrains Mono (Righteous dropped). The "no navy, no starfield, no glass" rules of §3.1 are retired. | The owner found the bar look "not my vibe" and the globe too small. |
| C29 | Layout | **Weather first, then bartending.** A full-height hero planet (sticky on desktop, ~64 svh on phones) beside a panel: weather card → bartender card → recent places. The back-bar shelf, wall dial, register and window are gone; their information lives in the weather card (comfort scale, tiles, ambient layers) and the bartender card. | Owner direction. |
| C30 | Default view and first pour | **India.** The camera's home is 22.5°N 79.5°E; India's outline (Natural Earth *India point-of-view* boundaries) and 18 Indian cities are drawn on the planet; Indian city chips come first; search asks the geocoder with `countryCode=IN` and the world in parallel and lists Indian matches first; on open the app pours the last place on the Tab, else New Delhi. The "no request before a pour" rule (§10.9) is replaced by "the only requests are Open-Meteo". | Owner direction: India is the primary focus. |
| C31 | Budget ranges | **Four tiers — Extreme Cheap, Budget, Mid-range, High-end** (`src/engine/budget.ts`): per drink, an Indian-market pour, where to drink it and a per-glass ₹ band scaled by base (beer cheaper, agave dearer), ≈ $ for non-Indian places; persisted, selectable on the card and in Settings, printed on the share card. The scoring engine is unchanged, so every golden fixture still holds. | Owner direction. Prices are indicative ranges, not quotes. |
| C32 | Mocktail names | **Six alcohol-free twins take Indian names and recipes, same ids:** Nimbu Soda, Jaljeera Cooler, Aam Panna Slush, Kokum Soda, Filter Coffee Tonic, Adrak Nimbu Chai. | India focus without touching the scoring golden values. |
| C33 | Colour tokens | Space colours are `--void-*`; `--space-*` stays the spacing scale. | Caught by lint: the first draft reused `--space-1` for both. |
| C34 | Name | **Mausam ka Mahaul** ("the vibe of the weather"). Repository, package id, IndexedDB name and the History export tag stay `barometer` so links, installs and saved data survive. | The owner asked for a name with a story; *mausam* is the weather, *mahaul* the mood it creates — exactly what the app reads. "ka", not "ki": *mahaul* is masculine. |
| C35 | The ticker | **Removed.** The footer is quiet credits only. | The owner disliked the scrolling news-ticker; it competed with the weather for attention. |
| C36 | Traffic | **Two layers:** a pure, labelled *Estimate* (`engine/traffic.ts`: weekday/weekend rush curves, 12-metro severity, rain/downpour/fog/snow drag, 10 km trip minutes, the first hour it eases) and an **optional live** TomTom flow reading with the user's own key, stored locally, CSP-allowed only for `api.tomtom.com`. | No free, key-less, CORS-enabled live traffic API exists; an honest estimate beats a fake "live" badge. |
| C37 | Forecast data | Forecast asks for 7 days plus hourly `weather_code`/`is_day` and daily `weather_code`/`precipitation_probability_max`; the next 25 hours and the days are stored on the verdict (`forecast`) so History re-prints the outlook without a request. | One request still serves the whole screen. |
| C38 | India right now | Twelve cities in **one** batched forecast call and **one** batched air-quality call, cached 15 minutes in memory; their temperatures also label the globe. | Cheap enough for Open-Meteo's free tier; makes the India focus visible at a glance. |
| C39 | Extras | Today's tips (US-AQI mask threshold 151, heat at feels-like ≥ 41 °C), snack pairing, daylight arc, saved places (≤ 8, star toggle). New cards are lazy chunks so the initial JS stays under 180 KB. | Practical, India-relevant, and each one is a pure tested function. |

C13–C27 were recorded while building v0.9 (2026-10-12); C28–C33 are the v1.0 space/India redesign (2026-10-13); C34–C39 are v1.1, Mausam ka Mahaul (2026-10-13). Everything else in this document is unconditional.

---

## 1. Role & mission

You are a principal front-end engineer with a strong graphics and information-design bias. You are building **one** app, alone, from an empty folder to a deployed, premium, screenshot-worthy product. You write TypeScript in strict mode, you write the pure engine before the UI, and you treat the visual specification in §3 as a contract rather than a suggestion.

**The product, in one paragraph.** Barometer — brand name *The Globe Bar* — is a brass-cradled planet sitting on a mahogany counter under a buzzing neon sign. You flick the globe (it has bearings; you can feel them), tap anywhere on Earth, and a brass pin drops while the camera flies in. In the ~400 ms it takes Open-Meteo to answer, a blank cream coaster is already sliding across the counter. Then it prints: how far you are from the nearest real town, the local time, one weather jab in a judgmental bartender's voice, an intensifier stamped at an angle (AGGRESSIVELY ICED · HOT, NO ARGUMENTS · DO NOT GO OUTSIDE), the drink name in sign lettering, and a mono receipt strip of the numbers that justify it. At the same moment, the bottle the bartender reached for lights up on the back-bar shelf and the wall barometer's needle swings to the word that decided it: SOUP for Mumbai at 02:14 with a 24° dew point, ARCTIC for Yakutsk at −48° apparent. Flip the coaster for the recipe, flip the BAR sign to BARISTA for the alcohol-free twin (the bartender suggests it himself before 11:00 local), tear the register receipt off as a 1080×1350 share card, and every verdict lands on The Tab — your history — which re-flies the globe when tapped. Everything runs client-side: no accounts, no analytics, no server of ours, no API key of ours, anywhere.

**The quality bar.** *If it looks like a generic weather dashboard, start over.* Concretely: if a screenshot of any state could be mistaken for a weather app, it has failed — a bottle, a coaster's pressed ring, a brass pin or the neon sign must be visible in every frame. There is no navy, no starfield, no glassmorphism, no blur, no floating cards, no stat pills, no icon grid, no forecast strip, no charts. The dark is mahogany; the accent is brass; the card is paper; nothing floats.

**Three adjectives: Tactile · Cheeky · Loud.**

**The trick that makes it one object instead of a dashboard:** every piece of information is a *thing in the bar*. The weather is on the window glass behind the counter. The temperature is a needle on a brass wall dial. The verdict is letterpressed on a coaster. The stats are a thermal receipt from the register. The decision is visible before it is read — the bottle he reached for lights up.

**Working agreement (law, not preference).**

1. **Day 1 = live.** Before a single drink is scored, `https://<owner>.github.io/barometer/` must serve a neon "hello world".
2. **Engine first, UI second.** Every `src/engine` module lands with its Vitest file green in the same commit.
3. **The design spec is the spec.** If the real app looks worse than §3 and §4 describe, it is not done.
4. **No paid anything, ever.** If a step would ask for a credit card, stop and find the free alternative.
5. **Nothing is reported anywhere.** No analytics, no telemetry, no crash reporting, in any build.

---

## 2. Non-negotiables

### 2.1 Stack (exact packages, pinned majors)

| Layer | Package(s) | Version |
|---|---|---|
| Build / UI | `vite`, `@vitejs/plugin-react`, `react`, `react-dom`, `typescript` | Vite 8.2.x · React 19 · TS 5.x (strict) |
| Styling | `tailwindcss`, `@tailwindcss/vite` | Tailwind CSS v4 (`@theme inline` bridge only; the bar's materials are hand-written CSS) |
| Motion | `motion` (`motion/react`) | 13.2.x |
| Globe (MVP) | `globe.gl`, `three` | globe.gl 2.46.2 · three 0.185.1 |
| Geo | `d3-geo`, `kdbush`, `geokdbush` | 3.1.x · 4.1.x · 2.1.x |
| Sun | `suncalc`, `solar-calculator` | 2.0.2 · 0.3.0 |
| Text | `tracery-grammar`, `seedrandom` | 2.8.4 · 3.0.5 |
| State | `zustand`, `dexie`, `dexie-react-hooks` | 5.x · 4.x |
| Routing | `react-router` (`createHashRouter`) | 7.x |
| PWA | `vite-plugin-pwa`, `@vite-pwa/assets-generator` | 1.3.x |
| Audio | `howler` | 2.2.4 (+ raw Web Audio for beds) |
| Fonts | `@fontsource/righteous`, `@fontsource-variable/space-grotesk`, `@fontsource-variable/jetbrains-mono` | latest; Latin subsets, self-hosted |
| Icons | `lucide-react` | latest (Back Office / sheet chrome only) |
| Primitives | shadcn/ui on Base UI: `dialog`, `switch`, `slider`, `tooltip` | restyled through tokens; **never forked** |
| Android (optional tier) | `@capacitor/core`, `/android`, `/cli`, `/app`, `/haptics`, `/share`, `/filesystem`, `/preferences`, `/status-bar`, `/splash-screen`, `/geolocation` | Capacitor 8.5.x |
| Tests | `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `fake-indexeddb`, `@playwright/test`, `@axe-core/playwright` | Vitest 3 · Playwright 1.5x |
| Lint/format | `@biomejs/biome` | latest — the only linter/formatter |
| Data prep | `sharp` (dev only) | latest |

**Explicitly not used:** GSAP (free but non-OSI — no timeline here needs it), React Three Fiber / drei / postprocessing (deferred stretch work behind the `globeMaterial` seam), CesiumJS, MapLibre, cobe, `react-globe.gl`, `@turf/*`, `world-atlas`, `topojson-client`, any CSS-in-JS runtime, any component library other than shadcn-on-Base-UI.

### 2.2 Free-only rule

GitHub (public repo, Pages, Actions, Releases) is the entire infrastructure. No Cloudflare Worker is needed to ship; one is optional later for the keyless AI garnish. **No card is entered anywhere.** No ads, no affiliate links, no sponsor button, no donation button, no store listing — Open-Meteo's free tier is non-commercial-only and that is a deployment constraint, not just a legal footnote.

### 2.3 Licence rules

- App code, illustrations and grammar: **MIT**.
- Dependencies: OSI licences only — MIT / Apache-2.0 / BSD-2 / BSD-3 / ISC / MPL-2.0 / Zlib / CC0 / Unlicense / 0BSD. **AGPL and GPL are banned.**
- Bundled data: public domain / CC0 / CC BY 4.0 / MIT only.
- **Never bundle, never call, never copy:** `teijo/iba-cocktails` (no licence file at all — all rights reserved), TheCocktailDB (test key is not licensed for published apps), BigDataCloud / `api-bdc.io` (its fair-use policy forbids arbitrary map-click coordinates and threatens HTTP 402 + IP bans), `timeapi.io` (terms unverifiable), PlanetPixelEmporium textures (proprietary), `PranshulGG/WeatherMaster` code (GPL-3.0), `open-meteo/weather-map-layer` code (GPL-2.0), MobileCLIP weights.
- **Do bundle:** `rasmusab/iba-cocktails` (MIT), `alfg/opendrinks` (MIT), Natural Earth vectors from `nvkelso/natural-earth-vector` (public domain), NASA Blue Marble NG + Black Marble (public domain, credit "NASA Earth Observatory", no implied endorsement), three-globe example textures `earth-day.jpg` / `earth-topology.png` / `earth-water.png` / `night-sky.png` (MIT repo, NASA-derived — see the day-1 licence check in §9), Righteous / Space Grotesk / JetBrains Mono (SIL OFL 1.1), CC0 sounds from Freesound's CC0 filter or Kenney.nl.
- `suncalc@2.0.2` has no `license` field on npm; its repo LICENSE is BSD-2-Clause. Exclude exactly that one package from the licence scanner with a comment, and re-check on every bump.
- Every recipe's **method text is written in-house**. Quantities are facts; prose can be copyrighted.
- `README.md` carries an Attribution table that must match `src/data/attribution.json` and the `#/about` screen, three ways, enforced by a test.

### 2.4 Privacy

No analytics, telemetry, crash reporting, feature flags service, A/B testing, remote config, font CDN or tag manager — in any build. No accounts, no cookies, no cloud sync. The coordinates you click are sent only to Open-Meteo (required to get weather) and, only if the user switches the lever on, to Nominatim. Device location is requested only when "Where am I" is tapped and is resolved **offline**. Deep-link URLs carry coordinates rounded to 2 dp (~1 km) and nothing else. BYO LLM keys (a stretch feature) are AES-GCM-wrapped with a non-extractable `CryptoKey` in IndexedDB, default to "session only", are displayed as last-4, and never appear in a URL, a log or the share card.

### 2.5 Offline

The app shell, fonts, geo data, drink data, grammar, sounds and the first-paint texture are precached. Open-Meteo answers are cached 15 minutes per 0.25° cell in Dexie and reused stale (up to 24 h, tagged "re-poured from memory") when offline. The Tab is always readable offline. A cold PWA install boots offline and reopens the last verdict.

### 2.6 Platforms

| Target | How | Notes |
|---|---|---|
| Web (PWA) | GitHub Pages at `https://<owner>.github.io/barometer/`, hash routing, Workbox precache | Installable; the only host that talks is `*.open-meteo.com` |
| Desktop | The same web app at ≥ 1024 px: full back-bar, window + globe, counter with register and Tab drawer | Keyboard: arrows rotate, Enter pours at the crosshair, `+`/`−` zoom |
| Phone web | < 768 px: 56 px back-bar strip, ~50 vh window, counter as a draggable sheet with a square coaster | Thumb-reach layout; the coaster is the LCP after the sign |
| Android (optional) | Capacitor 8 shell, signed APK from GitHub Actions on tag `v*`, sideloaded from Releases | `minSdk 24`, `compileSdk 36`; haptics, share, status bar, splash, geolocation; **no service worker in the WebView** |
| iOS | Not targeted | No Mac available |

### 2.7 Repo name and identifiers

- GitHub repo: **`barometer`**, public. The name becomes the Pages sub-path and `VITE_BASE_PATH=/barometer/` — renaming it later means redoing the base path and the PWA scope.
- Android `appId`: **`com.rahul.barometer`** — can never change after the first install.
- App display name: **The Globe Bar**.

### 2.8 Folder layout

```
barometer/
├── .github/workflows/
│   ├── pages.yml                    # build + deploy to GitHub Pages on push to main
│   ├── ci.yml                       # lint, types, unit, licences, bundle gate, e2e
│   ├── android-release.yml          # signed APK on tag v* → GitHub Release
│   └── live.yml                     # weekly @live Open-Meteo probe
├── android/                         # Capacitor shell (committed; `npx cap add android`)
├── public/
│   ├── textures/                    # earth-day.jpg (≤260 KB first paint), bmng-{mm}-{4k,8k}.webp,
│   │                                # black-marble-{4k,8k}.webp, earth-topology.png, earth-water.png, night-sky.png
│   ├── geo/                         # countries-110m.json, countries-50m.json (lazy), places.json,
│   │                                # marine-50m.json, land-dots.json
│   ├── sounds/                      # bar.ogg + bar.json sprite map, hum.ogg, ATTRIBUTION.md
│   └── icons/                       # generated by @vite-pwa/assets-generator from design/icon.svg
├── raw/                             # GIT-IGNORED: NASA JPEGs, cloned drink repos, NE GeoJSON
├── scripts/
│   ├── prep-geo.mjs                 # raw NE GeoJSON → public/geo/* (rewind, bbox, strip, dots)
│   ├── prep-drinks.mjs              # raw drink repos → src/data/drinks.json
│   ├── prep-textures.mjs            # raw NASA JPEG → 4K/8K WebP with sharp
│   ├── sample-voice.mjs             # 1,000 verdicts per fixture → distinct-line report
│   ├── check-bundle.mjs             # the §10.8 budget gate
│   ├── check-menu.mjs               # parses the §6.11 tables; asserts >= 3 drinks at affinity >= 3 per Tag
│   └── golden.py                    # recomputes every derived fixture value
├── src/
│   ├── app/                         # main.tsx, router.tsx (hash), providers, Bar layout shell
│   ├── features/
│   │   ├── globe/                   # GlobeCradle (globe.gl), SvgGlobe fallback, pin, ripple, keyboard, fly-to
│   │   ├── verdict/                 # pour.ts (orchestrator), Coaster, IntensifierStamp, GlasswareSVG,
│   │   │                            # ReceiptStrip, Recipe back face, BaristaTag
│   │   ├── backbar/                 # BackBar, Bottle shelf, WallDial, NeonSign (wordmark + BAR/BARISTA)
│   │   ├── window/                  # Window sky + weather layers
│   │   ├── register/                # RegisterDisplay ticker, Receipt, tear-off, shareCard.ts (canvas)
│   │   ├── tab/                     # The Tab list, repo.ts, export/import
│   │   ├── office/                  # Back Office settings sheet
│   │   └── search/                  # classified-ad search, Where am I
│   ├── engine/                      # PURE, framework-free, 100% unit-tested, no I/O
│   │   ├── comfort.ts  tags.ts  score.ts  pick.ts  intensify.ts  dial.ts
│   │   ├── daypart.ts  units.ts  terminator.ts  receipt.ts  wmo.ts
│   │   ├── geocode/{countries,places,marine,index}.ts
│   │   └── index.ts                 # judge(input) → Verdict
│   ├── data/                        # drinks.json, bar-menu.json, cities-ticker.json, attribution.json
│   ├── wit/
│   │   ├── grammar/{voice,intensifiers}.json
│   │   ├── tracery.ts  engine.ts  lint-denylist.json
│   │   └── llm/                     # (stretch) optional, lazy adapters
│   ├── api/                         # openMeteo.ts, nominatim.ts, cache.ts
│   ├── state/                       # store.ts (Zustand), db.ts (Dexie)
│   ├── audio/                       # sprite.ts (Howler), beds.ts (Web Audio), unlock.ts
│   ├── motion/springs.ts
│   ├── components/ui/               # BrassPlate, Lever, BrassKnob, Sheet, Tooltip, Toast
│   ├── styles/                      # tokens.css, index.css, window.css
│   ├── platform/                    # haptics, share, prefs, geolocation, statusBar, sw (web ↔ Capacitor)
│   └── test/                        # setup.ts, fixtures/
├── e2e/                             # Playwright specs + visual baselines
├── bench/                           # Vitest bench files
├── docs/                            # this file
├── design/                          # preview.html (optional), icon.svg
├── capacitor.config.ts  vite.config.ts  vitest.config.ts  playwright.config.ts
├── biome.json  lighthouserc.json  .env  .gitignore  .gitattributes
└── README.md
```

---

## 3. Design & aesthetics — the complete frontend brief

This section is the entire visual contract. Build from it directly.

### 3.1 Identity

**Name on the sign:** THE GLOBE BAR. **Tagline:** *Spin. Tap. Survive.*

**What it must never look like:**

- *"Another 3D earth on a navy/space gradient with a glass card."* No navy, no starfield, no glassmorphism, no blur, nothing floating.
- *A weather dashboard.* No stat pills, no icon grid, no forecast strip, no charts.
- *A Prohibition speakeasy / Art-Deco template.* No gold filigree, no script fonts, no sunburst borders. **One brass line per band, one neon sign — that is the entire ornament budget.**
- *Refined.* This is a dive bar with good bones. If a build reads as elegant-and-quiet, the levers are copy (rude), scale (the intensifier stamp at ~2×, rotated), light (the neon buzz, the lightning frame) and sound — **never more colour**.

**References to steal from (in spirit, not pixels):** Zoffoli globe-bar cabinets (the brass meridian cradle, the turned-wood base); Hopper's *Nighthawks* (warm interior against a cold outside, seen through a big pane); Lloyd from *The Shining* (impeccably polite, quietly judging you); Not Boring Weather (weather as a lit, tactile object); Braun SK4 (one honest material per surface); Dead Rabbit NYC printed coasters (pressed rings, stamped type, rude copy); Googie/tiki neon signage; earth.nullschool.net (the planet as an instrument you interrogate by clicking); NASA Black Marble; an antique aneroid barometer face; thermal receipt paper.

### 3.2 The two shifts

The bar has **no theme toggle**. Click somewhere in daylight and the room is on the **Day shift** (daylight through the window, oak, neon off); click into night and it is the **Night shift** (mahogany, sodium window, neon on). Before the first click, `prefers-color-scheme` decides. A pin in the Back Office can fix either shift. The shift is driven by the clicked place's `is_day`, set as `data-shift="day" | "night"` on `<html>`.

### 3.3 Design tokens — paste this into `src/styles/tokens.css` verbatim

```css
/* Barometer — The Globe Bar — design tokens. Night shift is :root. */
/* Register the colour tokens so the shift change (A8) can transition them. */
@property --bg            { syntax:'<color>'; inherits:true; initial-value:#1A0F0A; }
@property --bg-elevated   { syntax:'<color>'; inherits:true; initial-value:#2E1A10; }
@property --surface       { syntax:'<color>'; inherits:true; initial-value:#3A2114; }
@property --surface-2     { syntax:'<color>'; inherits:true; initial-value:#4A2C1A; }
@property --ink           { syntax:'<color>'; inherits:true; initial-value:#F3E6C8; }
@property --ink-muted     { syntax:'<color>'; inherits:true; initial-value:#C9B28C; }
@property --accent        { syntax:'<color>'; inherits:true; initial-value:#C9962B; }
@property --accent-2      { syntax:'<color>'; inherits:true; initial-value:#7FE8C8; }
@property --border        { syntax:'<color>'; inherits:true; initial-value:#4A3222; }
@property --border-strong { syntax:'<color>'; inherits:true; initial-value:#C9962B; }
@property --neon          { syntax:'<color>'; inherits:true; initial-value:#FFB347; }

:root {
  color-scheme: dark;

  /* colour — Night shift (default) */
  --bg: #1A0F0A; --bg-elevated: #2E1A10; --surface: #3A2114; --surface-2: #4A2C1A;
  --ink: #F3E6C8; --ink-muted: #C9B28C; --ink-faint: #8C7355;  /* faint = decorative only */
  --accent: #C9962B; --accent-ink: #1A0F0A;                    /* brass */
  --accent-2: #7FE8C8;                                         /* crushed-ice mint */
  --success: #8CC46A; --success-fill: #5B8C3A;
  --warning: #F08A3C;                                          /* amaro orange */
  --danger: #F0564B; --danger-fill: #B8322E;                   /* campari; text on --bg only */
  --border: #4A3222; --border-strong: #C9962B; --focus: #F5C860;

  /* app-specific materials */
  --neon: #FFB347; --neon-glow: rgba(255,179,71,.55); --neon-off: #6B4A3A;
  --brass-hi: #F5C860; --brass-lo: #8A6414;
  --brass-gradient: linear-gradient(100deg,#8A6414 0%,#C9962B 35%,#F5C860 52%,#C9962B 68%,#8A6414 100%);
  --paper: #F3E6C8; --paper-2: #E6D2A6; --paper-border: #D8C7A6;
  --paper-ink: #1C120C; --paper-ink-muted: #5E4632; --paper-ink-faint: #A38A6F;
  --paper-accent: #7A5A12; --paper-accent-2: #1F6E7B;
  --paper-success: #3E6B2A; --paper-warning: #A6470E; --paper-danger: #A0281F;

  /* set per verdict by JS — these three tint art, never text */
  --grade: rgba(255,179,71,.12);      /* window pane tint */
  --stamp: var(--paper-ink);          /* intensifier stamp ink */
  --drink-glow: rgba(127,232,200,0);  /* coaster ring glow */

  --grain-opacity: .08; --shadow-alpha: 1;

  /* typography */
  --font-display: 'Righteous', 'Bowlby One', Impact, sans-serif;
  --font-body: 'Space Grotesk Variable', 'Space Grotesk', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
  --text-xs: .75rem; --text-sm: .8125rem; --text-base: 1rem; --text-lg: 1.1875rem;
  --text-xl: 1.375rem; --text-2xl: 1.75rem;
  --text-3xl: clamp(2.25rem, 5vw, 3rem);
  --text-4xl: clamp(2.75rem, 7vw, 4.5rem);
  --text-5xl: clamp(3.5rem, 9vw, 7rem);
  --leading-tight: 1.05; --leading-body: 1.5;
  --tracking-display: .02em; --tracking-caps: .08em;

  /* spacing (8px base) */
  --space-1: 4px;  --space-2: 8px;   --space-3: 12px;  --space-4: 16px;
  --space-5: 24px; --space-6: 32px;  --space-7: 40px;  --space-8: 48px;
  --space-9: 64px; --space-10: 80px; --space-11: 96px; --space-12: 128px;

  /* radius */
  --radius-sm: 3px; --radius-md: 6px; --radius-lg: 14px; --radius-xl: 24px; --radius-full: 9999px;

  /* elevation — warm-black contact shadows; things sit ON wood, they do not float */
  --shadow-1: 0 1px 0 rgba(0,0,0, calc(.35 * var(--shadow-alpha)));
  --shadow-2: 0 6px 14px -6px rgba(0,0,0, calc(.55 * var(--shadow-alpha)));
  --shadow-3: 0 18px 40px -12px rgba(0,0,0, calc(.7 * var(--shadow-alpha)));

  /* motion */
  --ease-out: cubic-bezier(.22, 1, .36, 1);
  --ease-in-out: cubic-bezier(.65, 0, .35, 1);
  --ease-spring: linear(0, 0.009, 0.035 2.1%, 0.141, 0.281 6.7%, 0.723 12.9%, 0.938 16.7%, 1.017,
    1.077 20.4%, 1.121, 1.149 24.3%, 1.159, 1.163 27.8%, 1.154, 1.129 32.8%, 1.051 39.6%,
    0.979 47.2%, 0.957 53.7%, 0.977 61.9%, 1.006 74.4%, 1.001 100%);
  --dur-fast: 120ms; --dur-base: 240ms; --dur-slow: 480ms; --dur-fly: 1200ms;

  /* layout */
  --globe-size: clamp(280px, 48vmin, 640px);
  --page-inset: 16px;
  --shift-transition: var(--dur-slow) var(--ease-in-out);

  /* the ONLY texture in the app: wood grain, stretched 1×6 so it reads as grain, not noise */
  --grain: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9 0.04' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23g)'/%3E%3C/svg%3E");
}

/* Day shift — set by JS from the clicked place's is_day (pinnable in the Back Office) */
:root[data-shift="day"] {
  color-scheme: light;
  --bg: #EFE3CC; --bg-elevated: #D9B98A; --surface: #FBF4E4; --surface-2: #E6D2A6;
  --ink: #1C120C; --ink-muted: #5E4632; --ink-faint: #9C8468;
  --accent: #7A5A12; --accent-ink: #FBF4E4; --accent-2: #1F6E7B;
  --success: #3E6B2A; --success-fill: #5B8C3A; --warning: #A6470E;
  --danger: #A0281F; --danger-fill: #B8322E;
  --border: #D8C7A6; --border-strong: #7A5A12; --focus: #7A5A12;
  --neon: #E8B7A0; --neon-glow: transparent; --neon-off: #C8A78F; --paper: #FBF4E4;
  --grain-opacity: .05; --shadow-alpha: .6;
}

/* Before the first click the OS decides; JS sets data-shift on the first verdict. */
@media (prefers-color-scheme: light) {
  :root:not([data-shift]) {
    color-scheme: light;
    --bg: #EFE3CC; --bg-elevated: #D9B98A; --surface: #FBF4E4; --surface-2: #E6D2A6;
    --ink: #1C120C; --ink-muted: #5E4632; --ink-faint: #9C8468;
    --accent: #7A5A12; --accent-ink: #FBF4E4; --accent-2: #1F6E7B;
    --success: #3E6B2A; --warning: #A6470E; --danger: #A0281F;
    --border: #D8C7A6; --border-strong: #7A5A12; --focus: #7A5A12;
    --neon: #E8B7A0; --neon-glow: transparent; --neon-off: #C8A78F; --paper: #FBF4E4;
    --grain-opacity: .05; --shadow-alpha: .6;
  }
}

/* Paper material scope — coaster, receipt, recipe card, share card.
   Components inside read the SAME token names, so they never special-case paper. */
.paper {
  --bg: var(--paper); --bg-elevated: var(--paper); --surface: var(--paper); --surface-2: var(--paper-2);
  --ink: var(--paper-ink); --ink-muted: var(--paper-ink-muted); --ink-faint: var(--paper-ink-faint);
  --accent: var(--paper-accent); --accent-ink: var(--paper); --accent-2: var(--paper-accent-2);
  --success: var(--paper-success); --warning: var(--paper-warning); --danger: var(--paper-danger);
  --border: var(--paper-border); --border-strong: var(--paper-accent); --focus: var(--paper-accent);
  color-scheme: light; background: var(--bg); color: var(--ink);
}

:root { transition:
  --bg var(--shift-transition), --bg-elevated var(--shift-transition),
  --surface var(--shift-transition), --surface-2 var(--shift-transition),
  --ink var(--shift-transition), --ink-muted var(--shift-transition),
  --accent var(--shift-transition), --accent-2 var(--shift-transition),
  --border var(--shift-transition), --border-strong var(--shift-transition),
  --neon var(--shift-transition); }

@media (prefers-reduced-motion: reduce) {
  :root { --dur-fast:0ms; --dur-base:200ms; --dur-slow:240ms; --dur-fly:0ms; --ease-spring: var(--ease-out); }
}
:root[data-motion="less"] { --dur-fast:0ms; --dur-base:200ms; --dur-slow:240ms; --dur-fly:0ms; --ease-spring: var(--ease-out); }
@media (min-width: 1024px) { :root { --page-inset: 32px; } }
```

**Tailwind bridge** in `src/index.css` — layout utilities only, materials stay hand-written:

```css
@import "tailwindcss";
@import "./tokens.css";
@theme inline {
  --color-bg: var(--bg); --color-ink: var(--ink); --color-accent: var(--accent);
  --font-display: var(--font-display); --font-sans: var(--font-body); --font-mono: var(--font-mono);
  --radius-lg: var(--radius-lg);
}
```

### 3.4 Colour usage rules (WCAG AA is a hard gate)

Night shift, text-on-background ratios: `--ink` 15.2:1 on `--bg` and 12.1:1 on `--surface`; `--ink-muted` 9.2:1 / 7.3:1; `--accent` (brass) 7.1:1 / 5.6:1; `--accent-2` 12.8:1 on `--bg`; `--success` 9.2:1; `--warning` 7.5:1 / 6.0:1; `--focus` 11.9:1; `--neon` 10.6:1.
Day shift: `--ink` 14.5:1 on `--bg` and 16.8:1 on `--surface`; `--ink-muted` 6.9:1 / 8.0:1; `--accent` 5.0:1 / 5.8:1; `--accent-2` 4.6:1 / 5.4:1; `--success` 5.0:1; `--warning` 4.7:1; `--danger` 5.9:1.
Paper scope (both shifts): `--ink` 14.9:1 (Day 16.8:1); `--ink-muted` 7.1:1 and 5.9:1 on `--surface-2`; `--accent` 5.1:1; `--accent-2` 4.8:1; `--success` 5.1:1; `--warning` 4.8:1; `--danger` 6.0:1.

Hard rules:

1. `--ink-faint` is **decorative only** (rail shadows, coaster rings, dividers, disabled engraving). It never carries running text.
2. `--danger` on `--surface` in Night is 4.4:1 — **large text only** (≥ 18 px / 600). For body copy on wood use the `--danger-fill #B8322E` fill with `--ink` text.
3. On the **Day shift, only `--ink` sits directly on oak (`--bg-elevated`)**. Muted and brass text on oak are forbidden.
4. On the Night shift, text on wood is only `--ink`, `--ink-muted` or `--accent`.
5. `--grade`, `--drink-glow` and neon **never sit behind text**.
6. Text never sits on the globe, on the window, or on a gradient. Text on brass uses the flat `--accent-ink` on a `--accent`/brass-gradient fill.
7. Forbidden everywhere: blur, glassmorphism, drop shadows on text, gradients on text, navy, pure white (`#FFF`), pure black (`#000`).

### 3.5 Weather-grade tokens (set on `:root` per verdict, from the driving tag)

| Grade family (from driving tag) | `--grade` (window tint) | `--stamp` (stamp ink) | `--drink-glow` | Window layer |
|---|---|---|---|---|
| **heat** — scorching, hot, uv-extreme | `#F08A3C` @ 18% | `var(--warning)` | `--warning` @ 25% | glare |
| **muggy** — muggy, oppressive | `#1B6F6A` @ 22% | `var(--accent-2)` | `--accent-2` @ 30% | droplets |
| **cold** — chilly, cold, freezing, arctic | `#9FD8FF` @ 20% | `var(--accent-2)` | `--accent-2` @ 20% | frost creep at apparent ≤ −10° |
| **rain** — drizzle, rain, downpour | `#2C3440` @ 30% | `var(--ink)` | none | streaks, three parallax speeds |
| **snow** — snow, blizzard | `#DCE6EE` @ 26% | `var(--accent-2)` | `--accent-2` @ 20% | slow flakes |
| **storm** — storm, hail, gale | `#2C3440` @ 40% | `var(--danger)` | `--danger` @ 30% | lightning frame |
| **fog** — fog, smog, dust | `#8C7355` @ 35% | `var(--ink-muted)` | none | desaturated pane |
| **sodium** — late, evening | `#FFB347` @ 12% | `var(--ink)` | `--neon` @ 15% | sodium lamp |
| anything else | keep the default | `var(--paper-ink)` | transparent | none |

`--stamp` is always one of the AA-checked paper inks. `--grade` only ever tints the window pane.

### 3.6 Materials — build them exactly this way

```css
/* Mahogany / oak — the only texture in the app */
.wood {
  position: relative;
  background: linear-gradient(180deg, var(--surface) 0%, color-mix(in oklab, var(--surface), #000 18%) 100%);
}
.grain::after {                       /* apply to every wood surface */
  content: ''; position: absolute; inset: 0; pointer-events: none; border-radius: inherit;
  background-image: var(--grain); background-size: 300px 100%;
  opacity: var(--grain-opacity); mix-blend-mode: overlay;
}

/* Brass — one highlight, one shadow. Text on brass uses the flat --accent-ink. */
.brass { background: var(--brass-gradient); color: var(--accent-ink); box-shadow: var(--shadow-1); }

/* Coaster paper — pressed ring, never white */
.coaster__face {
  position: relative; backface-visibility: hidden; -webkit-backface-visibility: hidden;
  border-radius: var(--radius-md); padding: var(--space-5);
  box-shadow: inset 0 0 0 1px var(--border),
              inset 0 0 0 10px var(--surface-2),
              inset 0 0 0 11px var(--ink-faint),
              var(--shadow-2);
  border: 1px solid color-mix(in oklab, var(--paper-ink) 12%, transparent);
}

/* Neon — a tube, not a glow blob: 1.6px stroke + two drop-shadows, transparent fill */
.neon {
  color: transparent; -webkit-text-stroke: 1.6px var(--neon);
  filter: drop-shadow(0 0 4px var(--neon-glow)) drop-shadow(0 0 14px var(--neon-glow));
  transition: -webkit-text-stroke-color var(--shift-transition), filter var(--shift-transition);
}
:root[data-shift="day"] .neon { -webkit-text-stroke-width: 1.4px; filter: none; opacity: .75; }
:root[data-menu="barista"] .signswitch .neon {
  -webkit-text-stroke-color: var(--success);
  filter: drop-shadow(0 0 4px color-mix(in oklab, var(--success) 55%, transparent))
          drop-shadow(0 0 14px color-mix(in oklab, var(--success) 45%, transparent));
}

/* Window glass — 3-stop sky under a --grade tint, weather layers above, brass mullion on top */
.window {
  position: relative; overflow: hidden; min-height: 260px;
  border: 2px solid var(--border-strong); border-radius: var(--radius-sm);
  background: linear-gradient(180deg, #0B0A12 0%, #171019 52%, #2A1B10 100%);   /* night, sodium at the sill */
  box-shadow: inset 0 0 60px rgba(0,0,0,.6), var(--shadow-2);
  transition: background var(--shift-transition);
}
:root[data-shift="day"] .window { background: linear-gradient(180deg, #BFD9E8 0%, #DCE6EA 55%, #E9EEF0 100%); }
.window__grade { position:absolute; inset:0; z-index:2; pointer-events:none;
  background: var(--grade); transition: background var(--dur-slow) var(--ease-in-out); }
.window__mullion { position:absolute; inset:0; z-index:3; pointer-events:none; opacity:.35;
  background: linear-gradient(90deg, transparent calc(50% - 1px),
    color-mix(in oklab, var(--brass-lo) 70%, transparent) calc(50% - 1px),
    color-mix(in oklab, var(--brass-lo) 70%, transparent) calc(50% + 1px), transparent calc(50% + 1px)); }

/* The counter's leading edge — a 9px perspective lip so the wood has thickness */
.counter { position:relative; border-top: 2px solid var(--border-strong);
  background: linear-gradient(180deg, var(--surface) 0%, color-mix(in oklab, var(--surface), #000 18%) 100%); }
.counter::before { content:''; position:absolute; left:0; right:0; top:-9px; height:9px; opacity:.9;
  background: linear-gradient(180deg, color-mix(in oklab, var(--surface), var(--brass-hi) 22%), var(--surface));
  transform: perspective(320px) rotateX(46deg); transform-origin: bottom center; }
.counter__foot { height:3px; margin-top: var(--space-3); border-radius:2px; background: var(--brass-gradient); opacity:.9; }
```

Shared SVG `<defs>` (inject once, `aria-hidden`, `width=0 height=0`): `brassH` and `brassV` linear gradients with the five brass stops; a `woodG` vertical gradient `#5A3520 → #24140C`; a `globeFallbackSky` radial gradient `#3E2A18 → #0D0704`; and the torn-paper filter:

```html
<filter id="tornEdge" x="-6%" y="-30%" width="112%" height="160%">
  <feTurbulence type="fractalNoise" baseFrequency="0.04 0.7" numOctaves="3" seed="7" result="n"/>
  <feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G"/>
</filter>
```

### 3.7 Typography

Three voices = three characters. **The sign** (Righteous) shouts. **The print** (Space Grotesk) talks. **The machine** (JetBrains Mono) refuses to editorialise.

| Role | Family | Fontsource package | Weights | Where |
|---|---|---|---|---|
| `--font-display` | **Righteous** (OFL) — a Googie/tiki sign letter | `@fontsource/righteous` (static 400, ~24 KB latin) | 400 only | Neon sign, drink name, intensifier stamp, BAR/BARISTA, "THE TAB" plate, empty-state lines. **Never below 20 px.** |
| `--font-body` | **Space Grotesk** (OFL, variable) | `@fontsource-variable/space-grotesk` (~60 KB latin) | 400 body · 500 bartender lines · 600 labels/buttons · 700 small caps | Coaster copy, recipe, settings, tooltips, tab rows |
| `--font-mono` | **JetBrains Mono** (OFL, variable) | `@fontsource-variable/jetbrains-mono` | 400 · 600 | Receipt, dial window, register display, coordinates, local time, attribution, share card |

Budget: one static display file + two variable files, Latin subset, `font-display: swap`, self-hosted. **No fourth face.** Import only the subsets you use:
`import '@fontsource/righteous/latin-400.css'` etc.

Type scale (16 px root): `--text-xs` 12/1.4 (mono attribution, receipt footer, tab metadata) · `--text-sm` 13/1.45 (receipt lines, footnotes, small-caps labels) · `--text-base` 16/1.5 (coaster copy, settings) · `--text-lg` 19/1.45 (bartender judgment lines) · `--text-xl` 22/1.3 (recipe headings, sheet titles) · `--text-2xl` 28/1.1 (inline intensifier, dial window) · `--text-3xl` clamp(2.25rem,5vw,3rem)/1.05 (drink name, mobile) · `--text-4xl` clamp(2.75rem,7vw,4.5rem)/1.0 (drink name desktop, BAR/BARISTA) · `--text-5xl` clamp(3.5rem,9vw,7rem)/0.95 (neon wordmark, share-card headline).

**The bartender's voice without an italic.** Space Grotesk has no italic and Righteous has one weight, so the voice is built from **scale and case**. Judgment lines are Space Grotesk 500 at `--text-lg`; the one or two words the engine marks as the intensifier are set inline in Righteous at **1.6× size, uppercase, `vertical-align: -0.08em`**. The grammar marks them with `«…»`; the renderer replaces the markers with `<em class="intensifier">`. Chaos comes from the type-size jump, not from a variable-axis wobble.

Rules:

- Righteous: `letter-spacing: .02em` at display sizes, `.06em` for the small neon (BARISTA); always uppercase for signs; **Title Case for drink names** ("Dark 'n' Stormy" keeps its apostrophes).
- Small-caps labels: uppercase, 13 px / 700, `letter-spacing: .08em`, `--ink-muted`.
- Body: `letter-spacing: -.005em`, max measure **34em** on paper.
- **Every figure is JetBrains Mono with `font-variant-numeric: tabular-nums`** — temperatures, dew point, wind, UV, AQI, coordinates, times — so nothing jitters when a number rolls. Degrees use the real `°`. **Negatives use U+2212 `−`, never a hyphen.**
- Place names come from Natural Earth's Latin `name` field, so no extra script coverage is required. Non-Latin names (only possible via the optional Nominatim lever) fall back through the stack to `system-ui`.

### 3.8 Spacing, radius, elevation, borders, grid

- **Page inset** 16 px mobile / 32 px desktop; band gutters 24 px; coaster padding 24 px (32 px desktop); receipt padding 12 px 16 px.
- **Radius:** 3 px buttons/plates · 6 px drawer/cards · 14 px bottom-sheet top corners and register · 24 px share card and the desktop coaster · full for the round coaster, pin head and dial. Squares and hairlines everywhere else — the bar is *built*, not blobbed.
- **Elevation:** contact shadows only (`--shadow-1/2/3`). Day multiplies alpha by 0.6 via `--shadow-alpha`. **No glow shadows** except the neon and the coaster's `--drink-glow` ring.
- **Borders:** hairlines 1 px `--border`; structural brass rails 2 px `--border-strong`. **Max one brass line per band** — the rail under the bottles, the meridian ring on the globe, the foot-rail on the counter.
- **Grid:** 1200 px max content width. Desktop bands are 16 % / 52 % / 32 % of viewport height (counter min 260 px). Phone bands are 56 px / ~50 vh / remainder as a sheet. One `--globe-size` variable drives the canvas **and** the SVG cradle so they stay registered.
- Use CSS **container queries** on the bar root (`container-type: inline-size; container-name: bar`) so the phone layout works inside a device frame as well as at a real narrow viewport: `@container bar (max-width: 899px)` and `@container bar (min-width: 900px)`.

### 3.9 Motion language

**Principles.** (1) *Mass and surface* — nothing fades in from nowhere; things slide, drop, tilt, settle and cast a shadow while doing it. (2) *Print, don't type* — text is already on the coaster when it arrives; only the receipt prints line by line, because a receipt does. (3) *Weather moves like weather* — slow, continuous, low-contrast, **on the window only**. (4) *One overshoot per gesture* — the coaster lands with 6 px overshoot; nothing else bounces. (5) *Idle is cheap* — a drifting globe and a ticking display; no particle systems until a click.

Motion presets in `src/motion/springs.ts`: `soft = { stiffness: 220, damping: 26 }` (coaster), `snappy = { stiffness: 420, damping: 34 }` (toggles, sign), `drop = { stiffness: 500, damping: 18 }` (ice cubes). Wrap the app in `<MotionConfig reducedMotion="user">`.

| # | Name | Property, from → to | Duration / easing / stagger |
|---|---|---|---|
| **A1** | **Coaster slide** | `x: 140% → 0`, `rotate: 4° → 0°`, `opacity 0 → 1` over the first 80 ms. On phone: `y: 120% → 0`. | spring `soft` (~620 ms), lands with 6 px overshoot. **Text is already printed.** |
| **A2** | **Pin drop** | `y: −48px → 0`, `scale 1.2 → 1`; shadow `--shadow-2 → --shadow-1` | 260 ms `--ease-out`; ripple ring via globe.gl `ringsData`, radius 0 → 6°, 900 ms, opacity 1 → 0 |
| **A3** | **Fly-to** | `globe.pointOfView({lat, lng, altitude: 1.6}, 1200)` | 1200 ms; auto-rotate off; the DOM cradle stays static |
| **A4** | **Bottle nod** | picked bottle `translateY(-3px) rotate(-7deg) scale(1.06)`; spot-light `opacity 0 → 1`; other bottles `opacity 1 → .6` | 380 ms `cubic-bezier(.34,1.56,.64,1)`; light 240 ms; dim 240 ms |
| **A5** | **Dial swing** | needle `rotate: prev → target` across −120°…+120°; dial window numeral rolls | 600 ms `--ease-out`, exactly one 3° overshoot; numeral via a MotionValue over 600 ms |
| **A6** | **Receipt print** | each line `y: 6px → 0`, `opacity 0 → 1`, 2 px vertical jitter | 60 ms per line, linear stagger; paper-feed sound every 3 lines |
| **A7** | **Coaster flip** | `rotateY 0 → 180°`, `backface-visibility: hidden`, `perspective: 1200px` on the wrapper | 420 ms spring `snappy`; content swap at 50 % |
| **A8** | **Shift change** | every `@property`-registered colour token crossfades; the window sky gradient swaps; the neon powers on/off | 480 ms `--ease-in-out`; neon power-on flicker: `opacity` keyframes `0, 1, .3, 1, .6, 1` over 700 ms with `steps(1,end)`, **once** |
| **A9** | **Ice drop** | 3 SVG cubes `y: −40px → 0`, `rotate ±12° → 0` | spring `drop`, 90 ms stagger, a pitched clink each |
| **A10** | **Frost creep** | four corner radial masks `scale .2 → 1.4`, `opacity 0 → 1` | 1600 ms `--ease-out`, when apparent ≤ −10 °C |
| **A11** | **Lightning frame** | a white window layer `opacity 0 → .9 → .05 → .55 → 0` | 80 ms spike + ~300 ms decay; rumble 400–900 ms later; **never twice within 1 s** |
| **A12** | **Globe flick** | OrbitControls `enableDamping: true`, `dampingFactor: .045`, `rotateSpeed: .55` | a flick spins ~2.5 turns; auto-rotate `autoRotateSpeed = 0.35` starts after 8 s idle and stops on pointer-down |

Scene durations: fly-to 1200 ms · coaster slide ~620 ms · frost creep 1600 ms · condensation bloom 1200 ms · receipt tear 260–420 ms.

**Reduced motion** (`prefers-reduced-motion: reduce` **or** the Back Office `Motion: less` lever — both must produce the identical DOM):

- Globe damping stays (it is user-driven) but auto-rotate is **off**.
- Fly-to becomes a 480 ms opacity cross-fade with an instant camera cut.
- Coaster, bottle and pin use 200 ms `opacity + translateY(8px)` only.
- The receipt appears whole; ice cubes appear in place.
- Window weather is a single static frame (`data-static="true"` on every layer); no frost creep.
- Lightning becomes a static 300 ms brightness step — no flash.
- The neon does not flicker.
- **The dial needle still moves** (600 ms) because it carries information — but without overshoot.

### 3.10 The signature interactions

**3.10.1 The Flick + the Pin.**
1. Pointer-down on the globe stops the idle drift; dragging rotates with heavy bearing damping (A12). A flick above 0.6 rad/s plays the bearing whirr, its `playbackRate` following angular speed (0.8–1.6).
2. Tap → `onGlobeClick({lat, lng})` → the brass pin drops (A2) with a "tink" and the ripple ring spreads; the camera flies (A3).
3. In the ~300 ms before Open-Meteo answers, a **blank** coaster (pressed ring only) slides in (A1) so the bar reacts instantly. The printed coaster then replaces it **in the same DOM node** — no second slide.
*Haptics:* `impact Light` on pointer-down, `impact Medium` on pin drop, `selectionChanged` every 30° while dragging (cradle detents).

**3.10.2 The Slide (the verdict).**
1. The bartender pushes a cream coaster across the mahogany from his side — from the right on desktop, from below on mobile: 4° → 0° rotate, 6 px overshoot, a wooden "shhk".
2. It is already printed: place line, local time + dew point, one weather jab, the drink name in Righteous, the intensifier stamp rotated −4°, a mono receipt strip.
3. Simultaneously the bottle nods (A4) and the dial swings (A5) — **you can see the decision before you read it.**
*Haptics:* `impact Light` on landing.

**3.10.3 The Pour (ice / heat / weather on the glass).**
1. Iced verdicts: three ice cubes drop into the glass drawn on the coaster (A9) with pitched clinks; a condensation ring blooms on the paper over 1.2 s; the window sweats (droplet layer `opacity → 1` over 2.4 s).
2. Hot verdicts: three steam wisps loop over the mug; if apparent ≤ −10 °C, frost creeps from the window corners (A10) and the pane fills with snow.
3. Storm codes: the lightning frame (A11), a rumble 0.4–0.9 s later; `--stamp` goes Campari.
*Haptics:* `impact Heavy` 40 ms on lightning; `notification Warning` when the insult tier is danger.

**3.10.4 The Barista Flip.**
1. The small neon sign in the window reads **BAR** (amber). Tap it: a 240 ms clack, it swings on Y and now reads **BARISTA** in green neon.
2. Spirits dim to 60 %; the tea tin, cocoa, ginger beer and syrups light up; the current coaster re-prints with the mocktail twin — **without re-scoring and without replaying the slide**.
3. Auto-*suggested*, never forced, when the clicked spot's local hour is < 11: a brass tag on the coaster reads "It's 9 a.m. there. I am legally a barista now." with the flip as its action.
4. Persisted (`localStorage` on web, `@capacitor/preferences` on Android). 44×44 target, `role="switch"`, `aria-checked`, accessible name "Alcohol-free menu".
*Haptics:* `selectionChanged`.

**3.10.5 The Tear-off (share).**
1. The register prints a thermal receipt (A6) with the verdict, the stats, a tiny dotted globe with the pin, the local time, and the attribution lines.
2. Pull it down (mobile drag ≥ 56 px) or press the register's TEAR key: the paper rips along the perforation (the `tornEdge` filter, 260 ms) with a "zzzt".
3. It becomes a **1080×1350 PNG** rendered on a canvas (after `document.fonts.load`, capped at a 2 s wait, then draw anyway) — Web Share on mobile, download on desktop, `@capacitor/share` in the APK.
*Haptics:* `impact Medium` on tear.

### 3.11 Window weather layers — exact recipes (CSS/SVG only, never a shader pass)

All layers live inside `.window`, `z-index: 1` (the flash is `z-index: 4`), `pointer-events: none`, `opacity: 0` by default with `.is-on` switching to 1 over `--dur-slow`. **No layer's bounding box may ever intersect the coaster's rect** — this is an automated test.

```css
.wx { position:absolute; inset:0; z-index:1; pointer-events:none; opacity:0;
      transition: opacity var(--dur-slow) var(--ease-in-out); }
.wx.is-on { opacity: 1; }

.wx--drops { background-image:
   radial-gradient(2.5px 3.5px at 12% 22%, rgba(230,255,250,.55), transparent 60%),
   radial-gradient(3px 4px   at 32% 62%, rgba(230,255,250,.45), transparent 60%),
   radial-gradient(2px 3px   at 58% 18%, rgba(230,255,250,.50), transparent 60%),
   radial-gradient(3.5px 5px at 74% 48%, rgba(230,255,250,.42), transparent 60%),
   radial-gradient(2px 3px   at 88% 76%, rgba(230,255,250,.50), transparent 60%),
   radial-gradient(2.5px 3.5px at 46% 86%, rgba(230,255,250,.40), transparent 60%),
   radial-gradient(2px 2.6px at 20% 74%, rgba(230,255,250,.35), transparent 60%),
   radial-gradient(3px 4px   at 66% 88%, rgba(230,255,250,.40), transparent 60%);
  animation: sweat 9s var(--ease-in-out) infinite alternate; }
@keyframes sweat { from { transform: translateY(0) } to { transform: translateY(10px) } }

.wx--rain  { background-image: repeating-linear-gradient(104deg, rgba(200,225,235,.22) 0 1px, transparent 1px 9px);
             background-size:120% 220px; animation: rainfall 620ms linear infinite; }
.wx--rain2 { background-image: repeating-linear-gradient(100deg, rgba(200,225,235,.13) 0 1px, transparent 1px 16px);
             background-size:120% 320px; animation: rainfall 1150ms linear infinite; }
/* the third parallax speed is .wx--rain3 at 1750ms with .08 alpha and a 24px comb */
@keyframes rainfall { from { background-position: 0 0 } to { background-position: -46px 220px } }

.wx--snow { background-image:
   radial-gradient(2px 2px     at 15% 10%, rgba(255,255,255,.90), transparent 60%),
   radial-gradient(2.4px 2.4px at 42% 30%, rgba(255,255,255,.80), transparent 60%),
   radial-gradient(1.8px 1.8px at 68% 12%, rgba(255,255,255,.85), transparent 60%),
   radial-gradient(2.6px 2.6px at 84% 38%, rgba(255,255,255,.75), transparent 60%),
   radial-gradient(2px 2px     at 28% 66%, rgba(255,255,255,.80), transparent 60%),
   radial-gradient(2.2px 2.2px at 58% 78%, rgba(255,255,255,.70), transparent 60%);
  background-size:100% 50%; animation: snowfall 11s linear infinite; }
@keyframes snowfall { from { background-position: 0 -50% } to { background-position: 24px 100% } }

.wx--fog   { background: linear-gradient(180deg, rgba(140,115,85,.42), rgba(140,115,85,.18)); }
.wx--glare { background: radial-gradient(60% 45% at 76% 14%, rgba(255,240,200,.55), transparent 70%); }

.wx--frost { opacity:0; transform: scale(.2); transform-origin: center;
  background-image:
   radial-gradient(closest-side at 0% 0%,     rgba(226,240,250,.80), transparent 70%),
   radial-gradient(closest-side at 100% 0%,   rgba(226,240,250,.75), transparent 70%),
   radial-gradient(closest-side at 0% 100%,   rgba(226,240,250,.70), transparent 70%),
   radial-gradient(closest-side at 100% 100%, rgba(226,240,250,.75), transparent 70%);
  background-size:62% 62%; background-repeat:no-repeat;
  background-position: 0 0, 100% 0, 0 100%, 100% 100%;
  transition: opacity 1600ms var(--ease-out), transform 1600ms var(--ease-out); }
.wx--frost.is-on { opacity:1; transform: scale(1.4); }

.wx--flash { background:#fff; opacity:0; transition:none; z-index:4; }
.wx--flash.is-strike { animation: strike 380ms steps(1,end) 1 both; }
@keyframes strike { 0%{opacity:0} 6%{opacity:.9} 22%{opacity:.05} 30%{opacity:.55} 100%{opacity:0} }
```

Only `transform` and `opacity` animate — everything stays on the compositor. Under reduced motion, every `animation` is `none` and each layer is one static frame.

### 3.12 Iconography and illustration

- **Icons:** Lucide only, 20 px, 1.75 px stroke, `currentColor`, and **only** in the Back Office, the search box and sheet chrome. On the bar itself there are no icons — a bottle, a dial, a sign and a plate *are* the icons.
- **Own SVG illustration (MIT with the repo), 2 px `--brass-lo` stroke, flat dark fill:**
  - 12 bottle silhouettes: rum, gin, whisky, tequila, vodka, vermouth, bitters, syrup, tea tin, cocoa tin, ginger beer, mint sprig. Total inline SVG ≤ 18 KB gzip.
  - 9 glassware line-art shapes: rocks, highball, coupe, mug, copper mug, tiki, flute, pint, teacup — plus ice cube, crushed ice, steam wisp and a garnish set. Filled with the drink's `colour` and drawn with the correct ice type.
  - The aneroid dial: bezel, engraved ring text on a `<textPath>` (`ARCTIC · FREEZING · CHILLY · FAIR · MUGGY · SOUP · SCORCHING`), needle (`transform-origin: 50px 50px`), mono window.
  - The neon tube wordmark and the BAR/BARISTA sign (SVG text set in Righteous; outline the glyphs at build time for the share card).
  - The brass cradle: back ring, front ring with degree ticks, turned-wood base; the brass pin; the foot-rail; the register (bakelite body + brass keys + VFD slot); the coaster pressed-ring mask; the receipt perforation and torn-edge filters; the dotted fallback globe generated from `land-dots.json` at build time.
  - `design/icon.svg` → adaptive icon layers (432×432), maskable 1024, favicon 32/180, splash 2732.
- **Rough.js is not used.** Strokes are clean.
- **Globe textures:** NASA Blue Marble NG monthly composites (public domain, credit "NASA Earth Observatory") at 8192×4096 desktop / 4096×2048 Android as WebP; NASA Black Marble 2016 night lights; `earth-topology.png` bump and `earth-water.png` specular. ≤ 10 MB total, lazy-loaded after first paint.
- **No stock photography anywhere. The only raster in the app is the planet.**

### 3.13 Sound & haptics

Every sound is a bar sound; there are no UI beeps. Audio is silent until the first pointer gesture (autoplay policy); master volume defaults to 0.6 on the brass knob; a Back Office lever mutes everything.

| Event | Sound | Source |
|---|---|---|
| Pin drop / coaster slide / sign flip | brass "tink" / paper-on-wood "shhk" / "clack" | Freesound CC0 filter, or Kenney.nl (CC0) |
| Ice drop ×3 / hot verdict | glass "clink" at `playbackRate` ±4 % / kettle tick + short pour | Freesound CC0 |
| Bottle pick | bottle "clunk" + glass "ting" | Freesound CC0 |
| Receipt print / tear | thermal feed (every 3 lines) / "zzzt" | Freesound CC0 |
| Globe flick | bearing whirr loop, `playbackRate` 0.8–1.6 mapped to angular velocity | Freesound CC0 |
| Neon | 50 Hz buzz at −30 dB, **night shift only**, LFO off under reduced motion | **Web Audio, procedural, zero assets** |
| Rain / wind bed | pink noise → `BiquadFilterNode` lowpass, cutoff 200 Hz calm → 2.4 kHz gale; bursts follow precipitation | **Web Audio, procedural** |
| Thunder | filtered noise burst + 60 Hz sine decay; "distance" via lowpass and a 0.4–0.9 s delay | **Web Audio, procedural** |
| Bar-room hum | −28 dB loop, night side only, ducks 6 dB on Day | Freesound CC0 |

Implementation: one Howler sprite (`public/sounds/bar.ogg` + `bar.json`) for the one-shots, a hand-built Web Audio graph for the beds. Every CC0 file is listed with its Freesound/Kenney id in `public/sounds/ATTRIBUTION.md` **and** `src/data/attribution.json`.

**Haptics map** (Capacitor build; on the web only `navigator.vibrate(12)` on the pin drop): `impact Light` — globe pointer-down, coaster landing. `impact Medium` — pin drop, receipt tear. `impact Heavy` 40 ms — lightning. `selectionChanged` — 30° drag detents, sign flip, levers. `notification Warning` — a danger-tier insult. All haptics respect the Back Office lever **and** the system setting.

### 3.14 Accessibility rules

- **Contrast:** all running text ≥ 4.5:1 against its actual background per §3.4. `--ink-faint` and `--danger`-on-wood are decorative or large-text (≥ 18 px / 600, 3:1) only. Axe runs on every screen in both shifts, and separately inside `.paper`.
- **Focus:** `2px solid var(--focus)` with `2px` offset on **every** interactive element including the globe canvas wrapper. `:focus-visible` only; focus is never removed.
- **Touch targets:** ≥ 44×44 px — bottles (padded hit area), pin, sign, dial, levers, coaster buttons, TEAR key, search rows. Tab rows are 56 px and the whole row is the target.
- **Keyboard:** globe wrapper is `tabindex="0"`, arrow keys rotate 5°, Enter pours at the centre crosshair, `+`/`−` zoom. Tab order: sign → dial → menu → globe → search → where-am-I → register → tab. Escape closes any sheet and returns focus to its opener. No keyboard traps.
- **Screen reader:** the globe is `role="application"` with `aria-label="World globe. Arrow keys rotate, Enter chooses the centre."`; the coaster is `role="article"` with `aria-live="polite"` announcing e.g. *"Verdict for ~12 km from Mumbai: aggressively iced Mojito"* exactly once when it prints; the dial is `role="meter"` with `aria-valuemin="-120" aria-valuemax="120" aria-valuenow` and `aria-valuetext="Feels like 31.5 degrees, tag: soup"`; bottles are buttons named e.g. `Rum — the bartender's pick`; neon signs are `role="switch"` with visible text; the receipt is a `<table>` with `<th scope="row">`; decorative SVGs are `aria-hidden="true"`.
- **Motion:** §3.9 reduced-motion path, plus the Back Office switch. No auto-motion except the 0.18°/frame idle drift, which is off under reduced motion. **Nothing flashes above 3 Hz** — the lightning is one 80 ms frame, never repeated within 1 s.
- **Colour independence:** hot / iced / storm are also carried by the stamp text, the glassware SVG (with an `aria-label` like `highball with crushed ice` / `mug with steam`) and the receipt — never by colour alone.
- **Language:** insults target **weather and choices**, never people and never protected characteristics. A "gentler bartender" lever tones down the danger tier. A deny-list test (`src/wit/lint-denylist.json`) scans every grammar string.
- **Text scaling:** rem-based throughout; the coaster reflows to a single column at 200 % zoom; the bands become scrollable on viewports under 600 px tall.

### 3.15 Android chrome

- **Status bar:** `@capacitor/status-bar` with `overlaysWebView: true`, transparent background, `Style.Dark` (light icons) on the Night shift and `Style.Light` on the Day shift — flipped at runtime whenever `data-shift` changes. The back-bar strip pads by `env(safe-area-inset-top)`, the foot-rail by `env(safe-area-inset-bottom)`.
- **Splash:** background `#1A0F0A` with the brass pin as the only mark — no text. `launchAutoHide: false`; the app calls `SplashScreen.hide()` once the neon sign has painted.
- **Adaptive icon:** foreground = brass pin on a coaster ring; background `#1A0F0A`; monochrome layer = the pin silhouette. Themed-icon colours `#C9962B` on `#1A0F0A`.
- **PWA manifest:** `theme_color` and `background_color` both `#1A0F0A`.
- **WebView background** is set to `#1A0F0A` in `capacitor.config.ts` so there is no white flash before the first paint.

---

## 4. Screens

Routes (hash router): `#/` The Bar · `#/v/:lat,:lng` The Verdict (deep-linkable) · `#/tab` The Tab · `#/office` Back Office · `#/about` Attribution. The recipe flip, the barista flip and the register are **states of The Bar**, not routes.

### 4.1 The Bar (home / idle) — `#/`

**Purpose:** make the object exist before anything is asked of it. The user should want to poke the globe within one second of arrival.

Desktop (≥ 1024 px):

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ▮ ▯ ▮ ▯ ▮ ▯ ▮ ▯ ▮ ▯  ⌈THE GLOBE BAR⌉ (brass plate)   [BAR]neon  (◔ dial)  [≡] │ back-bar 16%
│ ═══════════════════════ brass rail ═════════════════════════════════════════ │
│ ┌────────── window ──────────┐                                               │
│ │  ~ neon: THE GLOBE BAR ~   │        Spin. Tap. Survive.   (brass plate)    │
│ │   (weather on the glass)   │                                               │
│ │        ╭───────╮           │        coaster lane (empty)                   │ window+globe 52%
│ │      ( │ GLOBE │ )  ← brass│        "He has opinions about your            │
│ │        ╰───────╯   cradle  │         humidity."  (Space Grotesk 500)       │
│ └─────────▬▬base▬▬───────────┘                                               │
│ ╱‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾ counter (9px perspective lip) ‾‾‾‾‾‾‾‾‾‾‾‾╲  │
│ │  [🔍 classified-ad search box]  [◎ Where am I]     ┌ REGISTER ┐ [THE TAB]  │ counter 32%
│ │                                                    │ LAST ORDERS IN LISBON│ │
│ ═══════════════════════ brass foot-rail ═════════════╧══════════╧═══════════ │
└──────────────────────────────────────────────────────────────────────────────┘
```

Phone (< 768 px):

```
┌────────────────────────────┐
│▮▯▮▯▮▯▮▯  [BAR]  (◔)   [≡]  │ 56px strip, brass rail under
│┌──── window ─────────────┐ │
││   ~THE GLOBE BAR~ neon  │ │
││       ╭─────╮           │ │ ~50vh
││     ( │GLOBE│ )         │ │
││       ╰─────╯           │ │
││        ▬▬▬▬             │ │
│└─────────────────────────┘ │
│╱‾‾‾‾‾‾‾ counter ‾‾‾‾‾‾‾‾‾╲ │
││  Spin. Tap. Survive.     │ │ sheet peek
││  [🔍 search] [◎ me]      │ │
││  ┌REGISTER: FIRST COFFEE┐│ │
│═════ foot-rail ═════════   │
└────────────────────────────┘
```

**Component tree**

```
<BarShell>                          // three bands, container-name: bar
  <BackBar>                         // band 1
    <Shelf>{12 × <Bottle/>}</Shelf>
    <BrassPlate>THE GLOBE BAR</BrassPlate>
    <NeonSign variant="switch"/>    // BAR ↔ BARISTA, role="switch"
    <WallDial/>                     // role="meter"
    <MenuButton/>                   // opens Back Office
  </BackBar>
  <Mid>                             // band 2 — 2 columns ≥900px, stacked below
    <Window>
      <WindowSky/><WeatherLayers/><WindowGrade/><WindowMullion/><NeonWordmark/>
      <GlobeCradle>                 // brass rings + turned base + canvas | SvgGlobe
        <GlobeCanvas lazy/> | <SvgGlobe/>
        <BrassPin/>
      </GlobeCradle>
    </Window>
    <Lane>                          // the coaster lane
      <EmptyState/> | <Coaster/>
    </Lane>
  </Mid>
  <Counter>                         // band 3
    <Search/><WhereAmI/><Register/><TabButton/>
    <CounterFootRail/>
  </Counter>
  <Drawer route="#/tab"/> <Drawer route="#/office"/> <Scrim/>
</BarShell>
```

**States**

- *empty* — the coaster lane shows "Spin. Tap. Survive." on a small brass plate plus one Space Grotesk line ("He has opinions about your humidity.") and a dashed ghost ring where the coaster will land. The window shows a neutral dusk (nothing asks for location).
- *loading (first paint)* — the DOM bar renders first; **the LCP element is the neon sign + brass plate, never the canvas**. The globe canvas mounts lazily via `requestIdleCallback` with the 245 KB `earth-day.jpg`, then swaps to Blue Marble. While WebGL boots, the cradle holds the flat SVG dotted globe.
- *offline* — search and Where-am-I are disabled with a tooltip; the register prints "NO SIGNAL · SERVING FROM THE TAB"; the neon flickers once; the last verdict is still openable from the Tab.
- *no WebGL* — the dotted SVG globe stays and is still clickable (equirectangular hit-test); the rest of the bar is identical.

**Gestures:** drag/flick the globe; tap the globe; pull the counter sheet up (mobile); tap the dial to open the receipt sheet; long-press the register display to pause the ticker.

**Transitions:** opening the Tab or Back Office slides a drawer (`translateY(100%) → 0` on phone, `translateX(100%) → 0` on desktop, `--dur-slow --ease-out`) and fades in a scrim at 50 % (Night) / an oak scrim (Day) — the scene keeps breathing behind it.

### 4.2 The Verdict (coaster) — `#/v/19.08,72.88`

**Purpose:** deliver the joke and the data in one printed object.

Desktop:

```
│ ▮ ▯ ▮ ▯ ▮ ▯ [▮]← lit, tilted ▯ ▮   ⌈THE GLOBE BAR⌉   [BAR]   (◔ SOUP)   [≡] │
│ ═══════════════════════════════════════════════════════════════════════════ │
│ ┌ window: droplets, sodium night ┐   ┌──────── coaster (paper) ─────────┐   │
│ │  ~THE GLOBE BAR~ (neon on)     │   │ ◯ pressed ring                   │   │
│ │       ╭───────╮                │   │  ~38 km from Mumbai, India       │   │
│ │     ( │  📍   │ ) pin dropped  │   │  02:14 local · dew point 24°     │   │
│ │       ╰───────╯                │   │  "The air is soup. You are not   │   │
│ └────────▬▬▬▬▬▬──────────────────┘   │   sweating, you are marinating." │   │
│                                      │  AGGRESSIVELY ICED  (stamp −4°)  │   │
│ ╱‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾ │  Mojito           (Righteous 4xl)│   │
│ │  ┌ REGISTER ┐                       │  ▢ glass w/ ice · in a bucket    │   │
│ │  │APPARENT 31.5°  DEW 24.4°  W 2  │ │  ┈┈┈ receipt strip (mono) ┈┈┈    │   │
│ │  │UV 0  AQI 55  SUNRISE 4H12M     │ │  FEELS 31.5° · DEW 24.4° · WIND  │   │
│ │  └──── [TEAR] ────┘   [THE TAB]     │  2 KM/H · UV 0 · AQI 55 · 02:14  │   │
│ ═══════════════════════════════════   │  [Flip for recipe]  [Tear off]   │   │
│                                       └──────────────────────────────────┘   │
```

Phone (the coaster is square and lives in the counter sheet):

```
│▮▯[▮]▯▮▯▮▯  [BAR]  (◔)  [≡]│
│┌ window: sweating pane ──┐│
││    ~neon~   ╭────╮      ││ ~50vh
││           ( │ 📍 │ )    ││
││             ╰────╯      ││
│└─────────────────────────┘│
│╱‾‾ counter sheet (drag) ‾╲│
││┌──── coaster ──────────┐││
│││ ~38 km from Mumbai    │││
│││ 02:14 · dew 24°       │││
│││ "The air is soup…"    │││
│││ AGGRESSIVELY ICED     │││
│││ Mojito                │││  ← every control below is ≥44px
│││ ▢ glass · in a bucket │││
│││ FEELS 31.5° DEW 24.4° │││
│││ [Flip] [Tear off]     │││
││└───────────────────────┘││
│═══ foot-rail ═══════════  │
```

**Components:** `Coaster` (skeleton → printed, front/back faces in one `preserve-3d` wrapper), `IntensifierStamp`, `GlasswareSVG`, `ReceiptStrip`, `BaristaTag` (conditional), plus the reactions elsewhere on screen: `DialNeedle`, `BottleNod`, `WindowWeather`, `RegisterReceipt`.

**Coaster markup contract** (classes are asserted by tests):

```
.coaster-wrap  (perspective:1200px, max-width:440px)
  .coaster[.is-flipped]                 // transform: rotateY(180deg)
    .coaster__face.paper                // front
      .coaster__glowring                // box-shadow driven by --drink-glow
      .condensation[.is-on]             // wet ring, blooms over 1.2s
      .coaster__place                   // mono, --ink-muted, --text-sm
      .coaster__meta                    // mono, --text-xs: "02:14 local · dew point 24°"
      .tag-brass                        // optional barista suggestion / "re-poured from memory"
      .coaster__jab                     // Space Grotesk 500, --text-lg, max 34em
      .coaster__stamp                   // Righteous --text-2xl, rotate(-4deg), colour + 2px border = --stamp
      .coaster__drink                   // Righteous --text-3xl (phone) / clamp(2.5rem,6cqw,3.6rem) desktop
      .coaster__serve                   // GlasswareSVG + serve line
      .strip                            // dashed top+bottom, mono --text-xs, tabular figures
      .coaster__actions                 // [Flip for recipe] [Tear off] [Second opinion]
    .coaster__face--back.paper          // rotateY(180deg), absolutely positioned
```

**States**

- *skeleton* — the pressed ring plus three `.skel` bars in `--surface-2`. **No shimmer** — it is paper, not glass.
- *success* — as drawn above.
- *ocean* — the place line reads "You are in the Arabian Sea. There is no bar here."; the receipt strip gains `SST 28.9°` and `WAVES 2.4 M`; the credit line gains `· DWD`; the drink comes from the ocean family.
- *polar* — the local-time line carries the hedge flag (`approximate: true`) and the grammar phrases it loosely; the polar joke closer fires.
- *error* — "The models are not answering. Try again." with a brass RETRY plate; the window is unchanged.
- *rate-limited* — "Bar's busy. Give it a minute." with RETRY disabled and a visible 60 s countdown.
- *stale* — a brass tag "re-poured from memory".
- *suggested-barista* — the brass tag "It's 9 a.m. there. I am legally a barista now." with a flip button.

**Gestures:** tap the coaster (outside controls) → flip; swipe left on mobile → the "second opinion" (next-best drink, no refetch); pull the receipt → tear; tap the dial → the receipt sheet.

**Transition in:** A1 slide + A2 pin + A4 bottle nod + A5 dial swing all start in the same frame. The printed coaster replaces the skeleton **in place** — the same DOM node, no unmount, no second slide.

### 4.3 The Recipe (coaster back face)

```
┌──────── coaster back ─────────┐
│ ◯                             │
│  MOJITO            (Righteous)│
│  ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈   │
│  45 ml  white rum             │  ← mono measures, grotesk ingredients
│  20 ml  lime juice            │
│  6      mint leaves · 2 tsp sugar · top soda │
│  ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈   │
│  1. Muddle mint, sugar, lime. │
│  2. Add rum, crushed ice.     │  ← in-house method text, 3 lines max
│  3. Top with soda. Overfill.  │
│  ▢ highball · crushed ice     │
│  [◎ make it virgin]  IBA·MIT  │
│  [Flip back]                  │
└───────────────────────────────┘
```

**Components:** `RecipeTable` (a `<table>`; first column 74 px, mono, tabular, `--ink-muted`), `GlasswareSVG`, `MethodList` (`<ol>`, ≤ 3 items), `VirginToggle`, `CreditLine`.
**States:** *alcoholic*; *virgin twin* (swaps in place, a green BARISTA stamp appears); *no twin* — "No virgin twin for this one. Have a lime soda and think about it."
**Gestures:** tap anywhere outside the controls → flip back. Keyboard: Enter on the card flips, Escape flips back. The flip is A7 (420 ms).

### 4.4 The Barista Flip — a state of 4.1 / 4.2

`window: [BAR] → clack → [BARISTA] (green neon) · shelf: spirits dim to 60 %, tea/cocoa/ginger/syrup light up · coaster re-prints: "Virgin Mojito. Same insult, no rum."`

**States:** *off* (amber BAR) · *on* (green BARISTA, `--success`) · *suggested* (the brass tag on the coaster). Persisted. `role="switch" aria-checked`, accessible name "Alcohol-free menu", 44×44.

### 4.5 The Register (share receipt) — a state of 4.2

```
┌ REGISTER ─────────────────────────┐
│ ▐ LAST ORDERS IN LISBON · 23:58 ▌ │ ← amber VFD mono ticker, scrolls 26s linear
│ ┌──── receipt (perforated) ─────┐ │
│ │ THE GLOBE BAR                 │ │
│ │ MUMBAI, IN · 19.07N 72.88E    │ │
│ │ 06 SEP 2026 · 00:45 LOCAL     │ │
│ │ ·:·:·:·:·  (dotted globe+pin) │ │
│ │ APPARENT 31.5° · DEW 24.4°    │ │
│ │ WIND 2 KM/H · UV 0 · AQI 55   │ │
│ │ AGGRESSIVELY ICED MOJITO      │ │
│ │ "the air is soup"             │ │
│ │ Weather by Open-Meteo.com     │ │
│ │ CAMS · NASA · Natural Earth   │ │
│ └╌╌╌╌╌╌╌ perforation ╌╌╌╌╌╌╌╌╌╌┘ │
│        [ TEAR ]   (brass key)     │
└───────────────────────────────────┘
```

The receipt prints (A6) when a verdict lands. Every line is **≤ 32 characters** (thermal width) — a property test over all fixtures. On desktop the register sits on the counter; on mobile it is a sheet opened from the dial or the coaster's "Tear off". The VFD is `#0B0703` with a `--brass-lo` border and `--neon` text with an 8 px text-shadow.
**States:** *printing* · *ready* · *torn* (a stub remains: "receipt torn 02:15") · *share failed* (falls back to download plus a toast "Saved to your device").
**Share card:** 1080×1350 PNG on a paper field with a mahogany border and the neon wordmark in Righteous, carrying the same content plus the credit lines.

### 4.6 The Tab (history) — `#/tab`

Desktop: a drawer under the counter (right third, 390 px). Phone: a full sheet (max 88 % height).

```
┌ THE TAB (brass plate) ────────────────────────┐
│ #0007  Mumbai, IN     02:14  Mojito      31.5°│ ← 56px row, whole row is the target
│ #0006  Reykjavík, IS  23:40  Hot Toddy    2.1°│
│ #0005  Arabian Sea    —      Dark 'n' Stormy  │
│ ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ │
│ [Export JSON] [Import] [Clear tab]            │
└───────────────────────────────────────────────┘
```

Row layout is `grid-template-columns: auto 1fr auto` — `.tabrow__id` (mono, `--ink-faint`), `.tabrow__place` + `.tabrow__sub` (mono, `--ink-muted`), `.tabrow__temp` (mono, tabular, `--accent`). Tapping a row re-flies the globe and re-prints from the stored verdict — **no refetch unless the row is older than 15 minutes**, in which case one fetch happens and a small "re-poured" tag appears. Long-press / right-click a row → tear-off PNG.
**States:** *empty* ("No tab yet. Go somewhere." in Righteous `--text-xl`, `--ink-muted`, centred) · *list* · *importing* · *confirm clear* (an inline brass CONFIRM plate — **never a modal**).

### 4.7 The Back Office (settings) — `#/office`

```
┌ BACK OFFICE ──────────────────────────┐
│ Shift    ○ follow the place ○ night ○ day│
│ Units    °C | °F      km/h | mph | kn   │
│ Menu     [BAR/BARISTA] default          │
│ Sound    [lever]  vol ◔ (brass knob)    │
│ Haptics  [lever]   Motion ○ full ○ less │
│ Bartender ○ normal ○ gentler            │
│ Precise names [ ] Nominatim (off)       │
│   "Data © OpenStreetMap contributors"   │
│ AI garnish  ● 0 procedural  ○ 1 keyless │
│   ○ 2 BYO key [paste key] session-only  │
│   "Free hosted tiers may train on your  │
│    prompts."                            │
│ Attribution  Open-Meteo CC BY 4.0, CAMS,│
│   DWD, NASA Earth Observatory, Natural  │
│   Earth, IBA & Open Drinks MIT, fonts   │
│   OFL, sounds CC0 · Offline shell ✓     │
│ Version 0.1.0+abc1234                   │
└─────────────────────────────────────────┘
```

Levers are bar-tap levers (`role="switch"`, 60×32 track with a 24 px brass knuckle that slides 26 px), radio groups are brass segmented controls (`.seg button[aria-checked="true"]` gets the brass gradient and `#1A0F0A` text), and the volume is a brass knob (`role="slider"`, min 0 max 100 step 5, ArrowUp/Right +5, ArrowDown/Left −5, Home/End, value announced). The AI-garnish rungs 1–3 are stretch work: ship rung 0 selected and the others disabled with a note.

### 4.8 About — `#/about`

Renders `src/data/attribution.json` as a table plus the licence text for the app itself. Mono, `--text-xs`, `line-height: 1.7`.

### 4.9 Cross-cutting empty / error / offline / fallback states

- **First visit, no permission:** the window shows a neutral dusk. Nothing asks for location until "Where am I" is tapped.
- **Offline:** the neon flickers once, the register prints "NO SIGNAL · SERVING FROM THE TAB", cached verdicts open, new clicks print the error coaster.
- **WebGL context lost:** the cradle keeps the SVG dotted globe and a brass tag appears on the counter — "The globe's bearings seized. Tap to re-seat." — which remounts the canvas.
- **Bad deep link:** the coaster prints "Nowhere on Earth has those coordinates. Impressive." with a "Back to the bar" plate.
- **Dexie quota / blocked:** the verdict is still shown; the Tab write is skipped with a one-time toast "The Tab is full. Export and clear."
- **Geolocation denied:** a tooltip — "The bar respects your privacy. Spin the globe instead."
- **Toasts** are brass tags on the counter edge, 4 s, one at a time.

### 4.10 Component inventory

| Component | Variants | States |
|---|---|---|
| `NeonSign` | wordmark (5xl), BAR/BARISTA (4xl), caption | off (Day), on, flicker-on, barista (green) |
| `BrassPlate` | caption, button, tag | default, hover (highlight shifts 6 %), pressed (120 ms inset), focus, disabled (`--ink-faint` engraving) |
| `GlobeCradle` | globe.gl canvas, SVG fallback | idle drift, dragging, flying, pinned, context-lost |
| `BrassPin` | — | dropped, hover (coords tooltip), dragging (re-pour on release) |
| `Bottle` | rum, gin, whisky, tequila, vodka, vermouth, bitters, syrup, tea, cocoa, ginger-beer, mint | default, picked (lit, −7°), dimmed, tooltip |
| `WallDial` | full (desktop 124 px), roundel (phone 56 px, ring text hidden) | swinging, settled, unknown (needle at FAIR, window "—") |
| `Window` | sky day/night, 8 weather layers, neon slot | per grade tag; static under reduced motion |
| `Coaster` | round (desktop), square (phone sheet), skeleton, back face | sliding, printed, flipped, error, ocean, polar, suggested-barista, stale |
| `IntensifierStamp` | hot, iced, storm, barista | stamped (−4°) |
| `GlasswareSVG` | rocks, highball, coupe, mug, copper-mug, tiki, flute, pint, teacup | with cubes / crushed ice / steam / garnish |
| `ReceiptStrip` / `Receipt` | inline strip, register sheet, share card | printing, ready, torn, stub |
| `RegisterDisplay` | ticker, status | ticking, paused (long-press), offline |
| `Lever` | bar-tap, small | on/off, focus, disabled |
| `BrassKnob` | volume | dragging, focus (keyboard) |
| `Search` | counter, sheet | empty, typing, results (brass rows), no results ("Never heard of it.") |
| `TabRow` | — | default, hover, active, stale |
| `Sheet` / `Drawer` | counter sheet, register sheet, Back Office, Tab | peek, open, dragging, closed |
| `Tooltip` / `Toast` | brass tag | info, error |

All primitives are shadcn/ui-on-Base-UI restyled through tokens. **None are forked.**

---

## 5. Data model

All types live in `src/engine/types.ts` and are imported everywhere else. `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`.

```ts
// ───────────────────────── geography ─────────────────────────
export interface LatLng { lat: number; lng: number }          // degrees, lng in [-180, 180]

export interface PlaceHit {
  kind: 'land' | 'ocean' | 'ice';
  country?: { name: string; iso2: string; continent: string; subregion: string };
  nearestCity?: { name: string; country: string; iso2: string; distanceKm: number; isCapital: boolean; pop: number };
  water?: { name: string; featurecla: string };               // "Arabian Sea", featurecla "sea" | "ocean" | "gulf" | "bay"
  polar: boolean;                                             // |lat| >= 66.5
  label: string;                                              // "~38 km from Mumbai, India" | "You are in the Arabian Sea"
}

// ────────────── weather (normalised from Open-Meteo) ──────────────
export interface WeatherSnapshot {
  fetchedAt: number;                 // epoch ms, client clock
  cellKey: string;                   // "19,73" — see §6.7
  timezone: string;                  // IANA, from timezone=auto
  utcOffsetSeconds: number;
  current: {
    time: string;                    // LOCAL ISO with no offset, e.g. "2026-09-06T00:45"
    tempC: number; apparentC: number; rh: number; dewPointC: number;
    precipMm: number; rainMm: number; showersMm: number; snowCm: number;
    wmo: number; cloudCover: number; pressureHpa: number;
    windKmh: number; gustKmh: number; windDir: number;
    isDay: boolean;
  };
  hourNow: { uv: number; precipProb: number };                // the hourly row matching current.time's hour
  daily: { sunrise: string; sunset: string; uvMax: number; tMaxC: number; tMinC: number };
  air?: { euAqi: number; usAqi: number; pm25: number; pm10: number; ozone: number; dust: number; uv: number };
  marine?: { waveHeightM: number; sstC: number; windWaveM: number };
}

// ───────────────────────── engine ─────────────────────────
export type Tag =
  | 'scorching' | 'hot' | 'warm' | 'mild' | 'chilly' | 'cold' | 'freezing' | 'arctic'
  | 'muggy' | 'oppressive' | 'bone-dry'
  | 'drizzle' | 'rain' | 'downpour' | 'snow' | 'blizzard' | 'hail' | 'storm' | 'fog'
  | 'still' | 'breezy' | 'gale' | 'uv-extreme' | 'smog' | 'dust'
  | 'dawn' | 'morning' | 'brunch' | 'afternoon' | 'golden' | 'evening' | 'late'
  | 'ocean' | 'polar';

export type TagFamily = 'temp' | 'humidity' | 'precip' | 'wind' | 'uv' | 'air' | 'daypart' | 'place';

export interface TagScore {
  tag: Tag; family: TagFamily;
  intensity: number;   // 0..1, how far into the band the value sits
  weight: number;      // base × (1 + intensity)
}

export interface Features {              // all °C and km/h; derived, unit-tested
  apparentC: number;                     // ALWAYS the API's apparent_temperature when present
  heatIndexC: number | null; humidexC: number | null; windChillC: number | null;
  dewPointC: number; rh: number; beaufort: number;
  uv: number; euAqi: number | null; usAqi: number | null; dust: number | null;
  wmo: number; precipMm: number; precipProb: number; snowCm: number;
  windKmh: number; gustKmh: number; isDay: boolean;
  localHour: number; localMinute: number; localWeekday: number;     // 0 = Sunday
  minutesToSunrise: number; minutesToSunset: number;                // ±Infinity when polar
  polarApproximateTime: boolean;
  place: PlaceHit;
  marine?: { waveHeightM: number; sstC: number };
}

export type Serve = 'frozen' | 'iced' | 'chilled' | 'neat' | 'warm' | 'hot';
export type Base  = 'rum' | 'gin' | 'whisky' | 'tequila' | 'vodka' | 'brandy' | 'wine' | 'beer'
                  | 'amaro' | 'tea' | 'coffee' | 'cocoa' | 'soda' | 'juice' | 'none';
export type Glass = 'rocks' | 'highball' | 'coupe' | 'mug' | 'copper-mug' | 'tiki' | 'flute' | 'pint' | 'teacup';
export type BottleId = 'rum' | 'gin' | 'whisky' | 'tequila' | 'vodka' | 'vermouth'
                     | 'bitters' | 'syrup' | 'tea' | 'cocoa' | 'ginger-beer' | 'mint';

export interface Recipe {
  ingredients: { amount: number | null;
                 unit: 'ml' | 'tsp' | 'dash' | 'leaf' | 'wedge' | 'top' | 'pinch' | '';
                 ingredient: string }[];
  method: string[];                      // ≤ 3 lines, written in-house
  glass: Glass; garnish?: string;
  source: 'iba' | 'opendrinks' | 'house'; sourceLicence: 'MIT' | 'own';
}

export interface Drink {                 // src/data/bar-menu.json entries
  id: string;                            // "mojito"
  name: string;                          // "Mojito" — Title Case; "Dark 'n' Stormy" keeps its apostrophes
  base: Base; alcoholic: boolean; abv: number; serve: Serve; glass: Glass;
  ice: 'cubes' | 'crushed' | 'none';
  colour: string;                        // fill for GlasswareSVG, e.g. "#CFE8D2"
  affinity: Partial<Record<Tag, number>>;// 0..8 per tag
  virginTwin?: string;                   // drink id in the barista menu
  bottle: BottleId;                      // which back-bar bottle nods
  recipe: Recipe;                        // resolved at build by prep-drinks.mjs
}

export interface Verdict {
  id?: number;                           // Dexie autoincrement
  createdAt: number;
  lat: number; lng: number;              // as clicked, 4 dp
  cell: string;                          // cellKey(lat, lng)
  place: PlaceHit;
  timezone: string; localTime: string;   // "02:14"
  shift: 'day' | 'night';
  menu: 'bar' | 'barista';
  features: Features;
  tags: TagScore[];                      // sorted by weight desc
  drivingTag: Tag;                       // by the §6.3 PRIORITY list, not by weight
  thermalTag: Tag | null;                // highest-weight temp/humidity tag → dial label
  dial: 'ARCTIC' | 'FREEZING' | 'CHILLY' | 'FAIR' | 'MUGGY' | 'SOUP' | 'SCORCHING';
  dialAngle: number;                     // index × 40 − 120
  gradeFamily: 'heat' | 'muggy' | 'cold' | 'rain' | 'snow' | 'storm' | 'fog' | 'sodium' | 'none';
  drinkId: string; runnersUp: string[];  // top-3 minus the pick, for the "second opinion"
  stamp: { text: string; tier: 0 | 1 | 2; ink: 'hot' | 'iced' | 'storm' | 'barista' | 'ink' };
  lines: { place: string; time: string; jab: string; drink: string;
           serve: string; closer: string; hedge?: string };
  suggestBarista: boolean;               // localHour < 11 && menu === 'bar' && daypart !== 'late'
  stale?: boolean;                       // served from a cache entry older than 15 min
  seed: string;                          // "19.1|72.9|0|bar"
}

// ───────────────────────── persistence ─────────────────────────
export interface WeatherCacheEntry { key: string; fetchedAt: number; snapshot: WeatherSnapshot }

export interface Settings {
  shift: 'follow' | 'night' | 'day';
  units: { temp: 'C' | 'F'; wind: 'kmh' | 'mph' | 'kn' };
  menuDefault: 'bar' | 'barista';
  sound: boolean; volume: number;        // 0..1
  haptics: boolean;
  motion: 'full' | 'less';
  gentler: boolean;
  nominatim: boolean;
  ai: { rung: 0 | 1 | 2 | 3; provider?: 'gemini' | 'openrouter' | 'groq'; remember: boolean };
}

export interface TickerCity { name: string; tz: string; lat: number; lng: number }
```

**Dexie schema** — `src/state/db.ts`:

```ts
import Dexie, { type Table } from 'dexie';

export class BarDB extends Dexie {
  verdicts!: Table<Verdict, number>;
  weatherCache!: Table<WeatherCacheEntry, string>;
  constructor() {
    super('barometer');
    this.version(1).stores({
      verdicts: '++id, createdAt, cell, drinkId, [lat+lng]',
      weatherCache: 'key, fetchedAt',
    });
  }
}
export const db = new BarDB();
```

Indexes explained: `createdAt` powers the newest-first Tab list; `cell` powers "have I poured here recently"; `drinkId` powers future stats; `[lat+lng]` powers the deep-link lookup. **Migrations:** any change to either table bumps `this.version(N)` with an `upgrade()` that preserves every existing `verdicts` row — The Tab must survive app updates. Never ship an `upgrade()` that drops rows. On boot, prune `weatherCache` to the newest **200** rows.

**Settings** live in Zustand with `persist`, through a storage adapter in `src/platform/prefs.ts` that resolves to `localStorage` on web and `@capacitor/preferences` on Android.

**Export / import format** (Tab backup — the only file the app writes):

```jsonc
{
  "app": "barometer",
  "schema": 1,
  "exportedAt": 1788635700000,
  "verdicts": [ /* Verdict[] verbatim, ids included but re-assigned on import */ ]
}
```

Import validates with a ~30-line hand-written guard: `app === "barometer"` (else throw `WrongTabError`), `schema <= 1`, `verdicts` is an array, and each row has finite `lat`/`lng` in range, a string `drinkId`, a numeric `createdAt`. **Unknown fields are ignored, never rejected.** `createdAt` is preserved; `id` is re-assigned. The download filename is `globe-bar-tab.json`.

---

## 6. Engine & algorithms

Everything in `src/engine/**` is **pure**: no `fetch`, no `Date.now()` (the caller passes `now`), no DOM, no React, no imports from `src/features`. This is what makes it 100 % testable and what makes GOAL's determinism criterion achievable. Budget: `judge()` runs in **≤ 5 ms**; `locate()` in **≤ 20 ms** warm.

### 6.1 Comfort formulas — `engine/comfort.ts`

```ts
export const cToF = (c: number) => c * 9 / 5 + 32;
export const fToC = (f: number) => (f - 32) * 5 / 9;
export const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** NWS / Rothfusz heat index. Returns { hiC, hiF, applies, adjustment }.
 *  When the simple formula is < 80 °F the index does not apply and the simple value is returned. */
export function heatIndex(tempC: number, rh: number) {
  const T = cToF(tempC);
  const simple = 0.5 * (T + 61 + 1.2 * (T - 68) + 0.094 * rh);
  if (simple < 80) return { hiF: simple, hiC: fToC(simple), applies: false, adjustment: 0 };
  let HI = -42.379 + 2.04901523 * T + 10.14333127 * rh - 0.22475541 * T * rh
    - 0.00683783 * T * T - 0.05481717 * rh * rh + 0.00122874 * T * T * rh
    + 0.00085282 * T * rh * rh - 0.00000199 * T * T * rh * rh;
  let adjustment = 0;
  if (rh < 13 && T >= 80 && T <= 112) {
    adjustment = -((13 - rh) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
  } else if (rh > 85 && T >= 80 && T <= 87) {
    adjustment = ((rh - 85) / 10) * ((87 - T) / 5);
  }
  HI += adjustment;
  return { hiF: HI, hiC: fToC(HI), applies: true, adjustment };
}

/** Canadian humidex from air temperature and dew point (°C). */
export function humidex(tempC: number, dewC: number) {
  const e = 6.11 * Math.exp(5417.753 * (1 / 273.16 - 1 / (273.15 + dewC)));
  return tempC + 0.5555 * (e - 10);
}

/** JAG/TI 2001 wind chill. null when T > 10 °C or v <= 4.8 km/h. */
export function windChill(tempC: number, windKmh: number): number | null {
  if (tempC > 10 || windKmh <= 4.8) return null;
  const v = Math.pow(windKmh, 0.16);
  return 13.12 + 0.6215 * tempC - 11.37 * v + 0.3965 * tempC * v;
}

/** Magnus dew point — used only when the API omits dew_point_2m. */
export function dewPoint(tempC: number, rh: number): number | null {
  if (rh <= 0) return null;                       // ln(0) guard
  if (rh >= 100) return tempC;
  const g = Math.log(rh / 100) + (17.62 * tempC) / (243.12 + tempC);
  return (243.12 * g) / (17.62 - g);
}

export function beaufort(kmh: number): number {   // 0..12
  const t = [1, 5, 11, 19, 28, 38, 49, 61, 74, 88, 102, 117];
  const i = t.findIndex(u => kmh <= u);
  return i === -1 ? 12 : i;
}

export const uvBand = (uv: number) =>
  uv < 3 ? 'low' : uv < 6 ? 'moderate' : uv < 8 ? 'high' : uv < 11 ? 'very-high' : 'extreme';

export const euAqiBand = (a: number | null) =>
  a === null ? 'unknown'
  : a <= 20 ? 'good' : a <= 40 ? 'fair' : a <= 60 ? 'moderate'
  : a <= 80 ? 'poor' : a <= 100 ? 'very-poor' : 'extremely-poor';
```

**The display rule that everything hangs on:** *the coaster, the dial and the receipt always show the API's `apparent_temperature`.* The engine's own heat index / humidex / wind chill exist for **labels, tags and marine/edge cases only**. The Mumbai case proves why: at 25.4 °C / 94 % RH the NWS heat index does **not** apply (simple formula = 79.6 < 80) and would read 26.5 °C, while Open-Meteo's `apparent_temperature` is 31.5 °C. Show 31.5. A test asserts that ordering.

**Golden values (assert these to ±0.1, they are not comments):**

| Function | Input | Output |
|---|---|---|
| `heatIndex` | (25.4, 94) | `applies: false`, hiF 79.6, hiC 26.5 |
| `heatIndex` | (32.2, 70) | hiF 105.8, hiC 41.0, no adjustment |
| `heatIndex` | (40.0, 20) | hiF 102.9, hiC 39.4 |
| `heatIndex` | (35.0, 10) | hiF 89.4, hiC 31.9, low-RH adjustment −0.75 |
| `heatIndex` | (29.4, 90) | hiF 101.5, hiC 38.6, high-RH adjustment +0.21 |
| `heatIndex` | (38.0, 60) | hiF 130.9, hiC 55.0 |
| `heatIndex` | (26.7, 50) | hiF 80.9, hiC 27.1 (boundary, applies) |
| `humidex` | (30, 25) · (25.4, 24.4) · (35, 28) · (20, 10) · (40, 5) | 42.3 · **37.1** · 50.9 · 21.3 · 39.3 |
| `windChill` | (−41, 5.5) | **−48.7** ← the Yakutsk verdict |
| `windChill` | (−45, 8) · (−40, 5) · (4, 30) · (6, 21) · (−20, 40) · (0, 15) · (−10, 10) | −55.6 · −47.0 · −1.3 · **2.2** · −34.1 · −4.4 · −15.3 |
| `windChill` | (10.1, 20) · (5, 4) · (5, 4.9) · (10, 5) | `null` · `null` · 4.1 · 9.8 |
| `dewPoint` | (25.4, 94) | **24.4** (matches the API's `dew_point_2m`) |
| `dewPoint` | (35, 20) · (0, 100) · (30, 50) · (40, 10) · (−10, 80) | 8.7 · 0.0 · 18.4 · 2.6 · −12.8 |
| `beaufort` | 0.5 · 1.9 · 8 · 15 · 24 · 33 · 45 · 55 · 70 · 80 · 95 · 110 · 118 · 200 | 0·1·2·3·4·5·6·7·8·9·10·11·12·12 |
| `uvBand` | 0 · 2.9 · 3 · 5.9 · 6 · 7.9 · 8 · 10.9 · 11 · 14 | low·low·moderate·moderate·high·high·very-high·very-high·extreme·extreme |
| `euAqiBand` | 0 · 19.9 · 20 · 34 · 40 · 60 · 80 · 100.1 · null | good·good·fair·fair·moderate·poor·very-poor·extremely-poor·unknown |

Edge cases that must not throw: `humidex(20, 25)` (dew above temp — return a number ≥ t and set `suspicious: true`); `dewPoint(t, 0)` → `null`; an unknown WMO code → `'unknown'`.

### 6.2 WMO weather codes — `engine/wmo.ts`

`0` clear · `1/2/3` cloudy · `45/48` fog · `51/53/55` drizzle · `56/57` freezing-drizzle · `61/63` rain · `65` downpour · `66/67` freezing-rain · `71/73` snow · `75` heavy-snow · `77` snow-grains · `80/81` showers · `82` downpour · `85` snow-showers · `86` heavy-snow-showers · `95` storm · `96/99` hail · **anything else → `'unknown'`, never a throw.**

### 6.3 Features → tags — `engine/tags.ts` (the contract)

One tag per family, except that `hail` may sit alongside another precipitation tag and `blizzard` *replaces* `snow`. `intensity` is how far into the band the value sits, clamped to 0..1. **`weight = base × (1 + intensity)`.** The array is sorted by `weight` descending.

Evaluate temperature top-down on the **API `apparent_temperature`** (falling back to the engine's wind chill or heat index only if the API omits it):

| Family | Tag | Condition (A = apparent °C, Td = dew point °C, v = wind km/h, g = gusts km/h) | Intensity | Base |
|---|---|---|---|---|
| temp | `scorching` | A ≥ 38 | (A − 38) / 8 | 1.3 |
| temp | `hot` | 28 < A < 38 | (A − 28) / 10 | 1.0 |
| temp | `warm` | 22 < A ≤ 28 | (A − 22) / 6 | 0.5 |
| temp | `mild` | 10 < A ≤ 22 | 0 | 0.3 |
| temp | `chilly` | 0 < A ≤ 10 | (10 − A) / 10 | 0.6 |
| temp | `cold` | −10 < A ≤ 0 | (0 − A) / 10 | 1.0 |
| temp | `freezing` | −25 < A ≤ −10 | (−10 − A) / 15 | 1.2 |
| temp | `arctic` | A ≤ −25 | (−25 − A) / 25 | 1.4 |
| humidity | `oppressive` | Td ≥ 24 | (Td − 24) / 4 | 1.3 |
| humidity | `muggy` | 18 ≤ Td < 24 | (Td − 18) / 6 | 1.0 |
| humidity | `bone-dry` | Td < 5 **and** RH < 25 | (25 − RH) / 25 | 0.6 |
| precip | `drizzle` | wmo ∈ {51, 53, 55, 56, 57} | .3 / .5 / .7 / .5 / .7 | 0.6 |
| precip | `rain` | wmo ∈ {61, 63, 66, 67, 80, 81} | .4 / .6 / .5 / .7 / .4 / .6 | 0.8 |
| precip | `downpour` | wmo ∈ {65, 82} | .8 / 1 | 1.0 |
| precip | `snow` | wmo ∈ {71, 73, 77, 85} **and** v < 39 | .3 / .6 / .3 / .5 | 0.9 |
| precip | `blizzard` | wmo ∈ {75, 86}, **or** any snow code with v ≥ 39 | 1 | 1.3 |
| precip | `fog` | wmo ∈ {45, 48} | .5 / .7 | 0.7 |
| precip | `storm` | wmo = 95 | .8 | 1.4 |
| precip | `hail` | wmo ∈ {96, 99} | .8 / 1 | 1.2 |
| wind | `still` | v < 6 | 0 | 0.2 |
| wind | `breezy` | 20 ≤ v < 39 | (v − 20) / 19 | 0.4 |
| wind | `gale` | v ≥ 62 **or** g ≥ 60 | clamp01((v − 62) / 40 + (g ≥ 60 ? 0.2 : 0)) | 1.0 |
| uv | `uv-extreme` | uv ≥ 8 **and** isDay | (uv − 8) / 4 | 0.7 |
| air | `smog` | EU AQI ≥ 60 | (aqi − 60) / 40 | 0.8 |
| air | `dust` | dust ≥ 100 µg/m³ | (dust − 100) / 200 | 1.0 |
| daypart | exactly one of `dawn`/`morning`/`brunch`/`afternoon`/`golden`/`evening`/`late` | §6.4 | `late`: 1 − \|minutes from 01:30\| / 150; others 0 | 0.4 (`brunch` and `late`: 0.6) |
| place | `ocean` | `place.kind === 'ocean'` | 0 | 1.5 |
| place | `polar` | \|lat\| ≥ 66.5 | 0 | 1.2 |

Notes that matter: `39 ≤ v < 62` with gusts under 60 produces **no** wind tag — that gap is deliberate. `hail` does **not** also emit `storm`. `bone-dry` needs **both** halves of its condition.

```ts
export function extractTags(f: Features): TagScore[] {
  const out: TagScore[] = [];
  const add = (tag: Tag, family: TagFamily, intensity: number, base: number) => {
    const i = clamp01(intensity);
    out.push({ tag, family, intensity: i, weight: base * (1 + i) });
  };
  const A = f.apparentC, Td = f.dewPointC, v = f.windKmh, g = f.gustKmh;

  if      (A >= 38) add('scorching', 'temp', (A - 38) / 8,  1.3);
  else if (A >  28) add('hot',       'temp', (A - 28) / 10, 1.0);
  else if (A >  22) add('warm',      'temp', (A - 22) / 6,  0.5);
  else if (A >  10) add('mild',      'temp', 0,             0.3);
  else if (A >   0) add('chilly',    'temp', (10 - A) / 10, 0.6);
  else if (A > -10) add('cold',      'temp', (0 - A) / 10,  1.0);
  else if (A > -25) add('freezing',  'temp', (-10 - A) / 15, 1.2);
  else              add('arctic',    'temp', (-25 - A) / 25, 1.4);

  if      (Td >= 24) add('oppressive', 'humidity', (Td - 24) / 4, 1.3);
  else if (Td >= 18) add('muggy',      'humidity', (Td - 18) / 6, 1.0);
  else if (Td < 5 && f.rh < 25) add('bone-dry', 'humidity', (25 - f.rh) / 25, 0.6);

  /* …precip / wind / uv / air per the table…  */

  add(dayPart(f), 'daypart', dayPartIntensity(f), dayPartBase(dayPart(f)));
  if (f.place.kind === 'ocean') add('ocean', 'place', 0, 1.5);
  if (f.place.polar)            add('polar', 'place', 0, 1.2);

  return out.sort((a, b) => b.weight - a.weight);
}
```

**Driving tag** — the tag that sets the dial grade, the stamp family and the window tint. It is **not** `tags[0]`; it is the first match in this priority list (C6):

```
hail, storm, arctic, scorching, blizzard, oppressive, downpour, freezing, dust, smog,
uv-extreme, gale, snow, hot, muggy, rain, cold, fog, drizzle, chilly, bone-dry,
breezy, warm, mild, still, ocean, polar, <the day-part tag>
```

`ocean` and `polar` sit near the bottom on purpose: the ocean never drives the dial — the coaster copy handles it.

**Grade family** from the driving tag: `scorching|hot|uv-extreme → heat` · `muggy|oppressive → muggy` · `chilly|cold|freezing|arctic → cold` · `rain|drizzle|downpour → rain` · `snow|blizzard → snow` · `storm|hail|gale → storm` · `fog|smog|dust → fog` · `late|evening → sodium` · anything else → `none`. §3.5 turns the family into `--grade`, `--stamp` and `--drink-glow`.

**Expected tag sets per fixture** (order irrelevant; driving tag in bold):

| Fixture | Tags | Dial | Shift |
|---|---|---|---|
| `mumbai` | **oppressive**, hot, still, drizzle, late | SOUP | night |
| `yakutsk` | **arctic**, snow, still, late | ARCTIC | night |
| `reykjavik` | chilly, **rain**, breezy, afternoon | CHILLY | day |
| `dubai-noon` | **scorching**, uv-extreme, smog, dust, afternoon | SCORCHING | day |
| `arabian-sea` | **oppressive**, hot, breezy, ocean, late | SOUP | night |
| `south-pole` | **arctic**, polar, morning (clock only) | ARCTIC | night |
| `denver-hail` | **hail**, warm, **gale** (C7 — gusts 78 ≥ 60), afternoon | FAIR | day |
| `lisbon-golden` | warm, **golden** | FAIR | day |
| `oslo-brunch` | mild, **brunch** | FAIR | day |

Boundary assertions to write: A `−25` → arctic and `−24.9` → freezing; `38` → scorching and `37.9` → hot; `28` → warm and `28.1` → hot; Td `24` → oppressive, `23.9` → muggy, `17.9` → neither; v `62` → gale, `61.9` with g `60` → gale, g `59.9` → not gale; uv `8` → uv-extreme, `7.9` → not; AQI `60` → smog; dust `100` → dust; WMO 73 with v 39 → `blizzard` (not `snow`), with v 38.9 → `snow`; (Td 2, RH 20) → `bone-dry`, (Td 2, RH 30) → not. Priority: {hot, storm, oppressive} → `storm`; {oppressive, hot} → `oppressive`; {mild, still, evening} → `mild`; {ocean, mild, late} → `mild`. Exactly one day-part tag exists for every fixture.

### 6.4 Local time, day-part and the dial — `engine/daypart.ts`, `engine/dial.ts`

```ts
export function localClock(now: Date, tz: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short',
  }).formatToParts(now);
  const get = (t: string) => parts.find(p => p.type === t)!.value;
  return {
    hour: +get('hour'), minute: +get('minute'),
    weekday: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(get('weekday')),
    label: `${get('hour')}:${get('minute')}`,
  };
}
```

**The engine never reads the browser's timezone.** It always formats with the `timezone` string that came back from the API. A test proves this by running the identical fixture under `TZ=UTC` and asserting an identical result.

Day-part ladder (evaluate in this exact order — the first match wins):

1. **Polar with no sunrise/sunset row** → clock only: `23:00–03:59` → `late`; `04:00–09:59` → `morning`; `10:00–17:59` → `afternoon`; else `evening`. Set `polarApproximateTime = true` (polar timezones from `timezone=auto` are valid IANA names but arbitrary guesses — the copy hedges).
2. `m ≥ 23:00` or `m < 04:00` → **`late`**.
3. `|now − sunrise| ≤ 45 min` → **`dawn`**.
4. `goldenHourStart ≤ now ≤ sunset` (from `suncalc.getTimes(now, lat, lng).goldenHour`) → **`golden`**.
5. `now > sunset` → **`evening`**.
6. `m < 10:00` → **`morning`**.
7. weekend (localWeekday 0 or 6) **and** `m < 13:00` → **`brunch`**.
8. otherwise → **`afternoon`**.

`minutesToSunrise` / `minutesToSunset` come from the `daily.sunrise` / `daily.sunset` local ISO strings minus `current.time` (both local, no offset arithmetic needed); when the strings are empty they are `±Infinity`. The API's `is_day` is authoritative for the **shift**; sunrise/sunset only refine the day-part.
`suggestBarista = localHour < 11 && menu === 'bar' && dayPart !== 'late'` — at 00:45 the bartender does not offer you a coffee, he makes a remark about the hour.
Also expose `sunsetIn` as a formatted `"5h42m"` / `"23m"` string and `sunsetSoon = minutesToSunset > 0 && minutesToSunset <= 45` (which unlocks the "drink faster" copy hook).

Fixture expectations: `mumbai` 00:45 → `late`, weekday Sunday · `yakutsk` 03:10 → `late` (and `03:59` → `late`, `04:00` → `morning` unless inside the dawn window) · `reykjavik` 14:30 sunset 20:12 → `afternoon`, `sunsetIn === '5h42m'` · `lisbon-golden` 19:35 sunset 19:58 → `golden`, `sunsetIn === '23m'`, `sunsetSoon === true` · `oslo-brunch` 10:40 Sunday → `brunch`, but the same clock on Monday → `afternoon` · `dubai-noon` 12:30 Monday → `afternoon` · `south-pole` 07:15 → `morning` with `polarApproximateTime === true` · sunrise 06:22 with local 05:40 → `dawn`, 07:06 → `dawn`, 07:08 → `morning`.

**The dial.** The needle reports the **thermal tag** — the highest-weight tag in the `temp` + `humidity` families — because the dial is a thermometer, while the *stamp* is the judgment. That is why a hailstorm at 27.6 °C leaves the needle at FAIR.

```ts
const RING = ['ARCTIC','FREEZING','CHILLY','FAIR','MUGGY','SOUP','SCORCHING'] as const;
const DIAL: Record<string, typeof RING[number]> = {
  arctic:'ARCTIC', freezing:'FREEZING', cold:'FREEZING', chilly:'CHILLY',
  mild:'FAIR', warm:'FAIR', 'bone-dry':'FAIR',
  muggy:'MUGGY', oppressive:'SOUP', hot:'SCORCHING', scorching:'SCORCHING',
};
export function dial(thermalTag: Tag | null, apparentC: number | null) {
  const label = (thermalTag && DIAL[thermalTag]) ?? 'FAIR';
  const angle = RING.indexOf(label) * 40 - 120;               // −120 … +120
  const window = apparentC === null ? '—' : fmtTemp(apparentC);
  return { label, angle, window,
    valuetext: apparentC === null ? 'No reading'
      : `Feels like ${apparentC.toFixed(1)} degrees, tag: ${label.toLowerCase()}` };
}
```

Ring positions: ARCTIC −120 · FREEZING −80 · CHILLY −40 · FAIR 0 · MUGGY +40 · SOUP +80 · SCORCHING +120. `mumbai` → `{ label:'SOUP', angle:80, window:'31.5°', valuetext:'Feels like 31.5 degrees, tag: soup' }`. No data → `{ label:'FAIR', angle:0, window:'—' }`.

### 6.5 Drink scoring and the pick — `engine/score.ts`, `engine/pick.ts`

```ts
const WARM_SIDE: Tag[] = ['hot', 'scorching', 'muggy', 'oppressive'];
const COLD_SIDE: Tag[] = ['cold', 'freezing', 'arctic'];
const SERVE_BONUS: Record<'warm' | 'cold' | 'chilly', Record<Serve, number>> = {
  warm:   { frozen:  3, iced:  2, chilled:  1, neat: 0, warm: -2, hot: -3 },
  cold:   { frozen: -4, iced: -3, chilled: -1, neat: 1, warm:  2, hot:  2 },
  chilly: { frozen: -2, iced: -1, chilled:  0, neat: 1, warm:  1, hot:  1 },
};

export function scoreDrinks(
  tags: TagScore[], menu: Drink[], opts: { lastDrinkId?: string },
): { drink: Drink; score: number }[] {
  const has = (t: Tag) => tags.some(s => s.tag === t);
  return menu.map(drink => {
    let s = 0;
    for (const t of tags) s += (drink.affinity[t.tag] ?? 0) * t.weight;
    if (WARM_SIDE.some(has)) s += SERVE_BONUS.warm[drink.serve];
    if (COLD_SIDE.some(has)) s += SERVE_BONUS.cold[drink.serve];
    if (has('chilly'))       s += SERVE_BONUS.chilly[drink.serve];
    if (opts.lastDrinkId === drink.id) s -= 2;      // session-scoped repeat penalty
    return { drink, score: s };
  }).sort((a, b) => b.score - a.score);
}
```

`menu` is pre-filtered: **BAR** = `alcoholic === true`, **BARISTA** = `alcoholic === false`. Every cocktail names a `virginTwin`, so the barista flip re-prints without re-scoring.

```ts
import seedrandom from 'seedrandom';

export const seedFor = (lat: number, lng: number, localHour: number, menu: 'bar' | 'barista') =>
  `${lat.toFixed(1)}|${lng.toFixed(1)}|${localHour}|${menu}`;

export function pick(
  ranked: { drink: Drink; score: number }[], seed: string, tags: TagScore[],
): { pick: Drink; runnersUp: Drink[] } {
  let top = ranked.slice(0, 3).filter(r => r.score > 0);       // never draw a negative-score drink
  if (top.length === 0) top = ranked.slice(0, 1);
  const [first, second] = top;                                 // locals: noUncheckedIndexedAccess
  if (!first) throw new Error('pick(): empty menu');

  // Ocean rule: an ocean click must be able to reach a marine drink.
  if (tags.some(t => t.tag === 'ocean')) {
    const marine = ranked.find(r => (r.drink.affinity.ocean ?? 0) >= 5);
    if (marine) {
      if (!top.includes(marine)) top = [marine, ...top].slice(0, 3);
      return { pick: marine.drink, runnersUp: top.filter(r => r !== marine).map(r => r.drink) };
    }
  }

  const dominant = second === undefined || first.score - second.score >= 4;
  let idx = 0;
  if (!dominant) {
    const r = seedrandom(seed)();
    idx = r < 0.85 ? 0 : r < 0.96 ? 1 : 2;                     // 85 / 11 / 4 %
    if (idx >= top.length) idx = top.length - 1;
  }
  const chosen = top[idx] ?? first;
  return { pick: chosen.drink, runnersUp: top.filter(t => t !== chosen).map(t => t.drink) };
}
```

**Worked example A — Mumbai, BAR menu.** Tags: `oppressive` 1.43, `hot` 1.35, `late` 1.02, `drizzle` 0.78, `still` 0.20. (Both worked tables below show a **selection** of the 20 bar drinks — the three that make the top three plus three more that show the serve bonus at work. The full ranking over the §6.11 menu is snapshot-pinned; `scripts/check-menu.mjs` re-derives it and asserts the top three and the margin quoted here.)

| Drink | serve | Σ affinity × weight | serve bonus | **score** |
|---|---|---|---|---|
| Mojito | iced | 4·1.43 + 3·1.35 + 1·1.02 = 10.79 | +2 | **12.79** |
| Caipirinha | iced | 3·1.35 + 3·1.43 + 1·0.20 = 8.54 | +2 | 10.54 |
| Espresso Martini | chilled | 4·1.02 + 1·1.35 = 5.43 | +1 | 6.43 |
| Moscow Mule | iced | 3·1.35 = 4.05 | +2 | 6.05 |
| Dark 'n' Stormy | iced | 1·1.35 = 1.35 | +2 | 3.35 |
| Hot Toddy | hot | 2·0.78 = 1.56 | −3 | −1.44 |

Margin 12.79 − 10.54 = 2.25 < 4 ⇒ a seeded roll among Mojito / Caipirinha / Espresso Martini with seed `19.1|72.9|0|bar`. The draw is **85 / 11 / 4**, so Mojito wins exactly 85 % of seeds; the negative-score drinks are never drawn. The pinned seed is not a hope: `seedrandom('19.1|72.9|0|bar')()` returns **0.320658…**, which is < 0.85, so `idx === 0` and **Mumbai deterministically prints the Mojito** — that is what makes DoD item 2 a fact rather than a probability. (Companion values, same generator: `19.1|72.9|0|barista` → 0.065045 ⇒ Virgin Mojito; `19.1|72.9|0|voice` → 0.993421.) Day-1 verification D1-19 re-runs these three against the real `seedrandom@3` package and corrects this paragraph if the package's ARC4 output differs by so much as a digit; if a future affinity edit ever pushes the roll into the 15 % tail, raise Mojito's `late` affinity from 1 to 2 (margin 12.79 + 1.02 − 10.54 = 3.27) or its `oppressive` from 4 to 5 (margin 3.68) rather than re-tuning the split.

**Worked example B — Yakutsk, BAR menu.** Tags: `arctic` 2.73, `snow` 1.17, `late` 0.80, `still` 0.20.

| Drink | serve | Σ affinity × weight | serve bonus | **score** |
|---|---|---|---|---|
| Hot Buttered Rum | hot | 5·2.73 + 3·1.17 + 1·0.80 = 17.95 | +2 | **19.95** |
| Mulled Wine | hot | 3·2.73 + 3·1.17 = 11.69 | +2 | 13.69 |
| Hot Toddy | hot | 2·2.73 + 2·1.17 = 7.80 | +2 | 9.80 |
| Mojito | iced | 0 | −3 | −3.00 |

Margin 6.26 ≥ 4 ⇒ **dominant, no roll** — Yakutsk always prints Hot Buttered Rum, which satisfies "the Yakutsk fixture prints a hot dark-rum drink".

**Determinism properties to test:** the same seed twice gives the same pick; 19.07 and 19.08 share a seed (`19.1`) and therefore a pick; 19.14 and 19.16 differ (`19.1` vs `19.2`); neighbouring clicks 0.5° apart do not print two identical coasters in a row when the top scores are within 5 points. All `pick()` outputs across the nine fixtures × {bar, barista} are committed as Vitest snapshots after the first green run — **pin, then guard**: changing a `bar-menu.json` affinity must update the snapshot deliberately.

### 6.6 The intensifier stamp — `engine/intensify.ts`

```ts
const COLD_INTEN: Tag[] = ['chilly', 'cold', 'freezing', 'arctic'];
const inten = (tags: TagScore[], ...names: Tag[]) =>
  Math.max(0, ...tags.filter(t => names.includes(t.tag)).map(t => t.intensity));
const has = (tags: TagScore[], t: Tag) => tags.some(s => s.tag === t);

export function stampFor(
  tags: TagScore[], drink: Drink, menu: 'bar' | 'barista', gentler: boolean,
): Verdict['stamp'] {
  const stormy = has(tags, 'storm') || has(tags, 'hail');
  const coldServe = drink.serve === 'hot' || drink.serve === 'warm' || drink.serve === 'neat';

  const score = coldServe
    ? inten(tags, ...COLD_INTEN)
        + (has(tags, 'arctic') ? 0.5 : 0)
        + (has(tags, 'gale') ? 0.3 : 0)
    : inten(tags, 'hot', 'scorching')
        + inten(tags, 'muggy', 'oppressive')
        + (has(tags, 'oppressive') ? 0.5 : 0)
        + (has(tags, 'scorching') ? 0.5 : 0);

  let tier: 0 | 1 | 2 = score < 0.5 ? 0 : score < 1.2 ? 1 : 2;
  const family = stormy ? 'storm' : coldServe ? 'hot' : 'iced';
  if (stormy) tier = 2;                        // a storm is never understated…
  if (gentler && tier === 2) tier = 1;         // …unless the gentler lever is on
  const key = family === 'storm' ? 'storm' : drink.serve;
  return { text: INTENSIFIERS[family][key][tier], tier, ink: menu === 'barista' ? 'barista' : family };
}
```

`src/wit/grammar/intensifiers.json` — **the single source for every stamp string** (C12):

```jsonc
{
  "iced": {
    "frozen":  ["FROZEN", "FROZEN SOLID", "A SLUSHIE. YOU EARNED IT."],
    "iced":    ["ICED", "AGGRESSIVELY ICED", "SERVED IN A BUCKET"],
    "chilled": ["CHILLED", "PROPERLY COLD", "STRAIGHT FROM THE ICE WELL"]
  },
  "hot": {
    "neat": ["NEAT", "NEAT, DOUBLE", "THE BOTTLE. KEEP IT."],
    "warm": ["WARM", "WARM, NO ARGUMENTS", "BOTH HANDS. NOW."],
    "hot":  ["HOT", "HOT, NO ARGUMENTS", "SCALDING. DO NOT GO OUTSIDE."]
  },
  "storm": { "storm": ["INDOORS", "INDOORS. NOW.", "DO NOT GO OUTSIDE."] }
}
```

Worked: **Mumbai** — Mojito (iced), 0.35 + 0.10 + 0.5 = 0.95 → tier 1 → **AGGRESSIVELY ICED**. **Yakutsk** — Hot Buttered Rum (hot), 0.948 + 0.5 = 1.448 → tier 2 → **SCALDING. DO NOT GO OUTSIDE.** **Reykjavík** — Hot Toddy (hot), chilly intensity 0.79 → tier 1 → **HOT, NO ARGUMENTS.** **Denver** — hail ⇒ storm family, forced tier 2 → **DO NOT GO OUTSIDE.** (with `gentler: true` it drops to tier 1, **INDOORS. NOW.**). **Dubai** — a frozen/iced drink, 0.975 + 0 + 0.5 = 1.475 → tier 2 → **SERVED IN A BUCKET** (or the frozen ladder's tier 2 if the pick is frozen). In barista mode the `ink` becomes `barista` (green) while the text ladder is unchanged.

**What colours the stamp — settle this once.** `--stamp`, set from the **grade family** by the §3.5 table, is the *only* thing that colours `.coaster__stamp`; §4.2's markup contract reads that variable and nothing else. `stamp.ink` does **not** compete with it: it exists solely to (a) carry the barista-green override, which is the one case where the drink beats the weather, and (b) populate the `data-ink` attribute that the component tests assert. So Reykjavík's stamp is `--ink` (grade family `rain`) even though `stamp.ink === 'hot'`, and that is correct, not a bug. Never derive a colour from `stamp.ink` in CSS; never derive `data-ink` from the grade family.

### 6.7 Weather cache keys — `engine/cache.ts` / `api/cache.ts`

```ts
const q = (n: number) => Math.round(n * 4) / 4;                       // 0.25° quantisation
export function cellKey(lat: number, lng: number): string {
  let x = q(lng);
  if (x === 180) x = -180;                                            // antimeridian normalisation
  return `${q(lat)},${x}`;                                            // default number formatting (C10)
}
export const bucket = (epochMs: number) => Math.floor(epochMs / 900_000);   // 15-minute buckets
```

Pinned values: `cellKey(19.07, 72.88) === '19,73'` · `cellKey(19.08, 72.88) === '19,73'` · `cellKey(64.13, -21.90) === '64.25,-22'` · `cellKey(0.124, -140.13) === '0,-140.25'` · `cellKey(-89.9, 0) === '-90,0'` · `cellKey(-17.7, 179.9) === cellKey(-17.7, -179.9) === '-17.75,-180'`. Bucket: epoch `1788635700` (seconds → ×1000) → bucket `1987373`; `+899 s` → the same; `+900 s` → `1987374`.

Two-tier storage: an in-memory `Map` in front of the Dexie `weatherCache` table (C9). TTL 15 minutes for a fresh hit; up to **24 hours** for a *stale* hit when the network fails. Marine responses live in the same row under a `marine` sub-field, so re-clicking an ocean cell inside 15 minutes makes **zero** requests. Prune to the newest 200 rows on boot.

### 6.8 Offline reverse geocoding — `engine/geocode/`

**Build step** (`scripts/prep-geo.mjs`, run once, output committed):

1. For every Natural Earth country feature, ensure d3's spherical winding: **`if (geoArea(feature) > 2π) reverse every ring`** — an inverted polygon covers "everything except the country" and is the single most likely silent bug in this module.
2. Attach `bbox` from `geoBounds(feature)`.
3. Keep only `ADMIN, NAME, ISO_A2, CONTINENT, SUBREGION`. When `ISO_A2 === '-99'` (a Natural Earth quirk for e.g. Kosovo and N. Cyprus), fall back to `ISO_A2_EH`, then `'??'` — **never throw**.
4. Populated places: strip to `{ name, adm0name, iso_a2, lat, lng, pop_max, featurecla }` (~7,300 points, ~400 KB).
5. Marine polygons (50 m): keep `{ name, featurecla, bbox }`.
6. Emit `land-dots.json` — a decimated point cloud of `ne_110m_land` for the SVG fallback globe.

```ts
import { geoContains, geoDistance } from 'd3-geo';
import KDBush from 'kdbush';
import { around } from 'geokdbush';

let countries: CountryFeature[], places: Place[], marine: MarineFeature[], placeIndex: KDBush;

export async function loadGeo(base = import.meta.env.BASE_URL) {
  [countries, places, marine] = await Promise.all([
    fetch(`${base}geo/countries-110m.json`).then(r => r.json()),
    fetch(`${base}geo/places.json`).then(r => r.json()),
    fetch(`${base}geo/marine-50m.json`).then(r => r.json()),
  ]);
  placeIndex = new KDBush(places.length);
  for (const p of places) placeIndex.add(p.lng, p.lat);      // NOTE: lng FIRST
  placeIndex.finish();
}

function inBBox([w, s, e, n]: number[], lng: number, lat: number) {
  if (lat < s || lat > n) return false;
  return w <= e ? (lng >= w && lng <= e) : (lng >= w || lng <= e);   // bbox crossing the antimeridian
}

export function locate(lat: number, lng: number): PlaceHit {
  const pt: [number, number] = [lng, lat];
  const nearIdx = around(placeIndex, lng, lat, 1, 400)[0];           // 400 km radius (C1)
  const city = nearIdx === undefined ? undefined : places[nearIdx];
  const distanceKm = city ? geoDistance(pt, [city.lng, city.lat]) * 6371 : Infinity;
  // Conditional spread, not `nearestCity: city && …`: under exactOptionalPropertyTypes an
  // explicit `undefined` is not assignable to an optional property (§13).
  const near = city ? { nearestCity: toCity(city, distanceKm) } : {};
  const polar = Math.abs(lat) >= 66.5;

  const water = marine.find(m => inBBox(m.bbox, lng, lat) && geoContains(m, pt));
  if (water) return { kind: 'ocean', polar, water: pickWater(water), ...near,
    label: `You are in the ${water.name}` };

  const country = countries.find(c => inBBox(c.bbox, lng, lat) && geoContains(c, pt));
  if (country) return { kind: 'land', polar, country: toCountry(country), ...near,
    label: city ? `~${Math.round(distanceKm)} km from ${city.name}, ${country.ADMIN}`
                : `Somewhere in ${country.ADMIN}` };

  if (polar) return { kind: 'ice', polar, label: lat > 0 ? 'On the Arctic ice' : 'On the Antarctic ice' };

  return { kind: 'ocean', polar, ...near,
    // Branch on `city`, never `city!` — non-null assertions are banned outside tests (§13).
    label: city && distanceKm < 400 ? `Open water, ~${Math.round(distanceKm)} km off ${city.name}`
                                    : 'The middle of nowhere, at sea' };
}
```

**Precedence:** a marine-polygon hit wins over a country hit (this is what makes the Caspian behave), then country, then polar ice, then "no country and no city within 400 km ⇒ open water". `polar` is purely a latitude test and is independent of `kind`. **The order of the two `find` calls in the code above is the contract** — ARCHITECTURE §5.7 and TESTING §2.5 both state it the same way, and (42.0, 51.0) → Caspian Sea is the golden row that fails the moment someone reorders them.

`geokdbush.around(index, **lng**, **lat**, 1, 400)` — the argument order is `lng, lat`. Getting it backwards is the classic bug in this library; write a test with a point where swapping changes the answer.

Expected results (distances ±5 %):

| Point | Country | Nearest place | Sea / ocean | kind |
|---|---|---|---|---|
| 19.07, 72.88 | IN | Mumbai (≤ 15 km — pin the exact value on day 1) | — | land |
| 15.00, 65.00 | none | Mumbai ≈ 942 km ⇒ beyond 400 km | **Arabian Sea** | ocean |
| −17.7, 179.9 | FJ (polygon crosses the antimeridian) | Suva | — | land/coastal, **never "ocean"** |
| −17.7, −179.9 | FJ | Suva | — | same as above |
| −29.6, 28.2 | **LS** (enclave — must not return ZA) | Maseru | — | land |
| 64.13, −21.90 | IS | Reykjavík ≈ 3 km, `isCapital: true` | — | land |
| 62.03, 129.73 | RU | Yakutsk < 1 km | — | land |
| −89.9, 0 | AQ | > 400 km | — | land + `polar` |
| 89.9, 100 | none | > 400 km | Arctic Ocean | ocean + `polar` |
| 42.0, 51.0 | none | Aktau < 400 km | Caspian Sea | **ocean** — the sea polygon beats "a city within 400 km" |
| 40.0, −30.0 | none | Ponta Delgada ≈ 451 km | North Atlantic Ocean | ocean |
| 0.0, −140.0 | none | > 400 km | Pacific (pin North/South on day 1) | ocean |

Plus: 200 random open-ocean points return no country. `featurecla === 'Admin-0 capital'` sets `isCapital: true` (Reykjavík and Maseru true, Mumbai false) — the grammar uses it for extra sass.

**Costs:** 177 country features × a bbox test ≈ 10 µs; `geoContains` on the 1–5 surviving candidates ≈ 1–3 ms; the kdbush query < 0.1 ms. Well under the 20 ms budget. `countries-50m.json` (3.1 MB) is fetched lazily **after** the first verdict and swapped in for finer coastlines; the 110 m file (0.8 MB) is precached. Index build over ~7,300 points must complete in < 30 ms.

### 6.9 The globe — `features/globe/`, `engine/terminator.ts`

```ts
globe.onGlobeClick(({ lat, lng }) => pour(lat, lng));
globe.pointOfView({ lat, lng, altitude: 1.6 }, 1200);
globe.ringsData([{ lat, lng }]).ringMaxRadius(6).ringPropagationSpeed(6).ringRepeatPeriod(0);
const controls = globe.controls();
controls.enableDamping = true; controls.dampingFactor = 0.045; controls.rotateSpeed = 0.55;
controls.autoRotate = false; controls.autoRotateSpeed = 0.35;   // enabled after 8 s idle
```

- The pin is an `htmlElementsData` marker anchored to the coordinate.
- Mount the canvas **lazily** (`requestIdleCallback`) after first paint with `earth-day.jpg`, then swap in the Blue Marble WebP once decoded and **dispose the small texture**. `anisotropy: 4`, mipmaps on. Probe `gl.MAX_TEXTURE_SIZE` and skip the 4K path entirely on devices reporting < 4096.
- DPR cap: **1.75 desktop, 1.5 Android**.
- Pause the render loop on `visibilitychange`; handle `webglcontextlost` by swapping to the SVG globe and showing the "bearings seized" tag.
- **React 19 StrictMode double-mounts.** Guard the globe instance with a mount ref so a click never fires two pours; the request-count assertion in the e2e suite is what catches a regression.
- The SVG fallback globe hit-tests with a plain equirectangular inverse: `lng = (x / w) * 360 − 180`, `lat = 90 − (y / h) * 180`, adjusted for the circular mask.

**Subsolar point** (drives the ticker and, later, the shader terminator):

```ts
import * as solar from 'solar-calculator';
export function subsolar(now = new Date()): [lng: number, lat: number] {
  const day = new Date(+now).setUTCHours(0, 0, 0, 0);
  const t = solar.century(now);
  const longitude = ((day - +now) / 864e5) * 360 - 180;
  return [longitude - solar.equationOfTime(t) / 4, solar.declination(t)];
}
```

**Register ticker** (recomputed every 60 s, from `src/data/cities-ticker.json`, ~80 cities, iterated in longitude order so tests can assert it): `LAST ORDERS IN <CITY> · HH:MM` when a city's local time is in `[23:30, 00:15)`; `FIRST COFFEE IN <CITY> · HH:MM` when it is in `[06:30, 07:15)`; else `SUN SETTING OVER <CITY>` when `suncalc.getTimes(now, lat, lng).sunset` is within ±20 min; fallback `THE BAR IS OPEN · HH:MM UTC`. Format regex: `/^(LAST ORDERS|FIRST COFFEE) IN [A-Z ]+ · \d{2}:\d{2}$/`.

### 6.10 The voice — `src/wit/`

`voice.json` is a Tracery grammar. Symbols: `origin` → `#placeLine# #timeLine# #jab# #drinkLine# #serveLine# #closer#`; per-tag jab pools `jab_oppressive`, `jab_arctic`, `jab_rain`, … (**one pool per `Tag`, ≥ 8 variants each**, plus `jab_default`); `serveLine_frozen|iced|chilled|neat|warm|hot`; `closer_late`, `closer_brunch`, `closer_ocean`, `closer_polar`, `closer_default`; `hedge` lines for model data ("the models say", "allegedly", "on paper, anyway").

```ts
export function speak(v: Omit<Verdict, 'lines'>, grammarJson: Grammar, drink: Drink): Verdict['lines'] {
  const rng = seedrandom(v.seed + '|voice');
  tracery.setRng(rng);                                   // deterministic flatten
  const g = tracery.createGrammar({
    ...grammarJson,
    jab:       [`#jab_${v.drivingTag}#`],
    closer:    [`#closer_${closerKey(v)}#`],
    serveLine: [`#serveLine_${drink.serve}#`],
    place: [v.place.label], time: [v.localTime], drink: [drink.name], stamp: [v.stamp.text],
    feels: [fmtTemp(v.features.apparentC)], dew: [fmtTemp(v.features.dewPointC)],
    wind:  [fmtWind(v.features.windKmh)],
  });
  g.addModifiers(tracery.baseEngModifiers);
  return {
    place: g.flatten('#placeLine#'), time: g.flatten('#timeLine#'), jab: g.flatten('#jab#'),
    drink: g.flatten('#drinkLine#'), serve: g.flatten('#serveLine#'), closer: g.flatten('#closer#'),
    hedge: v.features.precipMm === 0 && v.features.wmo >= 51 ? g.flatten('#hedge#') : undefined,
  };
}
```

`closerKey` prefers `polar` → `ocean` → the day-part tag → `default`. If a per-tag pool is missing, fall back to `jab_default` — but a unit test asserts every `Tag` has a pool of ≥ 8, so that never ships.

**Marking the intensifier.** The drink line marks the shouted words with **`«…»`**; the renderer replaces them with `<em class="intensifier">` set in Righteous at 1.6×, uppercase, `vertical-align: -0.08em`. Example output for Mumbai at seed `19.1|72.9|0|bar|voice`:

> "~38 km from Mumbai, India. 00:45 local · dew point 24°. The air is soup. You are not sweating, you are marinating. «AGGRESSIVELY ICED» Mojito. Served in a bucket. It is almost one in the morning. Drink it and go to bed."

Rules enforced by tests: no `#` survives a flatten; no `((`/`))` residue; no double spaces; ≤ 260 characters; ends with terminal punctuation; the drink name appears exactly once; the stamp word is marked. The whole file passes a protected-characteristics deny-list (`src/wit/lint-denylist.json`) — **the bartender judges weather and choices, never people.** The "gentler bartender" lever tones the danger tier down (§6.6) and prefers the softer half of each pool.

`node scripts/sample-voice.mjs mumbai 1000` must report **≥ 300 distinct jab lines**, and two clicks 0.5° apart must not produce identical coasters.

### 6.11 The bar menu — `src/data/bar-menu.json` (40 drinks)

20 cocktails, each with a `virginTwin`, and 20 mocktails — one twin per cocktail. `affinity` values run 0–8; the tag vocabulary is the `Tag` union. Recipes are resolved from `drinks.json` at build time so the runtime needs one file. The menu is sized by a hard rule, not by taste: **every one of the 34 tags must have at least 3 drinks (counting both menus) at affinity ≥ 3**, so that no tag — not `hail`, not `polar`, not `bone-dry` — can ever leave the scorer with nothing to say. `scripts/check-menu.mjs` asserts it (§10.1).

**The bar (alcoholic — 20)**

| id | name | base | serve | glass | ice | bottle | twin | key affinities |
|---|---|---|---|---|---|---|---|---|
| `mojito` | Mojito | rum | iced | highball | crushed | rum | `virgin-mojito` | oppressive 4, muggy 3, hot 3, scorching 3, late 1, brunch 1 |
| `caipirinha` | Caipirinha | rum | iced | rocks | crushed | rum | `salted-lime-soda` | hot 3, oppressive 3, scorching 3, still 1 |
| `dark-n-stormy` | Dark 'n' Stormy | rum | iced | highball | cubes | ginger-beer | `virgin-stormy` | **ocean 7**, hail 5, downpour 4, storm 4, gale 4, breezy 3, rain 3, warm 2, hot 1 |
| `gin-tonic` | Gin & Tonic | gin | iced | highball | cubes | gin | `cucumber-tonic` | warm 3, afternoon 3, golden 3, hot 2, muggy 2, mild 2 |
| `negroni` | Negroni | gin | chilled | rocks | cubes | vermouth | `virgin-negroni` | evening 3, golden 3, mild 3, still 3, cold 1 |
| `margarita` | Margarita | tequila | iced | coupe | none | tequila | `virgin-margarita` | scorching 4, hot 3, uv-extreme 3, bone-dry 3, dust 3 |
| `frozen-daiquiri` | Frozen Daiquiri | rum | frozen | coupe | crushed | rum | `frozen-limeade` | scorching 5, uv-extreme 3, hot 2 |
| `espresso-martini` | Espresso Martini | vodka | chilled | coupe | none | vodka | `espresso-tonic` | late 4, evening 2, hot 1, fog 1 |
| `bloody-mary` | Bloody Mary | vodka | chilled | highball | cubes | vodka | `virgin-mary` | brunch 4, morning 3, smog 3, dust 3, chilly 1 |
| `old-fashioned` | Old Fashioned | whisky | neat | rocks | cubes | bitters | `smoked-cherry-soda` | chilly 3, cold 3, evening 3, late 3, still 3, fog 3 |
| `hot-toddy` | Hot Toddy | whisky | hot | mug | none | whisky | `hot-lemon-ginger` | chilly 4, cold 4, freezing 4, rain 4, hail 3, storm 3, downpour 3, fog 3, drizzle 2, snow 2, arctic 2, evening 1 |
| `hot-buttered-rum` | Hot Buttered Rum | rum | hot | mug | none | rum | `hot-chocolate` | **arctic 5**, polar 4, freezing 4, blizzard 3, snow 3, gale 3, fog 1, evening 1, late 1 |
| `mulled-wine` | Mulled Wine | wine | hot | mug | none | syrup | `spiced-apple-warmer` | freezing 4, arctic 3, cold 3, snow 3, blizzard 3, polar 3, evening 2 |
| `irish-coffee` | Irish Coffee | whisky | hot | mug | none | whisky | `masala-chai` | dawn 3, morning 3, cold 3, fog 3, drizzle 3, storm 3, downpour 3, chilly 2, rain 2 |
| `moscow-mule` | Moscow Mule | vodka | iced | copper-mug | cubes | ginger-beer | `ginger-switchel` | hot 3, warm 3, muggy 3, brunch 3, breezy 3 |
| `painkiller` | Painkiller | rum | iced | tiki | crushed | rum | `virgin-painkiller` | ocean 4, muggy 3, warm 3, breezy 3, hot 2, scorching 2, golden 2, oppressive 1 |
| `mimosa` | Mimosa | wine | chilled | flute | none | vermouth | `sunrise-fizz` | brunch 4, morning 3, mild 3, dawn 3, golden 2 |
| `paloma` | Paloma | tequila | iced | highball | cubes | tequila | `virgin-paloma` | bone-dry 3, afternoon 3, warm 3, scorching 2, hot 2, dust 2, uv-extreme 2 |
| `michelada` | Michelada | beer | chilled | pint | none | ginger-beer | `virgin-michelada` | smog 3, dust 3, brunch 3, afternoon 3, hot 2, muggy 2 |
| `hot-whisky-mac` | Hot Whisky Mac | whisky | hot | mug | none | whisky | `ginger-honey-warmer` | blizzard 4, hail 3, downpour 3, gale 3, polar 3, freezing 3, arctic 2, snow 2, storm 2 |

**The barista (non-alcoholic — 20)**

| id | name | base | serve | glass | ice | bottle | twin | key affinities |
|---|---|---|---|---|---|---|---|---|
| `virgin-mojito` | Virgin Mojito | none | iced | highball | crushed | mint | — | oppressive 4, muggy 3, hot 3, scorching 3, morning 2, brunch 2 |
| `salted-lime-soda` | Salted Lime Soda | soda | iced | highball | cubes | syrup | — | hot 3, oppressive 3, scorching 3, bone-dry 3, still 1 |
| `virgin-stormy` | Virgin Stormy | soda | iced | highball | cubes | ginger-beer | — | **ocean 7**, hail 5, downpour 4, storm 4, gale 4, breezy 3, rain 3, warm 2 |
| `cucumber-tonic` | Cucumber Tonic | soda | iced | highball | cubes | syrup | — | warm 3, afternoon 3, golden 3, hot 2, muggy 2, mild 2 |
| `virgin-negroni` | Virgin Negroni | juice | chilled | rocks | cubes | bitters | — | evening 3, golden 3, mild 3, still 3, cold 1 |
| `virgin-margarita` | Virgin Margarita | juice | iced | coupe | none | syrup | — | scorching 4, hot 3, uv-extreme 3, bone-dry 3, dust 3 |
| `frozen-limeade` | Frozen Limeade | juice | frozen | coupe | crushed | syrup | — | scorching 5, uv-extreme 3, hot 2 |
| `espresso-tonic` | Espresso Tonic | coffee | chilled | highball | cubes | tea | — | late 4, dawn 3, evening 2, hot 1, fog 1 |
| `virgin-mary` | Virgin Mary | juice | chilled | highball | cubes | syrup | — | brunch 4, morning 3, smog 3, dust 3, chilly 1 |
| `smoked-cherry-soda` | Smoked Cherry Soda | soda | chilled | rocks | cubes | bitters | — | chilly 3, cold 3, evening 3, late 3, still 3, fog 3, smog 3 |
| `hot-lemon-ginger` | Hot Lemon & Ginger | tea | hot | teacup | none | tea | — | chilly 4, cold 4, freezing 4, rain 4, drizzle 3, dawn 3, downpour 3, fog 3, snow 2 |
| `hot-chocolate` | Hot Chocolate | cocoa | hot | mug | none | cocoa | — | **arctic 5**, polar 4, freezing 4, blizzard 3, snow 3, gale 3, late 1 |
| `spiced-apple-warmer` | Spiced Apple Warmer | juice | hot | mug | none | syrup | — | freezing 4, arctic 3, cold 3, snow 3, blizzard 3, polar 3, drizzle 3, evening 2 |
| `masala-chai` | Masala Chai | tea | hot | teacup | none | tea | — | dawn 3, morning 3, cold 3, fog 3, rain 3, smog 3, drizzle 3, storm 3, downpour 3, chilly 2 |
| `ginger-switchel` | Ginger Switchel | soda | iced | copper-mug | cubes | ginger-beer | — | hot 3, warm 3, muggy 3, brunch 3, breezy 3 |
| `virgin-painkiller` | Virgin Painkiller | juice | iced | tiki | crushed | syrup | — | ocean 4, muggy 3, warm 3, breezy 3, hot 2, scorching 2, golden 2, oppressive 1 |
| `sunrise-fizz` | Sunrise Fizz | juice | chilled | flute | none | syrup | — | brunch 4, morning 3, mild 3, dawn 3, golden 2 |
| `virgin-paloma` | Virgin Paloma | soda | iced | highball | cubes | syrup | — | bone-dry 3, afternoon 3, warm 3, scorching 2, hot 2, dust 2, uv-extreme 2 |
| `virgin-michelada` | Virgin Michelada | juice | chilled | pint | none | bitters | — | smog 3, dust 3, brunch 3, afternoon 3, hot 2, muggy 2 |
| `ginger-honey-warmer` | Ginger & Honey Warmer | tea | hot | mug | none | ginger-beer | — | blizzard 4, hail 3, downpour 3, gale 3, polar 3, freezing 3, arctic 2, snow 2, storm 2 |

All nine `Glass` shapes are in play (`rocks`, `highball`, `coupe`, `mug`, `copper-mug`, `tiki`, `flute`, `pint`, `teacup`) and all twelve `BottleId` bottles are nodded to by at least one drink, so the back bar never has a dead button.

**Schema tests** (`src/data/bar-menu.test.ts`, plus `scripts/check-menu.mjs` in CI): every `virginTwin` resolves to an existing non-alcoholic drink and no twin is claimed twice; exactly 20 alcoholic and 20 non-alcoholic rows; every `bottle` is a valid `BottleId`, every `glass` a valid `Glass`, every `ice` one of `cubes|crushed|none`; every affinity key is a valid `Tag` and every value an integer 0–8; **every one of the 34 `Tag`s has at least 3 drinks (counting both menus) with affinity ≥ 3**; the two hand-checked score tables in §6.5 still reproduce; and the nine fixtures × {bar, barista} snapshot is unchanged. `colour` values are flat, muted fills for the glassware (e.g. Mojito `#CFE8D2`, Hot Buttered Rum `#B77B3E`, Dark 'n' Stormy `#6B3A1E`, Painkiller `#E8A85C`, Mimosa `#F0C24A`, Michelada `#C4652A`, Hot Whisky Mac `#A8571F`).

### 6.12 Composition — `engine/index.ts`

```ts
export function judge(input: {
  now: Date; lat: number; lng: number;
  snapshot: WeatherSnapshot; place: PlaceHit;
  menu: 'bar' | 'barista'; drinks: Drink[]; grammar: Grammar;
  settings: { gentler: boolean }; lastDrinkId?: string;
}): Verdict {
  const features   = buildFeatures(input);                       // §6.1 + §6.4, no I/O
  const tags       = extractTags(features);                      // §6.3
  const drivingTag = driving(tags);                              // priority list
  const thermalTag = thermal(tags);                              // highest-weight temp/humidity
  const d          = dial(thermalTag, features.apparentC);       // §6.4
  const menu       = input.drinks.filter(x => x.alcoholic === (input.menu === 'bar'));
  const ranked     = scoreDrinks(tags, menu, { lastDrinkId: input.lastDrinkId });
  const seed       = seedFor(input.lat, input.lng, features.localHour, input.menu);
  const chosen     = pick(ranked, seed, tags);                   // §6.5
  const stamp      = stampFor(tags, chosen.pick, input.menu, input.settings.gentler);
  const partial    = { /* …assemble everything above… */ };
  const lines      = speak(partial, input.grammar, chosen.pick); // §6.10
  return { ...partial, lines };
}
```

**No I/O anywhere in this call.** The orchestrator (`features/verdict/pour.ts`) does the fetching and hands `judge()` a snapshot. Bench: 1,000 calls average **≤ 5 ms** each.

---

## 7. Data sources & APIs

Every runtime endpoint is **no-key** and answers `Access-Control-Allow-Origin: *`. There is no proxy and no secret in the MVP.

### 7.1 Open-Meteo Forecast (mandatory, ~2 weighted calls)

```
GET https://api.open-meteo.com/v1/forecast
  ?latitude=19.07&longitude=72.88
  &current=temperature_2m,relative_humidity_2m,apparent_temperature,dew_point_2m,
           precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,
           wind_speed_10m,wind_gusts_10m,wind_direction_10m,is_day
  &hourly=uv_index,temperature_2m,precipitation_probability
  &daily=sunrise,sunset,uv_index_max,temperature_2m_max,temperature_2m_min
  &timezone=auto&forecast_days=1
```

Response shape (real, probed):

```jsonc
{ "timezone": "Asia/Kolkata", "utc_offset_seconds": 19800,
  "current": { "time": "2026-09-06T00:45", "interval": 900, "temperature_2m": 25.4,
               "relative_humidity_2m": 94, "apparent_temperature": 31.5, "dew_point_2m": 24.4,
               "precipitation": 0.10, "weather_code": 51, "cloud_cover": 100,
               "wind_speed_10m": 1.9, "wind_gusts_10m": 2.9, "is_day": 0 },
  "hourly": { "time": [...], "uv_index": [...], "precipitation_probability": [...] },
  "daily":  { "sunrise": ["..."], "sunset": ["..."], ... } }
```

- `current.time` is **local with no offset suffix**. Never parse it as UTC. Combine with `utc_offset_seconds`, or just format `Date.now()` with `Intl.DateTimeFormat('en', { timeZone: data.timezone })`.
- Pick the `hourly` row whose `time` shares the hour of `current.time`.
- `is_day` is `0 | 1` → coerce to boolean. `null` fields become `undefined`, **never `0`**.
- Send `Accept: application/json`. No other headers are required or useful.
- `timezone=auto` returns a valid IANA name for **any** coordinate, including open ocean (`Etc/GMT+9`), Antarctica (`Antarctica/Troll`, `Antarctica/McMurdo`), the poles (`Etc/GMT-7`) and the antimeridian (`Etc/GMT-12`). Polar answers are pragmatic guesses — the copy hedges (§6.4).

### 7.2 Open-Meteo Air Quality (best-effort, ~1 call)

```
GET https://air-quality-api.open-meteo.com/v1/air-quality
  ?latitude=&longitude=&current=european_aqi,us_aqi,pm2_5,pm10,ozone,uv_index,dust&timezone=auto
```

`current.interval` is **3600** (hourly), not 900. Credit **CAMS ENSEMBLE (Copernicus)**. A failure here only removes the `smog`/`dust` tags — the coaster still prints, with `AQI —` on the receipt.

### 7.3 Open-Meteo Marine (ocean clicks only, ~0.5 call)

```
GET https://marine-api.open-meteo.com/v1/marine
  ?latitude=&longitude=&current=wave_height,sea_surface_temperature,wind_wave_height&timezone=auto
```

Credit **DWD**. Some coastal, inland and lake cells return an error or nulls — treat that as "no marine data" and carry on.

### 7.4 Open-Meteo Geocoding (forward search box only)

```
GET https://geocoding-api.open-meteo.com/v1/search?name=Mumbai&count=5&language=en
→ results[{ name, country, admin1, latitude, longitude, timezone, population }]
```

**Forward only — there is no reverse endpoint**, which is exactly why §6.8 exists. Debounce 250 ms, minimum 2 characters, no autocomplete under 250 ms. No results → "Never heard of it."

### 7.5 Rate limits, weighting and error handling

Limits are 600/min · 5,000/h · 10,000/day · 300,000/month **per IP**. Requests with more than 10 weather variables count as **fractional multiple calls** — the forecast request above is ≈ 2 weighted calls, so the budget is **two numbers, not one**: a **land** pour costs ≤ **3 weighted calls** (forecast ≈ 2 + AQI 1) and an **ocean** pour costs ≤ **4** (the marine request adds ≈ 1). Both are CI gates (§10.8). The 0.25° / 15-minute cache makes repeats free; a second click inside the same cell within 15 minutes makes **zero** requests.

- One `AbortController` with a **6 s** timeout covers all three requests.
- A dev-time guard in the URL builder **throws** if `current + hourly + daily` variables exceed 23 or `forecast_days > 1`.
- `429` → `BarBusyError` with `retryAfterMs = 60_000` → the "Bar's busy. Give it a minute." coaster and a visible 60 s RETRY cooldown. **Never retried.**
- `5xx` → exactly **one** retry after 1.5 s, then `ModelsSilentError`.
- Network failure / timeout → `ModelsSilentError` → the offline path (a stale cache hit ≤ 24 h, else the error coaster).
- `4xx` on bad coordinates → the "Nowhere on Earth" coaster.
- No retry storms, ever.

### 7.6 Attribution (rendered, not just documented)

"Weather data by Open-Meteo.com" (CC BY 4.0, as a link) appears on **the coaster receipt strip, the share card and the About page**. Air quality adds "CAMS ENSEMBLE (Copernicus)"; marine adds "DWD". Textures credit "NASA Earth Observatory" with no implied endorsement. Natural Earth is public domain (credited anyway). Drink data credits `rasmusab/iba-cocktails` and `alfg/opendrinks` (both MIT). Fonts credit SIL OFL 1.1. Every CC0 sound is listed with its source id. OpenStreetMap (ODbL) is credited **only when** the Nominatim lever is on.

### 7.7 Nominatim (optional lever, off by default — stretch)

```
GET https://nominatim.openstreetmap.org/reverse?lat=&lon=&format=jsonv2&zoom=10
```

Rules, all mandatory if it ships: a client throttle of **≥ 1.1 s** between calls; cached per cell **forever** in Dexie; called **only after** the offline label has already printed; "Data © OpenStreetMap contributors" rendered on the coaster when used; **never** on hover, never in a grid, never systematically. Browsers cannot set `User-Agent`, so the policy is satisfied via `Referer` (`referrerPolicy: 'origin'` on that one fetch).

### 7.8 The bundled datasets

| Dataset | Source | Licence | Prepared by | Ships as |
|---|---|---|---|---|
| Countries 110 m / 50 m | `nvkelso/natural-earth-vector` `geojson/ne_110m_admin_0_countries.geojson` (0.8 MB) and `ne_50m_…` (3.1 MB) | Public domain | `prep-geo.mjs` | `public/geo/countries-110m.json` (precached), `countries-50m.json` (lazy) |
| Populated places | `ne_10m_populated_places_simple.geojson` (4.9 MB, 7,342 features) | Public domain | `prep-geo.mjs` (strip to 7 fields) | `public/geo/places.json` ~400 KB |
| Marine polygons | `ne_50m_geography_marine_polys.geojson` (1.2 MB) | Public domain | `prep-geo.mjs` | `public/geo/marine-50m.json` |
| Land outline | `ne_110m_land.geojson` (0.14 MB) | Public domain | `prep-geo.mjs` (decimate to dots) | `public/geo/land-dots.json` |
| IBA cocktails | `rasmusab/iba-cocktails` | **MIT** | `prep-drinks.mjs` | `src/data/drinks.json` |
| Open Drinks | `alfg/opendrinks` (756 recipes, `keywords: ["alcoholic"]`, virgin/mocktail entries) | **MIT** | `prep-drinks.mjs` | same |
| First-paint textures | `https://cdn.jsdelivr.net/npm/three-globe/example/img/{earth-day.jpg,earth-topology.png,earth-water.png,night-sky.png}` | MIT repo, NASA-derived | copied once | `public/textures/` |
| Blue Marble NG (monthly) | NASA Earth Observatory, 5400×2700 or 21600×10800 JPEG, downloaded by hand into `raw/` | Public domain | `prep-textures.mjs` (sharp, quality 82, no alpha) | `bmng-{mm}-{4k,8k}.webp` |
| Black Marble 2016 | NASA Earth Observatory, 3600×1800 or 13500×6750 | Public domain | `prep-textures.mjs` | `black-marble-{4k,8k}.webp` |

`prep-drinks.mjs` normalises both repos into the `Recipe` interface, tags each with `source` and `sourceLicence`, **drops every image URL** and every ingredient string longer than 60 characters, and must produce ≥ 120 recipes including ≥ 25 non-alcoholic. Re-running it must produce an empty `git diff`. **Method text is rewritten in-house** — the imported prose is never shipped.

`raw/` is git-ignored. Keep a `raw/SOURCES.txt` listing every URL and its download date, and back the folder up externally — the NASA pages move.

---

## 8. Platform integration (Capacitor 8 — the optional Android tier)

Everything native sits behind an adapter in `src/platform/`, chosen by `Capacitor.isNativePlatform()`. **No custom native code exists in this project.**

### 8.1 Plugins and what each one is for

| Plugin | Use |
|---|---|
| `@capacitor/app` | `backButton` listener: predictive back closes the Back Office / Tab / Register **before** leaving a route |
| `@capacitor/haptics` | The §3.13 haptics map |
| `@capacitor/share` + `@capacitor/filesystem` | Write the 1080×1350 PNG to `Directory.Cache`, then `Share.share({ files: [uri] })` |
| `@capacitor/preferences` | The settings storage adapter |
| `@capacitor/status-bar` | `overlaysWebView: true`, transparent background, `Style.Dark` on Night / `Style.Light` on Day, flipped whenever `data-shift` changes |
| `@capacitor/splash-screen` | `#1A0F0A` + brass pin, `launchAutoHide: false`, hidden by the app once the neon paints |
| `@capacitor/geolocation` | "Where am I" **only** |

### 8.2 `capacitor.config.ts`

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rahul.barometer',
  appName: 'The Globe Bar',
  webDir: 'dist',
  android: {
    webContentsDebuggingEnabled: process.env.CAP_WEBVIEW_DEBUG === '1',   // release builds ship false
    backgroundColor: '#1A0F0A',                                          // kills the white flash
  },
  plugins: {
    SplashScreen: { backgroundColor: '#1A0F0A', showSpinner: false, launchAutoHide: false },
    StatusBar: { overlaysWebView: true, style: 'DARK', backgroundColor: '#00000000' },
  },
};
export default config;
```

### 8.3 Manifest edits

`android/app/src/main/AndroidManifest.xml` — Capacitor never overwrites this on `cap sync`. Add exactly four lines beyond the template's `INTERNET`:

```xml
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-feature android:name="android.hardware.location.gps" android:required="false" />
```

`VIBRATE` powers the haptics. The two location permissions exist **only** for "Where am I", are requested at tap time and never at launch, and the resulting coordinates are resolved by the **offline** Natural Earth lookup — no network geocoder is ever called.

**Deliberately absent, and a review must keep them absent:** `CAMERA`, any `READ_MEDIA_*`, `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM` / `USE_EXACT_ALARM`, `RECORD_AUDIO`, and share-target intent filters. Barometer has no camera, gallery, notification or alarm feature, so the entire Android 13/14/15 media-permission minefield does not apply.

### 8.4 Gradle

Merge this into `android/app/build.gradle` (Groovy, generated by `npx cap add android`), replacing both placeholders with `com.rahul.barometer`. It reads the version from Gradle properties and the keystore from environment variables, so an unsigned build produces `app-release-unsigned.apk` and the workflow's `cp` fails loudly instead of shipping something unsigned.

```groovy
def ciVersionCode = (project.findProperty('versionCode') ?: '1').toInteger()
def ciVersionName = project.findProperty('versionName') ?: '0.0.0'
def ksFile = System.getenv('ANDROID_KEYSTORE_FILE')

android {
    namespace "com.rahul.barometer"
    compileSdk rootProject.ext.compileSdkVersion              // 36
    defaultConfig {
        applicationId "com.rahul.barometer"                   // NEVER changes after the first install
        minSdkVersion rootProject.ext.minSdkVersion           // 24
        targetSdkVersion rootProject.ext.targetSdkVersion     // 36
        versionCode ciVersionCode
        versionName ciVersionName
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
        aaptOptions { ignoreAssetsPattern '!.svn:!.git:!.ds_store:!*.scc:.*:!CVS:!thumbs.db:!picasa.ini:!*~' }
    }
    signingConfigs {
        release {
            if (ksFile) {
                storeFile file(ksFile)
                storeType 'PKCS12'
                storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
                keyAlias System.getenv('ANDROID_KEY_ALIAS')
                keyPassword System.getenv('ANDROID_KEY_PASSWORD')
            }
        }
    }
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
            if (ksFile) signingConfig signingConfigs.release
        }
    }
}
// Keep everything else the generated file already has: repositories, dependencies,
// apply from: 'capacitor.build.gradle', and the google-services try/catch.
```

Toolchain: AGP **8.13.0**, Gradle wrapper **8.14.3**, `compileSdk`/`targetSdk` **36**, `minSdk` **24**, **Temurin JDK 21** (Capacitor 8 targets Java 21; the `ubuntu-24.04` runner defaults to 17). **Never run `npx cap build android`** — it signs v1-only with `jarsigner` and the result will not install on Android 11+.

`npx cap add android` runs locally **without a JDK or SDK** — it only writes files. A Gradle-sync warning is expected and fine. Commit the whole `android/` folder; git-ignore `android/local.properties`, `android/app/release/` and `android/.gradle/`.

### 8.5 Web ↔ Android behavioural differences

| Concern | Web | Android |
|---|---|---|
| Service worker | Registered (`registerType: 'prompt'`) | **Never registered** — `Capacitor.isNativePlatform()` guard. `chrome://inspect` showing one is a regression. |
| Base path | `/barometer/` | `/` (Capacitor serves from `https://localhost/`) |
| Textures | 8K WebP, DPR cap 1.75 | 4K WebP, DPR cap 1.5 (`VITE_PLATFORM=android`) |
| Haptics | `navigator.vibrate(12)` on the pin drop only | The full §3.13 map |
| Share | Web Share API, falling back to a download | `@capacitor/share` with the PNG file attached |
| Settings storage | `localStorage` | `@capacitor/preferences` |
| Status bar | — | Flipped per shift, transparent, overlaying |
| Back gesture | Browser history | `@capacitor/app` `backButton` closes sheets first |
| WebGPU / WebLLM rung | Available on desktop Chrome/Edge | **Absent** — Android System WebView has no WebGPU; hide the rung entirely |

### 8.6 Gestures and insets

- Pad the back-bar strip by `env(safe-area-inset-top)` and the foot-rail by `env(safe-area-inset-bottom)`. Edge-to-edge is mandatory on API 35+.
- Inside the globe cradle: `touch-action: none` plus `preventDefault()` on `touchmove`, with a **24 px dead margin on both horizontal edges** of the canvas so a drag from the screen edge does not trigger the system back gesture.
- The counter sheet's drag handle sits **≥ 16 px** above the bottom system gesture zone.
- Predictive back is on by default on Android 16 and `onBackPressed()` is not called. If the `backButton` listener does not fire on the test device, the documented temporary opt-out is `android:enableOnBackInvokedCallback="false"` on `<application>` — record it if you use it.
- Orientation locks are ignored at ≥ 600 dp, so the tablet/foldable three-band layout must simply work.
- On rotation the globe resizes via `--globe-size`, the SVG cradle stays registered with the canvas, and the verdict survives in Zustand with **no refetch**.

### 8.7 Icons and splash

`design/icon.svg` is the single source. `@vite-pwa/assets-generator` produces the web/PWA set into `public/icons/` (192, 512, maskable 1024, favicon 32/180). `npx @capacitor/assets generate --android` produces the adaptive/monochrome Android set. **That second command is unverified** — if it demands anything beyond Node, hand-export the five `mipmap-*` densities from the SVG and commit them, and record the decision.

---

## 9. Build order with checkpoints

Six phases, ~120 hours total. Tasks are sized at half a day or less. **Every task has a verification step — do not proceed past a red one.** A "Weekend MVP" fast path is at the end; build that first if you need a win.

### Phase 0 — Setup, CI, live on day 1 (~13 h)

**Day 1 is one sitting and ends with a working URL.**

**0.1 Scaffold in place.** `npm create vite@latest . -- --template react-ts` in the project folder — choose *"Ignore files and continue"* so `docs/` and `design/` survive. Then `npm install` and the dependency installs from §2.1.
→ *Run `npm run dev`; verify the template serves at `localhost:5173`, `git status` shows no deleted docs.*

**0.2 Pin the toolchain.** Add `"engines": { "node": ">=22.12" }`; `npx biome init` and configure 2-space indent, single quotes, organise-imports on; paste the full `scripts` block (§10.1) into `package.json`.
→ *Run `npm run lint` and `npx tsc --noEmit`; verify both exit 0.*

**0.3 Base path and hash router.** `vite.config.ts`: `base: process.env.VITE_BASE_PATH ?? '/'`, `@tailwindcss/vite`, `rollup-plugin-visualizer` emitting JSON for the bundle gate. `src/app/router.tsx`: `createHashRouter` with `#/`, `#/v/:coords`, `#/tab`, `#/office`, `#/about` rendering placeholders.
→ *Run `VITE_BASE_PATH=/barometer/ npm run build && npx vite preview --base /barometer/`; verify all five hash routes render and every asset URL in `dist/index.html` starts with `/barometer/`.*

**0.4 Tokens, fonts, hello-world bar.** Paste §3.3 verbatim into `src/styles/tokens.css`; import the three Fontsource packages; add the `@theme inline` bridge; render one screen — mahogany background, brass plate, `THE GLOBE BAR` in Righteous with the neon filter, `Spin. Tap. Survive.`
→ *Verify `body` computes to `rgb(26, 15, 10)`, DevTools → Network shows **zero** third-party rows, and `document.fonts.check('1em Righteous')` is true after load.*

**0.5 Deploy.** Write `.github/workflows/pages.yml` (§11.2), `git init -b main`, `gh repo create barometer --public --source=. --push`, then **Settings → Pages → Source: "GitHub Actions"**.
→ *Verify `https://<owner>.github.io/barometer/` shows the neon sign and a second push redeploys within 3 minutes.* **Day 1 is done when the URL works.**

**0.6 `ci.yml` separate from `pages.yml`** (§11.3). Heavy gates (Playwright, licences, bundle budget) live in `ci.yml`; `pages.yml` runs only `npm test -- --run`.
→ *Verify a deliberately failing e2e test fails `ci.yml` and does **not** block the deploy.*

**0.7 Day-1 network verifications.** Run the §9.7 checklist rows D1-1, D1-2, D1-3, D1-11, D1-19, D1-20 with `curl` and DevTools **against the deployed origin**. Record the real `timezone` strings for `15,65` and `0,−140`.
→ *Verify the `arabian-sea` fixture carries the real timezone string, not a placeholder.*

**0.8 Day-1 package verifications.** Rows D1-9, D1-10, D1-18.
→ *Verify `npm run check:licenses` exits 0.*

**0.9 `scripts/prep-geo.mjs`** per §6.8.
→ *Run it twice; verify it is idempotent, that gzip sizes are ≤ 900 KB (110 m + places + marine) and ≤ 1.2 MB (50 m), and that the built-in smoke assertion `geoContains(countries.IN, [72.88, 19.07]) === true` and `…countries.RU… === false` passes.*

**0.10 `scripts/prep-drinks.mjs`** per §7.8.
→ *Verify ≥ 120 recipes with ≥ 25 non-alcoholic, no surviving key named `image`/`thumb`/`url`, and an empty `git diff` on a re-run.*

**0.11 `scripts/prep-textures.mjs`** with sharp.
→ *Verify each WebP ≤ 3 MB, all four ≤ 10 MB total, and `public/textures/earth-day.jpg` ≤ 260 KB committed unchanged.*

**0.12 Settle the three-globe texture licence** (D1-7). Read the repo's LICENSE and the `example/img` provenance; either keep the four files with a NASA credit line or replace them with NASA originals resized by `prep-textures.mjs`. **If the licence is unclear, replace rather than keep.**
→ *Verify the decision is recorded in `src/data/attribution.json` **and** the README table.*

**0.13 Seed `attribution.json` + the `#/about` route.**
→ *Verify a Vitest diffs `attribution.json` against the README table and fails on drift — the harness exists before there is anything to attribute.*

**0.14 Add the Android shell.** `npx cap init "The Globe Bar" com.rahul.barometer --web-dir dist`, `npx cap add android`, merge the §8.4 gradle block, add the `.gitattributes` / `.gitignore` lines.
→ *Verify it succeeds with **no** JDK/SDK on the machine (a Gradle-sync warning is expected) and `android/` is committed.*

**0.15 Create and back up the signing key.** In Git Bash, **outside the repo**: `openssl req -x509 -newkey rsa:4096 -keyout barometer.key -out barometer.crt -days 10950 -nodes -subj "/CN=barometer"` then `openssl pkcs12 -export -inkey barometer.key -in barometer.crt -name release -out barometer-release.p12` (key password = store password), then `base64 -w0 barometer-release.p12 > barometer-release.p12.b64`. Set the four secrets with `gh secret set`.
→ *Verify `gh secret list` shows four secrets, the `.p12` **and** its passphrase exist in two separate backups, and nothing matching `*.p12` is tracked by git.* **Losing this key means no future APK can ever update an installed one.**

**0.16 Prove the APK pipeline before any feature exists.** Add `android-release.yml` (§11.4) and run it via `workflow_dispatch` on the hello-world build.
→ *Verify a signed `app-release.apk` is produced, installs on the phone and shows the neon sign; answer D1-14 and D1-15 from `chrome://inspect` on that build.*

**Phase 0 is done when:** the Pages URL renders the tokens; `ci.yml` and `pages.yml` are green and independent; `public/geo/*`, `public/textures/*`, `src/data/drinks.json` and `attribution.json` are generated and committed; the keystore is backed up; a signed hello-world APK has installed on a real phone.

### Phase 1 — Design system and skeleton screens (~20 h)

The bar exists, statically, at the quality bar of §3 — before it knows anything about weather.

**1.1 Materialise the token layer.** `src/styles/index.css` with the Tailwind bridge plus the material recipes from §3.6 (wood grain, brass gradient, `.paper` scope, neon stack, grain overlay). Register the colour tokens with `@property`.
→ *Verify a Playwright computed-style test asserts the §10.7 token table in Night, and that `.paper` descendants resolve `--ink` to `rgb(28, 18, 12)` in **both** shifts.*

**1.2 App shell and layout bands.** Providers (`MotionConfig reducedMotion="user"`, audio-unlock context, Dexie provider), the three-band grid with `--globe-size` and container queries, `env(safe-area-inset-*)` padding, five hash routes rendering real (empty) screens.
→ *Verify resizing 1440 → 768 → 375 px never produces a horizontal scrollbar and the bands hold their §3.8 proportions.*

**1.3 The 12 bottles and the back-bar.** Own SVGs per §3.12; `Bottle` renders as a `<button>` with `default | picked | dimmed`.
→ *Verify 12 buttons with accessible names, `bottle--picked` at `rotate(-7deg)`, hit areas ≥ 44×44, total inline SVG ≤ 18 KB gzip.*

**1.4 The wall dial.** Bezel, engraved ring on a `<textPath>`, needle, mono window; `role="meter"` with `aria-valuemin=-120 aria-valuemax=120` and `aria-valuetext`.
→ *Verify the pure `dial()` helper returns `index × 40 − 120` for all seven labels.*

**1.5 The neon signs.** `NeonSign` in three variants with `off | on | flicker-on | barista`; the BAR/BARISTA one is `role="switch"` with visible text.
→ *Verify on the Day shift the wordmark computes `color: rgb(232, 183, 160)` and `filter: none`.*

**1.6 The window and its sky.** The gradient stack, the neon slot, the brass mullion, and empty named layer mounts for all eight weather layers.
→ *Verify no layer's bounding box intersects the coaster rect at 1440 px and 375 px.*

**1.7 The cradle and the SVG fallback globe.** Brass rings, degree ticks, turned-wood base; inside, the `land-dots.json` dotted globe with an equirectangular hit-test. **This ships before globe.gl** — it is both the no-WebGL path and the pre-mount placeholder.
→ *Verify with `getContext('webgl')` stubbed to `null`, clicking the Mumbai pixel yields 19.07, 72.88 ± 0.5°.*

**1.8 The counter.** Coaster lane with the empty-state plate and ghost ring, the classified-ad `Search` box (static rows), `Where am I`, the register housing with a VFD slot, the THE TAB plate.
→ *Verify the neon is visible **before** any canvas exists, plus 12 bottles and the dial at FAIR.*

**1.9 `Coaster` in skeleton and printed-static form.** Round (desktop) and square (phone) variants, pressed-ring mask, `role="article"` + `aria-live="polite"`, `IntensifierStamp`, `ReceiptStrip`, and the recipe back face.
→ *Verify against a hard-coded Mumbai verdict object (the engine does not exist yet) and that the skeleton has **no** shimmer class.*

**1.10 Restyle the shadcn/Base UI primitives.** `BrassPlate`, `Lever`, `BrassKnob`, `Sheet`/`Drawer`, `Tooltip`, `Toast` — tokens only, no forks.
→ *Verify roles, keyboard steps and announcements, and a 2 px `--focus` ring at 2 px offset on every `:focus-visible`.*

**1.11 Phone layout and the counter sheet.** 56 px strip, ~50 vh window, draggable sheet with peek/open, square coaster, thumb-reach ordering.
→ *Verify on the Pixel 7 profile that every interactive element is ≥ 44×44 and the sheet handle sits ≥ 16 px above the gesture zone.*

**1.12 Accessibility and keyboard baseline.** Tab order sign → dial → menu → globe → search → where-am-I → register → tab; globe wrapper `role="application"`, `tabindex=0`, arrow hooks (no-ops until Phase 2); decorative SVGs `aria-hidden`.
→ *Verify axe reports zero violations in both shifts.*

**1.13 Freeze the visual baselines.** Capture the eight states × {Night, Day} × {desktop, Pixel 7} with the canvas masked and the clock pinned.
→ *Verify `npm run test:visual` is green twice in a row on CI with Linux baselines committed.* **Do this inside Phase 1, not at the end of the project — preview-vs-app drift is the classic failure of this kind of build.**

### Phase 2a — The pure engine, no React (~16 h)

This is pure Node work; it is the safest thing to do on a low-energy evening and it is fully parallel to Phase 1.

**2a.1 Land the golden fixtures.** Write the eleven `src/test/fixtures/openmeteo/*.json` of §10.2 in the **exact** live response shape, plus `scripts/golden.py` recomputing every derived value.
→ *Verify `python scripts/golden.py` reproduces each apparent/dew column to ±0.1 and the `mumbai` fixture is byte-identical to the probed response.*

**2a.2 `engine/comfort.ts` + `wmo.ts`** (§6.1, §6.2).
→ *Verify every golden row passes to ±0.1 with **100 % line coverage** on the file, and that the three worked examples are assertions rather than comments.*

**2a.3 `engine/tags.ts`** (§6.3), all rows, one tag per family, sorted descending, driving-tag priority list.
→ *Verify Mumbai yields `oppressive 1.43 > hot 1.35 > late 1.02 > drizzle 0.78 > still 0.20`, all nine fixture tag-sets match, and every boundary assertion in §6.3 passes.*

**2a.4 `engine/dial.ts` + `engine/intensify.ts`** (§6.4, §6.6).
→ *Verify Mumbai → SOUP + tier 1 AGGRESSIVELY ICED; Yakutsk → ARCTIC + tier 2; Denver → storm family, forced tier 2, `--stamp: var(--danger)`.*

**2a.5 `engine/daypart.ts` + `engine/units.ts`** (§6.4).
→ *Verify all fixture day-parts, and — critically — that running the identical fixture under `TZ=UTC` gives an identical answer.*

**2a.6 `engine/geocode/`** (§6.8).
→ *Verify all twelve rows of the §6.8 table including Lesotho (must not return ZA) and both signs of the Fiji antimeridian; 200 random ocean points return no country; bench p95 ≤ 20 ms (110 m) and ≤ 60 ms (50 m); index build ≤ 30 ms.*

**2a.7 Author `src/data/bar-menu.json`** — the 40 drinks of §6.11 (20 bar + 20 barista), and write `scripts/check-menu.mjs` alongside it.
→ *Verify `node scripts/check-menu.mjs` exits 0: 40 rows, every twin resolving and unclaimed, every bottle/glass/ice/tag valid, and **every one of the 34 Tags carrying ≥ 3 drinks at affinity ≥ 3** (the menu as shipped has a minimum of 4). Verify both hand-checked score tables in §6.5 reproduce exactly, and that `denver-hail` gives Dark 'n' Stormy 17.53 with a 7.45 margin and `south-pole` gives Hot Buttered Rum 20.80 with a 6.80 margin — both dominant, neither a coin-flip.*

**2a.8 `engine/score.ts` + `engine/pick.ts`** (§6.5).
→ *Verify Mojito scores 12.79 and Hot Buttered Rum 19.95; Yakutsk is dominant and never rolls; two clicks 0.1° apart produce different seeds; a negative-score drink is never drawn.*

**2a.9 Write `voice.json` and `intensifiers.json`** — ≥ 8 variants per slot per tag.
→ *Verify the lint test passes: every `Tag` has a `jab_` pool of ≥ 8, no unexpanded `#slot#` ever escapes, and the protected-characteristics deny-list is clean.*

**2a.10 `src/wit/tracery.ts`** (§6.10).
→ *Verify the Mumbai seed reproduces the documented line, snapshots are committed after the first green run, and `node scripts/sample-voice.mjs mumbai 1000` reports ≥ 300 distinct jabs.*

**2a.11 `engine/index.ts` — `judge()`** (§6.12).
→ *Verify all nine weather fixtures produce their expected `drinkId`, `drivingTag`, `dial` and stamp tier in one table-driven test, and that 1,000 calls average ≤ 5 ms.*

### Phase 2b — The network and the globe (~15 h)

**2b.1 `api/openMeteo.ts`** (§7).
→ *Verify the URL builders match §7 exactly, the weighting guard throws above 23 variables, a 5xx retries **once** after 1.5 s and a 429 **never** retries.*

**2b.2 `api/cache.ts` + `state/db.ts`** (§6.7, §5).
→ *Verify every pinned cell key, the 15-minute TTL, the 24 h stale fallback, the 200-row prune, and that `−179.9` and `180.1` map to one cell.*

**2b.3 Mount globe.gl in the cradle** (§6.9). Lazy `import()` after first paint, `earth-day.jpg` first, click → pin → fly-to → ripple, damping, idle auto-rotate, `visibilitychange` pause, `webglcontextlost` → the SVG globe.
→ *Verify context loss shows the "bearings seized" tag and re-seating mounts a **new** `<canvas>`; verify **exactly one** forecast request per pour under React 19 StrictMode.*

**2b.4 Expose the `window.__bar` test hook** — only when `import.meta.env.MODE === 'test'`: `freeze()`, `pour(lat, lng)`, `textures('flat')`.
→ *Verify `grep __bar dist/assets/*.js` is empty in a production build and the hook exists in the test build.*

**2b.5 `features/verdict/pour.ts` — the orchestrator.** Pin + fly immediately; blank coaster within 100 ms; `locate()` and `getWeather()` in parallel; `judge()`; write to Zustand and Dexie; update the route to `#/v/lat,lng`.
→ *Verify end to end: skeleton ≤ 100 ms, printed coaster ≤ 2 s, URL updated, dial SOUP, rum bottle picked, `html[data-shift=night]`.*

**2b.6 Wire the coaster, dial, bottle and shift to the verdict.** Replace the hard-coded object with the store; derive `data-shift`; set `--grade` / `--stamp` / `--drink-glow` on `:root`.
→ *Verify Reykjavík produces the Day shift with the neon off and `--bg` computing to `rgb(239, 227, 204)`.*

**2b.7 Recipe flip and Barista flip** (§4.3, §4.4).
→ *Verify the barista flip re-prints with the twin **without** re-scoring and **without** replaying the slide, and that the choice persists across a reload.*

**2b.8 The Tab** (§4.6).
→ *Verify a row tap under 15 minutes old re-prints with **zero** network requests, and that 16 minutes later it makes exactly one forecast request and shows the "re-poured" tag.*

**2b.9 The Back Office** (§4.7).
→ *Verify a °F switch re-renders the receipt strip with **no** refetch (assert via a fetch spy).*

**2b.10 Deep links and error coasters** (§4.9, §7.5).
→ *Verify `#/v/999,999` prints "Nowhere on Earth has those coordinates. Impressive." and the 429 path disables RETRY for 60 s with a visible countdown.*

**2b.11 PWA and offline** (§11.1).
→ *Verify a cold offline boot renders the bar and reopens the last verdict, and that the install prompt appears in Chrome on the deployed URL.*

**Phase 2 is done when:** clicking anywhere on the globe produces a deterministic verdict in under 2 s (p50 < 1.2 s); all nine fixtures pass table-driven; engine coverage ≥ 95 % with 100 % on `comfort`, `tags`, `score`, `geocode` and `cache`; the Tab, Back Office, deep links, error states and the PWA all work.

### Phase 3 — Polish: motion, weather, sound, the register (~26 h)

**3.1 A1 + A2 + A3** — the slide, the pin, the fly.
→ *Verify no frame exceeds 32 ms during the 620 ms slide on desktop and that the printed coaster replaces the skeleton in the **same DOM node** (hold a ref).*

**3.2 A4 + A5** — bottle nod and dial swing.
→ *Verify the dial's `aria-valuetext` updates **once**, after the swing settles, not per frame, and that both animations start in the same frame as the slide.*

**3.3 A7 + A8** — coaster flip and shift change.
→ *Verify the Day-shift computed colours pass **after** the transition completes and that there is no flash of the wrong palette on first paint.*

**3.4 Window weather layers** (§3.11) — droplets, three rain speeds, snow, fog, glare.
→ *Verify the bounding-box rule still holds and desktop idle stays ≥ 55 fps with a layer active.*

**3.5 A10 frost creep and A11 lightning.**
→ *Verify Yakutsk shows the frost layer, nothing flashes above 3 Hz, and under reduced motion the lightning is a static 300 ms brightness step.*

**3.6 A9 ice drop, steam wisps, condensation ring.**
→ *Verify iced verdicts show exactly three cubes, hot verdicts show wisps and no cubes, and both appear in place under reduced motion.*

**3.7 The register: ticker and A6 print** (§6.9, §4.5).
→ *Verify the ticker regex matches, long-press pauses it, and every receipt line is ≤ 32 characters across all fixtures.*

**3.8 Tear-off and the share card** (§3.10.5).
→ *Verify the decoded PNG is **1080×1350**, its top-left 8×8 average is mahogany ± 8 and its centre is paper ± 8, and it carries the Open-Meteo / CAMS / DWD credits.*

**3.9 Sound** (§3.13).
→ *Verify silence until the first gesture, every CC0 file listed in both attribution places, and the mute lever silencing beds and one-shots alike.*

**3.10 The reduced-motion pass.** Walk §3.9's reduced-motion paragraph line by line.
→ *Verify `prefers-reduced-motion: reduce` and the Back Office `Motion: less` lever produce the **identical** DOM.*

**3.11 The second opinion.** Swipe-left / keyboard cycles `runnersUp` and re-prints.
→ *Verify it never fires a network request and that the stamp and glassware update with the new drink.*

**3.12 The texture upgrade.** `MAX_TEXTURE_SIZE` probe → 8K desktop / 4K Android; Blue Marble by month with a fallback; Black Marble on the night side; dispose the small texture after the swap.
→ *Verify total texture payload ≤ 10 MB with each file ≤ 3 MB, JS heap growth < 15 MB over 20 pours, and that a device reporting < 4096 skips the 4K path entirely.*

**3.13 Search and Where-am-I** (§4.1, §7.4).
→ *Verify **zero** requests to `bigdatacloud` / `api-bdc.io` on the Where-am-I path and that both controls are disabled with a tooltip when offline.*

### Phase 4 — Android packaging (~11 h, optional tier)

**4.1 Finish the platform adapters** (§8.5) — each with a web branch and a Capacitor branch, each with a jsdom unit test mocking Capacitor both ways.
→ *Verify no SW registration on native.*

**4.2 Wire the haptics map** (§3.13).
→ *Verify on the phone; the Back Office lever **and** the system setting each suppress everything.*

**4.3 Native share** (§8.1).
→ *Verify the share sheet receives a 1080×1350 PNG named `globe-bar-<place>-<date>.png` and that cancelling returns to the register with the stub intact.*

**4.4 Status bar, splash and icons** (§3.15, §8.7).
→ *Verify the splash is `#1A0F0A` with the brass pin only, the adaptive icon shows the pin-on-coaster, and the status-bar style flips with the shift.*

**4.5 Gestures and insets** (§8.6).
→ *Verify predictive back closes sheets before leaving a route and that a drag from within 24 px of the left edge does **not** trigger the system back gesture.*

**4.6 The Android build variant.** `VITE_PLATFORM=android` selects 4K textures and DPR 1.5; `VITE_BASE_PATH=/`; the WebLLM rung is hidden.
→ *Verify `MAX_TEXTURE_SIZE ≥ 4096`, DPR 1.5, and **no** 8K WebP inside the APK.*

**4.7 Tag-driven release** (§11.4).
→ *Verify `git tag v0.9.0 && git push origin v0.9.0` produces a Release whose APK installs **over** the 0.16 build (same key, higher `versionCode`) and whose SHA-256 matches.*

**4.8 Run the full manual device checklist** (§10.10).
→ *Verify every box is ticked or explicitly waived with a written reason, and that 20 consecutive pours show no context loss and a stable heap.*

### Phase 5 — Testing, hardening, launch (~20 h)

**5.1 Close the unit gates** — ≥ 95 % lines on `src/engine` with **100 %** on `comfort.ts`, `tags.ts`, `score.ts`, `geocode.ts`, `cache.ts`; review and re-approve every wit snapshot.
**5.2 Complete the e2e suite** — all of §10.6, `page.clock` pinned, Open-Meteo always routed to fixtures. → *Green three consecutive CI runs; flake budget zero.*
**5.3 Re-approve the visual suite** against the finished, animated build, plus the reduced-motion variant.
**5.4 Accessibility sign-off** — automated axe, then manual NVDA + Chrome on desktop, TalkBack on the phone, 130 % system font, 200 % zoom.
**5.5 Performance gates** — every row of §10.8, plus a Lighthouse assertion **and** a custom audit proving the LCP element is the neon `<svg>`/plate rather than the canvas.
**5.6 Privacy, licence and CSP gates** — every row of §10.9.
**5.7 Offline and update-flow verification** — including a real two-reload update test on the deployed site.
**5.8 Walk the deployment doc end to end** against the real repo; every command in §11 has been run at least once and produced the documented result.
**5.9 Close the day-1 list** (§9.7) and refresh the live probe.
**5.10 Launch.** README status → Live, release notes, `git tag v1.0.0`.

### Phase 6 — Stretch (unordered; none may break the release gate)

R3F shader globe behind the same `globeMaterial` seam (day/night terminator, city lights, specular oceans, cloud shell, Fresnel halo, bloom) with a one-line revert to globe.gl · wit rung 1 (keyless Cloudflare Workers AI through a Worker, fail-open to rung 0) · wit rung 2 (BYO free Gemini / OpenRouter `:free` / Groq key in a WebCrypto vault, "session only" by default) · wit rung 3 (WebLLM on desktop WebGPU, hidden on Android) · the Nominatim precision lever · 60+ drinks with a twin for every cocktail and all nine glassware SVGs · seasonal specials · a gentler and a multilingual bartender · a PWA→TWA build as an alternative to Capacitor.

### The Weekend MVP fast path (~11 h)

The shortest route to *"I clicked Mumbai and a bartender insulted me."* No Android, no sound, no window weather, no PWA.

**Saturday (~6 h):** 0.1 scaffold · 0.2 toolchain · 0.3 base path + router (60 min) → 0.4 tokens + fonts + neon hello-world (45 min) → **0.5 `pages.yml`, the URL is live (30 min) — stop here if the day dies** → 0.9 `prep-geo.mjs` (60 min) → 0.10 `prep-drinks.mjs` (45 min) → 2a.1 the `mumbai`, `yakutsk` and `reykjavik` fixtures only (30 min) → 2a.2 `comfort.ts` + tests (45 min) → 2a.3 `tags.ts` + tests (60 min).

**Sunday (~5 h):** 2a.7 a **10-drink** menu (5 cocktails, 5 mocktails) instead of 40, with the coverage rule relaxed to the tags the three MVP fixtures actually raise (45 min) → 2a.8 `score.ts` + `pick.ts` (45 min) → 2a.9/2a.10 a **3-tag** `voice.json` (`oppressive`, `arctic`, `rain`) with 8 jabs each + `tracery.ts` (60 min) → 2a.6 `geocode/` with countries + nearest city only, marine deferred (45 min) → 2b.1/2b.2 `openMeteo.ts` + the in-memory half of the cache (45 min) → 2b.3 globe.gl with `earth-day.jpg`, click and fly-to (45 min) → 2b.5 `pour.ts` + a plain unanimated coaster (60 min).

**Acceptance:** on the live URL, clicking Mumbai prints a coaster naming a place, a local time, a jab, a stamp and an **iced** drink within 2 s; clicking Yakutsk prints a **hot dark-rum** drink; `npm run test:unit` is green. Deliberately absent: Dexie, the Tab, the Back Office, the register, sound, window weather, motion, the PWA, Android, the marine lookup and 20 of the 30 drinks.

### 9.7 The day-1 verification list

Run these on day 1 and record the date and result next to each. Anything that fails changes the design **before** feature work.

| # | Claim to verify | How |
|---|---|---|
| D1-1 | Open-Meteo forecast/AQI/marine still return `access-control-allow-origin: *` **from the real Pages origin** | `curl -sI -H "Origin: https://<owner>.github.io" …` plus DevTools on the phone |
| D1-2 | `timezone=auto` for 15°N 65°E and 0°,−140° — pin both strings into the fixtures | `curl` both |
| D1-3 | Marine API returns real numbers (not `null`) for coastal/lake points such as the Caspian (42, 51); decide whether the Caspian is `ocean` | `curl marine-api…latitude=42&longitude=51` |
| D1-4 | Natural Earth marine polygon `name` at (15, 65) = "Arabian Sea", (0, −140) = North/South Pacific, (42, 51) = "Caspian Sea"; pin the exact Mumbai `distanceKm` | a Node script over `public/geo/*` |
| D1-5 | `npx cap add android` succeeds with **no** JDK/SDK locally | run it |
| D1-6 | Temurin 21 + AGP 8.13 + Gradle 8.14.3 build a signed APK on `ubuntu-24.04` | `workflow_dispatch` |
| D1-7 | three-globe example-texture licence is acceptable for redistribution, or switch to NASA originals | read the repo LICENSE and `example/img` provenance |
| D1-8 | No PlanetPixelEmporium texture was pulled in transitively | grep `dist/` |
| D1-9 | The three Fontsource packages exist and ship the needed subsets/weights | `npm view <pkg> version` |
| D1-10 | `suncalc@2.0.2` imports as ESM under Vite/Vitest and the scanner exclusion holds | `npm run check:licenses` |
| D1-11 | `actions/setup-node@v7` accepts `cache: npm` (else drop it, +40 s build) | the first `pages.yml` run log |
| D1-12 | Polar `timezone=auto` results are acceptable for the copy — keep the `approximate` hedge | judgement call after seeing the copy |
| D1-13 | globe.gl `onGlobeClick` survives React 19 StrictMode double-mount | the one-request-per-pour e2e assertion |
| D1-14 | `gl.MAX_TEXTURE_SIZE ≥ 4096` in the phone's WebView; 4K WebP decodes without context loss | `chrome://inspect` on the debug APK |
| D1-15 | WebGPU absent in Android System WebView (so the WebLLM rung stays hidden) | `'gpu' in navigator` on the debug APK |
| D1-16 | Capacitor 8 predictive back fires `@capacitor/app` `backButton` on Android 16 | the device checklist |
| D1-17 | Natural Earth raster (NE1/NE2) usability for a stylised globe skin | **N/A — stretch only (Phase 6), deliberately deferred; it does not gate the release** |
| D1-18 | No `timeapi.io` code path exists | `grep -r timeapi.io src dist` |
| D1-19 | A Mumbai (land) pour costs ≤ 3 weighted calls and an Arabian-Sea pour ≤ 4; `seedrandom` on the three §6.5 seeds returns 0.320658 / 0.065045 / 0.993421 | DevTools + node |
| D1-20 | Pages serves `manifest.webmanifest` and `sw.js` under `/barometer/` with correct MIME types; PWA installable on Chrome desktop and Android | `curl -I`, Lighthouse |

---

## 10. Testing requirements

Nothing is "done" until the tests below exist and are green.

### 10.1 Tooling and scripts

```json
{
  "test": "vitest",
  "test:unit": "vitest run --coverage",
  "test:wit": "vitest run src/wit",
  "test:e2e": "playwright test --grep-invert @live",
  "test:live": "playwright test --grep @live",
  "test:visual": "playwright test e2e/visual",
  "test:visual:update": "playwright test e2e/visual --update-snapshots",
  "test:a11y": "playwright test e2e/a11y.spec.ts",
  "test:perf": "playwright test e2e/perf && lhci autorun",
  "check:licenses": "license-checker-rseidelsohn --production --onlyAllow 'MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC;MPL-2.0;Zlib;CC0-1.0;Unlicense;0BSD;CC-BY-4.0' --excludePackages 'suncalc@2.0.2'",
  "check:bundle": "node scripts/check-bundle.mjs",
  "check:menu": "node scripts/check-menu.mjs",
  "test:all": "npm run check:menu && npm run test:unit && npm run check:licenses && npm run build && npm run check:bundle && npm run test:e2e"
}
```

Playwright runs Chromium desktop 1440×900 plus a "Pixel 7" profile, launched with `--use-gl=angle --use-angle=swiftshader` so globe.gl gets a WebGL context headless.

**Determinism rules — all mandatory:**

- The house instant is **2026-09-06T00:45 Asia/Kolkata** = `2026-09-05T19:15:00Z` = epoch `1788635700`. Engine tests pass `now` explicitly; Playwright runs `await page.clock.install({ time: new Date('2026-09-05T19:15:00Z') })` **before** navigation.
- Process timezone pinned: `TZ=Asia/Kolkata` in `vitest.config.ts` and `timezoneId: 'Asia/Kolkata'` in `playwright.config.ts`. One test proves the engine ignores it entirely by re-running a fixture under `TZ=UTC`.
- Seeds are pinned; drink picks and Tracery lines are committed as snapshots after the first green run — **pin, then guard**.
- globe.gl is non-deterministic, so test builds expose `window.__bar`: `freeze()` (stop auto-rotate, pin `pointOfView({lat:0,lng:0,altitude:2.5})`), `pour(lat,lng)` (the same code path as `onGlobeClick`), `textures('flat')` (force `earth-day.jpg`, disable the Blue Marble swap). Visual tests also `mask: [canvas]`.
- Sound is muted in tests; Howler is stubbed in jsdom.
- **Open-Meteo is always mocked in CI** via `page.route`. Never hit the live API from a test — it is non-commercial, rate-limited and non-deterministic. Only the `@live` weekly probe touches it.

### 10.2 The golden fixtures (C5 — this roster and no other)

Each is a `{ forecast, airQuality, marine? }` triple in the **exact** shape the live API returns, in `src/test/fixtures/openmeteo/`.

| Fixture | lat, lng | timezone / offset | `current.time` | temp / RH / **apparent** / dew | wind / gusts | wmo | is_day | AQI EU/US | extra |
|---|---|---|---|---|---|---|---|---|---|
| `mumbai` | 19.07, 72.88 | `Asia/Kolkata` / 19800 | `2026-09-06T00:45` | 25.4 / 94 / **31.5** / 24.4 | 1.9 / 2.9 | 51 drizzle | 0 | 34 / 55 | cloud 100, precip 0.10, uv 0 |
| `yakutsk` | 62.03, 129.73 | `Asia/Yakutsk` / 32400 | `2026-01-14T03:10` | −41.0 / 78 / **−48.7** / −44.2 | 5.5 / 9.0 | 71 light snow | 0 | 18 / 40 | uv 0, sunrise 10:12, sunset 15:40 |
| `reykjavik` | 64.13, −21.90 | `Atlantic/Reykjavik` / 0 | `2026-09-06T14:30` | 6.0 / 80 / **2.1** / 2.8 | 21.0 / 38.0 | 61 rain | 1 | 12 / 20 | uv 2, sunrise 06:25, sunset 20:12 |
| `dubai-noon` | 25.20, 55.27 | `Asia/Dubai` / 14400 | `2026-07-20T12:30` | 43.0 / 20 / **45.8** / 15.4 | 14.0 / 25.0 | 0 clear | 1 | 78 / 152 | uv 11, dust 140 |
| `arabian-sea` | 15.00, 65.00 | *(pin on day 1)* / 19800 | `2026-09-06T00:45` | 29.0 / 82 / **33.6** / 25.6 | 24.0 / 33.0 | 3 overcast | 0 | 22 / 40 | **marine**: wave 2.4, SST 28.9 |
| `south-pole` | −89.9, 0 | `Antarctica/McMurdo` / 43200 | `2026-09-06T07:15` | −58.0 / 60 / **−66.1** / −63.0 | 12.0 / 16.0 | 0 | 0 | AQI returns nulls | polar night; `daily.sunrise` empty string |
| `denver-hail` | 39.74, −104.99 | `America/Denver` / −21600 | `2026-06-15T16:40` | 27.0 / 55 / **27.6** / 17.3 | 45.0 / 78.0 | 96 storm + hail | 1 | 30 / 48 | uv 7, precip prob 90 |
| `lisbon-golden` | 38.72, −9.14 | `Europe/Lisbon` / 3600 | `2026-09-06T19:35` | 24.0 / 60 / **24.3** / 15.8 | 18.0 / 26.0 | 1 | 1 | 25 / 42 | sunset 19:58 → golden hour |
| `oslo-brunch` | 59.91, 10.75 | `Europe/Oslo` / 7200 | `2026-09-06T10:40` (Sunday) | 12.0 / 70 / **10.9** / 6.7 | 9.0 / 14.0 | 2 | 1 | 15 / 25 | weekend brunch window |
| `error-429` | any | — | — | HTTP 429, body `{"error":true,"reason":"Minutely API request limit exceeded"}` | | | | | rate-limit coaster |
| `error-network` | any | — | — | `page.route` aborts with `failed` | | | | | "models not answering" coaster |

Geo fixtures live in `src/test/fixtures/geo/` as trimmed extracts covering only the features the §6.8 points touch (India, Fiji, Russia, Lesotho, South Africa, Iceland, Antarctica, Norway, UAE, Portugal, USA, Kiribati; ~40 places; Arabian Sea, South Pacific and Caspian polygons). A `menu.mini.json` five-drink fixture supports hand-checkable scoring, and a `menu.tie.json` supports the repeat-penalty order-flip test.

*If a test disagrees with a golden value, suspect the code first, then the golden — and record any correction in this file.*

### 10.3 Unit tests — `src/engine/**`

One file per module, table-driven. Cover:

- **comfort** — every row of §6.1's golden table to ±0.1; `applies: false` for Mumbai returning the simple value and never `NaN`; `dew > temp` returns a number with `suspicious: true` and no throw; `rh = 0` → `null`; `rh = 100` → `t`; unknown WMO `42` → `'unknown'`; `null` AQI → `'unknown'`.
- **tags** — one test per fixture asserting the exact tag **set** and the driving tag; every boundary in §6.3; exactly one day-part tag per fixture (a property test).
- **dial** — all seven ring positions and angles; Mumbai's full object including `aria-valuetext`; `denver-hail` sitting at FAIR while its stamp is the danger tier; the no-data case.
- **daypart** — every fixture; the `TZ=UTC` invariance test; dawn window edges; Sunday-vs-Monday brunch; the polar clock-only path with `polarApproximateTime`; the barista-suggestion rule including "late overrides".
- **score / pick** — the two worked tables of §6.5 exactly; barista filtering; the repeat penalty flipping order only when the margin is under 2; determinism across repeat calls; seed neighbourhood behaviour; the weighted **85 / 11 / 4** draw over 1,000 seeds landing on index 0 in 85 % ± 3 %, index 1 in 11 % ± 3 % and index 2 in 4 % ± 2 % of them, with negative-score drinks never drawn; `seedrandom('19.1|72.9|0|bar')() === 0.320658…` (< 0.85 ⇒ Mumbai's pick is the Mojito, not a 15 % gamble); the virgin-twin path including "no twin"; the ocean rule forcing a marine drink; the gentler lever downgrading tier 2 → 1; a committed snapshot of all nine fixtures × {bar, barista}.
- **wit** — for every fixture × mode × 50 seeds the output has no `#`, no `((`/`))`, no double spaces, ≤ 260 characters, terminal punctuation, the drink name exactly once and the stamp marked with `«»`; ≥ 8 variants per pool; determinism per seed; hedge lines when `precipitation_probability ≤ 60` and a precip tag is present; the deny-list lint; a committed snapshot; and — for any future LLM rung — `garnish(text)` falling back to the rung-0 text unchanged on timeout, non-200, empty body, output > 2× input length, or output missing the drink name.
- **cache** — every pinned key and bucket; the TTL; the LRU/prune behaviour; marine sub-field reuse.
- **openMeteo** — URL builders byte-for-byte; the weighting guard; 2 requests for land and 3 for ocean; a failed AQI not failing the verdict but a failed forecast doing so; local-time parsing; `is_day` coercion; `null` → `undefined`; the two error types with `retryAfterMs`; and an allow-list assertion that no request ever targets `bigdatacloud`, `api-bdc.io`, `thecocktaildb.com` or `timeapi.io`.
- **geocode** — all twelve §6.8 rows (distances ±5 %); the index build under 30 ms; the `lng, lat` argument-order test; the `ISO_A2 === '-99'` fallback chain; the capital flag.
- **units / receipt / ticker** — `fmtTemp(31.5,'C') === '31.5°'`, `fmtTemp(31.5,'F') === '88.7°'`, `fmtTemp(−48.7,'C') === '−48.7°'` **with U+2212**; `fmtWind(1.9,…)` → `'2 km/h'` / `'1 mph'` / `'1 kn'`; the exact Mumbai receipt line list (note the receipt uses **US AQI 55** while the coaster shows the EU band — both are labelled); the ocean receipt adding `SST 28.9°`, `WAVES 2.4 M` and `· DWD`; **every line ≤ 32 characters** as a property over all fixtures; the ticker crossing computed by `solar-calculator` and cross-checked against a brute-force `suncalc` altitude≈0 search to ±2 min.
- **Tab repo** (with `fake-indexeddb`) — schema and newest-first listing; export → import round-trip with ids re-assigned and `createdAt` preserved; `app !== 'barometer'` rejected with `WrongTabError`; staleness at > 15 min; `clear()`; two Dexie instances seeing each other's inserts via `liveQuery`.

**Coverage gates:** ≥ 95 % lines on `src/engine`, **100 %** on `comfort.ts`, `tags.ts`, `score.ts`, `geocode.ts`, `cache.ts`. Enforced in `vitest.config.ts`; the build fails below them.

### 10.4 Component tests (Testing Library, jsdom)

Coaster skeleton → printed **in the same node** (hold a ref) with the stamp rendered in a `Righteous`, uppercase, `rotate(-4deg)` element and the live-region announcement firing once · coaster flip via click, Enter and Escape · the neon switch's role, name, state, persistence and Space key · barista re-print without replaying the slide · the barista suggestion tag appearing for Oslo and not for Reykjavík · the dial as `role="meter"` with tabular figures and an `onOpenReceipt` tap · 12 bottle buttons with picked/dimmed classes and ≥ 44×44 hit areas · window layers mounting per grade family, with `data-static="true"` under mocked reduced motion · the lever and knob roles and keyboard steps · the search debounce, brass result rows, Enter-to-pour and "Never heard of it." · the tab row layout and stale tag · the receipt as a `<table>` with row headers, a named TEAR button and a stub after tearing · all three error coasters including the 60 s countdown · a °F switch re-rendering without a refetch · `data-shift` derivation from `is_day` with the Back Office pin overriding.

### 10.5 What the e2e suite must prove

`e2e/fixtures/routes.ts` routes the four Open-Meteo hosts to fixture JSON keyed by the rounded `latitude`/`longitude`, and installs a **catch-all `page.route('**', abort)` last** so any other third-party host fails the test.

The Bar loads with the neon wordmark visible **before** the canvas mounts · pouring Mumbai gives a skeleton within 100 ms and a printed coaster within 2 s with the right URL, stamp, drink, dial, shift, picked bottle, droplet layer and printed receipt · a Yakutsk deep link prints a hot drink with the frost layer and the night shift · `#/v/999,999` prints the "Nowhere on Earth" coaster with a working "Back to the bar" plate · an ocean pour makes exactly 3 fixture requests and prints the Arabian Sea copy, the ocean drink, `SST 28.9°` and `DWD` · Reykjavík switches to the Day shift with the neon off and `--bg` = `rgb(239,227,204)` · the recipe flip and the virgin swap · the barista flip dimming ≥ 6 spirits, lighting the tea tin, re-printing, and persisting across a reload · the tear producing a decoded 1080×1350 PNG (and `share()` receiving one `image/png` file on the Pixel profile) · the Tab's zero-request re-pour and its 16-minutes-later single-request "re-poured" branch, plus export and clear-with-confirm · the Back Office units, shift pin, motion lever and the AI key field being `type=password` with nothing written to `localStorage` in session-only mode · the search flow · both error paths with RETRY behaviour · the keyboard map and tab order · the no-WebGL path via a stubbed `getContext` · context loss and re-seating · Where-am-I with granted geolocation resolving **offline** with zero requests to any geocoder · and a weekly `@live` probe (skipped unless `LIVE=1`) confirming the three hosts still answer 200 with `access-control-allow-origin: *` from the deployed origin.

### 10.6 Offline / PWA tests

First load online, then offline+reload renders the shell, prints "NO SIGNAL · SERVING FROM THE TAB", flickers the neon once, disables search and Where-am-I with tooltips, and still opens the last verdict · an offline pour prints the error coaster with no hanging skeleton beyond 4 s · the precache manifest contains the shell, `tokens.css`, the three woff2 files, `earth-day.jpg`, `earth-topology.png`, `earth-water.png`, `night-sky.png`, the four `geo/*.json` files (110 m countries, places, marine, land-dots), the data JSON and the sound sprite — and **does not** contain the 4K/8K WebP or `countries-50m.json` · `start_url` and `scope` both equal `import.meta.env.BASE_URL`, `display: standalone`, `theme_color` and `background_color` `#1A0F0A`, icons 192/512 + maskable 1024 · the update flow shows the brass "New bottles in stock. Restock?" prompt and never hard-reloads mid-verdict · a same-cell same-bucket offline pour prints from cache with zero requests · and the SW is **not** registered under Capacitor.

### 10.7 Visual tests and token assertions

Baselines are generated on **Linux Chromium in CI only** (Windows runs use `--update-snapshots` locally to eyeball, never to commit). `maxDiffPixelRatio: 0.01`, `animations: 'disabled'`, clock frozen, `window.__bar.freeze()` + `textures('flat')`, the globe canvas **masked**, fonts awaited via `document.fonts.ready`.

**States** (each at 1440×900 and Pixel 7, Night and Day where applicable): The Bar empty · The Verdict Mumbai (Night) · The Verdict Reykjavík (Day) · Recipe flip · Barista on · Register receipt · The Tab with 3 rows · Back Office · the 429 error coaster · the ocean coaster · the reduced-motion Verdict (which must equal the normal Verdict's final frame ±0.5 %).

**Computed-style assertions** (not screenshots):

| Element | Property | Night | Day |
|---|---|---|---|
| `body` | `background-color` | `rgb(26,15,10)` | `rgb(239,227,204)` |
| `.coaster.paper` | `background-color` / `color` | `rgb(243,230,200)` / `rgb(28,18,12)` | `rgb(251,244,228)` / `rgb(28,18,12)` |
| `.stamp` (Mumbai) | `color` | `rgb(31,110,123)` | same |
| `.stamp` (Denver) | `color` | `rgb(160,40,31)` | same |
| `.neon` | `-webkit-text-stroke-color` / `filter` | `rgb(255,179,71)` / contains `drop-shadow` | `rgb(232,183,160)` / `none` |
| `.plate--button` | `color` on brass | `rgb(26,15,10)` | `rgb(251,244,228)` |
| `:focus-visible` | `outline` | `2px solid rgb(245,200,96)`, offset 2px | `2px solid rgb(122,90,18)` |
| `.coaster__drink` | `font-family` / `font-size` | `Righteous` / ≥ 44 px desktop, ≥ 36 px phone | |
| `.jab .intensifier` | `font-family`, `text-transform`, `vertical-align` | `Righteous`, `uppercase`, `-0.08em` | |
| `.receipt` | `font-family`, `font-variant-numeric` | JetBrains Mono, `tabular-nums` | |
| any text on `.counter` | `color` ∈ | {`--ink`, `--ink-muted`, `--accent`} only | Day: `--ink` only on oak |
| `.window .wx` | bounding box | entirely inside `.window`; **never intersects `.coaster`** | |

**The signature test:** for **every** screenshot state, at least one of `.bottle`, `.coaster-ring`, `.pin`, `.neon` is inside the viewport with `opacity > 0.5`. *If a screenshot could be mistaken for a weather app, it fails.*

**Motion timing** (`animations: 'allow'`): the coaster slide finishes in 560–700 ms and lands with a measurable overshoot (`translateX` crosses 0 and returns by ≥ 4 px); the dial swing is 600 ms ± 60; the receipt prints 9 lines at 60 ms stagger (first→last ≈ 480 ms); the lightning shows one white layer at ≥ 0.85 opacity for ≤ 100 ms and never twice within 1 s; under reduced motion none of these run and the coaster appears within 250 ms.

### 10.8 Performance budgets (every row is a CI gate)

| Metric | Budget |
|---|---|
| **Initial JS (route `#/`, excluding the globe chunk), gzip** | **≤ 180 KB** (C3 — hard) |
| Globe chunk (`three` + `globe.gl` + `three-globe`), gzip, lazy | ≤ 320 KB |
| Geo data (110 m countries + places + 50 m marine), gzip | ≤ 900 KB; the lazy 50 m countries ≤ 1.2 MB |
| Drinks + voice JSON, gzip | ≤ 150 KB |
| First-paint textures | `earth-day.jpg` ≤ 260 KB; bump + specular ≤ 850 KB |
| Full textures | ≤ 10 MB total, each ≤ 3 MB |
| Total `dist/` | ≤ 25 MB |
| Precache total | ≤ 12 MB |
| LCP (mobile, Slow 4G) | ≤ 2.5 s **and the LCP element is the neon `<svg>`/plate, not the canvas** |
| TTI / TBT (mobile) | ≤ 4.5 s / ≤ 300 ms |
| Click → skeleton coaster | ≤ 100 ms |
| Click → printed coaster (mocked network) | ≤ 1.6 s |
| Reverse geocode | ≤ 20 ms p95 (110 m); ≤ 60 ms (50 m) |
| tags + score + pick + speak | ≤ 5 ms |
| kdbush index build | ≤ 30 ms |
| Globe idle FPS | ≥ 55 desktop; ≥ 30 on the Pixel 7 profile (measured on a real device, not SwiftShader) |
| Coaster slide | no frame > 32 ms during the 620 ms slide (desktop) |
| Memory | no `webglcontextlost` within 20 pours; JS heap growth < 15 MB over 20 pours |
| Open-Meteo weighted calls per pour | **≤ 3 for a land pour, ≤ 4 for a marine (ocean) pour** |
| Lighthouse PWA | manifest + SW valid, maskable icon present, installable |

Measure on `vite preview --base /barometer/` with Playwright throttling (Slow 4G + 4× CPU for mobile numbers; desktop unthrottled). `scripts/check-bundle.mjs` reads the `rollup-plugin-visualizer` JSON and fails the build on any breach.

### 10.9 Security, privacy and licence checks

- `dist/**` contains no string matching `/AIza[0-9A-Za-z_-]{30,}/` or `/sk-[A-Za-z0-9]{20,}/`, and no `bigdatacloud`, `api-bdc.io`, `thecocktaildb`, `timeapi.io`, `planetpixelemporium` or `teijo/iba-cocktails`.
- `index.html` carries the CSP meta tag of §11.1; an e2e test confirms a `fetch('https://example.com')` from the page is **blocked**.
- **No request leaves the page on load**, before any pour, except same-origin assets.
- A BYO key (if the stretch rung ships) never appears in plaintext in `localStorage` or `sessionStorage`; "session only" leaves nothing after the context closes.
- `npm run check:licenses` passes with the §10.1 allow-list and only the documented `suncalc@2.0.2` exclusion; `gsap` is not a production dependency; nothing GPL is present.
- `attribution.json` ↔ the About screen ↔ the README table match three ways.
- If the Nominatim lever ships: every request is throttled ≥ 1.1 s, cached, and the toggle is off in a fresh profile.

### 10.10 Manual Android checklist (before every `v*` tag, if the APK tier ships)

Run on the owner's phone with a `workflow_dispatch` APK built with `CAP_WEBVIEW_DEBUG: '1'`, driven from desktop `chrome://inspect#devices` — **no `adb` needed**. Barometer has no camera, gallery, notification or alarm features, so those sections are absent by design.

**Install & first run:** installs over the previous version (same key, higher `versionCode`) with only Chrome's one-time "install unknown apps" prompt · splash is `#1A0F0A` with the brass pin only, adaptive icon shows the pin-on-coaster, themed icon is brass on mahogany · cold start to neon visible ≤ 2.5 s with **no white flash** · **no service worker registered**.
**Globe / WebGL:** 4K textures (not 8K), `MAX_TEXTURE_SIZE ≥ 4096`, DPR 1.5 · flick spins ~2.5 turns with damping, idle drift after 8 s, stops on touch · tap → pin + ripple + fly at ≥ 30 fps · 20 consecutive pours with no context loss, no crash, a stable heap · backgrounding 30 s pauses and resumes correctly · a forced low-end profile shows the clickable SVG fallback.
**Gestures & navigation:** predictive back closes the Back Office, then the Tab, then goes `#/v/…` → `#/`, then exits · dragging the globe from within 24 px of the left edge does **not** trigger the system back gesture · the counter sheet drags without fighting the nav-bar swipe · coaster swipe-left gives the second opinion; a ≥ 56 px receipt pull tears · long-press pauses the ticker.
**Rotation & insets:** portrait ↔ landscape resizes the globe with the cradle staying registered and **no verdict lost and no refetch** · mahogany runs under the status bar with correct inset padding and the status-bar style flipping with the shift · the ≥ 600 dp tablet/foldable layout works.
**Haptics & sound:** the full §3.13 map fires · the Back Office lever **and** the system touch-feedback setting each suppress everything · silence until the first touch, then the bar sounds; the neon buzz only on Night; the rain bed's cutoff rising with wind; audio ducking for a call and resuming.
**Permissions:** nothing is requested at launch; "Where am I" prompts for location; denial shows the brass toast; acceptance pours via the **offline** lookup with **no** network geocoder call; revoking re-prompts once then degrades.
**Share, storage, network:** TEAR opens the share sheet with a 1080×1350 PNG · settings persist across a force-stop and the Tab persists across an app update · Tab export/import via the share sheet and Files · airplane mode shows "NO SIGNAL", a new pour prints the error coaster, and RETRY works once back online · a real pour on mobile data completes in ≤ 3 s (the WebView sends `Origin: https://localhost` and Open-Meteo's `*` honours it).
**Text & a11y on device:** 130 % system font reflows the coaster with the drink name wrapping rather than clipping · TalkBack reaches sign → dial → bottles → coaster → buttons and announces the verdict once · the system "Remove animations" setting takes the reduced-motion path.
**Release sanity:** About shows the version from the tag plus the attribution block · the Release's `SHA256SUMS.txt` matches the downloaded APK.

---

## 11. Deployment

Three independent pipelines, none of which costs anything:

| Target | Artifact | Trigger | Lands at |
|---|---|---|---|
| **Web (PWA)** — the product | `dist/` built with `VITE_BASE_PATH=/barometer/` | push to `main` | `https://<owner>.github.io/barometer/` |
| **Android (optional)** — the same `dist/` in a Capacitor shell (`VITE_BASE_PATH=/`) | signed `barometer-<version>.apk` | push tag `v*` | GitHub Releases → sideload |
| **Cloudflare Worker (stretch only)** — keyless Workers AI paraphrase | `worker/` | push to `main` touching `worker/**` | `https://barometer-wit.<subdomain>.workers.dev` |

### 11.1 `vite.config.ts`, the base path, PWA scope and CSP

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';
import pkg from './package.json' with { type: 'json' };
import { execSync } from 'node:child_process';

const base = process.env.VITE_BASE_PATH ?? '/';   // "/barometer/" on Pages, "/" locally and in the APK
const sha = (() => { try { return execSync('git rev-parse --short HEAD').toString().trim(); }
                     catch { return 'dev'; } })();

export default defineConfig({
  base,
  define: { __APP_VERSION__: JSON.stringify(`${pkg.version}+${sha}`) },
  plugins: [
    react(),
    tailwindcss(),
    visualizer({ filename: 'dist/stats.json', template: 'raw-data', gzipSize: true }),
    VitePWA({
      registerType: 'prompt',            // brass tag: "New bottles in stock. Restock?"
      injectRegister: null,              // registered by hand, web only (see below)
      manifest: {
        name: 'The Globe Bar',
        short_name: 'Globe Bar',
        description: 'Click anywhere on Earth. Get judged. Get a drink.',
        id: base, start_url: base, scope: base,
        display: 'standalone', orientation: 'any',
        background_color: '#1A0F0A', theme_color: '#1A0F0A',
        icons: [
          { src: 'icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-1024.png', sizes: '1024x1024', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: [
          '**/*.{js,css,html,woff2}',
          'geo/countries-110m.json', 'geo/places.json', 'geo/marine-50m.json', 'geo/land-dots.json',
          'textures/earth-day.jpg', 'textures/earth-topology.png', 'textures/earth-water.png',
          'sounds/bar.ogg', 'icons/*.png',
        ],
        globIgnores: ['**/textures/*.webp', '**/geo/countries-50m.json', '**/textures/night-sky.png'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: `${base}index.html`,
        runtimeCaching: [
          { urlPattern: ({ url }) => url.pathname.endsWith('.webp')
                                  || url.pathname.endsWith('countries-50m.json'),
            handler: 'CacheFirst',
            options: { cacheName: 'bar-heavy-v1',
                       expiration: { maxEntries: 4,              // C4 — four, not eight
                                     maxAgeSeconds: 60 * 60 * 24 * 30 } } },
          // NEVER let Workbox answer a weather call: Dexie is the cache and staleness is a UI state.
          { urlPattern: /^https:\/\/[a-z-]*\.?open-meteo\.com\//, handler: 'NetworkOnly' },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
});
```

Five rules that go with it — each one is a way a sub-path deploy breaks **silently**:

1. **Never `fetch('/geo/places.json')`.** Every runtime asset read is `` fetch(`${import.meta.env.BASE_URL}geo/places.json`) ``. `vite dev` at `/` will not catch a mistake here; `npm run build && npx vite preview --base /barometer/` will.
2. **Hash routing** (`createHashRouter`) means deep links need no server rewrite. The `404.html` copy in the workflow is belt-and-braces.
3. **Register the service worker web-only:**

```ts
import { Capacitor } from '@capacitor/core';
if (!Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
  const { registerSW } = await import('virtual:pwa-register');
  registerSW({ onNeedRefresh: () => useBarStore.getState().showRestockTag() });
}
```

4. **CSP lives in `index.html` as a meta tag** — GitHub Pages cannot send headers:

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; connect-src 'self'
  https://api.open-meteo.com https://air-quality-api.open-meteo.com https://marine-api.open-meteo.com
  https://geocoding-api.open-meteo.com https://nominatim.openstreetmap.org %VITE_WIT_PROXY%;
  img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:;
  object-src 'none'; base-uri 'none'">
```

Vite only substitutes `%VITE_*%` placeholders for variables that are **defined**, so commit a repo-root `.env` containing `VITE_WIT_PROXY=` (empty) or the literal `%VITE_WIT_PROXY%` ships to users and the CSP breaks. Never add `'unsafe-eval'`. BYO-LLM hosts are appended only in the settings-enabled build-flag path, from a documented list — **never a wildcard**.

5. **`public/` files are not content-hashed by Vite.** When a texture or geo file changes, change its filename (`bmng-2026-09-4k.webp` already encodes the month) or bump `bar-heavy-v1` → `-v2`, or Workbox's CacheFirst entry serves the old bytes for 30 days.

### 11.2 `.github/workflows/pages.yml`

```yaml
# Deploy the Vite app to GitHub Pages.
# Prereq: repo Settings -> Pages -> Build and deployment -> Source: "GitHub Actions".
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false        # never cancel a live production deploy

jobs:
  build:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test -- --run     # Vitest only. Heavy gates live in ci.yml (D1-11: drop `cache: npm` if it warns)
      - name: Build (served from /barometer/)
        run: npm run build
        env:
          VITE_BASE_PATH: /${{ github.event.repository.name }}/
      - name: SPA fallback for deep links (harmless with hash routing)
        run: cp dist/index.html dist/404.html
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v4
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-24.04
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Keep Playwright, the licence scan and the bundle gate **out** of this workflow — a flaky headless-WebGL test must never block a deploy. Until the first test exists, delete the `npm test` line rather than letting the deploy fail.

**Post-deploy smoke checks** (run once, then before each release):

```bash
BASE=https://<owner>.github.io/barometer
curl -sI  $BASE/                       # 200, text/html
curl -sI  $BASE/manifest.webmanifest   # 200, application/manifest+json
curl -sI  $BASE/sw.js                  # 200, text/javascript, no long immutable cache
curl -sI  $BASE/geo/places.json        # 200, application/json — proves the sub-path asset prefix
curl -sI -H "Origin: https://<owner>.github.io" \
  "https://api.open-meteo.com/v1/forecast?latitude=19.07&longitude=72.88&current=temperature_2m" \
  | grep -i access-control-allow-origin
```

With the Actions Pages source the artifact is served as-is — **no `.nojekyll` needed** and `_`-prefixed paths are safe (only branch-source Pages runs Jekyll). Site size lands around 15–40 MB, far under the 1 GB cap; the 100 GB/month bandwidth soft limit is unreachable for a personal toy.

### 11.3 `.github/workflows/ci.yml`

```yaml
name: ci

on:
  pull_request:
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: ci-${{ github.ref }}      # distinct from "pages" and "android-*"
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-24.04
    timeout-minutes: 25
    env:
      TZ: Asia/Kolkata             # the house timezone
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx biome ci .
      - run: npx tsc --noEmit
      - run: npm run test:unit                       # vitest run --coverage (engine gates)
      - run: npm run check:licenses
      - run: npm run build
        env:
          VITE_BASE_PATH: /${{ github.event.repository.name }}/
      - run: npm run check:bundle                    # <= 180 KB gzip initial JS, <= 12 MB precache
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e                        # excludes @live; SwiftShader flags in playwright.config.ts
      - uses: actions/upload-artifact@v7
        if: failure()
        with:
          name: playwright-report
          path: |
            playwright-report/
            test-results/
          retention-days: 7
```

### 11.4 `.github/workflows/android-release.yml`

```yaml
# Build a SIGNED Capacitor APK in the cloud and attach it to a GitHub Release.
# Needs the four keystore secrets and the signingConfigs block from §8.4.
#   git tag v1.0.0 && git push origin v1.0.0   ->  APK appears on the Releases page.
name: android-release

on:
  push:
    tags: ['v*']
  workflow_dispatch:        # manual run -> signed APK as a downloadable artifact only

permissions:
  contents: write

concurrency:
  group: android-${{ github.ref }}
  cancel-in-progress: true

jobs:
  apk:
    runs-on: ubuntu-24.04   # Android SDK 34-37, build-tools, JDK 17/21 preinstalled
    timeout-minutes: 30
    env:
      VERSION_CODE: ${{ github.run_number }}
      VERSION_NAME: ${{ github.ref_type == 'tag' && github.ref_name || format('0.0.{0}', github.run_number) }}
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-node@v7
        with: { node-version: 22, cache: npm }

      - uses: actions/setup-java@v6
        with:
          distribution: temurin
          java-version: 21          # Capacitor 8 targets Java 21 (runner default is 17)
          cache: gradle

      - name: Build web app (base "/" because Capacitor serves from https://localhost/)
        run: |
          npm ci
          npm run build
        env:
          VITE_BASE_PATH: /
          VITE_PLATFORM: android

      - name: Sync web assets and plugins into android/
        run: npx cap sync android

      - name: Decode keystore
        env:
          KS_B64: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}
        run: printf '%s' "$KS_B64" | base64 -d > "$RUNNER_TEMP/release.p12"

      - name: Build signed release APK
        working-directory: android
        env:
          ANDROID_KEYSTORE_FILE: ${{ runner.temp }}/release.p12
          ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          ANDROID_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
          ANDROID_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
        run: |
          chmod +x gradlew
          ./gradlew --no-daemon :app:assembleRelease \
            -PversionCode="$VERSION_CODE" -PversionName="${VERSION_NAME#v}"

      - name: Collect output (fails loudly if the APK came out unsigned)
        run: |
          mkdir -p out
          cp android/app/build/outputs/apk/release/app-release.apk \
             "out/barometer-${VERSION_NAME#v}.apk"
          (cd out && sha256sum *.apk > SHA256SUMS.txt)
          ls -la out

      - uses: actions/upload-artifact@v7
        with:
          name: apk-${{ env.VERSION_NAME }}
          path: out/
          retention-days: 14

      - name: Attach APK to GitHub Release
        if: github.ref_type == 'tag'
        uses: softprops/action-gh-release@v3
        with:
          tag_name: ${{ github.ref_name }}
          generate_release_notes: true
          files: |
            out/*.apk
            out/SHA256SUMS.txt
```

Four repo secrets, set once with `gh secret set`: `ANDROID_KEYSTORE_BASE64` (from the `.p12.b64`), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (= `release`), `ANDROID_KEY_PASSWORD` (PKCS12 → identical to the store password). **Delete the `.b64` from disk afterwards; keep the `.p12` backed up.** GitHub can never show a secret back to you, and the same key must sign every future APK forever.

For the manual QA pass, dispatch this workflow on a scratch branch with `CAP_WEBVIEW_DEBUG: '1'` added to the build step's `env:` — **never tag a release from that branch.**

### 11.5 `.github/workflows/live.yml`

```yaml
name: live-probe

on:
  schedule: [{ cron: '17 6 * * 1' }]     # Mondays 06:17 UTC
  workflow_dispatch:

jobs:
  probe:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:live
        env:
          BASE_URL: https://${{ github.repository_owner }}.github.io/barometer/
```

GitHub disables scheduled workflows after 60 days of repo inactivity — if the probe stops mailing you, that is why; re-enable it from the Actions tab.

### 11.6 The optional Worker (stretch only — skip it to ship)

Barometer's MVP calls only no-key, CORS-open endpoints, so there is **no proxy**. If wit rung 1 is ever built:

```
worker/
├── index.ts          # handles OPTIONS itself; calls env.AI.run(...) — no key at all
├── package.json
└── wrangler.toml
```

```toml
name = "barometer-wit"
main = "index.ts"
compatibility_date = "2026-09-01"

[vars]
ALLOWED_ORIGIN = "https://<owner>.github.io"   # ORIGIN ONLY — Origin headers carry no path
UPSTREAM_BASE  = "https://api.cloudflare.com/client/v4/accounts/<account-id>/ai/run"

[ai]
binding = "AI"        # env.AI.run(model, ...) needs no key, so there is no secret to leak

[observability]
enabled = true
```

Two mandatory details: the origin allow-list **must** accept the Capacitor WebView, which serves from `https://localhost` (not `http://`), or the APK gets a 403 from its own proxy —

```ts
const allowed = origin === env.ALLOWED_ORIGIN
  || origin === 'https://localhost'          // Capacitor Android WebView
  || origin.startsWith('http://localhost');  // vite dev
```

— and the Worker must be **fail-open**: a 429, a timeout past 6 s, or a malformed response leaves the procedural rung-0 coaster exactly as printed. A user must never be able to tell the Worker is down. Deploy it with a `worker.yml` filtered to `paths: ['worker/**']` using `cloudflare/wrangler-action@v4` and the two Cloudflare secrets; bake the deployed URL in as `VITE_WIT_PROXY` in **both** the Pages and the Android build steps so the CSP substitution works.

### 11.7 Environment and configuration

There are **no secrets in any build**. Anything prefixed `VITE_` is inlined into the shipped bundle by design — which is exactly why no key exists in this project.

| Variable | Pages | APK | Local dev | Effect |
|---|---|---|---|---|
| `VITE_BASE_PATH` | `/barometer/` | `/` | unset → `/` | Vite `base`, PWA `scope`/`start_url`, `import.meta.env.BASE_URL` |
| `VITE_PLATFORM` | unset | `android` | unset | 4K (not 8K) textures, DPR cap 1.5, hides the WebLLM rung |
| `VITE_WIT_PROXY` | empty | empty | empty | Worker URL for the stretch rung; empty ⇒ hidden in the Back Office and absent from the CSP |
| `__APP_VERSION__` | `define` from `package.json` + git sha | same | same | Rendered in About and on the share-card footer |
| `CAP_WEBVIEW_DEBUG` | — | `1` only on a scratch QA branch | — | Enables `chrome://inspect` on the APK |
| `TZ` | — | — | — | CI/tests only: `Asia/Kolkata` |

Commit a repo-root `.env` containing exactly `VITE_WIT_PROXY=`. **Never** create a `VITE_*` key for Gemini/Groq/OpenRouter — those are the *user's* keys, entered in the Back Office and stored WebCrypto-wrapped on-device.

### 11.8 Repo hygiene, versioning, rollback, backups, runbook

**`.gitignore`** (before the first commit — the repo is public forever): `node_modules/`, `dist/`, `dist-ssr/`, `coverage/`, `playwright-report/`, `test-results/`, `raw/`, `android/local.properties`, `android/app/release/`, `android/.gradle/`, `*.p12`, `*.jks`, `*.keystore`, `.env.local`, `.env.*.local`.
**`.gitattributes`** (a Windows checkout must not break the Gradle wrapper): `android/gradlew text eol=lf`, `*.sh text eol=lf`, `*.webp binary`, `*.jpg binary`, `*.png binary`.
Repo settings: leave workflow permissions at read-only (each workflow declares its own); no branch protection (a solo dev pushing to `main` *is* the release process); **and never add ads, sponsor links, affiliate links or a donate button** — Open-Meteo's free tier is non-commercial and that is a deployment constraint.

**Versioning:** SemVer `0.y.z` until the full feature set ships, then `1.y.z`, sourced from `package.json` and displayed as `version+gitsha`. The git tag `vX.Y.Z` **is** the release. APK `versionName` = the tag minus its `v`; APK `versionCode` = `${{ github.run_number }}` — strictly increasing, never reset, never reused. Dexie schema versions bump with an `upgrade()`. Bump rules: **patch** = copy, affinity tweaks, bug fixes; **minor** = a new screen, a new tag family, a texture pipeline, a Dexie version; **major** = a route or export-format break. Grammar and menu edits are patches.

**Rollback.** Web: fix forward — `git revert <bad-sha> && git push` redeploys in ~2 minutes; Pages keeps only the latest deployment, so a revert commit *is* the rollback. Two caveats: (a) with `registerType: 'prompt'` the **service worker outlives the rollback** — users keep the bad build until they accept the update; if a build is genuinely dangerous, ship one build with `VitePWA({ selfDestroying: true })` to unregister every client, confirm, then deploy normally; (b) bad weather data self-heals because the cache TTL is 15 minutes — but `verdicts` is **user data**: never clear it as part of a rollback. Android: you cannot downgrade over an install; fix forward with a new tag, mark the bad release pre-release and delete its `.apk` asset.

**Backups.** The `.p12` **and** its passphrase, in two separate places outside any repo — this is the only unrecoverable asset in the project; verify the copy opens yearly. A note of the secret inventory in the same password-manager entry (GitHub can never show a secret back). The Tab, via the in-app JSON export, whenever it matters. `raw/` (NASA JPEGs and the cloned drink repos) to an external drive with `raw/SOURCES.txt`. The repo itself: `git bundle create /d/backups/barometer-$(date +%F).bundle --all` monthly. **Never back anything up *into* the repo — it is public.**

**Runbook.**

| Symptom | Cause | Fix |
|---|---|---|
| Site loads, all assets 404 | `VITE_BASE_PATH` missing or the repo was renamed | Re-check the `pages.yml` build env; reproduce with `npx vite preview --base /barometer/` |
| Assets load but `geo/places.json` 404s | a `fetch('/geo/…')` without `import.meta.env.BASE_URL` | Prefix it |
| Chrome won't offer "Install" | `start_url`/`scope` ≠ `/barometer/`, or the SW registered at the wrong scope | Fix via `base`; unregister the old SW and hard-reload |
| `actions/deploy-pages` permission error | Pages source is not "GitHub Actions" | Settings → Pages → Source |
| Deploy queues forever | the `pages` concurrency group is waiting (deliberate, `cancel-in-progress: false`) | Let it finish; never cancel a live production deploy |
| Weather works on desktop, fails on the phone | — | Not CORS: the WebView sends `Origin: https://localhost` and Open-Meteo answers `*`. Suspect DNS or a captive portal |
| `gradlew: Permission denied` | execute bit lost on a Windows checkout | The workflow runs `chmod +x`; also `git update-index --chmod=+x android/gradlew` |
| `cp: app-release.apk: No such file` | signing env vars missing ⇒ Gradle emitted `app-release-unsigned.apk` | Check the four secrets. **This failure is intentional and must never be "fixed" by shipping the unsigned file.** |
| APK installs but won't update an old install | `applicationId` changed, different key, or `versionCode` not higher | Restore `com.rahul.barometer` and the original `.p12` |
| WebGL context lost on the phone after a few pours | 8K textures reached the WebView, or `MAX_TEXTURE_SIZE` < 4096 | Confirm `VITE_PLATFORM=android`; the SVG fallback should already be catching it |
| Users stuck on an old web build | they never accepted "Restock?" | Expected with `registerType: 'prompt'`; only a `selfDestroying` build forces it |
| Scheduled `live-probe` stopped | 60 days of repo inactivity | Re-enable from the Actions tab |

**Escape hatch (documented, not planned):** if Pages ever becomes the constraint — COOP/COEP headers, real HTTP status codes on deep links, `_headers` control — migrate to **Cloudflare Workers with static assets** (free, unlimited static requests, SPA fallback). That would mean a `wrangler.toml` with an `[assets]` block pointing at `dist/`, deploying with `cloudflare/wrangler-action` instead of the three Pages actions, and `VITE_BASE_PATH=/` because the site would live at the domain root — which also makes the web build identical to the APK build. Nothing in Barometer needs this today.

---

## 12. Definition of done

Ship only when **every** box below is true.

### 12.1 Product acceptance

1. ☐ **Click to verdict under 2.0 s.** On desktop broadband the blank coaster slides in within **100 ms** of the tap and the printed coaster replaces it within **2.0 s** (p50 under 1.2 s); the engine itself (features → tags → score → text) runs in **under 5 ms**.
2. ☐ **Deterministic and golden-tested.** The same `(lat, lng, local hour, menu)` always yields the same drink and lines. All nine weather fixtures produce their expected drink, driving tag, dial label and stamp tier in Vitest. **The Mumbai fixture prints an iced Mojito and the Yakutsk fixture prints a hot dark-rum drink.**
3. ☐ **Offline reverse geocoding is right and fast.** Every §6.8 point resolves to the expected country or ocean; 200 random open-ocean points never return a country; a warm lookup (country + nearest city + marine polygon) takes **under 20 ms** on a 2022 mid-range Android phone.
4. ☐ **Policy-clean by construction.** A Playwright network assertion proves **zero** requests to any host other than `*.open-meteo.com` (and `nominatim.openstreetmap.org` only when the opt-in lever is on). Every land click costs at most **3 weighted** Open-Meteo calls and every ocean click at most **4** (the marine request is the fourth), and a second click within 15 minutes inside the same 0.25° cell makes **no network request at all**.
5. ☐ **Design fidelity and AA.** Every screen matches §3 and §4 in both shifts at both widths; axe reports **zero** contrast violations in both shifts and inside `.paper`; every screenshot passes the signature test (a bottle, a coaster ring, a brass pin or the neon sign is visible).
6. ☐ **Performance budget held.** Initial JS **≤ 180 KB gzip** before the lazy globe chunk; the LCP element is the DOM neon sign, not the canvas; total precache ≤ 12 MB; the idle globe drifts at 60 fps on desktop and ≥ 30 fps on the 2022 Android reference; a cold PWA install boots offline and reopens the last verdict from The Tab.
7. ☐ **The bartender does not repeat himself.** At least **8 variants per grammar slot per tag**; sampling 1,000 verdicts for the Mumbai fixture across seeds yields **≥ 300 distinct jab lines**; no two consecutive identical coasters for neighbouring clicks 0.5° apart.
8. ☐ **The APK is a real app** (if the Android tier ships). The signed APK from a `v*` tag installs on Android 14+, the pin drop fires `impact Medium`, the shift follows the clicked place with a transparent status bar, and "Tear off" opens the system share sheet with the 1080×1350 PNG attached.

### 12.2 Design-fidelity checks

☐ Every screen state of §4 exists and is visually reviewed against §3 · ☐ the intensifier stamp is Righteous, uppercase, rotated −4°, coloured by `--stamp` · ☐ the drink name is Righteous at ≥ 44 px desktop / ≥ 36 px phone · ☐ every figure in the app is JetBrains Mono with tabular numerals and U+2212 for negatives · ☐ the coaster's pressed ring, the paper scope and the condensation ring all render · ☐ the window weather never overlaps text or the coaster · ☐ there is exactly one brass line per band · ☐ nothing blurs, nothing floats, there is no navy and no pure white or black · ☐ the neon reads as a glass tube, not a glow blob · ☐ the Day shift is a real light palette, not a dimmed dark one · ☐ the reduced-motion build is the same design, not a stripped one.

### 12.3 Engineering gates

☐ `npm run test:all` green on `main` · ☐ engine coverage ≥ 95 % with 100 % on the five named modules · ☐ wit snapshots reviewed, not blindly regenerated · ☐ `npm run test:e2e` green three consecutive CI runs with a **zero** flake budget · ☐ every visual baseline eyeballed and defensible · ☐ Lighthouse mobile LCP ≤ 2.5 s with a DOM LCP element and PWA installable · ☐ `check:bundle` passing every §10.8 row · ☐ `check:licenses` passing with only the documented `suncalc@2.0.2` exclusion · ☐ the privacy spec proving the network allow-list and the on-load zero-request rule · ☐ `attribution.json` ↔ About ↔ README matching three ways · ☐ manual NVDA pass on desktop · ☐ the §10.10 device checklist fully ticked (or the Android tier explicitly dropped) · ☐ `test:live` green from the deployed origin within the last 7 days · ☐ no §9.7 row left unticked that affects the release · ☐ the keystore `.p12` and passphrase backup **confirmed present** before the first tag, then yearly.

### 12.4 Non-goals — do not build these

Not a forecast app: **no** hourly strip, 7-day view, radar, alerts, notifications or charts. One "right now" verdict per click; forecast fields are fetched only to hedge the copy. No street map, no tiles, no place search beyond Open-Meteo's forward geocoder. No accounts, no cloud sync, no server of ours. No owner API key anywhere. No commercial use, ads, donations or store listing. No user-authored drinks or recipe editing — the menu is curated in the repo. **No insults that target people** — the bartender judges weather and choices, never protected characteristics. No iOS build.

---

## 13. Code quality rules

**TypeScript.** `strict: true`, plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`. **`any` is banned** — use `unknown` and narrow. No non-null assertions (`!`) outside test files and the two documented spots in `localClock`. **The engine snippets in §6.5 (`pick`) and §6.8 (`locate`) are written the awkward way on purpose** — destructured locals instead of `top[0].score`, a conditional spread instead of `nearestCity: city && …`, a `city ?` branch instead of `city!.name` — because that is what these three flags require. Do not "tidy" them back; `npx tsc --noEmit` is a CI gate and will fail. No `as` casts to silence the compiler; if a cast is genuinely needed, write a type guard instead. Every exported function has an explicit return type. `npx tsc --noEmit` is a CI gate.

**Biome is the only linter and formatter.** 2-space indent, single quotes, organise-imports on, run as `npx biome ci .` in CI. No ESLint, no Prettier, no per-file disable comments without a one-line reason on the same line.

**Engine purity is architectural, not stylistic.** `src/engine/**` may import only from `src/engine/**` and from `d3-geo`, `kdbush`, `geokdbush`, `suncalc`, `solar-calculator`, `seedrandom` and `tracery-grammar`. It may **not** import React, Zustand, Dexie, anything from `src/features`, `src/api` or `src/state`, and it may not call `fetch`, touch the DOM, read `Date.now()` (the caller passes `now`) or read `Intl` defaults (the caller passes the timezone). Enforce this with a Biome `noRestrictedImports` rule **and** a unit test that greps the folder. Everything in it is a pure function of its arguments.

**Component conventions.**

- One component per file, named the same as the file, default-exported only at route boundaries; named exports elsewhere.
- Props interfaces are declared above the component and are never `any` or inline-`{}` for more than two fields.
- No business logic in components — a component may format and arrange, but tags, scores, picks, stamps and lines all come from `src/engine`.
- No inline `style={{}}` except for a genuinely dynamic single custom property (e.g. `style={{ ['--drink-glow' as string]: glow }}`).
- **No hard-coded colours, sizes, durations or easings anywhere outside `tokens.css`.** A grep for raw hex outside `src/styles/` must return nothing. Same for `px` values that should be `--space-*`, and for `ms` values that should be `--dur-*`.
- Tailwind is for layout utilities only (flex/grid/gap/inset/z). Materials, colour and type live in hand-written CSS reading tokens.
- Every interactive element gets a real semantic role, an accessible name, a `:focus-visible` ring and a ≥ 44×44 hit area — at the moment it is written, not in a later pass.
- Feature folders own their components, hooks, logic and tests. Cross-feature imports go through `src/components/ui`, `src/engine`, `src/state` or `src/platform` — never directly into another feature's internals.
- Platform differences live **only** in `src/platform/*`. A `Capacitor.isNativePlatform()` check anywhere else is a bug.

**State.** Zustand holds UI state and the current verdict; **Dexie is the source of truth** for The Tab and the weather cache. `features/verdict/pour.ts` is the **only** writer of `verdict`. Reads of the Tab go through `useLiveQuery`. Settings are persisted through the `src/platform/prefs.ts` adapter, never `localStorage` directly.

**No dead code.** No commented-out blocks, no `TODO` without an owner and a date, no unused exports, no unreachable branches, no "just in case" abstractions, no files left from an abandoned approach. If a feature is deferred to Phase 6, it does not exist in `src/` — it exists in this document. Delete rather than comment; git remembers.

**Errors.** Every failure mode in §4.9 and §7.5 has a named error type and a user-visible bar-voiced message. Nothing is swallowed silently except the deliberately best-effort AQI and marine fetches (`.catch(() => undefined)`, which only removes tags). **Nothing is reported anywhere** — no Sentry, no console spam in production; a `console.log` left in `src/` fails review.

**Testing discipline.** Engine modules land with their test file green in the **same commit** — never "tests later". Snapshots are reviewed line by line when they change, never regenerated blindly ("pin, then guard"). Fixtures are the exact live API shape, not a convenience type. If a test and a golden value disagree, suspect the code first, then the golden — and record any correction in this document.

**Commit cadence.** Small, single-purpose commits with imperative subjects, one per task from §9 (`engine: tags.ts with the §6.3 table and boundary tests`). Push to `main` — that *is* the release process for a solo project. Never commit `raw/`, a `.p12`, `android/local.properties`, `dist/`, coverage output or a Playwright report. Every commit leaves `main` deployable: if `ci.yml` is red, the next commit fixes it before anything else is written. Bump `package.json` and tag only from `main`.

**Documentation.** This file is the specification; when reality diverges from it — a threshold changes, a fixture value is corrected, a day-1 verification fails — **edit this file in the same commit**. The README's Attribution table, `src/data/attribution.json` and the About screen are updated together, always, and a test enforces it.
