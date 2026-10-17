import { AlertTriangle, ArrowDown, Check, XCircle } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
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
    <div className="space-y-2 rounded-2xl bg-blue-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Now downloading</p>
      <p className="line-clamp-1 text-sm font-medium">{item.title}</p>
      <DownloadProgressBar percent={item.percent} isMerging={false} />
    </div>
  );
}

export default function BulkDownloadPanel({ download, onClose, onCancel }: BulkDownloadPanelProps) {
  const { total, doneCount, succeededCount, failedCount, current } = summarizeBulk(download);
  const overallPercent = total > 0 ? (doneCount / total) * 100 : 0;
  const isAllDone = download.isFinished || doneCount === total;

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center justify-between text-sm font-semibold">
          <span>Bulk download</span>
          <span className="tabular-nums text-muted-foreground">{doneCount} / {total}</span>
        </div>
        <Progress value={overallPercent} className="h-2" />
        <div className="mt-2 flex gap-4 text-xs">
          {succeededCount > 0 && <span className="flex items-center gap-1 font-medium text-green-600"><Check size={11} /> {succeededCount} done</span>}
          {failedCount > 0 && <span className="flex items-center gap-1 font-medium text-red-600"><XCircle size={11} /> {failedCount} failed</span>}
          {!isAllDone && <span className="flex items-center gap-1 font-medium text-blue-600"><ArrowDown size={11} /> Downloading...</span>}
        </div>
      </div>

      {download.warning && (
        <Alert variant="default" className="border-amber-200 bg-amber-50 py-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-xs text-amber-700">{download.warning}</AlertDescription>
        </Alert>
      )}
      {current && <CurrentItem item={current} />}
      <BulkQueueList items={download.items} />

      {isAllDone ? (
        <Button type="button" variant="outline" className="w-full" onClick={onClose}>Close</Button>
      ) : (
        <Button type="button" variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50" onClick={onCancel}>
          Cancel downloads
        </Button>
      )}
    </div>
  );
}
