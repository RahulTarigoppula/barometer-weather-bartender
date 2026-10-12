import { useSyncExternalStore } from 'react';
import { useSettings } from '../state/settings';

const query = '(prefers-reduced-motion: reduce)';
const subscribe = (cb: () => void): (() => void) => {
  const m = matchMedia(query);
  m.addEventListener('change', cb);
  return () => m.removeEventListener('change', cb);
};

/** OS reduced-motion OR the Back Office "Motion: less" lever. */
export function useReduced(): boolean {
  const os = useSyncExternalStore(subscribe, () => matchMedia(query).matches);
  const less = useSettings((s) => s.motion === 'less');
  return os || less;
}
