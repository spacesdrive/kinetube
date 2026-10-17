import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export interface FrameProps {
  // the whole picture's description; the card reads as one image
  label: string;
  icon: ReactNode;
  title: string;
  meta?: ReactNode;
  bodyClassName?: string;
  children: ReactNode;
}

// a small app window for a bento card: a title bar, then content sized to fit inside it, resting on the panel's lower edge
export function Frame({ label, icon, title, meta, bodyClassName, children }: FrameProps) {
  return (
    <div role="img" aria-label={label} className="relative mx-auto flex min-h-[23rem] w-full max-w-[27rem] flex-1 flex-col overflow-hidden rounded-t-card border border-b-0 border-line bg-surface-elevated shadow-window">
      <div className="flex items-center gap-2.5 border-b border-line px-5 py-3.5">
        <span className="flex shrink-0 text-ink-muted">{icon}</span>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{title}</p>
        {meta}
      </div>
      {/* laid out on its own so the content never makes the row taller than its neighbour */}
      <div className="relative min-h-0 flex-1">
        <div className={cn('absolute inset-0 p-5', bodyClassName)}>{children}</div>
      </div>
    </div>
  );
}
