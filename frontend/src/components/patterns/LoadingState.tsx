import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

export interface LoadingStateProps {
  label: string;
  rows?: number;
  className?: string;
}

// skeleton rows keep the layout still while a lookup runs, with the label read out for screen readers
export default function LoadingState({ label, rows = 0, className }: LoadingStateProps) {
  return (
    <div role="status" aria-live="polite" className={cn('space-y-3', className)}>
      <p className="flex items-center gap-2 text-[13px] text-ink-muted">
        <Spinner className="size-3.5" aria-hidden="true" />
        {label}
      </p>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-control bg-surface p-3">
          <Skeleton className="h-14 w-24 rounded-row" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
