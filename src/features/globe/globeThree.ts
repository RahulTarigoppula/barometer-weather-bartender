// The lazy WebGL globe chunk: a planet in space with a real day/night terminator,
// framed on India by default, with India's outline and its big cities lit up.
import {
  AdditiveBlending,
  BackSide,
  BufferGeometry,
  Color,
  DataTexture,
  DoubleSide,
  Float32BufferAttribute,
  FrontSide,
  LinearMipmapLinearFilter,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Raycaster,
  RingGeometry,
  Scene,
  ShaderMaterial,
  type Side,
  SphereGeometry,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { loadIndiaOutline } from '../../api/geo';
import { INDIA_CITIES } from '../../data/places';
import { subsolar } from '../../engine/terminator';
import { dropPin, type GlobeCallbacks, type GlobeController, HOME_VIEW, IDLE_MS, pinElement } from './controller';

const R = 100;
const base = import.meta.env.BASE_URL;
const ANDROID = import.meta.env.VITE_PLATFORM === 'android';
const RAD = Math.PI / 180;
const FOV = 34;
/** The planet fills this fraction of the shorter side of the stage. */
const FILL = 0.86;
/** Lift the planet a little so the city chips at the bottom of the stage do not cover the south. */
const LIFT = 0.06;

/** lng/lat → world position. Matches three's SphereGeometry UVs for an equirectangular texture. */
export function toVec(lat: number, lng: number, r = R): Vector3 {
  const phi = lat * RAD;
  const lam = lng * RAD;
  return new Vector3(r * Math.cos(phi) * Math.cos(lam), r * Math.sin(phi), -r * Math.cos(phi) * Math.sin(lam));
}
export function toLatLng(v: Vector3): { lat: number; lng: number } {
  const n = v.clone().normalize();
  return { lat: Math.asin(Math.max(-1, Math.min(1, n.y))) / RAD, lng: Math.atan2(-n.z, n.x) / RAD };
}

/** Camera distance at which the planet fills FILL of the shorter side, for this aspect ratio. */
function homeDistance(aspect: number): number {
  const halfV = Math.tan((FOV / 2) * RAD);
  const half = halfV * Math.min(1, aspect) * FILL;
  return R * Math.sqrt(1 + 1 / (half * half));
}

const vertexShader = `
varying vec3 vNormal;
varying vec2 vUv;
void main() {
  vNormal = normalize(mat3(modelMatrix) * normal);
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

// Day side: Blue Marble with a soft terminator. Night side: NASA Black Marble city lights.
const fragmentShader = `
uniform sampler2D dayTexture;
uniform sampler2D nightTexture;
uniform vec3 sunDirection;
uniform float hasNight;
varying vec3 vNormal;
varying vec2 vUv;
void main() {
  float intensity = dot(normalize(vNormal), normalize(sunDirection));
  vec3 day = texture2D(dayTexture, vUv).rgb;
  vec3 night = texture2D(nightTexture, vUv).rgb;
  vec3 lights = mix(day * 0.12, night * vec3(1.25, 1.05, 0.8) * 1.6 + day * 0.05, hasNight);
  vec3 lit = day * (0.7 + 0.45 * clamp(intensity, 0.0, 1.0));
  float k = smoothstep(-0.16, 0.16, intensity);
  gl_FragColor = vec4(mix(lights, lit, k), 1.0);
  #include <colorspace_fragment>
}`;

const atmosphereVertex = `
varying vec3 vNormal;
varying vec3 vView;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const atmosphereFragment = `
uniform vec3 glow;
uniform float power;
uniform float strength;
uniform float halo;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  float d = dot(vNormal, vView);
  // halo: brightest at the planet's limb, fading to nothing at its own edge; rim: a thin fresnel line
  float f = halo > 0.5 ? pow(clamp(-d, 0.0, 1.0), power) : pow(1.0 - abs(d), power);
  gl_FragColor = vec4(glow, 1.0) * f * strength;
}`;

function sunVector(now: Date): Vector3 {
  const [lng, lat] = subsolar(now);
  return toVec(lat, lng, 1);
}

function load(loader: TextureLoader, url: string, aniso: number): Promise<Texture> {
  return new Promise((resolve, reject) =>
    loader.load(
      url,
      (t) => {
        t.colorSpace = SRGBColorSpace;
        t.anisotropy = Math.min(8, aniso);
        t.minFilter = LinearMipmapLinearFilter;
        resolve(t);
      },
      undefined,
      reject,
    ),
  );
}

/** A deterministic starfield on a far sphere: it parallaxes as you spin the planet. */
function starfield(): Points {
  const n = 2600;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  let s = 7;
  const rnd = (): number => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  for (let i = 0; i < n; i++) {
    const u = rnd() * 2 - 1;
    const t = rnd() * Math.PI * 2;
    const r = 1400 + rnd() * 600;
    const q = Math.sqrt(1 - u * u);
    pos.set([r * q * Math.cos(t), r * u, r * q * Math.sin(t)], i * 3);
    const warm = rnd();
    const b = 0.55 + rnd() * 0.45;
    col.set(warm > 0.85 ? [b, b * 0.85, b * 0.7] : warm < 0.2 ? [b * 0.75, b * 0.85, b] : [b, b, b], i * 3);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new Float32BufferAttribute(col, 3));
  return new Points(
    g,
    new PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.9 }),
  );
}

