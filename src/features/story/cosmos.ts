import { ease, ramp, SCENES, type Scene, type SceneId } from './timeline';

/**
 * The story's camera, in plain canvas 2D. One continuous descent: a deep field of galaxies, the
 * Milky Way, the Sun, the Earth turning to India, a dive through the clouds, and the Western Ghats
 * from dawn, through the monsoon, to dusk and night.
 *
 * Built for 60 fps on a laptop and at least 24 fps on a mid-range phone: everything expensive is
 * painted once into a cache (starfield, nebulae, galaxy sprites and glow, the Earth sphere, the
 * hills, the blooms, the clouds) and blitted per frame; the pixel ratio is capped at 1.5.
 */

const at = Object.fromEntries(SCENES.map((s) => [s.id, s])) as Record<SceneId, Scene>;
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const clamp1 = (x: number): number => Math.max(-1, Math.min(1, x));
const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;
const FONT = '"Space Grotesk Variable", system-ui, sans-serif';

/** Small deterministic PRNG so every play looks the same. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = s;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasOf(wpx: number, hpx: number): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(wpx));
  c.height = Math.max(1, Math.round(hpx));
  return [c, c.getContext('2d')];
}

type RGB = [number, number, number];
const mix = (a: RGB, b: RGB, k: number): RGB => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const css = (c: RGB, a = 1): string => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;

// ───────────── the Milky Way ─────────────
interface Batch {
  style: string;
  size: number;
  x: Float32Array;
  y: Float32Array;
}

const R0 = 0.08;
const PITCH = 0.3;
const armTheta = (r: number): number => Math.log(r / R0) / PITCH;

function makeGalaxy(): Batch[] {
  const rnd = rng(7);
  const gauss = (): number => (rnd() + rnd() + rnd() - 1.5) / 1.5;
  const hues = ['255,214,170', '170,200,255', '255,170,200'];
  const alphas = [0.4, 0.65, 0.9];
  const buckets = new Map<string, { style: string; size: number; xs: number[]; ys: number[] }>();
  const put = (x: number, y: number, hue: number, alpha: number, big: boolean): void => {
    const key = `${hue}|${alpha}|${big}`;
    let b = buckets.get(key);
    if (!b) {
      b = { style: `rgba(${hues[hue]},${alphas[alpha]})`, size: big ? 1.9 : 1.1, xs: [], ys: [] };
      buckets.set(key, b);
    }
    b.xs.push(x);
    b.ys.push(y);
  };
  const a3 = (): number => Math.min(2, Math.floor(rnd() * 3));
  for (let i = 0; i < 3600; i++) {
    const arm = i % 4;
    const r = R0 + (1 - R0) * rnd() ** 0.75;
    const spread = (arm < 2 ? 0.28 : 0.45) * (1.1 - r * 0.4);
    const th = armTheta(r) + arm * (Math.PI / 2) + gauss() * spread;
    const hue = r < 0.25 ? 0 : rnd() < 0.15 ? 2 : 1;
    put(Math.cos(th) * r + gauss() * 0.02, Math.sin(th) * r + gauss() * 0.02, hue, a3(), rnd() < 0.08);
  }
  for (let i = 0; i < 1100; i++) {
    const r = Math.abs(gauss()) * 0.16;
    const th = rnd() * TAU;
    put(Math.cos(th) * r, Math.sin(th) * r, 0, a3(), false);
  }
  return [...buckets.values()].map((b) => ({
    style: b.style,
    size: b.size,
    x: Float32Array.from(b.xs),
    y: Float32Array.from(b.ys),
  }));
}

const SUN_R = 0.62;
const SUN_TH = armTheta(SUN_R);
const GALAXY_SPIN = 0.05;
const TILT_G = 0.55;

function paintGalaxy(
  c: CanvasRenderingContext2D,
  galaxy: Batch[],
  o: { cx: number; cy: number; scale: number; rot: number; fx: number; fy: number; grow: number; w: number; h: number },
): void {
  const cr = Math.cos(o.rot);
  const sr = Math.sin(o.rot);
  const a = cr * o.scale;
  const b = -sr * o.scale;
  const cc = o.cx - o.fx * o.scale;
  const d = sr * o.scale * TILT_G;
  const e = cr * o.scale * TILT_G;
  const f = o.cy - o.fy * o.scale * TILT_G;
  for (const batch of galaxy) {
    c.fillStyle = batch.style;
    const s = batch.size * o.grow;
    const xs = batch.x;
    const ys = batch.y;
    for (let i = 0; i < xs.length; i++) {
      const x = xs[i] as number;
      const y = ys[i] as number;
      const X = a * x + b * y + cc;
      if (X < -4 || X > o.w + 4) continue;
      const Y = d * x + e * y + f;
      if (Y < -4 || Y > o.h + 4) continue;
      c.fillRect(X, Y, s, s);
    }
  }
  const cr0 = 0.18 * o.scale;
  if (cc > -cr0 && cc < o.w + cr0 && f > -cr0 && f < o.h + cr0) {
    const core = c.createRadialGradient(cc, f, 0, cc, f, cr0);
    core.addColorStop(0, 'rgba(255,220,170,0.55)');
    core.addColorStop(1, 'rgba(255,220,170,0)');
    c.fillStyle = core;
    c.fillRect(cc - cr0, f - cr0, cr0 * 2, cr0 * 2);
  }
}

// ───────────── the deep field ─────────────
interface FieldGalaxy {
  x: number;
  y: number;
  size: number;
  rot: number;
  incl: number;
  sprite: number;
  spin: number;
}

function makeSprites(): HTMLCanvasElement[] {
  const out: HTMLCanvasElement[] = [];
  const looks: [string, string, number][] = [
    ['255,225,190', '160,190,255', 2],
    ['255,240,220', '200,170,255', 2],
    ['255,210,170', '255,170,150', 3],
    ['230,240,255', '140,200,255', 2],
  ];
  const N = 96;
  for (const [i, [core, arm, arms]] of looks.entries()) {
    const [cv, c] = canvasOf(N, N);
    if (c) {
      const rnd = rng(100 + i);
      const glow = c.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N * 0.24);
      glow.addColorStop(0, `rgba(${core},0.95)`);
      glow.addColorStop(1, `rgba(${core},0)`);
      c.fillStyle = glow;
      c.fillRect(0, 0, N, N);
      const haze = c.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N * 0.48);
      haze.addColorStop(0, `rgba(${arm},0.18)`);
      haze.addColorStop(1, `rgba(${arm},0)`);
      c.fillStyle = haze;
      c.fillRect(0, 0, N, N);
      for (let k = 0; k < 520; k++) {
        const r = 0.05 + 0.42 * rnd() ** 0.8;
        const th = Math.log(r / 0.05) / 0.32 + (k % arms) * (TAU / arms) + (rnd() - 0.5) * 0.6;
        c.fillStyle = `rgba(${arm},${(0.25 + rnd() * 0.55).toFixed(2)})`;
        c.fillRect(N / 2 + Math.cos(th) * r * N, N / 2 + Math.sin(th) * r * N, 1.2, 1.2);
      }
    }
    out.push(cv);
  }
  for (const [i, tint] of ['255,215,170', '255,190,160'].entries()) {
    const [cv, c] = canvasOf(N, N);
    if (c) {
      c.translate(N / 2, N / 2);
      c.scale(1, 0.62 + i * 0.15);
      const g = c.createRadialGradient(0, 0, 0, 0, 0, N * 0.42);
      g.addColorStop(0, `rgba(${tint},0.95)`);
      g.addColorStop(0.35, `rgba(${tint},0.35)`);
      g.addColorStop(1, `rgba(${tint},0)`);
      c.fillStyle = g;
      c.beginPath();
      c.arc(0, 0, N * 0.42, 0, TAU);
      c.fill();
    }
    out.push(cv);
  }
  return out;
}

function makeField(): FieldGalaxy[] {
  const rnd = rng(11);
  return Array.from({ length: 360 }, () => ({
    x: (rnd() - 0.5) * 3.4,
    y: (rnd() - 0.5) * 2.2,
    size: 0.006 + rnd() ** 3 * 0.05,
    rot: rnd() * TAU,
    incl: 0.3 + rnd() * 0.7,
    sprite: Math.floor(rnd() * 6),
    spin: (rnd() - 0.5) * 0.04,
  }));
}

const MW = { x: 0.22, y: 0.1, r: 0.03 };
const FIELD_SCALE = 0.5;
const GALAXY_SCALE = 0.46;
const DIVE = GALAXY_SCALE / (MW.r * FIELD_SCALE);

// ───────────── the planets ─────────────
const PLANETS = [
  { name: 'Mercury', orbit: 0.07, size: 0.005, color: '#b8ab9c', phase: 0.6 },
  { name: 'Venus', orbit: 0.1, size: 0.008, color: '#e9c88e', phase: 2.4 },
  { name: 'Earth', orbit: 0.135, size: 0.0085, color: '#4f8cff', phase: 4.1 },
  { name: 'Mars', orbit: 0.17, size: 0.0065, color: '#d4643f', phase: 1.2 },
  { name: 'Jupiter', orbit: 0.25, size: 0.02, color: '#d9b48d', phase: 3.3 },
  { name: 'Saturn', orbit: 0.32, size: 0.017, color: '#e4d2a2', phase: 5.4 },
  { name: 'Uranus', orbit: 0.38, size: 0.012, color: '#a3dbe8', phase: 0.2 },
  { name: 'Neptune', orbit: 0.43, size: 0.012, color: '#5d7ef2', phase: 2.0 },
] as const;
const TILT = 0.42;

// ───────────── the Ghats ─────────────
interface Tree {
  segs: { x0: number; y0: number; x1: number; y1: number; d: number }[];
  tips: { x: number; y: number }[];
  depth: number;
}

function makeTree(seed: number, depth: number, spread: number): Tree {
  const rnd = rng(seed);
  const segs: Tree['segs'] = [];
  const tips: Tree['tips'] = [];
  const grow = (x: number, y: number, ang: number, len: number, d: number): void => {
    const x1 = x + Math.cos(ang) * len;
    const y1 = y + Math.sin(ang) * len;
    segs.push({ x0: x, y0: y, x1, y1, d });
    if (d >= depth) {
      tips.push({ x: x1, y: y1 });
      return;
    }
    const kids = d < 2 ? 2 : rnd() < 0.3 ? 3 : 2;
    for (let i = 0; i < kids; i++) {
      const side = kids === 2 ? (i === 0 ? -1 : 1) : i - 1;
      grow(x1, y1, ang + side * spread * (0.6 + rnd() * 0.6) + (rnd() - 0.5) * 0.2, len * (0.7 + rnd() * 0.12), d + 1);
    }
  };
  grow(0, 0, -Math.PI / 2 + (rnd() - 0.5) * 0.1, 1, 0);
  return { segs, tips, depth };
}

/** Sky colours through the day: [top, horizon]. */
const SKY: Record<'dawn' | 'day' | 'storm' | 'dusk' | 'night', [RGB, RGB]> = {
  dawn: [
    [58, 84, 140],
    [255, 186, 140],
  ],
  day: [
    [88, 140, 210],
    [200, 225, 240],
  ],
  storm: [
    [44, 52, 66],
    [104, 116, 130],
  ],
  dusk: [
    [38, 30, 78],
    [236, 120, 90],
  ],
  night: [
    [2, 4, 10],
    [10, 18, 40],
  ],
};

