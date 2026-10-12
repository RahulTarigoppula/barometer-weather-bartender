# Barometer — "The Contextual Weather Bartender" — Research Dossier

**Date:** 2026-09-06 · **Owner constraints:** solo dev, Windows 11, Node 22 / npm / git / Python 3.14; no Java, no Android SDK. Web app must be free-hostable static; Android is optional (Capacitor, built in GitHub Actions, installed from Releases). Everything free, preferably OSI-licensed.

**One-liner:** Spin a photoreal globe, click anywhere, and a judgmental bartender computes that spot's *right-now* weather (heat index, dew point, wind chill, UV, rain/snow/storm, local time, AQI) and prescribes the beverage you need to survive it — with a no-alcohol mode.

Every API/library below was checked on 2026-09-06 (web search, doc fetch, and direct `curl` probes for CORS/no-key behaviour). Confidence tags: **verified** = doc + live probe or npm registry; **likely** = doc only; **unsure** = memory/inference, must confirm.

---

## 1. Summary & feasibility

**Feasibility: 5 / 5.** This is one of the easiest of the eight projects to build 100% client-side with zero secrets:

- **Weather:** [Open-Meteo](https://open-meteo.com/) needs no key, returns `Access-Control-Allow-Origin: *` (probed), and one GET gives current temp, apparent temp, humidity, dew point, precipitation/rain/showers/snowfall, WMO weather code, cloud cover, pressure, wind + gusts, `is_day`, hourly UV, daily sunrise/sunset **and** the IANA timezone via `timezone=auto` (probed for Mumbai, mid-Pacific → `Etc/GMT+9`, Antarctica → `Antarctica/Troll`). Separate no-key Air-Quality and Marine endpoints also passed the CORS probe.
- **Reverse geocoding:** the obvious "free client-side" option (BigDataCloud) turned out to be **unusable for map clicks** — its fair-use policy allows *only live device GPS coordinates* and threatens HTTP 402 + IP bans for arbitrary coordinates (policy text re-verified 2026-09-06 in BigDataCloud's own client README; note a single arbitrary-coordinate probe still returns 200 today, i.e. enforcement is behavioural/after-the-fact, which is exactly why it would break silently). The recommended fix is fully offline: bundle Natural Earth (public domain) country polygons + populated places and do point-in-polygon + nearest-city in the browser. Nominatim is a policy-compliant optional fallback (1 req/s total, ODbL attribution).
- **Globe:** [globe.gl](https://github.com/vasturiano/globe.gl) (MIT, v2.46.2, published 2026-08-22) gives `onGlobeClick → {lat, lng}`, atmosphere, bump/specular maps, HTML-element markers, ripple rings, and ships day/night/cloud/terminator examples. Upgrade path for "best of the best" is a custom react-three-fiber shader globe (day/night blend + city lights + drifting clouds + Fresnel rim + bloom).
- **Cocktails:** don't depend on TheCocktailDB at runtime (its test key is dev/education only; a $10 one-off premium key is required for app-store release). Bundle open data: IBA official cocktails (MIT JSON, ~90 recipes), Open Drinks (MIT, 756 recipes incl. virgin/mocktail entries), plus a hand-curated 40–60 drink "bar menu" tagged for weather.
- **Bartender brain:** pure procedural — feature extraction (heat index, humidex, wind chill, dew-point bands, Beaufort, UV band, AQI band, WMO code, local day-part) → weighted drink scoring → Tracery grammar for the insult. Optional LLM garnish via in-browser WebLLM (no key) or BYO key behind a Cloudflare Worker.
- **Hosting:** static on GitHub Pages (1 GB site, 100 GB/month soft bandwidth) — keep textures ≤ 4–8 MB total. **Android:** Capacitor 8.5 project committed to the repo, APK built by GitHub Actions (free for public repos), attached to Releases.

**License gotchas found (details in §8):** BigDataCloud fair-use (no map-click coords); Open-Meteo is non-commercial-only + CC BY 4.0 attribution (+ CAMS attribution for air quality, + DWD attribution for marine); Open-Meteo *server* code is AGPL-3.0 but that does not touch API consumers; `teijo/iba-cocktails` has **no licence file at all** (all-rights-reserved by default — use `rasmusab/iba-cocktails` MIT instead); `PranshulGG/WeatherMaster` is **GPL-3.0** (reference only, don't copy code); Nominatim ODbL attribution + 1 rps; TheCocktailDB test key not for published apps; `open-meteo/weather-map-layer` is **GPL-2.0**; GSAP is free but **not OSI** (Webflow "Standard No-Charge" licence); `postprocessing` is Zlib (permissive, OSI); PlanetPixelEmporium textures (used by popular three.js earth demos) are proprietary — do not redistribute; Solar System Scope 8K textures are CC BY 4.0 (credit required); NASA imagery is free with "NASA Earth Observatory" credit and no implied endorsement; `cities.json`/GeoNames data is CC BY 4.0.

---

## 2. Recommended stack

| Layer | Choice | Why | Alternatives considered |
|---|---|---|---|
| Build / framework | **Vite 8.2 + React 19 + TypeScript** | Fast static build, first-class PWA plugin, plays with R3F and Capacitor. Vite 8.2.2 engines: `^20.19.0 || >=22.12.0` (owner's Node 22.17 is fine) | SvelteKit (fine, but R3F ecosystem is React) |
| Globe (MVP) | **globe.gl 2.46.2** (three 0.185.1, MIT) | `onGlobeClick({lat,lng})`, `pointOfView()` fly-to, atmosphere, bump/specular, HTML markers, ripple rings, day/night + clouds examples | `react-globe.gl` 2.38 if you want JSX props |
| Globe (full vision) | **@react-three/fiber 9.7 + @react-three/drei 10.7 + custom `ShaderMaterial`** | Day/night terminator blend, city lights, cloud shell, Fresnel atmosphere, weather particles, bloom via `@react-three/postprocessing` 3.1 / `postprocessing` 6.39 (Zlib) | CesiumJS (Apache-2.0, no ion key needed with OSM/Esri imagery, but ~heavy and "GIS" looking); cobe 2.0 (5 KB dotted globe, MIT, no picking — README confirmed: only `phi`/`theta`/`markers`/`onRender`); MapLibre GL 6.7 globe projection (BSD-3, globe since v5.0.0 on 2024-12-31, needs a tile source) |
| Weather data | **Open-Meteo Forecast + Air Quality (+ Marine for ocean clicks)** | No key, CORS `*`, 15-min "current" interval, timezone + sunrise/sunset in the same call | OpenWeatherMap / WeatherAPI (keys, must be proxied) as BYO-key upgrades only |
| Reverse geocoding | **Offline Natural Earth**: `ne_50m_admin_0_countries` (3.1 MB) or `ne_110m` (0.8 MB) + `ne_10m_populated_places_simple` (4.9 MB → strip to ~400 KB) with `d3-geo` `geoContains` / `@turf/boolean-point-in-polygon` and `kdbush` + `geokdbush` nearest-city | Nominatim (optional, 1 rps, ODbL credit); BigDataCloud (**rejected**: policy forbids map-click coords) |
| Timezone / local time | **Open-Meteo `timezone=auto`** → `Intl.DateTimeFormat(..., {timeZone})` | Verified for land, open ocean, Antarctica, both poles and the antimeridian (see §3 probes); zero extra bytes | `@photostructure/tz-lookup` 11.6.1 (CC0, 72 KB) for offline/pre-fetch guess; `timeapi.io` (no key, CORS `*`, probed) |
| Sun / sky | **suncalc 2.0.2** (BSD-2 per repo LICENSE file; note the 2.0.2 `package.json` has **no `license` field**, so licence scanners will flag it — cite the repo LICENSE) for altitude, golden/blue hour; **solar-calculator 0.3.0** (ISC) for the subsolar point driving the terminator shader | — |
| Cocktail data | **Bundled JSON**: `rasmusab/iba-cocktails` (IBA official, **MIT**) + `alfg/opendrinks` (MIT, 756 recipes, has `keywords: ["alcoholic"]` and virgin/mocktail entries) + own curated `bar-menu.json` with weather tags. (`teijo/iba-cocktails` has **no licence file** — do not bundle it.) | TheCocktailDB (dev-only test key; $10 premium for published apps) |
| Bartender text | **tracery-grammar 2.8.4** (ISC) + **seedrandom 3.0.5** (MIT) for deterministic-per-click variety | Optional: `@mlc-ai/web-llm` 0.2.84 (Apache-2.0, WebGPU, no key) or BYO key via Cloudflare Worker |
| Motion / UI | **motion 13.2** (MIT) for speech-bubble physics; **GSAP 3.15** (free, non-OSI) only if you want SplitText text reveals | — |
| Audio | **Web Audio procedural rain/wind** (zero assets) + optional CC0 loops (Freesound CC0 filter, Kenney.nl) via **howler 2.2.4** (MIT, stable but last published 2023) | — |
| State | **zustand 5** (MIT) | — |
| PWA | **vite-plugin-pwa 1.3** (MIT) — offline shell, precache textures + data | — |
| Android | **Capacitor 8.5.1** (`@capacitor/core`, `/android`, `/cli`; optional `/haptics`, `/geolocation`) built in **GitHub Actions** (`actions/setup-java` Temurin 17 or 21 + `./gradlew assembleDebug`; `android-actions/setup-android@v4` is optional because the `ubuntu-24.04` runner image already ships Android SDK Platform 36, Build-Tools 36.0.0 and JDK 17/21), APK uploaded to Releases | PWA → TWA via Bubblewrap (needs JDK locally; skip) |
| Hosting | **GitHub Pages** (static) | Cloudflare Pages / Netlify / Vercel Hobby all fine |
| Backend / proxy | **None required.** Optional Cloudflare Worker only for BYO-key LLM/weather upgrades | — |

**Rationale:** every runtime dependency is no-key + CORS-open or bundled, so the app is a pure static site with no financial exposure; globe.gl gets a clickable, good-looking globe in an afternoon, and its `globeMaterial` hook lets you swap in the custom day/night shader later without rewriting interaction code.

---

## 3. Data sources & APIs

| Name | URL | License / terms | Free tier / limits | Purpose | Confidence |
|---|---|---|---|---|---|
| Open-Meteo Forecast API | https://api.open-meteo.com/v1/forecast · docs https://open-meteo.com/en/docs | Free for **non-commercial** use ("You may only use the free API services for non-commercial purposes" — [terms](https://open-meteo.com/en/terms)); data **CC BY 4.0** — suggested wording "Weather data by Open-Meteo.com" as a link ([licence](https://open-meteo.com/en/licence)). Server source is AGPL-3.0, irrelevant to API consumers | No key; 600/min, 5,000/h, 10,000/day, 300k/month ([pricing](https://open-meteo.com/en/pricing)). **Weighting:** requests with > 10 weather variables or > 2 weeks for one location count as fractional multiple calls (e.g. 2 weeks × 15 variables = 1.5 calls) — the 23-variable example below is ~2 calls; CORS `*` (re-probed 2026-09-06) | current + hourly + daily weather, timezone, sunrise/sunset | **verified** |
| Open-Meteo Air Quality API | https://air-quality-api.open-meteo.com/v1/air-quality · [docs](https://open-meteo.com/en/docs/air-quality-api) | Same terms; docs require attribution to **CAMS ENSEMBLE** (Copernicus) + Open-Meteo | No key; same limits; CORS `*` (re-probed 2026-09-06); global 0.4° (5-day, 12-hourly update), Europe 0.1° (4-day, daily update); `current.interval` is 3600 s (hourly), not 15 min | `european_aqi`, `us_aqi`, `pm2_5`, `pm10`, `ozone`, `dust`, pollen, `uv_index` | **verified** |
| Open-Meteo Marine API | https://marine-api.open-meteo.com/v1/marine · [docs](https://open-meteo.com/en/docs/marine-weather-api) | Same terms; docs additionally require **attribution to DWD** + Open-Meteo | No key; CORS `*` (re-probed 2026-09-06); headline 5 km (DWD EWAM, Europe) down to ~50 km (ERA5-Ocean, global) | `wave_height`, `sea_surface_temperature`, swell — for ocean clicks ("you are in the sea, have a Dark 'n' Stormy") | **verified** |
| Open-Meteo Geocoding API | https://geocoding-api.open-meteo.com/v1/search · [docs](https://open-meteo.com/en/docs/geocoding-api) | Same terms | No key; **forward search only** (no reverse) | Optional "type a city" search box; returns lat/lng, country, admin1, timezone, population | **verified** |
| Natural Earth vectors (GeoJSON mirror) | https://github.com/nvkelso/natural-earth-vector (`geojson/ne_110m_admin_0_countries.geojson` 0.8 MB, `ne_50m_admin_0_countries.geojson` 3.1 MB, `ne_10m_populated_places_simple.geojson` 4.9 MB (7,342 features), `ne_110m_land.geojson` 0.14 MB, `ne_10m_geography_marine_polys.geojson` 1.7 MB (also `ne_50m_…` 1.2 MB, `ne_110m_…` 0.5 MB) — all HEAD-probed 200 on 2026-09-06) | **Public domain**, no attribution required — "Crediting the authors is unnecessary" ([terms](https://www.naturalearthdata.com/about/terms-of-use/)) | Static files, bundle in repo | Offline reverse geocoding: country (`ADMIN`, `NAME`, `ISO_A2`, `CONTINENT`, `REGION_UN`, `SUBREGION` — field names confirmed in the file), nearest city (fields `name`, `adm0name`, `iso_a2`, `adm1name`, `pop_max`, `latitude`, `longitude`, `featurecla` — confirmed), ocean name (`name`, `featurecla` = `ocean`/`sea`… — confirmed), land/ocean test | **verified** |
| Natural Earth rasters | https://www.naturalearthdata.com/downloads/ (NE1/NE2 hypsometric, shaded relief, ocean bottom) | Public domain | Static | Stylised (non-satellite) globe skin option | likely |
| NASA Blue Marble Next Generation (+topo/bathy) | https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography-bathymetry | NASA imagery generally not copyrighted; credit "NASA Earth Observatory"; no implied endorsement ([NASA media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)) | 12 monthly composites at 5400×2700 and 21600×10800 JPEG/GeoTIFF, plus 500 m tiles | Day texture (pick the current month for seasonal snow — nice touch) | **verified** |
| NASA Black Marble 2016 | https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps | As above | 3600×1800 and 13500×6750 JPEG/GeoTIFF, colour + grayscale | Night-lights texture | **verified** |
| three-globe example textures (CDN) | `https://cdn.jsdelivr.net/npm/three-globe/example/img/` → `earth-blue-marble.jpg` (1.4 MB), `earth-day.jpg` (245 KB), `earth-night.jpg` (715 KB), `earth-dark.jpg` (95 KB), `earth-topology.png` bump (378 KB), `earth-water.png` specular (430 KB), `night-sky.png` (904 KB) — all HEAD-probed 200. **`clouds.png` is *not* in the npm package's `example/img/`** (jsDelivr 404); it lives in the GitHub repo at `example/clouds/clouds.png` (5.0 MB, also served by unpkg) | Repo is MIT; images are NASA-derived (treat as NASA credit) | CDN or copy into repo | Instant MVP textures | **verified** (existence) / likely (image licence) |
| Solar System Scope textures | https://www.solarsystemscope.com/textures/ | **CC BY 4.0** — credit required | 2K and 8K: day, night, clouds, normal, specular | Premium 8K day/night/clouds set with matching projection | **verified** |
| IBA official cocktails (JSON) | https://github.com/teijo/iba-cocktails (`recipes.json` 42 KB, `ingredients.json` 3 KB) | **No licence: `LICENSE`, `LICENSE.md`, `LICENSE.txt` and `package.json` all 404 (checked 2026-09-06)** → all rights reserved by default; **do not bundle** | Static | ~90 canonical recipes: `name`, `glass`, `category`, `ingredients[{unit, amount, ingredient}]`, `garnish`, `preparation` | **verified (unlicensed)** |
| IBA cocktails (CSV+JSON, IBA site + Wikipedia) | https://github.com/rasmusab/iba-cocktails | **MIT** (LICENSE fetched) | Static | Alternative IBA dataset with parsed quantities | **verified** |
| Open Drinks | https://github.com/alfg/opendrinks (`src/recipes/*.json`, 756 files) | **MIT** (code + recipes) | Static | Big recipe pool incl. `virgin-mojito`, `mango-nojito-mocktail`, `shirley-temple`, `virgin-mary`, lemonades; schema: `name, description, ingredients[{quantity, measure, ingredient}], directions[], image, keywords[]` (`"alcoholic"` keyword present) | **verified** |
| TheCocktailDB | https://www.thecocktaildb.com/api/json/v1/1/… ([docs](https://www.thecocktaildb.com/api.php)) | Test key `1` for **development/education only**; production/app-store release requires **Premium ($10 one-off)**; CORS `*` (probed) | No rate limit published; test key capped at 100 items per list (probed: `filter.php?a=Alcoholic` returns exactly 100); 58 `Non_Alcoholic` drinks (probed); thumbnails at `{strDrinkThumb}/small` and `/preview` (both probed 200, ~11 KB) | Optional dev-time image/recipe source; **do not ship as runtime dependency** | **verified** |
| Nominatim reverse | https://nominatim.openstreetmap.org/reverse?lat=…&lon=…&format=jsonv2&zoom=10 ([policy](https://operations.osmfoundation.org/policies/nominatim/)) | ODbL — display "Data © OpenStreetMap contributors"; **absolute max 1 req/s**; identifying `User-Agent`/`Referer` (stock library UAs are rejected); results **must be cached**; no autocomplete; **"systematic queries" incl. reverse queries in grids are prohibited**; long-running/bulk scripts limited to 4 req/min | Free; CORS `*` (re-probed 2026-09-06, 200) | Optional online fallback for precise locality names | **verified** |
| BigDataCloud reverse-geocode-client | https://api.bigdatacloud.net/data/reverse-geocode-client (now **307-redirects to `https://api-bdc.io/…`**; browsers follow it transparently) | Free, no key, CORS `*` — **but fair-use policy (quoted from BigDataCloud's own [client README](https://github.com/bigdatacloudapi/js-reverse-geocode-client)): "only live GPS/WiFi coordinates obtained at the moment of the call are permitted. Pre-stored, cached, or externally-sourced coordinates are strictly not allowed"; "Violations result in a 402 error and your IP address being banned"** | — (a single arbitrary-coordinate probe returned 200 on 2026-09-06 — enforcement is not per-request, so it *would* work in dev and break later) | **Rejected for map clicks.** Only legit use: "where am I" button with HTML5 Geolocation | **verified** |
| timeapi.io | https://timeapi.io/api/time/current/coordinate?latitude=…&longitude=… | Free, no key, CORS `*` (probed) — terms/limits not published | Unknown | Fallback local-time lookup (not needed with Open-Meteo) | unsure |
| GeoNames via `cities.json` npm | https://github.com/lutangar/cities.json (npm 1.1.61, 2026-08-01) | **CC BY 4.0** (GeoNames; LICENSE file and npm `license` field both confirm) | ~130k cities > 1,000 pop, updated monthly; large file | Denser nearest-city if Natural Earth's ~7,300 places feel sparse (needs attribution) | **verified** |
| Freesound | https://freesound.org (search filter: licence CC0) | CC0 / CC BY / CC BY-NC (+ legacy Sampling+) per sound — filter to CC0; account required to download ([FAQ](https://freesound.org/help/faq/)) | Free | Rain, thunder, wind, bar ambience loops | **verified** |
| Pixabay sound effects | https://pixabay.com/sound-effects/ ([licence](https://pixabay.com/service/license-summary/)) | Pixabay Content Licence: free incl. commercial, no attribution; no standalone redistribution | Free | ~~Ambience loops~~ **[REJECTED — the Pixabay Content Licence is not on the D5.2 allow-list (PD/CC0/CC BY/ODbL) and is absent from the `check:licenses` allow-list; use Freesound CC0 / Kenney, or synthesise]** | **verified, then rejected** |
| Google Fonts | https://fonts.google.com | SIL OFL 1.1 | Free | Typography (self-host the woff2) | likely |

**Example requests (all probed 2026-09-06):**

```text
GET https://api.open-meteo.com/v1/forecast
    ?latitude=19.07&longitude=72.88
    &current=temperature_2m,relative_humidity_2m,apparent_temperature,dew_point_2m,
             precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,
             wind_speed_10m,wind_gusts_10m,wind_direction_10m,is_day
    &hourly=uv_index,temperature_2m,precipitation_probability
    &daily=sunrise,sunset,uv_index_max,temperature_2m_max,temperature_2m_min
    &timezone=auto&forecast_days=1
→ { "timezone":"Asia/Kolkata","utc_offset_seconds":19800,
    "current":{"time":"2026-09-06T00:45","interval":900,"temperature_2m":25.4,
               "relative_humidity_2m":94,"apparent_temperature":31.5,"dew_point_2m":24.4,
               "precipitation":0.10,"weather_code":51,"cloud_cover":100,
               "wind_speed_10m":1.9,"wind_gusts_10m":2.9,"is_day":0}, ... }

GET https://air-quality-api.open-meteo.com/v1/air-quality
    ?latitude=19.07&longitude=72.88&current=european_aqi,us_aqi,pm2_5,pm10,ozone,uv_index,dust&timezone=auto
→ { "current":{"european_aqi":34,"us_aqi":55,"pm2_5":12.1,...} }

GET https://marine-api.open-meteo.com/v1/marine
    ?latitude=0&longitude=-140&current=wave_height,sea_surface_temperature,wind_wave_height&timezone=auto
→ { "timezone":"Etc/GMT+9","current":{"wave_height":1.96,"sea_surface_temperature":29.6,...} }
```

Note `current.time` is **local** time (no offset suffix) — combine with `utc_offset_seconds`, or just format `Date.now()` with `Intl.DateTimeFormat('en', { timeZone: data.timezone, hour: 'numeric', minute: '2-digit' })`.

**`timezone=auto` edge-case probes (2026-09-06, all HTTP 200 with data):** Mumbai → `Asia/Kolkata`; 0°,−140° → `Etc/GMT+9`; −72°,2.5° → `Antarctica/Troll`; −89.9°,0° (South Pole) → `Antarctica/McMurdo` (+12 h); 89.9°,100° (North Pole) → `Etc/GMT-7`; −20°,179.9° (antimeridian) → `Etc/GMT-12`; 30°,−40° (Atlantic) → `Etc/GMT+3`; −30°,80° (Indian Ocean) → `Etc/GMT-5`; −75°,−175° (Ross Sea) → `Antarctica/McMurdo`. All are valid IANA names accepted by `Intl.DateTimeFormat`. Caveat: polar results are pragmatic guesses (the poles have no "real" zone), so phrase polar local-time jokes loosely.

---

## 4. Key libraries

| Package | Version (npm, 2026-09-06) | License | Purpose | Notes |
|---|---|---|---|---|
| `three` | 0.185.1 | MIT | WebGL | peer dep of everything below |
| `globe.gl` | 2.46.2 (2026-08-22) | MIT | MVP globe: click → `{lat,lng}`, fly-to, atmosphere, bump/specular, rings, HTML markers | https://github.com/vasturiano/globe.gl |
| `three-globe` | 2.45.2 | MIT | Underlying reusable Three object; examples: clouds, day-night-cycle, solar-terminator | https://github.com/vasturiano/three-globe |
| `react-globe.gl` | 2.38.0 | MIT | React wrapper | optional |
| `@react-three/fiber` | 9.7.0 | MIT | Custom shader globe (full vision) | React 19 |
| `@react-three/drei` | 10.7.8 | MIT | `OrbitControls`, `Stars`, `Sparkles`, `Html`, `Environment`, `shaderMaterial` helper | |
| `postprocessing` / `@react-three/postprocessing` | 6.39.4 / 3.1.1 | **Zlib** / MIT | Bloom, god rays, vignette, chromatic aberration, noise, DoF | Zlib is OSI-approved, permissive |
| `cobe` | 2.0.1 | MIT | 5 KB dotted globe (alt aesthetic) | no picking API — compute lat/lng from pointer yourself |
| `maplibre-gl` | 6.7.0 | BSD-3-Clause | Globe projection alternative (vector tiles) | needs a free tile source (e.g. OpenFreeMap); "map" look, not "planet" |
| `suncalc` | 2.0.2 (2026-09-02, ESM) | BSD-2-Clause (repo LICENSE; npm `license` field missing) | sun altitude/azimuth, golden hour, dusk, moon phase | dependency-free |
| `solar-calculator` | 0.3.0 (2022) | ISC | subsolar point (`century`, `equationOfTime`, `declination`) for the terminator shader | used by three-globe examples; tiny and stable |
| `@photostructure/tz-lookup` | 11.6.1 | CC0-1.0 | offline IANA tz from lat/lng (72 KB, ~10% error in inhabited areas) | fallback only; Open-Meteo already returns tz |
| `d3-geo` | 3.1.1 | ISC | `geoContains(feature, [lng, lat])` spherical point-in-polygon; `geoDistance` | robust across the antimeridian/poles |
| `@turf/boolean-point-in-polygon` | 7.4.0 | MIT | planar PIP alternative | |
| `kdbush` + `geokdbush` | 4.1.0 / 2.1.0 | ISC | nearest-city index (`around(index, lng, lat, 1, maxDistanceKm)`) | ~7k points → instant |
| `topojson-client` + `world-atlas` | 3.1.0 (2019) / 2.0.2 (2019) | ISC | TopoJSON countries (NE 4.1.0) | `world-atlas` **archived 2023-03-03** (confirmed); `topojson-client` last published 2019 but is finished, not abandoned — prefer nvkelso GeoJSON anyway |
| `tracery-grammar` | 2.8.4 | ISC | procedural bartender lines | |
| `seedrandom` | 3.0.5 | MIT | deterministic variety per (lat,lng,hour) | |
| `motion` | 13.2.0 | MIT | UI/bubble animation | |
| `gsap` | 3.15.0 | Standard "No-Charge" (free incl. commercial, all plugins incl. SplitText/MorphSVG; **not OSI**, proprietary Webflow licence; forbids building no-code animation tools that compete with Webflow) | SplitText / MorphSVG text theatrics | optional |
| `howler` | 2.2.4 (2023-09-19) | MIT | audio sprites/loops | repo not archived (25k★) but no npm release in ~3 years — treat as frozen; or raw Web Audio |
| `zustand` | 5.0.15 | MIT | state | |
| `vite` / `vite-plugin-pwa` | 8.2.2 / 1.3.0 | MIT | build + PWA | |
| `@capacitor/core` `/android` `/cli` | 8.5.1 (2026-08-31) | MIT | Android wrapper | `@capacitor/cli` engines `node >=22.0.0`; android-template: AGP **8.13.0**, Gradle wrapper **8.14.3**, compileSdk/targetSdk **36**, minSdk **24** (all confirmed in `ionic-team/capacitor` `android-template`); AGP 8.13 needs **JDK ≥ 17** (Android docs) |
| `@capacitor/haptics`, `@capacitor/geolocation` | 8.0.2 / 8.2.2 | MIT | click thump, "where am I" | optional |
| `@mlc-ai/web-llm` | 0.2.84 | Apache-2.0 | in-browser LLM (WebGPU) for optional AI garnish | model download 0.5–1 GB; desktop only realistically |
| `bigdatacloud-reverse-geocode-client` | 2.0.0 (2026-04-09) | MIT | only for the device-GPS "where am I" button | never for map clicks; the library itself calls `navigator.geolocation` first and falls back to IP lookup |

---

## 5. How the core problem is solved

### 5.1 Click → coordinates
- **globe.gl:** `Globe().onGlobeClick(({ lat, lng }, event) => …)`; fly there with `globe.pointOfView({ lat, lng, altitude: 1.6 }, 1200)`.
- **Custom R3F globe:** raycast the sphere mesh; convert the hit point `p` (radius `r`) to `lat = 90 - degrees(acos(p.y / r))`, `lng = (degrees(atan2(p.x, p.z)) + 270) % 360 - 180` (adjust the constant until Greenwich lines up with your texture; three-globe's convention is a good reference). Add a ripple with globe.gl's `ringsData` or a custom shader pulse.

### 5.2 Fetch (parallel, ~200–400 ms)
1. `forecast` (params above) → weather + `timezone` + sunrise/sunset.
2. `air-quality` → AQI/PM2.5/dust/UV.
3. If the offline land test says **ocean**, also `marine` → SST/wave height.
Debounce clicks, cache per `(lat,lng rounded to 0.25°, 15 min)` in memory/`localStorage`, and show a skeleton bubble while loading. All three endpoints returned `access-control-allow-origin: *` — no proxy.

### 5.3 Reverse geocoding — offline, no policy risk
1. **Country:** iterate `ne_50m_admin_0_countries` features with `d3.geoContains(feature, [lng, lat])` (spherical, antimeridian-safe). Pre-bucket features by bounding box for speed. Result: `ADMIN`, `ISO_A2`, `CONTINENT`, `SUBREGION` properties.
2. **Nearest city:** build a `kdbush` over the ~7,300 `ne_10m_populated_places_simple` points (strip to `name, adm0name, iso_a2, latitude, longitude, pop_max, featurecla` → ~400 KB), then `geokdbush.around(index, lng, lat, 1, 400)` → `"~38 km from Mumbai"`. Use `featurecla === "Admin-0 capital"` for extra sass ("a capital city, and yet…").
3. **Ocean / nowhere:** no country hit and nearest city > 400 km → treat as sea/ice; optionally add `ne_10m_geography_marine_polys.geojson` (1.7 MB; or `ne_50m_…` 1.2 MB / `ne_110m_…` 0.5 MB — **paths confirmed 2026-09-06**, properties `name`, `name_en`, `featurecla`) to name the ocean/sea.
4. **Optional precise names:** Nominatim `reverse?zoom=10` with a custom `User-Agent`, client-side throttle (≥ 1.1 s between calls), cached; display "Data © OpenStreetMap contributors". Ship it behind a settings toggle, off by default.
5. **"Where am I" button:** HTML5 Geolocation → BigDataCloud client endpoint is policy-compliant here (live device coords) — or just reuse the offline lookup.

### 5.4 Local time, sun, "right now" vibe
- `timezone` from Open-Meteo → local hour via `Intl.DateTimeFormat`. Day-part buckets: dawn (sunrise ± 45 min), morning, brunch (10–13 weekend), afternoon, golden hour (`suncalc.getTimes` `goldenHour`→`sunset`), evening, late night (23–04 → "why are you awake").
- `suncalc.getPosition(now, lat, lng).altitude` → sky colour grading (negative = night, < 6° = golden).
- `is_day` from the API is the authoritative day/night flag for the bartender ("it's 2 a.m. there — this is a nightcap situation").
- Sunrise/sunset ISO strings from `daily` → "sunset in 40 minutes, drink faster".

### 5.5 Derived comfort features (all in TypeScript, no deps)
Open-Meteo already returns `apparent_temperature` and `dew_point_2m`; still compute these for labelling and for marine/edge cases.

- **Heat index (NWS/Rothfusz, °F):** `HI = -42.379 + 2.04901523T + 10.14333127RH − .22475541T·RH − .00683783T² − .05481717RH² + .00122874T²RH + .00085282T·RH² − .00000199T²RH²`; apply when the simple formula `0.5·(T + 61 + 1.2(T−68) + 0.094RH)` ≥ 80 °F; low-RH (< 13 %, 80–112 °F) subtracts `((13−RH)/4)·√((17−|T−95|)/17)`; high-RH (> 85 %, 80–87 °F) adds `((RH−85)/10)·((87−T)/5)`. ([NWS](https://www.wpc.ncep.noaa.gov/html/heatindex_equation.shtml))
- **Humidex (Canada):** `H = T + 0.5555·(6.11·e^(5417.753·(1/273.16 − 1/(273.15+Td))) − 10)` — great for "muggy" scoring.
- **Wind chill (JAG/TI 2001, °C, km/h):** `Twc = 13.12 + 0.6215T − 11.37v^0.16 + 0.3965T·v^0.16`, valid for T ≤ 10 °C and v > 4.8 km/h. ([ref](https://en.wikipedia.org/wiki/Wind_chill))
- **Dew point (Magnus):** `γ = ln(RH/100) + 17.62T/(243.12+T)`; `Td = 243.12γ/(17.62−γ)`. Comfort bands: < 10 °C dry · 10–16 comfortable · 16–18 fine · 18–21 humid · 21–24 very humid · ≥ 24 oppressive ("the air is soup"). ([ref](https://en.wikipedia.org/wiki/Dew_point))
- **Beaufort** from `wind_speed_10m` (km/h): 0–1 calm, 12–19 gentle, 39–49 strong, 62–74 gale, ≥ 118 hurricane; `wind_gusts_10m` ≥ 60 → "hold your glass".
- **UV band (WHO):** 0–2 low, 3–5 moderate, 6–7 high, 8–10 very high, 11+ extreme.
- **AQI band (EU):** 0–20 good, 20–40 fair, 40–60 moderate, 60–80 poor, 80–100 very poor, > 100 extremely poor; `dust` > 100 µg/m³ → "sandstorm, close your mouth".
- **WMO `weather_code`:** 0 clear · 1–3 partly/overcast · 45/48 fog · 51/53/55 drizzle · 56/57 freezing drizzle · 61/63/65 rain · 66/67 freezing rain · 71/73/75 snow · 77 snow grains · 80–82 rain showers · 85/86 snow showers · 95 thunderstorm · 96/99 thunderstorm with hail.

### 5.6 Bartender judgment engine (procedural, deterministic, no LLM)
```ts
type Tag = 'scorching'|'hot'|'warm'|'mild'|'chilly'|'cold'|'freezing'|'arctic'
         | 'muggy'|'oppressive'|'bone-dry'|'drizzle'|'rain'|'downpour'|'snow'|'blizzard'
         | 'storm'|'hail'|'fog'|'gale'|'breezy'|'still'|'uv-extreme'|'smog'|'dust'
         | 'dawn'|'morning'|'brunch'|'afternoon'|'golden'|'evening'|'late'|'ocean'|'polar';

interface Drink { id; name; base: 'rum'|'gin'|'whisky'|'tequila'|'vodka'|'wine'|'beer'|'none'|...;
  alcoholic: boolean; serve: 'frozen'|'iced'|'chilled'|'neat'|'warm'|'hot';
  abv: number; affinity: Partial<Record<Tag, number>>;   // e.g. Mojito: { scorching: 3, muggy: 4, brunch: 1 }
  recipe: { ingredients: {amount, unit, ingredient}[]; method: string; glass: string }; }
```
1. **Feature → tags:** thresholds on apparent temp / heat index (e.g. ≥ 38 °C `scorching`), dew point (≥ 24 `oppressive`), wind chill (≤ −25 `arctic`), WMO code (`storm`, `snow`…), UV, AQI, day-part, ocean/polar.
2. **Score:** `score(drink) = Σ affinity[tag] × weight[tag] + serveBonus(serve, tags) − repeatPenalty` where `serveBonus` pushes `frozen/iced` for hot tags and `hot/neat` for cold tags; `weight` emphasises the most extreme feature so the joke lands ("aggressively iced Mojito" for 31 °C apparent + 24 °C dew point; "dark rum, warm, no arguments" for −48 °C apparent).
3. **Pick:** top-3 by score, choose with `seedrandom(`${lat.toFixed(1)},${lng.toFixed(1)},${localHour}`)` so the same place/hour is stable but neighbours differ.
4. **Modifiers:** `serve` intensifier from magnitude ("iced" → "aggressively iced" → "served in a bucket"), garnish jokes from tags (`dust` → "no umbrella, it would just collect sand"), late-night guilt, brunch permission slip.
5. **Text:** Tracery grammar with slots `#place#, #tempLine#, #humidityJab#, #drinkLine#, #serveLine#, #closer#`; 6–10 variants per slot × tags → thousands of distinct lines. Keep the bartender's voice rules in one file (`voice.json`).
6. **Mocktail / no-alcohol mode:** same engine, `alcoholic:false` menu (Virgin Mojito, Nojito, Shirley Temple, Virgin Mary, iced hibiscus tea, hot chocolate, masala chai, ginger switchel, Arnold Palmer, salted lime soda…). Persist the toggle in `localStorage`; also auto-suggest it when local time < 11:00 ("it's 9 a.m. — the bartender is legally a barista now").
7. **Optional LLM garnish (always with fallback):** in-browser `@mlc-ai/web-llm` (Qwen/Llama 1B, WebGPU, no key, ~0.7–1 GB download) to *paraphrase* the grammar output; or BYO-key (Anthropic/OpenAI/Gemini) through a Cloudflare Worker that only adds the header — never ship keys in the bundle. Procedural output remains the default so the app is offline-capable.

### 5.7 Faking "right now" visuals
Open-Meteo `current` is model data interpolated on a 15-minute interval (`interval: 900` in the response) — not live radar — so treat it as *vibe*, not truth:
- `is_day` + sun altitude → day/night shader blend and sky gradient; city lights only on the dark side.
- `cloud_cover` % → cloud-shell opacity at the click; `wind_speed/gusts` → cloud drift speed and particle direction.
- `weather_code` → particle system: drizzle (sparse, slow), rain (dense), downpour (streaks + puddle ripple), snow (`Sparkles` with slow fall), thunderstorm (bloom flash + low-pass audio rumble), fog (fog density + desaturation), hail (bouncy particles).
- `apparent_temperature`/dew point → colour grade (heat shimmer/warm vignette vs frosty blue + vignette); `uv_index` → bloom intensity on the day side.
- Audio: pink-noise rain/wind synthesized with Web Audio (`AudioBufferSource` noise → `BiquadFilter` lowpass whose cutoff follows wind speed) — zero assets; CC0 thunder/bar-clink one-shots as garnish.

---

## 6. Reference projects

| Project | What to steal | License / notes |
|---|---|---|
| [vasturiano/globe.gl](https://github.com/vasturiano/globe.gl) + [three-globe examples](https://github.com/vasturiano/three-globe) (`day-night-cycle`, `solar-terminator`, `clouds`) | Day/night `ShaderMaterial` with `dayTexture`/`nightTexture`/`sunPosition` uniforms; cloud sphere at +0.004 radius rotating −0.006°/frame; subsolar point via `solar-calculator` | MIT |
| [azialle/Oclock](https://github.com/azialle/Oclock) (live at azialle.github.io/Oclock) | Closest architecture: Globe.gl + custom terminator shader + country GeoJSON with injected timezones, static GitHub Pages | MIT |
| [cambecc/earth](https://github.com/cambecc/earth) (earth.nullschool.net) | Wind-particle animation, Natural Earth TopoJSON pipeline, "planet as instrument" UI | MIT |
| [bobbyroe/threejs-earth](https://github.com/bobbyroe/threejs-earth) | Day + night + bump + clouds + Fresnel atmosphere glow in plain three.js | MIT code; **textures from PlanetPixelEmporium are proprietary — swap for NASA/SSS** |
| [bilawalsidhu/gods-eye-view](https://github.com/bilawalsidhu/gods-eye-view) (17.9k★) | Cinematic HUD design, "no keys by default, POWER UP with optional keys" pattern | MIT; CesiumJS + Google 3D Tiles; **needs a Node server** — cautionary for our static constraint |
| [shuding/cobe](https://github.com/shuding/cobe) | Minimal dotted-globe aesthetic for the landing/loading state | MIT |
| [PranshulGG/WeatherMaster](https://github.com/PranshulGG/WeatherMaster) (3.1k★), [open-meteo/weather-map-layer](https://github.com/open-meteo/weather-map-layer) | WMO-code → UX mapping; raster weather overlays from Open-Meteo S3 (MapLibre) | WeatherMaster is **GPL-3.0** (LICENSE file confirmed — ideas only, no code copying); weather-map-layer is **GPL-2.0** (LICENSE confirmed; contaminates if bundled) |

No existing open-source "weather → cocktail" app was found; the combination is novel, which is a feature.

---

## 7. Visual / design enablers ("best of the best")

- **Planet skin:** NASA BMNG monthly composite (choose the *current month* → real seasonal snow line) downscaled to 8192×4096 for desktop and 4096×2048 for Android (many mobile GPUs cap at 4096–8192; probe `gl.MAX_TEXTURE_SIZE`). Night side: Black Marble 13500×6750 → 8192×4096. Clouds: SSS 8K clouds (CC BY) or three-globe `example/clouds/clouds.png` (GitHub/unpkg only, 5 MB — not on the jsDelivr `example/img/` path). Bump `earth-topology.png`, specular `earth-water.png` for sun glint on oceans. Budget ≈ 6–9 MB total as WebP/KTX2 (`drei` `useKTX2` + `gltf-transform`/`toktx` in a build script keeps GPU memory sane).
- **Shader globe:** one `ShaderMaterial`: `mix(night, day, smoothstep(-0.1, 0.25, dot(normal, sunDir)))`, city lights modulated by `1 − dayFactor`, specular via `earth-water`, rim light `pow(1 − dot(viewDir, normal), 3)` for the atmosphere; a second, slightly larger back-face sphere with additive Fresnel for the halo. Terminator moves in real time from `solar-calculator` — the globe *is* the clock.
- **Post-processing (Zlib `postprocessing`):** Bloom (city lights, lightning), Vignette, subtle ChromaticAberration and Noise for a "film" look; `ToneMapping` ACES; DoF when zoomed into a location.
- **Location theatre:** globe.gl `ringsData` ripple at the click; HTML-elements layer for the speech bubble anchored to lat/lng; `pointOfView` easing fly-to; auto-rotate when idle; `Stars` skybox (`night-sky.png` or drei `Stars`).
- **Weather particles:** drei `Sparkles`/custom `Points` in a local tangent frame at the click; lightning = 80 ms bloom spike + white flash on the cloud layer; snow = slow `Sparkles` with size jitter; fog = `scene.fog` + desaturation pass.
- **Typography:** ~~a characterful variable serif for the bartender's voice (e.g. **Fraunces**, or **Instrument Serif**) paired with a clean grotesk/mono; GSAP SplitText for text reveals.~~ **[SUPERSEDED by DESIGN.md §5 — the type stack is Righteous / Space Grotesk / JetBrains Mono, all OFL. Fraunces is reserved by project 06 (Chez Fridge) and Instrument Serif by project 07 (Blurvre); DESIGN §1 forbids both here. GSAP is listed under "Explicitly not used" in IMPL §2.1 and must not be a production dependency (SEC-5). Reveal animation is `motion` (MIT) only.]**
- **UI palette by dew point:** sweaty teal/orange for tropics, icy blue/white for polar, sodium-orange night, storm slate — drive CSS variables from the same tags the bartender uses so the whole UI "agrees" with the joke.
- **Alt aesthetic:** cobe dotted globe (GitHub-homepage minimal) for the landing/loading state, then cross-fade into the photoreal globe.
- **Sound design:** procedural rain/wind (Web Audio), CC0 one-shots (ice clink, shaker, thunder), spatialised bar hum on the night side. Respect autoplay: start audio on first click.

---

## 8. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **BigDataCloud fair-use policy** forbids arbitrary coordinates (402 + IP ban) | Silent breakage for all users | Don't use it for map clicks; offline Natural Earth lookup (public domain); Nominatim optional and throttled |
| Open-Meteo is **non-commercial only**; requests with > 10 variables or > 2 weeks count as fractional multiple calls (confirmed on pricing page) | Terms breach / throttling | No ads, no subscriptions; request only `forecast_days=1`; the 23-variable example ≈ 2 calls, so budget ~3 weighted calls per click (forecast + AQI + marine) against 10k/day; cache 15 min per 0.25° cell; show "Weather data by Open-Meteo.com" (CC BY 4.0) + CAMS attribution for AQI + DWD attribution for marine |
| Open-Meteo "current" is model output (15-min interpolation), not observation | Bartender wrong about "rain right now" | Phrase as vibes ("the models say…"); add `precipitation_probability` hedge lines |
| Nominatim 1 req/s is *global across all users*; policy also bans "systematic" reverse queries and stock User-Agents | Bans if the app gets popular | Keep off by default; client-side throttle + cache; only call after the offline result is shown; note browsers cannot set `User-Agent`, so rely on `Referer` (allowed by the policy) |
| TheCocktailDB test key not licensed for published apps | App-store takedown / ethics | Bundle IBA/Open Drinks JSON; draw glassware as SVG instead of hotlinking images |
| `teijo/iba-cocktails` has **no licence file** (confirmed 2026-09-06) | Redistribution risk | Use `rasmusab/iba-cocktails` (MIT) — recipes themselves are facts, but copy text may be copyrighted; write your own method text |
| Texture size vs GitHub Pages (1 GB site / 100 GB-month) and mobile GPU limits | Slow first load, WebGL context loss on phones | 8K desktop / 4K mobile variants, WebP/KTX2, lazy-load night+clouds after first paint, PWA precache; cap total ≤ 10 MB |
| NASA imagery: no endorsement implication, credit requested | Minor | Credit line in About; no NASA logo |
| Solar System Scope textures are CC BY | Attribution needed | Credit in About; or use NASA originals |
| GSAP is free but **not OSI**; `weather-map-layer` is **GPL-2.0** | Licence hygiene | Prefer `motion` (MIT); don't bundle GPL code |
| `world-atlas` archived (2023) | Stale data | Use nvkelso/natural-earth-vector GeoJSON directly |
| `howler` last published 2023 | Bit-rot | Works fine; Web Audio directly is also trivial |
| Capacitor 8 Android toolchain (AGP 8.13.0, Gradle 8.14.3, compileSdk 36 — confirmed) with no local SDK | Can't test locally | `npx cap add android` + `npx cap sync` only copy templates/web assets and do not invoke Gradle (Capacitor docs list Android Studio only for `cap open`/`run`; treat "no SDK needed" as *likely*, confirm on first run); build in Actions on `ubuntu-24.04` (`actions/setup-java@v4` Temurin 17 or 21 — AGP 8.13 requires JDK ≥ 17; the runner image already ships JDK 17/21, Android SDK Platform 36 and Build-Tools 36.0.0, so `android-actions/setup-android@v4` is optional; `./gradlew assembleDebug`); upload `app-debug.apk` with `softprops/action-gh-release`; Actions is free for public repos on standard runners (2,000 min/month + 500 MB artifacts for private) |
| WebGL 2 / WebGPU variance in Android WebView | Shader globe fails on old phones | Feature-detect; fall back to globe.gl basic material or cobe |
| WebLLM model download (0.5–1 GB) | Unusable on mobile | Opt-in, desktop only, procedural text is always the default |
| Autoplay policies block ambience | Silent app | Start `AudioContext` on first user gesture |
| Antimeridian/poles in point-in-polygon | Wrong country near ±180°/poles | Use `d3.geoContains` (spherical) rather than planar PIP |

---

## 9. MVP in a weekend vs full vision

**Weekend MVP (static, ~1 day of code):**
1. Vite + React + `globe.gl` with `earth-blue-marble.jpg` + `earth-topology.png` bump + `night-sky.png` background + atmosphere.
2. `onGlobeClick` → parallel Open-Meteo forecast + air-quality; skeleton bubble; `pointOfView` fly-to; ring ripple.
3. Offline reverse geocode with `ne_110m_admin_0_countries` + stripped populated places (kdbush).
4. Feature extraction (§5.5) + a 30-drink `bar-menu.json` (15 cocktails, 15 mocktails) + Tracery grammar with ~5 variants per slot; alcohol toggle in `localStorage`.
5. Stats strip (apparent temp, dew point, wind, UV, AQI, local time, sunset-in) + Open-Meteo/CAMS/NASA credits.
6. Deploy to GitHub Pages via Actions; PWA manifest.

**Full vision:**
- R3F custom shader globe (day/night terminator, city lights, specular oceans, cloud shell, Fresnel halo), `postprocessing` bloom/vignette/DoF, weather particles + lightning, colour grading by dew point.
- Monthly BMNG texture swap (real seasons), KTX2 pipeline, 4K/8K variants.
- Procedural + CC0 soundscape reacting to wind/rain/thunder.
- Marine mode (SST, wave height) and polar mode; "where am I" with device GPS; forward search box (Open-Meteo geocoding).
- 60+ drink menu with recipes (IBA + Open Drinks), glassware SVGs, share-card (canvas → PNG) with the verdict.
- Optional AI garnish (WebLLM / BYO key via Worker), multi-language bartender.
- Capacitor Android APK from GitHub Releases with haptics on click.

---

## 10. Open questions

1. ~~Exact licence of `teijo/iba-cocktails`~~ **Resolved 2026-09-06:** no licence file exists → use `rasmusab/iba-cocktails` (MIT).
2. ~~Does Open-Meteo weight large multi-variable calls?~~ **Resolved:** yes — > 10 variables or > 2 weeks per location counts fractionally (pricing page). Our per-click budget ≈ 3 weighted calls; still trivial against 10k/day.
3. Precise licence of the three-globe CDN example textures (repo MIT, images NASA-derived) — safe to copy, but confirm before shipping or use NASA originals. **Still open.**
4. ~~Natural Earth marine polygon file name~~ **Resolved:** `geojson/ne_10m_geography_marine_polys.geojson` (and 50m/110m) exist in the nvkelso mirror.
5. ~~JDK version for AGP 8.13~~ **Resolved:** JDK 17 minimum per Android docs; `ubuntu-24.04` runner default is JDK 17 with 21 also present. Still confirm with the first Actions run.
6. ~~MapLibre GL globe projection availability~~ **Resolved:** globe mode shipped in v5.0.0 (2024-12-31) and is present in 6.7.0.
7. Whether `timeapi.io` publishes terms/limits — **still unverifiable** (endpoint probed 200 + CORS `*`, no terms page found); currently unnecessary (Open-Meteo covers timezone).
8. Cloud-layer realism: use SSS static clouds (CC BY) vs generating procedural FBM clouds in-shader (zero assets, animatable) — prototype both.
9. **New:** Do Open-Meteo `timezone=auto` results at the poles (`Antarctica/McMurdo` for −89.9°, `Etc/GMT-7` for 89.9°) match what the bartender should say? They are valid IANA zones but arbitrary — treat polar local time as a joke, not a fact.

---

## Verification log (2026-09-06)

Adversarial fact-check pass. Method: npm registry JSON for every package (version, publish date, `license`, `engines`); live HTTP probes from Node 22 (`Origin` header set, CORS headers inspected); raw LICENSE / README / template files from GitHub; official docs via fetch. Web search was unavailable (session budget exhausted), so every source below is a primary document or a live probe, not a search snippet. GitHub's REST API rate-limited mid-run, so repo metadata was taken from raw files and repo HTML instead.

| # | Claim | Verdict | Evidence / source |
|---|---|---|---|
| 1 | BigDataCloud free `reverse-geocode-client` allows only live device GPS/Wi-Fi coordinates; arbitrary/pre-stored coords "strictly not allowed" → HTTP 402 + IP ban | **Confirmed** (policy). **Nuance added:** a one-off arbitrary-coordinate probe returned HTTP 200 with Mumbai data, so enforcement is not per-request; the endpoint also now 307-redirects to `api-bdc.io` | Official client README, "Fair Use Policy" section: https://github.com/bigdatacloudapi/js-reverse-geocode-client (bigdatacloud.com policy page itself returned 429/404 to fetches); live probe of `api.bigdatacloud.net/data/reverse-geocode-client?latitude=19.07&longitude=72.88` |
| 2 | Open-Meteo forecast, air-quality, marine are no-key, `Access-Control-Allow-Origin: *`, non-commercial, 600/min · 5k/h · 10k/day · 300k/month, CC BY 4.0 | **Confirmed.** **Added:** more than 10 variables or more than 2 weeks counts as fractional multiple calls (example request ≈ 2 calls); marine docs require DWD attribution; AQI `current.interval` is 3600 s not 900; server code is AGPL-3.0 (irrelevant to API use) | Live probes of all three hosts returned `access-control-allow-origin: *`; https://open-meteo.com/en/terms ("You may only use the free API services for non-commercial purposes"); https://open-meteo.com/en/pricing (limits + weighting); https://open-meteo.com/en/licence ("API data are offered under Attribution 4.0 International (CC BY 4.0)", suggested "Weather data by Open-Meteo.com"); https://open-meteo.com/en/docs/air-quality-api (CAMS attribution, 0.4°/0.1°, 5-day/4-day); https://open-meteo.com/en/docs/marine-weather-api (DWD attribution) |
| 3 | `timezone=auto` returns a valid IANA zone for any coordinate incl. open ocean (`Etc/GMT+9`) and Antarctica (`Antarctica/Troll`) | **Confirmed and extended:** 9 probes incl. both poles, antimeridian, Atlantic, Indian Ocean, Ross Sea — all HTTP 200 with valid IANA names (`Antarctica/McMurdo`, `Etc/GMT-7`, `Etc/GMT-12`, …). Polar answers are arbitrary-but-valid | Live probes of `api.open-meteo.com/v1/forecast?...&timezone=auto` (results recorded in §3); docs: "the coordinates will be automatically resolved to the local time zone" https://open-meteo.com/en/docs |
| 4 | TheCocktailDB test key `1` is dev/education only; app-store release needs the $10 one-off Premium key; test key lists capped at 100 | **Confirmed.** Also probed: CORS `*`, 58 `Non_Alcoholic` drinks, `Alcoholic` list returns exactly 100 (cap), thumbnails at `{thumb}/small` and `/preview` (200) | https://www.thecocktaildb.com/api.php ("You can use the test API key "1" during development of your app or for educational use"; "must sign up to Premium API... if releasing publicly on an appstore"; "Go Premium ($10)"); live probes |
| 5 | Natural Earth is public domain, no attribution; nvkelso GeoJSON files exist at listed paths | **Confirmed.** Marine polygon file (previously "to verify") also confirmed at `geojson/ne_10m_geography_marine_polys.geojson` (+ 50m/110m). Property names (`ADMIN`, `ISO_A2`, `CONTINENT`, `SUBREGION`; `adm0name`, `pop_max`, `featurecla`) confirmed by reading the files; populated places = 7,342 features | https://www.naturalearthdata.com/about/terms-of-use/ ("All versions... are in the public domain"; "Crediting the authors is unnecessary"); nvkelso `LICENSE.md` ("Everything here is public domain"); HEAD probes on raw.githubusercontent.com (all 200, sizes match) |
| 6 | globe.gl is MIT, v2.46.2 (2026-08-22), `onGlobeClick` returns `{lat, lng}` | **Confirmed** | npm registry: `globe.gl` latest 2.46.2 published 2026-08-22, `license: MIT`; repo LICENSE = MIT; README: "`onGlobeClick({ lat, lng }, event)`", plus `ringsData`, `htmlElementsData`, `pointOfView`, `globeMaterial` all present https://github.com/vasturiano/globe.gl |
| 7 | Capacitor 8.5 needs Node ≥ 22, AGP 8.13, Gradle 8.14.3, compileSdk 36; buildable in free GitHub Actions with setup-java + setup-android | **Confirmed** (versions). **Refined:** `@capacitor/cli` engines `node >=22.0.0`; AGP 8.13 requires JDK ≥ 17; `ubuntu-24.04` runner already has JDK 17/21, Android Platform 36 and Build-Tools 36.0.0 so `setup-android` is optional; Actions free on standard runners for public repos. "`cap add android` needs no SDK" is **likely, not documented** | npm engines; https://capacitorjs.com/docs/updating/8-0 ("Capacitor 8 requires NodeJS 22 or greater", AGP 8.13.0, Gradle 8.14.3, compileSdk 36, minSdk 24); `ionic-team/capacitor` `android-template/build.gradle` + `variables.gradle` + `gradle-wrapper.properties` (raw); https://developer.android.com/build/releases/past-releases/agp-8-13-0-release-notes (JDK 17 min, Gradle 8.13 min); `actions/runner-images` `Ubuntu2404-Readme.md`; https://docs.github.com/en/billing/concepts/product-billing/github-actions |
| 8 | `postprocessing` is Zlib; GSAP "Standard No-Charge" is free for commercial use but not OSI | **Confirmed.** GSAP restriction added: no building no-code animation tools that compete with Webflow | npm `postprocessing` 6.39.4 `license: Zlib`; repo LICENSE.md is zlib text https://github.com/pmndrs/postprocessing/blob/main/LICENSE.md; npm `gsap` 3.15.0 license "Standard no-charge license"; https://gsap.com/community/standard-license/ ("Commercial usage is covered under the standard license"; SplitText/MorphSVG included) |
| 9 | Every npm version/licence in §4 | **Confirmed** for all 37 packages queried (three 0.185.1, three-globe 2.45.2, react-globe.gl 2.38.0, R3F 9.7.0, drei 10.7.8, @react-three/postprocessing 3.1.1, cobe 2.0.1, maplibre-gl 6.7.0, solar-calculator 0.3.0, tz-lookup 11.6.1 CC0, d3-geo 3.1.1, turf PIP 7.4.0, kdbush 4.1.0, geokdbush 2.1.0, tracery-grammar 2.8.4, seedrandom 3.0.5, motion 13.2.0, howler 2.2.4, zustand 5.0.15, vite 8.2.2, vite-plugin-pwa 1.3.0, capacitor 8.5.1 / haptics 8.0.2 / geolocation 8.2.2, web-llm 0.2.84, bigdatacloud client 2.0.0, cities.json 1.1.61 CC-BY-4.0). **One correction:** `suncalc` 2.0.2 has no `license` field on npm (repo LICENSE is BSD-2-Clause) | npm registry JSON, 2026-09-06 |
| 10 | `teijo/iba-cocktails` licence "not confirmed" | **Corrected → unlicensed.** `LICENSE`, `LICENSE.md`, `LICENSE.txt`, `package.json` all 404; `recipes.json`/`ingredients.json` exist. Recommendation switched to `rasmusab/iba-cocktails` (MIT LICENSE fetched) | raw.githubusercontent.com probes |
| 11 | `PranshulGG/WeatherMaster` "check licence" | **Resolved → GPL-3.0** | raw `LICENSE` file |
| 12 | `open-meteo/weather-map-layer` GPL-2.0; `cambecc/earth`, `bobbyroe/threejs-earth`, `azialle/Oclock`, `bilawalsidhu/gods-eye-view`, `shuding/cobe`, `alfg/opendrinks` MIT | **Confirmed** (all LICENSE files fetched; `cambecc/earth` uses `LICENSE.md`) | raw LICENSE files |
| 13 | three-globe example textures on jsDelivr `example/img/` (7 files) | **Confirmed** for the 7 listed; **corrected:** `clouds.png` is not there (404) — it is at `example/clouds/clouds.png` (5.0 MB) on GitHub/unpkg | HEAD probes; jsDelivr flat file list for three-globe@2.45.2 |
| 14 | `world-atlas` archived 2023 | **Confirmed** — "archived by the owner on Mar 3, 2023", NE 4.1.0 | https://github.com/topojson/world-atlas |
| 15 | MapLibre GL globe projection "since v5 per memory" | **Confirmed** — "Support globe mode" in v5.0.0 (2024-12-31) | https://github.com/maplibre/maplibre-gl-js/releases/tag/v5.0.0; CHANGELOG |
| 16 | cobe has no picking API | **Confirmed** — README options are `phi`, `theta`, `markers`, `onRender` only | https://github.com/shuding/cobe |
| 17 | Nominatim: 1 req/s, identifying UA/Referer, cache, no autocomplete, ODbL attribution, CORS `*` | **Confirmed.** Added: "systematic queries" (reverse grids) banned; bulk scripts 4 req/min; stock library UAs rejected | https://operations.osmfoundation.org/policies/nominatim/; live probe 200 with `access-control-allow-origin: *` |
| 18 | NASA Blue Marble NG (5400×2700 / 21600×10800, 12 months) and Black Marble 2016 (3600×1800 / 13500×6750) pages exist; NASA imagery not copyrighted, credit requested, no endorsement | **Confirmed** | https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography-bathymetry; https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps; https://www.nasa.gov/nasa-brand-center/images-and-media/ ("generally are not subject to copyright"; must not "convey NASA's endorsement") |
| 19 | Solar System Scope textures CC BY 4.0, 2K/8K day/night/clouds/normal/specular | **Confirmed** | https://www.solarsystemscope.com/textures/ |
| 20 | Pixabay Content Licence: free incl. commercial, no attribution, no standalone redistribution | **Confirmed — and then REJECTED for this project** (2026-09-08): the licence is not on the D5.2 allow-list (PD / CC0 / CC BY / ODbL) nor in the `check:licenses` allow-list, and a non-CC0 sound would break the three-way `attribution.json` ↔ About ↔ README test (SEC-6). Every bundled sound is CC0 from Freesound/Kenney, or synthesised. | https://pixabay.com/service/license-summary/ |
| 21 | Freesound CC0/BY/BY-NC, account needed to download, licence filter | **Confirmed** | https://freesound.org/help/faq/ |
| 22 | GitHub Pages 1 GB site / 100 GB-month soft bandwidth | **Confirmed** (plus 10 builds/hour soft limit, waived for custom Actions workflows) | https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits |
| 23 | `timeapi.io` no key, CORS `*`, terms unknown | **Confirmed** behaviour (200, `Access-Control-Allow-Origin: *`, returned `Asia/Kolkata`); **terms/limits remain unverifiable** — do not depend on it | live probe |
| 24 | PlanetPixelEmporium textures proprietary | **Unverifiable from primary source this pass** (bobbyroe README links to planetpixelemporium.com; its licence page was not fetched). Keep the "do not redistribute" stance | https://github.com/bobbyroe/threejs-earth README |
| 25 | Open-Meteo geocoding is forward-only | **Confirmed** by docs/probe (`/v1/search?name=` only; no reverse endpoint listed) | https://geocoding-api.open-meteo.com/v1/search?name=Mumbai&count=1 |
| 26 | Open-Meteo "current" = 15-min model data | **Confirmed** for the forecast API (`interval: 900`; docs: "Current conditions are based on 15-minutely weather model data"); air-quality `current` is hourly (`interval: 3600`) | live probes; https://open-meteo.com/en/docs |

**Net changes to the dossier:** teijo/iba-cocktails demoted to "unlicensed, do not bundle"; WeatherMaster marked GPL-3.0; DWD attribution added for marine; Open-Meteo call weighting quantified; `clouds.png` path fixed; marine polygon path confirmed; AQI current interval corrected to hourly; polar/antimeridian timezone probes recorded; Capacitor CI notes refined (JDK 17 min, runner image already has SDK 36); BigDataCloud redirect + "not enforced per request" nuance recorded; open questions 1, 2, 4, 5, 6 resolved. No API in the dossier was found to have shut down or started requiring a card.
