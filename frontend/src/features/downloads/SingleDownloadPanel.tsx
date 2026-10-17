import { CheckCircle2, Download, Music, Pause, RotateCcw, XCircle } from 'lucide-react';

import Notice from '@/components/patterns/Notice';
import StatusBadge from '@/components/patterns/StatusBadge';
import { Button } from '@/components/ui/button';
import { QUALITY_LABELS } from '@/lib/qualities';
import { cn } from '@/lib/utils';
import SingleDownloadStatus from './SingleDownloadStatus';
import TranscriptPanel from './TranscriptPanel';

import type { SingleDownloadState } from './singleDownloadState';
import type { TranscriptOutcome } from './usePostDownloadTranscription';

export interface SingleDownloadPanelProps {
  download: SingleDownloadState;
  isTranscribing: boolean;
  transcript: TranscriptOutcome | null;
  onClose(): void;
  onCancel(): void;
  onPause(): void;
  onResume(): void;
  onTranscribe(filePath: string): void;
}

function StatusIcon({ download }: { download: SingleDownloadState }) {
  if (download.status === 'done' && download.isSuccess) return <CheckCircle2 size={20} className="text-success" />;
  if (download.status === 'done') return <XCircle size={20} className="text-error" />;
  if (download.isAudioOnly) return <Music size={20} className="text-spin-text" />;
  return <Download size={20} className="text-spin-text" />;
}

function iconBackground({ status, isSuccess }: SingleDownloadState): string {
  if (status !== 'done') return 'bg-spin-soft';
  return isSuccess ? 'bg-success-soft' : 'bg-error-soft';
}

function Header({ download }: { download: SingleDownloadState }) {
  const { title, isAudioOnly, quality, isMultiFile, phase } = download;
  const step = phase === 'video' ? 1 : 2;

  return (
    <div className="flex items-start gap-3 pr-8">
      <div className={cn('flex size-10 flex-shrink-0 items-center justify-center rounded-pill', iconBackground(download))}>
        <StatusIcon download={download} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="line-clamp-2 text-[15px] leading-6 font-semibold text-ink">{title || 'Preparing the download...'}</p>
          {isMultiFile && phase !== 'merging' && <StatusBadge>Step {step} of 2</StatusBadge>}
        </div>
        <p className="mt-0.5 text-xs text-ink-muted">{isAudioOnly ? 'Audio only (MP3)' : `Video, ${QUALITY_LABELS[quality]}`}</p>
      </div>
    </div>
  );
}

function Actions({ download, onClose, onCancel, onPause, onResume }: SingleDownloadPanelProps) {
  if (download.status === 'done') return <Button type="button" variant="inverse" className="w-full" onClick={onClose}>Close</Button>;

  return (
    <div className="flex gap-2">
      {download.status === 'paused' ? (
        <Button type="button" className="flex-1" onClick={onResume}><RotateCcw /> Resume</Button>
      ) : (
        <Button type="button" variant="outline" className="flex-1" onClick={onPause}><Pause /> Pause</Button>
      )}
      <Button type="button" variant="destructive" className="flex-1" onClick={onCancel}>Cancel</Button>
    </div>
  );
}

export default function SingleDownloadPanel(props: SingleDownloadPanelProps) {
  const { download, isTranscribing, transcript, onTranscribe } = props;
  const { status, isSuccess, message, warning, filePath } = download;

  return (
    <div className="space-y-5">
      <Header download={download} />
      {warning && <Notice tone="warning">{warning}</Notice>}
      {status !== 'done' && <SingleDownloadStatus download={download} />}
      {status === 'done' && <Notice tone={isSuccess ? 'success' : 'error'}>{message}</Notice>}
      {status === 'done' && isSuccess && filePath && (
        <TranscriptPanel filePath={filePath} isTranscribing={isTranscribing} outcome={transcript} onTranscribe={onTranscribe} />
      )}
      <Actions {...props} />
    </div>
  );
}
