import { cn } from '@/lib/utils';

import type { ReactNode } from 'react';

export interface ListRowProps {
  leading?: ReactNode;
  media?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  isSelected?: boolean;
  isDisabled?: boolean;
  // the title area is its own button, so a checkbox in leading or buttons in trailing never nest inside it
  onActivate?(): void;
  activateLabel?: string;
  className?: string;
}

export default function ListRow({ leading, media, title, meta, trailing, isSelected = false, isDisabled = false, onActivate, activateLabel, className }: ListRowProps) {
  const body = (
    <>
      {media}
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-sm leading-5 font-medium text-ink">{title}</span>
        {meta && <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">{meta}</span>}
      </span>
    </>
  );

  return (
    <li
      className={cn(
        'group/row flex items-center gap-3 rounded-control px-3 py-2.5 transition-quiet',
        isSelected ? 'bg-spin-soft' : 'hover:bg-surface-hover',
        isDisabled && 'opacity-60',
        className,
      )}
    >
      {leading}
      {onActivate ? (
        <button type="button" aria-label={activateLabel} disabled={isDisabled} onClick={onActivate} className="flex min-w-0 flex-1 items-center gap-3 rounded-row text-left disabled:cursor-not-allowed">
          {body}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{body}</div>
      )}
      {trailing && <div className="flex flex-shrink-0 items-center gap-1">{trailing}</div>}
    </li>
  );
}
