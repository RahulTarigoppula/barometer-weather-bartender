import { type ReactElement, type ReactNode, useEffect, useRef } from 'react';

interface DrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  wide?: boolean;
  children: ReactNode;
}

/** A sheet on the phone, a right-hand drawer on desktop. Escape closes it and focus returns to the opener. */
export function Drawer({ open, title, onClose, wide = false, children }: DrawerProps): ReactElement {
  const ref = useRef<HTMLElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    const t = window.setTimeout(() => ref.current?.querySelector<HTMLElement>('[data-autofocus], button')?.focus(), 60);
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab' || !ref.current) return;
      const f = ref.current.querySelectorAll<HTMLElement>('button:not([disabled]), a, input, [tabindex="0"]');
      const first = f[0];
      const last = f[f.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      if (opener.current instanceof HTMLElement) opener.current.focus();
    };
  }, [open, onClose]);

  return (
    <>
      <div className={`scrim${open ? ' scrim--on' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside
        ref={ref}
        className={`drawer${open ? ' drawer--open' : ''}${wide ? ' drawer--wide' : ''}`}
        role="dialog"
        aria-modal={open}
        aria-label={title}
        aria-hidden={!open}
      >
        <div className="drawer__hd">
          <h2 className="drawer__title">{title}</h2>
          <button type="button" className="plate" onClick={onClose}>
            Close
          </button>
        </div>
        {open && children}
      </aside>
    </>
  );
}
