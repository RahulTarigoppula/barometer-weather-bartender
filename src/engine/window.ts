import type { Tag, Verdict } from './types';

export const LAYERS = ['drops', 'rain', 'rain2', 'rain3', 'snow', 'fog', 'glare', 'frost'] as const;
export type Layer = (typeof LAYERS)[number];

export interface WindowWeather {
  on: Set<Layer>;
  /** One lightning frame (A11) after the pour, never twice within a second. */
  lightning: boolean;
  /** 0..1 for the rain bed. */
  rain: number;
}

/** What happens on the window glass for a verdict, the weather never touches the coaster. */
export function windowWeather(v: Pick<Verdict, 'tags' | 'features' | 'gradeFamily'>): WindowWeather {
  const has = (t: Tag): boolean => v.tags.some((s) => s.tag === t);
  const f = v.features;
  const on = new Set<Layer>();
  if (f.dewPointC >= 21) on.add('drops');
  let rain = 0;
  if (has('drizzle')) {
    on.add('rain2');
    rain = 0.25;
  }
  if (has('rain') || has('storm') || has('hail')) {
    on.add('rain').add('rain2');
    rain = 0.6;
  }
  if (has('downpour')) {
    on.add('rain').add('rain2').add('rain3');
    rain = 1;
  }
  if (has('snow') || has('blizzard')) on.add('snow');
  if (has('fog') || has('smog') || has('dust')) on.add('fog');
  if (f.isDay && (v.gradeFamily === 'heat' || (f.wmo <= 1 && rain === 0))) on.add('glare');
  if (f.apparentC <= -10) on.add('frost');
  return { on, lightning: has('storm') || has('hail'), rain };
}
