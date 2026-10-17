import { AlertTriangle } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { ReactNode } from 'react';

export interface ErrorStateProps {
  title: string;
  message: string;
  action?: ReactNode;
  className?: string;
}

export default function ErrorState({ title, message, action, className }: ErrorStateProps) {
  return (
    <div role="alert" className={cn('flex items-start gap-3 rounded-card bg-error-soft p-4', className)}>
      <AlertTriangle size={18} aria-hidden="true" className="mt-0.5 flex-shrink-0 text-error" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="mt-0.5 text-[13px] leading-5 break-words text-ink-muted">{message}</p>
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}
