/**
 * The opening story, one continuous descent: the known universe, our galaxy, our star, the one
 * planet that breathes, down through the clouds to India, the Western Ghats in bloom, the monsoon,
 * the name. Short lines, one idea per beat.
 */

export type SceneId = 'universe' | 'galaxy' | 'solar' | 'earth' | 'descent' | 'ghats' | 'monsoon' | 'title' | 'app';

export interface Scene {
  id: SceneId;
  start: number;
  end: number;
  line: string;
  sub: string;
}

const LENGTHS: [SceneId, number, string, string][] = [
  ['universe', 4.5, 'Space. Time. Beyond counting.', 'Hundreds of billions of galaxies, and not one other voice.'],
  ['galaxy', 4, 'One of them is ours.', 'The Milky Way.'],
  ['solar', 3.5, 'One ordinary star.', 'Eight worlds. Seven of them silent.'],
  ['earth', 4, 'And one that breathes.', 'The only place we know where rain becomes forest.'],
  ['descent', 3.5, 'Closer.', 'A land that waits all year for the rain.'],
  [
    'ghats',
    5,
    'When it comes, the hills come alive.',
    'Teak and sandalwood. Neelakurinji, blue once in twelve years. Nowhere else in the known universe.',
  ],
  [
    'monsoon',
    4.5,
    '“Chhata le ja, baarish hogi.”',
    'Every home has that voice at the door. It is almost always right.',
  ],
  ['title', 5, 'Mausam ka Mahaul', 'Mausam is the sky. Mahaul is what it does to us.'],
  [
    'app',
    4,
    'Read the sky before you step out.',
    'Made with love by Rahul, for everyone who was ever told to carry an umbrella.',
  ],
];

export const SCENES: Scene[] = LENGTHS.reduce<Scene[]>((acc, [id, len, line, sub]) => {
  const start = acc.at(-1)?.end ?? 0;
  acc.push({ id, start, end: start + len, line, sub });
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
