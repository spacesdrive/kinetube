import ErrorState from '@/components/patterns/ErrorState';
import StatusBadge from '@/components/patterns/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';

export interface WaitingCardProps {
  url: string;
  isLoading: boolean;
}

export function WaitingCard({ url, isLoading }: WaitingCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-control bg-surface px-4 py-3">
      {isLoading ? <Spinner className="size-4 text-ink-muted" /> : <Skeleton className="size-4 rounded-pill" />}
      <span className="flex-1 truncate text-[13px] text-ink-muted">{url}</span>
      <StatusBadge>{isLoading ? 'Reading' : 'Waiting'}</StatusBadge>
    </div>
  );
}

export interface ErrorCardProps {
  url: string;
  message: string;
}

export function ErrorCard({ url, message }: ErrorCardProps) {
  return <ErrorState title={url} message={message} className="rounded-control [&_p:first-child]:truncate" />;
}
