import { ChevronDown, GlassWater, RefreshCw, Share2 } from 'lucide-react';
import { type ReactElement, useMemo, useState } from 'react';
import { play } from '../../audio/sfx';
import { Seg } from '../../components/ui/Controls';
import { DRINKS, GRAMMAR } from '../../data/menu';
import { budgetPlan, fmtDollars, fmtRupees, TIER_LABEL, TIERS, type Tier } from '../../engine/budget';
import { served } from '../../engine/index';
import { twinOf } from '../../engine/menu';
import { snackFor } from '../../engine/outlook';
import type { Drink, Verdict } from '../../engine/types';
import { haptic } from '../../platform/haptics';
import { useSettings } from '../../state/settings';
import { useBar } from '../../state/store';
import { speak, splitIntensifier } from '../../wit/speak';
import { tearReceipt } from '../register/tear';
import { Glassware, glassLabel } from '../verdict/Glassware';

const Loud = ({ text }: { text: string }): ReactElement => (
  <>
    {splitIntensifier(text).map((seg, i) =>
      seg.loud ? (
        // biome-ignore lint/suspicious/noArrayIndexKey: segments of one immutable sentence
        <strong key={i} className="loud">
          {seg.text}
        </strong>
      ) : (
        // biome-ignore lint/suspicious/noArrayIndexKey: segments of one immutable sentence
        <span key={i}>{seg.text}</span>
      ),
    )}
  </>
);

