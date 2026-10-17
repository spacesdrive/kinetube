import { cn } from '@/lib/utils';

export interface MetricBoxProps {
  label: string;
  value: number | string;
  tone?: 'neutral' | 'success' | 'error' | 'accent';
  className?: string;
}

const VALUE_TONE: Record<NonNullable<MetricBoxProps['tone']>, string> = {
  neutral: 'text-ink',
  success: 'text-success',
  error: 'text-error',
  accent: 'text-spin-text',
};

export default function MetricBox({ label, value, tone = 'neutral', className }: MetricBoxProps) {
  return (
    <div className={cn('min-w-0 rounded-control bg-surface px-3.5 py-2.5', className)}>
      <p className="truncate text-xs text-ink-muted">{label}</p>
      <p className={cn('mt-0.5 text-lg leading-6 font-semibold tabular-nums', VALUE_TONE[tone])}>{value}</p>
    </div>
  );
}
