import { type KeyboardEvent, type PointerEvent, type ReactElement, useRef } from 'react';
import { haptic } from '../../platform/haptics';

interface LeverProps {
  checked: boolean;
  label: string;
  onChange: (on: boolean) => void;
  disabled?: boolean;
}

/** A bar-tap lever: role="switch", 60×32 track, a brass knuckle that slides 26 px. */
export function Lever({ checked, label, onChange, disabled = false }: LeverProps): ReactElement {
  return (
    <button
      type="button"
      className="lever"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        haptic('selection');
        onChange(!checked);
      }}
    />
  );
}

interface SegProps<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: string; disabled?: boolean }[];
  onChange: (v: T) => void;
}

/** A brass segmented control: a radio group with roving arrow keys. */
export function Seg<T extends string>({ label, value, options, onChange }: SegProps<T>): ReactElement {
  const onKey = (e: KeyboardEvent<HTMLDivElement>): void => {
    const enabled = options.filter((o) => !o.disabled);
    const i = enabled.findIndex((o) => o.value === value);
    const step =
      e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    const next = enabled[(i + step + enabled.length) % enabled.length];
    if (next) {
      onChange(next.value);
      haptic('selection');
      const btn = e.currentTarget.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`);
      btn?.focus();
    }
    e.preventDefault();
  };
  return (
    <div className="seg" role="radiogroup" aria-label={label} onKeyDown={onKey}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          data-value={o.value}
          aria-checked={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          disabled={o.disabled}
          onClick={() => {
            haptic('selection');
            onChange(o.value);
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

interface KnobProps {
  value: number; // 0..100
  label: string;
  onChange: (v: number) => void;
}

/** The brass volume knob: role="slider", 0–100 in steps of 5, arrows/Home/End, drag to turn. */
export function Knob({ value, label, onChange }: KnobProps): ReactElement {
  const drag = useRef<{ y: number; v: number } | null>(null);
  const clamp = (v: number): number => Math.max(0, Math.min(100, Math.round(v / 5) * 5));
  const onKey = (e: KeyboardEvent<HTMLDivElement>): void => {
    const map: Record<string, number> = { ArrowUp: 5, ArrowRight: 5, ArrowDown: -5, ArrowLeft: -5 };
    if (e.key in map) onChange(clamp(value + (map[e.key] ?? 0)));
    else if (e.key === 'Home') onChange(0);
    else if (e.key === 'End') onChange(100);
    else return;
    e.preventDefault();
  };
  const onDown = (e: PointerEvent<HTMLDivElement>): void => {
    drag.current = { y: e.clientY, v: value };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>): void => {
    if (drag.current) onChange(clamp(drag.current.v + (drag.current.y - e.clientY)));
  };
  return (
    <div
      className="knob"
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-valuetext={`${value} percent`}
      style={{ ['--knob-angle' as string]: `${-135 + value * 2.7}deg` }}
      onKeyDown={onKey}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={() => {
        drag.current = null;
      }}
    />
  );
}
