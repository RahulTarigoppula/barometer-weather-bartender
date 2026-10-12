import { expect, test } from '@playwright/test';
import { HOUSE_TIME, routeWeather } from './fixtures';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(HOUSE_TIME);
});

test('the bar exists before anything is asked of it', async ({ page }) => {
  const seen = await routeWeather(page);
  await page.goto('./');
  await expect(page.locator('.window__neon .neon')).toBeVisible();
  await expect(page.locator('.bottle')).toHaveCount(12);
  await expect(page.getByRole('meter', { name: 'Wall barometer' })).toHaveAttribute('aria-valuetext', 'No reading');
  await expect(page.getByRole('application')).toBeVisible();
  await expect(page.getByText('He has opinions about your humidity.')).toBeVisible();
  await page.waitForTimeout(1500);
  expect(seen.meteo, 'no weather request before a pour').toHaveLength(0);
  expect(seen.foreign, 'nothing leaves the page on load').toHaveLength(0);
});

test('Mumbai prints an aggressively iced Mojito at night', async ({ page }) => {
  const seen = await routeWeather(page);
  await page.goto('./#/v/19.07,72.88');
  const coaster = page.getByRole('article').first();
  await expect(coaster.locator('.coaster__drink')).toHaveText('Mojito');
  await expect(coaster.locator('.coaster__stamp')).toHaveText('AGGRESSIVELY ICED');
  await expect(coaster.locator('.coaster__place')).toContainText('Mumbai, India');
  await expect(coaster.locator('.coaster__meta').first()).toContainText('00:45 local');
  await expect(page.getByRole('meter', { name: 'Wall barometer' })).toHaveAttribute('aria-valuenow', '80');
  await expect(page.locator('html')).toHaveAttribute('data-shift', 'night');
  await expect(page.locator('html')).toHaveAttribute('data-grade', 'muggy');
  await expect(page.locator('.bottle--picked')).toHaveAttribute('data-bottle', 'rum');
  await expect(page.locator('.wx--drops')).toHaveClass(/wx--on/);
  await expect(page.locator('.receipt')).toContainText('THE GLOBE BAR');
  await expect(page.locator('.strip')).toContainText('Weather data by Open-Meteo.com');
  expect(seen.meteo.filter((u) => u.includes('/v1/forecast'))).toHaveLength(1);
  expect(seen.meteo).toHaveLength(2); // forecast + air quality — a land pour costs ≤ 3 weighted calls
  expect(seen.foreign).toHaveLength(0);
});

test('Yakutsk is hot dark rum, frosted glass', async ({ page }) => {
  await routeWeather(page);
  await page.goto('./#/v/62.03,129.73');
  await expect(page.locator('.coaster__drink').first()).toHaveText('Hot Buttered Rum');
  await expect(page.locator('.coaster__stamp').first()).toHaveText('SCALDING. DO NOT GO OUTSIDE.');
  await expect(page.locator('.wx--frost')).toHaveClass(/wx--on/);
  await expect(page.locator('.wx--snow')).toHaveClass(/wx--on/);
});

test('an ocean pour asks the marine model and prints the sea', async ({ page }) => {
  const seen = await routeWeather(page);
  await page.goto('./#/v/15.00,65.00');
  await expect(page.locator('.coaster__place').first()).toContainText('You are in the Arabian Sea');
  await expect(page.locator('.coaster__drink').first()).toHaveText("Dark 'n' Stormy");
  await expect(page.locator('.strip').first()).toContainText('SST 28.9°');
  await expect(page.locator('.strip').first()).toContainText('DWD');
  expect(seen.meteo).toHaveLength(3);
});

test('a second pour in the same cell within 15 minutes makes no request', async ({ page }) => {
  const seen = await routeWeather(page);
  const weather = (): number => seen.meteo.filter((u) => !u.includes('geocoding-api')).length;
  await page.goto('./');
  await page.getByRole('button', { name: 'Mumbai', exact: true }).click();
  await expect(page.locator('.coaster__drink').first()).toHaveText('Mojito');
  const before = weather();
  expect(before).toBe(2);
  await page.getByRole('combobox', { name: 'Search for a place' }).fill('Mumb');
  await page.getByRole('option', { name: /Mumbai/ }).click();
  await expect(page.locator('.coaster__drink').first()).toHaveText('Mojito');
  expect(weather()).toBe(before);
});

