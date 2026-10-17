import { Router } from 'express';

import type { FileController } from '../controllers/fileController.ts';

export function createFileRoutes(controller: FileController): Router {
  const router = Router();

  // "pick" is registered first so it is never read as a folder path
  router.post('/folders/pick', controller.pickFolder);
  router.get('/folders/:folderPath', controller.getFolder);
  router.get('/images', controller.getImage);

  return router;
}
