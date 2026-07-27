const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

// server.js only auto-starts (binds a port, runs binary setup checks) when it
// is the process entry point (`require.main === module`). Requiring it here
// gives back the plain Express app, safe to drive with supertest.
const app = require('../server');

describe('GET /health', () => {
  test('responds with ok: true', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
  });
});

describe('GET /api/ytdlp-status', () => {
  test('reports installed-tool status without touching the network', async () => {
    const res = await request(app).get('/api/ytdlp-status');
    assert.equal(res.status, 200);
    assert.equal(typeof res.body.exists, 'boolean');
    assert.equal(typeof res.body.ffmpegAvailable, 'boolean');
    assert.equal(typeof res.body.requiredVersion, 'string');
  });
});

describe('POST /api/info', () => {
  test('rejects a request with no url', async () => {
    const res = await request(app).post('/api/info').send({});
    assert.equal(res.status, 400);
    assert.match(res.body.error, /url is required/i);
  });

  test('rejects an unsupported/invalid url before ever spawning yt-dlp', async () => {
    const res = await request(app).post('/api/info').send({ url: 'https://vimeo.com/12345' });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /invalid youtube url/i);
  });
});

describe('GET /api/validate-path', () => {
  test('reports valid: false when no dir query param is given', async () => {
    const res = await request(app).get('/api/validate-path');
    assert.equal(res.status, 200);
    assert.equal(res.body.valid, false);
  });

  test('reports valid: false for a path that does not exist', async () => {
    const res = await request(app).get('/api/validate-path').query({ dir: 'Z:/definitely/not/a/real/path/kinetube-test' });
    assert.equal(res.status, 200);
    assert.equal(res.body.valid, false);
  });

  test('reports valid: true for a path that does exist (the repo root)', async () => {
    const repoRoot = require('node:path').join(__dirname, '..', '..');
    const res = await request(app).get('/api/validate-path').query({ dir: repoRoot });
    assert.equal(res.status, 200);
    assert.equal(res.body.valid, true);
  });
});

describe('GET /api/transcribe/setup/check', () => {
  test('returns a ready boolean based on local whisper-cli presence', async () => {
    const res = await request(app).get('/api/transcribe/setup/check');
    assert.equal(res.status, 200);
    assert.equal(typeof res.body.ready, 'boolean');
  });
});

describe('GET /api/transcribe/models', () => {
  test('lists all five whisper model sizes with a ready flag', async () => {
    const res = await request(app).get('/api/transcribe/models');
    assert.equal(res.status, 200);
    assert.equal(res.body.models.length, 5);
    for (const model of res.body.models) {
      assert.equal(typeof model.key, 'string');
      assert.equal(typeof model.label, 'string');
      assert.equal(typeof model.ready, 'boolean');
    }
  });
});

describe('GET /api/instagram/accounts', () => {
  test('returns the saved-accounts array without touching Instagram', async () => {
    const res = await request(app).get('/api/instagram/accounts');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });
});

describe('GET /api/proxy/img', () => {
  test('rejects a missing url with 400', async () => {
    const res = await request(app).get('/api/proxy/img');
    assert.equal(res.status, 400);
  });

  test('rejects a disallowed hostname with 403', async () => {
    const res = await request(app).get('/api/proxy/img').query({ url: 'https://evil.example.com/x.png' });
    assert.equal(res.status, 403);
  });
});

describe('GET /api/download/pending and DELETE /api/download/pending/:id', () => {
  const { addPendingDownload, removePendingDownload } = require('../utils/pendingDownloads');

  test('lists in-flight downloads and dismisses one by id', async () => {
    const id = addPendingDownload({
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      quality: 'best',
      audioOnly: false,
      outputDir: '',
      prefix: '',
      suffix: '',
      mainName: '',
      useNumbering: false,
      sequenceNum: 1,
    });

    try {
      const listRes = await request(app).get('/api/download/pending');
      assert.equal(listRes.status, 200);
      assert.ok(listRes.body.pending.some((r) => r.id === id));

      const delRes = await request(app).delete(`/api/download/pending/${id}`);
      assert.equal(delRes.status, 200);
      assert.equal(delRes.body.success, true);

      const listAfter = await request(app).get('/api/download/pending');
      assert.ok(!listAfter.body.pending.some((r) => r.id === id));
    } finally {
      // In case an assertion above threw before the DELETE request ran.
      removePendingDownload(id);
    }
  });
});

describe('POST /api/download/:id/pause', () => {
  test('returns 404 for an id with no active (currently downloading) request', async () => {
    // Pause only targets a live in-memory yt-dlp process - a pending-download
    // record on disk (from the resume-after-restart registry) is not enough,
    // since there is nothing running to actually pause.
    const res = await request(app).post('/api/download/some-id-that-was-never-started/pause');
    assert.equal(res.status, 404);
    assert.ok(res.body.error);
  });
});
