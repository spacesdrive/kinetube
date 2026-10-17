import path from 'node:path';

import express from 'express';

import { apiNotFound, errorHandler } from './middleware/errorHandler.ts';
import { originGuard } from './middleware/originGuard.ts';
import { requestContext } from './middleware/requestContext.ts';
import { createApiRouter } from './routes/apiRouter.ts';

import type { Express } from 'express';
import type { AppConfig } from './config.ts';
import type { Services } from './container.ts';
import type { Logger } from './lib/logger.ts';

export interface AppDeps {
  config: Pick<AppConfig, 'port' | 'frontendDist'>;
  services: Services;
  logger: Logger;
}

// the request pipeline, in order; any step can answer early, and the error handler formats anything thrown
export function createApp({ config, services, logger }: AppDeps): Express {
  const app = express();
  app.disable('x-powered-by');

  // 1. a request id and the access log line, so every later step can log with the id
  app.use(requestContext(logger));
  // 2. refuse other web pages and other hosts before any work is done
  app.use(originGuard(config.port));

  // 3. Electron waits for this before it opens the window, so it answers before any tool is checked
  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  // 4. the API; multipart uploads are read by their own route, everything else is JSON
  app.use(express.json({ limit: '1mb' }));
  app.use('/api/v1', createApiRouter(services, logger));
  app.use('/api', apiNotFound);

  // 5. the packaged app has no Vite server, so the backend serves the built frontend too
  if (config.frontendDist) {
    const frontendDist = config.frontendDist;
    app.use(express.static(frontendDist));
    app.use((_req, res) => res.sendFile(path.join(frontendDist, 'index.html')));
  }

  // 6. one error shape for the whole API
  app.use(errorHandler(logger));
  return app;
}
