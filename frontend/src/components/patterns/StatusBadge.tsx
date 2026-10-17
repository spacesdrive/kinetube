import { cn } from '@/lib/utils';

import type { ReactNode } from 'react';

export type StatusTone = 'neutral' | 'accent' | 'success' | 'warning' | 'error' | 'info';

export interface StatusBadgeProps {
  tone?: StatusTone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: 'bg-surface-selected text-ink-muted',
  accent: 'bg-spin-soft text-spin-text',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  error: 'bg-error-soft text-error',
  info: 'bg-info-soft text-info',
};

export default function StatusBadge({ tone = 'neutral', icon, children, className }: StatusBadgeProps) {
  return (
    <span className={cn('inline-flex h-5 shrink-0 items-center gap-1 rounded-pill px-2 text-[11px] leading-4 font-semibold whitespace-nowrap [&_svg]:size-3', TONE_CLASSES[tone], className)}>
      {icon}
      {children}
    </span>
  );
}
