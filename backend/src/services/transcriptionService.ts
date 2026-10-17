import fs from 'node:fs';

import { ConflictError, errorMessage, NotFoundError, ToolNotInstalledError } from '../lib/errors.ts';

import type { TranscriptFormat, TranscriptionEvents, WhisperModelId } from '@shared/transcriptions.ts';
import type { WhisperManager } from '../managers/whisper/whisperManager.ts';
import type { StreamJob } from './streamJob.ts';

export interface TranscriptionInput {
  filePath: string;
  modelId: WhisperModelId;
  language: string;
  // written beside filePath; an upload gets none, since its folder is a temporary one
  formats: TranscriptFormat[];
  // an uploaded file is a temporary copy, deleted once the transcription ends
  isUpload: boolean;
}

export interface TranscriptionService {
  create(input: TranscriptionInput): StreamJob<TranscriptionEvents>;
}

function checkReady(whisper: WhisperManager, { filePath, modelId }: TranscriptionInput): void {
  if (!whisper.isInstalled()) throw new ToolNotInstalledError("whisper.cpp isn't installed. Open the Transcribe page to install it.");
  if (!whisper.isModelDownloaded(modelId)) {
    throw new ConflictError(`The ${modelId} model isn't downloaded yet. Download it on the Transcribe page first.`);
  }
  if (!fs.existsSync(filePath)) throw new NotFoundError(`There's no file at ${filePath}. Check the path and try again.`);
}

export function createTranscriptionService(whisper: WhisperManager): TranscriptionService {
  return {
    create(input) {
      const { filePath, modelId, language, formats, isUpload } = input;
      try {
        checkReady(whisper, input);
      } catch (error) {
        if (isUpload) fs.rmSync(filePath, { force: true });
        throw error;
      }

      return async (send, signal) => {
        try {
          const result = await whisper.transcribe({ inputPath: filePath, modelId, language, formats, send, signal });
          send('done', { success: true, message: 'Transcription complete', ...result });
        } catch (error) {
          send('done', { success: false, code: 'UPSTREAM_FAILED', message: `Couldn't transcribe the file. ${errorMessage(error)}` });
        } finally {
          if (isUpload) fs.rmSync(filePath, { force: true });
        }
      };
    },
  };
}
