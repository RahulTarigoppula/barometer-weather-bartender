import type { Features, Tag, TagScore } from './types';

/** Today's weather, cast as a story genre: a name and one line, the way a trailer would sell it. */
export interface Genre {
  id: string;
  name: string;
  line: string;
  /** A story to pair with the day: a film, series, anime or book where this weather is half the feeling. */
  pair: string;
}

const PAIR: Record<string, string> = {
  disaster: 'Twister, or The Perfect Storm',
  monsoon: 'Monsoon Wedding, or The God of Small Things',
  rainy: 'Weathering With You, or Singin’ in the Rain',
  fantasy: 'The Lion, the Witch and the Wardrobe',
  dystopia: 'Nausicaä of the Valley of the Wind, or Blade Runner 2049',
  noir: 'Sherlock, or The Hound of the Baskervilles',
  indie: '5 Centimeters per Second, or The Garden of Words',
  thriller: 'Mad Max: Fury Road, or Dune',
  slowcook: 'Body Heat, or The Great Gatsby',
  survival: 'The Revenant, or Into Thin Air',
  cosy: 'Laid-Back Camp, or The Hobbit',
  golden: 'Before Sunset, or Your Name',
  stars: 'Interstellar, or The Little Prince',
  slice: 'Malgudi Days, or Barakamon',
};

const has = (tags: TagScore[], ...t: Tag[]): boolean => tags.some((s) => t.includes(s.tag));

export function genreOf(
  f: Pick<Features, 'apparentC' | 'usAqi' | 'isDay' | 'dayPart'>,
  tags: TagScore[],
  india: boolean,
): Genre {
  if (has(tags, 'storm', 'hail'))
    return {
      id: 'disaster',
      name: 'Disaster movie',
      line: 'Thunder on cue. Stay indoors for the third act.',
      pair: PAIR.disaster as string,
    };
  if (has(tags, 'downpour', 'rain'))
    return india
      ? {
          id: 'monsoon',
          name: 'Monsoon romance',
          line: 'Rain on the window, chai in hand. The films were right.',
          pair: PAIR.monsoon as string,
        }
      : {
          id: 'rainy',
          name: 'Rainy-day drama',
          line: 'Grey skies, wet streets, a soundtrack of rain.',
          pair: PAIR.rainy as string,
        };
  if (has(tags, 'blizzard', 'snow'))
    return {
      id: 'fantasy',
      name: 'Winter fantasy',
      line: 'Snow like the opening of a Ghibli film.',
      pair: PAIR.fantasy as string,
    };
  if ((f.usAqi ?? 0) > 150)
    return {
      id: 'dystopia',
      name: 'Dystopian sci-fi',
      line: 'The air is the villain today. Mask up, hero.',
      pair: PAIR.dystopia as string,
    };
  if (has(tags, 'fog'))
    return {
      id: 'noir',
      name: 'Noir',
      line: 'Streetlights in the mist. Trust no one, drive slow.',
      pair: PAIR.noir as string,
    };
  if (has(tags, 'drizzle'))
    return {
      id: 'indie',
      name: 'Slow-burn indie',
      line: 'Soft rain, quiet streets, long lingering shots.',
      pair: PAIR.indie as string,
    };
  if (f.apparentC >= 40)
    return {
      id: 'thriller',
      name: 'Desert thriller',
      line: 'The sun is the antagonist. Find shade, keep water close.',
      pair: PAIR.thriller as string,
    };
  if (f.apparentC >= 33 && has(tags, 'muggy', 'oppressive'))
    return {
      id: 'slowcook',
      name: 'Slow-cooked drama',
      line: 'Thick air, slow pace, everyone sweating through the plot.',
      pair: PAIR.slowcook as string,
    };
  if (f.apparentC <= 0)
    return {
      id: 'survival',
      name: 'Survival epic',
      line: 'Layers are your armour. Make every scene count.',
      pair: PAIR.survival as string,
    };
  if (f.apparentC <= 12)
    return {
      id: 'cosy',
      name: 'Cosy mystery',
      line: 'Blanket weather. A good book and a hot cup.',
      pair: PAIR.cosy as string,
    };
  if (f.dayPart === 'golden')
    return {
      id: 'golden',
      name: 'Golden-hour romance',
      line: 'The light is doing all the acting.',
      pair: PAIR.golden as string,
    };
  if (!f.isDay)
    return {
      id: 'stars',
      name: 'Stargazing anime',
      line: 'A clear night, big stars, a quiet ending.',
      pair: PAIR.stars as string,
    };
  return {
    id: 'slice',
    name: 'Slice of life',
    line: 'An easy, pleasant episode. Go outside.',
    pair: PAIR.slice as string,
  };
}
