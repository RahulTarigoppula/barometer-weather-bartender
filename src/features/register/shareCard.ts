import { type BudgetPlan, fmtRupees } from '../../engine/budget';
import { fmtDate } from '../../engine/receipt';
import type { Drink, Verdict } from '../../engine/types';
import { fmtTemp, fmtTempShort, fmtWind, type Units } from '../../engine/units';
import { wmoLabel } from '../../engine/wmo';
import { plain } from '../../wit/speak';

export const CARD_W = 1080;
export const CARD_H = 1350;

const C = {
  space0: '#03050b',
  space1: '#0b1630',
  panel: 'rgba(16,24,46,0.86)',
  line: 'rgba(124,196,255,0.22)',
  ink: '#eef3ff',
  muted: '#9fb0d4',
  sky: '#7cc4ff',
  saffron: '#ff9933',
  green: '#3ddc97',
  land: 'rgba(124,196,255,0.35)',
};

const FONT = '"Space Grotesk Variable", "Space Grotesk", system-ui, sans-serif';
const MONO = '"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, monospace';

async function fontsReady(): Promise<void> {
  const loads = [`700 64px ${FONT}`, `400 24px ${MONO}`].map((f) => document.fonts.load(f).catch(() => undefined));
  await Promise.race([Promise.all(loads), new Promise((r) => setTimeout(r, 2000))]);
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > max && line) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

export interface CardInput {
  v: Verdict;
  drink: Drink;
  stamp: string;
  jab: string;
  plan: BudgetPlan;
  dots: [number, number][];
  units: Units;
  version: string;
}

