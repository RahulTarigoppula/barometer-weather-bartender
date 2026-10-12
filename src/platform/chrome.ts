import { isNative } from './native';

/** Status bar style follows the shift (light icons at night); the splash hides once the neon has painted. */
export async function syncStatusBar(shift: 'day' | 'night'): Promise<void> {
  if (!isNative()) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: shift === 'night' ? Style.Dark : Style.Light });
  } catch {
    // older WebViews: cosmetic only
  }
}

export async function hideSplash(): Promise<void> {
  if (!isNative()) return;
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch {
    // ignore
  }
}

/** Android back: close the top-most sheet first, then walk the hash history, then exit. */
export async function onBackButton(handler: () => boolean): Promise<void> {
  if (!isNative()) return;
  const { App } = await import('@capacitor/app');
  await App.addListener('backButton', () => {
    if (handler()) return;
    if (window.location.hash && window.location.hash !== '#/') window.history.back();
    else void App.exitApp();
  });
}

/** The service worker is web-only: never inside the Capacitor WebView. */
export async function registerServiceWorker(onNeedRefresh: (update: () => void) => void): Promise<void> {
  if (isNative() || !('serviceWorker' in navigator) || import.meta.env.DEV) return;
  const { registerSW } = await import('virtual:pwa-register');
  const update = registerSW({
    onNeedRefresh: () => onNeedRefresh(() => void update(true)),
  });
}
