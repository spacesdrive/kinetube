import { ConflictError, ToolNotInstalledError } from '../../lib/errors.ts';
import { YTDLP_MISSING } from '../youtubeMediaService.ts';
import { runDownloadJob } from './downloadJob.ts';

import type { DownloadEvents } from '@shared/downloads.ts';
import type { YtdlpManager } from '../../managers/ytdlp/ytdlpManager.ts';
import type { DownloadRecord } from '../../stores/downloadRecord.ts';
import type { PendingDownloadStore } from '../../stores/pendingDownloadStore.ts';
import type { StreamJob } from '../streamJob.ts';
import type { ActiveRun, StopReason } from './downloadJob.ts';
import type { DownloadEnvironment } from './downloadSetup.ts';

// the downloads running in this process, keyed by id; a pause request reaches its run through here
export interface DownloadRunner {
  start(record: DownloadRecord): StreamJob<DownloadEvents>;
  stop(downloadId: string, reason: StopReason): boolean;
  isRunning(downloadId: string): boolean;
}

export interface DownloadRunnerDeps {
  ytdlp: YtdlpManager;
  store: PendingDownloadStore;
  environment: DownloadEnvironment;
}

export function createDownloadRunner({ ytdlp, store, environment }: DownloadRunnerDeps): DownloadRunner {
  const active = new Map<string, ActiveRun>();

  return {
    // the run is reserved before the stream opens, so a duplicate request gets a plain 409
    start(record) {
      if (!ytdlp.isInstalled()) throw new ToolNotInstalledError(YTDLP_MISSING);
      if (active.has(record.id)) throw new ConflictError('This download is already running.');

      const run: ActiveRun = { stopReason: null, stop: () => {} };
      active.set(record.id, run);
      const startedRecord = { ...record, pausedAt: null };
      store.save(startedRecord);

      return async (send, signal) => {
        try {
          await runDownloadJob({ record: startedRecord, run, ytdlp, store, environment, send, signal });
        } finally {
          active.delete(record.id);
        }
      };
    },

    stop(downloadId, reason) {
      const run = active.get(downloadId);
      run?.stop(reason);
      return run !== undefined;
    },

    isRunning: (downloadId) => active.has(downloadId),
  };
}
