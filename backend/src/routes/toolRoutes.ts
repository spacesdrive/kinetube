import { Router } from 'express';

import type { ToolController } from '../controllers/toolController.ts';

export function createToolRoutes(controller: ToolController): Router {
  const router = Router();

  // registered before /:toolId so "ytdlp/releases" is never read as a tool id
  router.get('/ytdlp/releases/latest', controller.latestYtdlpRelease);
  router.get('/', controller.list);
  router.get('/:toolId', controller.get);
  router.post('/:toolId/install', controller.install);
  router.post('/:toolId/update', controller.update);

  return router;
}
