import { parseToolId, parseToolIds } from '../validators/toolValidators.ts';
import { dataResponse, listResponse, sendStream } from './http.ts';

import type { DataResponse, ListResponse } from '@shared/api.ts';
import type { Tool, YtdlpRelease } from '@shared/tools.ts';
import type { Logger } from '../lib/logger.ts';
import type { ToolService } from '../services/toolService.ts';
import type { Handler } from './http.ts';

export interface ToolController {
  list: Handler;
  get: Handler;
  install: Handler;
  update: Handler;
  latestYtdlpRelease: Handler;
}

export function createToolController(tools: ToolService, logger: Logger): ToolController {
  return {
    async list(req, res) {
      const toolList = await tools.list(parseToolIds(req.query));
      res.json(listResponse(toolList) satisfies ListResponse<Tool>);
    },

    async get(req, res) {
      const tool = await tools.get(parseToolId(req.params.toolId));
      res.json(dataResponse(tool) satisfies DataResponse<Tool>);
    },

    async install(req, res) {
      const job = tools.install(parseToolId(req.params.toolId));
      await sendStream(req, res, logger, job);
    },

    async update(req, res) {
      const job = tools.update(parseToolId(req.params.toolId));
      await sendStream(req, res, logger, job);
    },

    async latestYtdlpRelease(_req, res) {
      const release = await tools.latestYtdlpRelease();
      res.json(dataResponse(release) satisfies DataResponse<YtdlpRelease>);
    },
  };
}
