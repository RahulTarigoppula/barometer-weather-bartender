/**
 * Optional live road speeds from TomTom's Traffic Flow API — only when the user pastes their own
 * free key in Settings. The key stays on this device and is sent only to api.tomtom.com.
 */
export interface LiveFlow {
  currentKmh: number;
  freeFlowKmh: number;
  confidence: number;
  roadClosure: boolean;
}

export const TOMTOM_HOST = 'https://api.tomtom.com';

export const flowUrl = (lat: number, lng: number, key: string): string =>
  `${TOMTOM_HOST}/traffic/services/4/flowSegmentData/absolute/10/json?point=${lat.toFixed(4)},${lng.toFixed(4)}&unit=KMPH&key=${encodeURIComponent(key)}`;

type Rec = Record<string, unknown>;
const isRec = (x: unknown): x is Rec => typeof x === 'object' && x !== null && !Array.isArray(x);
const num = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null);

export function parseFlow(body: unknown): LiveFlow | null {
  if (!isRec(body) || !isRec(body.flowSegmentData)) return null;
  const f = body.flowSegmentData;
  const cur = num(f.currentSpeed);
  const free = num(f.freeFlowSpeed);
  if (cur === null || free === null) return null;
  return {
    currentKmh: cur,
    freeFlowKmh: free,
    confidence: num(f.confidence) ?? 0,
    roadClosure: f.roadClosure === true,
  };
}

export async function fetchFlow(
  lat: number,
  lng: number,
  key: string,
  f: (u: string) => Promise<Response> = (u) => fetch(u, { referrerPolicy: 'no-referrer' }),
): Promise<LiveFlow | null> {
  const res = await f(flowUrl(lat, lng, key));
  if (res.status === 403 || res.status === 401) throw new Error('The TomTom key was refused.');
  if (!res.ok) return null; // no road segment nearby (sea, desert) or a hiccup
  return parseFlow(await res.json());
}
