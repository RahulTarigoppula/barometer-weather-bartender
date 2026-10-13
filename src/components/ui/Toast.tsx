import { type ReactElement, useEffect, useState } from 'react';
import { useBar } from '../../state/store';

/** One toast at a time, on screen long enough to read: about 60 ms a character, 4 to 8 s. */
export function Toast(): ReactElement {
  const toast = useBar((s) => s.toast);
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!toast) return;
    setOn(true);
    const t = window.setTimeout(() => setOn(false), Math.min(8000, Math.max(4000, toast.text.length * 60)));
    return () => window.clearTimeout(t);
  }, [toast]);
  return (
    <div className={`toast${on ? ' toast--on' : ''}`} role="status" aria-live="polite">
      {toast?.text}
    </div>
  );
}