test('the barista flip re-prints the twin and survives a reload', async ({ page }) => {
  await routeWeather(page);
  await page.goto('./#/v/19.07,72.88');
  await expect(page.locator('.coaster__drink').first()).toHaveText('Mojito');
  const sign = page.getByRole('switch', { name: 'Alcohol-free menu' });
  await sign.click();
  await expect(sign).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('.coaster__drink').first()).toHaveText('Virgin Mojito');
  await expect(page.locator('.coaster__stamp').first()).toHaveAttribute('data-ink', 'barista');
  await page.reload();
  await expect(page.getByRole('switch', { name: 'Alcohol-free menu' })).toHaveAttribute('aria-checked', 'true');
});

test('the recipe is on the back of the coaster', async ({ page }) => {
  await routeWeather(page);
  await page.goto('./#/v/19.07,72.88');
  await page.getByRole('button', { name: 'Flip for recipe' }).click();
  await expect(page.locator('.coaster--flipped')).toBeVisible();
  const recipe = page.getByRole('group', { name: 'Recipe for Mojito' });
  await expect(recipe.locator('th', { hasText: '45 ml' })).toBeVisible();
  await recipe.getByRole('button', { name: 'Flip back' }).click();
  await expect(page.locator('.coaster--flipped')).toHaveCount(0);
});

test('error coasters: nowhere, busy and silent', async ({ page }) => {
  await routeWeather(page, '429');
  await page.goto('./#/v/999,999');
  await expect(page.getByText('Nowhere on Earth has those coordinates. Impressive.')).toBeVisible();
  await page.goto('./#/v/19.07,72.88');
  await expect(page.getByText('Bar’s busy. Give it a minute.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry' })).toBeDisabled();
  await expect(page.locator('.countdown')).toHaveText(/^\d+$/);
});

test('no signal from the models prints the silent coaster', async ({ page }) => {
  await routeWeather(page, 'network');
  await page.goto('./#/v/64.13,-21.90');
  await expect(page.getByText('The models are not answering. Try again.')).toBeVisible();
});

test('The Tab remembers and re-pours without a request', async ({ page }) => {
  const seen = await routeWeather(page);
  await page.goto('./#/v/19.07,72.88');
  await expect(page.locator('.coaster__drink').first()).toHaveText('Mojito');
  await page.getByRole('button', { name: 'The Tab', exact: true }).click();
  const tab = page.getByRole('dialog', { name: 'The Tab' });
  await expect(tab).toBeVisible();
  const row = tab.locator('.tabrow').first();
  await expect(row).toContainText('MUMBAI, IN');
  const before = seen.meteo.length;
  await row.click();
  await expect(page.locator('.coaster__drink').first()).toHaveText('Mojito');
  expect(seen.meteo.length).toBe(before);
});

test('°F re-renders without a refetch', async ({ page }) => {
  const seen = await routeWeather(page);
  await page.goto('./#/v/19.07,72.88');
  await expect(page.locator('.strip').first()).toContainText('31.5°');
  const before = seen.meteo.length;
  await page.goto('./#/office');
  await page.getByRole('radio', { name: '°F' }).click();
  await page.getByRole('dialog', { name: 'Back Office' }).getByRole('button', { name: 'Close' }).click();
  await expect(page.locator('.strip').first()).toContainText('88.7°');
  expect(seen.meteo.length).toBe(before);
});

test('search finds a place and pours there', async ({ page }) => {
  await routeWeather(page);
  await page.goto('./');
  await page.getByRole('combobox', { name: 'Search for a place' }).fill('Mumb');
  await page.getByRole('option', { name: /Mumbai/ }).click();
  await expect(page.locator('.coaster__drink').first()).toHaveText('Mojito');
});

test('the CSP blocks any other host', async ({ page }) => {
  await routeWeather(page);
  await page.goto('./');
  const blocked = await page.evaluate(async () => {
    try {
      await fetch('https://example.com/');
      return false;
    } catch {
      return true;
    }
  });
  expect(blocked).toBe(true);
});
