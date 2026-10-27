import { setTimeout as sleep } from 'node:timers/promises';

import { ToolNotInstalledError } from '../lib/errors.ts';
import { runBatchItem } from './downloads/batchItem.ts';
import { NOT_TRANSCRIBED, transcribeBatchItem, transcriptionBlocker } from './downloads/batchTranscript.ts';
import { prepareDownload } from './downloads/downloadSetup.ts';
import { YTDLP_MISSING } from './youtubeMediaService.ts';

import type { DownloadBatchEvents, DownloadOptions } from '@shared/downloads.ts';
import type { EventSink } from '../lib/sse.ts';
import type { WhisperManager } from '../managers/whisper/whisperManager.ts';
import type { YtdlpManager } from '../managers/ytdlp/ytdlpManager.ts';
import type { DownloadTarget } from '../platforms/mediaUrl.ts';
import type { BatchTranscriptResult } from './downloads/batchTranscript.ts';
import type { DownloadEnvironment } from './downloads/downloadSetup.ts';
import type { StreamJob } from './streamJob.ts';
import type { TranscriptionChoices } from './transcriptionService.ts';

export interface BatchItemTarget {
  target: DownloadTarget;
  title: string;
  shouldTranscribe: boolean;
}

export interface CreateBatchInput {
  items: BatchItemTarget[];
  // fileName.sequenceNumber is the first item's number; each later item counts up from it
  options: DownloadOptions;
  transcription: TranscriptionChoices;
}

export interface DownloadBatchService {
  create(input: CreateBatchInput): StreamJob<DownloadBatchEvents>;
}

export interface DownloadBatchDeps {
  ytdlp: YtdlpManager;
  whisper: WhisperManager;
  environment: DownloadEnvironment;
}

// Instagram blocks bursts: yt-dlp waits 2 seconds between its own requests and 2.5 seconds between posts
const INSTAGRAM_SLEEP_SECONDS = 2;
const INSTAGRAM_ITEM_GAP_MS = 2_500;

function numberedOptions(options: DownloadOptions, index: number): DownloadOptions {
  const { sequenceNumber } = options.fileName;
  if (sequenceNumber === null) return options;
  return { ...options, fileName: { ...options.fileName, sequenceNumber: sequenceNumber + index } };
}

interface ItemRun {
  item: BatchItemTarget;
  index: number;
  options: DownloadOptions;
  send: EventSink<DownloadBatchEvents>;
  signal: AbortSignal;
  // the same warning (a missing folder, no FFmpeg) is sent once, not once per item
  sentWarnings: Set<string>;
  transcription: TranscriptionChoices;
  // set when whisper.cpp or the model is missing, so no item is transcribed
  transcriptionBlocker: string | null;
}

export function createDownloadBatchService({ ytdlp, whisper, environment }: DownloadBatchDeps): DownloadBatchService {
  async function transcribeItem(run: ItemRun, filePath: string | null): Promise<BatchTranscriptResult> {
    const { item, index, transcription, transcriptionBlocker: blocker, send, signal } = run;
    if (!item.shouldTranscribe || !filePath) return NOT_TRANSCRIBED;
    if (blocker) return { transcriptPaths: [], transcriptError: blocker };
    return transcribeBatchItem({ whisper, choices: transcription, index, filePath, send, signal });
  }

  async function downloadItem(run: ItemRun): Promise<boolean> {
    const { item, index, options, send, signal, sentWarnings } = run;
    const { target, title } = item;
    const isInstagram = target.platform === 'instagram';
    const prepared = prepareDownload(environment, {
      url: target.cleanUrl,
      platform: target.platform,
      options: numberedOptions(options, index),
      sleepSeconds: isInstagram ? INSTAGRAM_SLEEP_SECONDS : null,
    });
    for (const message of prepared.warnings) {
      if (!sentWarnings.has(message)) send('warning', { message });
      sentWarnings.add(message);
    }

    send('itemStart', { index, url: target.cleanUrl, title });
    const onPercent = (percent: number): void => send('itemProgress', { index, percent });
    const result = await runBatchItem({ ytdlp, args: prepared.args, isAudioOnly: options.isAudioOnly, signal, onPercent });
    const transcript = result.isSuccess ? await transcribeItem(run, result.filePath) : NOT_TRANSCRIBED;
    send('itemDone', { index, ...result, ...transcript });
    return result.isSuccess;
  }

  return {
    create({ items, options, transcription }) {
      if (!ytdlp.isInstalled()) throw new ToolNotInstalledError(YTDLP_MISSING);

      return async (send, signal) => {
        const sentWarnings = new Set<string>();
        let succeededCount = 0;
        send('start', { total: items.length });

        // a missing whisper.cpp or model never stops the downloads; the files are saved without transcripts
        const blocker = items.some((item) => item.shouldTranscribe) ? transcriptionBlocker(whisper, transcription) : null;
        if (blocker) send('warning', { message: blocker });

        for (const [index, item] of items.entries()) {
          if (signal.aborted) break;
          const isSuccess = await downloadItem({ item, index, options, send, signal, sentWarnings, transcription, transcriptionBlocker: blocker });
          if (isSuccess) succeededCount++;

          const isLast = index === items.length - 1;
          if (item.target.platform === 'instagram' && !isLast) await sleep(INSTAGRAM_ITEM_GAP_MS);
        }

        if (signal.aborted) {
          send('done', { success: false, code: 'CANCELLED', message: 'Batch download cancelled' });
          return;
        }
        const failedCount = items.length - succeededCount;
        send('done', { success: true, message: `Downloaded ${succeededCount} of ${items.length}`, succeededCount, failedCount });
      };
    },
  };
}
