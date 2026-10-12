# Barometer — Testing Strategy & Test Plan

Written 2026-09-06. Binding inputs: `_shared/DECISIONS.md` (D1 tooling: Vitest + Testing Library + Playwright; D4 wit ladder; D5 licence rules; D7 token contract; D9 "engine first"), `docs/RESEARCH.md` (§3 probes, §5 algorithms, §10 open questions, Verification log), `docs/DESIGN.md` (tokens §4/§15, motion §7, screens §9, a11y §13, Android §14, asset checklist §16). Every case below is specific to Barometer ("The Globe Bar"); nothing here is a generic template.

Barometer's test surface, in order of risk: **(1)** the pure judgment engine (comfort formulas → tags → drink score → seeded pick → Tracery voice) — 100 % unit-tested against golden Open-Meteo fixtures; **(2)** offline reverse geocoding on Natural Earth (antimeridian, poles, enclaves, oceans); **(3)** the Open-Meteo client (request weighting, 15-min/0.25° cache, 429/offline paths, `timezone=auto` local time); **(4)** the bar UI (coaster, dial, bottles, neon switch, register, tab, back office) in both shifts and inside the `.paper` scope; **(5)** the globe (globe.gl canvas, fallback SVG globe, WebGL context loss); **(6)** PWA/offline; **(7)** the optional Capacitor APK, which cannot run in CI and gets a manual checklist (§12).

---

## 1. Strategy at a glance

| Layer | Tool | What it proves | Where | Gate |
|---|---|---|---|---|
| Unit (engine) | **Vitest 3** (`environment: node`), `fake-indexeddb` for the Dexie repo | `src/engine/**` is correct against the golden fixtures in §2; every formula in RESEARCH §5.5 matches the reference values below to 0.1 | `src/engine/**/*.test.ts` | Every PR; ≥ 95 % lines on `src/engine`, **100 %** on `comfort.ts`, `tags.ts`, `score.ts`, `geocode.ts`, `cache.ts` |
| Unit (wit) | Vitest + snapshot files | `src/wit/` Tracery grammar never throws, never emits an unexpanded `#slot#`, is deterministic per seed, respects the "no protected characteristics" lint | `src/wit/*.test.ts`, `__snapshots__/` | Every PR |
| Component | **@testing-library/react** + **user-event** (jsdom) | Coaster, NeonSign switch, WallDial, Bottle, Lever, BrassKnob, Search, TabRow, Receipt, Window layers render/announce correctly; keyboard map works | `src/features/**/__tests__/*.test.tsx` | Every PR |
| E2E | **Playwright 1.5x** — Chromium desktop 1440×900 + "Pixel 7" profile; `--use-gl=angle --use-angle=swiftshader` so globe.gl gets a WebGL context headless | Real hash routes, real IndexedDB, real service worker; Open-Meteo **always mocked** with §2 fixtures via `page.route` (never hit the live API in CI — it is non-commercial, rate-limited and nondeterministic) | `e2e/*.spec.ts` | Every PR in `ci.yml`; `pages.yml` runs only `npm test -- --run` so a flaky WebGL test never blocks a deploy |
| Live probe | Playwright, `@live` tag, manual/weekly | The three Open-Meteo hosts still answer with `access-control-allow-origin: *` from the real Pages origin | `e2e/live/openmeteo.spec.ts` | Weekly (`schedule:` cron) + day 1 |
| Visual | Playwright `toHaveScreenshot` + computed-style assertions against `src/styles/tokens.css` | The app matches `design/preview.html` (D9.3) for the 8 states in DESIGN §16 in Night and Day, desktop and phone, plus reduced motion | `e2e/visual/*.spec.ts`, baselines in `e2e/visual/__screenshots__/` (Linux-only, committed) | Every PR; diffs reviewed by eye |
| Performance | Playwright traces + Lighthouse CI (`@lhci/cli`) + `rollup-plugin-visualizer` size gate | Budgets in §8 (LCP is the neon sign, not the canvas; click → skeleton coaster ≤ 100 ms) | `e2e/perf/*.spec.ts`, `lighthouserc.json`, `scripts/check-bundle.mjs` | Weekly + before every tag |
| Accessibility | `@axe-core/playwright` in both shifts and inside `.paper`; manual keyboard + NVDA/TalkBack pass | §9 | `e2e/a11y.spec.ts` | Every PR (axe), before every tag (manual) |
| Licence/privacy | `license-checker-rseidelsohn` allow-list, `scripts/check-bundle.mjs` grep, CSP test | No GPL, no BigDataCloud host, no keys, attribution present (§10) | `npm run check:licenses`, `e2e/privacy.spec.ts` | Every PR |
| Menu schema | `scripts/check-menu.mjs` parses the §6.11 tables and asserts the drink contract | Twin resolution, valid bottles/glasses/ice/tags, and **every Tag has ≥ 3 drinks at affinity ≥ 3** (§2.6) | `npm run check:menu` | Every PR, before the unit tests |
| Device | Manual checklist on the owner's phone (Android 14+; ideally one Android 16 device) with a `workflow_dispatch` APK | Haptics, back gesture, edge-to-edge, rotation, share sheet, geolocation, WebGL on the WebView | §12 | Before every `v*` tag (only when the optional APK is built) |

**Scripts** (`package.json`):

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

(`suncalc@2.0.2` is excluded from the scanner because its npm metadata has no `license` field; the repo LICENSE is BSD-2-Clause — RESEARCH §4. Re-check on every suncalc bump.)

**Determinism rules**
- The house instant is **2026-09-06T00:45 Asia/Kolkata** (= `2026-09-05T19:15:00Z`, epoch `1788635700`) — the exact `current.time` of the Mumbai probe in RESEARCH §3. Engine tests pass `now` explicitly; Playwright runs `await page.clock.install({ time: new Date('2026-09-05T19:15:00Z') })` before navigation.
- Process timezone pinned: `TZ=Asia/Kolkata` in `vitest.config.ts` (`test.env`) and `timezoneId: 'Asia/Kolkata'` in `playwright.config.ts`. The engine must never read the *browser* timezone for a verdict — it always uses the `timezone` string from the fixture — and one test (§3.4 T-DP-8) proves that by running the same fixture under `TZ=UTC`.
- The seeded RNG is `` seedrandom(`${lat.toFixed(1)}|${lng.toFixed(1)}|${localHour}|${menu}`) `` — **pipe-delimited and four-part** (C11): the menu segment is what makes the barista flip independently deterministic, and the voice grammar flattens with the same seed plus `|voice`. The Mumbai seed is therefore `19.1|72.9|0|bar`, never `19.1,72.9,0`. Tests pin seeds; drink picks and Tracery lines are committed as Vitest snapshots after the first green run (see §3.6 — "pin, then guard").
- globe.gl is nondeterministic (auto-rotate, texture swap). Test builds expose `window.__bar` (only when `import.meta.env.MODE === 'test'`): `freeze()` stops auto-rotate and pins `pointOfView({lat:0,lng:0,altitude:2.5})`, `pour(lat,lng)` triggers the same code path as `onGlobeClick`, `textures('flat')` forces the 245 KB `earth-day.jpg` and disables the Blue Marble swap. Visual tests also `mask: [canvas]` where the globe would otherwise leak noise.
- Sound is muted in tests (`localStorage['bar.sound'] = 'off'` seeded by the e2e fixture); Howler is stubbed in jsdom (`src/test/setup.ts`).

---

## 2. Test layout and fixtures

```
src/engine/
  comfort.ts / comfort.test.ts      # heatIndex, humidex, windChill, dewPoint (Magnus), beaufort, uvBand, aqiBand, wmo
  tags.ts / tags.test.ts            # WeatherFeatures -> Tag[] + drivingTag()
  daypart.ts / daypart.test.ts      # local hour/day-part/golden hour from tz + sunrise/sunset + suncalc
  score.ts / score.test.ts          # weighted drink scoring, serveBonus, repeatPenalty, barista filter
  pick.ts / pick.test.ts            # top-3 + seeded choice, intensifier/serve line, virgin twin
  dial.ts / dial.test.ts            # tag -> dial ring label + needle angle + aria-valuetext
  units.ts / units.test.ts          # °C/°F, km/h/mph/kn, U+2212 minus, tabular formatting
  cache.ts / cache.test.ts          # (lat,lng)->0.25° cell, 15-min bucket, antimeridian normalisation
  openmeteo.ts / openmeteo.test.ts  # URL builders (forecast/aqi/marine/geocoding), parse, weighting guard
  geocode.ts / geocode.test.ts      # NE country PIP (d3.geoContains), kdbush nearest city, marine polys
  receipt.ts / receipt.test.ts      # receipt lines (mono, tabular), share-card text, attribution lines
  ticker.ts / ticker.test.ts        # "LAST ORDERS IN LISBON" terminator crossings (solar-calculator)
src/wit/
  voice.json, intensifiers.json, grammar.ts / grammar.test.ts, lint.test.ts
src/features/tab/
  db.ts, repo.ts, repo.test.ts      # Dexie `verdicts` table (fake-indexeddb), export/import, stale check
src/test/
  fixtures/openmeteo/*.json         # the golden API responses below (verbatim shape of the real API)
  fixtures/geo/*.geojson            # trimmed NE extracts used by unit tests (full files live in src/data)
  fixtures/menu.mini.json           # 5-drink menu with explicit affinities for hand-checkable scores
  setup.ts                          # jsdom polyfills (matchMedia, ResizeObserver, IntersectionObserver, canvas), fake-indexeddb/auto, Howler stub
e2e/
  fixtures/routes.ts                # page.route() handlers mapping lat/lng -> fixture JSON
  bar.spec.ts, verdict.spec.ts, recipe.spec.ts, barista.spec.ts, register.spec.ts, tab.spec.ts,
  office.spec.ts, search.spec.ts, offline.spec.ts, errors.spec.ts, keyboard.spec.ts, a11y.spec.ts,
  privacy.spec.ts, visual/*.spec.ts, perf/*.spec.ts, live/openmeteo.spec.ts
```

### 2.1 Golden Open-Meteo fixtures (`src/test/fixtures/openmeteo/`)

Each fixture is a `{ forecast, airQuality, marine? }` triple in the **exact** shape the live API returns (RESEARCH §3 example), so the parser is tested against reality, not a convenience type. `mumbai` is the real probe from 2026-09-06; the others were authored by hand with realistic values and the expected outputs computed on 2026-09-06 with the formulas in RESEARCH §5.5 (script kept in `scripts/golden.py`). If a test disagrees with a golden, suspect the code first, then the golden — and record any correction here.

