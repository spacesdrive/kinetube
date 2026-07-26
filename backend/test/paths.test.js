const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const PATHS_MODULE = require.resolve('../utils/paths');

// paths.js resolves its BASE directory once, at require() time, from
// process.env.ELECTRON_USER_DATA. To test both branches we have to clear
// the module cache and re-require it with the env var toggled around the call.
function loadPathsWithEnv(userDataDir) {
  delete require.cache[PATHS_MODULE];
  const prev = process.env.ELECTRON_USER_DATA;
  if (userDataDir === undefined) delete process.env.ELECTRON_USER_DATA;
  else process.env.ELECTRON_USER_DATA = userDataDir;

  const mod = require('../utils/paths');

  if (prev === undefined) delete process.env.ELECTRON_USER_DATA;
  else process.env.ELECTRON_USER_DATA = prev;

  return mod;
}

describe('paths', () => {
  test('resolves downloads/models/sessions under ELECTRON_USER_DATA when set (packaged build)', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kinetube-paths-test-'));
    try {
      const { DOWNLOADS_DIR, MODELS_DIR, SESSIONS_DIR } = loadPathsWithEnv(tmp);

      assert.equal(DOWNLOADS_DIR, path.join(tmp, 'downloads'));
      assert.equal(MODELS_DIR, path.join(tmp, 'models'));
      assert.equal(SESSIONS_DIR, path.join(tmp, 'sessions'));

      assert.ok(fs.existsSync(DOWNLOADS_DIR), 'DOWNLOADS_DIR should be created eagerly');
      assert.ok(fs.existsSync(MODELS_DIR), 'MODELS_DIR should be created eagerly');
      assert.ok(fs.existsSync(SESSIONS_DIR), 'SESSIONS_DIR should be created eagerly');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  test('falls back to a backend-relative default when ELECTRON_USER_DATA is unset (dev)', () => {
    const { DOWNLOADS_DIR, MODELS_DIR, SESSIONS_DIR } = loadPathsWithEnv(undefined);
    const backendRoot = path.join(__dirname, '..');

    assert.equal(DOWNLOADS_DIR, path.join(backendRoot, 'downloads'));
    assert.equal(MODELS_DIR, path.join(backendRoot, 'models'));
    assert.equal(SESSIONS_DIR, path.join(backendRoot, 'sessions'));
  });
});
