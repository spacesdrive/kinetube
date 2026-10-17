import { useCallback } from 'react';

import { useActiveDownload } from './useActiveDownload';
import { usePostDownloadTranscription } from './usePostDownloadTranscription';
import { useResumableDownloads } from './useResumableDownloads';

import type { Download } from '@shared/downloads.ts';
import type { DownloadSettings } from '@/lib/settings';
import type { MediaBulkRequest, MediaDownloadRequest } from './downloadRequests';

// everything the progress dialog and the resume banner need, wired to the chosen Instagram account
export function useDownloadSession(settings: DownloadSettings, account: string | null) {
  const transcription = usePostDownloadTranscription();
  const resumable = useResumableDownloads();
  const { transcribe, transcribeQuietly, reset } = transcription;

  const handleFileSaved = useCallback((filePath: string, isBulk: boolean) => {
    if (isBulk) transcribeQuietly(filePath);
    else transcribe(filePath);
  }, [transcribe, transcribeQuietly]);

  const downloads = useActiveDownload({ settings, onFileSaved: handleFileSaved });
  const { startSingle, startBulk, resumeRecorded, close } = downloads;

  const download = useCallback((request: MediaDownloadRequest) => {
    reset();
    startSingle({ ...request, account });
  }, [account, reset, startSingle]);

  const downloadMany = useCallback((request: MediaBulkRequest) => {
    reset();
    startBulk({ ...request, account });
  }, [account, reset, startBulk]);

  const resume = useCallback((record: Download) => {
    resumable.forget(record.id);
    reset();
    resumeRecorded(record);
  }, [resumable, reset, resumeRecorded]);

  const closeDialog = useCallback(() => {
    close();
    reset();
  }, [close, reset]);

  return { downloads, transcription, resumable, download, downloadMany, resume, closeDialog };
}
