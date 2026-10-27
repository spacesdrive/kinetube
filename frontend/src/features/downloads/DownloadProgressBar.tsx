import { Progress } from '@/components/ui/progress';

export interface DownloadProgressBarProps {
  percent: number;
  isMerging: boolean;
  label?: string;
}

export default function DownloadProgressBar({ percent, isMerging, label = 'Download progress' }: DownloadProgressBarProps) {
  const width = Math.min(100, Math.max(0, percent));

  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-medium text-ink-muted tabular-nums">{isMerging ? 'Merging...' : `${width.toFixed(1)}%`}</span>
      {isMerging ? (
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-surface-selected"><div className="absolute inset-y-0 w-1/3 animate-shimmer rounded-full bg-spin" /></div>
      ) : (
        <Progress value={width} aria-label={label} />
      )}
    </div>
  );
}
