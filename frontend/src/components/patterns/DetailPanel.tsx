import { cn } from '@/lib/utils';

import type { ReactNode } from 'react';

export interface DetailPanelProps {
  title: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

// the settings column beside a working surface; it sticks under the top bar on wide windows
export default function DetailPanel({ title, description, footer, children, className }: DetailPanelProps) {
  return (
    <aside aria-label={title} className={cn('flex flex-col rounded-card bg-surface lg:sticky lg:top-6', className)}>
      <div className="px-5 pt-5">
        <h2 className="text-section text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-ink-muted">{description}</p>}
      </div>
      <div className="flex-1 space-y-5 p-5">{children}</div>
      {footer && <div className="border-t border-divider p-5">{footer}</div>}
    </aside>
  );
}
