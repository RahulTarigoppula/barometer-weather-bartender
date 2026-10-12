import { expect, test } from '@playwright/test';

// Weekly probe of the real API (skipped unless run with --grep @live). Never part of the normal suite.
test('@live Open-Meteo still answers with CORS for the three hosts', async ({ request }) => {
  const origin = 'https://rahultarigoppula.github.io';
  for (const url of [
    'https://api.open-meteo.com/v1/forecast?latitude=19.07&longitude=72.88&current=temperature_2m&timezone=auto',
    'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=19.07&longitude=72.88&current=european_aqi',
    'https://marine-api.open-meteo.com/v1/marine?latitude=15&longitude=65&current=wave_height',
  ]) {
    const res = await request.get(url, { headers: { Origin: origin } });
    expect(res.status(), url).toBe(200);
    expect(res.headers()['access-control-allow-origin'], url).toBe('*');
  }
});

test('@live the deployed bar serves its shell and data', async ({ page }) => {
  test.skip(!process.env.BASE_URL, 'needs BASE_URL');
  await page.goto('./');
  await expect(page.locator('.window__neon .neon')).toBeVisible();
  const geo = await page.request.get('geo/places.json');
  expect(geo.status()).toBe(200);
});
