import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';

import type { ProfileProgress } from '@/hooks/useMediaLookup';

export interface ProfileFetchProgressProps {
  progress: ProfileProgress;
}

export default function ProfileFetchProgress({ progress }: ProfileFetchProgressProps) {
  const { name, fetchedCount, totalCount } = progress;

  return (
    <div role="status" aria-live="polite" className="rounded-card bg-surface px-5 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-ink">
          <Spinner className="size-3.5 text-ink-muted" />
          <span className="truncate">{name || 'Reading the profile'}</span>
        </span>
        <span className="flex-shrink-0 text-xs text-ink-muted tabular-nums">{fetchedCount}{totalCount ? ` of ${totalCount}` : ''} posts</span>
      </div>
      {totalCount ? (
        <Progress value={Math.min(100, (fetchedCount / totalCount) * 100)} />
      ) : (
        <div className="relative h-1.5 overflow-hidden rounded-full bg-surface-selected"><div className="absolute inset-y-0 w-1/3 animate-shimmer rounded-full bg-spin" /></div>
      )}
    </div>
  );
}
