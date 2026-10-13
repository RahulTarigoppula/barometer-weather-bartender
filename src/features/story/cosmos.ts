import { ease, ramp, SCENES, type Scene, type SceneId } from './timeline';

/**
 * The story's camera, in plain canvas 2D: a spiral galaxy we fall into, the Sun and its planets,
 * a pan to the third one, then a textured Earth that turns to India. No libraries, ~1 ms a frame.
 */

const at = Object.fromEntries(SCENES.map((s) => [s.id, s])) as Record<SceneId, Scene>;
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const clamp1 = (x: number): number => Math.max(-1, Math.min(1, x));
const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;

// Small deterministic PRNG so every play looks the same.
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

interface Dot {
  x: number;
  y: number;
  s: number;
  c: string;
}

const R0 = 0.08;
const PITCH = 0.3;
const armTheta = (r: number): number => Math.log(r / R0) / PITCH;

function makeGalaxy(): Dot[] {
  const rnd = rng(7);
  const gauss = (): number => (rnd() + rnd() + rnd() - 1.5) / 1.5;
  const out: Dot[] = [];
  for (let i = 0; i < 3600; i++) {
    const arm = i % 4;
    const r = R0 + (1 - R0) * rnd() ** 0.75;
    const spread = (arm < 2 ? 0.28 : 0.45) * (1.1 - r * 0.4);
    const th = armTheta(r) + arm * (Math.PI / 2) + gauss() * spread;
    const inner = r < 0.25;
    const a = (0.35 + rnd() * 0.55).toFixed(2);
    out.push({
      x: Math.cos(th) * r + gauss() * 0.02,
      y: Math.sin(th) * r + gauss() * 0.02,
      s: rnd() < 0.08 ? 1.9 : 1.1,
      c: inner ? `rgba(255,214,170,${a})` : rnd() < 0.15 ? `rgba(255,170,200,${a})` : `rgba(170,200,255,${a})`,
    });
  }
  for (let i = 0; i < 1100; i++) {
    const r = Math.abs(gauss()) * 0.16;
    const th = rnd() * TAU;
    out.push({
      x: Math.cos(th) * r,
      y: Math.sin(th) * r,
      s: 1.3,
      c: `rgba(255,226,180,${(0.4 + rnd() * 0.5).toFixed(2)})`,
    });
  }
  return out;
}

