import { ease, ramp, SCENES, type Scene, type SceneId } from './timeline';

/**
 * The story's camera, in plain canvas 2D: a deep field of galaxies, a dive into the Milky Way, the
 * Sun and its planets, a pan to the third one, a textured Earth that turns to India, and life on it.
 *
 * Built for 60 fps on a laptop and at least 24 fps on a mid-range phone: every expensive thing is
 * drawn once into a cache (starfield, nebulae, galaxy sprites, the Milky Way, the Earth sphere, the
 * forest) and blitted per frame; live stars are batched by colour; the pixel ratio is capped at 1.5.
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

/** ~4,700 stars in colour/size batches. */
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

// Where the Sun sits in the galaxy: two-thirds out, on the first arm.
const SUN_R = 0.62;
const SUN_TH = armTheta(SUN_R);
const GALAXY_SPIN = 0.05;
const TILT_G = 0.55;

/** Draws the galaxy (radius 1 → `scale` px) with a rotation, a camera focus and a star size. */
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

/** Six little galaxy sprites: four spirals and two ellipticals in different colours. */
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
      const glow = c.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N * 0.22);
      glow.addColorStop(0, `rgba(${core},0.95)`);
      glow.addColorStop(1, `rgba(${core},0)`);
      c.fillStyle = glow;
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
  return Array.from({ length: 340 }, () => ({
    x: (rnd() - 0.5) * 3.4,
    y: (rnd() - 0.5) * 2.2,
    size: 0.006 + rnd() ** 3 * 0.05,
    rot: rnd() * TAU,
    incl: 0.3 + rnd() * 0.7,
    sprite: Math.floor(rnd() * 6),
    spin: (rnd() - 0.5) * 0.04,
  }));
}

// The Milky Way in the deep field, and how big it is there (radius in field units).
const MW = { x: 0.22, y: 0.1, r: 0.03 };
const FIELD_SCALE = 0.5; // field unit → S px
const GALAXY_SCALE = 0.46; // galaxy radius → S px at the start of the galaxy scene
const DIVE = GALAXY_SCALE / (MW.r * FIELD_SCALE); // zoom at which the sprite matches the galaxy

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

// ───────────── the forest ─────────────
interface Seg {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  d: number;
}
interface Tree {
  segs: Seg[];
  leaves: { x: number; y: number; r: number; c: number }[];
  depth: number;
}

/** A seeded branching tree in local units: base at (0,0), growing up (negative y), trunk length 1. */
function makeTree(seed: number, depth: number, spread: number): Tree {
  const rnd = rng(seed);
  const segs: Seg[] = [];
  const leaves: Tree['leaves'] = [];
  const grow = (x: number, y: number, ang: number, len: number, d: number): void => {
    const x1 = x + Math.cos(ang) * len;
    const y1 = y + Math.sin(ang) * len;
    segs.push({ x0: x, y0: y, x1, y1, d });
    if (d >= depth) {
      for (let i = 0; i < 6; i++)
        leaves.push({
          x: x1 + (rnd() - 0.5) * 0.3,
          y: y1 + (rnd() - 0.5) * 0.24,
          r: 0.022 + rnd() * 0.03,
          c: Math.floor(rnd() * 4),
        });
      return;
    }
    const kids = d < 2 ? 2 : rnd() < 0.3 ? 3 : 2;
    for (let i = 0; i < kids; i++) {
      const side = kids === 2 ? (i === 0 ? -1 : 1) : i - 1;
      grow(x1, y1, ang + side * spread * (0.6 + rnd() * 0.6) + (rnd() - 0.5) * 0.2, len * (0.7 + rnd() * 0.12), d + 1);
    }
  };
  grow(0, 0, -Math.PI / 2 + (rnd() - 0.5) * 0.1, 1, 0);
  return { segs, leaves, depth };
}

