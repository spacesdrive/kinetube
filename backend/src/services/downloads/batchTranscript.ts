import { errorMessage } from '../../lib/errors.ts';

import type { DownloadBatchEvents } from '@shared/downloads.ts';
import type { EventSink } from '../../lib/sse.ts';
import type { WhisperManager } from '../../managers/whisper/whisperManager.ts';
import type { TranscriptionChoices } from '../transcriptionService.ts';

export interface BatchTranscriptResult {
  transcriptPaths: string[];
  transcriptError: string | null;
}

export interface BatchTranscriptInput {
  whisper: WhisperManager;
  choices: TranscriptionChoices;
  index: number;
  filePath: string;
  send: EventSink<DownloadBatchEvents>;
  signal: AbortSignal;
}

export const NOT_TRANSCRIBED: BatchTranscriptResult = { transcriptPaths: [], transcriptError: null };

// why no file in this batch can be transcribed, or null when whisper.cpp and the model are ready
export function transcriptionBlocker(whisper: WhisperManager, { modelId }: TranscriptionChoices): string | null {
  if (!whisper.isInstalled()) return "whisper.cpp isn't installed, so the files are saved without transcripts. Install it on the Transcribe page.";
  if (!whisper.isModelDownloaded(modelId)) {
    return `The ${modelId} model isn't downloaded, so the files are saved without transcripts. Download it on the Transcribe page, or pick another model in Settings.`;
  }
  return null;
}

// runs before the item's itemDone, so the batch moves on only once the transcript files are written
export async function transcribeBatchItem({ whisper, choices, index, filePath, send, signal }: BatchTranscriptInput): Promise<BatchTranscriptResult> {
  send('itemTranscribing', { index });
  try {
    const { outputPaths } = await whisper.transcribe({
      inputPath: filePath,
      ...choices,
      signal,
      send: (...[event, data]) => {
        if (event === 'progress') send('itemTranscribeProgress', { index, percent: data.percent });
      },
    });
    return { transcriptPaths: outputPaths, transcriptError: null };
  } catch (error) {
    return { transcriptPaths: [], transcriptError: `Couldn't transcribe the file. ${errorMessage(error)}` };
  }
}
