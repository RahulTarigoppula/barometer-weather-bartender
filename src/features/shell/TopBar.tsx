import { History, Settings } from 'lucide-react';
import type { ReactElement } from 'react';
import { openDrawer } from '../../app/route';
import { play } from '../../audio/sfx';
import { fmtTempShort } from '../../engine/units';
import { sentence, wmoLabel } from '../../engine/wmo';
import { haptic } from '../../platform/haptics';
import { useSettings } from '../../state/settings';
import { currentVerdict, useBar } from '../../state/store';
import { Search, WhereAmI } from '../search/Search';

/** BAR ↔ BARISTA: alcoholic or alcohol-free menu. */
export function MenuSwitch(): ReactElement {
  const menu = useSettings((s) => s.menu);
  const set = useSettings((s) => s.set);
  const barista = menu === 'barista';
  return (
    <button
      type="button"
      className={`switch${barista ? ' switch--on' : ''}`}
      role="switch"
      aria-checked={barista}
      aria-label="Alcohol-free menu"
      onClick={() => {
        play('clack');
        haptic('selection');
        set({ menu: barista ? 'bar' : 'barista' });
      }}
    >
      <span className="switch__opt" data-active={!barista}>
        Bar
      </span>
      <span className="switch__opt" data-active={barista}>
        Barista
      </span>
    </button>
  );
}

/** Once the place name scrolls away, a slim line keeps it, and the temperature, in sight. */
function NowLine(): ReactElement | null {
  const hidden = useBar((s) => s.headHidden);
  const v = useBar((s) => currentVerdict(s));
  const temp = useSettings((s) => s.units.temp);
  if (!hidden || !v) return null;
  const name =
    v.place.nearestCity?.distanceKm !== undefined && v.place.nearestCity.distanceKm < 25
      ? v.place.nearestCity.name
      : v.place.label;
  return (
    <button
      type="button"
      className="topbar__now"
      onClick={() => document.querySelector('.weather')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
    >
      <b>{name}</b>
      <span className="num">{fmtTempShort(v.features.tempC, temp)}</span>
      <span className="topbar__nowsky">{sentence(wmoLabel(v.features.wmo))}</span>
    </button>
  );
}

export function TopBar(): ReactElement {
  const online = useBar((s) => s.online);
  return (
    <header className="topbar">
      <a className="brand" href="#/" aria-label="Mausam ka Mahaul home">
        <span className="brand__mark" aria-hidden="true" />
        <span className="brand__name">
          Mausam<span className="hide-sm"> ka Mahaul</span>
        </span>
        <span className="brand__tag hide-sm" lang="hi">
          मौसम का माहौल
        </span>
      </a>
      <div className="topbar__search">
        <Search />
      </div>
      <div className="topbar__tools">
        {!online && <span className="chip chip--warn">Offline</span>}
        <WhereAmI />
        <MenuSwitch />
        <button type="button" className="icon-btn" aria-label="History" onClick={() => openDrawer('tab')}>
          <History size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <button type="button" className="icon-btn" aria-label="Settings" onClick={() => openDrawer('office')}>
          <Settings size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
      <NowLine />
    </header>
  );
}