| Fixture | lat, lng | `timezone` / offset | `current.time` (local) | temp / RH / apparent / dew | wind / gusts | `weather_code` | `is_day` | AQI (EU/US) | Extra |
|---|---|---|---|---|---|---|---|---|---|
| `mumbai` | 19.07, 72.88 | `Asia/Kolkata` / 19800 | `2026-09-06T00:45` | 25.4 / 94 / **31.5** / 24.4 | 1.9 / 2.9 | 51 (drizzle) | 0 | 34 / 55 | cloud 100, precip 0.10, uv 0 |
| `yakutsk` | 62.03, 129.73 | `Asia/Yakutsk` / 32400 | `2026-01-14T03:10` | −41.0 / 78 / **−48.7** / −44.2 | 5.5 / 9.0 | 71 (light snow) | 0 | 18 / 40 | uv 0, sunrise `10:12`, sunset `15:40` |
| `reykjavik` | 64.13, −21.90 | `Atlantic/Reykjavik` / 0 | `2026-09-06T14:30` | 6.0 / 80 / **2.1** / 2.8 | 21.0 / 38.0 | 61 (rain) | 1 | 12 / 20 | uv 2, sunrise `06:25`, sunset `20:12` |
| `dubai-noon` | 25.20, 55.27 | `Asia/Dubai` / 14400 | `2026-07-20T12:30` | 43.0 / 20 / **45.8** / 15.4 | 14.0 / 25.0 | 0 (clear) | 1 | 78 / 152 | uv 11, dust 140 |
| `arabian-sea` | 15.00, 65.00 | `Asia/Kolkata`* / 19800 | `2026-09-06T00:45` | 29.0 / 82 / 33.6 / 25.6 | 24.0 / 33.0 | 3 (overcast) | 0 | 22 / 40 | **marine**: `wave_height 2.4`, `sea_surface_temperature 28.9` |
| `south-pole` | −89.9, 0 | `Antarctica/McMurdo` / 43200 | `2026-09-06T07:15` | −58.0 / 60 / **−66.1** / −63.0 | 12.0 / 16.0 | 0 | 0 | — (AQI fixture returns `null`s) | polar night; `daily.sunrise` empty string |
| `denver-hail` | 39.74, −104.99 | `America/Denver` / −21600 | `2026-06-15T16:40` | 27.0 / 55 / 27.6 / 17.3 | 45.0 / 78.0 | 96 (storm + hail) | 1 | 30 / 48 | uv 7, `precipitation_probability` 90 |
| `lisbon-golden` | 38.72, −9.14 | `Europe/Lisbon` / 3600 | `2026-09-06T19:35` | 24.0 / 60 / 24.3 / 15.8 | 18.0 / 26.0 | 1 | 1 | 25 / 42 | sunset `19:58` → golden hour |
| `oslo-brunch` | 59.91, 10.75 | `Europe/Oslo` / 7200 | `2026-09-06T10:40` (Sunday) | 12.0 / 70 / 10.9 / 6.7 | 9.0 / 14.0 | 2 | 1 | 15 / 25 | weekend brunch window |
| `error-429` | any | — | — | HTTP 429 body `{"error":true,"reason":"Minutely API request limit exceeded"}` | | | | | rate-limit coaster |
| `error-network` | any | — | — | `page.route` aborts with `failed` | | | | | "models not answering" coaster |

\* Open-Meteo's `timezone=auto` for 15°N 65°E was not probed; the fixture uses `Asia/Kolkata` and the day-1 list (§11) pins the real value.

### 2.2 Computed goldens (formulas from RESEARCH §5.5; all values recomputed 2026-09-06)

**Heat index** (`heatIndex(tC, rh)` → `{ hiC, hiF, applies, adjustment }`; input °C, computed in °F per NWS, returned both):

| tC | RH | Simple-formula gate | hiF | hiC | applies | adjustment |
|---|---|---|---|---|---|---|
| 25.4 | 94 | 79.6 < 80 | 79.6 | 26.5 | **false** (returns the simple value) | — |
| 32.2 | 70 | ≥ 80 | 105.8 | 41.0 | true | none |
| 40.0 | 20 | ≥ 80 | 102.9 | 39.4 | true | none |
| 35.0 | 10 | ≥ 80 | 89.4 | 31.9 | true | low-RH −0.75 |
| 29.4 | 90 | ≥ 80 | 101.5 | 38.6 | true | high-RH +0.21 |
| 38.0 | 60 | ≥ 80 | 130.9 | 55.0 | true | none |
| 26.7 | 50 | ≥ 80 (80.9) | 80.9 | 27.1 | true | none (boundary) |

Note the Mumbai case: NWS heat index does not apply at 25.4 °C even though Open-Meteo's `apparent_temperature` is 31.5. **The display always uses the API's `apparent_temperature`; the engine's own formulas are for tags/labels and marine/edge cases only** (RESEARCH §5.5). A test asserts that ordering.

**Humidex** (`humidex(tC, dewC)`): (30, 25) → **42.3**; (25.4, 24.4) → **37.1**; (35, 28) → **50.9**; (20, 10) → **21.3**; (40, 5) → **39.3**.

**Wind chill** (`windChill(tC, kmh)` → number | `null` when T > 10 °C or v ≤ 4.8 km/h):

