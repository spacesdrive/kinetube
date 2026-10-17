import { AlertTriangle, CheckCircle, Download, Music, Pause, RotateCcw, XCircle } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
  if (download.status === 'done' && download.isSuccess) return <CheckCircle size={20} className="text-green-600" />;
  if (download.status === 'done') return <XCircle size={20} className="text-red-600" />;
  if (download.isAudioOnly) return <Music size={20} className="text-blue-600" />;
  return <Download size={20} className="text-blue-600" />;
}

function iconBackground({ status, isSuccess }: SingleDownloadState): string {
  if (status !== 'done') return 'bg-blue-50';
  return isSuccess ? 'bg-green-100' : 'bg-red-100';
}

function Header({ download }: { download: SingleDownloadState }) {
  const { title, isAudioOnly, quality, isMultiFile, phase } = download;
  const step = phase === 'video' ? 1 : 2;

  return (
    <div className="flex items-start gap-3">
      <div className={cn('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full', iconBackground(download))}>
        <StatusIcon download={download} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex flex-wrap items-center gap-2">
          <p className="line-clamp-2 text-sm font-semibold leading-snug">{title || 'Preparing the download...'}</p>
          {isMultiFile && phase !== 'merging' && (
            <Badge variant="secondary" className="px-1.5 py-0.5 text-[10px]">Step {step} of 2</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{isAudioOnly ? 'Audio only (MP3)' : `Video, ${QUALITY_LABELS[quality]}`}</p>
      </div>
    </div>
  );
}

function Actions({ download, onClose, onCancel, onPause, onResume }: SingleDownloadPanelProps) {
  const cancelClass = 'flex-1 border-red-200 text-red-600 hover:bg-red-50';
  if (download.status === 'done') return <Button type="button" variant="outline" className="w-full" onClick={onClose}>Close</Button>;

  return (
    <div className="flex gap-2">
      {download.status === 'paused' ? (
        <Button type="button" className="flex-1 gap-1.5" onClick={onResume}><RotateCcw size={14} /> Resume</Button>
      ) : (
        <Button type="button" variant="outline" className="flex-1 gap-1.5" onClick={onPause}><Pause size={14} /> Pause</Button>
      )}
      <Button type="button" variant="outline" className={cancelClass} onClick={onCancel}>Cancel</Button>
    </div>
  );
}

export default function SingleDownloadPanel(props: SingleDownloadPanelProps) {
  const { download, isTranscribing, transcript, onTranscribe } = props;
  const { status, isSuccess, message, warning, filePath } = download;

  return (
    <div className="space-y-4">
      <Header download={download} />
      {warning && (
        <Alert variant="default" className="border-amber-200 bg-amber-50 py-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-xs text-amber-700">{warning}</AlertDescription>
        </Alert>
      )}
      {status !== 'done' && <SingleDownloadStatus download={download} />}
      {status === 'done' && (
        <div className={cn('rounded-xl px-3 py-2.5 text-sm font-medium', isSuccess ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
          {message}
        </div>
      )}
      {status === 'done' && isSuccess && filePath && (
        <TranscriptPanel filePath={filePath} isTranscribing={isTranscribing} outcome={transcript} onTranscribe={onTranscribe} />
      )}
      <Actions {...props} />
    </div>
  );
}