/** The share card: weather first, then the drink and its budget, on a deep-space field. */
export async function renderShareCard({ v, drink, stamp, jab, plan, dots, units, version }: CardInput): Promise<Blob> {
  await fontsReady();
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context');
  const f = v.features;

  const bg = ctx.createRadialGradient(CARD_W * 0.7, CARD_H * 0.15, 50, CARD_W * 0.5, CARD_H * 0.5, CARD_H);
  bg.addColorStop(0, C.space1);
  bg.addColorStop(1, C.space0);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  // stars (deterministic)
  let seed = 11;
  const rnd = (): number => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.25 + rnd() * 0.6})`;
    ctx.fillRect(rnd() * CARD_W, rnd() * CARD_H, rnd() < 0.1 ? 2.2 : 1.2, rnd() < 0.1 ? 2.2 : 1.2);
  }

  // the planet edge, glowing, bottom-right
  const glow = ctx.createRadialGradient(CARD_W + 80, CARD_H + 120, 380, CARD_W + 80, CARD_H + 120, 640);
  glow.addColorStop(0, 'rgba(79,157,255,0.0)');
  glow.addColorStop(0.82, 'rgba(79,157,255,0.30)');
  glow.addColorStop(1, 'rgba(79,157,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const x = 80;
  const maxW = CARD_W - 160;
  ctx.textAlign = 'left';
  ctx.fillStyle = C.saffron;
  ctx.font = `700 30px ${FONT}`;
  ctx.fillText('barometer', x, 100);
  ctx.fillStyle = C.muted;
  ctx.font = `400 22px ${MONO}`;
  ctx.fillText('weather first · then a drink', x + 190, 100);

  let y = 190;
  ctx.fillStyle = C.ink;
  ctx.font = `700 60px ${FONT}`;
  for (const l of wrapLines(
    ctx,
    v.place.nearestCity && v.place.nearestCity.distanceKm < 25 ? v.place.nearestCity.name : v.place.label,
    maxW,
  ).slice(0, 2)) {
    ctx.fillText(l, x, y);
    y += 68;
  }
  ctx.fillStyle = C.muted;
  ctx.font = `400 26px ${MONO}`;
  ctx.fillText(`${v.place.country?.name ?? ''}  ${fmtDate(f.localDate)} · ${v.localTime}`, x, y);
  y += 190;

  ctx.fillStyle = C.ink;
  ctx.font = `700 170px ${FONT}`;
  ctx.fillText(fmtTempShort(f.tempC, units.temp), x - 6, y);
  ctx.font = `500 34px ${FONT}`;
  ctx.fillStyle = C.sky;
  ctx.fillText(wmoLabel(f.wmo), x + 330, y - 86);
  ctx.fillStyle = C.muted;
  ctx.fillText(`Feels like ${fmtTemp(f.apparentC, units.temp)}`, x + 330, y - 38);
  y += 60;
  ctx.font = `400 26px ${MONO}`;
  ctx.fillStyle = C.ink;
  ctx.fillText(
    `HUMIDITY ${Math.round(f.rh)}%   WIND ${fmtWind(f.windKmh, units.wind).toUpperCase()}   AQI ${f.euAqi === null ? '—' : Math.round(f.euAqi)}   UV ${Math.round(f.uv)}`,
    x,
    y,
  );
  y += 60;

  // drink panel
  const py = y;
  const ph = 480;
  ctx.fillStyle = C.panel;
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x - 30, py, maxW + 60, ph, 28);
  ctx.fill();
  ctx.stroke();
  y = py + 64;
  ctx.fillStyle = C.muted;
  ctx.font = `500 24px ${FONT}`;
  ctx.fillText('THE BARTENDER RECOMMENDS', x, y);
  y += 56;
  ctx.fillStyle = C.ink;
  ctx.font = `500 32px ${FONT}`;
  for (const l of wrapLines(ctx, `“${jab}”`, maxW).slice(0, 3)) {
    ctx.fillText(l, x, y);
    y += 44;
  }
  y += 50;
  ctx.font = `700 26px ${FONT}`;
  const sw = ctx.measureText(stamp).width + 36;
  ctx.fillStyle = 'rgba(255,153,51,0.16)';
  ctx.beginPath();
  ctx.roundRect(x, y - 36, sw, 50, 25);
  ctx.fill();
  ctx.fillStyle = C.saffron;
  ctx.fillText(stamp, x + 18, y - 2);
  y += 86;
  ctx.fillStyle = C.ink;
  ctx.font = `700 76px ${FONT}`;
  ctx.fillText(drink.name, x, y, maxW);
  y += 66;
  ctx.fillStyle = C.green;
  ctx.font = `600 32px ${MONO}`;
  ctx.fillText(`${plan.label.toUpperCase()} · ${fmtRupees(plan.low, plan.high)} / glass`, x, y, maxW);
  y += 44;
  ctx.fillStyle = C.muted;
  ctx.font = `400 26px ${FONT}`;
  ctx.fillText(plan.pour, x, y, maxW);

  // the dotted world with the pin
  const mapW = 300;
  const mapH = 150;
  const mx = CARD_W - mapW - 80;
  const my = 150;
  ctx.fillStyle = C.land;
  for (const [lng, lat] of dots) {
    ctx.beginPath();
    ctx.arc(mx + ((lng + 180) / 360) * mapW, my + ((90 - lat) / 180) * mapH, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = C.saffron;
  ctx.beginPath();
  ctx.arc(mx + ((v.lng + 180) / 360) * mapW, my + ((90 - v.lat) / 180) * mapH, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = C.muted;
  ctx.font = `400 20px ${MONO}`;
  const credits = `Weather data by Open-Meteo.com (CC BY 4.0)${v.sources.air ? ' · CAMS' : ''}${v.sources.marine ? ' · DWD' : ''} · NASA · Natural Earth · v${version}`;
  for (const [i, l] of wrapLines(ctx, credits, maxW).entries()) ctx.fillText(l, x, CARD_H - 70 + i * 28);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'),
  );
}

export const cardFilename = (v: Verdict): string =>
  `barometer-${plain(v.place.short)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}-${v.features.localDate}.png`;
