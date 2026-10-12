// The lazy WebGL globe chunk: a lean three.js planet with a real day/night terminator.
// (globe.gl was the original plan; its unused layers — hexbins, tiles, h3 — blew the 320 KB budget.)
import {
  AdditiveBlending,
  BackSide,
  Color,
  DataTexture,
  DoubleSide,
  LinearMipmapLinearFilter,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Raycaster,
  RingGeometry,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { subsolar } from '../../engine/terminator';
import { dropPin, type GlobeCallbacks, type GlobeController, IDLE_MS, pinElement } from './controller';

const R = 100;
const base = import.meta.env.BASE_URL;
const ANDROID = import.meta.env.VITE_PLATFORM === 'android';
const RAD = Math.PI / 180;

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

const vertexShader = `
varying vec3 vNormal;
varying vec2 vUv;
void main() {
  vNormal = normalize(mat3(modelMatrix) * normal);
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

// Day/night blend along the real terminator. The night side is NASA Black Marble, warmed toward
// sodium so the planet belongs to the bar instead of a navy space render.
const fragmentShader = `
uniform sampler2D dayTexture;
uniform sampler2D nightTexture;
uniform vec3 sunDirection;
uniform vec3 nightTint;
uniform float hasNight;
varying vec3 vNormal;
varying vec2 vUv;
void main() {
  float intensity = dot(normalize(vNormal), normalize(sunDirection));
  vec3 day = texture2D(dayTexture, vUv).rgb;
  vec3 night = texture2D(nightTexture, vUv).rgb;
  vec3 lights = mix(day * 0.18, night * nightTint * 1.4 + vec3(0.03, 0.02, 0.012), hasNight);
  vec3 lit = day * (0.62 + 0.38 * clamp(intensity * 1.6 + 0.35, 0.0, 1.0));
  float k = smoothstep(-0.14, 0.14, intensity);
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
varying vec3 vNormal;
varying vec3 vView;
void main() {
  float f = pow(1.0 - abs(dot(vNormal, vView)), 2.2);
  gl_FragColor = vec4(glow, 1.0) * f * 0.85;
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
        t.anisotropy = Math.min(4, aniso);
        t.minFilter = LinearMipmapLinearFilter;
        resolve(t);
      },
      undefined,
      reject,
    ),
  );
}

