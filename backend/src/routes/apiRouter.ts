import { Router } from 'express';

import { createDownloadController } from '../controllers/downloadController.ts';
import { createFileController } from '../controllers/fileController.ts';
import { createInstagramAccountController } from '../controllers/instagramAccountController.ts';
import { createMediaController } from '../controllers/mediaController.ts';
import { createToolController } from '../controllers/toolController.ts';
import { createTranscriptionController } from '../controllers/transcriptionController.ts';
import { createDownloadBatchRoutes, createDownloadRoutes } from './downloadRoutes.ts';
import { createFileRoutes } from './fileRoutes.ts';
import { createInstagramAccountRoutes } from './instagramAccountRoutes.ts';
import { createMediaRoutes } from './mediaRoutes.ts';
import { createToolRoutes } from './toolRoutes.ts';
import { createTranscriptionRoutes, createWhisperModelRoutes } from './transcriptionRoutes.ts';

import type { Services } from '../container.ts';
import type { Logger } from '../lib/logger.ts';

// every resource of /api/v1; docs/architecture/backend/ROUTES.md lists them with their status codes
export function createApiRouter(services: Services, logger: Logger): Router {
  const router = Router();
  const downloadController = createDownloadController(services.downloads, services.downloadBatches, logger);
  const transcriptionController = createTranscriptionController(services.whisperModels, services.transcriptions, logger);

  router.use('/tools', createToolRoutes(createToolController(services.tools, logger)));
  router.use('/', createMediaRoutes(createMediaController(services.youtubeMedia, services.instagramMedia, logger)));
  router.use('/instagram/accounts', createInstagramAccountRoutes(createInstagramAccountController(services.instagramAccounts)));
  router.use('/downloads', createDownloadRoutes(downloadController));
  router.use('/download-batches', createDownloadBatchRoutes(downloadController));
  router.use('/whisper-models', createWhisperModelRoutes(transcriptionController));
  router.use('/transcriptions', createTranscriptionRoutes(transcriptionController));
  router.use('/', createFileRoutes(createFileController(services.folders, services.images)));

  return router;
}
