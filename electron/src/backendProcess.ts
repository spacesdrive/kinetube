import http from 'node:http';

import { app, utilityProcess } from 'electron';

import { BACKEND_PORT, backendEntryPath, frontendDistPath } from './appPaths';
import { openBackendLog, writeLog } from './backendLog';

import type { UtilityProcess } from 'electron';
import type { HealthResponse } from '../../shared/types/api';

// 40 tries half a second apart: a cold start on a slow disk takes several seconds
const HEALTH_CHECK_ATTEMPTS = 40;
const HEALTH_CHECK_INTERVAL_MS = 500;
const HEALTH_CHECK_TIMEOUT_MS = 2_000;

// the app's backend answered, another program answered on the port, or nothing answered yet
type HealthResult = 'app' | 'other' | 'none';

// the backend runs on Electron's own Node in a utility process (ADR-002); stdout goes to backend.log
export function startBackend(): UtilityProcess {
  openBackendLog();
  writeLog(`[main] backend entry: ${backendEntryPath()}\n`);

  const backend = utilityProcess.fork(backendEntryPath(), [], {
    env: {
      ...process.env,
      PORT: String(BACKEND_PORT),
      ELECTRON_APP: '1',
      ELECTRON_USER_DATA: app.getPath('userData'),
      ELECTRON_FRONTEND_DIST: frontendDistPath(),
    },
    stdio: 'pipe',
  });

  backend.stdout?.on('data', (chunk: Buffer) => writeLog(`[backend] ${chunk.toString()}`));
  backend.stderr?.on('data', (chunk: Buffer) => writeLog(`[backend:err] ${chunk.toString()}`));
  backend.on('exit', (exitCode) => writeLog(`[backend] exited with code ${exitCode}\n`));
  return backend;
}

function isAppBackend(body: string): boolean {
  try {
    const health = JSON.parse(body) as Partial<HealthResponse>;
    return health.ok === true && health.servesApp === true;
  } catch {
    return false;
  }
}

// a dev backend, an old kinetube or another app on the same port also answers, but it has no page to load
function checkHealth(): Promise<HealthResult> {
  return new Promise((resolve) => {
    // the backend listens on 127.0.0.1 only, so the check names it rather than "localhost";
    // agent: false opens a new connection each time: a kept-alive one made to a program that held the
    // port first would keep reaching that program after the backend binds 127.0.0.1 (issue #28)
    const request = http.get(
      `http://127.0.0.1:${BACKEND_PORT}/health`,
      { headers: { Host: `localhost:${BACKEND_PORT}` }, agent: false, timeout: HEALTH_CHECK_TIMEOUT_MS },
      (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk: string) => { body += chunk; });
        response.on('end', () => resolve(response.statusCode === 200 && isAppBackend(body) ? 'app' : 'other'));
      },
    );
    request.on('timeout', () => request.destroy());
    request.on('error', () => resolve('none'));
  });
}

// resolves once /health answers, or gives up when the backend exits because another program holds the port
export async function waitForBackend(backend: UtilityProcess): Promise<boolean> {
  let hasExited = false;
  backend.once('exit', () => { hasExited = true; });

  let hasOtherAnswered = false;
  for (let attempt = 0; attempt < HEALTH_CHECK_ATTEMPTS && !hasExited; attempt++) {
    const result = await checkHealth();
    if (result === 'app') return true;
    if (result === 'other') hasOtherAnswered = true;
    await new Promise((resolve) => setTimeout(resolve, HEALTH_CHECK_INTERVAL_MS));
  }
  if (hasOtherAnswered) {
    writeLog(`[main] another program answers on port ${BACKEND_PORT}, such as a development server. Close it and start kinetube again.\n`);
  }
  return false;
}
