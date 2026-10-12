import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Menu } from '../engine/types';
import type { TempUnit, WindUnit } from '../engine/units';
import { prefsStorage } from '../platform/prefs';

export interface Settings {
  shift: 'follow' | 'night' | 'day';
  units: { temp: TempUnit; wind: WindUnit };
  /** The BAR/BARISTA sign. Persisted: the bar remembers which menu you were on. */
  menu: Menu;
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
  shift: 'follow',
  units: { temp: 'C', wind: 'kmh' },
  menu: 'bar',
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
      version: 1,
      storage: createJSONStorage(() => prefsStorage),
      partialize: ({ set: _set, ...rest }) => rest,
    },
  ),
);

/** Reduced motion is the OS setting OR the Back Office lever — both produce the identical DOM. */
export function reducedMotion(): boolean {
  const os = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return os || useSettings.getState().motion === 'less';
}
