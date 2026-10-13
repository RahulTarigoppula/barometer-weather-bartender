import { lazy, type ReactElement, Suspense, useCallback, useEffect, useState } from 'react';
import { configureAudio, setBeds, unlockAudio } from '../audio/sfx';
import { Drawer } from '../components/ui/Drawer';
import { Toast } from '../components/ui/Toast';
import { cellKey } from '../engine/cache';
import { hourMood } from '../engine/outlook';
import { windowWeather } from '../engine/window';
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
const DrinkCard = lazy(() => import('../features/drink/DrinkCard').then((m) => ({ default: m.DrinkCard })));
const Forecast = lazy(() => import('../features/weather/Forecast').then((m) => ({ default: m.Forecast })));
const RoadsCard = lazy(() => import('../features/roads/RoadsCard').then((m) => ({ default: m.RoadsCard })));
const IndiaNow = lazy(() => import('../features/india/IndiaNow').then((m) => ({ default: m.IndiaNow })));
const Story = lazy(() => import('../features/story/Story').then((m) => ({ default: m.Story })));
const CosmosZoom = lazy(() => import('../features/story/CosmosZoom').then((m) => ({ default: m.CosmosZoom })));
const About = lazy(() => import('../features/about/About').then((m) => ({ default: m.About })));

const root = document.documentElement;

/** Grade, menu and motion live on <html> as data attributes; the CSS does the rest. */
function useRoomAttributes(): void {
  const verdict = useBar((s) => currentVerdict(s));
  const peekHour = useBar((s) => s.peekHour);
  const { menu, motion, sound, volume, haptics } = useSettings();
  const reduced = useReduced();

  useEffect(() => {
    root.dataset.grade = verdict?.gradeFamily ?? 'none';
    root.dataset.daylight = verdict ? (verdict.features.isDay ? 'day' : 'night') : 'night';
    // The mahaul of the page: the local hour and the sky over the place you are looking at.
    const part = verdict?.features.dayPart;
    root.dataset.hour =
      part === 'dawn'
        ? 'dawn'
        : part === 'golden' || (part === 'evening' && (verdict?.features.minutesToSunset ?? -999) > -75)
          ? 'dusk'
          : verdict?.features.isDay
            ? 'day'
            : 'night';
    const g = verdict?.gradeFamily;
    root.dataset.sky =
      g === 'rain' || g === 'storm'
        ? 'rain'
        : g === 'fog'
          ? 'fog'
          : (verdict?.features.usAqi ?? 0) > 150
            ? 'haze'
            : g === 'snow' || g === 'cold'
              ? 'cold'
              : 'clear';
    // Scrubbing the next 24 hours: the page takes the light and sky of that hour.
    const peek = peekHour === null ? undefined : verdict?.forecast?.hours[peekHour];
    if (peek) {
      const m = hourMood(peek);
      root.dataset.hour = m.hour;
      if (m.sky !== 'clear' || root.dataset.sky !== 'haze') root.dataset.sky = m.sky;
    }
    void syncStatusBar('night');
  }, [verdict, peekHour]);

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

/** Weather first: on open, show the last place you looked at, or New Delhi. */
let opened = false;
async function openingPour(): Promise<void> {
  if (opened) return; // StrictMode runs effects twice; pour once
  opened = true;
  try {
    const last = await db.verdicts.orderBy('createdAt').last();
    if (last) return repour(last);
  } catch {
    // no IndexedDB (private mode), fall through
  }
  return pour(DEFAULT_PLACE.lat, DEFAULT_PLACE.lng, DEFAULT_PLACE.name);
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

  // The opening story plays on every load (skippable; never under automation) and on demand at #/story.
  const [storyDone, setStoryDone] = useState(() => navigator.webdriver);
  const showStory = route.name === 'story' || !storyDone;
  const cosmos = useBar((s) => s.cosmos);
  const closeCosmos = useCallback(() => useBar.getState().patch({ cosmos: false }), []);
  useEffect(() => {
    useBar.getState().patch({ stagePaused: showStory || cosmos });
  }, [showStory, cosmos]);
  const endStory = useCallback(() => {
    setStoryDone(true);
    useSettings.getState().set({ storySeen: true });
    if (parseRoute(window.location.hash).name === 'story') {
      const v = currentVerdict(useBar.getState());
      window.location.replace(v ? verdictHash(v.lat, v.lng) : '#/');
    }
  }, []);

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
                A new version is ready. Refresh
              </button>
            )}
            <WeatherCard />
            <Suspense fallback={null}>
              <Forecast />
            </Suspense>
            <Suspense
              fallback={
                <section className="card drink drink--waiting" aria-busy="true" aria-label="The bartender is choosing">
                  <div className="skel skel--lg" />
                  <div className="skel skel--xl" />
                </section>
              }
            >
              <DrinkCard />
            </Suspense>
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
      {cosmos && !showStory && (
        <Suspense fallback={<div className="cosmos" />}>
          <CosmosZoom onClose={closeCosmos} />
        </Suspense>
      )}
      {showStory && (
        <Suspense fallback={<div className="story-intro" />}>
          <Story onDone={endStory} />
        </Suspense>
      )}
    </>
  );
}
