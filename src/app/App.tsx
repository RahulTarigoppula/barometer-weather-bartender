import { lazy, type ReactElement, Suspense, useCallback, useEffect, useRef } from 'react';
import { configureAudio, setBeds, unlockAudio } from '../audio/sfx';
import { Drawer } from '../components/ui/Drawer';
import { SvgDefs } from '../components/ui/SvgDefs';
import { Toast } from '../components/ui/Toast';
import { cellKey } from '../engine/cache';
import { windowWeather } from '../engine/window';
import { BackBar } from '../features/backbar/BackBar';
import { Counter } from '../features/counter/Counter';
import { Lane } from '../features/verdict/Lane';
import { pourFromHash, verdictHash } from '../features/verdict/pour';
import { BarWindow } from '../features/window/BarWindow';
import { hideSplash, onBackButton, registerServiceWorker, syncStatusBar } from '../platform/chrome';
import { setHapticsEnabled } from '../platform/haptics';
import { db, pruneWeatherCache } from '../state/db';
import { useSettings } from '../state/settings';
import { currentVerdict, useBar } from '../state/store';
import { closeDrawer, parseRoute, useHash } from './route';
import { useReduced } from './useReduced';

const TabList = lazy(() => import('../features/tab/TabDrawer').then((m) => ({ default: m.TabList })));
const BackOffice = lazy(() => import('../features/office/BackOffice').then((m) => ({ default: m.BackOffice })));
const About = lazy(() => import('../features/about/About').then((m) => ({ default: m.About })));

const root = document.documentElement;

function flickerNeon(): void {
  for (const el of document.querySelectorAll('.neon-sign')) {
    el.classList.remove('neon--flicker');
    void (el as HTMLElement).offsetWidth;
    el.classList.add('neon--flicker');
  }
}

/** Shift, grade, menu and motion live on <html> as data attributes; tokens.css does the rest. */
function useRoomAttributes(): void {
  const verdict = useBar((s) => currentVerdict(s));
  const { shift, menu, motion, sound, volume, haptics } = useSettings();
  const reduced = useReduced();
  const prevShift = useRef<string | null>(null);

  useEffect(() => {
    const want = shift !== 'follow' ? shift : verdict ? verdict.shift : null;
    if (want) root.dataset.shift = want;
    else delete root.dataset.shift;
    const effective = want ?? (matchMedia('(prefers-color-scheme: light)').matches ? 'day' : 'night');
    if (effective === 'night' && prevShift.current === 'day' && !reduced) flickerNeon();
    prevShift.current = effective;
    void syncStatusBar(effective);
  }, [shift, verdict, reduced]);

  useEffect(() => {
    root.dataset.grade = verdict?.gradeFamily ?? 'sodium';
  }, [verdict]);

  useEffect(() => {
    root.dataset.menu = menu;
  }, [menu]);

  useEffect(() => {
    root.dataset.motion = motion;
  }, [motion]);

  useEffect(() => {
    configureAudio(sound, volume);
    setHapticsEnabled(haptics);
  }, [sound, volume, haptics]);

  // The beds follow the verdict: rain/wind noise, and the neon buzz on the night shift only.
  useEffect(() => {
    const night = (root.dataset.shift ?? 'night') === 'night';
    const w = verdict ? windowWeather(verdict) : null;
    setBeds({ rain: w?.rain ?? 0, windKmh: verdict?.features.windKmh ?? 0, neon: night && sound, reduced });
  }, [verdict, sound, reduced]);
}

function useRouting(): ReturnType<typeof parseRoute> {
  const hash = useHash();
  const route = parseRoute(hash);
  const patch = useBar((s) => s.patch);

  useEffect(() => {
    const route = parseRoute(hash);
    if (route.name === 'bad-link') {
      patch({
        coaster: { kind: 'error', error: 'nowhere', lat: 0, lng: 0, retryAt: 0 },
        slide: useBar.getState().slide + 1,
      });
      return;
    }
    if (route.name !== 'verdict') return;
    const v = currentVerdict(useBar.getState());
    if (v && verdictHash(v.lat, v.lng) === verdictHash(route.lat, route.lng)) return;
    const cell = cellKey(route.lat, route.lng);
    void db.verdicts
      .where('cell')
      .equals(cell)
      .reverse()
      .sortBy('createdAt')
      .then((rows) => pourFromHash(route.lat, route.lng, rows[0]))
      .catch(() => pourFromHash(route.lat, route.lng, undefined));
  }, [hash, patch]);

  return route;
}

export function App(): ReactElement {
  useRoomAttributes();
  const route = useRouting();
  const patch = useBar((s) => s.patch);

  const close = useCallback(() => {
    const v = currentVerdict(useBar.getState());
    closeDrawer(v ? verdictHash(v.lat, v.lng) : '#/');
  }, []);

  useEffect(() => {
    void pruneWeatherCache().catch(() => undefined);
    void hideSplash();
    void registerServiceWorker((update) => useBar.getState().patch({ restock: update }));
    void onBackButton(() => {
      const r = parseRoute(window.location.hash);
      if (r.name === 'tab' || r.name === 'office' || r.name === 'about') {
        close();
        return true;
      }
      return false;
    });
    const online = (): void => patch({ online: navigator.onLine });
    window.addEventListener('online', online);
    window.addEventListener('offline', online);
    const unlock = (): void => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', online);
    };
  }, [patch, close]);

  // Going offline flickers the neon once (§4.9).
  const isOnline = useBar((s) => s.online);
  useEffect(() => {
    if (!isOnline) flickerNeon();
  }, [isOnline]);

  return (
    <>
      <SvgDefs />
      <a className="plate skip" href="#globe">
        Skip to the globe
      </a>
      <div className="bar">
        <BackBar />
        <main className="mid" id="globe">
          <BarWindow />
          <Lane />
        </main>
        <Counter />
      </div>
      <Suspense fallback={null}>
        <Drawer open={route.name === 'tab'} title="The Tab" onClose={close}>
          <TabList onPick={close} />
        </Drawer>
        <Drawer open={route.name === 'office'} title="Back Office" onClose={close}>
          <BackOffice />
        </Drawer>
        <Drawer open={route.name === 'about'} title="Credits" onClose={close} wide>
          <About />
        </Drawer>
      </Suspense>
      <Toast />
    </>
  );
}