/** The camera time at which the Earth fills the frame: where "zoom out to the universe" starts. */
export const EARTH_T = at.earth.start + 3.4;
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
  const trees = [
    { tree: makeTree(21, 8, 0.34), x: 0.05, hh: 0.44 },
    { tree: makeTree(34, 8, 0.32), x: 0.95, hh: 0.4 },
    { tree: makeTree(55, 7, 0.42), x: 0.2, hh: 0.2 },
    { tree: makeTree(89, 7, 0.4), x: 0.8, hh: 0.22 },
  ];

  // The Milky Way as the deep field sees it: the real star map, pre-rendered at the hand-off angle.
  const MW_PX = 512;
  const [mwSprite, mwc] = canvasOf(MW_PX, MW_PX);
  const handoffRot = -at.galaxy.start * GALAXY_SPIN * motion;
  if (mwc) {
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
  }

  // The Earth texture, downscaled once to a 1024×512 canvas (cheap to sample from every frame).
  let tex: HTMLCanvasElement | null = null;
  const img = new Image();
  img.onload = () => {
    const [c, cc] = canvasOf(1024, 512);
    cc?.drawImage(img, 0, 0, 1024, 512);
    tex = c;
    sphereKey = '';
  };
  img.src = opts.texture;

  let w = 0;
  let h = 0;
  let dpr = 1;
  let S = 1;
  const starLayer = document.createElement('canvas');
  const nebula = document.createElement('canvas');
  const sphere = document.createElement('canvas');
  const flora = document.createElement('canvas');
  let sphereKey = '';
  let floraKey = '';

  const resize = (): void => {
    dpr = Math.min(1.5, window.devicePixelRatio || 1);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    S = Math.min(w, h);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    for (const c of [starLayer, nebula, flora]) {
      c.width = canvas.width;
      c.height = canvas.height;
    }
    const sc = starLayer.getContext('2d');
    if (sc) {
      const rnd = rng(42);
      sc.fillStyle = '#02040a';
      sc.fillRect(0, 0, starLayer.width, starLayer.height);
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
    floraKey = '';
  };
  resize();

  // ── the known universe ──
  function drawUniverse(t: number, clock: number, alpha: number): void {
    if (alpha <= 0.002) return;
    const u = at.universe;
    const k = ease(ramp(t, u.start + 1.2, u.end));
    const zoom = Math.exp(Math.log(DIVE) * k) * (1 + 0.04 * ramp(t, u.start, u.start + 1.2));
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
      const sprite = sprites[g.sprite] as HTMLCanvasElement;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.translate(X, Y);
      ctx.rotate(g.rot + clock * g.spin * motion);
      ctx.scale(1, g.incl);
      ctx.drawImage(sprite, -s / 2, -s / 2, s, s);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // The Milky Way itself, which the camera dives into.
    const mx = cx + (MW.x - fx) * scale;
    const my = cy + (MW.y - fy) * scale;
    const ms = (MW.r * scale) / 0.94; // the sprite holds radius 1 at 0.47 of its width
    ctx.drawImage(mwSprite, mx - ms, my - ms, ms * 2, ms * 2);
    const tag = ramp(t, u.start + 1.6, u.start + 2.4) * (1 - ramp(t, u.end - 1.6, u.end - 0.8));
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
    const k = ease(ramp(t, g.start + 1.4, g.end + 0.4));
    const zoom = Math.exp(Math.log(40) * k);
    const rot = -clock * GALAXY_SPIN * motion;
    const sx = Math.cos(SUN_TH + rot) * SUN_R;
    const sy = Math.sin(SUN_TH + rot) * SUN_R;
    const scale = S * GALAXY_SCALE * zoom;
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
    // Our star: "you are here".
    const mark = ramp(t, g.start + 0.3, g.start + 1) * alpha;
    if (mark > 0) {
      const X = w / 2 + (sx - sx * k) * scale;
      const Y = h / 2 + (sy - sy * k) * scale * TILT_G;
      const r = 4 + 10 * k;
      const glow = ctx.createRadialGradient(X, Y, 0, X, Y, r * 3);
      glow.addColorStop(0, `rgba(255,236,190,${mark})`);
      glow.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = glow;
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
    const pl = at.planets;
    const ts = clock - sol.start;
    const earthA = planetAngle(2, ts);
    const ex = Math.cos(earthA) * PLANETS[2].orbit;
    const ey = Math.sin(earthA) * PLANETS[2].orbit * TILT;
    const arrive = ease(ramp(t, sol.start - 0.3, sol.start + 2.6));
    const close = ease(ramp(t, pl.start + 0.3, pl.end + 0.2));
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
    const labels = ramp(t, sol.start + 1.6, sol.start + 2.6) * (1 - ramp(t, pl.end - 1.2, pl.end));
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

  // ── Earth ──
  function renderSphere(D: number, lng0: number): void {
    const key = `${D}|${lng0.toFixed(2)}`;
    if (key === sphereKey || !tex) return;
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
    const iw = tex.width;
    const ih = tex.height;
    const N = D > 360 ? 40 : 24;
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
        sc.drawImage(tex, u0, v0, uw, Math.max(1, v1 - v0), R + x0, R + y0, cell + 0.8, cell + 0.8);
      }
    }
    const shade = sc.createRadialGradient(R * 0.65, R * 0.65, R * 0.2, R, R, R * 1.05);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(0.7, 'rgba(2,4,10,0.25)');
    shade.addColorStop(1, 'rgba(2,4,10,0.85)');
    sc.fillStyle = shade;
    sc.fillRect(0, 0, D, D);
    sc.restore();
  }

  function drawEarth(t: number, clock: number, alpha: number): void {
    if (alpha <= 0.002) return;
    const e = at.earth;
    const grow = ease(ramp(t, e.start, e.start + 3.2));
    // Life arrives: the planet lifts and makes room for the forest.
    const lift = ease(ramp(t, at.life.start - 0.3, at.life.start + 1.6));
    const R = lerp(0.05, 0.34, grow) * lerp(1, 0.78, lift) * S;
    const x = w / 2;
    const y = lerp(h / 2, h * 0.36, lift);
    const turn = ease(ramp(t, e.start, e.end + 1));
    // Longitude snaps to 0.25° steps so the cached sphere is reused once the turn has finished.
    const lng0 = motion ? Math.round(lerp(-10, 79, turn) * 4) / 4 : 79;
    ctx.globalAlpha = alpha;
    const atmo = ctx.createRadialGradient(x, y, R * 0.96, x, y, R * 1.18);
    atmo.addColorStop(0, 'rgba(110,175,255,0.55)');
    atmo.addColorStop(1, 'rgba(110,175,255,0)');
    ctx.fillStyle = atmo;
    ctx.fillRect(x - R * 1.18, y - R * 1.18, R * 2.36, R * 2.36);
    const D = Math.max(48, Math.min(1100, Math.ceil((2 * R * dpr) / 24) * 24));
    renderSphere(D, lng0);
    if (tex) ctx.drawImage(sphere, x - R, y - R, R * 2, R * 2);
    else {
      ctx.fillStyle = '#1d4f9a';
      ctx.beginPath();
      ctx.arc(x, y, R, 0, TAU);
      ctx.fill();
    }
    const mark = ramp(t, at.memory.start, at.memory.start + 1.2);
    if (mark > 0) {
      const ix = x + R * Math.cos(22 * DEG) * Math.sin((79 - lng0) * DEG);
      const iy = y - R * Math.sin(22 * DEG);
      const pulse = 1 + 0.25 * Math.sin(clock * 3) * motion;
      const gr = R * 0.22 * pulse;
      const glow = ctx.createRadialGradient(ix, iy, 0, ix, iy, gr);
      glow.addColorStop(0, `rgba(255,153,51,${0.55 * mark})`);
      glow.addColorStop(1, 'rgba(255,153,51,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(ix - gr, iy - gr, gr * 2, gr * 2);
      ctx.fillStyle = `rgba(255,201,120,${mark})`;
      ctx.beginPath();
      ctx.arc(ix, iy, Math.max(2.5, R * 0.018), 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ── life ──
  const LEAF = ['rgba(18,74,44,0.85)', 'rgba(28,104,58,0.8)', 'rgba(46,136,72,0.75)', 'rgba(120,190,110,0.55)'];
  function renderFlora(g: number): void {
    const key = `${g.toFixed(2)}|${w}|${h}`;
    if (key === floraKey) return;
    floraKey = key;
    const c = flora.getContext('2d');
    if (!c) return;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, flora.width, flora.height);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    // The hills.
    const ground = h * 0.93;
    const haze = c.createLinearGradient(0, h * 0.6, 0, h);
    haze.addColorStop(0, 'rgba(30,120,90,0)');
    haze.addColorStop(1, `rgba(30,120,90,${0.35 * g})`);
    c.fillStyle = haze;
    c.fillRect(0, h * 0.6, w, h * 0.4);
    c.fillStyle = '#06130d';
    c.beginPath();
    c.moveTo(0, h);
    c.lineTo(0, ground - h * 0.03);
    c.quadraticCurveTo(w * 0.25, ground - h * 0.07, w * 0.5, ground - h * 0.01);
    c.quadraticCurveTo(w * 0.75, ground + h * 0.03, w, ground - h * 0.05);
    c.lineTo(w, h);
    c.closePath();
    c.fill();
    const hillY = (x: number): number => {
      const f = x / w;
      return f < 0.5 ? ground - h * 0.03 - Math.sin(f * Math.PI) * h * 0.02 : ground - h * 0.02 * (f - 0.5) * 2;
    };
    // The trees, branch level by branch level.
    for (const { tree, x, hh } of trees) {
      const bx = x * w;
      const by = hillY(bx) + 2;
      const unit = (hh * h) / 3.1;
      const df = g * (tree.depth + 1.4);
      for (let d = 0; d <= tree.depth; d++) {
        const frac = Math.max(0, Math.min(1, df - d));
        if (frac <= 0) break;
        c.strokeStyle = d < 3 ? '#2a1d14' : '#3a2a1c';
        c.lineWidth = Math.max(0.6, unit * 0.11 * 0.7 ** d);
        c.lineCap = 'round';
        c.beginPath();
        for (const s of tree.segs) {
          if (s.d !== d) continue;
          c.moveTo(bx + s.x0 * unit, by + s.y0 * unit);
          c.lineTo(bx + (s.x0 + (s.x1 - s.x0) * frac) * unit, by + (s.y0 + (s.y1 - s.y0) * frac) * unit);
        }
        c.stroke();
      }
      const la = ramp(g, 0.62, 1);
      if (la > 0) {
        c.globalAlpha = la;
        for (let ci = 0; ci < 4; ci++) {
          c.fillStyle = LEAF[ci] as string;
          c.beginPath();
          for (const l of tree.leaves) {
            if (l.c !== ci) continue;
            const r = l.r * unit * la;
            c.moveTo(bx + l.x * unit + r, by + l.y * unit);
            c.arc(bx + l.x * unit, by + l.y * unit, r, 0, TAU);
          }
          c.fill();
        }
        c.globalAlpha = 1;
      }
    }
    // Neelakurinji: violet-blue blooms along the hills.
    const fa = ramp(g, 0.75, 1);
    if (fa > 0) {
      const rnd = rng(9);
      for (let i = 0; i < 140; i++) {
        const fx = rnd() * w;
        const fy = hillY(fx) - 2 + rnd() * h * 0.06;
        const r = (2.2 + rnd() * 3) * Math.max(0.8, S / 700) * fa;
        const tint = rnd() < 0.7 ? '150,140,255' : '220,150,255';
        c.fillStyle = `rgba(${tint},${(0.75 * fa).toFixed(2)})`;
        c.beginPath();
        for (let p = 0; p < 5; p++) {
          const a = (p / 5) * TAU + i;
          c.moveTo(fx + Math.cos(a) * r * 1.5, fy + Math.sin(a) * r * 1.5);
          c.arc(fx + Math.cos(a) * r, fy + Math.sin(a) * r, r * 0.6, 0, TAU);
        }
        c.fill();
        c.fillStyle = 'rgba(255,230,150,0.9)';
        c.fillRect(fx - 0.8, fy - 0.8, 1.6, 1.6);
      }
    }
  }

  function drawLife(t: number, clock: number): void {
    const l = at.life;
    const a = ramp(t, l.start, l.start + 0.6);
    if (a <= 0) return;
    const g = Math.round(ease(ramp(t, l.start + 0.2, l.start + 3.8)) * 100) / 100;
    renderFlora(g);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = a;
    ctx.drawImage(flora, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Fireflies.
    const fa = ramp(t, l.start + 2, l.start + 3.5) * a;
    if (fa > 0) {
      const rnd = rng(5);
      for (let i = 0; i < 48; i++) {
        const bx = rnd() * w;
        const by = h * (0.62 + rnd() * 0.3);
        const x = bx + Math.sin(clock * 0.6 + i) * 18 * motion;
        const y = by + Math.cos(clock * 0.45 + i * 1.7) * 12 * motion;
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(clock * 1.7 + i * 2.3));
        ctx.globalAlpha = fa * tw * 0.35;
        ctx.fillStyle = 'rgba(220,255,140,1)';
        ctx.fillRect(x - 3, y - 3, 6, 6);
        ctx.globalAlpha = fa * tw;
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }
    ctx.globalAlpha = 1;
  }

  /** The monsoon arrives with the memory: one path of slanted streaks. */
  function drawRain(t: number, clock: number): void {
    const m = at.memory;
    const a = ramp(t, m.start, m.start + 0.8) * (1 - ramp(t, m.end - 0.4, m.end + 0.8));
    if (a <= 0) return;
    const rnd = rng(3);
    const fall = motion ? clock * 900 : 0;
    ctx.globalAlpha = a * 0.55;
    ctx.strokeStyle = 'rgba(190,215,255,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const n = Math.round((w * h) / 9000);
    for (let i = 0; i < n; i++) {
      const x0 = rnd() * (w + 200) - 100;
      const len = 14 + rnd() * 18;
      const y0 = ((((rnd() * (h + 60) + fall * (0.7 + rnd() * 0.6)) % (h + 60)) + h + 60) % (h + 60)) - 30;
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 - len * 0.25, y0 + len);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  return {
    resize,
    draw(t, clock = t) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(starLayer, 0, 0);
      // Nebulae glow behind the deep field and the galaxy, then fade as we reach the Sun.
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
      drawSolar(t, clock, ramp(t, g.end - 0.6, g.end + 0.6) * (1 - ramp(t, e.start + 0.2, e.start + 1)));
      drawEarth(t, clock, ramp(t, e.start, e.start + 0.8));
      drawLife(t, clock);
      drawRain(t, clock);
    },
  };
}
