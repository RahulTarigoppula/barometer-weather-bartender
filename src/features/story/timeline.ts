/** The opening story: the known universe, the Milky Way, the Sun, the planets, Earth, life, the name, the app. */

export type SceneId =
  | 'universe'
  | 'galaxy'
  | 'solar'
  | 'planets'
  | 'earth'
  | 'life'
  | 'memory'
  | 'title'
  | 'meaning'
  | 'app';

export interface Scene {
  id: SceneId;
  start: number;
  end: number;
  line: string;
  sub: string;
}

const LENGTHS: [SceneId, number, string, string][] = [
  [
    'universe',
    5,
    'The known universe.',
    'Hundreds of billions of galaxies across ninety-three billion light-years. Countless bounds of space and time.',
  ],
  ['galaxy', 4.5, 'One of them is ours.', 'The Milky Way. A hundred billion suns, and one we call home.'],
  ['solar', 4, 'A small yellow star.', 'Eight worlds circle it. Seven are rock, ice and silence.'],
  [
    'planets',
    4,
    'But the third one breathes.',
    'In all that space and time, it is the only place we know where life began.',
  ],
  ['earth', 4.5, 'Earth.', 'Oceans rise as clouds. Clouds come back as rain.'],
  [
    'life',
    5.5,
    'And from the rain, life.',
    'Sandalwood and teak. Neelakurinji, which blooms once in twelve years. Wood and leaf found nowhere else in the known universe.',
  ],
  [
    'memory',
    4.5,
    '“Chhata le ja, baarish hogi.”',
    'Take an umbrella, it’s going to rain. Every Indian home has that voice at the door, and it is almost always right.',
  ],
  ['title', 4.5, 'Mausam ka Mahaul', 'मौसम का माहौल · the vibe of the weather'],
  [
    'meaning',
    5,
    'Mausam is the sky. Mahaul is what it does to us.',
    'The first rain and the smell of wet earth. Chai and pakoras. A jammed flyover. A rooftop at golden hour.',
  ],
  [
    'app',
    4.5,
    'So we built a friend who reads the sky for you.',
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