| tC | km/h | result |
|---|---|---|
| −41 | 5.5 | **−48.7** (the Yakutsk verdict; DESIGN §1's "−48°") |
| −45 | 8 | −55.6 |
| −40 | 5 | −47.0 |
| 4 | 30 | −1.3 |
| 6 | 21 | **2.2** |
| −20 | 40 | −34.1 |
| 0 | 15 | −4.4 |
| −10 | 10 | −15.3 |
| 10.1 | 20 | `null` (T > 10) |
| 5 | 4 | `null` (v ≤ 4.8) |
| 5 | 4.9 | 4.1 (just inside validity) |

**Dew point, Magnus** (`dewPoint(tC, rh)`): (25.4, 94) → **24.4** (matches the API's `dew_point_2m 24.4`); (35, 20) → 8.7; (0, 100) → 0.0; (30, 50) → 18.4; (40, 10) → 2.6; (−10, 80) → −12.8.

**Beaufort** (km/h → number): 0.5 → 0; 1.9 → 1; 8 → 2; 15 → 3; 24 → 4; 33 → 5; 45 → 6; 55 → 7; 70 → 8; 80 → 9; 95 → 10; 110 → 11; 118 → 12; 200 → 12.

**UV band** (WHO): 0 → low; 2.9 → low; 3 → moderate; 5.9 → moderate; 6 → high; 7.9 → high; 8 → very-high; 10.9 → very-high; 11 → extreme; 14 → extreme.

**EU AQI band**: 0 → good; 19.9 → good; 20 → fair; 34 → fair; 40 → moderate; 60 → poor; 80 → very-poor; 100.1 → extremely-poor; `null` → `unknown`.

**WMO → precip class**: 0 → clear; 1/2/3 → cloudy; 45/48 → fog; 51/53/55 → drizzle; 56/57 → freezing-drizzle; 61/63 → rain; 65 → downpour; 66/67 → freezing-rain; 71/73 → snow; 75 → heavy-snow; 77 → snow-grains; 80/81 → showers; 82 → downpour; 85 → snow-showers; 86 → heavy-snow-showers; 95 → storm; 96/99 → hail; 42 (not a WMO code) → `unknown` (never throws).

### 2.3 Tag contract (`tags.ts`) — thresholds are **the** contract; ARCHITECTURE.md must match these

- Temperature (on the API `apparent_temperature`, falling back to engine wind chill / heat index when absent): `arctic` ≤ −25 · `freezing` (−25, −10] · `cold` (−10, 0] · `chilly` (0, 10] · `mild` (10, 22] · `warm` (22, 28] · `hot` (28, 38) · `scorching` ≥ 38.
- Humidity (on `dew_point_2m`): `oppressive` ≥ 24 · `muggy` [18, 24) · `bone-dry` dew < 5 **and** RH < 25 %.
- Wind (`wind_speed_10m`, `wind_gusts_10m`): `still` < 6 km/h · `breezy` [20, 39) · `gale` ≥ 62 **or** gusts ≥ 60.
- Precip (WMO): `drizzle` 51/53/55/56/57 · `rain` 61/63/66/67/80/81 · `downpour` 65/82 · `snow` 71/73/77/85 · `blizzard` 75/86, or any snow code with wind ≥ 39 · `fog` 45/48 · `storm` 95 · `hail` 96/99.
- Air/sun: `uv-extreme` uv ≥ 8 · `smog` EU AQI ≥ 60 · `dust` `dust` ≥ 100 µg/m³.
- Place: `ocean` (geocode says sea) · `polar` |lat| ≥ 66.5°.
- Day-part (exactly one): `late` 23:00–03:59 · `dawn` sunrise ± 45 min · `morning` after dawn until 10:00 · `brunch` 10:00–12:59 on Sat/Sun (local weekday) · `afternoon` 13:00 (or 10:00 on weekdays) until golden hour · `golden` suncalc `goldenHour` → sunset · `evening` sunset → 22:59. Polar night/day (no sunrise): `late`/`morning`/`afternoon`/`evening` by clock only.
- **Driving tag** (dial + stamp + window grade) = first match in this priority list: `hail, storm, arctic, scorching, blizzard, oppressive, downpour, freezing, dust, smog, uv-extreme, gale, snow, hot, muggy, rain, cold, fog, drizzle, chilly, bone-dry, breezy, warm, mild, still, ocean, polar, <day-part>`.

**Expected tag sets per fixture** (order irrelevant; driving tag in bold):

| Fixture | Tags | Dial label | Shift |
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

### 2.4 Mini menu fixture (`menu.mini.json`) and hand-checked scores

The mini menu exists so that a human can check the scorer's arithmetic on paper. Four of its five rows are **verbatim subsets of the canonical §6.11 menu**; the fifth, `dark-rum-warm`, is synthetic and exists **only in this fixture** — it must never appear in `bar-menu.json`, in an e2e expectation or in a stamp assertion.

Scoring maths is the ledger-C8 model, the same one `score.ts` ships: **`weight = base × (1 + intensity)`** per tag (the values below come from the §2.3 band table), `score = Σ affinity × weight` plus the full serve-bonus matrix, plus a **−2** session-scoped repeat penalty. There is no "driving ×3, others ×1" shortcut — that was an illustration and it does not reproduce these numbers.

```ts
const WARM_SIDE = ['hot', 'scorching', 'muggy', 'oppressive'];   // fires the `warm` column
const COLD_SIDE = ['cold', 'freezing', 'arctic'];                // fires the `cold` column
const SERVE_BONUS = {
  warm:   { frozen:  3, iced:  2, chilled:  1, neat: 0, warm: -2, hot: -3 },
  cold:   { frozen: -4, iced: -3, chilled: -1, neat: 1, warm:  2, hot:  2 },
  chilly: { frozen: -2, iced: -1, chilled:  0, neat: 1, warm:  1, hot:  1 },
};
```

```jsonc
[
  { "id": "mojito",          "name": "Mojito",          "alcoholic": true,  "serve": "iced", "base": "rum",
    "affinity": { "oppressive": 4, "muggy": 3, "hot": 3, "scorching": 3, "late": 1, "brunch": 1 }, "twin": "virgin-mojito" },
  { "id": "virgin-mojito",   "name": "Virgin Mojito",   "alcoholic": false, "serve": "iced", "base": "none",
    "affinity": { "oppressive": 4, "muggy": 3, "hot": 3, "scorching": 3, "morning": 2, "brunch": 2 } },
  { "id": "hot-toddy",       "name": "Hot Toddy",       "alcoholic": true,  "serve": "hot",  "base": "whisky",
    "affinity": { "chilly": 4, "cold": 4, "freezing": 4, "rain": 4, "hail": 3, "storm": 3, "downpour": 3,
                  "fog": 3, "drizzle": 2, "snow": 2, "arctic": 2, "evening": 1 }, "twin": "hot-lemon-ginger" },
  { "id": "dark-n-stormy",   "name": "Dark 'n' Stormy", "alcoholic": true,  "serve": "iced", "base": "rum",
    "affinity": { "ocean": 7, "hail": 5, "downpour": 4, "storm": 4, "gale": 4, "breezy": 3, "rain": 3,
                  "warm": 2, "hot": 1 }, "twin": "virgin-stormy" },
  { "id": "dark-rum-warm",   "name": "Dark Rum, Warm",  "alcoholic": true,  "serve": "warm", "base": "rum",
    "affinity": { "arctic": 5, "freezing": 3, "blizzard": 3, "late": 1 } }
]
```

Tag weights used below (re-derived from §2.3, not copied from anywhere): `mumbai` oppressive **1.43**, hot **1.35**, late **1.02**, drizzle **0.78**, still **0.20** · `yakutsk` arctic **2.73**, snow **1.17**, late **0.80**, still **0.20** · `arabian-sea` oppressive **1.82**, hot **1.56**, late **1.02**, breezy **0.484**, ocean **1.50**.

| Fixture (mode) | mojito | virgin-mojito | hot-toddy | dark-rum-warm | dark-n-stormy | Top (score > 0, desc) |
|---|---|---|---|---|---|---|
| `mumbai` (bar) | 4·1.43 + 3·1.35 + 1·1.02 = 10.79, serve **+2** = **12.79** | excluded | 2·0.78 = 1.56, serve −3 = **−1.44** | 1·1.02 = 1.02, serve −2 = **−0.98** | 1·1.35 = 1.35, serve +2 = **3.35** | mojito 12.79, dark-n-stormy 3.35 |
| `mumbai` (barista) | excluded | 4·1.43 + 3·1.35 = 9.77, serve +2 = **11.77** | excluded | excluded | excluded | virgin-mojito only |
| `yakutsk` (bar) | 0, serve −3 = **−3.00** | excluded | 2·2.73 + 2·1.17 = 7.80, serve +2 = **9.80** | 5·2.73 + 1·0.80 = 14.45, serve +2 = **16.45** | 0, serve −3 = **−3.00** | dark-rum-warm 16.45, hot-toddy 9.80 |
| `arabian-sea` (bar) | 4·1.82 + 3·1.56 + 1·1.02 = 12.98, serve +2 = **14.98** | excluded | 0, serve −3 = **−3.00** | 1·1.02 = 1.02, serve −2 = **−0.98** | 7·1.50 + 1·1.56 + 3·0.484 = 13.51, serve +2 = **15.51** | dark-n-stormy 15.51, mojito 14.98 |

Read the serve column carefully: `mumbai` and `arabian-sea` both carry `hot` **and** `oppressive`, so only the `warm` row of `SERVE_BONUS` fires (iced +2, warm −2, hot −3); `yakutsk` carries `arctic`, so only the `cold` row fires (iced −3, warm +2, hot +2). No fixture in this table carries `chilly`, so the third row never fires here — `reykjavik` is where it does, and it is covered by the full-menu snapshot rather than by hand.

Two of the three margins are ≥ 4, so those picks are **dominant and never roll**: `mumbai` 12.79 − 3.35 = 9.44 and `yakutsk` 16.45 − 9.80 = 6.65. `arabian-sea`'s margin is 0.53, which would roll — except that the ocean rule in `pick.ts` fires first: with `ocean` in the tag set, the pick is forced to the highest-ranked drink whose `affinity.ocean ≥ 5`, which here is `dark-n-stormy` (7). That is what makes "the Dark 'n' Stormy family for ocean clicks" (DESIGN §9.2) a guarantee rather than a tendency, and T-PK-6 asserts it. On the **real** 40-drink menu the same three fixtures give Mojito 12.79 (roll, seed 0.320658 → index 0), Hot Buttered Rum 19.95 (margin 6.26, dominant) and Dark 'n' Stormy 15.51 (ocean rule) — the mini menu is a teaching aid, not a second contract.

### 2.5 Geo fixtures (`src/test/fixtures/geo/`)

Trimmed extracts of `ne_110m_admin_0_countries`, `ne_50m_admin_0_countries`, stripped `ne_10m_populated_places_simple` and `ne_50m_geography_marine_polys` containing only the features these points touch (India, Fiji, Russia, Lesotho, South Africa, Iceland, Antarctica, Norway, UAE, Portugal, USA, Kiribati; ~40 places; Arabian Sea, South Pacific Ocean, Caspian Sea polygons). The full files live in `src/data/geo/` and are exercised by the e2e suite.

| Point | Expected country (`ISO_A2`) | Nearest place (distance) | Sea/ocean | Class |
|---|---|---|---|---|
| 19.07, 72.88 | IN | Mumbai (**≤ 15 km**; hand-haversine to the NE point ≈ 12 km — pin the exact value on day 1) | — | land |
| 15.00, 65.00 | none | Mumbai (≈ 942 km → > 400 km) | **Arabian Sea** (`featurecla` sea) | ocean |
| −17.7, 179.9 | FJ (polygon crosses the antimeridian) | Suva | — | land or coastal — not "ocean" |
| −17.7, −179.9 | FJ | Suva | — | same as above |
| −29.6, 28.2 | **LS** (enclave; must not return ZA) | Maseru | — | land |
| 64.13, −21.90 | IS | Reykjavík (≈ 3 km) | — | land |
| 62.03, 129.73 | RU | Yakutsk (< 1 km) | — | land |
| −89.9, 0 | AQ (Antarctica is an NE admin-0 polygon) | nearest > 400 km | — | polar land (`polar` tag from latitude) |
| 89.9, 100 | none | > 400 km | Arctic Ocean | ocean + polar |
| 42.0, 51.0 | none | Aktau (< 400 km) | Caspian Sea (if the marine file names it; else "open water") | **ocean** — sea polygon wins over "city within 400 km" |
| 40.0, −30.0 | none | Ponta Delgada (≈ 451 km) | North Atlantic Ocean | ocean |
| 0.0, −140.0 | none | > 400 km | Pacific (name pinned day 1: North or South) | ocean |

Rules under test, **in this order**: marine polygon first (spherical `d3.geoContains` with a bbox pre-filter) ⇒ `ocean`; then country ⇒ `land`; then polar ice ⇒ `ice`; then no country **and** no place within 400 km ⇒ open water. Marine-before-country is load-bearing — it is the only reason the Caspian Sea row below passes, and IMPL §6.8 and ARCHITECTURE §5.7 both implement it that way. `polar` is purely latitude (|lat| ≥ 66.5) and is set on every hit regardless of kind.

### 2.6 Menu schema gate (`scripts/check-menu.mjs`) — the run that unblocked the engine

The §6.11 bar menu is the one dataset that can silently make the scorer useless: a tag with no drinks behind it contributes nothing to any score, so the pick collapses to a coin-flip between whatever else happens to be on the shelf. `scripts/check-menu.mjs` parses the two markdown tables of IMPL §6.11 directly (so the doc and the JSON cannot drift), rebuilds the drink list, and asserts the schema — including the rule §6.11 declares: **every one of the 34 `Tag`s has at least 3 drinks, counting both menus, with affinity ≥ 3.** It runs in CI (DEPLOYMENT §5) before the unit tests, and it is a release gate.

The 40-drink menu passes. Recorded output of the run that closed this out:

```text
=== §6.11 menu schema check ===
parsed 40 drinks from §6.11 (20 bar / 20 barista)
assertions: 778 passed, 0 FAILED

=== tag coverage (drinks at affinity >= 3) ===
scorching   8  ok      drizzle     4  ok      dawn        6  ok
hot         8  ok      rain        5  ok      morning     6  ok
warm        8  ok      downpour    8  ok      brunch      8  ok
mild        4  ok      snow        4  ok      afternoon   6  ok
chilly      4  ok      blizzard    6  ok      golden      4  ok
cold        8  ok      hail        5  ok      evening     4  ok
freezing    8  ok      storm       5  ok      late        4  ok
arctic      4  ok      fog         6  ok      ocean       4  ok
muggy       6  ok      still       4  ok      polar       6  ok
oppressive  4  ok      breezy      6  ok
bone-dry    5  ok      gale        6  ok
uv-extreme  4  ok      smog        6  ok
dust        6  ok

minimum coverage = 4 (rule needs 3); tags under = 0

=== §6.5 worked examples + fixture picks (BAR) ===
mumbai         pick=Mojito             margin=2.25  roll        top: Mojito 12.79 | Caipirinha 10.54 | Espresso Martini 6.43
yakutsk        pick=Hot Buttered Rum   margin=6.26  DOMINANT    top: Hot Buttered Rum 19.96 | Mulled Wine 13.70 | Hot Toddy 9.80
reykjavik      pick=Hot Toddy          margin=4.39  DOMINANT    top: Hot Toddy 9.78 | Irish Coffee 5.39 | Old Fashioned 4.22
dubai-noon     pick=Margarita          margin=0.03  roll        top: Margarita 19.55 | Frozen Daiquiri 19.51 | Paloma 13.18
arabian-sea    pick=Dark 'n' Stormy    margin=0.53  roll [ocean rule]
south-pole     pick=Hot Buttered Rum   margin=6.80  DOMINANT    top: Hot Buttered Rum 20.80 | Mulled Wine 14.00 | Hot Whisky Mac 11.20
denver-hail    pick=Dark 'n' Stormy    margin=7.45  DOMINANT    top: Dark 'n' Stormy 17.53 | Hot Whisky Mac 10.08 | Hot Toddy 6.48
lisbon-golden  pick=Gin & Tonic        margin=0.40  roll        top: Gin & Tonic 3.28 | Painkiller 2.88 | Moscow Mule 2.08
oslo-brunch    pick=Mimosa             margin=0.90  roll        top: Mimosa 3.30 | Bloody Mary 2.40 | Moscow Mule 1.80

=== fixture picks (BARISTA) ===
mumbai  Virgin Mojito · yakutsk  Hot Chocolate (DOMINANT) · reykjavik  Hot Lemon & Ginger
dubai-noon  Virgin Margarita · arabian-sea  Virgin Stormy · south-pole  Hot Chocolate (DOMINANT)
denver-hail  Virgin Stormy (DOMINANT) · lisbon-golden  Cucumber Tonic · oslo-brunch  Sunrise Fizz
```

Three things in that output are load-bearing and each has its own assertion:

- **The two §6.5 worked tables reproduce to the cent** — Mojito **12.79** / Caipirinha 10.54 / Espresso Martini 6.43, and Hot Buttered Rum **19.95** (19.96 before the doc's rounding) / Mulled Wine 13.69 / Hot Toddy 9.80. Any affinity edit that moves these fails the gate.
- **`denver-hail` no longer coin-flips.** Before the menu rework, `hail` had zero affinity on every drink and Denver printed a Gin & Tonic (3.70) over a Dark 'n' Stormy (3.60) — a 0.10 margin under a stamp reading "DO NOT GO OUTSIDE." It now prints **Dark 'n' Stormy at 17.53 with a 7.45 margin: dominant, deterministic, and the right joke.** The dial stays **FAIR** (thermal tag `warm`, apparent 27.6 °C) while the stamp is storm-family tier 2 — that divergence is the feature, and T-DL-3 asserts it.
- **`south-pole` has a real answer.** `polar` also had zero affinity anywhere; it now sits at 3–4 on six drinks, and the South Pole prints **Hot Buttered Rum at 20.80, margin 6.80, dominant** (barista: **Hot Chocolate**, same margin), stamp **SCALDING. DO NOT GO OUTSIDE.** (arctic intensity clamps to 1.0, +0.5 for `arctic` ⇒ tier 2), dial **ARCTIC**.

Four fixtures roll rather than dominate (`mumbai` 2.25, `dubai-noon` 0.03, `lisbon-golden` 0.40, `oslo-brunch` 0.90). That is intended — the seeded 85/11/4 draw is what keeps neighbouring clicks from printing the same coaster — and each is pinned by its seed, not left to chance: `seedrandom('19.1|72.9|0|bar')()` is **0.320658**, below 0.85, so Mumbai deterministically prints the Mojito.

---

---

## 3. Unit tests — `src/engine` (Given / When / Then)

### 3.1 `comfort.test.ts`
- **T-CF-1** Given each row of the heat-index table (§2.2) · When `heatIndex(tC, rh)` · Then `hiC`, `hiF`, `applies` and `adjustment` match within ±0.1.
- **T-CF-2** Given `(25.4, 94)` · When `heatIndex` · Then `applies === false` and the returned value is the simple formula (26.5 °C), never `NaN`.
- **T-CF-3** Given each humidex row · Then within ±0.1. Given `dew > t` (impossible, e.g. `(20, 25)`) · Then returns a number ≥ t and sets `suspicious: true` (no throw).
- **T-CF-4** Given each wind-chill row · Then within ±0.1; `null` exactly for `T > 10` or `v ≤ 4.8`; boundary `(10, 5) → 9.8`.
- **T-CF-5** Given each Magnus row · Then within ±0.1; `rh = 0` → `-Infinity` guarded to `null`; `rh = 100` → `t`.
- **T-CF-6** Given each Beaufort / UV / AQI / WMO row · Then exact class; unknown WMO `42` → `unknown`; `null` AQI → `unknown`.
- **T-CF-7** Given the `mumbai` fixture · When `features(fixture)` · Then `apparent === 31.5` (API value, not the engine's 26.5), `dewPoint === 24.4`, `humidex === 37.1`, `beaufort === 1`, `uvBand === 'low'`, `aqiBand === 'fair'` (EU 34), `precip === 'drizzle'`, `isDay === false`.
- **T-CF-8** Given `arabian-sea` · Then `marine.sst === 28.9`, `marine.waveHeight === 2.4`; given `mumbai` (no marine block) · Then `marine === undefined` and nothing throws.

### 3.2 `tags.test.ts`
- **T-TG-1..9** One test per fixture row in §2.3 · When `tagsFor(features, place, daypart)` · Then the tag set equals the expected set (`toEqual(new Set([...]))`) and `drivingTag()` equals the bold tag.
- **T-TG-10** Boundaries: apparent `−25` → arctic, `−24.9` → freezing; `38` → scorching, `37.9` → hot; dew `24` → oppressive, `23.9` → muggy, `17.9` → neither; wind `62` → gale, `61.9` + gusts `60` → gale, gusts `59.9` → not gale; uv `8` → uv-extreme, `7.9` → not; AQI `60` → smog; dust `100` → dust.
- **T-TG-11** Given WMO 73 (snow) with wind 39 · Then `blizzard` and not `snow`; with wind 38.9 · Then `snow`.
- **T-TG-12** Given `bone-dry` inputs (dew 2, RH 20) · Then `bone-dry`; (dew 2, RH 30) · Then not.
- **T-TG-13** Priority: given tags {hot, storm, oppressive} · Then driving is `storm`; {oppressive, hot} → `oppressive`; {mild, still, evening} → `mild`; {ocean, mild, late} → `mild` (ocean never drives the dial — the coaster copy handles it).
- **T-TG-14** Exactly one day-part tag is present for every fixture (property test over all fixtures).

### 3.3 `dial.test.ts`
- **T-DL-1** Ring positions: arctic → `ARCTIC` −120°; freezing/cold → `FREEZING` −80°; chilly → `CHILLY` −40°; mild/warm/(rain/fog/etc. with mild temp) → `FAIR` 0°; muggy → `MUGGY` +40°; oppressive → `SOUP` +80°; hot/scorching → `SCORCHING` +120°.
- **T-DL-2** Given `mumbai` · Then `{ label: 'SOUP', angle: 80, window: '31.5°', valuetext: 'Feels like 31.5 degrees, tag: soup' }` (DESIGN §13 aria text).
- **T-DL-3** Given `denver-hail` (driving `hail`, temp `warm`) · Then the needle sits at `FAIR` (temperature ring) while `stamp` is the danger tier — the dial is a thermometer, the stamp is the judgment.
- **T-DL-4** Given no data (error coaster) · Then `{ label: 'FAIR', angle: 0, window: '—' }` (DESIGN §10 "unknown").

### 3.4 `daypart.test.ts`
- **T-DP-1** Given `mumbai` (`00:45`) · Then `localHour === 0`, `daypart === 'late'`, `localTimeText === '00:45'`, `weekday === 'Sunday'` (2026-09-06 is a Sunday in Kolkata).
- **T-DP-2** Given `reykjavik` (`14:30`, sunset `20:12`) · Then `afternoon`; `sunsetIn === '5h42m'`; `goldenHourStart` (suncalc) is between `19:00` and `20:12`.
- **T-DP-3** Given `lisbon-golden` (`19:35`, sunset `19:58`) · Then `golden`; `sunsetIn === '23m'` and the copy hook `sunsetSoon === true` (≤ 45 min → "drink faster" line).
- **T-DP-4** Given `oslo-brunch` (`10:40` Sunday) · Then `brunch`; same clock on 2026-09-07 (Monday) · Then `afternoon` (weekday 10–13 is not brunch — RESEARCH §5.4).
- **T-DP-5** Given `yakutsk` (`03:10`) · Then `late`; given `03:59` → `late`; `04:00` → `morning` unless within dawn window.
- **T-DP-6** Given sunrise `06:22` and local `05:40` · Then `dawn` (sunrise − 45 min); `07:08` → `morning`; `07:06` → `dawn`.
- **T-DP-7** Given `south-pole` (no sunrise/sunset strings) · Then day-part by clock only (`07:15` → `morning`), `polarNight === true`, and `localTimeText` carries the hedge flag `approximate: true` (RESEARCH §10 Q9 — polar local time is a joke, not a fact).
- **T-DP-8** Given the `mumbai` fixture · When the test process runs with `TZ=UTC` (via `vi.stubEnv` + `Intl` check) · Then the result is identical — the engine formats `Date.now()` with `Intl.DateTimeFormat('en', { timeZone: fixture.timezone })`, never the process zone.
- **T-DP-9** Barista suggestion: `suggestBarista = localHour < 11 && menu === 'bar' && dayPart !== 'late'` (Oslo 10:40 yes; Reykjavík 14:30 no; Mumbai 00:45 — `late` overrides, so suggestion `false`, guilt line `true`; South Pole 07:15 yes, and the copy carries the `polarApproximateTime` hedge).

### 3.5 `score.test.ts` and `pick.test.ts`
- **T-SC-1..4** Given `menu.mini.json` and each row of the §2.4 table · When `scoreAll(menu, tags, mode)` · Then every drink's score equals the hand-computed number and the top-3 order matches.
- **T-SC-5** Barista mode filters `alcoholic === true` before scoring; bar mode filters `alcoholic === false` (mocktails only appear as twins).
- **T-SC-6** `repeatPenalty` is **−2**, session-scoped (C8): given previous verdict `{ cell: '19,73', drinkId: 'mojito' }` and the `mumbai` tags on `menu.mini.json` · Then mojito scores 12.79 − 2 = **10.79** and is still first (10.79 > 3.35); given a menu where the runner-up is within 2 points · Then the order flips (fixture `menu.tie.json`).
- **T-PK-1** Given `mumbai` top-3 and seed `"19.1|72.9|0|bar"` · When `pick()` twice · Then identical results (determinism), and `seedrandom(seed)()` is `0.320658…` — below 0.85, so index 0 (the Mojito) is not a coin-flip.
- **T-PK-2** Given lat 19.07 vs 19.08 (both `toFixed(1) === '19.1'`) · Then the same seed and the same pick; given 19.14 vs 19.16 · Then seeds differ (`'19.1'` vs `'19.2'`) — picks may differ (property: at least one of 20 neighbouring seeds yields a different top-3 member when scores are within 5 points).
- **T-PK-3** Seeded choice is weighted **85 / 11 / 4** — the code matches the prose: over 1,000 seeds on a three-way `mumbai` top-3 drawn from the full menu (12.79, 10.54, 6.43), index 0 is drawn in 85 % ± 3 %, index 1 in 11 % ± 3 %, index 2 in 4 % ± 2 %, and a negative-score drink **never** (scores ≤ 0 are excluded from the draw even if they sit in the top three). On `menu.mini.json` the `mumbai` margin is 9.44 ≥ 4, so that fixture does not roll at all — use the full menu for this test.
- **T-PK-4** Intensifier stamps come from `src/wit/grammar/intensifiers.json` and nowhere else (C12); `tier` is the numeric union `0 | 1 | 2`, never `'success' | 'warning' | 'danger'`. Expected: `mumbai` → `{ text: 'AGGRESSIVELY ICED', tier: 1, ink: 'iced' }` (Mojito, iced; 0.35 + 0.10 + 0.5 = 0.95); `reykjavik` → `{ text: 'HOT, NO ARGUMENTS', tier: 1, ink: 'hot' }` (Hot Toddy, hot; chilly intensity 0.79); `yakutsk` → `{ text: 'SCALDING. DO NOT GO OUTSIDE.', tier: 2, ink: 'hot' }` (Hot Buttered Rum; 0.948 + 0.5 = 1.448); `denver-hail` → `{ text: 'DO NOT GO OUTSIDE.', tier: 2, ink: 'storm' }` (hail forces the storm ladder and tier 2); `dubai-noon` → tier 2 on the iced ladder (`'SERVED IN A BUCKET'`) or the frozen ladder (`'A SLUSHIE. YOU EARNED IT.'`) depending on whether the roll lands on Margarita or Frozen Daiquiri — assert `tier === 2` and membership of the two ladders, not one literal string. There is **no brunch ladder**: `oslo-brunch` scores 0 and lands on the iced ladder at tier 0 (`'CHILLED'` for the Mimosa), so assert `{ tier: 0, ink: 'iced' }` and leave the string to the snapshot.
- **T-PK-5** Virgin twin: `mojito` in barista mode → `virgin-mojito` with `twinNote: 'Same insult, no rum.'`; the no-twin branch is exercised with `dark-rum-warm` from `menu.mini.json` (the only twin-less row anywhere — every one of the twenty canonical cocktails has a twin) → `twinNote: 'No virgin twin for this one. Have a lime soda and think about it.'` and the pick falls to the best non-alcoholic drink.
- **T-PK-6** Ocean rule: given `arabian-sea` tags · Then the final pick has `affinity.ocean ≥ 5` (dark-n-stormy) regardless of seed, and the place line is `"You are in the Arabian Sea. There is no bar here."`.
- **T-PK-7** Gentler-bartender lever: given `denver-hail` with `gentler: true` · Then `tier` downgrades from **2 to 1** and the stamp becomes **`INDOORS. NOW.`** (the storm ladder's tier 1). The lever only ever downgrades tier 2 → 1; it never touches tier 0 or 1, and it never changes the family.
- **T-PK-8** Snapshot: `pick()` output for all nine fixtures × {bar, barista} × seed is committed to `__snapshots__/pick.test.ts.snap` after the first green run. Any change to `bar-menu.json` affinities must update the snapshot deliberately ("pin, then guard").

### 3.6 `src/wit/grammar.test.ts` and `lint.test.ts`
- **T-WT-1** For every fixture × mode × 50 seeds, `speak(verdict, seed)` returns a string with no `#`, no `((`/`))` residue, no double spaces, ≤ 260 characters, ends with terminal punctuation.
- **T-WT-2** Given `mumbai` · Then the text contains the place line `~12 km from Mumbai, India` (or the pinned distance), a humidity jab from the `oppressive` bucket (one of the ≥ 8 variants), the drink name exactly once, and the stamp word marked with `«»` so the UI can set it in Righteous (DESIGN §5).
- **T-WT-3** Every slot × tag bucket in `voice.json` has ≥ 8 variants (DESIGN §16); the test fails listing the short buckets.
- **T-WT-4** Determinism: seed `"19.1|72.9|0|bar|voice"` yields the same sentence twice; the same seed with `|barista|voice` and with local hour `1` both differ.
- **T-WT-5** Hedge lines: fixtures with `precipitation_probability ≤ 60` and a precip tag include a "the models say" hedge (RESEARCH §8); `denver-hail` (90 %) does not need one.
- **T-WT-6** `lint.test.ts` scans every string in `voice.json`/`intensifiers.json` against a deny-list of protected-characteristic terms and slurs (list in `src/wit/lint-denylist.json`) — insults target weather and choices only (DESIGN §13).
- **T-WT-7** Snapshot of `speak()` for all fixtures × {bar, barista} at seed hour 0, committed after first green run.
- **T-WT-8** Rung ≥ 1 adapters: `garnish(text)` rejects (timeout 4 s, HTTP ≠ 200, empty body, output > 2× input length, output missing the drink name) all fall back to the rung-0 text unchanged — the LLM only *rewrites*, and a failure is invisible (D4).

### 3.7 `cache.test.ts`
- **T-CA-1** `cell(19.07, 72.88) === '19,73'`; `cell(19.08, 72.88) === '19,73'`; `cell(64.13, −21.90) === '64.25,-22'`; `cell(0.124, −140.13) === '0,-140.25'`; `cell(−89.9, 0) === '-90,0'`.
- **T-CA-2** Antimeridian: `cell(−17.7, 179.9)` and `cell(−17.7, −179.9)` both equal `'-17.75,-180'` (180 normalises to −180).
- **T-CA-3** Bucket: epoch `1788635700` → bucket `1987373`; `1788635700 + 899` → same; `+900` → `1987374`.
- **T-CA-4** Given a hit stored at bucket N · When read at N+1 · Then miss (15-min TTL). Storage is the **in-memory `Map` in front of the Dexie `weatherCache` table**, pruned to the newest **200** rows on boot (C9) — there is no `localStorage` weather cache. Assert: a write lands in both tiers; a cold boot with 250 rows leaves the newest 200; a memory miss falls through to Dexie; a stale row up to 24 h old is still served when the network fails, with `stale: true`.
- **T-CA-5** Marine responses are cached under the same key with a `marine` sub-field so an ocean re-click makes 0 requests within 15 min.

### 3.8 `openmeteo.test.ts`
- **T-OM-1** `forecastUrl(19.07, 72.88)` equals the RESEARCH §3 example: host `api.open-meteo.com`, `latitude=19.07&longitude=72.88`, the 15 `current=` variables in order, `hourly=uv_index,temperature_2m,precipitation_probability`, `daily=sunrise,sunset,uv_index_max,temperature_2m_max,temperature_2m_min`, `timezone=auto`, `forecast_days=1`. Coordinates are rounded to 2 dp.
- **T-OM-2** Weighting guard: the builder throws in dev if `current + hourly + daily` variables > 23 or `forecast_days > 1`, and the per-pour budget is asserted as **≤ 3 weighted calls for a land pour and ≤ 4 for a marine (ocean) pour** (forecast ≈ 2 + AQI 1 + marine ≈ 1).
- **T-OM-3** `aqiUrl` → host `air-quality-api.open-meteo.com`, `current=european_aqi,us_aqi,pm2_5,pm10,ozone,uv_index,dust`; `marineUrl` → `marine-api.open-meteo.com`, `current=wave_height,sea_surface_temperature,wind_wave_height`; `geocodeUrl('Mumbai')` → `geocoding-api.open-meteo.com/v1/search?name=Mumbai&count=5&language=en`.
- **T-OM-4** `fetchVerdictData(lat,lng,{ocean:false})` issues exactly 2 requests (forecast + AQI) in parallel; `{ocean:true}` issues 3; a failed AQI request does **not** fail the verdict (AQI band `unknown`, coaster still prints); a failed forecast does.
- **T-OM-5** `parse(forecast)` maps `current.time` (`2026-09-06T00:45`, no offset) + `utc_offset_seconds` to the correct instant; `is_day` 0/1 → boolean; `null` fields → `undefined`, never `0`.
- **T-OM-6** HTTP 429 → `BarBusyError`; network failure → `ModelsSilentError`; both carry `retryAfterMs` (60 000 for 429).
- **T-OM-7** No request ever targets `bigdatacloud`, `api-bdc.io`, `thecocktaildb.com` or `timeapi.io` (assert against an allow-list of hosts; D5, RESEARCH §8).
- **T-OM-8** Nominatim adapter (optional, off by default): given two calls 300 ms apart · Then the second waits ≥ 1,100 ms; results cached by cell; request has `zoom=10&format=jsonv2`; adapter is a no-op when the Back Office toggle is off.

### 3.9 `geocode.test.ts`
- **T-GC-1..12** One test per row of §2.5 · Then `{ iso, name, place, distanceKm, sea, class }` match; distances ±5 %.
- **T-GC-13** Index build: `buildIndex(places)` over the full stripped file (~7,300 points) completes < 30 ms (asserted in a `bench` file, not a hard unit gate).
- **T-GC-14** `nearest()` uses `geokdbush.around(index, lng, lat, 1, 400)` — argument order lng, lat (a classic bug) — proven by a point where swapping gives a different city (19.07, 72.88 swapped → 72.88 N is invalid → `undefined`).
- **T-GC-15** Country name comes from `ADMIN`, ISO from `ISO_A2`; entries where `ISO_A2 === '-99'` (NE quirk for e.g. Kosovo/N. Cyprus) fall back to `ISO_A2_EH` then `'??'` without throwing.
- **T-GC-16** Capital sass: `featurecla === 'Admin-0 capital'` → `isCapital: true` (Reykjavík, Maseru true; Mumbai false).

### 3.10 `units.test.ts`, `receipt.test.ts`, `ticker.test.ts`
- **T-UN-1** `fmtTemp(31.5, 'C') === '31.5°'`, `fmtTemp(31.5, 'F') === '88.7°'`, `fmtTemp(−48.7, 'C') === '−48.7°'` (U+2212, not hyphen-minus); `fmtWind(1.9, 'kmh') === '2 km/h'`, `'mph'` → `'1 mph'`, `'kn'` → `'1 kn'`.
- **T-RC-1** Given `mumbai` verdict · When `receiptLines()` · Then exactly: `THE GLOBE BAR` / `MUMBAI, IN · 19.07N 72.88E` / `06 SEP 2026 · 00:45 LOCAL` / `APPARENT 31.5° · DEW 24.4°` / `WIND 2 KM/H · UV 0 · AQI 55` / `AGGRESSIVELY ICED MOJITO` / a quoted jab / `Weather by Open-Meteo.com` / `CAMS · NASA · Natural Earth` (the receipt uses **US AQI** 55 — the register shows what the American register-tape would; the coaster shows the EU band; both are labelled).
- **T-RC-2** Ocean receipt second line is `ARABIAN SEA · 15.00N 65.00E` and adds `SST 28.9° · WAVES 2.4 M` and `· DWD` in the credit line (marine attribution, RESEARCH §3).
- **T-RC-3** Every receipt line ≤ 32 characters (thermal width) — property over all fixtures.
- **T-TK-1** Given instant `2026-09-05T19:15Z` and the 40-city ticker list · When `crossings(now)` · Then Lisbon (−9.14) is within 30 min of its terminator crossing only if the subsolar point says so — the golden is computed with `solar-calculator` in the test itself and compared to a brute-force `suncalc.getPosition().altitude ≈ 0` search (±2 min). Ticker text format `LAST ORDERS IN LISBON · 23:58` / `FIRST COFFEE IN AUCKLAND · 06:41`.

### 3.11 `src/features/tab/repo.test.ts` (Dexie, fake-indexeddb)
- **T-TB-1** Schema: `verdicts` table `++id, createdAt, cell, drinkId, [lat+lng]` — all four indexes, in that order (`createdAt` for the newest-first Tab, `cell` for "have I poured here recently", `drinkId` reserved for stats, `[lat+lng]` for deep links) — with fields `lat, lng, place, localTime, drinkId, tags, stats, shift, createdAt, text, seed` (DESIGN §9.6); `add()` then `list()` returns newest first.
- **T-TB-2** Export → `{ app: 'barometer', schema: 1, exportedAt, verdicts: [...] }`; import of that file into an empty DB yields identical rows (ids re-assigned, `createdAt` preserved); importing a file with `app !== 'barometer'` rejects with `WrongTabError`.
- **T-TB-3** `isStale(verdict, now)` true when `now − createdAt > 15 min` → row re-fetches and shows the "re-poured" tag.
- **T-TB-4** `clear()` removes all rows; the UI test (§4) confirms the inline CONFIRM plate, no modal.
- **T-TB-5** Two tabs (two Dexie instances on the same fake DB) see each other's inserts via `liveQuery` (D1 multi-tab).

---

## 4. Component tests (Testing Library, jsdom)

- **T-UI-1 Coaster skeleton → printed.** Given `<Coaster state="skeleton">` · Then a pressed ring and three grey bars, **no** shimmer animation class; When props change to the `mumbai` verdict · Then the same DOM node updates in place (no unmount — test by holding a ref), the place line, jab, stamp `AGGRESSIVELY ICED` (rendered in an element with `font-family` containing `Righteous`, `text-transform: uppercase`, `transform: rotate(-4deg)`), drink name `Mojito`, serve line `in a bucket`, receipt strip; `role="article"`, `aria-live="polite"`, and the announcement text `Verdict for ~12 km from Mumbai: aggressively iced Mojito`.
- **T-UI-2 Coaster flip.** Click "Flip for recipe" → back face shows `MOJITO`, the ingredient table (mono measures: `45 ml`, `20 ml`), method ≤ 3 steps, glass `highball · crushed ice`, credit `IBA · MIT`; click outside controls → flips back; keyboard: Enter on the card flips, Escape flips back.
- **T-UI-3 NeonSign switch.** `role="switch"`, `aria-checked=false`, accessible name `Alcohol-free menu`; click → `aria-checked=true`, text `BARISTA`, class `neon--green`; Space toggles; persisted to `localStorage['bar.barista']` (web adapter).
- **T-UI-4 Coaster re-print on barista.** With the `mumbai` verdict shown, toggling barista re-renders the coaster with `Virgin Mojito` and note `Same insult, no rum.` and does **not** replay the slide animation (`data-animate` stays `printed`).
- **T-UI-5 BaristaTag.** With `oslo-brunch` (10:40) the tag `It's 10 a.m. there. I am legally a barista now.` renders with a button that flips; with `reykjavik` no tag.
- **T-UI-6 WallDial.** The dial is `role="meter"` with `aria-valuemin=-120 aria-valuemax=120 aria-valuenow=80 aria-valuetext="Feels like 31.5 degrees, tag: soup"`; the window shows `31.5°` in JetBrains Mono with `font-variant-numeric: tabular-nums`; tapping the dial fires `onOpenReceipt`.
- **T-UI-7 Bottles.** 12 bottles render as `<button>`s named e.g. `Rum — the bartender's pick` for the picked base and `Gin` otherwise; the picked one has class `bottle--picked` (rotate −7°) and the rest `bottle--dim`; hit area ≥ 44×44 (assert `min-width/min-height` styles).
- **T-UI-8 Window layers.** Given driving tag `oppressive` · Then `--grade` on the window element is `#1B6F6A` at 22 % and the droplet layer is mounted; `storm` → lightning layer + `--stamp: var(--danger)`; `fog` → desaturated pane; under `matchMedia('(prefers-reduced-motion: reduce)')` mocked true, every layer has `data-static="true"`.
- **T-UI-9 Lever & BrassKnob.** Lever is `role="switch"` with visible label; knob is `role="slider"` min 0 max 100 step 5, ArrowUp/Right +5, ArrowDown/Left −5, Home/End; value announced.
- **T-UI-10 Search.** Typing `Mum` (debounced 250 ms) calls the geocoding URL builder once with `name=Mum`; results render as brass rows `Mumbai · Maharashtra · IN`; Enter on a row calls `onPour(19.076, 72.877)`; empty result shows `Never heard of it.`
- **T-UI-11 TabRow.** Renders `#0007  Mumbai, IN  02:14  Mojito  31.5°` with a 56 px whole-row button; stale rows show the `re-poured` tag after activation.
- **T-UI-12 Receipt (register).** Renders a `<table>` with `<th scope="row">` labels; the TEAR key is a `<button>` named `Tear off receipt`; after tear, a stub `receipt torn 00:46` remains.
- **T-UI-13 Error coasters.** `BarBusyError` → `Bar's busy. Give it a minute.` with RETRY disabled for 60 s (countdown text) ; `ModelsSilentError` → `The models are not answering. Try again.` with RETRY enabled; bad deep link → `Nowhere on Earth has those coordinates. Impressive.`
- **T-UI-14 Units.** Back Office `°F` radio re-renders the coaster strip as `FEELS 88.7°` without refetch (asserted via a fetch spy).
- **T-UI-15 Shift tokens.** Rendering a verdict with `is_day: 1` sets `document.documentElement.dataset.shift = 'day'`; `is_day: 0` → `'night'`; Back Office pin `night` overrides.

---

## 5. End-to-end (Playwright)

All specs use `e2e/fixtures/routes.ts`, which routes `**/api.open-meteo.com/v1/forecast*`, `**/air-quality-api.open-meteo.com/**`, `**/marine-api.open-meteo.com/**`, `**/geocoding-api.open-meteo.com/**` to fixture JSON keyed by the `latitude`/`longitude` query (rounded to 2 dp), and **fails the test** on any other third-party host (`page.route('**', abort)` last).

- **E2E-1 The Bar loads (`bar.spec.ts`).** Goto `/#/` · Then the neon wordmark `THE GLOBE BAR` is visible before the canvas mounts (assert `canvas` appears later via `waitForSelector`), the brass plate `Spin. Tap. Survive.` is visible, 12 bottles, the dial at FAIR, ticker text matches `/^(LAST ORDERS|FIRST COFFEE) IN [A-Z ]+ · \d{2}:\d{2}$/`.
- **E2E-2 Pour Mumbai (`verdict.spec.ts`).** Goto `/#/` · `await page.evaluate(() => window.__bar.pour(19.07, 72.88))` · Then within 100 ms the skeleton coaster exists (`[data-state=skeleton]`); within 2 s (mocked network is instant; the fly-to is 1200 ms) the URL is `#/v/19.07,72.88`, the coaster shows `AGGRESSIVELY ICED` + `Mojito`, the dial reads `SOUP`, `html[data-shift=night]`, the rum bottle is `bottle--picked`, the window has the droplet layer, the register printed 9 lines.
- **E2E-3 Deep link.** Goto `/#/v/62.03,129.73` directly · Then the Yakutsk coaster prints **`Hot Buttered Rum`** / **`SCALDING. DO NOT GO OUTSIDE.`** (margin 6.26 ≥ 4, so this is dominant and never rolls), dial `ARCTIC`, frost layer present, night shift. `Dark Rum, Warm` is a `menu.mini.json`-only drink and must never appear in an e2e expectation. Goto `/#/v/999,999` · Then the "Nowhere on Earth" coaster and a `Back to the bar` plate that navigates to `#/`.
- **E2E-4 Ocean.** Pour `15, 65` · Then 3 fixture requests were made (forecast, AQI, marine), place line `You are in the Arabian Sea. There is no bar here.`, drink `Dark 'n' Stormy`, receipt contains `SST 28.9°` and `DWD`.
- **E2E-5 Day shift.** Pour `64.13, −21.90` · Then `html[data-shift=day]`, the neon has class `neon--off`, computed `--bg` is `rgb(239, 227, 204)` (`#EFE3CC`), coaster `Hot Toddy` / **`HOT, NO ARGUMENTS`** (the `hot` ladder's tier 1 — there is no bare `HOT` stamp at tier 1), dial `CHILLY`, rain-streak layer present.
- **E2E-6 Recipe flip (`recipe.spec.ts`).** After Mumbai, click `Flip for recipe` · Then `MOJITO` back face; click `make it virgin` · Then `Virgin Mojito` with the green BARISTA stamp; click outside → front face.
- **E2E-7 Barista (`barista.spec.ts`).** After Mumbai, click the BAR sign · Then BARISTA (green), spirits dimmed (`.bottle--dim` count ≥ 6, tea tin lit), coaster re-printed `Virgin Mojito`; reload · Then still BARISTA (persisted); pour Oslo (`59.91, 10.75`) with BAR on · Then the brass tag `It's 10 a.m. there…` appears and its button flips the sign.
- **E2E-8 Register tear (`register.spec.ts`).** After Mumbai, click TEAR · Then a download named `globe-bar-mumbai-2026-09-06.png` (desktop) is produced; decode it in the test: dimensions **1080×1350**; the top-left 8×8 px average colour is mahogany (`#1A0F0A` ± 8) and the centre is paper (`#F3E6C8` ± 8). On the Pixel profile with `navigator.share` stubbed · Then `share()` is called with one `image/png` file.
- **E2E-9 The Tab (`tab.spec.ts`).** Pour Mumbai then Reykjavík · Goto `#/tab` · Then two rows newest-first; click the Mumbai row · Then the globe re-flies (`pointOfView` spy) and the coaster re-prints **without** a network request (fetch count unchanged; within 15 min); advance the clock 16 min, click again · Then one forecast request and the `re-poured` tag. `Export JSON` downloads `globe-bar-tab.json`; `Clear tab` shows the inline CONFIRM plate; confirm → `No tab yet. Go somewhere.`
- **E2E-10 Back Office (`office.spec.ts`).** `#/office` · units → °F updates the strip; Shift pin `day` while showing Mumbai → `data-shift=day` and the neon goes off; Motion `less` → `html[data-motion=reduce]`; AI garnish radios: rung 2 key field is `type=password`, the "Free hosted tiers may train on your prompts" note is visible, `session-only` checkbox stores nothing in `localStorage` (assert key absent after typing).
- **E2E-11 Search (`search.spec.ts`).** Type `Mumbai` in the classified-ad box · Then geocoding fixture rows; Enter → pours 19.076,72.877 (which routes to the `mumbai` fixture by 2-dp rounding → `19.08,72.88`; the route map includes that key).
- **E2E-12 Errors (`errors.spec.ts`).** Route forecast to 429 · pour · Then `Bar's busy. Give it a minute.`, RETRY disabled with a 60 s countdown; route to abort · Then `The models are not answering. Try again.`; RETRY re-issues the request (count +1).
- **E2E-13 Keyboard (`keyboard.spec.ts`).** Tab to the globe wrapper (`role=application`, `tabindex=0`) · ArrowRight ×3 rotates (spy on `pointOfView` lng +15°) · Enter pours at the centre crosshair → a verdict; `+`/`−` zoom; Tab order: sign → dial → menu → globe → search → where-am-I → register → tab.
- **E2E-14 No WebGL (`bar.spec.ts`).** `addInitScript` overriding `HTMLCanvasElement.prototype.getContext` to return `null` for `webgl`/`webgl2` · Then the SVG dotted globe renders, clicking it at the pixel for Mumbai (equirectangular hit-test) pours 19.07,72.88 (±0.5°), and the bar is otherwise identical.
- **E2E-15 Context lost.** After the globe mounts, `page.evaluate` fires `webglcontextlost` on the canvas · Then the brass tag `The globe's bearings seized. Tap to re-seat.` appears; clicking it re-mounts (a new `<canvas>` element).
- **E2E-16 Where am I.** Grant geolocation (`context.grantPermissions(['geolocation'])`, `setGeolocation({latitude: 19.07, longitude: 72.88})`) · click `Where am I` · Then a pour at those coords via the **offline** lookup; assert no request to `bigdatacloud`/`api-bdc.io` (the offline path is the default — RESEARCH §5.3 step 5).
- **E2E-17 Live probe (`live/openmeteo.spec.ts`, `@live`).** From the deployed origin `https://<owner>.github.io/barometer/` (or a local `vite preview`), a real `fetch` to each of the three hosts with `Origin` set returns 200 and `access-control-allow-origin: *`; response has `timezone` and `current.interval === 900` (forecast) / `3600` (AQI). Skipped unless `LIVE=1`.

---

## 6. Offline, PWA & persistence tests (`offline.spec.ts`)

- **OFF-1** First load online, then `context.setOffline(true)`, reload · Then the shell renders (neon, bottles, counter), the register prints `NO SIGNAL · SERVING FROM THE TAB`, the neon flickers once (`data-flicker` attribute observed), search and where-am-I are disabled with the tooltip, the last verdict opens from the Tab.
- **OFF-2** Offline pour → the `ModelsSilentError` coaster (no crash, no hanging skeleton > 4 s).
- **OFF-3** Precache manifest (`dist/sw.js` / workbox manifest) contains: the app shell, `tokens.css`, the three Fontsource woff2 files, `earth-day.jpg`, `earth-topology.png`, `earth-water.png`, `public/geo/{countries-110m,places,marine-50m,land-dots}.json`, `drinks.json`, `bar-menu.json`, `voice.json`, the CC0 sound sprite; it does **not** precache the 8K/4K Blue Marble/Black Marble WebP, `countries-50m.json` or `night-sky.png` — all three are in `globIgnores` and the WebP set is runtime-cached (`CacheFirst`, 30 days, **max 4 entries**, C4). Note the geo files live in `public/geo/`, not `src/data/geo/`. Assert with a script that reads `dist/manifest.webmanifest` and the workbox precache list.
- **OFF-4** Manifest: `start_url` and `scope` equal `import.meta.env.BASE_URL` (`/barometer/` on Pages), `display: standalone`, `theme_color` and `background_color` `#1A0F0A`, icons 192/512 + maskable 1024 (DESIGN §14).
- **OFF-5** Update flow: deploy a build with a changed asset, reload twice · Then the new SW activates (`registerType: 'prompt'` → a brass toast **`New bottles in stock. Restock?`** — the exact string in ARCHITECTURE §7, DEPLOYMENT §3/§7/§14 and IMPL §10.6/§11.1), never a silent hard reload mid-verdict.
- **OFF-6** Verdict cache: online pour Mumbai, go offline, pour 19.08,72.90 (same 0.25° cell, same 15-min bucket) · Then the coaster prints from cache with a tiny **`re-poured from memory`** brass tag and zero requests.
- **OFF-7** Service worker is **not** registered when `Capacitor.isNativePlatform()` (unit test on the `platform/sw.ts` adapter with a mocked Capacitor).

---

## 7. Visual tests against the design tokens (`e2e/visual/*.spec.ts`)

Baselines are generated on Linux Chromium only (CI); Windows runs use `--update-snapshots` locally only to eyeball, never commit. `maxDiffPixelRatio: 0.01`, `animations: 'disabled'`, `page.clock` frozen, `window.__bar.freeze()` + `textures('flat')`, the globe canvas **masked**, fonts awaited via `document.fonts.ready`.

**Screens** (DESIGN §16, each at 1440×900 and Pixel 7, Night and Day where applicable): The Bar empty (Night, Day via `prefers-color-scheme`) · The Verdict Mumbai (Night) · The Verdict Reykjavík (Day) · Recipe flip · Barista on (Mumbai) · Register receipt · The Tab (3 rows) · Back Office · Error coaster (429) · Ocean coaster · reduced-motion Verdict (must equal the normal Verdict's final frame ±0.5 %).

**Token assertions** (computed styles, not screenshots):

| Element | Property | Night | Day | Paper scope |
|---|---|---|---|---|
| `body` | `background-color` | `rgb(26,15,10)` | `rgb(239,227,204)` | — |
| `.coaster.paper` | `background-color` / `color` | `rgb(243,230,200)` / `rgb(28,18,12)` | `rgb(251,244,228)` / `rgb(28,18,12)` | yes |
| `.coaster__stamp` (Mumbai) | `color` | `rgb(31,110,123)` (`--accent-2` paper) | same | yes |
| `.coaster__stamp` (Denver) | `color` | `rgb(160,40,31)` (`--danger` paper) | same | yes |
| `.neon` | `-webkit-text-stroke-color` / `filter` | `rgb(255,179,71)` / contains `drop-shadow` | `rgb(232,183,160)` / `none` | — |
| `.plate--button` | `color` on brass | `rgb(26,15,10)` (`--accent-ink`) | `rgb(251,244,228)` | — |
| `:focus-visible` ring | `outline` | `2px solid rgb(245,200,96)` offset 2px | `2px solid rgb(122,90,18)` | — |
| `.coaster__drink` | `font-family` / `font-size` ≥ | `Righteous` / 44 px desktop, 36 px phone | | |
| `.jab .intensifier` | `font-family`, `text-transform`, `vertical-align` | `Righteous`, `uppercase`, `-0.08em` | | |
| `.receipt` | `font-family`, `font-variant-numeric` | `JetBrains Mono Variable`, `tabular-nums` | | |
| any text on `.counter` (Night) | `color` ∈ | {`--ink`, `--ink-muted`, `--accent`} only | Day: `--ink` only on oak | DESIGN §5 rule |
| `.window` weather layers | bounding box | entirely inside `.window` rect; **no** layer intersects `.coaster` rect | | DESIGN §3.5 |

**The §1 test** (`visual/signature.spec.ts`): for every screenshot state, at least one of `.bottle`, `.coaster-ring`, `.pin`, `.neon` is inside the viewport with `opacity > 0.5` — "if a screenshot could be mistaken for a weather app, it fails".

**Motion timing** (`visual/motion.spec.ts`, `animations: 'allow'`): coaster slide finishes within 560–700 ms and lands with a measurable overshoot (`translateX` crosses 0 then returns, ≥ 4 px); dial swing 600 ms ± 60; receipt prints 9 lines at 60 ms stagger (first→last ≈ 480 ms); lightning frame: one white layer ≥ 0.85 opacity for ≤ 100 ms, never twice within 1 s (flash-safety, DESIGN §13); under reduced motion none of these run and the coaster appears in ≤ 250 ms.

---

## 8. Performance tests and budgets

Measured on `vite preview --base /barometer/` with Playwright throttling `Slow 4G` + 4× CPU for mobile numbers; desktop unthrottled. Lighthouse CI runs both presets on `#/` and `#/v/19.07,72.88`.

| Metric | Budget | Where |
|---|---|---|
| Initial JS (route `#/`, excluding the globe chunk), gzip | ≤ 180 KB | `scripts/check-bundle.mjs` on `dist/assets/*.js` (`rollup-plugin-visualizer` JSON) |
| Globe chunk (`three` + `globe.gl` + `three-globe`), gzip, lazy | ≤ 320 KB | same |
| Geo data (110m countries + stripped places + 50m marine), gzip | ≤ 900 KB; 50m countries lazy ≤ 1.2 MB | same |
| Drinks + voice JSON, gzip | ≤ 150 KB | same |
| First-paint textures | `earth-day.jpg` ≤ 260 KB; bump + specular ≤ 850 KB | same |
| Full textures (BMNG 8K + Black Marble 8K WebP + 4K variants) | ≤ 10 MB total; each ≤ 3 MB | same + `du` in CI |
| Total `dist/` | ≤ 25 MB (GitHub Pages 1 GB is far away; bandwidth is the constraint) | CI |
| LCP (mobile, Slow 4G) | ≤ 2.5 s and the LCP element is the neon `<svg>`/plate, **not** the canvas | LHCI assertion `largest-contentful-paint` + custom audit reading `lcp-element` |
| TTI / TBT (mobile) | ≤ 4.5 s / ≤ 300 ms | LHCI |
| Click → skeleton coaster | ≤ 100 ms (`performance.mark('pour')` → skeleton paint) | `perf/pour.spec.ts` |
| Click → printed coaster (mocked network) | ≤ 1.6 s (1.2 s fly-to + print) | same |
| Reverse geocode (110m + kdbush) | ≤ 20 ms p95; 50m ≤ 60 ms | `bench/geocode.bench.ts` (Vitest bench) |
| Tag + score + pick + speak | ≤ 5 ms | bench |
| kdbush index build | ≤ 30 ms | bench |
| Globe idle FPS | ≥ 55 desktop; ≥ 30 Pixel 7 profile (SwiftShader excluded — measured only on real devices, §12) | `perf/fps.spec.ts` uses `requestAnimationFrame` sampling over 3 s |
| Coaster slide frame time | no frame > 32 ms during the 620 ms slide (desktop) | trace analysis |
| Memory | no `webglcontextlost` within 20 pours; JS heap growth < 15 MB over 20 pours (no leaked listeners/HTML markers) | `perf/leak.spec.ts` |
| Open-Meteo weighted calls per pour | **≤ 3 land / ≤ 4 ocean** (forecast ≈ 2 weighted + AQI 1; marine +1 when the click lands on water) — asserted from the URL builder variable counts | unit T-OM-2 |
| Lighthouse PWA/installability | manifest + SW valid, `maskable` icon present | LHCI |

---

## 9. Accessibility checks

- **A11Y-1** axe (`@axe-core/playwright`, tags `wcag2a, wcag2aa, wcag21aa`) on every §7 screen in **both shifts**, with zero `serious`/`critical` violations; `color-contrast` is checked separately inside `.paper` because axe evaluates the actual computed background (this catches an inverted-token bug in the paper scope).
- **A11Y-2** Contrast spot-checks computed from DESIGN §4 tables (`--ink` on `--bg` ≥ 15:1 Night, 14.5:1 Day; `--accent-2` on `--surface-2` inside paper only at ≥ 18 px/600 — assert every element using it there meets that size or fails).
- **A11Y-3** Keyboard: the globe wrapper is focusable with a visible 2 px `--focus` ring; arrow keys rotate 5°, Enter pours, `+`/`−` zoom; nothing removes focus; no keyboard trap in the sheets (Escape closes; focus returns to the opener).
- **A11Y-4** Screen reader names (Testing Library `getByRole`): globe `application` "World globe. Arrow keys rotate, Enter chooses the centre."; coaster `article` + live region; dial `meter` with `aria-valuetext`; bottles buttons; neon `switch`; receipt `table` with row headers; decorative SVGs `aria-hidden`.
- **A11Y-5** Touch targets ≥ 44×44 on the Pixel profile for: 12 bottles, pin, sign, dial, levers, tab rows (56 px), coaster buttons, TEAR key, search rows (`perf`-style bounding-box sweep).
- **A11Y-6** Reduced motion honoured (§7 motion tests) and the Back Office `Motion: less` produces the same DOM as the media query.
- **A11Y-7** 200 % zoom (`page.setViewportSize` 720×450 equivalent) → coaster is single-column, no horizontal scroll, bands become scrollable at < 600 px tall.
- **A11Y-8** Colour independence: hot/iced/storm are present as stamp text + glassware SVG `aria-label` (`highball with crushed ice`, `mug with steam`) — asserted per fixture.
- **A11Y-9** Manual pass before each tag: NVDA + Chrome on desktop (pour, flip, barista, tear, tab, office); TalkBack on the phone (§12).

---

## 10. Security / privacy / licence checks (`privacy.spec.ts`, `check:licenses`, `check-bundle.mjs`)

- **SEC-1** `dist/**` contains no string matching `/AIza[0-9A-Za-z_-]{30,}/`, `/sk-[A-Za-z0-9]{20,}/`, `bigdatacloud`, `api-bdc.io`, `thecocktaildb`, `timeapi.io`, `planetpixelemporium`, `teijo/iba-cocktails`.
- **SEC-2** `index.html` carries a `<meta http-equiv="Content-Security-Policy">` (GitHub Pages cannot send headers) with `connect-src 'self' https://api.open-meteo.com https://air-quality-api.open-meteo.com https://marine-api.open-meteo.com https://geocoding-api.open-meteo.com https://nominatim.openstreetmap.org` (+ the Worker URL and `https://generativelanguage.googleapis.com` only when the AI garnish build flag is on), `img-src 'self' data: blob:`, `worker-src 'self' blob:`, no `unsafe-eval`; an e2e test confirms a `fetch('https://example.com')` from the page is blocked.
- **SEC-3** No request leaves the page on load (before any pour) except same-origin assets — asserted by the catch-all route (no analytics, no fonts CDN; D1/D5).
- **SEC-4** BYO key (rung 2): stored via WebCrypto AES-GCM with a non-extractable key in IndexedDB; `localStorage` and `sessionStorage` never contain the plaintext key (search all storage after paste); `session-only` leaves nothing after `context.close()`.
- **SEC-5** `npm run check:licenses` passes with the allow-list in §1 (MIT/Apache/BSD/ISC/MPL/Zlib/CC0/Unlicense/0BSD/CC-BY-4.0); `gsap` is **not** a production dependency unless ARCHITECTURE.md justifies it; nothing GPL (`weather-map-layer`, `WeatherMaster` code) is present.
- **SEC-6** `src/data/attribution.json` lists, and the Back Office + README render: Open-Meteo (CC BY 4.0, "Weather data by Open-Meteo.com"), CAMS/Copernicus (AQI), DWD (marine), NASA Earth Observatory (Blue/Black Marble), Natural Earth (public domain), `rasmusab/iba-cocktails` (MIT), `alfg/opendrinks` (MIT), Righteous/Space Grotesk/JetBrains Mono (OFL), each CC0 sound with its Freesound/Kenney source id, OpenStreetMap (ODbL) only when Nominatim is enabled — a test diffs the JSON against the About screen text.
- **SEC-7** Every Nominatim request (when enabled) carries `Referer` (browser-set) and the adapter is rate-limited (T-OM-8); the toggle is off by default in a fresh profile.

---

## 11. Day-1 verification list (from RESEARCH "likely"/"unsure"/open questions and the shared surveys)

Run these on the first day (Phase 0) and tick them in this file with the date. Anything that fails changes ARCHITECTURE.md/DEPLOYMENT.md before feature work.

| # | Claim to verify | Source | How | Result |
|---|---|---|---|---|
| D1-1 | Open-Meteo forecast/AQI/marine still return `access-control-allow-origin: *` **from the real Pages origin** (`https://<owner>.github.io`) | RESEARCH §3 (probed from Node, not a browser) | `npm run test:live` against the deployed hello-world; also DevTools on the phone | ☐ |
| D1-2 | `timezone=auto` for 15°N 65°E (Arabian Sea) and 0°,−140° — pin the strings in `arabian-sea` fixture and the Pacific name | RESEARCH §3 (not probed for these) | `curl` both; update fixtures | ☐ |
| D1-3 | Marine API returns real numbers (not `null`) for coastal/lake points like the Caspian (42, 51); decide whether Caspian is `ocean` | RESEARCH §3 | `curl marine-api…latitude=42&longitude=51` | ☐ |
| D1-4 | NE marine polygon `name` at the fixture points: (15, 65) = "Arabian Sea", (0, −140) = North/South Pacific, (42, 51) = "Caspian Sea"?; NE Mumbai point coordinates → pin `distanceKm` in T-GC-1 | RESEARCH §5.3 | Node script over `src/data/geo/*` | ☐ |
| D1-5 | `npx cap add android` succeeds with **no** JDK/SDK on the machine (only a Gradle-sync warning) | RESEARCH §8 ("likely, not documented"); ANDROID-PACKAGING (CLI source) | run it; commit `android/` | ☐ (only if the optional APK is pursued) |
| D1-6 | First `android-release.yml` run: Temurin 21 + AGP 8.13 + Gradle 8.14.3 build a signed APK on `ubuntu-24.04` (Q5 "confirm with the first Actions run") | RESEARCH §10 Q5 | `workflow_dispatch` | ☐ |
| D1-7 | three-globe example textures (`earth-day.jpg`, `earth-topology.png`, `earth-water.png`, `night-sky.png`) licence is acceptable for redistribution, or switch to NASA originals | RESEARCH §10 Q3 (**still open**) | read `vasturiano/three-globe` README/LICENSE + `example/img` provenance; decide and record in `attribution.json` | ☐ |
| D1-8 | PlanetPixelEmporium textures are proprietary — keep the "do not use" stance; make sure no example code pulled them in | Verification log #24 (unverifiable) | grep `dist/` (SEC-1) | ☐ |
| D1-9 | Fontsource package names exist and ship the needed subsets/weights: `@fontsource/righteous`, `@fontsource-variable/space-grotesk`, `@fontsource-variable/jetbrains-mono` | DESIGN §5 (not npm-probed) | `npm view <pkg> version` | ☐ |
| D1-10 | `suncalc@2.0.2` ESM import works under Vite/Vitest and the licence-scanner exclusion holds | RESEARCH §4 | `check:licenses` | ☐ |
| D1-11 | `actions/setup-node@v7` accepts `cache: npm` (else drop it) | HOSTING "claims to verify" #3 | first `pages.yml` run log | ☐ |
| D1-12 | Polar `timezone=auto` results (`Antarctica/McMurdo`, `Etc/GMT-7`) are what the coaster should say — keep the `approximate` hedge | RESEARCH §10 Q9 | judgement call after seeing the copy | ☐ |
| D1-13 | globe.gl `onGlobeClick` survives React 19 StrictMode double-mount (no duplicate listeners → two pours per click) | new | E2E-2 asserts exactly one forecast request per pour | ☐ |
| D1-14 | Owner's phone: `gl.MAX_TEXTURE_SIZE` ≥ 4096 in the Android WebView; 4K WebP decodes without context loss | RESEARCH §7/§8 | `chrome://inspect` console on the debug APK | ☐ |
| D1-15 | WebGPU absent in Android System WebView (so rung 3 WebLLM stays hidden on Android) | DECISIONS D3; ANDROID-PACKAGING ("verify") | `'gpu' in navigator` on the debug APK | ☐ |
| D1-16 | Capacitor 8 predictive back on Android 16 fires `@capacitor/app` `backButton` (else add `enableOnBackInvokedCallback="false"`) | ANDROID-PACKAGING Android 16 notes | §12 M-BACK | ☐ |
| D1-17 | Natural Earth raster (NE1/NE2) usability if the stylised globe skin is ever wanted — "likely" only | RESEARCH §3 | **N/A — stretch only (Phase 6); does not gate the release**, and IMPL §9.7 carries the same N/A so the two lists match | ☑ N/A |
| D1-18 | `timeapi.io` terms remain unknown → confirm the code path is absent (SEC-1) | Verification log #23 | grep | ☐ |
| D1-19 | Open-Meteo call weighting: a Mumbai (land) pour costs ≤ 3 weighted calls (≈ 2 forecast + 1 AQI) and an Arabian-Sea (ocean) pour ≤ 4 — read the `X-RateLimit`-style headers if any are exposed; otherwise keep the 15-min cache | Verification log #2 | DevTools | ☐ |
| D1-20 | GitHub Pages serves `manifest.webmanifest` and `sw.js` under `/barometer/` with correct MIME types; PWA installable in Chrome desktop and Android | HOSTING gotchas | `curl -I`, Lighthouse | ☐ |

---

## 12. Manual QA checklist — Android build (optional Capacitor APK)

Run on the owner's phone with a `workflow_dispatch` APK (`webContentsDebuggingEnabled: true`) before each `v*` tag. Barometer has **no camera, gallery, notification or alarm features**, so those sections are absent by design; the risky parts are WebGL in the WebView, gestures, haptics, share and geolocation.

**Install & first run**
- ☐ M-INST-1 APK from the Releases page installs over the previous version (same key, higher `versionCode`); Chrome's one-time "install unknown apps" prompt only.
- ☐ M-INST-2 Splash is `#1A0F0A` with the brass pin only; adaptive icon shows the pin-on-coaster; themed icon is brass on mahogany.
- ☐ M-INST-3 Cold start to neon visible ≤ 2.5 s on the owner's phone; globe mounts after; no white flash (WebView background set to `#1A0F0A`).
- ☐ M-INST-4 No service worker registered (DevTools → Application); assets load from `https://localhost/`.

**Globe / WebGL**
- ☐ M-GL-1 Globe renders with 4K textures (not 8K); `chrome://inspect` console shows `MAX_TEXTURE_SIZE` ≥ 4096 and DPR capped at 1.5.
- ☐ M-GL-2 Flick spins ~2.5 turns with damping; idle drift starts after 8 s; drift stops on touch.
- ☐ M-GL-3 Tap → pin drop + ripple + fly-to at ≥ 30 fps (eyeball with the DevTools FPS meter); 20 consecutive pours: no context loss, no crash, heap stable.
- ☐ M-GL-4 Background the app 30 s → return: globe paused on `visibilitychange`, resumes; if the context was lost, the "bearings seized" tag appears and re-seats.
- ☐ M-GL-5 Disable "Force GPU rendering"/use a low-end profile if available: the SVG fallback globe appears and is clickable.

**Gestures & navigation**
- ☐ M-BACK-1 Predictive back: with the Back Office open, back closes the sheet (stays in the app); with the Tab open, closes the drawer; from `#/v/…` goes to `#/`; from `#/` a second back exits (D1-16).
- ☐ M-BACK-2 Dragging the globe from within 24 px of the left edge does **not** trigger the system back gesture (edge dead margin, `touchmove` preventDefault inside the cradle).
- ☐ M-GEST-1 Counter sheet drags up/down; handle sits 16 px above the system gesture zone; the sheet does not fight the nav-bar swipe.
- ☐ M-GEST-2 Coaster swipe-left shows the "second opinion" drink; receipt pull-down ≥ 56 px tears.
- ☐ M-GEST-3 Long-press the register display pauses the ticker; release resumes.

**Rotation & insets**
- ☐ M-ROT-1 Portrait ↔ landscape: the globe re-sizes via `--globe-size`; the cradle SVG stays registered with the canvas; no verdict is lost (state in Zustand survives; no re-fetch).
- ☐ M-ROT-2 Edge-to-edge: mahogany runs under the status bar; the back-bar strip pads by `safe-area-inset-top`; the foot-rail by `-bottom`; status icons are light on Night and dark on Day (`@capacitor/status-bar` style flips with the shift).
- ☐ M-ROT-3 On a foldable/tablet (≥ 600 dp) the desktop three-band layout appears and orientation lock is ignored gracefully.

**Haptics & sound**
- ☐ M-HAP-1 `impact Light` on globe pointer-down and coaster landing; `Medium` on pin drop and receipt tear; `Heavy` (40 ms) on lightning (pour Denver `39.74,-104.99` — the storm fixture must be reachable via the debug "fixture pour" menu in test builds, or use a real storm); `selectionChanged` at 30° detents and on the sign flip; `notification Warning` on a danger-tier verdict.
- ☐ M-HAP-2 Back Office haptics lever off → no vibration anywhere; system "touch feedback" off → none either.
- ☐ M-SND-1 Silence until the first touch; then tink/shhk/clink; neon buzz only on Night; the rain bed's cutoff rises with wind; volume knob and mute lever work; audio ducks/pauses when a call comes in and resumes.

**Permissions** (the only runtime permission is location)
- ☐ M-PERM-1 Fresh install: nothing is requested at launch. Tapping "Where am I" prompts for location (`ACCESS_COARSE_LOCATION` is enough — precise is optional); deny → brass toast "The bar respects your privacy. Tap the globe instead."; allow → a pour at the device position via the offline lookup, **no** BigDataCloud/network geocoder call (DevTools network tab).
- ☐ M-PERM-2 Revoke location in Settings → the button re-prompts once, then degrades to the toast.

**Share, storage, network**
- ☐ M-SHR-1 TEAR → Android share sheet with a 1080×1350 PNG named `globe-bar-<place>-<date>.png`; share to Photos/WhatsApp works; cancel returns to the register with the stub.
- ☐ M-STO-1 Barista toggle, units, shift pin, sound persist across force-stop (`@capacitor/preferences`); the Tab persists (IndexedDB in the WebView) across app updates.
- ☐ M-STO-2 Tab → Export JSON produces a file via the share sheet; Import from Files restores rows.
- ☐ M-NET-1 Airplane mode: `NO SIGNAL · SERVING FROM THE TAB`; a new pour prints the error coaster; back online, RETRY works.
- ☐ M-NET-2 A real pour on mobile data completes ≤ 3 s; the three Open-Meteo hosts answer (CORS is irrelevant from `https://localhost` origin? — no: the WebView still sends `Origin: https://localhost`; confirm `*` is honoured).

**Text & a11y on device**
- ☐ M-A11Y-1 System font size at 130 %: coaster reflows, nothing clips; the drink name wraps rather than overflows.
- ☐ M-A11Y-2 TalkBack: globe announces its label; swipe navigation reaches sign → dial → bottles → coaster → buttons; the coaster announces the verdict once when it prints.
- ☐ M-A11Y-3 "Remove animations" system setting → reduced-motion path (no flicker, static window, instant coaster).

**Release sanity**
- ☐ M-REL-1 About/Back Office shows the version from the tag (`versionName`) and the attribution block.
- ☐ M-REL-2 `SHA256SUMS.txt` on the Release matches the downloaded APK (`certutil -hashfile` on Windows or the Files app's details).

---

## 13. Release gate (what must be green before `git tag v*`)

1. `npm run test:all` green on `main` (unit ≥ 95 % engine coverage, wit snapshots reviewed, licences clean, bundle budgets met, e2e incl. visual + a11y).
2. `npm run test:live` green from the deployed Pages origin (D1-1) within the last 7 days.
3. Lighthouse CI: mobile LCP ≤ 2.5 s with a DOM LCP element; PWA installable.
4. Every `design/preview.html` state has a matching, reviewed visual baseline (DESIGN §16) and passes the §1 signature test.
5. Manual NVDA pass (A11Y-9) and, if the APK is built, §12 fully ticked on the owner's phone (Android 14+, ideally 16).
6. `docs/TESTING.md` §11 day-1 list has no unticked row that affects the release; README Attribution matches `attribution.json` (SEC-6).
7. Keystore `.p12` + passphrase backup confirmed present (DEPLOYMENT.md §13) — before the **first** tag only, then yearly.
