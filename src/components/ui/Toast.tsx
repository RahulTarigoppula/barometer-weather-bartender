import { type ReactElement, useEffect, useState } from 'react';
import { useBar } from '../../state/store';

/** Toasts are brass tags on the counter edge: 4 s, one at a time. */
export function Toast(): ReactElement {
  const toast = useBar((s) => s.toast);
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!toast) return;
    setOn(true);
    const t = window.setTimeout(() => setOn(false), 4000);
    return () => window.clearTimeout(t);
  }, [toast]);
  return (
    <div className={`toast${on ? ' toast--on' : ''}`} role="status" aria-live="polite">
      {toast?.text}
    </div>
  );
}
