import { errorMessage } from '../../lib/errors.ts';
import { failureMessage, watchErrors } from './downloadOutcome.ts';
import { createDownloadTracker } from './downloadTracker.ts';
import { prepareDownload } from './downloadSetup.ts';

import type { DownloadEvents } from '@shared/downloads.ts';
import type { EventSink } from '../../lib/sse.ts';
import type { YtdlpManager } from '../../managers/ytdlp/ytdlpManager.ts';
import type { DownloadRecord } from '../../stores/downloadRecord.ts';
import type { PendingDownloadStore } from '../../stores/pendingDownloadStore.ts';
import type { DownloadEnvironment } from './downloadSetup.ts';

export type StopReason = 'pause' | 'cancel';

// the handle a running download leaves in the runner's active map
export interface ActiveRun {
  stopReason: StopReason | null;
  stop(reason: StopReason): void;
}

export interface DownloadJobInput {
  record: DownloadRecord;
  run: ActiveRun;
  ytdlp: YtdlpManager;
  store: PendingDownloadStore;
  environment: DownloadEnvironment;
  send: EventSink<DownloadEvents>;
  signal: AbortSignal;
}

// runs one yt-dlp download and ends the stream with paused or done; the record is kept only when paused
export async function runDownloadJob(input: DownloadJobInput): Promise<void> {
  const { run, ytdlp, store, environment, send, signal } = input;
  let record = input.record;
  const { options } = record;
  const prepared = prepareDownload(environment, { url: record.url, platform: record.platform, options, sleepSeconds: null });

  send('start', { download: { ...record, status: 'active' }, willMerge: prepared.willMerge });
  for (const message of prepared.warnings) send('warning', { message });

  const errors = watchErrors(record.platform, send);
  const tracker = createDownloadTracker(options.isAudioOnly, send, (title) => {
    record = { ...record, title };
    store.save(record);
  });
  const ytdlpRun = ytdlp.startDownload(prepared.args, { onLine: tracker.handleLine, onErrorOutput: errors.onErrorOutput });

  run.stop = (reason) => {
    run.stopReason ??= reason;
    ytdlpRun.stop();
  };
  // closing the stream cancels, unless a pause already stopped the download
  signal.addEventListener('abort', () => run.stop('cancel'), { once: true });

  let exitCode: number | null;
  try {
    exitCode = await ytdlpRun.finished;
  } catch (error) {
    store.remove(record.id);
    send('done', { success: false, code: 'UPSTREAM_FAILED', message: `Couldn't start yt-dlp: ${errorMessage(error)}` });
    return;
  }

  if (run.stopReason === 'pause') {
    const paused = { ...record, pausedAt: new Date().toISOString() };
    store.save(paused);
    send('paused', { download: { ...paused, status: 'paused' } });
    return;
  }

  store.remove(record.id);
  if (run.stopReason === 'cancel') send('done', { success: false, code: 'CANCELLED', message: 'Download cancelled' });
  else if (exitCode === 0) send('done', { success: true, message: 'Download complete', title: tracker.title(), filePath: tracker.filePath() });
  else send('done', { success: false, code: 'UPSTREAM_FAILED', message: failureMessage(errors.lastError()) });
}
