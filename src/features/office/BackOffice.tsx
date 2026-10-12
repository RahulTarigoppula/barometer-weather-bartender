import type { ReactElement } from 'react';
import { openDrawer } from '../../app/route';
import { Knob, Lever, Seg } from '../../components/ui/Controls';
import { useSettings } from '../../state/settings';

/** Settings, in bar furniture: brass segmented controls, bar-tap levers and a brass knob. */
export function BackOffice(): ReactElement {
  const s = useSettings();
  const set = s.set;
  return (
    <>
      <div className="field">
        <span className="field__label">Shift</span>
        <Seg
          label="Shift"
          value={s.shift}
          options={[
            { value: 'follow', label: 'Follow the place' },
            { value: 'night', label: 'Night' },
            { value: 'day', label: 'Day' },
          ]}
          onChange={(shift) => set({ shift })}
        />
        <p className="field__desc">The room follows the clicked place’s daylight. Pin it if you prefer one shift.</p>
      </div>
      <div className="field">
        <span className="field__label">Units</span>
        <div className="field__group">
          <Seg
            label="Temperature units"
            value={s.units.temp}
            options={[
              { value: 'C', label: '°C' },
              { value: 'F', label: '°F' },
            ]}
            onChange={(temp) => set({ units: { ...s.units, temp } })}
          />
          <Seg
            label="Wind units"
            value={s.units.wind}
            options={[
              { value: 'kmh', label: 'km/h' },
              { value: 'mph', label: 'mph' },
              { value: 'kn', label: 'kn' },
            ]}
            onChange={(wind) => set({ units: { ...s.units, wind } })}
          />
        </div>
      </div>
      <div className="field">
        <span className="field__label">Menu</span>
        <Seg
          label="Menu"
          value={s.menu}
          options={[
            { value: 'bar', label: 'Bar' },
            { value: 'barista', label: 'Barista' },
          ]}
          onChange={(menu) => set({ menu })}
        />
        <p className="field__desc">Barista pours the alcohol-free twin of every drink. Same insult, no rum.</p>
      </div>
      <div className="field">
        <span className="field__label">Sound</span>
        <div className="field__group">
          <Lever checked={s.sound} label="Sound" onChange={(sound) => set({ sound })} />
          <Knob value={Math.round(s.volume * 100)} label="Master volume" onChange={(v) => set({ volume: v / 100 })} />
        </div>
        <p className="field__desc">Bar sounds only — a brass tink, a wooden shhk, a thermal feed. Never a UI beep.</p>
      </div>
      <div className="field">
        <span className="field__label">Haptics</span>
        <Lever checked={s.haptics} label="Haptics" onChange={(haptics) => set({ haptics })} />
      </div>
      <div className="field">
        <span className="field__label">Motion</span>
        <Seg
          label="Motion"
          value={s.motion}
          options={[
            { value: 'full', label: 'Full' },
            { value: 'less', label: 'Less' },
          ]}
          onChange={(motion) => set({ motion })}
        />
      </div>
      <div className="field">
        <span className="field__label">Bartender</span>
        <Seg
          label="Bartender"
          value={s.gentler ? 'gentler' : 'normal'}
          options={[
            { value: 'normal', label: 'Normal' },
            { value: 'gentler', label: 'Gentler' },
          ]}
          onChange={(v) => set({ gentler: v === 'gentler' })}
        />
        <p className="field__desc">
          He judges the weather and your choices, never people. Gentler tones down the shouting.
        </p>
      </div>
      <div className="field">
        <span className="field__label">AI garnish</span>
        <Seg
          label="AI garnish"
          value="0"
          options={[
            { value: '0', label: '0 · Procedural' },
            { value: '1', label: '1 · Keyless', disabled: true },
            { value: '2', label: '2 · Own key', disabled: true },
          ]}
          onChange={() => undefined}
        />
        <p className="field__desc">
          Rung 0 is the bartender: procedural, offline, deterministic. The language-model rungs are not stocked yet.
        </p>
      </div>
      <p className="attrib">
        Weather by Open-Meteo.com (CC BY 4.0) · Air quality: CAMS ENSEMBLE (Copernicus) · Marine: DWD
        <br />
        Planet: NASA Earth Observatory (public domain) · Places: Natural Earth (public domain)
        <br />
        Drinks: IBA cocktails &amp; Open Drinks (MIT), method text written in-house · Fonts: OFL
        <br />
        No analytics, no telemetry, no accounts, no cookies. · Version {__APP_VERSION__}
      </p>
      <div className="drawer__actions">
        <button type="button" className="plate plate--ghost" onClick={() => openDrawer('about')}>
          Credits &amp; licences
        </button>
      </div>
    </>
  );
}
