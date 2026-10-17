import { Router } from 'express';

import { acceptUpload } from '../middleware/acceptUpload.ts';

import type { TranscriptionController } from '../controllers/transcriptionController.ts';

export function createWhisperModelRoutes(controller: TranscriptionController): Router {
  const router = Router();

  router.get('/', controller.listModels);
  router.get('/:modelId', controller.getModel);
  router.post('/:modelId/download', controller.downloadModel);

  return router;
}

export function createTranscriptionRoutes(controller: TranscriptionController): Router {
  const router = Router();

  router.post('/', acceptUpload, controller.create);

  return router;
}
