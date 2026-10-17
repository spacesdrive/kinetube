import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type NoticeTone = 'info' | 'success' | 'warning' | 'error' | 'accent';

export interface NoticeProps {
  tone?: NoticeTone;
  title?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}

const TONES: Record<NoticeTone, { box: string; icon: string; Icon: LucideIcon }> = {
  info: { box: 'bg-info-soft', icon: 'text-info', Icon: Info },
  success: { box: 'bg-success-soft', icon: 'text-success', Icon: CheckCircle2 },
  warning: { box: 'bg-warning-soft', icon: 'text-warning', Icon: AlertTriangle },
  error: { box: 'bg-error-soft', icon: 'text-error', Icon: XCircle },
  accent: { box: 'bg-spin-soft', icon: 'text-spin-text', Icon: Info },
};

// an inline callout tinted by its tone; the text stays ink so it reads in both themes
export default function Notice({ tone = 'info', title, icon, action, children, className }: NoticeProps) {
  const style = TONES[tone];
  const Icon = icon ?? style.Icon;
  const isAlert = tone === 'error' || tone === 'warning';

  return (
    <div role={isAlert ? 'alert' : 'status'} className={cn('flex items-start gap-3 rounded-control px-3.5 py-3 text-[13px] leading-5 text-ink', style.box, className)}>
      <Icon size={16} aria-hidden="true" className={cn('mt-0.5 flex-shrink-0', style.icon)} />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn('text-ink-muted', !title && 'text-ink')}>{children}</div>}
      </div>
      {action && <div className="flex-shrink-0 self-center">{action}</div>}
    </div>
  );
}
