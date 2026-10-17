import { parseCreateTranscription, parseModelId, parseUploadedTranscription } from '../validators/transcriptionValidators.ts';
import { dataResponse, listResponse, sendStream } from './http.ts';

import type { DataResponse, ListResponse } from '@shared/api.ts';
import type { WhisperModel } from '@shared/transcriptions.ts';
import type { Logger } from '../lib/logger.ts';
import type { TranscriptionService } from '../services/transcriptionService.ts';
import type { WhisperModelService } from '../services/whisperModelService.ts';
import type { Handler } from './http.ts';

export interface TranscriptionController {
  listModels: Handler;
  getModel: Handler;
  downloadModel: Handler;
  create: Handler;
}

export function createTranscriptionController(models: WhisperModelService, transcriptions: TranscriptionService, logger: Logger): TranscriptionController {
  return {
    listModels(_req, res) {
      res.json(listResponse(models.list()) satisfies ListResponse<WhisperModel>);
    },

    getModel(req, res) {
      res.json(dataResponse(models.get(parseModelId(req.params.modelId))) satisfies DataResponse<WhisperModel>);
    },

    async downloadModel(req, res) {
      const job = models.download(parseModelId(req.params.modelId));
      await sendStream(req, res, logger, job);
    },

    // a JSON body names a file already on disk; a multipart body uploads one
    async create(req, res) {
      const input = req.is('multipart/form-data')
        ? parseUploadedTranscription(req.body, req.file?.path)
        : parseCreateTranscription(req.body);
      await sendStream(req, res, logger, transcriptions.create(input));
    },
  };
}
