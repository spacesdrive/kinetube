import path from 'node:path';

export interface AppConfig {
  port: number;
  // loopback only, so nothing else on the network can reach the API
  host: string;
  isElectron: boolean;
  // writable data (tools, models, sessions); userData when packaged, the backend folder in development
  dataDir: string;
  frontendDist: string | null;
  pythonDir: string;
}

const DEFAULT_PORT = 3001;
const LOOPBACK_HOST = '127.0.0.1';

function readPort(rawPort: string | undefined): number {
  if (!rawPort) return DEFAULT_PORT;

  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT must be a whole number between 1 and 65535, got "${rawPort}"`);
  }
  return port;
}

// backendRoot is the folder holding package.json; src/ and dist/ both sit one level below it
export function readConfig(env: NodeJS.ProcessEnv, backendRoot: string): AppConfig {
  const isElectron = Boolean(env.ELECTRON_APP);
  const frontendDist = isElectron && env.ELECTRON_FRONTEND_DIST ? env.ELECTRON_FRONTEND_DIST : null;

  return {
    port: readPort(env.PORT),
    host: LOOPBACK_HOST,
    isElectron,
    dataDir: env.ELECTRON_USER_DATA || backendRoot,
    frontendDist,
    pythonDir: path.join(backendRoot, 'python'),
  };
}
