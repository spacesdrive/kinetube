import fs from 'node:fs';
import path from 'node:path';

export interface AppPaths {
  // tool binaries and the default download folder share this directory
  downloadsDir: string;
  modelsDir: string;
  sessionsDir: string;
  pendingDownloadsFile: string;
  accountsFile: string;
}

// every writable path in a packaged app comes from here, never from a path relative to the code
export function createAppPaths(dataDir: string): AppPaths {
  const sessionsDir = path.join(dataDir, 'sessions');

  return {
    downloadsDir: path.join(dataDir, 'downloads'),
    modelsDir: path.join(dataDir, 'models'),
    sessionsDir,
    // app state, not media, so it sits at the data root where it is never mistaken for a download
    pendingDownloadsFile: path.join(dataDir, 'pending-downloads.json'),
    accountsFile: path.join(sessionsDir, 'accounts.json'),
  };
}

export function ensureAppDirs(paths: AppPaths): void {
  for (const dir of [paths.downloadsDir, paths.modelsDir, paths.sessionsDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
