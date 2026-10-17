import crypto from 'node:crypto';

import type { RequestHandler } from 'express';
import type { Logger } from '../lib/logger.ts';

// every request gets an id, sent back in errors so a log line can be matched to what the person saw
export function requestContext(logger: Logger): RequestHandler {
  return (req, res, next) => {
    const startedAt = Date.now();
    res.locals.requestId = crypto.randomUUID();

    res.on('finish', () => {
      // the query is left out: it can hold file paths and links the person may not want in a log
      const requestPath = req.originalUrl.split('?')[0];
      // Electron polls /health on every start; logging it would bury the useful lines
      if (requestPath === '/health') return;
      logger.info('Request handled', {
        requestId: res.locals.requestId,
        method: req.method,
        path: requestPath,
        status: res.statusCode,
        durationMs: Date.now() - startedAt,
      });
    });
    next();
  };
}
