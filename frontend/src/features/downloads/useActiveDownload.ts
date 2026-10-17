import { useCallback, useEffect, useRef, useState } from 'react';

import { toFileNameOptions } from '@/lib/settings';
import { api } from '@/services/api';
import { applyBatchEvent, createBulkDownload } from './bulkDownloadState';
import { applyDownloadEvent, createSingleDownload } from './singleDownloadState';

import type { Download, DownloadEvents, VideoQuality } from '@shared/downloads.ts';
import type { DownloadSettings } from '@/lib/settings';
import type { StreamHandle, StreamHandler } from '@/services/eventStream';
import type { BulkDownloadState, BulkItem } from './bulkDownloadState';
import type { SingleDownloadState } from './singleDownloadState';

export type ActiveDownload = SingleDownloadState | BulkDownloadState;

export interface SingleDownloadRequest {
  url: string;
  title: string;
  quality: VideoQuality;
  isAudioOnly: boolean;
  account: string | null;
  shouldTranscribe: boolean;
}

export interface BulkDownloadRequest {
  items: BulkItem[];
  quality: VideoQuality;
  isAudioOnly: boolean;
  account: string | null;
}

export interface ActiveDownloadDeps {
  settings: DownloadSettings;
  onFileSaved(filePath: string, isBulk: boolean): void;
}

export type ActiveDownloadControls = ReturnType<typeof useActiveDownload>;

type OpenSingleStream = (handler: StreamHandler<DownloadEvents>) => StreamHandle;

// owns the download shown in the progress dialog; only one runs at a time
export function useActiveDownload({ settings, onFileSaved }: ActiveDownloadDeps) {
  const [active, setActive] = useState<ActiveDownload | null>(null);
  const streamRef = useRef<StreamHandle | null>(null);
  // stream handlers outlive the render that created them, so they read the newest callback through a ref
  const onFileSavedRef = useRef(onFileSaved);
  useEffect(() => {
    onFileSavedRef.current = onFileSaved;
  }, [onFileSaved]);

  const replaceStream = useCallback((stream: StreamHandle | null) => {
    streamRef.current?.close();
    streamRef.current = stream;
  }, []);

  const followSingle = useCallback((open: OpenSingleStream, shouldTranscribe: boolean) => {
    replaceStream(open((...event) => {
      // side effects stay outside the state updater, which StrictMode runs twice
      const [name, data] = event;
      if (name === 'done' && data.success && data.filePath && shouldTranscribe) onFileSavedRef.current(data.filePath, false);
      setActive((previous) => (previous?.kind === 'single' ? applyDownloadEvent(previous, ...event) : previous));
    }));
  }, [replaceStream]);

  const startSingle = useCallback((request: SingleDownloadRequest) => {
    const { url, title, quality, isAudioOnly, account, shouldTranscribe } = request;
    setActive(createSingleDownload(title, quality, isAudioOnly));
    const body = { url, quality, isAudioOnly, account, outputDir: settings.outputDir || null, fileName: toFileNameOptions(settings) };
    followSingle((handler) => api.createDownload(body, handler), shouldTranscribe);
  }, [settings, followSingle]);

  // the backend replays the options it saved, so yt-dlp continues the partial file under the same name
  const resume = useCallback((downloadId: string, title: string, quality: VideoQuality, isAudioOnly: boolean) => {
    setActive({ ...createSingleDownload(title, quality, isAudioOnly), downloadId });
    followSingle((handler) => api.resumeDownload(downloadId, handler), false);
  }, [followSingle]);

  const resumeRecorded = useCallback((download: Download) => {
    resume(download.id, download.title || download.url, download.options.quality, download.options.isAudioOnly);
  }, [resume]);

  const resumePaused = useCallback(() => {
    if (active?.kind !== 'single' || !active.downloadId) return;
    resume(active.downloadId, active.title, active.quality, active.isAudioOnly);
  }, [active, resume]);

  const pause = useCallback(() => {
    if (active?.kind !== 'single' || !active.downloadId) return;
    api.pauseDownload(active.downloadId).catch(() => {
      // the download ended before the pause arrived; its done event already says how
    });
  }, [active]);

  const startBulk = useCallback(({ items, quality, isAudioOnly, account }: BulkDownloadRequest) => {
    setActive(createBulkDownload(items));
    const fileName = toFileNameOptions(settings);
    const body = { items: items.map(({ url, title }) => ({ url, title })), quality, isAudioOnly, account, outputDir: settings.outputDir || null, fileName };
    replaceStream(api.createDownloadBatch(body, (...event) => {
      const [name, data] = event;
      const item = name === 'itemDone' ? items[data.index] : undefined;
      if (name === 'itemDone' && data.isSuccess && data.filePath && item?.shouldTranscribe) onFileSavedRef.current(data.filePath, true);
      setActive((previous) => (previous?.kind === 'bulk' ? applyBatchEvent(previous, ...event) : previous));
    }));
  }, [settings, replaceStream]);

  // closing the stream cancels whatever is still running on the backend
  const close = useCallback(() => {
    replaceStream(null);
    setActive(null);
  }, [replaceStream]);

  return { active, startSingle, resumeRecorded, resumePaused, pause, startBulk, close };
}
