import type { Features, Tag, TagScore } from './types';

/** Today's weather, cast as a story genre: a name and one line, the way a trailer would sell it. */
export interface Genre {
  id: string;
  name: string;
  line: string;
}

const has = (tags: TagScore[], ...t: Tag[]): boolean => tags.some((s) => t.includes(s.tag));

export function genreOf(
  f: Pick<Features, 'apparentC' | 'usAqi' | 'isDay' | 'dayPart'>,
  tags: TagScore[],
  india: boolean,
): Genre {
  if (has(tags, 'storm', 'hail'))
    return { id: 'disaster', name: 'Disaster movie', line: 'Thunder on cue. Stay indoors for the third act.' };
  if (has(tags, 'downpour', 'rain'))
    return india
      ? { id: 'monsoon', name: 'Monsoon romance', line: 'Rain on the window, chai in hand. The films were right.' }
      : { id: 'rainy', name: 'Rainy-day drama', line: 'Grey skies, wet streets, a soundtrack of rain.' };
  if (has(tags, 'blizzard', 'snow'))
    return { id: 'fantasy', name: 'Winter fantasy', line: 'Snow like the opening of a Ghibli film.' };
  if ((f.usAqi ?? 0) > 150)
    return { id: 'dystopia', name: 'Dystopian sci-fi', line: 'The air is the villain today. Mask up, hero.' };
  if (has(tags, 'fog'))
    return { id: 'noir', name: 'Noir', line: 'Streetlights in the mist. Trust no one, drive slow.' };
  if (has(tags, 'drizzle'))
    return { id: 'indie', name: 'Slow-burn indie', line: 'Soft rain, quiet streets, long lingering shots.' };
  if (f.apparentC >= 40)
    return {
      id: 'thriller',
      name: 'Desert thriller',
      line: 'The sun is the antagonist. Find shade, keep water close.',
    };
  if (f.apparentC >= 33 && has(tags, 'muggy', 'oppressive'))
    return {
      id: 'slowcook',
      name: 'Slow-cooked drama',
      line: 'Thick air, slow pace, everyone sweating through the plot.',
    };
  if (f.apparentC <= 0)
    return { id: 'survival', name: 'Survival epic', line: 'Layers are your armour. Make every scene count.' };
  if (f.apparentC <= 12)
    return { id: 'cosy', name: 'Cosy mystery', line: 'Blanket weather. A good book and a hot cup.' };
  if (f.dayPart === 'golden')
    return { id: 'golden', name: 'Golden-hour romance', line: 'The light is doing all the acting.' };
  if (!f.isDay) return { id: 'stars', name: 'Stargazing anime', line: 'A clear night, big stars, a quiet ending.' };
  return { id: 'slice', name: 'Slice of life', line: 'An easy, pleasant episode. Go outside.' };
}
