const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const PATHS_MODULE = require.resolve('../utils/paths');
const PENDING_MODULE = require.resolve('../utils/pendingDownloads');

// Both paths.js (which resolves its BASE dir from ELECTRON_USER_DATA at
// require() time) and pendingDownloads.js (which reads PENDING_DOWNLOADS_FILE
// from paths.js at require() time) need a fresh require() per test to point
// at an isolated temp directory - same pattern as paths.test.js.
function loadPendingDownloads(userDataDir) {
  delete require.cache[PATHS_MODULE];
  delete require.cache[PENDING_MODULE];
  const prev = process.env.ELECTRON_USER_DATA;
  process.env.ELECTRON_USER_DATA = userDataDir;
  const mod = require('../utils/pendingDownloads');
  if (prev === undefined) delete process.env.ELECTRON_USER_DATA;
  else process.env.ELECTRON_USER_DATA = prev;
  return mod;
}

const SAMPLE_PARAMS = {
  url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  quality: 'best',
  audioOnly: false,
  outputDir: '',
  prefix: '',
  suffix: '',
  mainName: '',
  useNumbering: false,
  sequenceNum: 1,
};

describe('pendingDownloads', () => {
  test('addPendingDownload persists a record retrievable via getPendingDownloads', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kinetube-pending-test-'));
    try {
      const { addPendingDownload, getPendingDownloads } = loadPendingDownloads(tmp);
      const id = addPendingDownload(SAMPLE_PARAMS);

      const all = getPendingDownloads();
      assert.equal(all.length, 1);
      assert.equal(all[0].id, id);
      assert.equal(all[0].url, SAMPLE_PARAMS.url);
      assert.equal(all[0].title, '');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  test('re-adding the same params reuses the same id and does not duplicate the record', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kinetube-pending-test-'));
    try {
      const { addPendingDownload, getPendingDownloads } = loadPendingDownloads(tmp);
      const id1 = addPendingDownload(SAMPLE_PARAMS);
      const id2 = addPendingDownload(SAMPLE_PARAMS);

      assert.equal(id1, id2);
      assert.equal(getPendingDownloads().length, 1);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  test('different params produce different ids and both records coexist', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kinetube-pending-test-'));
    try {
      const { addPendingDownload, getPendingDownloads } = loadPendingDownloads(tmp);
      const id1 = addPendingDownload(SAMPLE_PARAMS);
      const id2 = addPendingDownload({ ...SAMPLE_PARAMS, quality: '1080p' });

      assert.notEqual(id1, id2);
      assert.equal(getPendingDownloads().length, 2);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  test('updatePendingDownloadTitle sets the title on the matching record', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kinetube-pending-test-'));
    try {
      const { addPendingDownload, updatePendingDownloadTitle, getPendingDownloads } = loadPendingDownloads(tmp);
      const id = addPendingDownload(SAMPLE_PARAMS);
      updatePendingDownloadTitle(id, 'My Video Title');

      assert.equal(getPendingDownloads()[0].title, 'My Video Title');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  test('removePendingDownload removes only the matching record', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kinetube-pending-test-'));
    try {
      const { addPendingDownload, removePendingDownload, getPendingDownloads } = loadPendingDownloads(tmp);
      const id1 = addPendingDownload(SAMPLE_PARAMS);
      const id2 = addPendingDownload({ ...SAMPLE_PARAMS, quality: '720p' });

      removePendingDownload(id1);

      const remaining = getPendingDownloads();
      assert.equal(remaining.length, 1);
      assert.equal(remaining[0].id, id2);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  test('getPendingDownloads returns an empty array when no state file exists yet', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kinetube-pending-test-'));
    try {
      const { getPendingDownloads } = loadPendingDownloads(tmp);
      assert.deepEqual(getPendingDownloads(), []);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  test('getPendingDownloads returns an empty array when the state file is corrupt', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kinetube-pending-test-'));
    try {
      fs.writeFileSync(path.join(tmp, 'pending-downloads.json'), '{not valid json');
      const { getPendingDownloads } = loadPendingDownloads(tmp);
      assert.deepEqual(getPendingDownloads(), []);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
