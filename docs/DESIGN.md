# Barometer — DESIGN.md (design system, v1)

**Project:** 04 · The Contextual Weather Bartender (codename "Barometer") · **Date:** 2026-09-06
**Binding docs:** `_shared/DECISIONS.md` (D1 stack, D4 wit ladder, D5 licensing, D7 token contract), `docs/RESEARCH.md` (Open-Meteo, globe.gl → R3F, offline geocoding, drink data), `_shared/research/DESIGN-TOOLKIT.md` (fonts/libs).
**Portfolio typography rule (binding):** bar-sign / neon / retro-tropical display + Space Grotesk / DM Sans body. **Fraunces is forbidden here** (it belongs to another app).
**Rule of the house:** `design/preview.html` is the visual contract (D9.3). If the app looks worse than this document, it is not done.

---

## 1. Identity

**Name:** *The Globe Bar* (the product is still called Barometer; "The Globe Bar" is the name on the neon sign).

**One-liner:** A brass-cradled planet on a mahogany counter under a buzzing neon sign. Spin it, drop a pin, and a judgmental bartender slides a paper coaster across the bar with your survival drink pressed into it — aggressively iced Mojito for the soup-air of Mumbai, warm dark rum, no arguments, for −48° Yakutsk.

**Three adjectives:** Tactile · Cheeky · Loud.

**The trick that makes it one object, not a dashboard:** every piece of information is a *thing in the bar*. The weather is on the window glass behind the counter. The temperature is a needle on a brass wall dial. The verdict is letterpressed on a coaster. The stats are a thermal receipt from the register. The decision is visible before it is read: the bottle the bartender reached for lights up on the shelf.

**What it must never look like**
- *"Another 3D earth on a navy/space gradient with a glass card."* There is no navy, no starfield, no glassmorphism, no blur. The dark is mahogany; the accent is brass; the card is paper; nothing floats.
- *A weather dashboard.* No stat pills, no icon grid, no forecast strip, no charts. If a screenshot could be mistaken for a weather app, a bottle, a coaster ring, a brass pin or the neon sign must be visible in it.
- *A Prohibition speakeasy / Art-Deco template.* No gold filigree, no script fonts, no sunburst borders. One brass line per band, one neon sign, that's the ornament budget.
- *Refined.* This bar is a dive with good bones. The bartender shouts in neon caps and mutters in grotesk. If a prototype reads as elegant-and-quiet, the levers are copy (rude), scale (the intensifier stamp at 2×, rotated), light (the neon buzz, the lightning frame) and sound — never more colour.

---

## 2. Moodboard & references

