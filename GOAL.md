# Barometer: The Contextual Weather Bartender

**Codename:** Barometer · **Design:** The Globe Bar
**Tagline:** *Spin. Tap. Survive.*

Status: **Live**, v1.1.0 (2026-10-13): renamed **Mausam ka Mahaul**; adds the outlook, roads (estimate + optional live), India right now, tips, snacks and saved places; the ticker is gone. At https://rahultarigoppula.github.io/barometer-weather-bartender/ (decisions: `docs/IMPLEMENTATION-PROMPT.md` §0, C13–C39).

---

## 1. The idea

**In the owner's words.** "An interactive globe: click anywhere in the world and a judgmental bartender tells you exactly what beverage you need to survive that spot's weather right now. Cheeky and chaotic; aggressively iced Mojito for humidity, warming dark rum for the freezing cold."

**Sharpened.** Barometer is a brass-cradled planet on a mahogany counter under a buzzing neon sign that reads THE GLOBE BAR. You flick the globe (it has bearings; you can feel them), tap a spot, and a brass pin drops while the camera flies in. In the ~400 ms it takes Open-Meteo to answer, a blank cream coaster is already sliding across the counter. Then it prints: how far you are from the nearest real town, the local time, one weather jab in the bartender's voice, an intensifier stamped at an angle (AGGRESSIVELY ICED · HOT, NO ARGUMENTS · DO NOT GO OUTSIDE), the drink name in sign lettering, and a mono receipt strip of the numbers that justify it. At the same moment the bottle he reached for lights up on the back-bar shelf and the wall barometer's needle swings to the word that decided it: SOUP for Mumbai at 02:14 with a 24° dew point, ARCTIC for Yakutsk at −48° apparent. Flip the coaster for the recipe (IBA and Open Drinks data, in-house method text), flip the BAR sign to BARISTA for the alcohol-free twin (the bartender suggests it himself before 11:00 local), tear the register receipt off as a 1080×1350 share card, and every verdict lands on The Tab, your history, which re-flies the globe when tapped.

