import { type ReactElement, useId, useState } from 'react';
import { openDrawer } from '../../app/route';
import { Knob, Lever, Seg } from '../../components/ui/Controls';
import { TIER_LABEL, TIERS, type Tier } from '../../engine/budget';
import { useSettings } from '../../state/settings';

/** Optional live road speeds with the user's own free TomTom key. Stored on this device only. */
function LiveRoads(): ReactElement {
  const key = useSettings((s) => s.tomtomKey);
  const set = useSettings((s) => s.set);
  const [draft, setDraft] = useState(key);
  const id = useId();
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        Live roads (optional)
      </label>
      <div className="field__group">
        <input
          id={id}
          className="input"
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder="TomTom API key"
          value={draft}
          onChange={(e) => setDraft(e.target.value.trim())}
        />
        <button type="button" className="btn" disabled={draft === key} onClick={() => set({ tomtomKey: draft })}>
          Save
        </button>
        {key && (
          <button
            type="button"
            className="btn"
            onClick={() => {
              setDraft('');
              set({ tomtomKey: '' });
            }}
          >
            Remove
          </button>
        )}
      </div>
      <p className="field__desc">
        Without a key, Roads shows an honest estimate from rush hours and the weather. With a free key from{' '}
        <a href="https://developer.tomtom.com/" target="_blank" rel="noopener noreferrer">
          developer.tomtom.com
        </a>{' '}
        it shows live speeds on the nearest road. The key stays on this device and is sent only to TomTom.
      </p>
    </div>
  );
}

/** Settings: segmented controls, switches and a volume knob. */
export function BackOffice(): ReactElement {
  const s = useSettings();
  const set = s.set;
  return (
    <>
      <div className="field">
        <span className="field__label">Budget</span>
        <Seg<Tier>
          label="Default budget"
          value={s.tier}
          options={TIERS.map((t) => ({ value: t, label: TIER_LABEL[t] }))}
          onChange={(tier) => set({ tier })}
        />
        <p className="field__desc">Every recommendation shows the pour, the place and a ₹ range for this budget.</p>
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
      <LiveRoads />
      <div className="field">
        <span className="field__label">Saved places</span>
        {s.saved.length === 0 ? (
          <p className="field__desc">Tap the star beside a place name to keep it one tap away under the globe.</p>
        ) : (
          <div className="chips">
            {s.saved.map((p) => (
              <button
                key={`${p.name}-${p.lat}`}
                type="button"
                className="chip chip--action"
                aria-label={`Remove ${p.name}`}
                onClick={() => s.toggleSaved(p)}
              >
                {p.name} ✕
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="attrib">
        Weather by Open-Meteo.com (CC BY 4.0) · Air quality: CAMS ENSEMBLE (Copernicus) · Marine: DWD · Live roads
        (optional): TomTom
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
