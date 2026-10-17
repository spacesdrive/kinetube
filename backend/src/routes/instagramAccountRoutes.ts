import { Router } from 'express';

import type { InstagramAccountController } from '../controllers/instagramAccountController.ts';

export function createInstagramAccountRoutes(controller: InstagramAccountController): Router {
  const router = Router();

  router.get('/', controller.list);
  router.post('/', controller.create);
  router.post('/:username/two-factor', controller.verifyTwoFactor);
  router.delete('/:username', controller.remove);

  return router;
}