function makeStars(): Dot[] {
  const rnd = rng(42);
  return Array.from({ length: 420 }, () => ({
    x: rnd(),
    y: rnd(),
    s: rnd() < 0.1 ? 1.6 : 0.9,
    c: `rgba(220,230,255,${(0.25 + rnd() * 0.6).toFixed(2)})`,
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

export interface Cosmos {
  draw(t: number): void;
  resize(): void;
}

export function createCosmos(canvas: HTMLCanvasElement, opts: { reduced: boolean; texture: string }): Cosmos {
  const maybe = canvas.getContext('2d');
  if (!maybe) return { draw: () => undefined, resize: () => undefined };
  const ctx: CanvasRenderingContext2D = maybe;
  const motion = opts.reduced ? 0 : 1;
  const galaxy = makeGalaxy();
  const stars = makeStars();
  const img = new Image();
  let imgReady = false;
  img.onload = () => {
    imgReady = true;
  };
  img.src = opts.texture;

  let w = 0;
  let h = 0;
  let dpr = 1;
  const resize = (): void => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  };
  resize();

  function backdrop(t: number): void {
    ctx.fillStyle = '#02040a';
    ctx.fillRect(0, 0, w, h);
    for (const [i, s] of stars.entries()) {
      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 1.3 + i) * motion;
      ctx.fillStyle = s.c;
      ctx.fillRect(s.x * w, s.y * h, s.s, s.s);
    }
    ctx.globalAlpha = 1;
  }

  function drawGalaxy(t: number, alpha: number): void {
    if (alpha <= 0) return;
    const S = Math.min(w, h);
    const g = at.galaxy;
    const k = ease(ramp(t, g.start + 1, g.end + 0.4));
    const zoom = Math.exp(Math.log(40) * k);
    const rot = -t * 0.05 * motion;
    const sx = Math.cos(SUN_TH + rot) * SUN_R;
    const sy = Math.sin(SUN_TH + rot) * SUN_R;
    const fx = sx * k;
    const fy = sy * k;
    const scale = S * 0.46 * zoom;
    const cx = w / 2;
    const cy = h / 2;
    const cr = Math.cos(rot);
    const sr = Math.sin(rot);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha;
    for (const d of galaxy) {
      const x = d.x * cr - d.y * sr;
      const y = d.x * sr + d.y * cr;
      const X = cx + (x - fx) * scale;
      const Y = cy + (y - fy) * scale * 0.55;
      if (X < -4 || Y < -4 || X > w + 4 || Y > h + 4) continue;
      ctx.fillStyle = d.c;
      const s = d.s * Math.min(3, 1 + k * 1.5);
      ctx.fillRect(X, Y, s, s);
    }
    // Core glow.
    const coreX = cx - fx * scale;
    const coreY = cy - fy * scale * 0.55;
    const core = ctx.createRadialGradient(coreX, coreY, 0, coreX, coreY, 0.18 * scale);
    core.addColorStop(0, 'rgba(255,220,170,0.55)');
    core.addColorStop(1, 'rgba(255,220,170,0)');
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    // Our star, marked once the camera starts to fall towards it.
    const mark = ramp(t, g.start + 1.6, g.start + 2.6) * alpha;
    if (mark > 0) {
      const X = cx + (sx - fx) * scale;
      const Y = cy + (sy - fy) * scale * 0.55;
      const r = 4 + 10 * k;
      const glow = ctx.createRadialGradient(X, Y, 0, X, Y, r * 3);
      glow.addColorStop(0, `rgba(255,236,190,${mark})`);
      glow.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(X, Y, r * 3, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  const planetAngle = (i: number, t: number): number => {
    const p = PLANETS[i] as (typeof PLANETS)[number];
    return p.phase + t * 0.7 * (PLANETS[0].orbit / p.orbit) ** 1.5 * motion;
  };

  function drawSolar(t: number, alpha: number): void {
    if (alpha <= 0) return;
    const S = Math.min(w, h);
    const sol = at.solar;
    const pl = at.planets;
    const ts = t - sol.start;
    const earthA = planetAngle(2, ts);
    const ex = Math.cos(earthA) * PLANETS[2].orbit;
    const ey = Math.sin(earthA) * PLANETS[2].orbit * TILT;
    // Camera: arrive (0.35 → 1), then pan and close in on Earth.
    const arrive = ease(ramp(t, sol.start - 0.3, sol.start + 3));
    const close = ease(ramp(t, pl.start + 0.3, pl.end + 0.2));
    const zoom = lerp(0.35, 1, arrive) * Math.exp(Math.log(6) * close);
    const fx = ex * close;
    const fy = ey * close;
    const scale = S * 1.05 * zoom;
    const cx = w / 2;
    const cy = h / 2;
    const P = (x: number, y: number): [number, number] => [cx + (x - fx) * scale, cy + (y - fy) * scale];
    ctx.globalAlpha = alpha;
    // Orbits.
    ctx.lineWidth = 1;
    for (const p of PLANETS) {
      const [ox, oy] = P(0, 0);
      ctx.strokeStyle = p.name === 'Earth' ? 'rgba(124,196,255,0.35)' : 'rgba(124,196,255,0.12)';
      ctx.beginPath();
      ctx.ellipse(ox, oy, p.orbit * scale, p.orbit * scale * TILT, 0, 0, TAU);
      ctx.stroke();
    }
    // The Sun.
    const [sx, sy] = P(0, 0);
    const sunR = 0.028 * scale;
    const sun = ctx.createRadialGradient(sx, sy, 0, sx, sy, sunR * 4);
    sun.addColorStop(0, 'rgba(255,248,220,1)');
    sun.addColorStop(0.25, 'rgba(255,196,90,0.95)');
    sun.addColorStop(0.5, 'rgba(255,140,40,0.25)');
    sun.addColorStop(1, 'rgba(255,120,30,0)');
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(sx, sy, sunR * 4, 0, TAU);
    ctx.fill();
    // Planets, back to front by y.
    const labels = ramp(t, sol.start + 1.8, sol.start + 3) * (1 - ramp(t, pl.end - 1.2, pl.end));
    const order = PLANETS.map((p, i) => {
      const a = planetAngle(i, ts);
      return { p, x: Math.cos(a) * p.orbit, y: Math.sin(a) * p.orbit * TILT };
    }).sort((a, b) => a.y - b.y);
    for (const { p, x, y } of order) {
      const [X, Y] = P(x, y);
      const r = Math.max(1.5, p.size * scale);
      if (X < -r * 4 || Y < -r * 4 || X > w + r * 4 || Y > h + r * 4) continue;
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
        ctx.beginPath();
        ctx.arc(X, Y, r * 2.4, 0, TAU);
        ctx.fill();
      }
      if (labels > 0) {
        ctx.globalAlpha = alpha * labels * (p.name === 'Earth' ? 1 : 0.75);
        ctx.fillStyle = p.name === 'Earth' ? '#7cc4ff' : '#a9b8d8';
        ctx.font = `${p.name === 'Earth' ? 600 : 500} ${Math.round(Math.max(11, S * 0.016))}px "Space Grotesk Variable", system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(p.name, X, Y - r - 8);
        ctx.globalAlpha = alpha;
      }
    }
    ctx.globalAlpha = 1;
  }

  /** An orthographic Earth from the equirectangular texture, drawn in small tiles. */
  function drawEarth(t: number, alpha: number): void {
    if (alpha <= 0) return;
    const S = Math.min(w, h);
    const e = at.earth;
    const grow = ease(ramp(t, e.start, e.start + 3.2));
    const R = lerp(0.05, 0.34, grow) * S;
    const x = w / 2;
    const y = lerp(h / 2, h * 0.42, ease(ramp(t, at.title.start - 0.5, at.title.start + 1.5)));
    const lng0 = motion ? lerp(-10, 79, ease(ramp(t, e.start, e.end + 1))) + Math.sin(t * 0.15) * 2 : 79;
    ctx.globalAlpha = alpha;
    // Atmosphere.
    const atmo = ctx.createRadialGradient(x, y, R * 0.96, x, y, R * 1.18);
    atmo.addColorStop(0, 'rgba(110,175,255,0.55)');
    atmo.addColorStop(1, 'rgba(110,175,255,0)');
    ctx.fillStyle = atmo;
    ctx.beginPath();
    ctx.arc(x, y, R * 1.18, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, R, 0, TAU);
    ctx.clip();
    ctx.fillStyle = '#0b2a5a';
    ctx.fillRect(x - R, y - R, R * 2, R * 2);
    if (imgReady) {
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const N = R > 120 ? 34 : 18;
      const cell = (2 * R) / N;
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
          ctx.drawImage(img, u0, v0, uw, Math.max(1, v1 - v0), x + x0, y + y0, cell + 0.7, cell + 0.7);
        }
      }
    }
    // Light from the upper left; night on the far limb.
    const shade = ctx.createRadialGradient(x - R * 0.35, y - R * 0.35, R * 0.2, x, y, R * 1.05);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(0.7, 'rgba(2,4,10,0.25)');
    shade.addColorStop(1, 'rgba(2,4,10,0.85)');
    ctx.fillStyle = shade;
    ctx.fillRect(x - R, y - R, R * 2, R * 2);
    ctx.restore();
    // India, marked when the name arrives.
    const mark = ramp(t, at.title.start, at.title.start + 1.2);
    if (mark > 0) {
      const ix = x + R * Math.cos(22 * DEG) * Math.sin((79 - lng0) * DEG);
      const iy = y - R * Math.sin(22 * DEG);
      const pulse = 1 + 0.25 * Math.sin(t * 3) * motion;
      const glow = ctx.createRadialGradient(ix, iy, 0, ix, iy, R * 0.22 * pulse);
      glow.addColorStop(0, `rgba(255,153,51,${0.55 * mark})`);
      glow.addColorStop(1, 'rgba(255,153,51,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(ix, iy, R * 0.22 * pulse, 0, TAU);
      ctx.fill();
      ctx.fillStyle = `rgba(255,201,120,${mark})`;
      ctx.beginPath();
      ctx.arc(ix, iy, Math.max(2.5, R * 0.018), 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  return {
    resize,
    draw(t) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      backdrop(t);
      const g = at.galaxy;
      const e = at.earth;
      drawGalaxy(t, 1 - ramp(t, g.end - 1, g.end + 0.2));
      drawSolar(t, ramp(t, g.end - 0.6, g.end + 0.6) * (1 - ramp(t, e.start + 0.2, e.start + 1)));
      drawEarth(t, ramp(t, e.start, e.start + 0.8));
    },
  };
}