const ease = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function createThreeGlobe(el: HTMLElement, cb: GlobeCallbacks): GlobeController {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, ANDROID ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';
  el.appendChild(canvas);

  const gl = renderer.getContext();
  const maxTex = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || 2048;

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 1, 5000);
  camera.position.copy(toVec(HOME_VIEW.lat, HOME_VIEW.lng, homeDistance(1)));

  const stars = starfield();
  scene.add(stars);

  const blank = new DataTexture(new Uint8Array([8, 12, 24, 255]), 1, 1);
  blank.needsUpdate = true;
  const material = new ShaderMaterial({
    uniforms: {
      dayTexture: { value: blank },
      nightTexture: { value: blank },
      sunDirection: { value: sunVector(new Date()) },
      hasNight: { value: 0 },
    },
    vertexShader,
    fragmentShader,
  });
  const globe = new Mesh(new SphereGeometry(R, 128, 96), material);
  scene.add(globe);

  const glowMat = (radius: number, color: string, power: number, strength: number, side: Side = BackSide): Mesh =>
    new Mesh(
      new SphereGeometry(radius, 96, 64),
      new ShaderMaterial({
        uniforms: {
          glow: { value: new Color(color) },
          power: { value: power },
          strength: { value: strength },
          halo: { value: side === BackSide ? 1 : 0 },
        },
        vertexShader: atmosphereVertex,
        fragmentShader: atmosphereFragment,
        side,
        blending: AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    );
  const halo = glowMat(R * 1.2, '#4f9dff', 2.2, 1.1);
  const rim = glowMat(R * 1.004, '#7cc4ff', 4.5, 0.55, FrontSide);
  scene.add(halo, rim);

  // India: the outline in saffron and the big cities as points of light.
  const india = new LineSegments(
    new BufferGeometry(),
    new LineBasicMaterial({ color: 0xff9933, transparent: true, opacity: 0.95 }),
  );
  scene.add(india);
  void loadIndiaOutline()
    .then((rings) => {
      const pts: number[] = [];
      for (const ring of rings) {
        for (let i = 1; i < ring.length; i++) {
          const a = ring[i - 1];
          const b = ring[i];
          if (!a || !b) continue;
          pts.push(...toVec(a[1], a[0], R * 1.003).toArray(), ...toVec(b[1], b[0], R * 1.003).toArray());
        }
      }
      india.geometry.setAttribute('position', new Float32BufferAttribute(pts, 3));
    })
    .catch(() => undefined);

  const cityLayer = document.createElement('div');
  cityLayer.className = 'globe-cities';
  el.appendChild(cityLayer);
  const cities = INDIA_CITIES.map((c, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `globe-city${c.capital ? ' globe-city--capital' : ''}${i < 6 ? ' globe-city--label' : ''}${c.left ? ' globe-city--left' : ''}`;
    btn.innerHTML = `<span class="globe-city__dot"></span><span class="globe-city__name">${c.name}<span class="globe-city__temp num"></span></span>`;
    btn.setAttribute('aria-label', `Weather in ${c.name}`);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      cb.onPick(c.lat, c.lng);
    });
    cityLayer.appendChild(btn);
    return { el: btn, name: c.name, pos: toVec(c.lat, c.lng, R * 1.004) };
  });

  // Textures: the small first-paint JPEG, then Blue Marble + Black Marble when the device can take them.
  const loader = new TextureLoader();
  const aniso = renderer.capabilities.getMaxAnisotropy();
  let disposed = false;
  const textures: Texture[] = [];
  const setDay = (t: Texture): void => {
    textures.push(t);
    const u = material.uniforms.dayTexture;
    if (u) u.value = t;
  };
  void load(loader, `${base}textures/earth-day.jpg`, aniso)
    .then((small) => {
      if (disposed) return;
      setDay(small);
      if (maxTex < 4096) return;
      return Promise.all([
        load(loader, `${base}textures/blue-marble-4k.webp`, aniso),
        load(
          loader,
          `${base}textures/${maxTex >= 8192 && !ANDROID ? 'black-marble-8k.webp' : 'black-marble-4k.webp'}`,
          aniso,
        ),
      ]).then(([day, night]) => {
        if (disposed) return;
        setDay(day);
        small.dispose();
        textures.push(night);
        if (material.uniforms.nightTexture) material.uniforms.nightTexture.value = night;
        if (material.uniforms.hasNight) material.uniforms.hasNight.value = 1;
      });
    })
    .catch(() => undefined);

  // Pin (HTML, projected each frame) + ripple ring lying on the surface.
  const pinEl = pinElement();
  pinEl.style.position = 'absolute';
  pinEl.style.left = '0';
  pinEl.style.top = '0';
  pinEl.style.display = 'none';
  el.appendChild(pinEl);
  let pin: Vector3 | null = null;
  const ringMat = new MeshBasicMaterial({
    color: 0xff9933,
    transparent: true,
    opacity: 0,
    side: DoubleSide,
    depthWrite: false,
  });
  const ring = new Mesh(new RingGeometry(0.9, 1, 64), ringMat);
  ring.visible = false;
  scene.add(ring);
  let ringT0 = 0;

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.rotateSpeed = 0.5;
  controls.enablePan = false;
  controls.zoomSpeed = 0.7;
  controls.autoRotateSpeed = 0.25;
  controls.autoRotate = false; // India stays in view until you move the planet

  let idle = 0;
  let touched = false;
  const stopSpin = (): void => {
    touched = true;
    controls.autoRotate = false;
    window.clearTimeout(idle);
    idle = window.setTimeout(() => {
      controls.autoRotate = !cb.reduced();
    }, IDLE_MS * 3);
  };

  let fly: { from: Vector3; to: Vector3; t0: number; ms: number } | null = null;
  const flyTo = (lat: number, lng: number, ms: number, dist?: number): void => {
    const d = dist ?? camera.position.length();
    const to = toVec(lat, lng, d);
    if (ms <= 0) {
      camera.position.copy(to);
      fly = null;
    } else fly = { from: camera.position.clone(), to, t0: performance.now(), ms };
  };

  // Tap vs drag: a tap is < 6 px of travel.
  const ray = new Raycaster();
  const ndc = new Vector2();
  let down: { x: number; y: number } | null = null;
  const onDown = (e: PointerEvent): void => {
    down = { x: e.clientX, y: e.clientY };
    fly = null;
    stopSpin();
  };
  const onUp = (e: PointerEvent): void => {
    if (!down) return;
    const moved = Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y);
    down = null;
    if (moved > 6) return;
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(globe, false)[0];
    if (hit) {
      const { lat, lng } = toLatLng(hit.point);
      cb.onPick(lat, lng);
    }
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('wheel', stopSpin, { passive: true });

  let lastCenter = 0;
  controls.addEventListener('change', () => {
    const now = performance.now();
    if (now - lastCenter < 120) return;
    lastCenter = now;
    const c = toLatLng(camera.position);
    cb.onCenter(c.lat, c.lng);
  });

  const onLost = (e: Event): void => {
    e.preventDefault();
    cb.onLost();
  };
  canvas.addEventListener('webglcontextlost', onLost);

  let w = 0;
  let h = 0;
  let home = homeDistance(1);
  const resize = (): void => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    w = r.width;
    h = r.height;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.setViewOffset(w, h, 0, h * LIFT, w, h);
    camera.updateProjectionMatrix();
    home = homeDistance(camera.aspect);
    controls.minDistance = R * 1.35;
    controls.maxDistance = home * 1.8;
    if (!touched) camera.position.setLength(home);
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(el);

  const sunTimer = window.setInterval(() => {
    material.uniforms.sunDirection?.value.copy(sunVector(new Date()));
  }, 60_000);

  const proj = new Vector3();
  const camDir = new Vector3();
  let raf = 0;
  let paused = false;
  const place = (node: HTMLElement, p: Vector3, threshold: number): void => {
    const facing = p.clone().normalize().dot(camDir) > threshold;
    node.style.visibility = facing ? 'visible' : 'hidden';
    if (!facing) return;
    proj.copy(p).project(camera);
    node.style.transform = `translate(${((proj.x + 1) / 2) * w}px, ${((1 - proj.y) / 2) * h}px)`;
  };
  const frame = (t: number): void => {
    raf = requestAnimationFrame(frame);
    if (paused) return;
    if (fly) {
      const k = Math.min(1, (t - fly.t0) / fly.ms);
      const e = ease(k);
      const dir = fly.from.clone().normalize().lerp(fly.to.clone().normalize(), e).normalize();
      const len = fly.from.length() + (fly.to.length() - fly.from.length()) * e;
      camera.position.copy(dir.multiplyScalar(len));
      if (k >= 1) fly = null;
    }
    controls.update();
    camDir.copy(camera.position).normalize();
    // Labels only when India is near the front and the planet is big enough to read them.
    const close = camera.position.length() < home * 1.25;
    for (const c of cities) {
      if (close) place(c.el, c.pos, 0.35);
      else c.el.style.visibility = 'hidden';
    }
    if (pin) {
      place(pinEl, pin, 0.08);
      pinEl.style.display = 'block';
    }
    if (ring.visible) {
      const k = Math.min(1, (t - ringT0) / 900);
      const s = 0.5 + k * ((6 * Math.PI) / 180) * R;
      ring.scale.set(s, s, s);
      ringMat.opacity = 1 - k;
      if (k >= 1) ring.visible = false;
    }
    stars.rotation.y += 0.00004;
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(frame);

  return {
    flyTo: (lat, lng) => flyTo(lat, lng, cb.reduced() ? 0 : 1200),
    setPin(p) {
      if (!p) {
        pin = null;
        pinEl.style.display = 'none';
        return;
      }
      pin = toVec(p.lat, p.lng, R * 1.002);
      ring.position.copy(toVec(p.lat, p.lng, R * 1.004));
      ring.lookAt(0, 0, 0);
      ring.visible = !cb.reduced();
      ringT0 = performance.now();
      dropPin(pinEl, cb.reduced());
    },
    nudge(dLat, dLng) {
      stopSpin();
      const c = toLatLng(camera.position);
      flyTo(Math.max(-85, Math.min(85, c.lat + dLat)), c.lng + dLng, 200);
    },
    zoom(f) {
      stopSpin();
      const len = Math.max(controls.minDistance, Math.min(controls.maxDistance, camera.position.length() * f));
      camera.position.setLength(len);
    },
    atFarLimit: () => camera.position.length() >= controls.maxDistance * 0.97,
    home() {
      touched = false;
      flyTo(HOME_VIEW.lat, HOME_VIEW.lng, cb.reduced() ? 0 : 1200, home);
    },
    center: () => toLatLng(camera.position),
    setCityTemps(temps) {
      for (const c of cities) {
        const t = c.el.querySelector('.globe-city__temp');
        const v = temps[c.name];
        if (t) t.textContent = v ? ` ${v}` : '';
        c.el.setAttribute('aria-label', v ? `Weather in ${c.name}, ${v} now` : `Weather in ${c.name}`);
      }
    },
    pause(p) {
      paused = p;
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearInterval(sunTimer);
      window.clearTimeout(idle);
      ro.disconnect();
      controls.dispose();
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      for (const t of textures) t.dispose();
      blank.dispose();
      for (const m of [globe, halo, rim, ring]) m.geometry.dispose();
      material.dispose();
      ringMat.dispose();
      stars.geometry.dispose();
      india.geometry.dispose();
      renderer.dispose();
      el.replaceChildren();
    },
  };
}
