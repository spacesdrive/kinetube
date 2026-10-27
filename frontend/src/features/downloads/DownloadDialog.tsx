import ProgressModal from './ProgressModal';

import type { useDownloadSession } from './useDownloadSession';

export interface DownloadDialogProps {
  session: ReturnType<typeof useDownloadSession>;
}

export default function DownloadDialog({ session }: DownloadDialogProps) {
  const { downloads, transcription, closeDialog } = session;
  if (!downloads.active) return null;

  return (
    <ProgressModal
      download={downloads.active}
      isTranscribing={transcription.isTranscribing}
      transcribePercent={transcription.percent}
      transcript={transcription.outcome}
      onClose={closeDialog}
      onCancel={closeDialog}
      onPause={downloads.pause}
      onResume={downloads.resumePaused}
      onTranscribe={transcription.transcribe}
      onStopTranscribing={transcription.stop}
    />
  );
}
