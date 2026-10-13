import { ChevronDown } from 'lucide-react';
import type { ReactElement } from 'react';
import { tipsFor } from '../../engine/outlook';
import { fmtTempShort } from '../../engine/units';
import { sentence, wmoLabel } from '../../engine/wmo';
import { useSettings } from '../../state/settings';
import { currentVerdict, useBar } from '../../state/store';
import { iconFor } from '../weather/icons';

/**
 * Weather first, even on a phone: a glass card over the planet with the place, the temperature,
 * the sky and the one thing to know. Hidden on wide screens, where the weather card is beside it.
 */
export function NowPeek(): ReactElement | null {
  const v = useBar((s) => currentVerdict(s));
  const temp = useSettings((s) => s.units.temp);
  if (!v) return null;
  const f = v.features;
  const Icon = iconFor(f.wmo, f.isDay);
  const name =
    v.place.nearestCity?.distanceKm !== undefined && v.place.nearestCity.distanceKm < 25
      ? v.place.nearestCity.name
      : v.place.label;
  const tip = tipsFor(f, v.forecast?.hours)[0];
  return (
    <button
      type="button"
      className="peek"
      onClick={() => document.getElementById('main')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
      aria-label={`${name}: ${fmtTempShort(f.tempC, temp)}, ${wmoLabel(f.wmo)}. Jump to today's weather.`}
    >
      <Icon className="peek__icon" size={34} strokeWidth={1.5} aria-hidden="true" />
      <span className="peek__main">
        <span className="peek__place">{name}</span>
        <span className="peek__sky">
          {sentence(wmoLabel(f.wmo))} · feels {fmtTempShort(f.apparentC, temp)}
          {tip ? ` · ${tip.label}` : ''}
        </span>
      </span>
      <span className="peek__temp num">{fmtTempShort(f.tempC, temp)}</span>
      <ChevronDown className="peek__go" size={18} aria-hidden="true" />
    </button>
  );
}