const ease = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function createThreeGlobe(el: HTMLElement, cb: GlobeCallbacks): GlobeController {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, ANDROID ? 1.5 : 1.75));
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';
  el.appendChild(canvas);

  const gl = renderer.getContext();
  const maxTex = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || 2048;

  const scene = new Scene();
  const camera = new PerspectiveCamera(36, 1, 1, 4000);
  camera.position.copy(toVec(20, 40, R * 3.4));

  const blank = new DataTexture(new Uint8Array([8, 6, 4, 255]), 1, 1);
  blank.needsUpdate = true;
  const material = new ShaderMaterial({
    uniforms: {
      dayTexture: { value: blank },
      nightTexture: { value: blank },
      sunDirection: { value: sunVector(new Date()) },
      nightTint: { value: new Color('#FFC27A') },
      hasNight: { value: 0 },
    },
    vertexShader,
    fragmentShader,
  });
  const globe = new Mesh(new SphereGeometry(R, 96, 64), material);
  scene.add(globe);

  const atmosphere = new Mesh(
    new SphereGeometry(R * 1.1, 64, 48),
    new ShaderMaterial({
      uniforms: { glow: { value: new Color('#C9962B') } },
      vertexShader: atmosphereVertex,
      fragmentShader: atmosphereFragment,
      side: BackSide,
      blending: AdditiveBlending,
      transparent: true,
      depthWrite: false,
    }),
  );
  scene.add(atmosphere);

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
        small.dispose(); // the small texture is not needed once the big one is up
        textures.push(night);
        if (material.uniforms.nightTexture) material.uniforms.nightTexture.value = night;
        if (material.uniforms.hasNight) material.uniforms.hasNight.value = 1;
      });
    })
    .catch(() => undefined);

  // Pin (HTML, projected each frame) + ripple ring (a mesh lying on the surface).
  const pinEl = pinElement();
  pinEl.style.position = 'absolute';
  pinEl.style.left = '0';
  pinEl.style.top = '0';
  el.appendChild(pinEl);
  let pin: Vector3 | null = null;
  const ringMat = new MeshBasicMaterial({
    color: 0xf5c860,
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
  controls.dampingFactor = 0.045;
  controls.rotateSpeed = 0.55;
  controls.enablePan = false;
  controls.minDistance = R * 1.7;
  controls.maxDistance = R * 5;
  controls.zoomSpeed = 0.6;
  controls.autoRotateSpeed = 0.35;
  controls.autoRotate = !cb.reduced();

  let idle = 0;
  const stopSpin = (): void => {
    controls.autoRotate = false;
    window.clearTimeout(idle);
    idle = window.setTimeout(() => {
      controls.autoRotate = !cb.reduced();
    }, IDLE_MS);
  };

  let fly: { from: Vector3; to: Vector3; t0: number; ms: number } | null = null;
  const flyTo = (lat: number, lng: number, ms: number, dist?: number): void => {
    stopSpin();
    const d = dist ?? Math.max(controls.minDistance, Math.min(camera.position.length(), R * 2.7));
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
  const resize = (): void => {
    const r = el.getBoundingClientRect();
    if (r.width === 0) return;
    w = r.width;
    h = r.height;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(el);

  const sunTimer = window.setInterval(() => {
    material.uniforms.sunDirection?.value.copy(sunVector(new Date()));
  }, 60_000);

  const proj = new Vector3();
  let raf = 0;
  let paused = false;
  const frame = (t: number): void => {
    raf = requestAnimationFrame(frame);
    if (paused) return;
    if (fly) {
      const k = Math.min(1, (t - fly.t0) / fly.ms);
      const e = ease(k);
      // slerp-ish: interpolate direction and length separately so the camera arcs over the surface
      const dir = fly.from.clone().normalize().lerp(fly.to.clone().normalize(), e).normalize();
      const len = fly.from.length() + (fly.to.length() - fly.from.length()) * e;
      camera.position.copy(dir.multiplyScalar(len));
      if (k >= 1) fly = null;
    }
    controls.update();
    if (pin) {
      proj.copy(pin).project(camera);
      const facing = pin.clone().normalize().dot(camera.position.clone().normalize()) > 0.12;
      pinEl.style.display = facing ? 'block' : 'none';
      pinEl.style.transform = `translate(${((proj.x + 1) / 2) * w}px, ${((1 - proj.y) / 2) * h}px)`;
    }
    if (ring.visible) {
      const k = Math.min(1, (t - ringT0) / 900);
      const s = 0.5 + k * ((6 * Math.PI) / 180) * R;
      ring.scale.set(s, s, s);
      ringMat.opacity = 1 - k;
      if (k >= 1) ring.visible = false;
    }
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(frame);

  return {
    flyTo: (lat, lng) => flyTo(lat, lng, cb.reduced() ? 0 : 1200, R * 2.9),
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
      const c = toLatLng(camera.position);
      flyTo(Math.max(-85, Math.min(85, c.lat + dLat)), c.lng + dLng, 200);
    },
    zoom(f) {
      stopSpin();
      const len = Math.max(controls.minDistance, Math.min(controls.maxDistance, camera.position.length() * f));
      camera.position.setLength(len);
    },
    center: () => toLatLng(camera.position),
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
      globe.geometry.dispose();
      material.dispose();
      atmosphere.geometry.dispose();
      ring.geometry.dispose();
      ringMat.dispose();
      renderer.dispose();
      el.replaceChildren();
    },
  };
}
