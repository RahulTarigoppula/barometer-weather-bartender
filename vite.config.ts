import { execSync } from 'node:child_process';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

const base = process.env.VITE_BASE_PATH ?? '/'; // "/<repo>/" on Pages, "/" locally and in the APK
const sha = (() => {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'dev';
  }
})();

export default defineConfig({
  base,
  define: { __APP_VERSION__: JSON.stringify(`${pkg.version}+${sha}`) },
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
  plugins: [
    react(),
    visualizer({ filename: 'dist/stats.json', template: 'raw-data', gzipSize: true }),
    VitePWA({
      registerType: 'autoUpdate', // new builds take over on the next load
      injectRegister: null, // registered by hand, web only
      manifest: {
        name: 'Mausam ka Mahaul — weather, roads and the right drink',
        short_name: 'Mausam',
        description: 'Live weather on a 3D planet that opens on India, then the drink it calls for — at your budget.',
        id: base,
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'any',
        background_color: '#02040a',
        theme_color: '#02040a',
        icons: [
          { src: 'icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-1024.png', sizes: '1024x1024', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: [
          '**/*.{js,css,html}',
          'assets/*latin-wght-normal*.woff2',
          'geo/countries-110m.json',
          'geo/places.json',
          'geo/marine-50m.json',
          'geo/land-dots.json',
          'geo/land-110m.json',
          'geo/india-outline.json',
          'textures/earth-day.jpg',
          'icons/*.{png,svg}',
        ],
        globIgnores: ['**/textures/*.webp', '**/geo/countries-50m.json', 'stats.json'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.webp') || url.pathname.endsWith('countries-50m.json'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'bar-heavy-v1',
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 30 }, // C4 — four, not eight
            },
          },
          // NEVER let Workbox answer a weather call: Dexie is the cache and staleness is a UI state.
          { urlPattern: /^https:\/\/[a-z-]*\.?open-meteo\.com\//, handler: 'NetworkOnly' },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
});
