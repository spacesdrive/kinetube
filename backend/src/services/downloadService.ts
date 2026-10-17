import { ConflictError, NotFoundError } from '../lib/errors.ts';
import { makeDownloadId } from './downloads/downloadIds.ts';
import { createDownloadRunner } from './downloads/downloadRunner.ts';

import type { Download, DownloadEvents, DownloadOptions, DownloadStatus } from '@shared/downloads.ts';
import type { DownloadTarget } from '../platforms/mediaUrl.ts';
import type { DownloadRecord } from '../stores/downloadRecord.ts';
import type { DownloadRunnerDeps } from './downloads/downloadRunner.ts';
import type { StreamJob } from './streamJob.ts';

export interface CreateDownloadInput {
  target: DownloadTarget;
  options: DownloadOptions;
}

export interface DownloadService {
  list(status: DownloadStatus | null): Download[];
  get(downloadId: string): Download;
  create(input: CreateDownloadInput): StreamJob<DownloadEvents>;
  resume(downloadId: string): StreamJob<DownloadEvents>;
  pause(downloadId: string): Download;
  // cancels a running download or dismisses a paused or interrupted one; the partial file stays on disk
  remove(downloadId: string): void;
}

const MISSING_DOWNLOAD = "That download doesn't exist. It may have finished or been dismissed.";

export function createDownloadService(deps: DownloadRunnerDeps): DownloadService {
  const { store } = deps;
  const runner = createDownloadRunner(deps);

  function statusOf(record: DownloadRecord): DownloadStatus {
    if (record.pausedAt) return 'paused';
    // a record nobody is running was cut off when the app closed
    return runner.isRunning(record.id) ? 'active' : 'interrupted';
  }

  const toDownload = (record: DownloadRecord): Download => ({ ...record, status: statusOf(record) });

  function findOrThrow(downloadId: string): DownloadRecord {
    const record = store.find(downloadId);
    if (!record) throw new NotFoundError(MISSING_DOWNLOAD);
    return record;
  }

  return {
    list(status) {
      const downloads = store.list().map(toDownload);
      const matching = status ? downloads.filter((download) => download.status === status) : downloads;
      return matching.sort((first, second) => second.startedAt.localeCompare(first.startedAt));
    },

    get: (downloadId) => toDownload(findOrThrow(downloadId)),

    create({ target, options }) {
      const id = makeDownloadId(target.cleanUrl, options);
      const title = store.find(id)?.title ?? '';
      const startedAt = new Date().toISOString();
      return runner.start({ id, platform: target.platform, url: target.cleanUrl, title, options, startedAt, pausedAt: null });
    },

    resume: (downloadId) => runner.start(findOrThrow(downloadId)),

    // pause is the same kill as cancel, but the record stays so yt-dlp can continue its .part file (ADR-020)
    pause(downloadId) {
      const record = findOrThrow(downloadId);
      if (!runner.stop(downloadId, 'pause')) throw new ConflictError("This download isn't running, so it can't be paused.");

      const paused = { ...record, pausedAt: new Date().toISOString() };
      store.save(paused);
      return { ...paused, status: 'paused' };
    },

    remove(downloadId) {
      const wasRunning = runner.stop(downloadId, 'cancel');
      const wasRecorded = store.remove(downloadId);
      if (!wasRunning && !wasRecorded) throw new NotFoundError(MISSING_DOWNLOAD);
    },
  };
}
