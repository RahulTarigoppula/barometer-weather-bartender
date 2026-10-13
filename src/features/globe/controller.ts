export interface GlobeCallbacks {
  onPick: (lat: number, lng: number) => void;
  onCenter: (lat: number, lng: number) => void;
  onLost: () => void;
  reduced: () => boolean;
}

/** One interface for the WebGL globe and the canvas fallback, so the stage does not care which is mounted. */
export interface GlobeController {
  flyTo(lat: number, lng: number): void;
  setPin(pin: { lat: number; lng: number; n: number } | null): void;
  nudge(dLat: number, dLng: number): void;
  zoom(factor: number): void;
  /** The camera is as far out as the planet view goes (the next step out is the universe). */
  atFarLimit(): boolean;
  /** Back to the India view. */
  home(): void;
  center(): { lat: number; lng: number };
  /** Live temperatures beside the Indian city labels ("31°"), by city name. Optional. */
  setCityTemps?(temps: Record<string, string>): void;
  pause(paused: boolean): void;
  dispose(): void;
}

export const IDLE_MS = 8000;

/** The camera's home: India, slightly north of centre so the whole subcontinent sits in frame. */
export const HOME_VIEW = { lat: 22.5, lng: 79.5 };

/** The location pin, shared by both globes. */
export function pinElement(): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'pin-anchor';
  el.style.cssText = 'width:0;height:0;pointer-events:none;overflow:visible';
  el.innerHTML = '<span class="pin"><span class="pin__pulse"></span><span class="pin__dot"></span></span>';
  return el;
}

export function dropPin(el: HTMLElement, reduced: boolean): void {
  const pin = el.querySelector('.pin');
  if (!(pin instanceof HTMLElement) || reduced) return;
  pin.classList.remove('pin--drop');
  void pin.offsetWidth;
  pin.classList.add('pin--drop');
}
