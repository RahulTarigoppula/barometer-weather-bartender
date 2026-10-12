import { fmtDate } from '../../engine/receipt';
import type { Drink, Verdict } from '../../engine/types';
import { fmtTemp, fmtWind, type Units } from '../../engine/units';
import { plain } from '../../wit/speak';

export const CARD_W = 1080;
export const CARD_H = 1350;

const C = {
  wood: '#3A2114',
  woodLo: '#1A0F0A',
  paper: '#F3E6C8',
  ink: '#1C120C',
  muted: '#5E4632',
  faint: '#A38A6F',
  brass: '#C9962B',
  brassHi: '#F5C860',
  brassLo: '#8A6414',
  neon: '#FFB347',
};

async function fontsReady(): Promise<void> {
  const loads = ['400 64px Righteous', '500 30px "Space Grotesk Variable"', '400 24px "JetBrains Mono Variable"'].map(
    (f) => document.fonts.load(f).catch(() => undefined),
  );
  // Wait for the fonts, but never longer than 2 s — then draw anyway.
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
  closer: string;
  dots: [number, number][];
  units: Units;
  version: string;
}

/** The torn-off receipt as a 1080×1350 PNG: a paper field in a mahogany frame, neon wordmark on top. */
export async function renderShareCard({
  v,
  drink,
  stamp,
  jab,
  closer,
  dots,
  units,
  version,
}: CardInput): Promise<Blob> {
  await fontsReady();
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context');

  // mahogany frame
  const wood = ctx.createLinearGradient(0, 0, 0, CARD_H);
  wood.addColorStop(0, C.wood);
  wood.addColorStop(1, C.woodLo);
  ctx.fillStyle = wood;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // neon wordmark — a tube: stroked, glowing
  ctx.textAlign = 'center';
  ctx.font = '400 92px Righteous, Impact, sans-serif';
  ctx.lineWidth = 3;
  ctx.strokeStyle = C.neon;
  ctx.shadowColor = 'rgba(255,179,71,.7)';
  ctx.shadowBlur = 26;
  ctx.strokeText('THE GLOBE BAR', CARD_W / 2, 150);
  ctx.shadowBlur = 0;

  // paper
  const px = 80;
  const py = 210;
  const pw = CARD_W - 160;
  const ph = CARD_H - 290;
  ctx.fillStyle = C.paper;
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, 24);
  ctx.fill();
  ctx.strokeStyle = C.faint;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(px + 18, py + 18, pw - 36, ph - 36, 14);
  ctx.stroke();

  const x = px + 70;
  const maxW = pw - 140;
  let y = py + 110;
  ctx.textAlign = 'left';
  ctx.fillStyle = C.muted;
  ctx.font = '400 28px "JetBrains Mono Variable", monospace';
  for (const l of wrapLines(ctx, v.place.label, maxW)) {
    ctx.fillText(l, x, y);
    y += 40;
  }
  ctx.fillText(`${fmtDate(v.features.localDate)} · ${v.localTime} local`, x, y);
  y += 70;

  ctx.fillStyle = C.ink;
  ctx.font = '500 38px "Space Grotesk Variable", sans-serif';
  for (const l of wrapLines(ctx, jab, maxW).slice(0, 5)) {
    ctx.fillText(l, x, y);
    y += 52;
  }
  y += 40;

  // the stamp, rotated −4°
  const stampInk = getComputedStyle(document.documentElement).getPropertyValue('--stamp').trim();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((-4 * Math.PI) / 180);
  ctx.font = '400 50px Righteous, Impact, sans-serif';
  const sw = Math.min(maxW, ctx.measureText(stamp).width + 40);
  ctx.strokeStyle = stampInk.startsWith('#') || stampInk.startsWith('rgb') ? stampInk : C.ink;
  ctx.fillStyle = ctx.strokeStyle;
  ctx.lineWidth = 4;
  ctx.strokeRect(0, -50, sw, 70);
  ctx.fillText(stamp, 20, 2, sw - 40);
  ctx.restore();
  y += 120;

  ctx.fillStyle = C.ink;
  ctx.font = '400 104px Righteous, Impact, sans-serif';
  for (const l of wrapLines(ctx, drink.name, maxW).slice(0, 2)) {
    ctx.fillText(l, x, y);
    y += 110;
  }
  y += 10;

  // receipt strip
  ctx.strokeStyle = C.faint;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + maxW, y);
  ctx.stroke();
  ctx.setLineDash([]);
  y += 50;
  const f = v.features;
  ctx.fillStyle = C.ink;
  ctx.font = '400 30px "JetBrains Mono Variable", monospace';
  const stats = [
    `FEELS ${fmtTemp(f.apparentC, units.temp)}   DEW ${fmtTemp(f.dewPointC, units.temp)}`,
    `WIND ${fmtWind(f.windKmh, units.wind).toUpperCase()}   UV ${Math.round(f.uv)}   AQI ${f.usAqi === null ? '—' : Math.round(f.usAqi)}`,
  ];
  if (f.marine) stats.push(`SST ${fmtTemp(f.marine.sstC, units.temp)}   WAVES ${f.marine.waveHeightM.toFixed(1)} M`);
  for (const s of stats) {
    ctx.fillText(s, x, y);
    y += 44;
  }
  y += 20;
  ctx.fillStyle = C.muted;
  ctx.font = '500 30px "Space Grotesk Variable", sans-serif';
  for (const l of wrapLines(ctx, closer, maxW).slice(0, 2)) {
    ctx.fillText(l, x, y);
    y += 42;
  }

  // a dotted world with the pin, the receipt's little globe at poster size
  const mapH = Math.min(maxW / 2, py + ph - 140 - (y + 10));
  const mapW = mapH * 2;
  const mapY = y + 10;
  const mapX = px + (pw - mapW) / 2;
  if (mapH >= 90) {
    ctx.fillStyle = C.faint;
    for (const [lng, lat] of dots) {
      ctx.beginPath();
      ctx.arc(mapX + ((lng + 180) / 360) * mapW, mapY + ((90 - lat) / 180) * mapH, mapH / 70, 0, Math.PI * 2);
      ctx.fill();
    }
    const pxPin = mapX + ((v.lng + 180) / 360) * mapW;
    const pyPin = mapY + ((90 - v.lat) / 180) * mapH;
    ctx.fillStyle = '#A0281F';
    ctx.beginPath();
    ctx.arc(pxPin, pyPin, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.paper;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // credits, at the foot of the paper
  ctx.fillStyle = C.muted;
  ctx.font = '400 22px "JetBrains Mono Variable", monospace';
  const credits = [
    'Weather data by Open-Meteo.com (CC BY 4.0)',
    [
      v.sources.air ? 'CAMS ENSEMBLE (Copernicus)' : '',
      v.sources.marine ? 'DWD' : '',
      'NASA Earth Observatory',
      'Natural Earth',
    ]
      .filter(Boolean)
      .join(' · '),
  ];
  let cy = py + ph - 90;
  for (const c of credits) {
    for (const l of wrapLines(ctx, c, maxW)) {
      ctx.fillText(l, x, cy);
      cy += 30;
    }
  }

  // brass foot-rail + version
  const brass = ctx.createLinearGradient(0, 0, CARD_W, 0);
  brass.addColorStop(0, C.brassLo);
  brass.addColorStop(0.5, C.brassHi);
  brass.addColorStop(1, C.brassLo);
  ctx.fillStyle = brass;
  ctx.fillRect(px, CARD_H - 52, pw, 5);
  ctx.textAlign = 'center';
  ctx.fillStyle = C.brass;
  ctx.font = '400 20px "JetBrains Mono Variable", monospace';
  ctx.fillText(`Spin. Tap. Survive. · v${version}`, CARD_W / 2, CARD_H - 18);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'),
  );
}

export const cardFilename = (v: Verdict): string =>
  `globe-bar-${plain(v.place.short)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}-${v.features.localDate}.png`;
