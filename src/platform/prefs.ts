import type { StateStorage } from 'zustand/middleware';
import { isNative } from './native';

/** Settings storage: localStorage on the web, @capacitor/preferences in the APK. Never throws. */
export const prefsStorage: StateStorage = {
  async getItem(key) {
    if (isNative()) {
      const { Preferences } = await import('@capacitor/preferences');
      return (await Preferences.get({ key })).value;
    }
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async setItem(key, value) {
    if (isNative()) {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.set({ key, value });
      return;
    }
    try {
      localStorage.setItem(key, value);
    } catch {
      // private mode / quota — settings simply do not persist
    }
  },
  async removeItem(key) {
    if (isNative()) {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.remove({ key });
      return;
    }
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};
