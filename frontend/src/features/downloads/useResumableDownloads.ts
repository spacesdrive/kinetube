import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { api } from '@/services/api';

import type { Download } from '@shared/downloads.ts';

// downloads the backend still has a record of: paused, or cut off when the app last closed
export function useResumableDownloads() {
  const [downloads, setDownloads] = useState<Download[]>([]);

  useEffect(() => {
    let isCurrent = true;
    api
      .listDownloads()
      .then(({ data }) => {
        if (isCurrent) setDownloads(data.filter((download) => download.status !== 'active'));
      })
      .catch(() => {
        // the banner is optional; without the list the person simply starts the download again
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  const forget = useCallback((downloadId: string) => {
    setDownloads((previous) => previous.filter((download) => download.id !== downloadId));
  }, []);

  // an undo puts a dismissed download back where it was in the list
  const restore = useCallback((download: Download) => {
    setDownloads((previous) => (previous.some((existing) => existing.id === download.id) ? previous : [...previous, download]));
  }, []);

  // discarding keeps the partial file on disk and only deletes the backend's record
  const discard = useCallback((downloadId: string) => {
    api.removeDownload(downloadId).catch(() => {
      // already gone on the backend, which is the outcome discard wanted
    });
  }, []);

  // the record is deleted only once the undo in the toast has had its chance
  const dismiss = useCallback((download: Download) => {
    forget(download.id);
    let isUndone = false;
    const discardUnlessUndone = (): void => {
      if (!isUndone) discard(download.id);
    };
    toast('Removed from unfinished downloads', {
      description: 'The partial file stays in its folder.',
      action: { label: 'Undo', onClick: () => { isUndone = true; restore(download); } },
      onAutoClose: discardUnlessUndone,
      onDismiss: discardUnlessUndone,
    });
  }, [forget, discard, restore]);

  return { downloads, forget, dismiss };
}
