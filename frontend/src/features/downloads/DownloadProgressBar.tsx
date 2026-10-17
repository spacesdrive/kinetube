import { Progress } from '@/components/ui/progress';

export interface DownloadProgressBarProps {
  percent: number;
  isMerging: boolean;
}

export default function DownloadProgressBar({ percent, isMerging }: DownloadProgressBarProps) {
  const width = Math.min(100, Math.max(0, percent));

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="font-medium tabular-nums">{isMerging ? 'Merging...' : `${width.toFixed(1)}%`}</span>
      </div>
      {isMerging ? (
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full w-full animate-pulse rounded-full bg-gradient-to-r from-purple-500 to-indigo-500" />
        </div>
      ) : (
        <Progress value={width} className="h-2" />
      )}
    </div>
  );
}
