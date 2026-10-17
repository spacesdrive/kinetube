import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createAppPaths, ensureAppDirs } from '../../src/lib/paths.ts';

import type { AppPaths } from '../../src/lib/paths.ts';

export function makeTempDir(prefix = 'kinetube-test-'): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function removeDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

// a throwaway data folder laid out like userData, so no test touches the real one
export function makeTempPaths(): AppPaths & { root: string } {
  const root = makeTempDir();
  const paths = createAppPaths(root);
  ensureAppDirs(paths);
  return { ...paths, root };
}
