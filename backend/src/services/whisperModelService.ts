import { errorMessage, NotFoundError } from '../lib/errors.ts';
import { createKeyedLock } from '../lib/keyedLock.ts';

import type { ModelDownloadEvents, WhisperModel, WhisperModelId } from '@shared/transcriptions.ts';
import type { WhisperManager } from '../managers/whisper/whisperManager.ts';
import type { StreamJob } from './streamJob.ts';

export interface WhisperModelService {
  list(): WhisperModel[];
  get(modelId: WhisperModelId): WhisperModel;
  download(modelId: WhisperModelId): StreamJob<ModelDownloadEvents>;
}

export function createWhisperModelService(whisper: WhisperManager): WhisperModelService {
  const lock = createKeyedLock();

  function get(modelId: WhisperModelId): WhisperModel {
    const model = whisper.listModels().find((candidate) => candidate.id === modelId);
    if (!model) throw new NotFoundError(`There's no whisper model called "${modelId}".`);
    return model;
  }

  return {
    list: () => whisper.listModels(),
    get,

    download(modelId) {
      lock.claim(modelId, `The ${modelId} model is already downloading. Wait for it to finish.`);

      // closing the stream does not stop the download, so reopening the page finds the model ready
      return async (send) => {
        try {
          await whisper.downloadModel(modelId, send);
          send('done', { success: true, message: `The ${modelId} model is ready`, model: get(modelId) });
        } catch (error) {
          send('phase', { modelId, phase: 'error', message: errorMessage(error), isSkipped: false });
          send('done', { success: false, code: 'UPSTREAM_FAILED', message: `Couldn't download the ${modelId} model. ${errorMessage(error)}` });
        } finally {
          lock.release(modelId);
        }
      };
    },
  };
}
