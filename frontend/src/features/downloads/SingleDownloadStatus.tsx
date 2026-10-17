import { Pause, RefreshCw } from 'lucide-react';

import { Spinner } from '@/components/ui/spinner';
import DownloadProgressBar from './DownloadProgressBar';

import type { SingleDownloadState } from './singleDownloadState';

export interface SingleDownloadStatusProps {
  download: SingleDownloadState;
}

function StatusLine({ download }: SingleDownloadStatusProps) {
  const { status, phase, phaseLabel, speed } = download;

  if (status === 'paused') return <><Pause size={12} className="text-warning" /><span className="font-medium text-warning">Paused</span></>;
  if (phase === 'merging') return <><RefreshCw size={12} className="animate-spin" /><span>{phaseLabel}</span></>;
  return (
    <>
      <Spinner className="size-3" />
      <span>{phaseLabel}</span>
      {speed && <span className="text-ink-faint">{speed}</span>}
    </>
  );
}

// the progress bar and the line under it while a single download runs or is paused
export default function SingleDownloadStatus({ download }: SingleDownloadStatusProps) {
  const { percent, phase, status, eta } = download;
  const isMerging = phase === 'merging';

  return (
    <div className="space-y-2" aria-live="polite">
      <DownloadProgressBar percent={percent} isMerging={isMerging} />
      <div className="flex items-center justify-between text-xs text-ink-muted">
        <span className="flex items-center gap-1.5"><StatusLine download={download} /></span>
        {eta && !isMerging && status === 'running' && <span>About {eta} left</span>}
      </div>
    </div>
  );
}
