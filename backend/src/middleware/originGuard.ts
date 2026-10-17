import { ForbiddenError } from '../lib/errors.ts';

import type { RequestHandler } from 'express';

// the Vite dev server proxies /api from these origins; the packaged app is served by the backend itself
const DEV_SERVER_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

export function allowedHosts(port: number): string[] {
  return [`localhost:${port}`, `127.0.0.1:${port}`];
}

// only KineTube's window and dev server may call the API, never a web page; the Host check also stops DNS rebinding
export function originGuard(port: number): RequestHandler {
  const hosts = new Set(allowedHosts(port));
  const origins = new Set([...DEV_SERVER_ORIGINS, ...allowedHosts(port).map((host) => `http://${host}`)]);

  return (req, _res, next) => {
    const host = req.headers.host ?? '';
    const { origin } = req.headers;

    if (!hosts.has(host)) {
      next(new ForbiddenError('This API only answers requests for kinetube on this computer.'));
      return;
    }
    if (origin !== undefined && !origins.has(origin)) {
      next(new ForbiddenError('This API only answers requests from the kinetube app.'));
      return;
    }
    next();
  };
}
