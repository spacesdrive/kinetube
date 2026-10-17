import { Router } from 'express';

import type { DownloadController } from '../controllers/downloadController.ts';

export function createDownloadRoutes(controller: DownloadController): Router {
  const router = Router();

  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:downloadId', controller.get);
  router.post('/:downloadId/pause', controller.pause);
  router.post('/:downloadId/resume', controller.resume);
  router.delete('/:downloadId', controller.remove);

  return router;
}

export function createDownloadBatchRoutes(controller: DownloadController): Router {
  const router = Router();

  router.post('/', controller.createBatch);

  return router;
}
