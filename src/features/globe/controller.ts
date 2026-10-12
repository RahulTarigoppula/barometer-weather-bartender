export interface GlobeCallbacks {
  onPick: (lat: number, lng: number) => void;
  onCenter: (lat: number, lng: number) => void;
  onLost: () => void;
  reduced: () => boolean;
}

/** One interface for the WebGL globe and the canvas fallback, so the cradle does not care which is mounted. */
export interface GlobeController {
  flyTo(lat: number, lng: number): void;
  setPin(pin: { lat: number; lng: number; n: number } | null): void;
  nudge(dLat: number, dLng: number): void;
  zoom(factor: number): void;
  center(): { lat: number; lng: number };
  pause(paused: boolean): void;
  dispose(): void;
}

export const IDLE_MS = 8000;

/** The brass pin, shared by both globes. */
export function pinElement(): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'pin-anchor';
  el.style.cssText = 'width:0;height:0;pointer-events:none;overflow:visible';
  el.innerHTML =
    '<svg class="pin" width="26" height="34" viewBox="0 0 26 34" aria-hidden="true" style="display:block;translate:-13px -34px">' +
    '<path d="M13 33 L13 15" stroke="#8A6414" stroke-width="2.4" stroke-linecap="round"/>' +
    '<circle cx="13" cy="9" r="8" fill="url(#brassV)" stroke="#5A3F0C" stroke-width="1.2"/>' +
    '<circle cx="10.5" cy="6.5" r="2.4" fill="#F5C860" opacity=".8"/></svg>';
  return el;
}

export function dropPin(el: HTMLElement, reduced: boolean): void {
  const svg = el.querySelector('.pin');
  if (!svg || reduced) return;
  svg.classList.remove('pin--drop');
  void (svg as SVGElement).getBoundingClientRect();
  svg.classList.add('pin--drop');
}
