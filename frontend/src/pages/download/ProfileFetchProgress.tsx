import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';

import type { ProfileProgress } from '@/hooks/useMediaLookup';

export interface ProfileFetchProgressProps {
  progress: ProfileProgress;
}

export default function ProfileFetchProgress({ progress }: ProfileFetchProgressProps) {
  const { name, fetchedCount, totalCount } = progress;

  return (
    <Card className="mt-3 border-pink-100 dark:border-pink-900/30">
      <CardContent className="px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Spinner className="size-3.5 text-pink-500" />
            <span className="text-sm font-medium">{name || 'Reading the profile...'}</span>
          </div>
          <span className="text-xs font-semibold tabular-nums text-pink-600">{fetchedCount}{totalCount ? ` of ${totalCount}` : ''} posts</span>
        </div>
        {totalCount ? (
          <Progress value={Math.min(100, (fetchedCount / totalCount) * 100)} className="h-1.5 [&>div]:bg-gradient-to-r [&>div]:from-purple-500 [&>div]:to-pink-500" />
        ) : (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted"><div className="h-full w-2/5 animate-pulse rounded-full bg-gradient-to-r from-purple-500 to-pink-500" /></div>
        )}
      </CardContent>
    </Card>
  );
}
