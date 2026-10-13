import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Tier } from '../engine/budget';
import type { Menu } from '../engine/types';
import type { TempUnit, WindUnit } from '../engine/units';
import { prefsStorage } from '../platform/prefs';

export interface SavedPlace {
  name: string;
  lat: number;
  lng: number;
}

export interface Settings {
  units: { temp: TempUnit; wind: WindUnit };
  /** The BAR/BARISTA switch. Persisted: the bar remembers which menu you were on. */
  menu: Menu;
  /** Extreme Cheap · Budget · Mid-range · High-end. */
  tier: Tier;
  sound: boolean;
  volume: number;
  haptics: boolean;
  motion: 'full' | 'less';
  gentler: boolean;
  /** Starred places, shown first under the globe. At most eight. */
  saved: SavedPlace[];
  /** Optional TomTom key for live road speeds. Stays on this device. */
  tomtomKey: string;
  /** The opening story has played once on this device. */
  storySeen: boolean;
  /** Keep a history of places on this device. Off means nothing is remembered between visits. */
  keepHistory: boolean;
}

interface SettingsStore extends Settings {
  set: (patch: Partial<Settings>) => void;
  toggleSaved: (p: SavedPlace) => void;
}

export const DEFAULT_SETTINGS: Settings = {
  units: { temp: 'C', wind: 'kmh' },
  menu: 'bar',
  tier: 'budget',
  sound: true,
  volume: 0.6,
  haptics: true,
  motion: 'full',
  gentler: false,
  saved: [],
  tomtomKey: '',
  storySeen: false,
  keepHistory: true,
};

export const MAX_SAVED = 8;
/** Two places within ~2 km are the same place. */
export const samePlace = (a: { lat: number; lng: number }, b: { lat: number; lng: number }): boolean =>
  Math.abs(a.lat - b.lat) < 0.02 && Math.abs(a.lng - b.lng) < 0.02;

export const useSettings = create<SettingsStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,
      set: (patch) => set(patch),
      toggleSaved: (p) => {
        const saved = get().saved;
        const has = saved.some((s) => samePlace(s, p));
        set({ saved: has ? saved.filter((s) => !samePlace(s, p)) : [p, ...saved].slice(0, MAX_SAVED) });
      },
    }),
    {
      name: 'globe-bar-settings',
      version: 3,
      storage: createJSONStorage(() => prefsStorage),
      partialize: ({ set: _set, toggleSaved: _t, ...rest }) => rest,
      migrate: (old) => ({ ...DEFAULT_SETTINGS, ...(typeof old === 'object' && old ? old : {}) }),
    },
  ),
);

/** Reduced motion is the OS setting OR the Back Office lever, both produce the identical DOM. */
export function reducedMotion(): boolean {
  const os = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return os || useSettings.getState().motion === 'less';
}
