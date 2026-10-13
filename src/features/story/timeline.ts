/**
 * The opening story, told the way its author loves stories: a movie's wide shot, a series' cold
 * open, anime's sky, a manhwa's scroll, a book's setting, an audiobook's voice. One continuous
 * descent from the known universe to the Western Ghats in the monsoon, then the name.
 */

export type SceneId = 'universe' | 'galaxy' | 'solar' | 'earth' | 'descent' | 'ghats' | 'monsoon' | 'title' | 'app';

export interface Scene {
  id: SceneId;
  start: number;
  end: number;
  /** A book's chapter heading for the beat. */
  chapter: string;
  line: string;
  sub: string;
}

const LENGTHS: [SceneId, number, string, string, string][] = [
  [
    'universe',
    5.5,
    'Prologue · The wide shot',
    'Every great story opens with a wide shot.',
    'Hi, I’m Rahul. I live for stories: movies, series, manhwa, anime, and the all-mighty books and audiobooks.',
  ],
  [
    'galaxy',
    4,
    'Chapter 1 · The hero',
    'Then the camera finds its hero.',
    'One spiral among hundreds of billions. Ours.',
  ],
  [
    'solar',
    4,
    'Chapter 2 · The cold open',
    'Every good series has a cold open.',
    'A small yellow star. Eight worlds. Seven of them silent.',
  ],
  [
    'earth',
    4,
    'Chapter 3 · The sky',
    'Anime taught me the sky is a character.',
    'And only one planet here has weather worth a scene.',
  ],
  ['descent', 3.5, 'Chapter 4 · Scroll down', 'Panel by panel, like a manhwa…', '…down through the clouds, to India.'],
  [
    'ghats',
    5,
    'Chapter 5 · The setting',
    'The best books begin with a setting.',
    'The Western Ghats at dawn. Teak, sandalwood, and Neelakurinji, blue once in twelve years.',
  ],
  [
    'monsoon',
    4.5,
    'Chapter 6 · The voice',
    '“Chhata le ja, baarish hogi.”',
    'My first favourite audiobook was a voice at the door. It was almost always right.',
  ],
  ['title', 5, 'Title card', 'Mausam ka Mahaul', 'Mausam is the setting. Mahaul is the mood. Every story needs both.'],
  [
    'app',
    4.5,
    'Epilogue · Your day',
    'So I built the setting for your story.',
    'Made with love by Rahul, a lifelong lover of stories.',
  ],
];

export const SCENES: Scene[] = LENGTHS.reduce<Scene[]>((acc, [id, len, chapter, line, sub]) => {
  const start = acc.at(-1)?.end ?? 0;
  acc.push({ id, start, end: start + len, chapter, line, sub });
  return acc;
}, []);

export const TOTAL = SCENES.at(-1)?.end ?? 0;

/** The scene at time t (seconds) and how far through it we are (0..1). */
export function sceneAt(t: number): { scene: Scene; p: number; index: number } {
  const clamped = Math.max(0, Math.min(TOTAL - 1e-6, t));
  const index = Math.max(
    0,
    SCENES.findIndex((s) => clamped >= s.start && clamped < s.end),
  );
  const scene = SCENES[index] as Scene;
  return { scene, p: (clamped - scene.start) / (scene.end - scene.start), index };
}

export const ease = (x: number): number => {
  const c = Math.max(0, Math.min(1, x));
  return c < 0.5 ? 4 * c * c * c : 1 - (-2 * c + 2) ** 3 / 2;
};

/** 0 → 1 over [a, b]. */
export const ramp = (t: number, a: number, b: number): number => Math.max(0, Math.min(1, (t - a) / (b - a)));
