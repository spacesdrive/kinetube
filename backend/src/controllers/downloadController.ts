import { parseCreateBatch, parseCreateDownload, parseDownloadId, parseDownloadStatus } from '../validators/downloadValidators.ts';
import { dataResponse, listResponse, sendStream } from './http.ts';

import type { DataResponse, ListResponse } from '@shared/api.ts';
import type { Download } from '@shared/downloads.ts';
import type { Logger } from '../lib/logger.ts';
import type { DownloadBatchService } from '../services/downloadBatchService.ts';
import type { DownloadService } from '../services/downloadService.ts';
import type { Handler } from './http.ts';

export interface DownloadController {
  list: Handler;
  get: Handler;
  create: Handler;
  resume: Handler;
  pause: Handler;
  remove: Handler;
  createBatch: Handler;
}

export function createDownloadController(downloads: DownloadService, batches: DownloadBatchService, logger: Logger): DownloadController {
  return {
    list(req, res) {
      const downloadList = downloads.list(parseDownloadStatus(req.query));
      res.json(listResponse(downloadList) satisfies ListResponse<Download>);
    },

    get(req, res) {
      const download = downloads.get(parseDownloadId(req.params.downloadId));
      res.json(dataResponse(download) satisfies DataResponse<Download>);
    },

    // the stream's start event carries the new download's id, used to pause or cancel it
    async create(req, res) {
      const job = downloads.create(parseCreateDownload(req.body));
      await sendStream(req, res, logger, job);
    },

    async resume(req, res) {
      const job = downloads.resume(parseDownloadId(req.params.downloadId));
      await sendStream(req, res, logger, job);
    },

    pause(req, res) {
      const download = downloads.pause(parseDownloadId(req.params.downloadId));
      res.json(dataResponse(download) satisfies DataResponse<Download>);
    },

    remove(req, res) {
      downloads.remove(parseDownloadId(req.params.downloadId));
      res.status(204).end();
    },

    async createBatch(req, res) {
      const job = batches.create(parseCreateBatch(req.body));
      await sendStream(req, res, logger, job);
    },
  };
}
