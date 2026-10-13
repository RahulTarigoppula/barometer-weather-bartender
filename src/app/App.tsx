import { lazy, type ReactElement, Suspense, useCallback, useEffect } from 'react';
import { configureAudio, setBeds, unlockAudio } from '../audio/sfx';
import { Drawer } from '../components/ui/Drawer';
import { Toast } from '../components/ui/Toast';
import { cellKey } from '../engine/cache';
import { windowWeather } from '../engine/window';
import { DrinkCard } from '../features/drink/DrinkCard';
import { Footer } from '../features/shell/Footer';
import { Hero } from '../features/shell/Hero';
import { TopBar } from '../features/shell/TopBar';
import { RecentRounds } from '../features/tab/RecentRounds';
import { DEFAULT_PLACE, pour, pourFromHash, repour, verdictHash } from '../features/verdict/pour';
import { WeatherCard } from '../features/weather/WeatherCard';
import { hideSplash, onBackButton, registerServiceWorker, syncStatusBar } from '../platform/chrome';
import { setHapticsEnabled } from '../platform/haptics';
import { db, pruneWeatherCache } from '../state/db';
import { useSettings } from '../state/settings';
import { currentVerdict, useBar } from '../state/store';
import { closeDrawer, parseRoute, useHash } from './route';
import { useReduced } from './useReduced';

const TabList = lazy(() => import('../features/tab/TabDrawer').then((m) => ({ default: m.TabList })));
const BackOffice = lazy(() => import('../features/office/BackOffice').then((m) => ({ default: m.BackOffice })));
const Forecast = lazy(() => import('../features/weather/Forecast').then((m) => ({ default: m.Forecast })));
const RoadsCard = lazy(() => import('../features/roads/RoadsCard').then((m) => ({ default: m.RoadsCard })));
const IndiaNow = lazy(() => import('../features/india/IndiaNow').then((m) => ({ default: m.IndiaNow })));
const About = lazy(() => import('../features/about/About').then((m) => ({ default: m.About })));

const root = document.documentElement;

/** Grade, menu and motion live on <html> as data attributes; the CSS does the rest. */
function useRoomAttributes(): void {
  const verdict = useBar((s) => currentVerdict(s));
  const { menu, motion, sound, volume, haptics } = useSettings();
  const reduced = useReduced();

  useEffect(() => {
    root.dataset.grade = verdict?.gradeFamily ?? 'none';
    root.dataset.daylight = verdict ? (verdict.features.isDay ? 'day' : 'night') : 'night';
    void syncStatusBar('night');
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

  // A soft rain/wind bed follows the weather.
  useEffect(() => {
    const w = verdict ? windowWeather(verdict) : null;
    setBeds({ rain: w?.rain ?? 0, windKmh: verdict?.features.windKmh ?? 0, neon: false, reduced });
  }, [verdict, reduced]);
}

/** Weather first: on open, show the last place you looked at — or New Delhi. */
let opened = false;
async function openingPour(): Promise<void> {
  if (opened) return; // StrictMode runs effects twice; pour once
  opened = true;
  try {
    const last = await db.verdicts.orderBy('createdAt').last();
    if (last) return repour(last);
  } catch {
    // no IndexedDB (private mode) — fall through
  }
  return pour(DEFAULT_PLACE.lat, DEFAULT_PLACE.lng);
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
    if (route.name !== 'verdict') {
      if (useBar.getState().coaster.kind === 'empty') void openingPour();
      return;
    }
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

  const restock = useBar((s) => s.restock);

  return (
    <>
      <a className="btn skip" href="#main">
        Skip to the weather
      </a>
      <div className="app">
        <TopBar />
        <div className="layout">
          <Hero />
          <main className="panel" id="main">
            {restock && (
              <button type="button" className="chip chip--action" onClick={restock}>
                A new version is ready — refresh
              </button>
            )}
            <WeatherCard />
            <Suspense fallback={null}>
              <Forecast />
            </Suspense>
            <DrinkCard />
            <Suspense fallback={null}>
              <RoadsCard />
              <IndiaNow />
            </Suspense>
            <RecentRounds />
          </main>
        </div>
        <Footer />
      </div>
      <Suspense fallback={null}>
        <Drawer open={route.name === 'tab'} title="History" onClose={close}>
          <TabList onPick={close} />
        </Drawer>
        <Drawer open={route.name === 'office'} title="Settings" onClose={close}>
          <BackOffice />
        </Drawer>
        <Drawer open={route.name === 'about'} title="Our story & credits" onClose={close} wide>
          <About />
        </Drawer>
      </Suspense>
      <Toast />
    </>
  );
}