function hourWords(h: number): string {
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${h < 12 ? 'a.m.' : 'p.m.'}`;
}

function Budget({ drink, india }: { drink: Drink; india: boolean }): ReactElement {
  const tier = useSettings((s) => s.tier);
  const set = useSettings((s) => s.set);
  const plan = budgetPlan(drink, tier);
  return (
    <section className="budget" aria-label="Budget">
      <div className="budget__head">
        <h3 className="h3">Your budget</h3>
        <Seg<Tier>
          label="Budget"
          value={tier}
          options={TIERS.map((t) => ({ value: t, label: TIER_LABEL[t] }))}
          onChange={(t) => set({ tier: t })}
        />
      </div>
      <div className="budget__plan" data-tier={tier}>
        <p className="budget__price num">
          {fmtRupees(plan.low, plan.high)}
          <span className="budget__per"> per glass</span>
          {!india && <span className="budget__usd"> {fmtDollars(plan.low, plan.high)}</span>}
        </p>
        <dl className="budget__facts">
          <div>
            <dt>Pour</dt>
            <dd>{plan.pour}</dd>
          </div>
          <div>
            <dt>Where</dt>
            <dd>{plan.where}</dd>
          </div>
        </dl>
        <p className="budget__tip">{plan.tip}</p>
      </div>
    </section>
  );
}

function Recipe({ drink }: { drink: Drink }): ReactElement {
  return (
    <div className="recipe" id="recipe" role="group" aria-label={`Recipe for ${drink.name}`}>
      <table>
        <tbody>
          {drink.recipe.ingredients.map((r) => (
            <tr key={r.ingredient}>
              <th scope="row" className="num">
                {r.amount}
              </th>
              <td>{r.ingredient}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ol>
        {drink.recipe.method.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ol>
      <p className="credit">
        {drink.recipe.source === 'iba'
          ? 'IBA recipe'
          : drink.recipe.source === 'opendrinks'
            ? 'Open Drinks recipe'
            : 'House recipe'}
        {drink.recipe.source === 'house' ? '' : ' (MIT)'} · method written in-house
      </p>
    </div>
  );
}

function Pick({ v, note }: { v: Verdict; note: 'stale' | 'repoured' | null }): ReactElement {
  const { menu, gentler, units } = useSettings();
  const setSettings = useSettings((s) => s.set);
  const opinion = useBar((s) => s.opinion);
  const open = useBar((s) => s.flipped);
  const patch = useBar((s) => s.patch);
  const s = served(v, DRINKS, menu, opinion, gentler);
  const lines = useMemo(
    () => speak({ ...v, stamp: s.stamp }, GRAMMAR, s.drink, { units, second: s.second }),
    [v, s.stamp, s.drink, s.second, units],
  );
  const twin = twinOf(DRINKS, s.drink, s.drink.alcoholic ? 'barista' : 'bar');
  const india = v.place.country?.iso2 === 'IN';
  const snack = snackFor(v.tags, s.drink);
  const [cheers, setCheers] = useState(0);

  const second = (): void => {
    patch({ opinion: (opinion + 1) % (v.runnersUp.length + 1) });
    play('clunk');
    haptic('selection');
  };

  return (
    <article
      className="card drink"
      aria-label={`The bartender's pick for ${v.place.label}: ${s.stamp.text.toLowerCase()} ${s.drink.name}`}
      data-grade={v.gradeFamily}
    >
      <p className="eyebrow">The bartender recommends</p>
      {v.suggestBarista && menu === 'bar' && (
        <button type="button" className="chip chip--action" onClick={() => setSettings({ menu: 'barista' })}>
          It’s {hourWords(v.features.localHour)} there. Switch to the coffee & mocktail menu?
        </button>
      )}
      {note === 'repoured' && <p className="chip">Refreshed: the first reading went stale</p>}
      <blockquote className="drink__jab">“{lines.jab}”</blockquote>
      {lines.hedge && <p className="drink__hedge">{lines.hedge}</p>}
      <div className="drink__hero">
        <button
          type="button"
          className="drink__glass"
          aria-label={`Cheers with a ${s.drink.name}`}
          title="Cheers!"
          onClick={() => {
            setCheers((n) => n + 1);
            play('clink', { rate: 1.05 });
            play('clink', { delay: 0.12, rate: 0.92 });
            haptic('light');
          }}
        >
          <span className="drink__tilt" key={cheers} data-cheers={cheers > 0 ? 'true' : undefined}>
            <Glassware key={`${s.drink.id}-${v.createdAt}`} drink={s.drink} size={92} />
          </span>
          {cheers > 0 && (
            <span className="drink__cheers" key={`c${cheers}`} aria-hidden="true">
              Cheers!
            </span>
          )}
        </button>
        <div>
          <span className="stamp" data-ink={s.stamp.ink} data-tier={s.stamp.tier}>
            {s.second ? 'Second opinion' : s.stamp.text}
          </span>
          <h2 className="drink__name">{s.drink.name}</h2>
          <p className="drink__meta">
            {glassLabel(s.drink)} · {s.drink.serve}
            {s.drink.alcoholic ? ` · ${s.drink.abv}% abv` : ' · alcohol-free'}
          </p>
        </div>
      </div>
      <p className="drink__line">
        <Loud text={lines.drink} /> {lines.serve} <span className="drink__closer">{lines.closer}</span>
      </p>
      <p className="snack">
        <span className="snack__label">On the side</span> <b>{snack.name}</b>{' '}
        <span className="snack__note">{snack.note}</span>
      </p>
      <Budget drink={s.drink} india={india} />
      <div className="row drink__actions">
        <button
          type="button"
          className="btn"
          aria-expanded={open}
          aria-controls="recipe"
          onClick={() => {
            play('shhk');
            patch({ flipped: !open });
          }}
        >
          <ChevronDown size={16} strokeWidth={2} aria-hidden="true" className={open ? 'rot' : undefined} />
          {open ? 'Hide recipe' : 'Recipe'}
        </button>
        {v.runnersUp.length > 0 && (
          <button type="button" className="btn" onClick={second}>
            <RefreshCw size={16} strokeWidth={2} aria-hidden="true" />
            {s.second ? 'His first answer' : 'Second opinion'}
          </button>
        )}
        {twin && twin.id !== s.drink.id && (
          <button
            type="button"
            className="btn"
            onClick={() => setSettings({ menu: s.drink.alcoholic ? 'barista' : 'bar' })}
          >
            <GlassWater size={16} strokeWidth={2} aria-hidden="true" />
            {s.drink.alcoholic ? 'Make it alcohol-free' : 'Make it a cocktail'}
          </button>
        )}
        <button type="button" className="btn" onClick={() => void tearReceipt()}>
          <Share2 size={16} strokeWidth={2} aria-hidden="true" /> Share card
        </button>
      </div>
      {open && <Recipe drink={s.drink} />}
    </article>
  );
}

/** Bartending second: the drink for that weather, at the price you want to pay. */
export function DrinkCard(): ReactElement | null {
  const coaster = useBar((s) => s.coaster);
  const slide = useBar((s) => s.slide);
  if (coaster.kind === 'verdict') {
    return (
      <div className="slide-in" key={slide}>
        <Pick v={coaster.verdict} note={coaster.note} />
      </div>
    );
  }
  if (coaster.kind === 'pouring' || coaster.kind === 'empty') {
    return (
      <section className="card drink drink--waiting" aria-busy="true" aria-label="The bartender is choosing">
        <p className="eyebrow">The bartender recommends</p>
        <div className="skel skel--lg" />
        <div className="skel skel--xl" />
        <div className="skel skel--sm" />
      </section>
    );
  }
  return null;
}
