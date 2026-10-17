import { useHoldToConfirm } from '@/hooks/useHoldToConfirm';
import { cn } from '@/lib/utils';

import type { KeyboardEvent, ReactNode } from 'react';

export interface HoldToConfirmButtonProps {
  label: string;
  holdingLabel?: string;
  icon?: ReactNode;
  holdMs?: number;
  onConfirm(): void;
  className?: string;
}

const DEFAULT_HOLD_MS = 1_200;

function isHoldKey(event: KeyboardEvent): boolean {
  return event.key === ' ' || event.key === 'Enter';
}

// a click never fires the action; pressing and holding (mouse, touch, Space or Enter) fills the bar first
export default function HoldToConfirmButton({ label, holdingLabel = 'Keep holding...', icon, holdMs = DEFAULT_HOLD_MS, onConfirm, className }: HoldToConfirmButtonProps) {
  const hold = useHoldToConfirm(holdMs, onConfirm);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!isHoldKey(event)) return;
    event.preventDefault();
    if (!event.repeat) hold.start();
  }

  function handleKeyUp(event: KeyboardEvent<HTMLButtonElement>) {
    if (isHoldKey(event)) hold.cancel();
  }

  return (
    <button
      type="button"
      aria-label={`${label}. Press and hold to confirm.`}
      onPointerDown={hold.start}
      onPointerUp={hold.cancel}
      onPointerLeave={hold.cancel}
      onPointerCancel={hold.cancel}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onBlur={hold.cancel}
      className={cn('relative inline-flex h-9 touch-none items-center justify-center gap-2 overflow-hidden rounded-pill bg-error-soft px-4 text-sm font-semibold text-error select-none transition-quiet', className)}
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 bg-error/25" style={{ width: `${hold.progress * 100}%` }} />
      <span className="relative flex items-center gap-2 [&_svg]:size-4">
        {icon}
        {hold.isHolding ? holdingLabel : label}
      </span>
    </button>
  );
}