| Reference | What we take | URL |
|---|---|---|
| Zoffoli Italian globe bar cabinets | The brass meridian cradle, the turned-wood base, a world that hides a bottle | https://www.zoffoli.it/en/globe-bar/ |
| Edward Hopper, *Nighthawks* (1942) | Warm interior light against a cold outside, seen through a big pane; the counter as stage | https://www.artic.edu/artworks/111628/nighthawks |
| Lloyd the bartender, *The Shining* (1980) | Impeccably polite, quietly judging you | https://www.imdb.com/title/tt0081505/ |
| Not Boring Weather (Andy Allen) | Modern skeuomorphism: weather as a lit, tactile object | https://www.notboring.software/weather |
| Braun SK4 "Snow White's Coffin" (Rams / Gugelot) | One honest material per surface; every control is real | https://www.vitra.com/en-us/magazine/details/dieter-rams |
| Dead Rabbit NYC printed coasters and menus | Pressed-ring coasters, stamped type, rude copy | https://www.deadrabbitnyc.com/ |
| Googie / tiki bar neon signage (Righteous's ancestry) | The retro-tropical sign letter, the tube flicker | https://commons.wikimedia.org/wiki/Category:Neon_signs_in_the_United_States |
| earth.nullschool.net | The planet as an instrument you interrogate by clicking | https://earth.nullschool.net/ |
| NASA Black Marble | City lights as the only decoration the night side needs | https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps |
| An antique aneroid barometer face (grafted) | "CHANGE / FAIR / STORMY" engraved on a brass dial; a needle that swings | https://commons.wikimedia.org/wiki/Category:Aneroid_barometers |
| Thermal receipt paper from an old bar register | Perforated, crooked, mono type, torn off by hand | https://commons.wikimedia.org/wiki/Category:Receipts |
| Wong Kar-wai, *Fallen Angels* (grafted, window only) | Rain on glass, humidity you can feel, sodium orange; hardware-style readouts on the register | https://www.criterion.com/films/30183-fallen-angels |

---

## 3. Judging summary

Scores 1–10; total /50. Judged harshly on genericness *and* on illegible art-direction, and on collisions with the other seven apps (Napkin already owns editorial newsprint; Sillage already owns 3D glass).

| Concept | Distinct. | Vibe fit | Usability | Feasibility | Screenshot | **Total** | Verdict |
|---|---|---|---|---|---|---|---|
| 1 · Late Edition (editorial broadsheet) | 5 | 4 | 9 | 8 | 7 | 33 | Beautifully argued, superbly legible, and the wrong app. Cream paper + hairlines + giant numerals + time-of-day editions is Napkin's identity with a globe pasted in; "quiet, precise, typographic" is the opposite of *cheeky and chaotic*; it depends on Fraunces WONK, which this project may not use. Halftone-globe moiré on Android is real risk. |
| 2 · The Sweating Glass (immersive orbit bar) | 8 | 8 | 5 | 4 | 10 | 35 | The best single frame in the portfolio (the lightning flash, the finger-wipe) and the most dangerous build: a custom postprocessing refraction pass, procedural droplets, frost, streaks, bloom and an attract mode — on Android WebView, alone. Text over a moving refracted scene is the classic illegible art project; the "dry zone" scrim is a patch, not a structure. "Dark globe with glow" is also the most-copied look since 2021. Collides with Sillage's glass. |
| 3 · The Globe Bar (tactile object) | 8 | 8 | 8 | 8 | 9 | **41** | **Winner.** Every distinctive element is also the information design (bottle = decision, dial = temperature, coaster = verdict, receipt = stats), so nothing has to be removed for usability; text only ever sits on cream or brass; the build is DOM/SVG/CSS around a stock globe.gl canvas — a solo dev can reach a premium finish. Weak spots: the vintage-Italian styling is more "gentleman's club" than "chaotic", and it also leaned on Fraunces. Both fixed by the grafts and the font rule. |

**Why The Globe Bar won.** The brief wants distinctive *and* legible. Concept 3 is the only one whose signature survives a 5-inch phone with the sound off: the coaster is a cream card with 14.9:1 ink, the receipt is mono on paper, and the drama (bottles, ice, frost, the pin) happens *around* the text, never under it. It is also the only concept that gives the app an object to be — the one thing a screenshot can never be confused with a weather dashboard.

**What was grafted (and how conflicts were resolved)**
1. **The neon sign** (from Sweating Glass's amber terminator and chalkboard signage, and the portfolio font rule). "THE GLOBE BAR" hangs in the window as a Righteous neon tube; it powers on with a flicker, buzzes faintly at night, and goes *off* (pale glass) on the day shift. The BAR ↔ BARISTA toggle is a second, smaller neon sign. *Conflict:* neon is a second light source next to brass — allowed only in the window band and only as one amber (+ one green when Barista is on). No neon on the counter, ever.
2. **The lighting follows the clicked place** (from Late Edition's edition flip). The bar has no theme toggle: click somewhere in daylight and it is the **Day shift** (daylight through the window, oak, neon off); click into night and it is the **Night shift** (mahogany, sodium window, neon on). Before the first click, `prefers-color-scheme` decides; a pin in the Back Office fixes either shift. *Conflict with D7 (define a light palette):* satisfied — the Day shift *is* the light palette, fully specified in §4.2.
3. **The wall dial** (from Late Edition's mercury needle). A brass aneroid barometer on the back-bar wall whose needle swings to the tag that chose the drink — the ring is engraved ARCTIC · FREEZING · CHILLY · FAIR · MUGGY · SOUP · SCORCHING — while a small mono window in the dial rolls to the apparent temperature. The needle is the "why" made physical. *Conflict:* no giant ornamental numeral (that is Napkin's dialect); the number lives only in the dial window and on the receipt.
4. **The register display and the tab** (from Sweating Glass's terminator ticker and Late Edition's Back Issues). The brass register has a one-line amber VFD readout that ticks "LAST ORDERS IN LISBON · FIRST COFFEE IN AUCKLAND" as real cities cross the live terminator; past coasters stack under the counter as **The Tab** (Dexie), each row re-flying the globe. *Conflict:* no arcade attract mode that auto-visits cities — the globe drifts, the display ticks, the bartender waits. Idle motion stays cheap.
5. **The glass sweats** (from Sweating Glass, reduced to CSS/SVG). The window behind the globe gets droplets at dew point ≥ 21°, frost at wind-chill ≤ −10°, rain streaks, fog and the 80 ms lightning frame — as CSS gradients and SVG `feTurbulence`, not a shader pass. *Conflict:* effects live on the window only, never on the whole viewport, so text is never behind them.

**Rejected grafts:** the refraction/droplet shader (Sillage's territory, Android cost), the halftone globe (Napkin's territory), the full-bleed no-scroll scene (kills thumb reach for the coaster), Fraunces WONK wobble (forbidden font), the finger-wipe reveal (needs the whole-pane glass), attract mode auto-touring (surprising, expensive), the torn newspaper clipping (the receipt is the tear-off here), Caveat chalk script (no script faces for functional text; the neon does the job).

---

## 4. Colour system

Two shifts (Night = default, Day = light), plus a **paper material scope** that re-maps the same token names inside coasters and receipts so components only ever read `--bg`/`--ink`. All hexes below were checked with the WCAG relative-luminance formula on 2026-09-06; ratios are text-on-background.

### 4.1 Night shift (default; the bar after dark)

| Token | Hex | Usage | Contrast |
|---|---|---|---|
| `--bg` | `#1A0F0A` | The room behind the bar: deep mahogany shadow. The only "dark" in the app is wood, never navy/grey | — |
| `--bg-elevated` | `#2E1A10` | Back-bar shelf wall, drawers, the Back Office sheet | — |
| `--surface` | `#3A2114` | The counter top (mahogany, grain at `--grain-opacity`), register housing | — |
| `--surface-2` | `#4A2C1A` | Hover/pressed wood, the drawer lip, toggle track | — |
| `--ink` | `#F3E6C8` | Cream text on wood (brass-plate captions, sheet body) | 15.2:1 on `--bg` · 12.1:1 on `--surface` |
| `--ink-muted` | `#C9B28C` | Secondary text on wood (settings descriptions, tab rows) | 9.2:1 on `--bg` · 7.3:1 on `--surface` |
| `--ink-faint` | `#8C7355` | Decorative only: rail shadows, disabled labels, dividers. Never running text | 4.2:1 (fails AA — decorative) |
| `--accent` | `#C9962B` | **Brass**: cradle ring, pin, foot-rail, plate lettering, primary buttons | 7.1:1 on `--bg` · 5.6:1 on `--surface` |
| `--accent-ink` | `#1A0F0A` | Text stamped into brass (buttons, plate) | 7.1:1 on `--accent` |
| `--accent-2` | `#7FE8C8` | **Crushed-ice mint**: iced verdict glow, condensation, cold-weather grade, the click ripple | 12.8:1 on `--bg` |
| `--success` | `#8CC46A` | Barista-mode text/neon ("OPEN", "legally a barista"); fill variant `--success-fill #5B8C3A` with `--paper-ink` text | 9.2:1 on `--bg` |
| `--warning` | `#F08A3C` | **Amaro orange**: heat, sodium-lamp window, hot-drink grade, "hot" stamps | 7.5:1 on `--bg` · 6.0:1 on `--surface` |
| `--danger` | `#F0564B` | **Campari red**: storm, extreme UV/AQI, the bartender's harshest tier. Text only on `--bg`/`--bg-elevated`; on `--surface` use the fill `--danger-fill #B8322E` with `--ink` text (4.8:1) | 5.5:1 on `--bg` · 4.4:1 on `--surface` (large text only) |
| `--border` | `#4A3222` | Hairlines on wood (1px) | — |
| `--border-strong` | `#C9962B` | The brass rail lines (one per band), plate edges | — |
| `--focus` | `#F5C860` | Polished-brass focus ring, 2px + 2px offset, on every control | 11.9:1 on `--bg` |

**Extra tokens (this app only):** `--neon #FFB347` (sign tube, 10.6:1 on `--bg`), `--neon-glow rgba(255,179,71,.55)`, `--neon-off #6B4A3A` (unlit tube glass), `--wood-grain` (SVG feTurbulence data URI), `--brass-hi #F5C860`, `--brass-lo #8A6414`.

### 4.2 Day shift (light; the bar with daylight through the window)

Auto when the clicked place has `is_day = 1` (or `prefers-color-scheme: light` before the first click). Wood turns to oak, the neon is off, the window is bright.

| Token | Hex | Usage | Contrast |
|---|---|---|---|
| `--bg` | `#EFE3CC` | Sunlit wall / room | — |
| `--bg-elevated` | `#D9B98A` | Oak shelf and counter. **Only `--ink` text sits directly on oak** (9.9:1); muted and brass text on oak are forbidden | — |
| `--surface` | `#FBF4E4` | Coaster paper in daylight (whiter than the room) | — |
| `--surface-2` | `#E6D2A6` | Aged paper edge, receipt, toggle track | — |
| `--ink` | `#1C120C` | Text | 14.5:1 on `--bg` · 16.8:1 on `--surface` |
| `--ink-muted` | `#5E4632` | Secondary text | 6.9:1 on `--bg` · 8.0:1 on `--surface` |
| `--ink-faint` | `#9C8468` | Decorative only | 2.8:1 (decorative) |
| `--accent` | `#7A5A12` | Brass in daylight (darker, readable as text) | 5.0:1 on `--bg` · 5.8:1 on `--surface` |
| `--accent-ink` | `#FBF4E4` | Text on brass fills (`--accent` fill) | 5.8:1 |
| `--accent-2` | `#1F6E7B` | Ice/ocean teal | 4.6:1 on `--bg` · 5.4:1 on `--surface` |
| `--success` | `#3E6B2A` | Barista green | 5.0:1 on `--bg` |
| `--warning` | `#A6470E` | Amaro | 4.7:1 on `--bg` · 5.4:1 on `--surface` |
| `--danger` | `#A0281F` | Campari | 5.9:1 on `--bg` |
| `--border` | `#D8C7A6` | Hairlines | — |
| `--border-strong` | `#7A5A12` | Brass rails | — |
| `--focus` | `#7A5A12` | Ring, with a 2px `--surface` halo underneath so it reads on oak | 5.0:1 |

`--neon` on the Day shift is `#E8B7A0` at 100% with no glow (a switched-off tube); `--neon-glow` is `transparent`. The brass gradient (§4.5) keeps its highlight; the raised brass surfaces still read as brass because the metal, not the text, carries the colour.

### 4.3 Paper scope (coaster, receipt, recipe card) — same in both shifts

Applied with `.paper { … }`. Components inside read the *same* token names.

| Inside `.paper` | Night & Day value | Usage | Contrast |
|---|---|---|---|
| `--bg` | `#F3E6C8` (Day: `#FBF4E4`) | Coaster stock | — |
| `--surface-2` | `#E6D2A6` | Pressed ring, receipt perforation band | — |
| `--ink` | `#1C120C` | Letterpress ink | 14.9:1 (Day 16.8:1) |
| `--ink-muted` | `#5E4632` | Stats labels, footnotes, units | 7.1:1 · 5.9:1 on `--surface-2` |
| `--ink-faint` | `#A38A6F` | Coaster rings, rules, disabled — decorative only | 2.6:1 (decorative) |
| `--accent` | `#7A5A12` | Brass ink (recipe headings, "make it virgin" link) | 5.1:1 |
| `--accent-2` | `#1F6E7B` | Ice teal ink (iced/ocean lines). On `--surface-2` only at ≥ 18px/600 (3.95:1 large-text AA) | 4.8:1 |
| `--success` | `#3E6B2A` | Barista stamp ink | 5.1:1 |
| `--warning` | `#A6470E` | Hot stamp ink | 4.8:1 |
| `--danger` | `#A0281F` | Storm/extreme ink, "do not go outside" | 6.0:1 |
| `--border` | `#D8C7A6` | Hairline rules on paper | — |
| `--focus` | `#7A5A12` | Ring on paper controls | — |

### 4.4 Semantic & weather-grade tokens

The bartender's engine emits one *driving tag* per verdict (RESEARCH §5.6). The tag drives four CSS variables that tint the window and the coaster's stamp — and nothing else, so contrast is never affected:

| Tag family | `--grade` (window light) | `--stamp` (intensifier stamp ink) | `--drink-glow` (coaster ring glow) | Notes |
|---|---|---|---|---|
| scorching / hot / uv-extreme | `#F08A3C` at 18% | `--warning` | `--warning` at 25% | harsh noon glare on the glass |
| muggy / oppressive | `#1B6F6A` at 22% | `--accent-2` | `--accent-2` at 30% | condensation droplets |
| chilly / cold / freezing / arctic | `#9FD8FF` at 20% | `--accent-2` | `--accent-2` at 20% | frost creeps at ≤ −10° |
| rain / drizzle / downpour | `#2C3440` at 30% | `--ink` | none | streaks, three parallax speeds |
| snow / blizzard | `#DCE6EE` at 26% | `--accent-2` | `--accent-2` at 20% | slow flakes |
| storm / hail / gale | `#2C3440` at 40% | `--danger` | `--danger` at 30% | lightning frame |
| fog / smog / dust | `#8C7355` at 35% | `--ink-muted` | none | desaturated pane |
| late / evening (night side) | `#FFB347` at 12% | `--ink` | `--neon` at 15% | sodium lamp |

`--stamp` is always one of the AA-checked paper inks above; `--grade` only ever tints the window pane.

### 4.5 Gradients, materials, textures

- **Mahogany / oak:** `linear-gradient(180deg, var(--surface) 0%, color-mix(in oklab, var(--surface), black 18%) 100%)` — `in oklab`, matching IMPL §3.6; do not swap it for `oklch`, which shifts the hue on the way down + an SVG `feTurbulence` grain (`baseFrequency .9 .04`, `numOctaves 2`, stretched 1×6 so it reads as grain not noise) at `--grain-opacity: .08` (`.05` on Day). Grain is the *only* texture; nothing else is noisy.
- **Brass:** `linear-gradient(100deg, #8A6414 0%, #C9962B 35%, #F5C860 52%, #C9962B 68%, #8A6414 100%)` — one highlight, one shadow, applied to rings, rail and plates; text on brass uses the flat `--accent` fill, not the gradient.
- **Coaster paper:** flat `--bg` (paper scope) + `inset 0 0 0 1px var(--border)` + pressed ring `box-shadow: inset 0 0 0 10px var(--surface-2), inset 0 0 0 11px var(--ink-faint)`. Optional 2% grain. Never white.
- **Window glass:** a `--grade` tint over a 3-stop sky gradient (day: `#BFD9E8 → #E9EEF0`; night: `#0B0A12 → #2A1B10` sodium at the bottom), with weather layers above (§7).
- **Neon:** `color: transparent` with `-webkit-text-stroke: 1.6px var(--neon)` (1.4px on the Day shift) + `filter: drop-shadow(0 0 4px var(--neon-glow)) drop-shadow(0 0 14px var(--neon-glow))`; the tube has a 1px inner `--ink` core line so it reads as glass, not a glow blob. The hue lives on the **stroke**, never on `color` — which is why the token test asserts `-webkit-text-stroke-color`, not `color` (IMPL §3.6, TESTING §7).
- **Forbidden:** blur, glassmorphism, drop shadows on text, gradients on text, navy, pure white, pure black.

---

## 5. Typography

Three voices = three characters. **The sign** (Righteous) shouts. **The print** (Space Grotesk) talks. **The machine** (JetBrains Mono) refuses to editorialise.

| Role | Family | Google Fonts | Fontsource | Weights / axes | Where |
|---|---|---|---|---|---|
| `--font-display` | **Righteous** (Astigmatic, OFL) — a Googie/tiki sign letter | https://fonts.google.com/specimen/Righteous | `@fontsource/righteous` (static 400, ~24 KB latin) | 400 only | Neon sign, drink name on the coaster, the intensifier stamp, BAR/BARISTA sign, "THE TAB" plate, empty-state lines. **Never below 20px** |
| `--font-body` | **Space Grotesk** (Florian Karsten, OFL) — variable | https://fonts.google.com/specimen/Space+Grotesk | `@fontsource-variable/space-grotesk` (wght 300–700, ~60 KB latin) | 400 body · 500 bartender lines · 600 labels/buttons · 700 small caps | Coaster copy, recipe, settings, tooltips, tab rows |
| `--font-mono` | **JetBrains Mono** (JetBrains, OFL) | https://fonts.google.com/specimen/JetBrains+Mono | `@fontsource-variable/jetbrains-mono` (wght 100–800; ship 400/600) | 400 · 600 | Receipt, dial window, register display, coordinates, local time, attribution, share card |

**Budget:** one static display file + two variable files, Latin subset, `font-display: swap`, self-hosted (D1). ≤ 2 variable families per DESIGN-TOOLKIT §3. No fourth face; Caveat/chalk is dropped.

**The bartender's voice without an italic.** Space Grotesk has no italic and Righteous has one weight, so the voice is built from *scale and case*, which suits a bartender who talks normally and then shouts: the judgment lines are Space Grotesk 500 at `--text-lg`, and the one or two words the engine marks as the intensifier are set inline in Righteous at 1.6× size, uppercase, baseline-aligned (`vertical-align: -0.08em`) — "the air is soup. **AGGRESSIVELY ICED** Mojito. Served in a bucket." Chaos comes from the type-size jump, not from a wobble axis. **In the grammar the marker is the literal guillemets `«…»`, never markdown asterisks** (IMPL §3.7/§6.10, TESTING T-WT-2): the bold above is this document's emphasis, and the renderer swaps `«AGGRESSIVELY ICED»` for `<em class="intensifier">`. A grammar full of `**` ships the asterisks to the coaster.

**Type scale (rem, 16px root)** — mapped to D7 tokens:

| Token | Size | Line height | Use |
|---|---|---|---|
| `--text-xs` | 0.75rem (12) | 1.4 | mono attribution, receipt footer, tab metadata |
| `--text-sm` | 0.8125rem (13) | 1.45 | receipt lines, footnotes, small caps labels |
| `--text-base` | 1rem (16) | `--leading-body` 1.5 | coaster copy, settings |
| `--text-lg` | 1.1875rem (19) | 1.45 | bartender judgment lines |
| `--text-xl` | 1.375rem (22) | 1.3 | recipe headings, sheet titles |
| `--text-2xl` | 1.75rem (28) | `--leading-tight` 1.1 | intensifier inline (Righteous), dial window |
| `--text-3xl` | clamp(2.25rem, 5vw, 3rem) | 1.05 | drink name on the coaster (mobile) |
| `--text-4xl` | clamp(2.75rem, 7vw, 4.5rem) | 1.0 | drink name on the coaster (desktop), BAR/BARISTA sign |
| `--text-5xl` | clamp(3.5rem, 9vw, 7rem) | 0.95 | "THE GLOBE BAR" neon, share-card headline |

**Rules**
- Righteous: letter-spacing `0.02em` at display sizes, `0.06em` for the small neon (BARISTA), always uppercase for signs; Title Case for drink names ("Dark 'n' Stormy" keeps its apostrophes).
- Space Grotesk small caps labels: uppercase, 13px/700, letter-spacing `0.08em`, `--ink-muted`.
- Space Grotesk body: `letter-spacing: -0.005em`, max measure 34em on paper.
- **Every figure is set in JetBrains Mono** with `font-variant-numeric: tabular-nums` — temperatures, dew point, wind, UV, AQI, coordinates, times — so nothing jitters when a number rolls. Degrees use the real `°`; negatives use `−` (U+2212).
- Devanagari / other scripts: place names come from Natural Earth's Latin `name` field, so no extra script coverage is needed. If Nominatim (optional) returns non-Latin names, they fall back to the system UI font via the stack (`'Space Grotesk Variable', system-ui, sans-serif`).
- Text on wood is only `--ink`, `--ink-muted` or `--accent` (Night). Text on oak (Day) is only `--ink`. Text on paper follows §4.3. Text never sits on the globe, the window, or a gradient.

---

## 6. Spacing, radius, elevation, borders

- **Spacing (8px base):** `--space-1 4px · -2 8 · -3 12 · -4 16 · -5 24 · -6 32 · -7 40 · -8 48 · -9 64 · -10 80 · -11 96 · -12 128`. Page inset 16px mobile / 32px desktop; band gutters 24px; coaster padding 24px; receipt padding 12px 16px.
- **Radius:** `--radius-sm 3px` (buttons, plates), `--radius-md 6px` (drawer, cards), `--radius-lg 14px` (bottom sheet top corners, register), `--radius-xl 24px` (share card), `--radius-full 9999px` (round coaster, pin head, dial). Squares and hairlines elsewhere — the bar is built, not blobbed.
- **Elevation (contact shadows, warm-black; things sit on wood):** `--shadow-1: 0 1px 0 rgba(0,0,0,.35)` (plates, receipt), `--shadow-2: 0 6px 14px -6px rgba(0,0,0,.55)` (coaster, bottles), `--shadow-3: 0 18px 40px -12px rgba(0,0,0,.7)` (sheet, drawer, the globe base). Day shift multiplies alpha by 0.6. No glow shadows except neon (§4.5) and the drink-glow ring on the coaster.
- **Borders:** hairlines 1px `--border`; structural brass rails 2px `--border-strong` — **max one brass line per band** (rail under the bottles, meridian ring on the globe, foot-rail on the counter). Coaster pressed ring per §4.5.
- **Grid:** 1200px max content width; desktop bands 16% / 52% / 32% of viewport height (min counter 260px); mobile bands 56px / 50vh / remainder as a sheet. One `--globe-size` variable (clamp(280px, 48vmin, 640px)) drives the canvas *and* the SVG cradle so they stay registered.

---

## 7. Motion language

**Principles.** (1) *Mass and surface* — nothing fades in from nowhere; things slide, drop, tilt, settle and cast a shadow while doing it. (2) *Print, don't type* — text is already on the coaster when it arrives; only the receipt prints line by line, because a receipt does. (3) *Weather moves like weather* — slow, continuous, low-contrast, on the window only. (4) *One overshoot per gesture* — the coaster lands with 6px overshoot; nothing else bounces. (5) *Idle is cheap* — a drifting globe and a ticking display, no particle systems until a click.

**Tokens.** `--dur-fast 120ms` (press states, glints, sign flip start) · `--dur-base 240ms` (tooltips, bottle dim, ring draw) · `--dur-slow 480ms` (shift change, window weather cross-fade, coaster flip). Scene durations: fly-to 1200ms; coaster slide ~620ms; frost creep 1600ms; condensation bloom 1200ms.
`--ease-out: cubic-bezier(0.22, 1, 0.36, 1)` (out-quint, everything that appears) · `--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)` (camera, shift change) · `--ease-spring: linear(0, 0.009, 0.035 2.1%, 0.141, 0.281 6.7%, 0.723 12.9%, 0.938 16.7%, 1.017, 1.077 20.4%, 1.121, 1.149 24.3%, 1.159, 1.163 27.8%, 1.154, 1.129 32.8%, 1.051 39.6%, 0.979 47.2%, 0.957 53.7%, 0.977 61.9%, 1.006 74.4%, 1.001 100%)` (approximates Motion `{ stiffness: 260, damping: 22, mass: 1 }`, ~6% overshoot). Motion presets in `src/motion/springs.ts`: `soft {220, 26}` (coaster), `snappy {420, 34}` (toggles, sign), `drop {500, 18}` (ice cubes).

**Named animations**

| # | Name | Property, from → to | Duration / easing / stagger |
|---|---|---|---|
| A1 | **Coaster slide** | `x: 140% → 0`, `rotate: 4° → 0°`, `opacity 0 → 1` (first 80ms) | Motion spring soft (~620ms), lands with 6px overshoot; text already printed |
| A2 | **Pin drop** | `y: −48px → 0`, `scale 1.2 → 1`; shadow `--shadow-2 → --shadow-1` | 260ms `--ease-out`; ring ripple (globe.gl `ringsData`) radius 0 → 6°, 900ms, opacity 1 → 0 |
| A3 | **Fly-to** | globe.gl `pointOfView({lat,lng,altitude:1.6})` | 1200ms `--ease-in-out`; auto-rotate off; DOM cradle static |
| A4 | **Bottle nod** | picked bottle `scale 1 → 1.06`, `rotate 0 → −7°`; spot-light `opacity 0 → 1`; other bottles `opacity 1 → .6` | 380ms `cubic-bezier(.34,1.56,.64,1)`; light 240ms; dim 240ms |
| A5 | **Dial swing** | needle `rotate: prev → target` (−120° … +120° across the tag ring); dial window numeral rolls | 600ms `--ease-out`, one 3° overshoot; numeral via MotionValue 600ms |
| A6 | **Receipt print** | each line `y: 6px → 0`, `opacity 0 → 1`, 2px vertical jitter | 60ms/line, linear stagger, paper-feed sound per 3 lines |
| A7 | **Coaster flip** | `rotateY 0 → 180°` with `backface-visibility: hidden`, `perspective 1200px` | 420ms spring snappy; content swap at 50% |
| A8 | **Shift change** | all `:root` colour tokens (registered with `@property`) crossfade; window sky gradient swaps; neon `opacity`/`filter` on/off | 480ms `--ease-in-out`; neon power-on flicker: opacity keyframes `0, 1, .3, 1, .6, 1` over 700ms, once |
| A9 | **Ice drop** | 3 SVG cubes `y: −40px → 0`, `rotate ±12° → 0` | spring drop, 90ms stagger, clink each |
| A10 | **Frost creep** | `mask-image` (feTurbulence displaced circle) `scale 0 → 1.4` from the four window corners | 1600ms `--ease-out`, when apparent ≤ −10° |
| A11 | **Lightning frame** | window `opacity` of a white layer `0 → .9 → 0`; globe night-side bloom (R3F path) or a 300ms `filter: brightness(1.6)` (globe.gl path); bottles flash `opacity .6 → 1 → .6` | 80ms spike + 300ms decay; rumble 400–900ms later |
| A12 | **Globe flick** | OrbitControls `enableDamping`, `dampingFactor .045`, `rotateSpeed .55` | a flick spins ~2.5 turns; auto-rotate `0.18°/frame` after 8s idle, stops on pointer down |

**Reduced motion (`prefers-reduced-motion: reduce`, plus a Back Office switch):** globe damping stays (user-driven) but auto-rotate is off; fly-to becomes a 480ms opacity cross-fade with an instant camera cut; coaster, bottle and pin use 200ms `opacity + translateY(8px)` only; the receipt appears whole; ice cubes appear in place; window weather is a single static frame; no frost creep; lightning becomes a static 300ms brightness step (no flash); the neon does not flicker; the dial needle still moves (600ms) because it carries information, but without overshoot. `MotionConfig reducedMotion="user"` wraps the app.

---

## 8. Signature interactions

### 8.1 The Flick + the Pin
1. Pointer down on the globe stops the idle drift; drag rotates with heavy bearing damping (A12). A flick above 0.6 rad/s plays the bearing whirr, pitch following angular speed.
2. Tap/click on the globe → `onGlobeClick({lat,lng})` → the brass pin drops (A2) with a "tink" and the ripple ring spreads; the camera flies (A3).
3. In the ~300 ms before Open-Meteo answers, a *blank* coaster (pressed ring only) slides in (A1) so the bar reacts instantly; the printed coaster replaces it in place (no second slide).
**Why it delights:** the globe has weight; you can feel the bearing. Haptic: `impact Light` on pointer-down, `impact Medium` on pin drop, `selectionChanged` every 30° while dragging (cradle detents).

### 8.2 The Slide (the verdict)
1. The bartender pushes a cream coaster across the mahogany from his side (right on desktop, from below on mobile): 4° → 0° rotate, 6px overshoot, wooden "shhk".
2. It is already printed: place line, one weather jab, the drink name in Righteous, the intensifier stamp rotated −4°, a mono receipt strip.
3. Simultaneously the bottle nods (A4) and the dial swings (A5) — you can *see* the decision before you read it.
**Why it delights:** three physical tells agree with the joke. Haptic: `impact Light` on landing.

### 8.3 The Pour (ice / heat / weather on the glass)
1. Iced verdicts: three ice cubes drop into the glass drawn on the coaster (A9) with pitched clinks; a condensation ring blooms on the paper over 1.2 s; the window sweats (droplet layer opacity → 1 over 2.4 s).
2. Hot verdicts: three steam wisps loop over the mug; if apparent ≤ −10°, frost creeps from the window corners (A10) and the window fills with snow.
3. Storm codes (WMO 95/96/99): the lightning frame (A11), a rumble 0.4–0.9 s later; `--stamp` goes Campari.
**Why it delights:** the weather is *somewhere* — behind the bar, on a pane — not a chip that says "rain". Haptic: `impact Heavy` 40 ms on lightning; `notification Warning` when the insult tier is danger.

### 8.4 The Barista Flip
1. The small neon sign in the window reads **BAR** (amber). Tap it (or the flip-sign lever on mobile): 240 ms clack, it swings on Y and now reads **BARISTA** in green neon.
2. Spirits dim to 60%; tea tin, cocoa, ginger beer and syrups light up; the current coaster re-prints with the mocktail twin (no re-slide).
3. Auto-suggested (never forced) when the clicked spot's local time is before 11:00: a brass tag on the coaster says "It's 9 a.m. there. I am legally a barista now." with the flip as its action. Persisted (`localStorage` / `@capacitor/preferences`).
**Why it delights:** the toggle is a sign in a window, and the shelf visibly re-stocks. Haptic: `selectionChanged`.

### 8.5 The Tear-off (share)
1. The register prints a thermal receipt (A6) with the verdict, stats, a tiny dotted globe (cobe-style SVG) with the pin, local time, and the attribution lines.
2. Pull it down (mobile drag ≥ 56px) or click the register's TEAR key: the paper rips along the perforation (SVG `feTurbulence` displaced edge, 260 ms) with a "zzzt".
3. It becomes a 1080×1350 PNG (canvas, `document.fonts.load` first) via Web Share on mobile / download on desktop (`@capacitor/share` in the APK).
**Why it delights:** the share card is an object you already saw printed, not a modal that appears. Haptic: `impact Medium` on tear.

---

## 9. Screen-by-screen

Routes (hash router): `#/` The Bar · `#/v/:lat,:lng` The Verdict (deep-linkable) · `#/tab` The Tab · `#/office` Back Office · `#/about` Attribution. The Recipe flip, Barista flip and Register are states of The Bar, not routes.

### 9.1 The Bar (home / idle) — `#/`

Desktop (≥ 1024px):
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ▮ ▯ ▮ ▯ ▮ ▯ ▮ ▯ ▮ ▯  ⌈THE GLOBE BAR⌉ (brass plate)   [BAR]neon  (◔ dial)  [≡]  │ back-bar 16%
│ ═══════════════════════ brass rail ═════════════════════════════════════════ │
│ ┌────────── window ──────────┐                                               │
│ │  ~ neon: THE GLOBE BAR ~   │        Spin. Tap. Survive.   (brass plate)    │
│ │   (weather on the glass)   │                                               │
│ │        ╭───────╮           │        coaster lane (empty)                   │ window+globe 52%
│ │      ( │ GLOBE │ )  ← brass│        "He has opinions about your            │
│ │        ╰───────╯   cradle  │         humidity."  (Space Grotesk 500)       │
│ └─────────▬▬base▬▬───────────┘                                               │
│ ╱‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾ counter (rotateX 8°) ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾╲ │
│ │  [🔍 classified-ad search box]  [◎ Where am I]     ┌ REGISTER ┐ [THE TAB]  │ counter 32%
│ │                                                    │ LAST ORDERS IN LISBON│ │
│ ═══════════════════════ brass foot-rail ═════════════╧══════════╧═══════════ │
└──────────────────────────────────────────────────────────────────────────────┘
```
Phone (< 768px):
```
┌────────────────────────────┐
│▮▯▮▯▮▯▮▯  [BAR]  (◔)   [≡]  │ 56px strip, brass rail under
│┌──── window ─────────────┐ │
││   ~THE GLOBE BAR~ neon  │ │
││       ╭─────╮           │ │ 50vh
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
- **Components:** BackBar (bottles, plate, dial, neon toggle, menu), Window (sky + weather layers + neon sign), GlobeCradle (canvas + SVG rings + base), Counter (coaster lane, search, where-am-I, register, tab button).
- **States:** *empty* — coaster lane shows "Spin. Tap. Survive." on a small brass plate and a Space Grotesk line; window shows your own local weather if geolocation was granted, else a neutral dusk. *loading (first paint)* — the DOM bar renders first (LCP is the neon sign + plate); the globe canvas mounts lazily with a 245 KB `earth-day.jpg`, then swaps to Blue Marble 4K/8K; while WebGL boots, the cradle holds a flat SVG dotted globe (cobe-style). *offline* — search and where-am-I disabled with a tooltip; last verdict from Dexie still re-openable. *no WebGL* — the dotted SVG globe stays, still clickable (equirectangular hit-test), the bar is otherwise identical.
- **Gestures:** drag/flick globe; tap globe; pull the counter sheet up (mobile); tap the dial to open the receipt; long-press the register display to pause the ticker.

### 9.2 The Verdict (coaster) — `#/v/19.08,72.88`

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
Phone:
```
│▮▯[▮]▯▮▯▮▯  [BAR]  (◔)  [≡]│
│┌ window: sweating pane ──┐│
││    ~neon~   ╭────╮      ││ 50vh
││           ( │ 📍 │ )    ││
││             ╰────╯      ││
│└─────────────────────────┘│
│╱‾‾ counter sheet (drag) ‾╲│
││┌──── coaster ──────────┐││
│││ ~38 km from Mumbai    │││
│││ 02:14 · dew 24°       │││
│││ "The air is soup…"    │││
│││ AGGRESSIVELY ICED     │││  ← 44px+ targets below
│││ Mojito                │││
│││ ▢ glass · in a bucket │││
│││ FEELS 31.5° DEW 24.4° │││
│││ [Flip] [Tear off]     │││
││└───────────────────────┘││
│═══ foot-rail ═══════════  │
```
- **Components:** Coaster (skeleton → printed), IntensifierStamp, GlassIllustration (SVG, tinted by drink), ReceiptStrip, DialNeedle, BottleNod, WindowWeather, BaristaTag (conditional).
- **States:** *skeleton* (blank coaster, pressed ring, 3 shimmer-free grey bars — no shimmer, it is paper); *success*; *ocean* (marine data: SST, wave height; place line "You are in the Arabian Sea. There is no bar here." Dark 'n' Stormy family); *polar* (local-time joke hedged per RESEARCH §3); *error* (coaster prints "The models are not answering. Try again." with a brass RETRY plate; window stays); *rate-limited* (429: "Bar's busy. Give it a minute."). Copy hedges with "the models say" (Open-Meteo is model data).
- **Gestures:** tap coaster → flip; swipe coaster left (mobile) → next-best drink ("the second opinion"); pull receipt → tear; tap dial → receipt sheet.

### 9.3 The Recipe (coaster flipped)
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
│  2. Add rum, crushed ice.     │  ← in-house method text (3 lines max)
│  3. Top with soda. Overfill.  │
│  ▢ highball · crushed ice     │
│  [◎ make it virgin]  IBA·MIT  │
│  [Flip back]                  │
└───────────────────────────────┘
```
- **Components:** RecipeTable, GlasswareSVG (rocks/highball/coupe/mug/copper-mug/tiki, line-art, filled with the drink colour and correct ice type), MethodList, VirginToggle, CreditLine.
- **States:** *alcoholic*; *virgin twin* (swaps in place, a green BARISTA stamp appears); *no twin* ("No virgin twin for this one. Have a lime soda and think about it."). Data: `rasmusab/iba-cocktails` + `alfg/opendrinks` (MIT); method text written in-house (RESEARCH §8).
- **Gestures:** tap anywhere on the card outside controls → flip back; the flip is 420 ms (A7).

### 9.4 The Barista Flip (mocktail mode) — state of 9.1/9.2
`window: [BAR] → clack → [BARISTA] (green neon) · shelf: spirits dim to 60%, tea/cocoa/ginger/syrup light up · coaster re-prints: "Virgin Mojito. Same insult, no rum."`
- **States:** *off* (amber BAR); *on* (green BARISTA, `--success` neon); *suggested* (a brass tag on the coaster: "It's 9 a.m. there. I am legally a barista now." — tap to flip); persisted.
- 44×44 target; `role="switch" aria-checked`; label "Alcohol-free menu".

### 9.5 The Register (share receipt) — state of 9.2
```
┌ REGISTER ─────────────────────────┐
│ ▐ LAST ORDERS IN LISBON · 23:58 ▌ │ ← amber VFD mono ticker
│ ┌──── receipt (perforated) ─────┐ │
│ │ THE GLOBE BAR                 │ │
│ │ MUMBAI, IN · 19.08N 72.88E    │ │
│ │ 06 SEP 2026 · 02:14 LOCAL     │ │
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
- Prints (A6) when a verdict lands; tear → 1080×1350 PNG share card with the same content on a paper field, mahogany border, the neon wordmark in Righteous. On desktop the register sits on the counter; on mobile it is a sheet opened from the dial or the coaster's "Tear off".
- **States:** *printing*, *ready*, *torn* (a stub remains: "receipt torn 02:15"), *share failed* (falls back to download + "Saved to your device").

### 9.6 The Tab (history) — `#/tab`
Desktop: a drawer under the counter (right third); phone: full sheet.
```
┌ THE TAB (brass plate) ────────────────────────┐
│ #0007  Mumbai, IN     02:14  Mojito      31.5° │ ← row = hairline entry
│ #0006  Reykjavík, IS  23:40  Hot Toddy    2.1° │
│ #0005  Arabian Sea    —      Dark 'n' Stormy   │
│ ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ │
│ [Export JSON] [Import] [Clear tab]  "No tab yet. │
│                                      Go somewhere."│
└───────────────────────────────────────────────┘
```
- Row tap re-flies the globe and re-prints the coaster from the stored verdict (no refetch unless > 15 min old, then a small "re-poured" tag). Long-press/right-click → tear-off PNG. Stored in Dexie (`verdicts` table: id, lat, lng, place, localTime, drinkId, tags, stats, shift, createdAt). Rows are 56px, whole-row target.
- **States:** *empty* ("No tab yet. Go somewhere."), *list*, *importing*, *confirm clear* (inline brass CONFIRM plate, no modal).

### 9.7 The Back Office (settings) — `#/office`
Desktop: right drawer 380px in `--bg-elevated`; phone: bottom sheet 88vh.
```
┌ BACK OFFICE ──────────────────────────┐
│ Shift    ○ follow the place ○ night ○ day│
│ Units    °C | °F      km/h | mph | kn   │
│ Menu     [BAR/BARISTA] default         │
│ Sound    [lever]  vol ◔ (brass knob)   │
│ Haptics  [lever]   Motion ○ full ○ less│
│ Precise names [ ] Nominatim (off)      │
│   "Data © OpenStreetMap contributors"  │
│ AI garnish  ● 0 procedural  ○ 1 keyless│
│   ○ 2 BYO key [paste key] session-only │
│   "Free hosted tiers may train on your │
│    prompts."                           │
│ Attribution  Open-Meteo CC BY 4.0, CAMS,│
│   DWD, NASA Earth Observatory, Natural │
│   Earth, IBA & Open Drinks MIT, fonts  │
│   OFL, sounds CC0 · Offline shell ✓    │
└────────────────────────────────────────┘
```
- Levers are bar-tap levers (`role="switch"`), radios are brass toggles, the volume is a brass knob (`role="slider"`, also keyboard ± 5). The scene keeps breathing behind the sheet at 60% brightness (Night) / an oak scrim (Day).

### 9.8 Empty / error / offline / fallback states (cross-cutting)
- **First visit, no permission:** window shows neutral dusk; nothing asks for location until "Where am I" is tapped.
- **Offline:** neon flickers once and the register prints "NO SIGNAL · SERVING FROM THE TAB"; cached verdicts open; new clicks print the error coaster.
- **WebGL context lost:** the cradle keeps the SVG dotted globe; a brass tag on the counter: "The globe's bearings seized. Tap to re-seat." (re-mounts the canvas).
- **404 / bad deep link:** coaster: "Nowhere on Earth has those coordinates. Impressive." with a "Back to the bar" plate.

---

## 10. Component inventory

| Component | Variants | States |
|---|---|---|
| `NeonSign` | wordmark (5xl), BAR/BARISTA (4xl), small caption | off (Day), on, flicker-on, barista (green) |
| `BrassPlate` | caption, button, tag (on coaster) | default, hover (highlight shifts 6%), pressed (120ms inset), focus, disabled (`--ink-faint` engraving) |
| `GlobeCradle` | globe.gl canvas, SVG fallback | idle drift, dragging, flying, pinned, context-lost |
| `BrassPin` | — | dropped, hover (tooltip coords), dragging (re-pour on release) |
| `Bottle` | rum, gin, whisky, tequila, vodka, vermouth, bitters, syrup, tea tin, cocoa tin, ginger beer, mint | default, picked (lit, −7°), dimmed, tooltip |
| `WallDial` | full (desktop), roundel (mobile) | swinging, settled (+ annotation), unknown (needle at FAIR, window "—") |
| `Window` | sky day/night, weather layers (droplets, frost, rain, snow, fog, glare, lightning), neon slot | per grade tag; static under reduced motion |
| `Coaster` | round (desktop), square (mobile sheet), skeleton, back (recipe) | sliding, printed, flipped, error, ocean, polar, suggested-barista |
| `IntensifierStamp` | hot, iced, storm, barista | stamped (−4°), pressed shadow only |
| `GlasswareSVG` | rocks, highball, coupe, mug, copper mug, tiki, flute, pint, teacup | with ice cubes, crushed ice, steam, garnish |
| `ReceiptStrip` / `Receipt` | inline strip, register sheet, share card (1080×1350) | printing, ready, torn, stub |
| `RegisterDisplay` | ticker, status | ticking, paused (long-press), offline |
| `Lever` (switch) | bar-tap, small | on/off, focus, disabled |
| `BrassKnob` (slider) | volume | dragging, focus (keyboard) |
| `Search` (classified-ad box) | counter, sheet | empty, typing (Open-Meteo geocoding results as brass rows), no results ("Never heard of it.") |
| `TabRow` | — | default, hover, active (row re-fly), stale |
| `Sheet` / `Drawer` | counter sheet, register sheet, Back Office, Tab | peek, open, dragging, closed |
| `Tooltip` / `Toast` | brass tag (hover/focus, long-press) / brass tag on the counter edge | info, error; toasts 4 s, one at a time |

All primitives are shadcn/ui (Base UI) components restyled through tokens; none forked.

---

## 11. Iconography, illustration, imagery

- **Icons:** Lucide (ISC) at 1.75px stroke, 20px, colour `currentColor`, used only in the Back Office, search and sheet chrome. On the bar itself there are no icons — a bottle, a dial, a sign and a plate *are* the icons.
- **Illustration (own, MIT with the repo):** brand-free bottle silhouettes (12 SVG shapes, 2px `--brass-lo` stroke, filled with a flat dark tint), glassware line-art (9 SVG), ice cubes, steam wisps, the aneroid dial (bezel + engraved ring text on a `textPath`), the neon tube (SVG text), the register (bakelite + brass), the pin. Rough.js is *not* used — strokes are clean.
- **Globe textures:** NASA Blue Marble Next Generation monthly composites (public domain, credit "NASA Earth Observatory") at 8192×4096 desktop / 4096×2048 Android, WebP; NASA Black Marble 2016 night lights; three-globe `earth-topology.png` / `earth-water.png` bump/specular (MIT repo, NASA-derived); ≤ 10 MB total, lazy-loaded after first paint, PWA-precached. **Not** PlanetPixelEmporium (proprietary). Optional clouds: Solar System Scope 8K (CC BY 4.0, credit required) or in-shader FBM.
- **Reverse geocoding data:** Natural Earth (public domain) countries 110m/50m, populated places (stripped), marine polygons.
- **Drink data:** `rasmusab/iba-cocktails` (MIT), `alfg/opendrinks` (MIT) + own `bar-menu.json` with weather affinities; no hotlinked images (TheCocktailDB test key is not for published apps).
- **No stock photography anywhere.** The only raster in the app is the planet.

---

## 12. Sound & haptics

Every sound is a bar sound; there are no UI beeps. Off until the first pointer gesture (autoplay policy); master volume default 0.6 on the brass knob; a Back Office lever mutes all.

| Event | Sound | Source |
|---|---|---|
| Pin drop / coaster slide / sign flip | brass "tink" / paper-on-wood "shhk" / "clack" | Freesound CC0 filter, or Kenney.nl (CC0) |
| Ice drop ×3 / hot verdict | glass "clink" at playbackRate ±4% / kettle tick + short pour | Freesound CC0 |
| Bottle pick | bottle "clunk" + glass "ting" | Freesound CC0 |
| Receipt print / tear | thermal feed (every 3 lines) / "zzzt" | Freesound CC0 |
| Globe flick | bearing whirr loop, `playbackRate` 0.8–1.6 mapped to angular velocity | Freesound CC0 (or Web Audio filtered noise) |
| Neon | 50 Hz buzz at −30 dB, night only, LFO off under reduced motion | Web Audio (procedural, zero assets) |
| Rain / wind bed | pink noise → BiquadFilter lowpass, cutoff 200 Hz calm → 2.4 kHz gale; rain bursts follow precipitation | Web Audio (procedural) |
| Thunder | filtered noise burst + 60 Hz sine decay, "distance" via lowpass and 0.4–0.9 s delay | Web Audio (procedural) |
| Bar-room hum | −28 dB loop, night side only, ducks 6 dB on Day | **Freesound CC0 filter or Kenney.nl (CC0) only** — Pixabay is not permitted here (see the note below) |

**Every bundled sound file in this app is CC0**, sourced from Freesound's CC0 filter or Kenney.nl, and each one is listed with its source id in `public/sounds/ATTRIBUTION.md`, `src/data/attribution.json`, the About screen and the README — a three-way match that SEC-6 asserts. The **Pixabay Content Licence is not an option**, even "bundled only": DECISIONS D5.2 permits public domain / CC0 / CC BY / ODbL only, the `check:licenses` allow-list has no Pixabay entry, and a non-CC0 file would break that three-way attribution test. If a suitable CC0 bar-room hum cannot be found, synthesise it with the same Web Audio graph that already produces the neon buzz and the rain bed — filtered pink noise plus two detuned low sines is the zero-asset, zero-licence answer, and it is the preferred one.

Implementation: Howler.js 2.2 sprite for one-shots (raw Web Audio fallback), Web Audio graph for beds. Haptics (Capacitor build; web falls back to `navigator.vibrate(12)` on pin drop only): `impact Light` (globe pointer-down, coaster landing), `impact Medium` (pin drop, receipt tear), `impact Heavy` 40 ms (lightning), `selectionChanged` (30° detents while dragging, sign flip, levers), `notification Warning` (danger-tier insult). All haptics respect the Back Office lever and the system setting.

---

## 13. Accessibility rules

- **Contrast:** all running text ≥ 4.5:1 against its actual background per §4 tables; `--ink-faint` and `--danger`-on-wood are decorative or large-text (≥ 18px/600, 3:1) only. `--grade`, `--drink-glow` and neon never sit behind text. Playwright + axe run on every screen in both shifts.
- **Focus:** 2px `--focus` ring, 2px offset, on every interactive element including the globe canvas wrapper (`tabindex=0`, arrow keys rotate 5°, Enter pours at the centre crosshair, `+`/`−` zoom). Focus is never removed; `:focus-visible` only.
- **Touch targets:** ≥ 44×44 px — bottles (hit area padded), the pin, sign, dial, levers, tab rows (56px), coaster buttons. The coaster's tap-to-flip is a whole-card target with explicit "Flip for recipe" button as well.
- **Motion:** `prefers-reduced-motion` per §7 plus the Back Office switch; no auto-motion except the 0.18°/frame drift, which is off under reduced motion; no flashing above 3 Hz (the lightning is one 80 ms frame, never repeated within 1 s).
- **Screen reader:** the globe is `role="application"` with `aria-label="World globe. Arrow keys rotate, Enter chooses the centre."`; the coaster is `role="article"` with `aria-live="polite"` announcing "Verdict for ~38 km from Mumbai: aggressively iced Mojito"; the dial has `aria-valuetext="Feels like 31.5 degrees, tag: soup"`; bottles are buttons named "Rum — the bartender's pick"; neon signs are `role="switch"` with visible text; the receipt is a `<table>` with headers; decorative SVGs are `aria-hidden`.
- **Language & copy:** insults never target protected characteristics; the bartender judges *weather and choices*, not people. A "gentler bartender" lever tones down the danger tier.
- **Colour independence:** hot/iced/storm are also carried by the stamp text, the glassware and the receipt, never by colour alone.
- **Text scaling:** rem-based; the coaster reflows to a single column at 200% zoom; the bar bands become a scroll on short viewports (< 600px tall).

---

## 14. Android-specific notes (Capacitor 8, optional build)

- **Edge-to-edge:** `@capacitor/status-bar` with `overlaysWebView: true`; the back-bar strip pads by `env(safe-area-inset-top)` and the foot-rail by `env(safe-area-inset-bottom)`; the status bar is `Style.Dark` (light icons) on the Night shift and `Style.Light` on the Day shift, background transparent so the mahogany/oak runs under it.
- **Gesture navigation:** predictive back closes sheets (Back Office, Tab, Register) before leaving the route; the counter sheet's drag handle is offset 16px from the bottom system gesture zone; horizontal globe drags call `preventDefault` on `touchmove` inside the cradle so the back gesture is not triggered from the globe's left edge (an 24px dead margin is kept on both edges of the canvas).
- **Splash / icon:** splash background `#1A0F0A` with the brass pin as the only mark (no text); adaptive icon: foreground = brass pin on a coaster ring, background `#1A0F0A`; monochrome layer = pin silhouette. Themed icon colours: `#C9962B` on `#1A0F0A`. Icon and splash are exported from one SVG (`design/icon.svg`) at 432×432 adaptive and 1024 maskable for the PWA manifest (`theme_color #1A0F0A`, `background_color #1A0F0A`).
- **Performance:** DPR capped at 1.5 on Android (1.75 desktop); 4K textures; window weather layers are CSS/SVG (no shader pass); the globe pauses on `visibilitychange`; `webglcontextlost` handled (§9.8); WebLLM rung disabled (no WebGPU in WebView).
- **Plugins:** `@capacitor/haptics`, `/share`, `/preferences`, `/status-bar`, `/splash-screen`, `/geolocation` (for "Where am I" only); `VIBRATE` permission in the manifest.
- **PWA→TWA** is acceptable for this app (D3) if haptics are dropped; Capacitor remains the default.

---

## 15. CSS design tokens (ready to paste — `src/styles/tokens.css`)

> **This block is byte-identical to IMPLEMENTATION-PROMPT §3.3 and is the one that must be pasted into `src/styles/tokens.css` (PLAN P0-4).** The earlier version of §15 was a strict subset of it — it was missing `--grain`, `--neon-off` in the Day block, the `:root[data-motion="less"]` rule and half the `@property` registrations, so a file copied from it failed A11Y-6 and stepped rather than crossfaded on the shift change. Do not re-trim it.

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

Tailwind bridge (`src/index.css`): `@theme inline { --color-bg: var(--bg); --color-ink: var(--ink); --color-accent: var(--accent); --font-display: var(--font-display); --font-sans: var(--font-body); --font-mono: var(--font-mono); --radius-lg: var(--radius-lg); }` — utilities follow the shift and the paper scope at runtime.

---

## 16. Asset checklist

**Fonts (self-hosted, Latin subset, OFL)**
- [ ] `@fontsource/righteous` (400) · `@fontsource-variable/space-grotesk` (wght 300–700) · `@fontsource-variable/jetbrains-mono` (400/600 used); `design/preview.html` may use the Google Fonts `<link>`

**Illustration (own SVG, in repo)**
- [ ] 12 bottle silhouettes (rum, gin, whisky, tequila, vodka, vermouth, bitters, syrup, tea tin, cocoa tin, ginger beer, mint sprig)
- [ ] 9 glassware line-art (rocks, highball, coupe, mug, copper mug, tiki, flute, pint, teacup) + ice cube, crushed ice, steam wisp, garnish set
- [ ] Aneroid dial: bezel, engraved ring (ARCTIC … SCORCHING), needle, mono window
- [ ] Neon tube wordmark + BAR/BARISTA sign (SVG text on Righteous, outlined at build for the share card)
- [ ] Brass cradle (back ring, front ring with degree ticks, turned-wood base), brass pin, foot-rail, register (bakelite + brass keys + VFD slot); coaster pressed-ring mask; receipt perforation and torn-edge filters (`feTurbulence` + `feDisplacementMap`); dotted fallback globe (Natural Earth 110m land dots, generated at build)
- [ ] `design/icon.svg` → adaptive icon layers (432×432), maskable 1024, favicon 32/180, splash 2732

**Imagery / data (with licence lines in `src/data/attribution.json` and README)**
- [ ] NASA Blue Marble NG monthly (public domain, credit "NASA Earth Observatory") — 8192×4096 WebP + 4096×2048 WebP, current month + fallback
- [ ] NASA Black Marble 2016 night (public domain) — 8192×4096 / 4096×2048 WebP
- [ ] three-globe `earth-day.jpg` (245 KB first paint), `earth-topology.png`, `earth-water.png` (MIT repo, NASA-derived)
- [ ] Natural Earth: `ne_110m_admin_0_countries`, `ne_50m_admin_0_countries` (lazy), stripped `ne_10m_populated_places_simple` (~400 KB), `ne_50m_geography_marine_polys`, `ne_110m_land` (public domain)
- [ ] `rasmusab/iba-cocktails` (MIT), `alfg/opendrinks` (MIT) → `src/data/drinks.json`; own `bar-menu.json` with affinities and in-house method text
- [ ] Tracery `voice.json` (≥ 8 variants per slot per tag) + `intensifiers.json` + city one-liners for the register ticker

**Sound (CC0 unless noted; list in attribution.json)**
- [ ] tink, shhk, clink ×3, clunk, ting, kettle tick, pour, thermal feed, zzzt, clack, bearing whirr loop (Freesound CC0 / Kenney); bar-room hum loop (Freesound CC0 or Kenney — **never Pixabay**, or synthesised in Web Audio); procedural neon buzz, rain/wind bed, thunder (code, zero assets)

**Verification before release (D9.3)**
- [ ] `design/preview.html` shows: The Bar (Night), The Verdict (Mumbai, Night), The Verdict (Reykjavík, Day), Recipe flip, Barista on, Register receipt, The Tab, Back Office — phone and desktop
- [ ] …plus the three non-verdict coasters the app must also ship, reachable from the preview's **Other states** strip: the 429 "Bar's busy. Give it a minute." coaster with its live 60 s RETRY countdown, the "The models are not answering." network coaster, and a normal coaster carrying the stale **re-poured from memory** brass tag (IMPL §10.7, TESTING §7)
- [ ] Playwright screenshots of every state above; axe contrast pass in both shifts and inside `.paper`; Lighthouse LCP is a DOM element (neon + plate), not the canvas
- [ ] Every screenshot passes the §1 test: a bottle, a coaster ring, a brass pin or the neon sign is visible
