import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';

import { readConfig } from '../src/config.ts';
import { createAppPaths, ensureAppDirs } from '../src/lib/paths.ts';
import { makeTempDir, removeDir } from './fixtures/tempDir.ts';

const BACKEND_ROOT = path.join('/', 'app', 'backend');

describe('readConfig', () => {
  test('development uses port 3001 and keeps data in the backend folder', () => {
    const config = readConfig({}, BACKEND_ROOT);

    assert.equal(config.port, 3001);
    assert.equal(config.host, '127.0.0.1');
    assert.equal(config.isElectron, false);
    assert.equal(config.dataDir, BACKEND_ROOT);
    assert.equal(config.frontendDist, null);
    assert.equal(config.pythonDir, path.join(BACKEND_ROOT, 'python'));
  });

  test('a packaged app keeps data in userData and serves the built frontend', () => {
    const config = readConfig(
      { ELECTRON_APP: '1', ELECTRON_USER_DATA: '/user-data', ELECTRON_FRONTEND_DIST: '/dist', PORT: '4000' },
      BACKEND_ROOT,
    );

    assert.equal(config.port, 4000);
    assert.equal(config.dataDir, '/user-data');
    assert.equal(config.frontendDist, '/dist');
  });

  test('the frontend folder is ignored outside Electron', () => {
    assert.equal(readConfig({ ELECTRON_FRONTEND_DIST: '/dist' }, BACKEND_ROOT).frontendDist, null);
  });

  test('a PORT that is not a valid port stops startup and names the variable', () => {
    assert.throws(() => readConfig({ PORT: 'abc' }, BACKEND_ROOT), /PORT must be a whole number/);
    assert.throws(() => readConfig({ PORT: '70000' }, BACKEND_ROOT), /PORT/);
  });
});

describe('createAppPaths and ensureAppDirs', () => {
  test('downloads, models and sessions are created under the data folder', () => {
    const root = makeTempDir();
    try {
      const paths = createAppPaths(root);
      ensureAppDirs(paths);

      assert.equal(paths.downloadsDir, path.join(root, 'downloads'));
      assert.equal(paths.pendingDownloadsFile, path.join(root, 'pending-downloads.json'));
      assert.equal(paths.accountsFile, path.join(root, 'sessions', 'accounts.json'));
      for (const dir of [paths.downloadsDir, paths.modelsDir, paths.sessionsDir]) assert.equal(fs.existsSync(dir), true);
    } finally {
      removeDir(root);
    }
  });
});
