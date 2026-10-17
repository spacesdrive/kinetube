import path from 'node:path';

import { createApp } from './app.ts';
import { readConfig } from './config.ts';
import { createContainer } from './container.ts';
import { createLogger } from './lib/logger.ts';

import type { Container } from './container.ts';
import type { Logger } from './lib/logger.ts';

// src/ when run with Node directly, dist/ when packaged; both sit one level inside the backend folder
const backendRoot = path.resolve(import.meta.dirname, '..');

async function logToolStatus({ services }: Container, logger: Logger): Promise<void> {
  const tools = await services.tools.list(['ytdlp', 'ffmpeg']);
  for (const tool of tools) {
    if (tool.isInstalled) logger.info(`${tool.name} is ready`, { version: tool.version });
    else logger.warn(`${tool.name} is not installed yet; the setup screen installs it`);
  }
}

function start(): void {
  const logger = createLogger();
  const config = readConfig(process.env, backendRoot);
  const container = createContainer(config);
  const app = createApp({ config, services: container.services, logger });

  // listen first so /health answers at once; the tool check runs after and never delays Electron's window
  const server = app.listen(config.port, config.host);
  server.on('listening', () => {
    logger.info('KineTube backend listening', { url: `http://${config.host}:${config.port}` });
    logToolStatus(container, logger).catch((error: unknown) => logger.error('Tool status check failed', { error }));
  });
  server.on('error', (error: NodeJS.ErrnoException) => {
    const message = error.code === 'EADDRINUSE'
      ? `Port ${config.port} is already in use. Close the other kinetube window and try again.`
      : 'The backend could not start';
    logger.error(message, { error });
    process.exit(1);
  });
}

start();
