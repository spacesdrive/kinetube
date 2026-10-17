import { errorMessage } from '../../lib/errors.ts';
import { createDownloadTracker } from './downloadTracker.ts';

import type { YtdlpManager } from '../../managers/ytdlp/ytdlpManager.ts';

export interface BatchItemResult {
  isSuccess: boolean;
  filePath: string | null;
  message: string | null;
}

export interface BatchItemInput {
  ytdlp: YtdlpManager;
  args: string[];
  isAudioOnly: boolean;
  signal: AbortSignal;
  onPercent(percent: number): void;
}

// one item of a batch: no pending record and no pause, just the file or the reason it failed
export async function runBatchItem({ ytdlp, args, isAudioOnly, signal, onPercent }: BatchItemInput): Promise<BatchItemResult> {
  let lastError = '';
  const tracker = createDownloadTracker(isAudioOnly, (event, data) => {
    if (event === 'progress' && 'percent' in data) onPercent(data.percent);
  }, () => {});

  const run = ytdlp.startDownload(args, {
    onLine: tracker.handleLine,
    onErrorOutput: (text) => {
      lastError = text.split('\n').at(-1) ?? text;
    },
  });
  const stop = (): void => run.stop();
  signal.addEventListener('abort', stop, { once: true });

  try {
    const exitCode = await run.finished;
    if (exitCode === 0) return { isSuccess: true, filePath: tracker.filePath() || null, message: null };
    return { isSuccess: false, filePath: null, message: lastError || 'yt-dlp stopped without saying why.' };
  } catch (error) {
    return { isSuccess: false, filePath: null, message: `Couldn't start yt-dlp: ${errorMessage(error)}` };
  } finally {
    signal.removeEventListener('abort', stop);
  }
}
