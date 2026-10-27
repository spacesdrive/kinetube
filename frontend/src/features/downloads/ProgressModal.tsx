import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import BulkDownloadPanel from './BulkDownloadPanel';
import SingleDownloadPanel from './SingleDownloadPanel';

import type { ActiveDownload } from './useActiveDownload';
import type { TranscriptOutcome } from './usePostDownloadTranscription';

export interface ProgressModalProps {
  download: ActiveDownload;
  isTranscribing: boolean;
  transcribePercent: number;
  transcript: TranscriptOutcome | null;
  onClose(): void;
  onCancel(): void;
  onPause(): void;
  onResume(): void;
  onTranscribe(filePath: string): void;
  onStopTranscribing(): void;
}

function isFinished(download: ActiveDownload): boolean {
  if (download.kind === 'single') return download.status === 'done';
  return download.isFinished || download.items.every((item) => item.status === 'done');
}

// the dialog can only be dismissed once nothing is running, a transcript included, so a stray click never cancels work
export default function ProgressModal(props: ProgressModalProps) {
  const { download, isTranscribing, onClose, onCancel } = props;
  const canDismiss = isFinished(download) && !isTranscribing;

  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && canDismiss) onClose();
      }}
    >
      {/* the dialog never outgrows the window; a long queue scrolls inside it */}
      <DialogContent className="max-h-[calc(100dvh-2rem)] grid-cols-[minmax(0,1fr)] overflow-y-auto sm:max-w-lg" showCloseButton={canDismiss}>
        <DialogTitle className="sr-only">Download progress</DialogTitle>
        {download.kind === 'bulk' ? (
          <BulkDownloadPanel download={download} onClose={onClose} onCancel={onCancel} />
        ) : (
          <SingleDownloadPanel {...props} download={download} />
        )}
      </DialogContent>
    </Dialog>
  );
}
