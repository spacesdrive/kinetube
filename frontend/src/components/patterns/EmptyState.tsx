import BrandMark from '@/components/shell/BrandMark';
import { cn } from '@/lib/utils';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

// without an icon the brand mark stands in, faded, as the one brand moment on an empty screen
export default function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-14 text-center', className)}>
      <span className="mb-4 flex size-12 items-center justify-center rounded-pill bg-surface text-ink-muted">
        {Icon ? <Icon size={20} aria-hidden="true" /> : <BrandMark className="size-6 opacity-60" />}
      </span>
      <p className="text-[15px] leading-6 font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] leading-5 text-ink-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
