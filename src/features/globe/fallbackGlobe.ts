// The canvas globe: the pre-WebGL placeholder, the no-WebGL path and the context-lost path.
// Still a real instrument — drag to spin, tap to pour, keyboard to steer. Opens on India.
import { type GeoPermissibleObjects, geoArea, geoDistance, geoGraticule10, geoOrthographic, geoPath } from 'd3-geo';
import { loadIndiaOutline, loadLand } from '../../api/geo';
import { type GlobeCallbacks, type GlobeController, HOME_VIEW } from './controller';

type Ring = [number, number][];

const COLORS = {
  sea0: '#14406e',
  sea1: '#040d1f',
  grid: 'rgba(124,196,255,.12)',
  land: '#2d6b52',
  landEdge: 'rgba(160,230,200,.35)',
  india: '#ff9933',
  rim: 'rgba(124,196,255,.65)',
  glow: 'rgba(79,157,255,.35)',
  pin: '#ff9933',
  pinEdge: '#fff4e6',
};
const FILL = 0.9;

export function createFallbackGlobe(el: HTMLElement, cb: GlobeCallbacks): GlobeController {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%;height:100%;display:block';
  el.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const projection = geoOrthographic().clipAngle(90).precision(0.6);
  let rotate: [number, number] = [-HOME_VIEW.lng, -HOME_VIEW.lat];
  let land: GeoPermissibleObjects | null = null;
  let india: GeoPermissibleObjects | null = null;
  let pin: { lat: number; lng: number } | null = null;
  let w = 0;
  let h = 0;
  let paused = false;
  let dragging = false;
  let moved = 0;
  let last: [number, number] = [0, 0];
  let raf = 0;
  let tween: { from: [number, number]; to: [number, number]; t0: number; ms: number } | null = null;

  void loadLand().then((rings: Ring[]) => {
    const polys = rings.map((r) => {
      const f = { type: 'Polygon' as const, coordinates: [r] };
      return geoArea(f) > 2 * Math.PI ? [[...r].reverse()] : [r];
    });
    land = { type: 'MultiPolygon', coordinates: polys };
  });
  void loadIndiaOutline()
    .then((rings) => {
      india = { type: 'MultiLineString', coordinates: rings };
    })
    .catch(() => undefined);

  const resize = (): void => {
    const r = el.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    w = r.width;
    h = r.height;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(el);

  const draw = (): void => {
    if (!ctx || w === 0) return;
    const R = (Math.min(w, h) / 2) * FILL;
    projection
      .translate([w / 2, h / 2])
      .scale(R)
      .rotate(rotate);
    const path = geoPath(projection, ctx);
    ctx.clearRect(0, 0, w, h);
    const halo = ctx.createRadialGradient(w / 2, h / 2, R * 0.92, w / 2, h / 2, R * 1.12);
    halo.addColorStop(0, COLORS.glow);
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, w, h);
    const g = ctx.createRadialGradient(w / 2 - R * 0.3, h / 2 - R * 0.35, R * 0.1, w / 2, h / 2, R);
    g.addColorStop(0, COLORS.sea0);
    g.addColorStop(1, COLORS.sea1);
    ctx.beginPath();
    path({ type: 'Sphere' });
    ctx.fillStyle = g;
    ctx.fill();
    ctx.beginPath();
    path(geoGraticule10());
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.8;
    ctx.stroke();
    if (land) {
      ctx.beginPath();
      path(land);
      ctx.fillStyle = COLORS.land;
      ctx.fill();
      ctx.strokeStyle = COLORS.landEdge;
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }
    if (india) {
      ctx.beginPath();
      path(india);
      ctx.strokeStyle = COLORS.india;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
    ctx.beginPath();
    path({ type: 'Sphere' });
    ctx.strokeStyle = COLORS.rim;
    ctx.lineWidth = 2;
    ctx.stroke();
    if (pin) {
      const p = projection([pin.lng, pin.lat]);
      const visible = geoDistance([pin.lng, pin.lat], [-rotate[0], -rotate[1]]) < Math.PI / 2;
      if (p && visible) {
        ctx.beginPath();
        ctx.arc(p[0], p[1], 6, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.pin;
        ctx.fill();
        ctx.strokeStyle = COLORS.pinEdge;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }
  };

  const tick = (t: number): void => {
    raf = requestAnimationFrame(tick);
    if (paused) return;
    if (tween) {
      const k = Math.min(1, (t - tween.t0) / tween.ms);
      const e = 1 - (1 - k) ** 3;
      let dl = tween.to[0] - tween.from[0];
      dl = ((((dl + 180) % 360) + 360) % 360) - 180;
      rotate = [tween.from[0] + dl * e, tween.from[1] + (tween.to[1] - tween.from[1]) * e];
      if (k >= 1) tween = null;
    }
    draw();
  };
  raf = requestAnimationFrame(tick);

  const emitCenter = (): void => cb.onCenter(-rotate[1], ((((-rotate[0] + 180) % 360) + 360) % 360) - 180);

  const onDown = (e: PointerEvent): void => {
    dragging = true;
    moved = 0;
    last = [e.clientX, e.clientY];
    tween = null;
    el.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent): void => {
    if (!dragging) return;
    const dx = e.clientX - last[0];
    const dy = e.clientY - last[1];
    moved += Math.abs(dx) + Math.abs(dy);
    last = [e.clientX, e.clientY];
    const k = 70 / Math.max(80, Math.min(w, h) / 2);
    rotate = [rotate[0] + dx * k, Math.max(-85, Math.min(85, rotate[1] - dy * k))];
  };
  const onUp = (e: PointerEvent): void => {
    if (!dragging) return;
    dragging = false;
    emitCenter();
    if (moved < 6) {
      const r = el.getBoundingClientRect();
      const ll = projection.invert?.([e.clientX - r.left, e.clientY - r.top]);
      const R = (Math.min(w, h) / 2) * FILL;
      const inside = Math.hypot(e.clientX - r.left - w / 2, e.clientY - r.top - h / 2) <= R;
      if (ll && inside) cb.onPick(ll[1], ll[0]);
    }
  };
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);

  const goTo = (lat: number, lng: number, ms: number): void => {
    const to: [number, number] = [-lng, -Math.max(-85, Math.min(85, lat))];
    if (ms <= 0) {
      rotate = to;
      tween = null;
    } else tween = { from: rotate, to, t0: performance.now(), ms };
    cb.onCenter(lat, lng);
  };

  return {
    flyTo: (lat, lng) => goTo(lat, lng, cb.reduced() ? 0 : 1200),
    setPin(p) {
      pin = p ? { lat: p.lat, lng: p.lng } : null;
    },
    nudge(dLat, dLng) {
      const c = { lat: -rotate[1], lng: -rotate[0] };
      goTo(c.lat + dLat, c.lng + dLng, 200);
    },
    zoom() {
      // the canvas globe has one size; zoom is a WebGL nicety
    },
    atFarLimit: () => true,
    home: () => goTo(HOME_VIEW.lat, HOME_VIEW.lng, cb.reduced() ? 0 : 800),
    center: () => ({ lat: -rotate[1], lng: ((((-rotate[0] + 180) % 360) + 360) % 360) - 180 }),
    pause(p) {
      paused = p;
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      canvas.remove();
    },
  };
}
