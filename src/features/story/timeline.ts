/** The opening story: galaxy → Sun → planets → Earth → the name → what it means → the app. */

export type SceneId = 'galaxy' | 'solar' | 'planets' | 'earth' | 'title' | 'meaning' | 'app';

export interface Scene {
  id: SceneId;
  start: number;
  end: number;
  line: string;
  sub: string;
}

const LENGTHS: [SceneId, number, string, string][] = [
  ['galaxy', 5.5, 'This is the Milky Way.', 'A hundred billion suns, turning slowly through the dark.'],
  ['solar', 5, 'On one quiet arm, a single star.', 'Our Sun — and eight worlds that keep its time.'],
  ['planets', 4.5, 'Mercury burns. Venus chokes. Mars is dust.', 'Only one of them has weather worth talking about.'],
  ['earth', 4.5, 'Earth.', 'And on it, a land that lives by its sky.'],
  ['title', 4.5, 'Mausam ka Mahaul', 'मौसम का माहौल · the vibe of the weather'],
  [
    'meaning',
    6,
    'Mausam is the weather. Mahaul is the mood it creates.',
    'Monsoon, heat, the air you breathe, the roads you take — in India the sky decides the day, and how the evening ends.',
  ],
  ['app', 4, 'Read the sky. Beat the jam. Pour the right drink.', 'Welcome in.'],
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
