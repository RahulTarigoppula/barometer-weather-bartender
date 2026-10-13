import type { DayPoint, Drink, Features, HourPoint, Tag, TagScore } from './types';

// ───────────── today's tips ─────────────
export type TipId =
  | 'heat'
  | 'hydrate'
  | 'umbrella'
  | 'sunscreen'
  | 'mask'
  | 'sensitive'
  | 'layers'
  | 'bundle'
  | 'wind'
  | 'fog';
export interface Tip {
  id: TipId;
  label: string;
  detail: string;
  tone: 'info' | 'warn' | 'alert';
}

/** Practical, India-relevant advice from the numbers — the most urgent first, at most four. */
export function tipsFor(f: Features, hours: HourPoint[] = []): Tip[] {
  const out: Tip[] = [];
  const next6 = hours.slice(0, 6);
  const rainSoon = Math.max(f.precipProb, ...next6.map((h) => h.precipProb));
  const aqi = f.usAqi;
  if (f.apparentC >= 41)
    out.push({ id: 'heat', label: 'Heat warning', detail: 'Stay out of the 12–4 pm sun', tone: 'alert' });
  else if (f.apparentC >= 35)
    out.push({ id: 'hydrate', label: 'Hydrate', detail: 'Water every hour; skip the midday walk', tone: 'warn' });
  if (aqi !== null && aqi >= 151)
    out.push({
      id: 'mask',
      label: 'Mask outdoors',
      detail: `Air is unhealthy (US AQI ${Math.round(aqi)}). Wear an N95 outside`,
      tone: 'alert',
    });
  else if (aqi !== null && aqi >= 101)
    out.push({
      id: 'sensitive',
      label: 'Easy on the lungs',
      detail: 'Sensitive groups: keep outdoor effort short',
      tone: 'warn',
    });
  if (rainSoon >= 50 || f.precipMm > 0.2)
    out.push({
      id: 'umbrella',
      label: 'Umbrella',
      detail: `${Math.round(rainSoon)}% chance of rain in the next hours`,
      tone: 'info',
    });
  if (f.isDay && f.uv >= 6)
    out.push({
      id: 'sunscreen',
      label: 'Sunscreen',
      detail: `UV ${Math.round(f.uv)}: SPF 30+, reapply`,
      tone: 'warn',
    });
  if (f.apparentC <= 0)
    out.push({ id: 'bundle', label: 'Bundle up', detail: 'Hat, gloves, warm layers', tone: 'warn' });
  else if (f.apparentC <= 12)
    out.push({ id: 'layers', label: 'Layers', detail: 'A jacket or a warm shawl', tone: 'info' });
  if (f.gustKmh >= 50)
    out.push({
      id: 'wind',
      label: 'Gusty',
      detail: `Gusts to ${Math.round(f.gustKmh)} km/h. Secure loose things`,
      tone: 'warn',
    });
  if (f.wmo === 45 || f.wmo === 48)
    out.push({ id: 'fog', label: 'Fog', detail: 'Drive slow, low beams on', tone: 'warn' });
  const rank = { alert: 0, warn: 1, info: 2 } as const;
  return out.sort((a, b) => rank[a.tone] - rank[b.tone]).slice(0, 4);
}

// ───────────── what to eat with it ─────────────
export interface Snack {
  name: string;
  note: string;
}

const has = (tags: TagScore[], ...t: Tag[]): boolean => tags.some((s) => t.includes(s.tag));

/** An Indian snack for the weather and the glass. Rain means pakoras; that is not negotiable. */
export function snackFor(tags: TagScore[], drink: Drink): Snack {
  if (drink.base === 'tea' && (drink.serve === 'hot' || drink.serve === 'warm'))
    return { name: 'Parle-G or Marie biscuits', note: 'For dunking. You know the rules.' };
  if (has(tags, 'drizzle', 'rain', 'downpour', 'storm', 'hail'))
    return { name: 'Onion pakoras with green chutney', note: 'Rain in India means pakoras. It is the law.' };
  if (has(tags, 'arctic', 'freezing', 'cold', 'snow', 'blizzard', 'polar'))
    return { name: 'Samosa, straight from the kadhai', note: 'Hot enough to hold, too hot to bite. Bite anyway.' };
  if (has(tags, 'late')) return { name: 'Midnight Maggi', note: 'Two minutes. It is never two minutes.' };
  if (has(tags, 'scorching', 'hot', 'uv-extreme'))
    return { name: 'Aloo chaat or a kulfi', note: 'Cold, sour, spicy. The heat respects it.' };
  if (has(tags, 'oppressive', 'muggy')) return { name: 'Bhel puri', note: 'Light, tangy, no regrets in the humidity.' };
  if (has(tags, 'dawn', 'morning', 'brunch'))
    return { name: 'Poha with sev and lime', note: 'Breakfast that forgives the hour.' };
  if (has(tags, 'golden', 'evening'))
    return { name: 'Masala peanuts and banana chips', note: 'Sundowner rules: salty and crunchy.' };
  if (has(tags, 'chilly', 'fog')) return { name: 'Bread pakora', note: 'Fried bread for grey weather. Science.' };
  return { name: 'Roasted makhana', note: 'The healthy one. Someone has to be.' };
}