Everything runs client-side: Open-Meteo (no key, CORS-open) for forecast, air quality and marine data; offline Natural Earth polygons and a k-d tree for "where is this"; a deterministic, seeded, hand-written Tracery grammar for the insults; bundled MIT drink data. No accounts, no analytics, no server, no key of ours anywhere. Optional AI rewrite rungs exist (Cloudflare Workers AI through a Worker, the user's own free Gemini/Groq/OpenRouter key, or WebLLM on desktop), but they only ever paraphrase what the procedural bartender already said, so switching them off changes nothing.

## 2. Who it's for

- The owner, first: a toy to open when it is 33 °C and 90 % humidity outside and you need someone to be rude about it.
- Anyone who has ever sent a friend a screenshot of a weather app with "look at this", the coaster and the torn receipt are built to be that screenshot.
- People who like planets you can poke (earth.nullschool.net, Google Earth's spin) and want the poke to *say something*.
- Desktop first for the full bar; phone-first for the coaster and the share card; Android APK for haptics on the pin drop.

## 3. Why it will be fun and valuable

- **The joke is the information design.** Every distinctive element in `docs/DESIGN.md` is also the data: bottle = decision, dial = the deciding feature, coaster = verdict, receipt = stats. Nothing has to be removed to make it usable and nothing has to be added to make it funny.
- **It is the safest possible first 3D + first live-API project.** globe.gl gives a clickable, atmospheric globe in an afternoon; Open-Meteo needs no key and answers in one GET; everything else is TypeScript, SVG and CSS. The custom day/night shader globe is a phased upgrade behind a hook (`globeMaterial`), not a prerequisite.
- **Every hard part is a small, testable engine:** comfort formulas (heat index, humidex, wind chill, dew point), feature → tag thresholds with intensities, weighted drink scoring with a seeded tie-break, intensifier tiers, day-part logic across time zones, spherical point-in-polygon, nearest-city search. Golden fixtures for nine places (plus two error fixtures) pin the behaviour before any pixel exists.
- **It reuses the portfolio's wit engine** (`src/wit/`, D4) and pays it back with the richest grammar so far (weather × day-part × place × drink).
- **Zero financial exposure, ever.** Static on GitHub Pages; every runtime call is no-key and CORS-open; the one policy trap found in research (BigDataCloud's map-click ban) is designed out, not around.

## 4. The vibe

**Tactile · Cheeky · Loud**

A dive bar with good bones. The dark is mahogany, not navy; the accent is brass, not gold; the card is paper, not glass; nothing floats and nothing blurs. THE GLOBE BAR hangs in the window in Righteous neon that flickers on at night and goes pale on the day shift, and the shift follows the place you clicked, so Reykjavík at noon turns the bar to oak and daylight while Mumbai at 2 a.m. brings back the sodium lamp. The bartender talks in Space Grotesk and shouts in Righteous: "The air is soup. You are not sweating, you are marinating. **AGGRESSIVELY ICED** Mojito. Served in a bucket." The weather happens on the window pane behind the globe, droplets when the dew point passes 21°, frost creeping from the corners at −10°, rain streaks at three parallax speeds, an 80 ms lightning frame with a rumble half a second later, never on top of text. Every number is JetBrains Mono, tabular, with real minus signs. Every sound is a bar sound: a tink, a shhk, three pitched clinks, a thermal printer, a paper tear, a 50 Hz neon buzz. Chaos comes from copy, scale and light, never from more colour.

## 5. Success criteria (measurable)

1. **Click to verdict in under 2.0 s.** On desktop broadband, the blank coaster slides in within 100 ms of the tap and the printed coaster replaces it within 2.0 s (p50 under 1.2 s); the engine itself (features → tags → score → text) runs in under 5 ms.
2. **Deterministic and golden-tested.** The same `(lat, lng, local hour, menu)` always yields the same drink and lines; the **eleven** golden fixtures, nine weather (`mumbai`, `yakutsk`, `reykjavik`, `dubai-noon`, `arabian-sea`, `south-pole`, `denver-hail`, `lisbon-golden`, `oslo-brunch`) plus two error fixtures (`error-429`, `error-network`), each produce their expected drink, driving tag, dial label and stamp tier in Vitest, and the Mumbai fixture prints an iced Mojito while the Yakutsk fixture prints a hot dark-rum drink (Hot Buttered Rum, margin 6.26, no roll).
3. **Offline reverse geocoding is right and fast.** Each of the nine weather fixtures plus the twelve pinned geocode points resolves to the expected country or ocean, including the Caspian Sea at (42.0, 51.0), which only passes because the marine polygons are tested before the country hit; 200 random open-ocean points never return a country; a warm lookup (country + nearest city + marine polygon) takes under 20 ms on a 2022 mid-range Android phone.
4. **Policy-clean by construction.** A Playwright network assertion proves zero requests to any host other than `*.open-meteo.com` (and `nominatim.openstreetmap.org` only when the opt-in lever is on); every land click costs at most 3 weighted Open-Meteo calls and every ocean click at most 4 (marine is the fourth); a second click within 15 min inside the same 0.25° cell makes no network request at all.
5. **Preview parity and AA.** Every screen matches `design/preview.html` (which draws its drinks, ids, stamps and anchors from the canonical §6.11 menu, the §6.6 ladder and the C5 fixture roster, it is a rendering of the spec, not a second one); axe reports zero contrast violations in both shifts and inside `.paper`; every screenshot passes the §1 rule of DESIGN.md (a bottle, a coaster ring, a brass pin or the neon sign is visible).
6. **Performance budget held.** Initial JS ≤ 180 KB gzip before the lazy globe chunk (the lazy globe chunk is budgeted separately at ≤ 320 KB gzip); the LCP element is the DOM neon sign, not the canvas; total precache ≤ 12 MB; the idle globe drifts at 60 fps on desktop and ≥ 30 fps on the 2022 Android reference; a cold PWA install boots offline and reopens the last verdict from The Tab.
7. **The bartender does not repeat himself.** At least 8 variants per grammar slot per tag; a script that samples 1,000 verdicts for the Mumbai fixture across seeds yields ≥ 300 distinct jab lines and no two consecutive identical coasters for neighbouring clicks 0.5° apart.
8. **The APK is a real app.** The signed APK from a `v*` tag installs on Android 14+, the pin drop fires `impact Medium`, the shift follows the clicked place with a transparent status bar, and "Tear off" opens the system share sheet with the 1080×1350 PNG attached.

## 6. Non-goals

- Not a forecast app: no hourly strip, no 7-day, no radar, no alerts, no notifications, no charts. One "right now" verdict per click; forecast fields are fetched only to hedge the copy ("the models say").
- No street map, no tiles, no place search beyond Open-Meteo's forward geocoder (a city name → the globe flies there).
- No accounts, no cloud sync, no server of ours; The Tab lives in IndexedDB and leaves only as a JSON export.
- No owner API key anywhere (LLM rungs are opt-in and BYO or keyless); the procedural bartender is the product, not a fallback.
- No commercial use, ads, donations or store listing (Open-Meteo's free tier is non-commercial; the APK is sideloaded from GitHub Releases).
- No user-authored drinks or recipe editing; the bar menu is curated in the repo.
- No insults that target people: the bartender judges weather and choices, never protected characteristics; a "gentler bartender" lever exists.
- No iOS build (no Mac).

## 7. Feature list

### MVP ✅ (the Weekend path in `docs/PLAN.md`; ships before anything else)
- The Bar: DOM back-bar (brass plate, neon sign, wall dial, BAR/BARISTA sign, menu), window with sky gradient, brass-cradled globe.gl canvas (`earth-day.jpg` first paint → NASA Blue Marble 4K), mahogany counter with coaster lane, register, THE TAB plate.
- Flick + pin: drag/flick with damping, idle drift, tap → `onGlobeClick` → pin drop, ripple ring, 1200 ms fly-to; blank coaster slides in immediately.
- Weather: parallel Open-Meteo forecast + air-quality (+ marine when the offline test says ocean), 15-minute cache per 0.25° cell in memory and Dexie, `timezone=auto` local time, sunrise/sunset.
- Offline reverse geocoding: Natural Earth 110m countries (spherical point-in-polygon with bbox pre-bucketing) + stripped populated places (kdbush nearest city, "~38 km from Mumbai, India") + 50m marine polygons ("You are in the Arabian Sea. There is no bar here.").
- Engine: comfort formulas, tag extraction with intensities, weighted drink scoring, serve bonuses, seeded top-3 pick, intensifier tiers, day-part, ocean and polar modes.
- Bar menu of 30 drinks (15 cocktails, 15 mocktails) with affinities, glassware, colour and in-house method text; recipe data from `rasmusab/iba-cocktails` + `alfg/opendrinks` (MIT).
- Voice: Tracery `voice.json` with ≥ 8 variants per slot per tag, seeded per click; hedged copy for model data; polar time joke; error/429/offline coasters.
- The Verdict coaster (place line, local time + dew point, jab, stamp, drink name, glassware SVG, receipt strip), coaster flip to the recipe, BAR ↔ BARISTA flip with the "legally a barista" suggestion before 11:00 local, bottle nod, dial swing.
- Shift change (Day/Night follows `is_day`, pinnable), reduced-motion path, keyboard globe control, 44 px targets, AA contrast.
- The Tab (Dexie `verdicts`, row re-fly), Back Office (shift, units °C/°F · km/h/mph/kn, menu default, sound, haptics, motion, Nominatim opt-in, attribution).
- PWA on GitHub Pages (hash routes `#/`, `#/v/:lat,:lng`, `#/tab`, `#/office`, `#/about`), offline shell + geo data + first-paint texture precached.

### v1 🚀
- Window weather layers: droplets (dew ≥ 21°), frost creep (≤ −10°), rain streaks at three speeds, snow, fog desaturation, glare, the lightning frame; `--grade`/`--stamp`/`--drink-glow` driven by the driving tag.
- The Register: amber VFD ticker ("LAST ORDERS IN LISBON · FIRST COFFEE IN AUCKLAND" from real local clocks), receipt print animation, tear-off to a 1080×1350 PNG via Web Share / download.
- Sound: Howler sprite for CC0 one-shots (tink, shhk, clinks, clunk, feed, zzzt, clack), Web Audio procedural neon buzz, rain/wind bed following wind speed, thunder; brass volume knob; autoplay-safe unlock.
- Ice drop, steam wisps, coaster "second opinion" swipe (next-best drink), NASA Black Marble night texture, monthly Blue Marble swap, 8K desktop / 4K Android variants as WebP, `MAX_TEXTURE_SIZE` probe.
- Search (Open-Meteo forward geocoding, "Never heard of it."), "Where am I" (device geolocation → the same offline lookup; no BigDataCloud).
- 60+ drink menu, virgin twins for every cocktail, glassware set of 9, the Tab export/import JSON.
- Capacitor Android APK on GitHub Releases: haptics, share sheet, status bar per shift, splash, predictive back, DPR cap, 4K textures.

### Someday 🔮
- React Three Fiber custom globe: day/night terminator from `solar-calculator`, city lights, specular oceans, cloud shell, Fresnel halo, `postprocessing` bloom/vignette/DoF, weather particles at the pin.
- Wit ladder rungs 1–3: keyless Workers AI garnish through a Cloudflare Worker (shared template), BYO free key (Gemini / OpenRouter `:free` / Groq) with WebCrypto key vault, WebLLM (Qwen3.5-0.8B) on desktop, all as paraphrase-only rewrites of rung 0.
- Precise place names via Nominatim (opt-in lever, 1 req/s client throttle, cached, ODbL credit).
- Multi-language bartender (grammar per locale), a "gentler bartender" toggle, seasonal specials (a mulled-wine December, a frozen July).
- cobe dotted globe as the loading/no-WebGL state with equirectangular hit-testing; PWA → TWA build as an alternative to Capacitor.

## 8. Platforms

| Target | How | Notes |
|---|---|---|
| Web (PWA) | GitHub Pages at `https://<owner>.github.io/barometer/`, hash routing, Workbox precache | Installable; offline shell + last verdicts; the only host that talks is `*.open-meteo.com` |
| Desktop | The same web app at ≥ 1024 px: full back-bar, window + globe, counter with register and Tab drawer | Keyboard: arrows rotate, Enter pours at the crosshair, `+`/`−` zoom |
| Phone web | < 768 px: 56 px back-bar strip, 50 vh window, counter as a draggable sheet with the square coaster | Thumb-reach layout; coaster is the LCP after the sign |
| Android (optional) | Capacitor 8 shell, signed APK from GitHub Actions on tag `v*`, sideloaded | `minSdk 24`, `compileSdk 36`; haptics, share, status bar, splash, geolocation; no service worker in the WebView |
| iOS | Not targeted | No Mac available |

## 9. Constraints

- **Free, forever:** GitHub (public repo, Pages, Actions, Releases) only. No Cloudflare Worker is needed for the MVP; one may be added later for the optional keyless AI rung using `_shared/templates/worker.yml`. No card is entered anywhere.
- **Offline:** the app shell, fonts, geo data, drink data, grammar, sounds and the first-paint texture are precached; Open-Meteo answers are cached 15 min per 0.25° cell in Dexie and reused stale (tagged "re-poured from memory") when offline; the Tab is always readable offline.
- **Privacy:** no analytics, telemetry, crash reporting, accounts or cookies. Coordinates you click are sent only to Open-Meteo (required to get weather) and, only if you switch the lever on, to Nominatim. Device location is requested only when "Where am I" is tapped and is resolved offline. BYO keys are stored encrypted on-device with a "session only" option and never logged.
- **Terms:** Open-Meteo is non-commercial and CC BY 4.0, "Weather data by Open-Meteo.com" plus CAMS (air quality) and DWD (marine) credits are rendered on the coaster receipt, the share card and the About page. BigDataCloud is never called. TheCocktailDB is never called. Nominatim is opt-in, throttled and credited "Data © OpenStreetMap contributors".
- **Licences:** app code MIT; dependencies OSI only (MIT/ISC/BSD/Apache-2.0/Zlib/CC0); no GSAP unless a timeline genuinely needs it (free but non-OSI); no GPL reference code copied (WeatherMaster, weather-map-layer); drink data MIT (`rasmusab/iba-cocktails`, `alfg/opendrinks`) with in-house method text; textures NASA (public domain, credit "NASA Earth Observatory"), never PlanetPixelEmporium; Natural Earth public domain; fonts SIL OFL 1.1 (Righteous, Space Grotesk, JetBrains Mono) self-hosted via Fontsource; sounds CC0 (Freesound CC0 filter, Kenney) or synthesised.
- **Design contract:** `docs/DESIGN.md` tokens, fonts, motion and screens are binding; `design/preview.html` is the visual bar the real app must meet, it is written and locked, not a Phase-1 deliverable.
- **Local toolchain:** Node 22, npm, git, Biome. No Java/Android SDK locally, `npx cap add android` only writes files; every APK is built in CI.

## 10. The one-sentence pitch

Barometer is a brass-and-mahogany globe bar in your browser: flick the planet, tap anywhere, and a judgmental bartender reads that spot's real-time weather and slides you a coaster with the one drink that will get you through it, aggressively iced for the soup-air of Mumbai, hot dark rum with no arguments for a Yakutsk January, free, offline-capable, on the web and as an Android APK.
