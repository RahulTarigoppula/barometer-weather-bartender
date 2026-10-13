import { expect, type Page, test } from '@playwright/test';
import { HOUSE_TIME, routeWeather } from './fixtures';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(HOUSE_TIME);
});

const weather = (page: Page) => page.getByRole('region', { name: 'Weather' });
const drink = (page: Page) => page.locator('.drink__name');

test('opens on India: the planet, Indian cities, and New Delhi’s weather first', async ({ page }) => {
  const seen = await routeWeather(page);
  await page.goto('./');
  await expect(page.getByRole('application', { name: /Planet Earth, centred on India/ })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Indian cities' }).getByRole('button')).toHaveCount(12);
  await expect(weather(page).locator('.weather__place')).toHaveText('New Delhi');
  await expect(weather(page)).toContainText('India');
  await expect(page.getByRole('meter', { name: 'Comfort scale' })).toBeVisible();
  await expect(drink(page)).toBeVisible();
  await expect(page.getByRole('radiogroup', { name: 'Budget' }).getByRole('radio')).toHaveText([
    'Extreme Cheap',
    'Budget',
    'Mid-range',
    'High-end',
  ]);
  await expect(page).toHaveURL(/#\/v\/28\.61,77\.21$/);
  expect(seen.meteo).toHaveLength(2); // forecast + air quality
  expect(seen.foreign, 'nothing leaves the page except Open-Meteo').toHaveLength(0);
});

test('Mumbai: an aggressively iced Mojito on a soup-grade night', async ({ page }) => {
  const seen = await routeWeather(page);
  await page.goto('./#/v/19.07,72.88');
  await expect(weather(page).locator('.weather__place')).toHaveText('Mumbai');
  await expect(drink(page)).toHaveText('Mojito');
  await expect(page.locator('.stamp')).toHaveText('AGGRESSIVELY ICED');
  await expect(page.getByRole('meter', { name: 'Comfort scale' })).toHaveAttribute('aria-valuenow', '80');
  await expect(page.locator('html')).toHaveAttribute('data-grade', 'muggy');
  await expect(page.locator('.wx--drops')).toHaveClass(/wx--on/);
  await expect(weather(page)).toContainText('Weather data by Open-Meteo.com');
  expect(seen.meteo).toHaveLength(2);
  expect(seen.foreign).toHaveLength(0);
});

test('four budgets: price, pour and place change; the choice persists', async ({ page }) => {
  await routeWeather(page);
  await page.goto('./#/v/19.07,72.88');
  await expect(drink(page)).toHaveText('Mojito');
  const budget = page.getByRole('region', { name: 'Budget' });
  await expect(budget.locator('.budget__price')).toContainText('₹180–₹350');
  await budget.getByRole('radio', { name: 'Extreme Cheap' }).click();
  await expect(budget.locator('.budget__price')).toContainText('₹60–₹150');
  await expect(budget).toContainText('Old Monk');
  await expect(budget).toContainText('At home');
  await budget.getByRole('radio', { name: 'High-end' }).click();
  await expect(budget.locator('.budget__price')).toContainText('₹950–₹2,500');
  await expect(budget).toContainText('five-star');
  await page.reload();
  await expect(page.getByRole('radio', { name: 'High-end' })).toHaveAttribute('aria-checked', 'true');
});

test('Yakutsk: hot dark rum and frost on the glass', async ({ page }) => {
  await routeWeather(page);
  await page.goto('./#/v/62.03,129.73');
  await expect(drink(page)).toHaveText('Hot Buttered Rum');
  await expect(page.locator('.stamp')).toHaveText('SCALDING. DO NOT GO OUTSIDE.');
  await expect(page.locator('.wx--frost')).toHaveClass(/wx--on/);
});

test('an ocean tap asks the marine model and prints the sea', async ({ page }) => {
  const seen = await routeWeather(page);
  await page.goto('./#/v/15.00,65.00');
  await expect(weather(page)).toContainText('Arabian Sea');
  await expect(weather(page)).toContainText('Sea surface 28.9°');
  await expect(weather(page)).toContainText('DWD');
  await expect(drink(page)).toHaveText("Dark 'n' Stormy");
  expect(seen.meteo).toHaveLength(3);
});

test('a second look at the same cell within 15 minutes makes no request', async ({ page }) => {
  const seen = await routeWeather(page);
  await page.goto('./');
  await expect(weather(page).locator('.weather__place')).toHaveText('New Delhi');
  await page.getByRole('group', { name: 'Indian cities' }).getByRole('button', { name: 'Mumbai' }).click();
  await expect(weather(page).locator('.weather__place')).toHaveText('Mumbai');
  const before = seen.meteo.length;
  expect(before).toBe(4);
  await page.getByRole('group', { name: 'Indian cities' }).getByRole('button', { name: 'New Delhi' }).click();
  await expect(weather(page).locator('.weather__place')).toHaveText('New Delhi');
  expect(seen.meteo.length).toBe(before);
});

test('the Barista switch pours the alcohol-free twin and survives a reload', async ({ page }) => {
  await routeWeather(page);
  await page.goto('./#/v/19.07,72.88');
  await expect(drink(page)).toHaveText('Mojito');
  const sw = page.getByRole('switch', { name: 'Alcohol-free menu' });
  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'true');
  await expect(drink(page)).toHaveText('Virgin Mojito');
  await expect(page.locator('.stamp')).toHaveAttribute('data-ink', 'barista');
  await page.reload();
  await expect(page.getByRole('switch', { name: 'Alcohol-free menu' })).toHaveAttribute('aria-checked', 'true');
});

test('the recipe opens under the drink', async ({ page }) => {
  await routeWeather(page);
  await page.goto('./#/v/19.07,72.88');
  await page.getByRole('button', { name: 'Recipe' }).click();
  const recipe = page.getByRole('group', { name: 'Recipe for Mojito' });
  await expect(recipe.locator('th', { hasText: '45 ml' })).toBeVisible();
  await page.getByRole('button', { name: 'Hide recipe' }).click();
  await expect(recipe).toHaveCount(0);
});

test('errors: nowhere, busy with a countdown', async ({ page }) => {
  await routeWeather(page, '429');
  await page.goto('./#/v/999,999');
  await expect(page.getByText('Nowhere on Earth has those coordinates.')).toBeVisible();
  await page.goto('./#/v/19.07,72.88');
  await expect(page.getByText('Too many requests')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry' })).toBeDisabled();
  await expect(page.locator('.countdown')).toHaveText(/^\d+$/);
});

test('no signal from the weather service', async ({ page }) => {
  await routeWeather(page, 'network');
  await page.goto('./#/v/64.13,-21.90');
  await expect(page.getByText('No signal from the weather service')).toBeVisible();
});

test('history remembers and re-shows a place without a request', async ({ page }) => {
  const seen = await routeWeather(page);
  await page.goto('./#/v/19.07,72.88');
  await expect(drink(page)).toHaveText('Mojito');
  await page.getByRole('button', { name: 'History', exact: true }).click();
  const tab = page.getByRole('dialog', { name: 'History' });
  await expect(tab).toBeVisible();
  const row = tab.locator('.tabrow').first();
  await expect(row).toContainText('MUMBAI, IN');
  const before = seen.meteo.length;
  await row.click();
  await expect(drink(page)).toHaveText('Mojito');
  expect(seen.meteo.length).toBe(before);
});

test('°F re-renders without a refetch', async ({ page }) => {
  const seen = await routeWeather(page);
  await page.goto('./#/v/19.07,72.88');
  await expect(weather(page)).toContainText('31.5°');
  const before = seen.meteo.length;
  await page.goto('./#/office');
  await page.getByRole('radio', { name: '°F' }).click();
  await page.getByRole('dialog', { name: 'Settings' }).getByRole('button', { name: 'Close' }).click();
  await expect(weather(page)).toContainText('88.7°');
  expect(seen.meteo.length).toBe(before);
});

test('search puts Indian places first', async ({ page }) => {
  await routeWeather(page);
  await page.goto('./#/v/19.07,72.88');
  await page.getByRole('combobox', { name: 'Search for a place' }).fill('Mumb');
  const first = page.getByRole('option').first();
  await expect(first).toContainText('Mumbai');
  await expect(first).toContainText('India');
  await first.click();
  await expect(weather(page).locator('.weather__place')).toHaveText('Mumbai');
});

test('the outlook, the roads and India right now', async ({ page }) => {
  const seen = await routeWeather(page);
  await page.goto('./#/v/19.07,72.88');
  await expect(drink(page)).toHaveText('Mojito');
  const forecast = page.getByRole('region', { name: 'Forecast' });
  await expect(forecast.getByRole('region', { name: 'Next 24 hours' })).toContainText('Now');
  await expect(forecast.getByRole('region', { name: 'Next 7 days' }).locator('.day')).toHaveCount(7);
  await expect(page.locator('.snack')).toContainText('On the side');
  const roads = page.getByRole('region', { name: 'Roads' });
  await expect(roads).toContainText('Mumbai roads');
  await expect(roads).toContainText('Estimate');
  await expect(roads.getByRole('listitem')).toHaveCount(12);
  const india = page.getByRole('region', { name: 'India right now' });
  await expect(india.locator('.city')).toHaveCount(12);
  expect(seen.india).toHaveLength(2); // one forecast + one air-quality call for twelve cities
  await india.locator('.city', { hasText: 'Bengaluru' }).click();
  await expect(weather(page).locator('.weather__place')).toHaveText('Bengaluru');
  expect(seen.foreign).toHaveLength(0);
});

test('a starred place shows up first under the globe', async ({ page }) => {
  await routeWeather(page);
  await page.goto('./#/v/19.07,72.88');
  await page.getByRole('button', { name: 'Save Mumbai' }).click();
  const yours = page.getByRole('group', { name: 'Your places' });
  await expect(yours.getByRole('button', { name: 'Mumbai' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Remove Mumbai from saved places' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('the story plays from the footer, names the app, and can be skipped', async ({ page }) => {
  await routeWeather(page);
  await page.goto('./#/v/19.07,72.88');
  await expect(drink(page)).toHaveText('Mojito');
  await page.getByRole('button', { name: /Watch the story/ }).click();
  const story = page.getByRole('dialog', { name: 'Our story' });
  await expect(story).toBeVisible();
  await expect(story).toContainText('Every great story opens with a wide shot.');
  await expect(story).toContainText('I’m Rahul');
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await expect(story).toHaveCount(0);
  await expect(page).toHaveURL(/#\/v\/19\.07,72\.88$/);
});

test('zoom out from the planet to the known universe, and back', async ({ page }) => {
  await routeWeather(page);
  await page.goto('./#/v/19.07,72.88');
  await expect(drink(page)).toHaveText('Mojito');
  await page.getByRole('button', { name: 'Zoom out', exact: true }).click(); // the flat globe is already at its far limit
  const cosmos = page.getByRole('dialog', { name: 'Zoom out to the universe' });
  await expect(cosmos).toBeVisible();
  await expect(cosmos).toContainText('The Solar System');
  await cosmos.getByRole('slider', { name: 'Zoom from Earth to the known universe' }).fill('100');
  await expect(cosmos).toContainText('The known universe', { timeout: 10_000 });
  await cosmos.getByRole('button', { name: 'Back to Earth' }).click();
  await expect(cosmos).toHaveCount(0, { timeout: 10_000 });
});

test('weather first everywhere: the mahaul line, the page mood, four tiles and more on request', async ({ page }) => {
  await routeWeather(page);
  await page.goto('./#/v/19.07,72.88');
  await expect(drink(page)).toHaveText('Mojito');
  await expect(page.locator('.mahaul')).toContainText('over Mumbai tonight');
  await expect(page.locator('.mahaul__genre')).toContainText('Today’s genre');
  await expect(page.locator('html')).toHaveAttribute('data-hour', 'night');
  const tiles = weather(page).locator('.tile');
  await expect(tiles).toHaveCount(4);
  await page.getByRole('button', { name: /More details/ }).click();
  await expect(tiles).toHaveCount(8);
  await expect(weather(page)).toContainText('Sunrise');
});

test('play: scrub the next day, cheers with the glass, surprise me', async ({ page }) => {
  await routeWeather(page);
  await page.goto('./#/v/19.07,72.88');
  await expect(drink(page)).toHaveText('Mojito');
  const scrub = page.getByRole('slider').first();
  await scrub.fill('6');
  await expect(page.locator('.scrub__label')).toContainText('in 6 h');
  await expect(weather(page)).toContainText('chance of rain at');
  await page.getByRole('button', { name: 'Back to now' }).click();
  await expect(page.locator('.scrub__label')).toContainText('Drag to see');
  await page.getByRole('button', { name: /Cheers with a Mojito/ }).click();
  await expect(page.locator('.drink__cheers')).toBeVisible();
  await page.getByRole('button', { name: 'Surprise me' }).click();
  await expect(page.locator('.toast')).toContainText(':');
});

test('the CSP blocks any other host', async ({ page }) => {
  await routeWeather(page);
  await page.goto('./#/v/19.07,72.88');
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
