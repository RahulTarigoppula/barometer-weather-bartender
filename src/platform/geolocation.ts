import { isNative } from './native';

export class LocationDeniedError extends Error {
  constructor() {
    super('The bar respects your privacy. Spin the globe instead.');
    this.name = 'LocationDeniedError';
  }
}

/** Device location, requested only when "Where am I" is tapped. The result is resolved offline. */
export async function whereAmI(): Promise<{ lat: number; lng: number }> {
  if (isNative()) {
    const { Geolocation } = await import('@capacitor/geolocation');
    try {
      const p = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10_000 });
      return { lat: p.coords.latitude, lng: p.coords.longitude };
    } catch {
      throw new LocationDeniedError();
    }
  }
  if (!('geolocation' in navigator)) throw new LocationDeniedError();
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => reject(new LocationDeniedError()),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 },
    );
  });
}
