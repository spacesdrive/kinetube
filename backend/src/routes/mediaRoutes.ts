import { Router } from 'express';

import type { MediaController } from '../controllers/mediaController.ts';

export function createMediaRoutes(controller: MediaController): Router {
  const router = Router();

  router.get('/youtube/media', controller.getYouTubeMedia);
  router.get('/instagram/media', controller.getInstagramMedia);

  return router;
}
