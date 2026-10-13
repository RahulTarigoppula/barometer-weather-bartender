import { create } from 'zustand';
import type { Verdict } from '../engine/types';

export type ErrorKind = 'busy' | 'silent' | 'nowhere';

export type CoasterState =
  | { kind: 'empty' }
  | { kind: 'pouring'; lat: number; lng: number }
  | { kind: 'verdict'; verdict: Verdict; note: 'stale' | 'repoured' | null }
  | { kind: 'error'; error: ErrorKind; lat: number; lng: number; retryAt: number };

export type GlobeStatus = 'svg' | 'webgl' | 'seized';

export interface Toast {
  id: number;
  text: string;
}

export interface Pin {
  lat: number;
  lng: number;
  /** Bumps on every pour so the pin re-drops even on the same spot. */
  n: number;
}

interface BarState {
  coaster: CoasterState;
  /** Bumps when a new verdict card arrives — NOT when the same verdict re-renders. */
  slide: number;
  pin: Pin | null;
  /** 0 = the bartender's pick; 1.. = the "second opinion" runners-up. */
  opinion: number;
  /** The recipe panel is open. */
  flipped: boolean;
  toast: Toast | null;
  globe: GlobeStatus;
  online: boolean;
  restock: (() => void) | null;
  lastDrinkId: string | undefined;
  /** The globe's camera target, so the keyboard can pour at the centre. */
  center: { lat: number; lng: number };
  /** India right now: Celsius by city name, for the globe labels. */
  cityTemps: Record<string, number>;
}

interface BarActions {
  patch: (p: Partial<BarState>) => void;
  showToast: (text: string) => void;
}

let toastSeq = 0;

/** India is the default view. */
export const HOME = { lat: 22.5, lng: 79.5 };

export const useBar = create<BarState & BarActions>()((set) => ({
  coaster: { kind: 'empty' },
  slide: 0,
  pin: null,
  opinion: 0,
  flipped: false,
  toast: null,
  globe: 'svg',
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  restock: null,
  lastDrinkId: undefined,
  center: HOME,
  cityTemps: {},
  patch: (p) => set(p),
  showToast: (text) => set({ toast: { id: ++toastSeq, text } }),
}));

export const currentVerdict = (s: Pick<BarState, 'coaster'>): Verdict | null =>
  s.coaster.kind === 'verdict' ? s.coaster.verdict : null;
