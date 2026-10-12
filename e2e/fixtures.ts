import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Page, Request } from '@playwright/test';

const dir = fileURLToPath(new URL('../src/test/fixtures/openmeteo/', import.meta.url));
const read = (name: string): Record<string, unknown> => JSON.parse(readFileSync(`${dir}${name}.json`, 'utf8'));

const FIXTURES: Record<string, [number, number]> = {
  mumbai: [19.07, 72.88],
  yakutsk: [62.03, 129.73],
  reykjavik: [64.13, -21.9],
  'dubai-noon': [25.2, 55.27],
  'arabian-sea': [15, 65],
  'south-pole': [-89.9, 0],
  'denver-hail': [39.74, -104.99],
  'lisbon-golden': [38.72, -9.14],
  'oslo-brunch': [59.91, 10.75],
};

/** The house instant: 2026-09-06 00:45 in Mumbai. */
export const HOUSE_TIME = new Date('2026-09-05T19:15:00Z');

export type Mode = 'fixtures' | '429' | 'network';

export interface Routed {
  meteo: string[];
  foreign: string[];
}

function fixtureFor(url: URL): string {
  const lat = Number(url.searchParams.get('latitude'));
  const lng = Number(url.searchParams.get('longitude'));
  let best = 'mumbai';
  let bd = Number.POSITIVE_INFINITY;
  for (const [name, [a, b]] of Object.entries(FIXTURES)) {
    const d = Math.abs(a - lat) + Math.abs(b - lng);
    if (d < bd) {
      bd = d;
      best = name;
    }
  }
  return best;
}

/** Route the four Open-Meteo hosts to fixture JSON; abort (and record) anything else that leaves the page. */
export async function routeWeather(page: Page, mode: Mode = 'fixtures', webgl = false): Promise<Routed> {
  const seen: Routed = { meteo: [], foreign: [] };
  if (!webgl) {
    // Headless CI renders WebGL in software, which starves the main thread; the engraved canvas globe
    // (the real no-WebGL path) is what these flows exercise.
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      // biome-ignore lint/suspicious/noExplicitAny: test-only shim over an overloaded DOM signature
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: any[]) {
        if (type === 'webgl' || type === 'webgl2') return null;
        return original.call(this, type, ...rest);
      } as typeof original;
    });
  }
  await page.route(
    (url) => !['localhost', '127.0.0.1'].includes(url.hostname),
    async (route) => {
      seen.foreign.push(route.request().url());
      await route.abort('blockedbyclient');
    },
  );
  await page.route(/^https:\/\/[a-z-]+\.open-meteo\.com\//, async (route) => {
    const url = new URL(route.request().url());
    seen.meteo.push(url.href);
    if (mode === 'network') return route.abort('failed');
    if (mode === '429') {
      return route.fulfill({
        status: 429,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ error: true, reason: 'Minutely API request limit exceeded' }),
      });
    }
    const headers = { 'access-control-allow-origin': '*' };
    if (url.hostname === 'geocoding-api.open-meteo.com') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers,
        body: JSON.stringify({
          results: [{ name: 'Mumbai', country: 'India', admin1: 'Maharashtra', latitude: 19.07, longitude: 72.88 }],
        }),
      });
    }
    const fx = read(fixtureFor(url));
    const body = url.hostname.startsWith('air-quality')
      ? fx.airQuality
      : url.hostname.startsWith('marine')
        ? fx.marine
        : fx.forecast;
    if (!body) return route.fulfill({ status: 400, headers, body: '{"error":true}' });
    return route.fulfill({ status: 200, contentType: 'application/json', headers, body: JSON.stringify(body) });
  });
  return seen;
}

export const isMeteo = (r: Request): boolean => /open-meteo\.com/.test(r.url());
