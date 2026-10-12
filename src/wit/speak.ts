import seedrandom from 'seedrandom';
import tracery from 'tracery-grammar';
import type { Drink, Features, Grammar, PlaceHit, Stamp, Tag, TagScore, VerdictLines } from '../engine/types';
import { fmtTemp, fmtWind, METRIC, type Units } from '../engine/units';

const PRECIP: Tag[] = ['drizzle', 'rain', 'downpour', 'snow', 'blizzard', 'hail', 'storm'];

export interface SpeakInput {
  seed: string;
  drivingTag: Tag;
  tags: TagScore[];
  place: PlaceHit;
  localTime: string;
  features: Features;
  stamp: Stamp;
}

export interface SpeakOptions {
  units?: Units;
  /** The "second opinion": a runner-up drink, announced as such. */
  second?: boolean;
}

/** Collapse whitespace and make sure the line ends like a sentence. */
export function tidy(s: string): string {
  const t = s
    .replace(/\s+/g, ' ')
    .replace(/ ([.,;:!?])/g, '$1')
    .trim();
  return /[.!?]»?$/.test(t) ? t : `${t}.`;
}

function closerKey(input: SpeakInput, g: Grammar): string {
  if (input.place.polar && g.closer_polar) return 'polar';
  if (input.place.kind === 'ocean' && g.closer_ocean) return 'ocean';
  const dp = input.features.dayPart;
  return g[`closer_${dp}`] ? dp : 'default';
}

/** Deterministic per seed: the same click, hour and menu always say the same thing. */
export function speak(input: SpeakInput, grammar: Grammar, drink: Drink, opts: SpeakOptions = {}): VerdictLines {
  const units = opts.units ?? METRIC;
  tracery.setRng(seedrandom(`${input.seed}|voice`));
  const placeKey =
    input.place.kind === 'ocean'
      ? 'ocean'
      : input.place.kind === 'ice'
        ? 'ice'
        : input.place.nearestCity?.isCapital && input.place.nearestCity.distanceKm < 25
          ? 'capital'
          : 'land';
  const jabKey = grammar[`jab_${input.drivingTag}`] ? input.drivingTag : 'default';
  const g = tracery.createGrammar({
    ...grammar,
    placeLineX: [`#placeLine_${placeKey}#`],
    timeLineX: [input.features.polarApproximateTime ? '#timeLine_polar#' : '#timeLine#'],
    jab: [`#jab_${jabKey}#`],
    closer: [`#closer_${closerKey(input, grammar)}#`],
    serveLine: [`#serveLine_${drink.serve}#`],
    drinkLineX: [opts.second ? '#drinkLine_second#' : '#drinkLine#'],
    place: [input.place.label],
    time: [input.localTime],
    drink: [drink.name],
    stamp: [input.stamp.text],
    feels: [fmtTemp(input.features.apparentC, units.temp)],
    dew: [fmtTemp(input.features.dewPointC, units.temp)],
    wind: [fmtWind(input.features.windKmh, units.wind)],
  });
  g.addModifiers(tracery.baseEngModifiers);
  const f = input.features;
  const precipTag = input.tags.some((t) => PRECIP.includes(t.tag));
  const lines: VerdictLines = {
    place: tidy(g.flatten('#placeLineX#')),
    time: g.flatten('#timeLineX#').trim(),
    jab: tidy(g.flatten('#jab#')),
    drink: tidy(g.flatten('#drinkLineX#')),
    serve: tidy(g.flatten('#serveLine#')),
    closer: tidy(g.flatten('#closer#')),
  };
  if (precipTag && (f.precipMm === 0 || f.precipProb <= 60)) lines.hedge = tidy(g.flatten('#hedge#'));
  return lines;
}

/** «…» → segments, so the renderer can set the shouted words in Righteous. */
export function splitIntensifier(s: string): { text: string; loud: boolean }[] {
  const out: { text: string; loud: boolean }[] = [];
  const re = /«([^»]*)»/g;
  let last = 0;
  for (let m = re.exec(s); m; m = re.exec(s)) {
    if (m.index > last) out.push({ text: s.slice(last, m.index), loud: false });
    out.push({ text: m[1] ?? '', loud: true });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ text: s.slice(last), loud: false });
  return out;
}

export const plain = (s: string): string => s.replace(/[«»]/g, '');
