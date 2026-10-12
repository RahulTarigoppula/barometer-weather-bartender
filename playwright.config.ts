import { defineConfig, devices } from '@playwright/test';

const base = process.env.VITE_BASE_PATH ?? '/';
const live = process.env.BASE_URL;

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  forbidOnly: Boolean(process.env.CI),
  retries: 0, // flake budget: zero
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: live ?? `http://localhost:4173${base}`,
    timezoneId: 'Asia/Kolkata',
    serviceWorkers: 'block',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'pixel7', use: { ...devices['Pixel 7'] } },
  ],
  ...(live
    ? {}
    : {
        webServer: {
          command: 'npx vite preview --port 4173 --strictPort',
          url: `http://localhost:4173${base}`,
          reuseExistingServer: !process.env.CI,
          timeout: 60_000,
        },
      }),
});
