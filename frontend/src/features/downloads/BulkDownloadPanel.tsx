import MetricBox from '@/components/patterns/MetricBox';
import Notice from '@/components/patterns/Notice';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { summarizeBulk } from './bulkDownloadState';
import BulkQueueList from './BulkQueueList';
import DownloadProgressBar from './DownloadProgressBar';

import type { BulkDownloadState, BulkItemState } from './bulkDownloadState';

export interface BulkDownloadPanelProps {
  download: BulkDownloadState;
  onClose(): void;
  onCancel(): void;
}

function CurrentItem({ item }: { item: BulkItemState }) {
  return (
    <div className="space-y-2 rounded-control bg-app p-4">
      <p className="text-label text-ink-faint">Now downloading</p>
      <p className="line-clamp-1 text-sm font-medium text-ink">{item.title}</p>
      <DownloadProgressBar percent={item.percent} isMerging={false} />
    </div>
  );
}

export default function BulkDownloadPanel({ download, onClose, onCancel }: BulkDownloadPanelProps) {
  const { total, doneCount, succeededCount, failedCount, current } = summarizeBulk(download);
  const overallPercent = total > 0 ? (doneCount / total) * 100 : 0;
  const isAllDone = download.isFinished || doneCount === total;

  return (
    <div className="space-y-5">
      <div className="pr-8">
        <div className="mb-2.5 flex items-center justify-between">
          <p className="text-[15px] font-semibold text-ink">Bulk download</p>
          <span className="text-[13px] text-ink-muted tabular-nums">{doneCount} / {total}</span>
        </div>
        <Progress value={overallPercent} aria-label="Overall progress" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <MetricBox label="Saved" value={succeededCount} tone="success" />
        <MetricBox label="Failed" value={failedCount} tone={failedCount > 0 ? 'error' : 'neutral'} />
      </div>
      {download.warning && <Notice tone="warning">{download.warning}</Notice>}
      {current && <CurrentItem item={current} />}
      <BulkQueueList items={download.items} />
      {isAllDone ? (
        <Button type="button" variant="inverse" className="w-full" onClick={onClose}>Close</Button>
      ) : (
        <Button type="button" variant="destructive" className="w-full" onClick={onCancel}>Cancel downloads</Button>
      )}
    </div>
  );
}