// ───────────── the sun ─────────────
export interface SunArc {
  /** 0 at sunrise, 1 at sunset; null when the sun is down or the day has no sunrise (polar). */
  progress: number | null;
  daylightMin: number | null;
}

export function sunArc(f: Pick<Features, 'minutesToSunrise' | 'minutesToSunset'>): SunArc {
  const { minutesToSunrise: rise, minutesToSunset: set } = f;
  if (!Number.isFinite(rise) || !Number.isFinite(set)) return { progress: null, daylightMin: null };
  const daylight = set - rise;
  if (daylight <= 0) return { progress: null, daylightMin: null };
  const p = -rise / daylight;
  return { progress: p >= 0 && p <= 1 ? p : null, daylightMin: daylight };
}

// ───────────── forecast shaping ─────────────
const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "2026-09-06" → "Sun". */
export function dayName(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return '';
  return WEEKDAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] ?? '';
}

/** "2026-09-06T14:00" → "14:00"; the first hour reads "Now". */
export const hourLabel = (time: string, i: number): string => (i === 0 ? 'Now' : time.slice(11, 16));

/** The coolest and warmest of the week, for the range bars. */
export function weekRange(days: DayPoint[]): { lo: number; hi: number } {
  const lo = Math.min(...days.map((d) => d.tMinC));
  const hi = Math.max(...days.map((d) => d.tMaxC));
  return hi > lo ? { lo, hi } : { lo: lo - 1, hi: hi + 1 };
}

/** SVG path for the 24-hour temperature line, x across `width`, y inside `height` with padding. */
export function tempPath(
  hours: HourPoint[],
  width: number,
  height: number,
  pad = 8,
): { line: string; area: string; points: [number, number][] } {
  if (hours.length < 2) return { line: '', area: '', points: [] };
  const temps = hours.map((h) => h.tempC);
  const lo = Math.min(...temps);
  const hi = Math.max(...temps);
  const span = hi - lo || 1;
  const step = width / (hours.length - 1);
  const points = hours.map((h, i): [number, number] => [
    Math.round(i * step * 10) / 10,
    Math.round((pad + (1 - (h.tempC - lo) / span) * (height - pad * 2)) * 10) / 10,
  ]);
  const line = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
  const area = `${line} L${width} ${height} L0 ${height} Z`;
  return { line, area, points };
}

// ───────────── the mahaul: the day in a few honest sentences ─────────────
const TIP_PHRASE: Record<TipId, string> = {
  heat: 'Stay out of the midday sun.',
  hydrate: 'Keep water close.',
  mask: 'Mask up outside; the air is unhealthy.',
  sensitive: 'Go easy outdoors if your lungs are sensitive.',
  umbrella: 'Carry an umbrella.',
  sunscreen: 'Wear sunscreen if you head out.',
  bundle: 'Bundle up properly.',
  layers: 'Take a layer.',
  wind: 'It is gusty; hold on to your dupatta.',
  fog: 'Drive slow in the fog.',
};

export interface BriefInput {
  place: string;
  condition: string;
  temp: string;
  feels: string;
  isDay: boolean;
  localHour: number;
  tips: Tip[];
  /** e.g. "Heavy", with an optional hour it eases ("21:00"); null away from roads. */
  roads: { level: string; eases: string | null } | null;
  drink: string;
}

/** "Clear sky over New Delhi tonight, 27° that feels like 31°. Mask up outside; the air is unhealthy. ..." */
export function mahaulBrief(b: BriefInput): string {
  const when = !b.isDay
    ? 'tonight'
    : b.localHour < 12
      ? 'this morning'
      : b.localHour < 17
        ? 'this afternoon'
        : 'this evening';
  const feels = b.feels === b.temp ? '' : ` that feels like ${b.feels}`;
  const sky = b.condition.charAt(0).toUpperCase() + b.condition.slice(1).toLowerCase();
  const out = [`${sky} over ${b.place} ${when}, ${b.temp}${feels}.`];
  const first = b.tips[0];
  out.push(first ? TIP_PHRASE[first.id] : 'Nothing out there to worry about.');
  if (b.roads) {
    const lvl = b.roads.level.toLowerCase();
    out.push(b.roads.eases ? `Roads are ${lvl} for now, easing by ${b.roads.eases}.` : `Roads look ${lvl}.`);
  }
  out.push(`${when === 'tonight' || when === 'this evening' ? 'Tonight’s' : 'Today’s'} pour: ${b.drink}.`);
  return out.join(' ');
}
