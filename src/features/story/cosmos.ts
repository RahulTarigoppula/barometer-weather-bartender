import { ease, ramp, SCENES, type Scene, type SceneId } from './timeline';

/**
 * The story's camera, in plain canvas 2D: a spiral galaxy we fall into, the Sun and its planets,
 * a pan to the third one, then a textured Earth that turns to India.
 *
 * Built for 60 fps on a laptop and ≥ 24 fps on a mid-range phone: the starfield is pre-rendered,
 * galaxy stars are batched by colour (one fillStyle per batch), the Earth sphere is rendered into
 * a cache that is reused while it neither grows nor turns, and the pixel ratio is capped at 1.5.
 */

const at = Object.fromEntries(SCENES.map((s) => [s.id, s])) as Record<SceneId, Scene>;
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const clamp1 = (x: number): number => Math.max(-1, Math.min(1, x));
const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;

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

interface Batch {
  style: string;
  size: number;
  x: Float32Array;
  y: Float32Array;
}

const R0 = 0.08;
const PITCH = 0.3;
const armTheta = (r: number): number => Math.log(r / R0) / PITCH;

/** ~4,700 stars in 12 colour/size batches. */
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

/** The camera time at which the Earth fills the frame — where "zoom out to the universe" starts. */
export const EARTH_T = at.earth.start + 3.4;

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

  // The Earth texture, downscaled once to a 1024×512 canvas (cheap to sample from every frame).
  let tex: HTMLCanvasElement | null = null;
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 512;
    c.getContext('2d')?.drawImage(img, 0, 0, 1024, 512);
    tex = c;
    sphereKey = '';
  };
  img.src = opts.texture;

  let w = 0;
  let h = 0;
  let dpr = 1;
  const starLayer = document.createElement('canvas');
  const sphere = document.createElement('canvas');
  let sphereKey = '';

  const resize = (): void => {
    dpr = Math.min(1.5, window.devicePixelRatio || 1);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    starLayer.width = canvas.width;
    starLayer.height = canvas.height;
    const sc = starLayer.getContext('2d');
    if (sc) {
      const rnd = rng(42);
      sc.fillStyle = '#02040a';
      sc.fillRect(0, 0, starLayer.width, starLayer.height);
      const n = Math.round((w * h) / 2200);
      for (let i = 0; i < n; i++) {
        sc.fillStyle = `rgba(220,230,255,${(0.2 + rnd() * 0.6).toFixed(2)})`;
        const s = (rnd() < 0.1 ? 1.6 : 0.9) * dpr;
        sc.fillRect(rnd() * starLayer.width, rnd() * starLayer.height, s, s);
      }
    }
    sphereKey = '';
  };
  resize();

  function drawGalaxy(t: number, clock: number, alpha: number): void {
    if (alpha <= 0.002) return;
    const S = Math.min(w, h);
    const g = at.galaxy;
    const k = ease(ramp(t, g.start + 2.2, g.end + 0.4));
    const zoom = Math.exp(Math.log(40) * k);
    const rot = -clock * 0.05 * motion;
    const sx = Math.cos(SUN_TH + rot) * SUN_R;
    const sy = Math.sin(SUN_TH + rot) * SUN_R;
    const fx = sx * k;
    const fy = sy * k;
    const scale = S * 0.46 * zoom;
    const cx = w / 2;
    const cy = h / 2;
    const cr = Math.cos(rot);
    const sr = Math.sin(rot);
    const grow = Math.min(3, 1 + k * 1.5);
    ctx.globalAlpha = alpha;
    // Rotation + projection folded into one affine map per star: X = a·x + b·y + c, Y = d·x + e·y + f.
    const a = cr * scale;
    const b = -sr * scale;
    const c = cx - fx * scale;
    const d = sr * scale * 0.55;
    const e = cr * scale * 0.55;
    const f = cy - fy * scale * 0.55;
    for (const batch of galaxy) {
      ctx.fillStyle = batch.style;
      const s = batch.size * grow;
      const xs = batch.x;
      const ys = batch.y;
      for (let i = 0; i < xs.length; i++) {
        const x = xs[i] as number;
        const y = ys[i] as number;
        const X = a * x + b * y + c;
        if (X < -4 || X > w + 4) continue;
        const Y = d * x + e * y + f;
        if (Y < -4 || Y > h + 4) continue;
        ctx.fillRect(X, Y, s, s);
      }
    }
    // Core glow.
    const coreX = c;
    const coreY = f;
    const cr0 = 0.18 * scale;
    if (coreX > -cr0 && coreX < w + cr0 && coreY > -cr0 && coreY < h + cr0) {
      const core = ctx.createRadialGradient(coreX, coreY, 0, coreX, coreY, cr0);
      core.addColorStop(0, 'rgba(255,220,170,0.55)');
      core.addColorStop(1, 'rgba(255,220,170,0)');
      ctx.fillStyle = core;
      ctx.fillRect(coreX - cr0, coreY - cr0, cr0 * 2, cr0 * 2);
    }
    // Our star — "you are here".
    const mark = ramp(t, g.start + 0.9, g.start + 1.7) * alpha;
    if (mark > 0) {
      const X = cx + (sx - fx) * scale;
      const Y = cy + (sy - fy) * scale * 0.55;
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
        ctx.font = `600 ${Math.round(Math.max(11, S * 0.017))}px "Space Grotesk Variable", system-ui, sans-serif`;
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

  function drawSolar(t: number, clock: number, alpha: number): void {
    if (alpha <= 0.002) return;
    const S = Math.min(w, h);
    const sol = at.solar;
    const pl = at.planets;
    const ts = clock - sol.start;
    const earthA = planetAngle(2, ts);
    const ex = Math.cos(earthA) * PLANETS[2].orbit;
    const ey = Math.sin(earthA) * PLANETS[2].orbit * TILT;
    const arrive = ease(ramp(t, sol.start - 0.3, sol.start + 3));
    const close = ease(ramp(t, pl.start + 0.3, pl.end + 0.2));
    const zoom = lerp(0.35, 1, arrive) * Math.exp(Math.log(6) * close);
    const fx = ex * close;
    const fy = ey * close;
    const scale = S * 1.05 * zoom;
    const cx = w / 2;
    const cy = h / 2;
    const ox = cx - fx * scale;
    const oy = cy - fy * scale;
    ctx.globalAlpha = alpha;
    // Orbits (one path for the seven quiet ones, one for Earth).
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
    // The Sun.
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
    // Planets, back to front.
    const labels = ramp(t, sol.start + 1.8, sol.start + 3) * (1 - ramp(t, pl.end - 1.2, pl.end));
    const font = `${Math.round(Math.max(11, S * 0.016))}px "Space Grotesk Variable", system-ui, sans-serif`;
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
        ctx.font = `${p.name === 'Earth' ? 600 : 500} ${font}`;
        ctx.textAlign = 'center';
        ctx.fillText(p.name, X, Y - r - 8);
        ctx.globalAlpha = alpha;
      }
    }
    ctx.globalAlpha = 1;
  }

  /** Renders the orthographic Earth into the cache canvas (only when its size or longitude changes). */
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
    const S = Math.min(w, h);
    const e = at.earth;
    const grow = ease(ramp(t, e.start, e.start + 3.2));
    const R = lerp(0.05, 0.34, grow) * S;
    const x = w / 2;
    const y = lerp(h / 2, h * 0.42, ease(ramp(t, at.title.start - 0.5, at.title.start + 1.5)));
    const turn = ease(ramp(t, e.start, e.end + 1));
    // Longitude snaps to 0.25° steps so the cached sphere is reused once the turn has finished.
    const lng0 = motion ? Math.round(lerp(-10, 79, turn) * 4) / 4 : 79;
    ctx.globalAlpha = alpha;
    const atmo = ctx.createRadialGradient(x, y, R * 0.96, x, y, R * 1.18);
    atmo.addColorStop(0, 'rgba(110,175,255,0.55)');
    atmo.addColorStop(1, 'rgba(110,175,255,0)');
    ctx.fillStyle = atmo;
    ctx.fillRect(x - R * 1.18, y - R * 1.18, R * 2.36, R * 2.36);
    // The cache is rendered at device resolution, in 24 px steps while it grows.
    const D = Math.max(48, Math.min(1100, Math.ceil((2 * R * dpr) / 24) * 24));
    renderSphere(D, lng0);
    if (tex) ctx.drawImage(sphere, x - R, y - R, R * 2, R * 2);
    else {
      ctx.fillStyle = '#1d4f9a';
      ctx.beginPath();
      ctx.arc(x, y, R, 0, TAU);
      ctx.fill();
    }
    // India, marked from the memory onwards.
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
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const g = at.galaxy;
      const e = at.earth;
      drawGalaxy(t, clock, 1 - ramp(t, g.end - 1, g.end + 0.2));
      drawSolar(t, clock, ramp(t, g.end - 0.6, g.end + 0.6) * (1 - ramp(t, e.start + 0.2, e.start + 1)));
      drawEarth(t, clock, ramp(t, e.start, e.start + 0.8));
      drawRain(t, clock);
    },
  };
}
