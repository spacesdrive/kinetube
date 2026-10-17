import { useCallback, useEffect, useState } from 'react';

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

  // dismissing keeps the partial file on disk and only forgets the record
  const dismiss = useCallback((downloadId: string) => {
    forget(downloadId);
    api.removeDownload(downloadId).catch(() => {
      // already gone on the backend, which is the outcome dismiss wanted
    });
  }, [forget]);

  return { downloads, forget, dismiss };
}
