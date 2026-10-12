import { speak } from '../wit/speak';
import { cellKey } from './cache';
import { beaufort, dewPoint, heatIndex, humidex, windChill } from './comfort';
import { dayPartFor, localClock } from './daypart';
import { stampFor } from './intensify';
import { menuFor, twinOf } from './menu';
import { pick, scoreDrinks, seedFor } from './score';
import { dial, drivingTag, extractTags, gradeFamily, thermalTag } from './tags';
import type { Drink, Features, Grammar, Menu, PlaceHit, Verdict, WeatherSnapshot } from './types';

export interface JudgeInput {
  now: Date;
  lat: number;
  lng: number;
  snapshot: WeatherSnapshot;
  place: PlaceHit;
  menu: Menu;
  drinks: Drink[];
  grammar: Grammar;
  settings: { gentler: boolean };
  lastDrinkId?: string | undefined;
}

const r4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** Snapshot + place + clock → the features every other step reads. No I/O. */
export function buildFeatures(input: Pick<JudgeInput, 'now' | 'lat' | 'lng' | 'snapshot' | 'place'>): Features {
  const { snapshot: s, place } = input;
  const c = s.current;
  const dew = c.dewPointC ?? dewPoint(c.tempC, c.rh) ?? c.tempC;
  const hi = heatIndex(c.tempC, c.rh);
  const wc = windChill(c.tempC, c.windKmh);
  const apparent = c.apparentC ?? wc ?? (hi.applies ? hi.hiC : c.tempC);
  const clock = localClock(input.now, s.timezone);
  const dp = dayPartFor({
    now: input.now,
    lat: input.lat,
    lng: input.lng,
    clock,
    sunrise: s.daily.sunrise,
    sunset: s.daily.sunset,
  });
  const f: Features = {
    apparentC: apparent,
    tempC: c.tempC,
    heatIndexC: hi.applies ? hi.hiC : null,
    humidexC: humidex(c.tempC, dew).value,
    windChillC: wc,
    dewPointC: dew,
    rh: c.rh,
    beaufort: beaufort(c.windKmh),
    uv: s.air?.uv ?? s.hourNow.uv,
    euAqi: s.air?.euAqi ?? null,
    usAqi: s.air?.usAqi ?? null,
    dust: s.air?.dust ?? null,
    wmo: c.wmo,
    precipMm: c.precipMm,
    precipProb: s.hourNow.precipProb,
    snowCm: c.snowCm,
    windKmh: c.windKmh,
    gustKmh: c.gustKmh,
    isDay: c.isDay,
    localHour: clock.hour,
    localMinute: clock.minute,
    localWeekday: clock.weekday,
    localDate: clock.date,
    minutesToSunrise: dp.minutesToSunrise,
    minutesToSunset: dp.minutesToSunset,
    polarApproximateTime: dp.polarApproximateTime,
    dayPart: dp.dayPart,
    place,
  };
  if (s.marine && s.marine.waveHeightM !== null && s.marine.sstC !== null) {
    f.marine = { waveHeightM: s.marine.waveHeightM, sstC: s.marine.sstC };
  }
  return f;
}

/** The whole verdict: features → tags → score → pick → stamp → voice. Pure, deterministic, ≤ 5 ms. */
export function judge(input: JudgeInput): Verdict {
  const features = buildFeatures(input);
  const tags = extractTags(features);
  const driving = drivingTag(tags);
  const thermal = thermalTag(tags);
  const d = dial(thermal, features.apparentC);
  const ranked = scoreDrinks(tags, menuFor(input.drinks, input.menu), { lastDrinkId: input.lastDrinkId });
  const seed = seedFor(input.lat, input.lng, features.localHour, input.menu);
  const chosen = pick(ranked, seed, tags);
  const stamp = stampFor(tags, chosen.pick, input.menu, input.settings.gentler);
  const localTime = `${String(features.localHour).padStart(2, '0')}:${String(features.localMinute).padStart(2, '0')}`;
  const partial = {
    createdAt: input.now.getTime(),
    lat: r4(input.lat),
    lng: r4(input.lng),
    cell: cellKey(input.lat, input.lng),
    place: input.place,
    timezone: input.snapshot.timezone,
    localTime,
    shift: features.isDay ? ('day' as const) : ('night' as const),
    menu: input.menu,
    features,
    tags,
    drivingTag: driving,
    thermalTag: thermal,
    dial: d.label,
    dialAngle: d.angle,
    gradeFamily: gradeFamily(driving),
    drinkId: chosen.pick.id,
    runnersUp: chosen.runnersUp.map((x) => x.id),
    stamp,
    suggestBarista: features.localHour < 11 && input.menu === 'bar' && features.dayPart !== 'late',
    seed,
    sources: { air: input.snapshot.air !== undefined, marine: features.marine !== undefined },
  };
  const lines = speak(partial, input.grammar, chosen.pick);
  return { ...partial, lines };
}

export interface Served {
  drink: Drink;
  stamp: Verdict['stamp'];
  second: boolean;
}

/**
 * What is actually on the coaster for a verdict under the current menu and "second opinion" index —
 * the barista flip swaps in the twin WITHOUT re-scoring; the second opinion walks the runners-up.
 */
export function served(v: Verdict, drinks: Drink[], menu: Menu, opinion: number, gentler: boolean): Served {
  const byId = (id: string): Drink | undefined => drinks.find((x) => x.id === id);
  const ids = [v.drinkId, ...v.runnersUp];
  const idx = ids.length > 0 ? opinion % ids.length : 0;
  const base = byId(ids[idx] ?? v.drinkId) ?? byId(v.drinkId);
  if (!base) throw new Error(`served(): unknown drink ${v.drinkId}`);
  const drink = twinOf(drinks, base, menu) ?? base;
  return { drink, stamp: stampFor(v.tags, drink, menu, gentler), second: idx > 0 };
}