/** The camera time at which the Earth fills the frame: where "zoom out to the universe" starts. */
export const EARTH_T = at.earth.start + 3.7;
/** The camera time of the widest view of the known universe. */
export const UNIVERSE_T = 0.4;

export interface Cosmos {
  /** `t` drives the camera; `clock` drives motion (orbits, spin). They differ only when zooming by hand. */
  draw(t: number, clock?: number): void;
  resize(): void;
}

export function createCosmos(canvas: HTMLCanvasElement, opts: { reduced: boolean; texture: string }): Cosmos {
  const maybe = canvas.getContext('2d', { alpha: false });
  if (!maybe) return { draw: () => undefined, resize: () => undefined };
  const ctx: CanvasRenderingContext2D = maybe;
  const motion = opts.reduced ? 0 : 1;
  const galaxy = makeGalaxy();
  const sprites = makeSprites();
  const field = makeField();
  const handoffRot = -at.galaxy.start * GALAXY_SPIN * motion;

  // The Milky Way as the deep field sees it, and its soft glow (a tiny render, scaled up = blur).
  const MW_PX = 512;
  const [mwSprite, mwc] = canvasOf(MW_PX, MW_PX);
  if (mwc)
    paintGalaxy(mwc, galaxy, {
      cx: MW_PX / 2,
      cy: MW_PX / 2,
      scale: MW_PX * 0.47,
      rot: handoffRot,
      fx: 0,
      fy: 0,
      grow: 1,
      w: MW_PX,
      h: MW_PX,
    });
  const GL_PX = 96;
  const [glowSrc, glc] = canvasOf(GL_PX, GL_PX);
  // Downsampled twice so that, scaled back up, it is a smooth haze rather than blocky dots.
  const [glow, gls] = canvasOf(20, 20);
  if (glc)
    paintGalaxy(glc, galaxy, {
      cx: GL_PX / 2,
      cy: GL_PX / 2,
      scale: GL_PX * 0.47,
      rot: handoffRot,
      fx: 0,
      fy: 0,
      grow: 2.2,
      w: GL_PX,
      h: GL_PX,
    });
  if (gls) {
    const [mid, mc] = canvasOf(40, 40);
    mc?.drawImage(glowSrc, 0, 0, 40, 40);
    gls.drawImage(mid, 0, 0, 20, 20);
  }

  // Clouds: one soft puff sprite.
  const [cloud, cc] = canvasOf(160, 100);
  if (cc) {
    const rnd = rng(31);
    for (let i = 0; i < 14; i++) {
      const x = 30 + rnd() * 100;
      const y = 30 + rnd() * 40;
      const r = 18 + rnd() * 26;
      const g = cc.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      cc.fillStyle = g;
      cc.fillRect(0, 0, 160, 100);
    }
  }

  // Monsoon clouds: heavier, darker, flatter at the base.
  const [stormCloud, scx] = canvasOf(200, 110);
  if (scx) {
    const rnd = rng(47);
    for (let i = 0; i < 18; i++) {
      const x = 30 + rnd() * 140;
      const y = 30 + rnd() * 45;
      const r = 22 + rnd() * 30;
      const g = scx.createRadialGradient(x, y - r * 0.2, 0, x, y, r);
      g.addColorStop(0, 'rgba(120,130,148,0.75)');
      g.addColorStop(0.6, 'rgba(78,88,104,0.55)');
      g.addColorStop(1, 'rgba(60,68,82,0)');
      scx.fillStyle = g;
      scx.fillRect(0, 0, 200, 110);
    }
  }

  let tex: HTMLCanvasElement | null = null;
  const img = new Image();
  img.onload = () => {
    const [c, x] = canvasOf(1024, 512);
    x?.drawImage(img, 0, 0, 1024, 512);
    tex = c;
    sphereKey = '';
  };
  img.src = opts.texture;
  // The 4K Blue Marble, fetched a moment later, keeps India sharp during the dive.
  let hiTex: HTMLImageElement | null = null;
  const hiTimer = window.setTimeout(() => {
    const hi = new Image();
    hi.onload = () => {
      hiTex = hi;
    };
    hi.src = opts.texture.replace('earth-day.jpg', 'blue-marble-4k.webp');
  }, 1200);
  void hiTimer;

  let w = 0;
  let h = 0;
  let dpr = 1;
  let S = 1;
  const starLayer = document.createElement('canvas');
  const nebula = document.createElement('canvas');
  const sphere = document.createElement('canvas');
  let sphereKey = '';
  /** Five hill layers, far to near, each a little wider than the screen for the dolly. */
  let hills: HTMLCanvasElement[] = [];
  let blooms: HTMLCanvasElement[] = [];
  const MARGIN = 80;

  function paintHills(): void {
    const W = w + MARGIN * 2;
    const rnd = rng(61);
    const tones: RGB[] = [
      [126, 146, 182],
      [92, 118, 150],
      [56, 92, 98],
      [30, 70, 60],
      [12, 34, 26],
    ];
    const trees = [makeTree(201, 6, 0.42), makeTree(202, 6, 0.38), makeTree(203, 5, 0.46)];
    hills = [];
    blooms = [];
    for (let L = 0; L < 5; L++) {
      const [c, x] = canvasOf(W * dpr, h * dpr);
      const [b, bx] = canvasOf(W * dpr, h * dpr);
      hills.push(c);
      blooms.push(b);
      if (!x || !bx) continue;
      x.scale(dpr, dpr);
      bx.scale(dpr, dpr);
      const base = h * (0.5 + L * 0.085);
      const amp = h * (0.09 - L * 0.008);
      const f1 = 1.5 + rnd() * 1.5;
      const f2 = 4 + rnd() * 3;
      const p1 = rnd() * TAU;
      const p2 = rnd() * TAU;
      const ridge = (px: number): number =>
        base - amp * (0.6 * Math.sin((px / W) * TAU * f1 * 0.5 + p1) + 0.4 * Math.sin((px / W) * TAU * f2 * 0.5 + p2));
      const tone = tones[L] as RGB;
      const grad = x.createLinearGradient(0, base - amp, 0, h);
      grad.addColorStop(0, css(tone));
      grad.addColorStop(1, css(mix(tone, [8, 14, 20], 0.5)));
      x.fillStyle = grad;
      x.beginPath();
      x.moveTo(0, h);
      for (let px = 0; px <= W; px += 6) x.lineTo(px, ridge(px));
      x.lineTo(W, h);
      x.closePath();
      x.fill();
      // Mist at the foot of each ridge.
      const mist = x.createLinearGradient(0, base + amp * 0.2, 0, base + h * 0.12);
      mist.addColorStop(0, 'rgba(220,230,240,0)');
      mist.addColorStop(1, `rgba(220,230,240,${0.16 - L * 0.025})`);
      x.fillStyle = mist;
      x.fillRect(0, base, W, h * 0.14);
      // Trees along the nearer ridges.
      if (L >= 2) {
        const n = L === 4 ? 26 : 40;
        const size = h * (L === 4 ? 0.07 : L === 3 ? 0.045 : 0.03);
        const dark = css(mix(tone, [0, 0, 0], 0.45));
        x.strokeStyle = dark;
        x.fillStyle = dark;
        x.lineCap = 'round';
        for (let i = 0; i < n; i++) {
          const tx = rnd() * W;
          const ty = ridge(tx) + 3;
          const s = (size * (0.6 + rnd() * 0.7)) / 3;
          const tree = trees[i % trees.length] as Tree;
          for (const seg of tree.segs) {
            x.lineWidth = Math.max(0.5, s * 0.12 * 0.7 ** seg.d);
            x.beginPath();
            x.moveTo(tx + seg.x0 * s, ty + seg.y0 * s);
            x.lineTo(tx + seg.x1 * s, ty + seg.y1 * s);
            x.stroke();
          }
          x.beginPath();
          for (const tip of tree.tips) {
            const r = s * (0.18 + rnd() * 0.12);
            x.moveTo(tx + tip.x * s + r, ty + tip.y * s);
            x.arc(tx + tip.x * s, ty + tip.y * s, r, 0, TAU);
          }
          x.fill();
        }
      }
      // Neelakurinji: the middle slopes turn blue-violet when it blooms.
      if (L >= 1 && L <= 3) {
        // The wash: whole slopes turn blue, the way the Nilgiris do in a kurinji year.
        const wash = bx.createLinearGradient(0, base - amp, 0, base + h * 0.16);
        wash.addColorStop(0, 'rgba(118,108,236,0.62)');
        wash.addColorStop(0.55, 'rgba(140,110,230,0.32)');
        wash.addColorStop(1, 'rgba(140,110,230,0)');
        bx.fillStyle = wash;
        bx.beginPath();
        bx.moveTo(0, h);
        for (let px = 0; px <= W; px += 6) bx.lineTo(px, ridge(px) + 2);
        bx.lineTo(W, h);
        bx.closePath();
        bx.fill();
        const n = Math.round((W * h) / (L === 3 ? 700 : 1200));
        for (let i = 0; i < n; i++) {
          const px = rnd() * W;
          const top = ridge(px);
          const py = top + 4 + rnd() ** 1.6 * h * 0.1;
          const r = (L === 3 ? 2.2 : 1.5) + rnd() * 1.8;
          bx.fillStyle = rnd() < 0.7 ? 'rgba(150,140,255,0.85)' : 'rgba(200,160,255,0.8)';
          bx.fillRect(px, py, r, r);
        }
      }
    }
  }

  const resize = (): void => {
    dpr = Math.min(1.5, window.devicePixelRatio || 1);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    S = Math.min(w, h);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    for (const c of [starLayer, nebula]) {
      c.width = canvas.width;
      c.height = canvas.height;
    }
    const sc = starLayer.getContext('2d');
    if (sc) {
      const rnd = rng(42);
      sc.clearRect(0, 0, starLayer.width, starLayer.height);
      const n = Math.round((w * h) / 2000);
      for (let i = 0; i < n; i++) {
        sc.fillStyle = `rgba(220,230,255,${(0.2 + rnd() * 0.6).toFixed(2)})`;
        const s = (rnd() < 0.1 ? 1.6 : 0.9) * dpr;
        sc.fillRect(rnd() * starLayer.width, rnd() * starLayer.height, s, s);
      }
    }
    const nc = nebula.getContext('2d');
    if (nc) {
      const rnd = rng(77);
      const tints = ['120,80,255', '40,140,255', '255,90,170', '40,200,190', '255,150,60'];
      nc.clearRect(0, 0, nebula.width, nebula.height);
      for (let i = 0; i < 9; i++) {
        const x = rnd() * nebula.width;
        const y = rnd() * nebula.height;
        const r = (0.25 + rnd() * 0.45) * Math.max(nebula.width, nebula.height);
        const g = nc.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(${tints[i % tints.length]},${(0.06 + rnd() * 0.07).toFixed(3)})`);
        g.addColorStop(1, `rgba(${tints[i % tints.length]},0)`);
        nc.fillStyle = g;
        nc.fillRect(0, 0, nebula.width, nebula.height);
      }
    }
    sphereKey = '';
    hills = [];
  };
  resize();

  // ── the known universe ──
  function drawUniverse(t: number, clock: number, alpha: number): void {
    if (alpha <= 0.002) return;
    const u = at.universe;
    const k = ease(ramp(t, u.start + 1.1, u.end));
    const zoom = Math.exp(Math.log(DIVE) * k) * (1 + 0.05 * ramp(t, u.start, u.start + 1.1));
    const scale = S * FIELD_SCALE * zoom;
    const fx = MW.x * k;
    const fy = MW.y * k;
    const cx = w / 2;
    const cy = h / 2;
    ctx.globalAlpha = alpha;
    for (const g of field) {
      const X = cx + (g.x - fx) * scale;
      const Y = cy + (g.y - fy) * scale;
      const s = g.size * scale * 2;
      if (X < -s || Y < -s || X > w + s || Y > h + s || s < 0.8) continue;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.translate(X, Y);
      ctx.rotate(g.rot + clock * g.spin * motion);
      ctx.scale(1, g.incl);
      ctx.drawImage(sprites[g.sprite] as HTMLCanvasElement, -s / 2, -s / 2, s, s);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const mx = cx + (MW.x - fx) * scale;
    const my = cy + (MW.y - fy) * scale;
    const ms = (MW.r * scale) / 0.94;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * 0.55;
    ctx.drawImage(glow, mx - ms, my - ms, ms * 2, ms * 2);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha;
    ctx.drawImage(mwSprite, mx - ms, my - ms, ms * 2, ms * 2);
    const tag = ramp(t, u.start + 1.5, u.start + 2.2) * (1 - ramp(t, u.end - 1.4, u.end - 0.7));
    if (tag > 0) {
      ctx.globalAlpha = alpha * tag;
      ctx.strokeStyle = 'rgba(255,197,138,0.8)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(mx, my, MW.r * scale * 1.5, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = '#ffc58a';
      ctx.font = `600 ${Math.round(Math.max(12, S * 0.018))}px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText('Milky Way', mx + MW.r * scale * 1.5 + 8, my + 4);
    }
    ctx.globalAlpha = 1;
  }

  // ── the Milky Way ──
  function drawGalaxy(t: number, clock: number, alpha: number): void {
    if (alpha <= 0.002) return;
    const g = at.galaxy;
    const k = ease(ramp(t, g.start + 1.3, g.end + 0.4));
    const zoom = Math.exp(Math.log(40) * k);
    const rot = -clock * GALAXY_SPIN * motion;
    const sx = Math.cos(SUN_TH + rot) * SUN_R;
    const sy = Math.sin(SUN_TH + rot) * SUN_R;
    const scale = S * GALAXY_SCALE * zoom;
    const gx = w / 2 - sx * k * scale;
    const gy = h / 2 - sy * k * scale * TILT_G;
    // The glow, rotated with the disc (it was painted at the hand-off angle).
    const gs = scale / 0.94;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * 0.5 * (1 - k * 0.7);
    ctx.translate(gx, gy);
    ctx.scale(1, TILT_G);
    ctx.rotate(rot - handoffRot);
    ctx.scale(1, 1 / TILT_G);
    ctx.drawImage(glow, -gs, -gs, gs * 2, gs * 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha;
    paintGalaxy(ctx, galaxy, {
      cx: w / 2,
      cy: h / 2,
      scale,
      rot,
      fx: sx * k,
      fy: sy * k,
      grow: Math.min(3, 1 + k * 1.5),
      w,
      h,
    });
    const mark = ramp(t, g.start + 0.3, g.start + 1) * alpha;
    if (mark > 0) {
      const X = w / 2 + (sx - sx * k) * scale;
      const Y = h / 2 + (sy - sy * k) * scale * TILT_G;
      const r = 4 + 10 * k;
      const sg = ctx.createRadialGradient(X, Y, 0, X, Y, r * 3);
      sg.addColorStop(0, `rgba(255,236,190,${mark})`);
      sg.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = sg;
      ctx.fillRect(X - r * 3, Y - r * 3, r * 6, r * 6);
      if (k < 0.35) {
        ctx.globalAlpha = mark * (1 - k / 0.35);
        ctx.fillStyle = '#ffc58a';
        ctx.font = `600 ${Math.round(Math.max(11, S * 0.017))}px ${FONT}`;
        ctx.textAlign = 'left';
        ctx.fillText('you are here', X + r + 6, Y + 4);
      }
    }
    ctx.globalAlpha = 1;
  }

  const planetAngle = (i: number, clock: number): number => {
    const p = PLANETS[i] as (typeof PLANETS)[number];
    return p.phase + clock * 0.7 * (PLANETS[0].orbit / p.orbit) ** 1.5 * motion;
  };

  // ── the Solar System ──
  function drawSolar(t: number, clock: number, alpha: number): void {
    if (alpha <= 0.002) return;
    const sol = at.solar;
    const e = at.earth;
    const ts = clock - sol.start;
    const earthA = planetAngle(2, ts);
    const ex = Math.cos(earthA) * PLANETS[2].orbit;
    const ey = Math.sin(earthA) * PLANETS[2].orbit * TILT;
    const arrive = ease(ramp(t, sol.start - 0.3, sol.start + 2.2));
    const close = ease(ramp(t, e.start - 0.6, e.start + 2.2));
    const zoom = lerp(0.35, 1, arrive) * Math.exp(Math.log(6) * close);
    const scale = S * 1.05 * zoom;
    const ox = w / 2 - ex * close * scale;
    const oy = h / 2 - ey * close * scale;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(124,196,255,0.12)';
    ctx.beginPath();
    for (const p of PLANETS) {
      if (p.name === 'Earth') continue;
      ctx.moveTo(ox + p.orbit * scale, oy);
      ctx.ellipse(ox, oy, p.orbit * scale, p.orbit * scale * TILT, 0, 0, TAU);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(124,196,255,0.4)';
    ctx.beginPath();
    ctx.ellipse(ox, oy, PLANETS[2].orbit * scale, PLANETS[2].orbit * scale * TILT, 0, 0, TAU);
    ctx.stroke();
    const sunR = 0.028 * scale * 4;
    if (ox > -sunR && ox < w + sunR && oy > -sunR && oy < h + sunR) {
      const sun = ctx.createRadialGradient(ox, oy, 0, ox, oy, sunR);
      sun.addColorStop(0, 'rgba(255,248,220,1)');
      sun.addColorStop(0.25, 'rgba(255,196,90,0.95)');
      sun.addColorStop(0.5, 'rgba(255,140,40,0.25)');
      sun.addColorStop(1, 'rgba(255,120,30,0)');
      ctx.fillStyle = sun;
      ctx.fillRect(ox - sunR, oy - sunR, sunR * 2, sunR * 2);
    }
    const labels = ramp(t, sol.start + 1.2, sol.start + 2) * (1 - ramp(t, e.start, e.start + 0.6));
    const size = Math.round(Math.max(11, S * 0.016));
    const order = PLANETS.map((p, i) => {
      const a = planetAngle(i, ts);
      return { p, x: Math.cos(a) * p.orbit, y: Math.sin(a) * p.orbit * TILT };
    }).sort((a, b) => a.y - b.y);
    for (const { p, x, y } of order) {
      const X = ox + x * scale;
      const Y = oy + y * scale;
      const r = Math.max(1.5, p.size * scale);
      if (X < -r * 3 || Y < -r * 3 || X > w + r * 3 || Y > h + r * 3) continue;
      const shade = ctx.createRadialGradient(X - r * 0.4, Y - r * 0.4, r * 0.1, X, Y, r);
      shade.addColorStop(0, p.color);
      shade.addColorStop(1, 'rgba(0,0,0,0.85)');
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.arc(X, Y, r, 0, TAU);
      ctx.fill();
      if (p.name === 'Saturn') {
        ctx.strokeStyle = 'rgba(228,210,162,0.7)';
        ctx.lineWidth = Math.max(1, r * 0.18);
        ctx.beginPath();
        ctx.ellipse(X, Y, r * 2, r * 0.6, -0.3, 0, TAU);
        ctx.stroke();
      }
      if (p.name === 'Earth') {
        const halo = ctx.createRadialGradient(X, Y, r, X, Y, r * 2.4);
        halo.addColorStop(0, 'rgba(124,196,255,0.45)');
        halo.addColorStop(1, 'rgba(124,196,255,0)');
        ctx.fillStyle = halo;
        ctx.fillRect(X - r * 2.4, Y - r * 2.4, r * 4.8, r * 4.8);
      }
      if (labels > 0) {
        ctx.globalAlpha = alpha * labels * (p.name === 'Earth' ? 1 : 0.75);
        ctx.fillStyle = p.name === 'Earth' ? '#7cc4ff' : '#a9b8d8';
        ctx.font = `${p.name === 'Earth' ? 600 : 500} ${size}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(p.name, X, Y - r - 8);
        ctx.globalAlpha = alpha;
      }
    }
    ctx.globalAlpha = 1;
  }

  // ── Earth, and the dive into India ──
  function renderSphere(D: number, lng0: number): void {
    const key = `${D}|${lng0.toFixed(2)}|${D > 1000 && hiTex ? 1 : 0}`;
    const src: HTMLCanvasElement | HTMLImageElement | null = D > 1000 && hiTex ? hiTex : tex;
    if (key === sphereKey || !src) return;
    sphereKey = key;
    sphere.width = D;
    sphere.height = D;
    const sc = sphere.getContext('2d');
    if (!sc) return;
    const R = D / 2;
    sc.clearRect(0, 0, D, D);
    sc.save();
    sc.beginPath();
    sc.arc(R, R, R, 0, TAU);
    sc.clip();
    sc.fillStyle = '#0b2a5a';
    sc.fillRect(0, 0, D, D);
    const iw = src === hiTex && hiTex ? hiTex.naturalWidth : (tex as HTMLCanvasElement).width;
    const ih = src === hiTex && hiTex ? hiTex.naturalHeight : (tex as HTMLCanvasElement).height;
    const N = D > 360 ? 48 : 26;
    const cell = D / N;
    for (let j = 0; j < N; j++) {
      const y0 = -R + j * cell;
      const y1 = y0 + cell;
      const ym = (y0 + y1) / 2;
      const lat0 = Math.asin(clamp1(-y0 / R));
      const lat1 = Math.asin(clamp1(-y1 / R));
      const rr = R * Math.cos(Math.asin(clamp1(ym / R)));
      if (rr <= 0.5) continue;
      const v0 = ((90 - lat0 / DEG) / 180) * ih;
      const v1 = ((90 - lat1 / DEG) / 180) * ih;
      for (let i = 0; i < N; i++) {
        const x0 = -R + i * cell;
        const x1 = x0 + cell;
        if (x1 < -rr - cell || x0 > rr + cell) continue;
        const d0 = Math.asin(clamp1(x0 / rr)) / DEG;
        const d1 = Math.asin(clamp1(x1 / rr)) / DEG;
        const uw = Math.max(1, ((d1 - d0) / 360) * iw);
        let u0 = ((((lng0 + d0 + 180) / 360) % 1) + 1) % 1;
        u0 *= iw;
        if (u0 + uw > iw) u0 = iw - uw;
        sc.drawImage(src, u0, v0, uw, Math.max(1, v1 - v0), R + x0, R + y0, cell + 0.8, cell + 0.8);
      }
    }
    const shade = sc.createRadialGradient(R * 0.65, R * 0.65, R * 0.2, R, R, R * 1.05);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(0.7, 'rgba(2,4,10,0.22)');
    shade.addColorStop(1, 'rgba(2,4,10,0.85)');
    sc.fillStyle = shade;
    sc.fillRect(0, 0, D, D);
    sc.restore();
  }

  function drawEarth(t: number, clock: number, alpha: number): void {
    if (alpha <= 0.002) return;
    const e = at.earth;
    const d = at.descent;
    const grow = ease(ramp(t, e.start + 1.6, e.start + 3.6));
    const dive = ease(ramp(t, d.start + 0.2, d.end + 0.2));
    const R = lerp(0.05, 0.34, grow) * S * Math.exp(Math.log(10) * dive);
    const x = w / 2;
    const y = h / 2 + R * Math.sin(22 * DEG) * dive;
    const turn = ease(ramp(t, e.start + 1.6, d.start + 0.15));
    const lng0 = motion ? Math.round(lerp(-10, 79, turn) * 4) / 4 : 79;
    ctx.globalAlpha = alpha;
    const atmo = ctx.createRadialGradient(x, y, R * 0.96, x, y, R * 1.18);
    atmo.addColorStop(0, 'rgba(110,175,255,0.55)');
    atmo.addColorStop(1, 'rgba(110,175,255,0)');
    ctx.fillStyle = atmo;
    if (R < S * 1.2) ctx.fillRect(x - R * 1.18, y - R * 1.18, R * 2.36, R * 2.36);
    const cap = hiTex ? 2048 : 1100;
    // Growing: 24 px steps. Diving: one render at full resolution, then reused while the camera falls.
    const D = dive > 0 ? cap : Math.max(48, Math.min(cap, Math.ceil((2 * Math.min(R, 1.6 * S) * dpr) / 24) * 24));
    renderSphere(D, lng0);
    if (tex) ctx.drawImage(sphere, x - R, y - R, R * 2, R * 2);
    else {
      ctx.fillStyle = '#1d4f9a';
      ctx.beginPath();
      ctx.arc(x, y, R, 0, TAU);
      ctx.fill();
    }
    // India: the target of the dive.
    const mark = ramp(t, d.start, d.start + 0.5) * (1 - ramp(t, d.start + 1.4, d.start + 2.2));
    if (mark > 0) {
      const iy = y - R * Math.sin(22 * DEG);
      const pulse = 1 + 0.25 * Math.sin(clock * 4) * motion;
      const gr = Math.min(S * 0.12, R * 0.2) * pulse;
      const g = ctx.createRadialGradient(x, iy, 0, x, iy, gr);
      g.addColorStop(0, `rgba(255,153,51,${0.6 * mark})`);
      g.addColorStop(1, 'rgba(255,153,51,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - gr, iy - gr, gr * 2, gr * 2);
    }
    // Through the clouds.
    const thru = ramp(t, d.start + 0.8, d.start + 2) * (1 - ramp(t, d.end, d.end + 0.6));
    if (thru > 0) {
      const rnd = rng(13);
      for (let i = 0; i < 26; i++) {
        const a = rnd() * TAU;
        const r0 = rnd();
        const dist = (r0 + dive * 1.6) * S * 0.6;
        const cxp = w / 2 + Math.cos(a) * dist;
        const cyp = h / 2 + Math.sin(a) * dist * 0.7;
        const s = S * (0.25 + rnd() * 0.3) * (1 + dive * 2);
        ctx.globalAlpha = thru * (0.5 + rnd() * 0.4);
        ctx.drawImage(cloud, cxp - s / 2, cyp - s * 0.3, s, s * 0.62);
      }
      ctx.globalAlpha = thru * ramp(t, d.end - 0.9, d.end - 0.1) * 0.9;
      ctx.fillStyle = '#e6edf5';
      ctx.fillRect(0, 0, w, h);
    }
    ctx.globalAlpha = 1;
  }

  // ── the Western Ghats: dawn, bloom, monsoon, dusk, night ──
  function skyAt(t: number): [RGB, RGB] {
    const g = at.ghats;
    const m = at.monsoon;
    const ti = at.title;
    const a = at.app;
    const k1 = ramp(t, g.start, g.start + 2.5); // dawn → day
    const k2 = ramp(t, m.start - 0.3, m.start + 1); // → storm
    const k3 = ramp(t, ti.start - 0.4, ti.start + 1.4); // → dusk
    const k4 = ramp(t, a.start - 0.5, a.end - 1.2); // → night
    let top = mix(SKY.dawn[0], SKY.day[0], k1);
    let hor = mix(SKY.dawn[1], SKY.day[1], k1);
    top = mix(top, SKY.storm[0], k2);
    hor = mix(hor, SKY.storm[1], k2);
    top = mix(top, SKY.dusk[0], k3);
    hor = mix(hor, SKY.dusk[1], k3);
    top = mix(top, SKY.night[0], k4);
    hor = mix(hor, SKY.night[1], k4);
    return [top, hor];
  }

  function drawGhats(t: number, clock: number, alpha: number): void {
    if (alpha <= 0.002) return;
    if (hills.length === 0) paintHills();
    const g = at.ghats;
    const m = at.monsoon;
    const a = at.app;
    const [top, hor] = skyAt(t);
    ctx.globalAlpha = alpha;
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.75);
    sky.addColorStop(0, css(top));
    sky.addColorStop(1, css(hor));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    // Night returns: the stars come back over the hills.
    const night = ramp(t, a.start, a.end - 1);
    if (night > 0) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = alpha * night;
      ctx.drawImage(starLayer, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = alpha;
    }
    // The sun climbs at dawn, hides in the monsoon, sets at dusk.
    const rise = ease(ramp(t, g.start, g.end));
    const hide = 1 - ramp(t, m.start - 0.2, m.start + 0.8);
    const setK = ramp(t, at.title.start, at.title.end);
    const sunA = Math.max(hide, setK * (1 - ramp(t, a.start, a.start + 1.5)));
    if (sunA > 0.01) {
      const sx = setK > 0 && hide < 0.5 ? w * 0.7 : w * 0.32;
      const sy = setK > 0 && hide < 0.5 ? lerp(h * 0.42, h * 0.6, setK) : lerp(h * 0.6, h * 0.3, rise);
      const sr = S * 0.05;
      const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 6);
      sg.addColorStop(0, 'rgba(255,240,200,0.95)');
      sg.addColorStop(0.15, 'rgba(255,210,140,0.6)');
      sg.addColorStop(1, 'rgba(255,170,90,0)');
      ctx.globalAlpha = alpha * sunA;
      ctx.fillStyle = sg;
      ctx.fillRect(sx - sr * 6, sy - sr * 6, sr * 12, sr * 12);
      ctx.globalAlpha = alpha;
    }
    // The hills, far to near, with a slow dolly; the blooms spread across the slopes.
    const local = clock - g.start;
    const bloom = ease(ramp(t, g.start + 1.2, g.start + 4.2));
    for (let L = 0; L < hills.length; L++) {
      const off = MARGIN - Math.max(-MARGIN, Math.min(MARGIN, local * (L + 1) * 3 * motion));
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(hills[L] as HTMLCanvasElement, -off * dpr, 0);
      if (bloom > 0 && blooms[L]) {
        ctx.globalAlpha = alpha * bloom;
        ctx.drawImage(blooms[L] as HTMLCanvasElement, -off * dpr, 0);
        ctx.globalAlpha = alpha;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // A band of mist drifting between the layers.
      if (L === 1 || L === 3) {
        const my = h * (0.6 + L * 0.06);
        const mg = ctx.createLinearGradient(0, my - h * 0.04, 0, my + h * 0.04);
        mg.addColorStop(0, 'rgba(230,236,244,0)');
        mg.addColorStop(0.5, `rgba(230,236,244,${0.12 * (1 - ramp(t, a.start, a.end))})`);
        mg.addColorStop(1, 'rgba(230,236,244,0)');
        ctx.fillStyle = mg;
        ctx.fillRect(0, my - h * 0.04, w, h * 0.08);
      }
    }
    // Birds cross at dawn.
    const birds = ramp(t, g.start + 0.5, g.start + 1.2) * (1 - ramp(t, g.end - 0.6, g.end));
    if (birds > 0 && motion) {
      ctx.globalAlpha = alpha * birds * 0.8;
      ctx.strokeStyle = '#1b2430';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let i = 0; i < 7; i++) {
        const bx = ((local * 45 + i * 60) % (w + 200)) - 100;
        const by = h * 0.28 + Math.sin(i * 2.1) * h * 0.05 + Math.sin(local * 2 + i) * 4;
        const s = 6 + (i % 3) * 2;
        const flap = Math.sin(local * 9 + i) * s * 0.5;
        ctx.moveTo(bx - s, by - flap);
        ctx.quadraticCurveTo(bx - s * 0.4, by - s * 0.2, bx, by);
        ctx.quadraticCurveTo(bx + s * 0.4, by - s * 0.2, bx + s, by - flap);
      }
      ctx.stroke();
    }
    // The light of the hour over everything.
    const storm = ramp(t, m.start - 0.3, m.start + 1) * (1 - ramp(t, at.title.start - 0.4, at.title.start + 1));
    const dusk = ramp(t, at.title.start - 0.4, at.title.start + 1.4) * (1 - ramp(t, a.start, a.end - 1));
    const dark = ramp(t, a.start - 0.3, a.end - 1);
    if (storm > 0) {
      ctx.globalAlpha = alpha * storm * 0.35;
      ctx.fillStyle = '#28323f';
      ctx.fillRect(0, 0, w, h);
    }
    if (dusk > 0) {
      ctx.globalAlpha = alpha * dusk * 0.3;
      ctx.fillStyle = '#3a1f4a';
      ctx.fillRect(0, 0, w, h);
    }
    if (dark > 0) {
      const night2 = ctx.createLinearGradient(0, h * 0.3, 0, h);
      night2.addColorStop(0, 'rgba(2,4,10,0)');
      night2.addColorStop(0.35, 'rgba(2,4,10,0.75)');
      night2.addColorStop(1, 'rgba(2,4,10,0.9)');
      ctx.globalAlpha = alpha * dark;
      ctx.fillStyle = night2;
      ctx.fillRect(0, h * 0.3, w, h * 0.7);
    }
    // Monsoon clouds roll in over the ridge.
    const clouds = ramp(t, m.start - 0.5, m.start + 1.2) * (1 - ramp(t, at.title.start, at.title.start + 1.5));
    if (clouds > 0) {
      const rnd = rng(17);
      for (let i = 0; i < 16; i++) {
        const s = S * (0.5 + rnd() * 0.5);
        const cx = ((rnd() * (w + s) + (clock - m.start) * 18 * motion * (0.6 + rnd())) % (w + s)) - s / 2;
        const cy = h * (0.02 + rnd() * 0.22);
        ctx.globalAlpha = alpha * clouds * 0.75;
        ctx.drawImage(stormCloud, cx - s / 2, cy - s * 0.3, s, s * 0.6);
      }
      const deck = ctx.createLinearGradient(0, 0, 0, h * 0.45);
      deck.addColorStop(0, 'rgba(40,46,58,0.85)');
      deck.addColorStop(1, 'rgba(40,46,58,0)');
      ctx.globalAlpha = alpha * clouds;
      ctx.fillStyle = deck;
      ctx.fillRect(0, 0, w, h * 0.45);
    }
    // One flash of lightning.
    const flashT = m.start + 2.1;
    if (motion && t > flashT && t < flashT + 0.35) {
      const f = 1 - (t - flashT) / 0.35;
      ctx.globalAlpha = alpha * f * f * 0.35;
      ctx.fillStyle = '#eef2ff';
      ctx.fillRect(0, 0, w, h);
    }
    ctx.globalAlpha = 1;
  }

  /** The monsoon itself: one path of slanted streaks. */
  function drawRain(t: number, clock: number): void {
    const m = at.monsoon;
    const a = ramp(t, m.start, m.start + 0.8) * (1 - ramp(t, m.end - 0.2, m.end + 1));
    if (a <= 0) return;
    const rnd = rng(3);
    const fall = motion ? clock * 900 : 0;
    ctx.globalAlpha = a * 0.5;
    ctx.strokeStyle = 'rgba(200,220,245,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const n = Math.round((w * h) / 6000);
    for (let i = 0; i < n; i++) {
      const x0 = rnd() * (w + 200) - 100;
      const len = 16 + rnd() * 20;
      const y0 = ((((rnd() * (h + 60) + fall * (0.7 + rnd() * 0.6)) % (h + 60)) + h + 60) % (h + 60)) - 30;
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 - len * 0.22, y0 + len);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  return {
    resize,
    draw(t, clock = t) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#02040a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const d = at.descent;
      const ghats = ramp(t, d.end - 0.5, d.end + 0.4);
      if (ghats < 1) {
        ctx.drawImage(starLayer, 0, 0);
        const neb = 1 - ramp(t, at.solar.start - 0.5, at.solar.start + 1.5);
        if (neb > 0) {
          ctx.globalAlpha = neb;
          ctx.drawImage(nebula, 0, 0);
          ctx.globalAlpha = 1;
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const u = at.universe;
        const g = at.galaxy;
        const e = at.earth;
        drawUniverse(t, clock, 1 - ramp(t, u.end - 0.7, u.end + 0.2));
        drawGalaxy(t, clock, ramp(t, u.end - 0.7, u.end + 0.2) * (1 - ramp(t, g.end - 1, g.end + 0.2)));
        drawSolar(t, clock, ramp(t, g.end - 0.6, g.end + 0.6) * (1 - ramp(t, e.start + 1.6, e.start + 2.4)));
        drawEarth(t, clock, ramp(t, e.start + 1.6, e.start + 2.4) * (1 - ghats));
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawGhats(t, clock, ghats);
      drawRain(t, clock);
    },
  };
}
