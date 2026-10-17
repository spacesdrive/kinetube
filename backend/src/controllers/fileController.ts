import { pipeline } from 'node:stream/promises';

import { parseFolderPath } from '../validators/folderValidators.ts';
import { parseImageUrl } from '../validators/imageValidators.ts';
import { dataResponse } from './http.ts';

import type { DataResponse } from '@shared/api.ts';
import type { Folder, PickedFolder } from '@shared/folders.ts';
import type { FolderService } from '../services/folderService.ts';
import type { ImageProxyService } from '../services/imageProxyService.ts';
import type { Handler } from './http.ts';

export interface FileController {
  getFolder: Handler;
  pickFolder: Handler;
  getImage: Handler;
}

// an hour is long enough for a session of browsing and short enough for a changed avatar to show
const IMAGE_CACHE_SECONDS = 3600;

export function createFileController(folders: FolderService, images: ImageProxyService): FileController {
  return {
    getFolder(req, res) {
      const folder = folders.check(parseFolderPath(req.params.folderPath));
      res.json(dataResponse(folder) satisfies DataResponse<Folder>);
    },

    async pickFolder(_req, res) {
      const picked = await folders.pick();
      res.json(dataResponse(picked) satisfies DataResponse<PickedFolder>);
    },

    async getImage(req, res) {
      const image = await images.fetchImage(parseImageUrl(req.query));
      res.setHeader('Content-Type', image.contentType);
      res.setHeader('Cache-Control', `private, max-age=${IMAGE_CACHE_SECONDS}`);
      await pipeline(image.body, res);
    },
  };
}
