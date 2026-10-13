import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Tier } from '../engine/budget';
import type { Menu } from '../engine/types';
import type { TempUnit, WindUnit } from '../engine/units';
import { prefsStorage } from '../platform/prefs';

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
}

interface SettingsStore extends Settings {
  set: (patch: Partial<Settings>) => void;
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
};

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      set: (patch) => set(patch),
    }),
    {
      name: 'globe-bar-settings',
      version: 2,
      storage: createJSONStorage(() => prefsStorage),
      partialize: ({ set: _set, ...rest }) => rest,
      migrate: (old) => ({ ...DEFAULT_SETTINGS, ...(typeof old === 'object' && old ? old : {}) }),
    },
  ),
);

/** Reduced motion is the OS setting OR the Back Office lever — both produce the identical DOM. */
export function reducedMotion(): boolean {
  const os = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return os || useSettings.getState().motion === 'less';
}
