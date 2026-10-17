import assert from 'node:assert/strict';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';

import request from 'supertest';

import { createApp } from '../../src/app.ts';
import { createServices } from '../../src/container.ts';
import { createLogger } from '../../src/lib/logger.ts';
import { createFakeManagers } from '../fixtures/fakeManagers.ts';
import { parseSseBody } from '../fixtures/sseEvents.ts';
import { makeTempPaths, removeDir } from '../fixtures/tempDir.ts';

import type { Express } from 'express';
import type { FakeYtdlp } from '../fixtures/fakeManagers.ts';

const PORT = 3001;
const HOST = `localhost:${PORT}`;

describe('/api/v1', () => {
  let root = '';
  let app: Express;
  let ytdlp: FakeYtdlp;

  // supertest picks its own port, so every request names the Host the origin guard expects
  const api = {
    get: (path: string) => request(app).get(path).set('Host', HOST),
    post: (path: string) => request(app).post(path).set('Host', HOST),
    delete: (path: string) => request(app).delete(path).set('Host', HOST),
  };

  before(() => {
    const paths = makeTempPaths();
    root = paths.root;
    const managers = createFakeManagers();
    ytdlp = managers.ytdlp;
    const silentLogger = createLogger(() => {});
    app = createApp({ config: { port: PORT, frontendDist: null }, services: createServices(managers, paths), logger: silentLogger });
  });
  after(() => removeDir(root));

  describe('the origin guard', () => {
    test('a request from another web page is refused before it does anything', async () => {
      const res = await api.post('/api/v1/downloads').set('Origin', 'https://evil.example').send({ url: 'https://youtu.be/dQw4w9WgXcQ' });
      assert.equal(res.status, 403);
      assert.equal(res.body.code, 'FORBIDDEN');
      assert.equal(ytdlp.runs.length, 0);
    });

    test('a request addressed to another host name is refused, which stops DNS rebinding', async () => {
      const res = await request(app).get('/api/v1/downloads').set('Host', 'evil.example:3001');
      assert.equal(res.status, 403);
    });

    test('the Vite dev server origin is allowed', async () => {
      const res = await api.get('/api/v1/downloads').set('Origin', 'http://localhost:5173');
      assert.equal(res.status, 200);
    });
  });

  describe('errors', () => {
    test('every error has the same shape with a request id', async () => {
      const res = await api.get('/api/v1/nothing-here');
      assert.equal(res.status, 404);
      assert.deepEqual(Object.keys(res.body).sort(), ['code', 'message', 'requestId', 'success']);
      assert.equal(res.body.success, false);
    });

    test('a body that is not valid JSON is a 400 that says so', async () => {
      const res = await api.post('/api/v1/downloads').set('Content-Type', 'application/json').send('{not json');
      assert.equal(res.status, 400);
      assert.match(res.body.message, /valid JSON/);
    });
  });

  test('GET /health answers ok', async () => {
    const res = await api.get('/health');
    assert.deepEqual(res.body, { ok: true });
  });

  describe('tools', () => {
    test('the list holds every tool and can be narrowed with ids', async () => {
      const all = await api.get('/api/v1/tools');
      assert.equal(all.body.total, 4);
      const some = await api.get('/api/v1/tools?ids=ytdlp,ffmpeg');
      assert.deepEqual(some.body.data.map((tool: { id: string }) => tool.id), ['ytdlp', 'ffmpeg']);
    });

    test('an unknown tool is 404 and an unknown id in the filter is 400', async () => {
      assert.equal((await api.get('/api/v1/tools/nope')).status, 404);
      assert.equal((await api.get('/api/v1/tools?ids=nope')).status, 400);
    });

    test('updating a tool other than yt-dlp is a 400', async () => {
      assert.equal((await api.post('/api/v1/tools/ffmpeg/update')).status, 400);
    });

    test('installing streams phase events and ends with done', async () => {
      const res = await api.post('/api/v1/tools/ytdlp/install').buffer(true);
      assert.equal(res.headers['content-type'], 'text/event-stream');
      assert.equal(parseSseBody(res.text).at(-1)?.event, 'done');
    });
  });

  describe('youtube media', () => {
    test('a missing url and a link from another site are both 400', async () => {
      assert.equal((await api.get('/api/v1/youtube/media')).status, 400);
      const res = await api.get('/api/v1/youtube/media?url=https://vimeo.com/1');
      assert.equal(res.status, 400);
      assert.match(res.body.message, /YouTube/);
    });

    test('a video is read from yt-dlp and returned as data', async () => {
      ytdlp.metadata = { exitCode: 0, stdout: JSON.stringify({ id: 'dQw4w9WgXcQ', title: 'Clip' }), stderr: '', isTimedOut: false };
      const res = await api.get('/api/v1/youtube/media?url=https://youtu.be/dQw4w9WgXcQ');
      assert.equal(res.status, 200);
      assert.equal(res.body.data.kind, 'video');
      assert.equal(res.body.data.title, 'Clip');
    });

    test('a yt-dlp failure is a 502 that includes its reason', async () => {
      ytdlp.metadata = { exitCode: 1, stdout: '', stderr: 'ERROR: Video unavailable', isTimedOut: false };
      const res = await api.get('/api/v1/youtube/media?url=https://youtu.be/dQw4w9WgXcQ');
      assert.equal(res.status, 502);
      assert.match(res.body.message, /Video unavailable/);
    });
  });

  describe('downloads', () => {
    test('the list starts empty, as a list envelope', async () => {
      assert.deepEqual((await api.get('/api/v1/downloads')).body, { data: [], total: 0 });
    });

    test('a channel link, an option-like value and an unknown quality are refused with 400', async () => {
      for (const body of [{ url: 'https://www.youtube.com/@some' }, { url: '--exec=calc' }, { url: 'https://youtu.be/dQw4w9WgXcQ', quality: '8k' }]) {
        assert.equal((await api.post('/api/v1/downloads').send(body)).status, 400, JSON.stringify(body));
      }
    });

    test('a download streams start then done, and the start event carries its id', async () => {
      ytdlp.runs.length = 0;
      // then() sends the request, and the stream stays open until the fake yt-dlp exits
      const responsePromise = api.post('/api/v1/downloads').send({ url: 'https://youtu.be/dQw4w9WgXcQ' }).buffer(true).then((res) => res);
      await waitFor(() => ytdlp.runs.length === 1);
      ytdlp.runs[0]?.exit(0);

      const events = parseSseBody((await responsePromise).text);
      assert.equal(events[0]?.event, 'start');
      assert.equal(events.at(-1)?.event, 'done');
    });

    test('pausing, reading or deleting an unknown id is 404 and a malformed id is 404 too', async () => {
      assert.equal((await api.post('/api/v1/downloads/0123456789abcdef/pause')).status, 404);
      assert.equal((await api.get('/api/v1/downloads/0123456789abcdef')).status, 404);
      assert.equal((await api.delete('/api/v1/downloads/../../x')).status, 404);
    });

    test('a batch with an invalid item is refused as a whole', async () => {
      const res = await api.post('/api/v1/download-batches').send({ items: [{ url: 'https://youtu.be/dQw4w9WgXcQ' }, { url: '--exec=calc' }] });
      assert.equal(res.status, 400);
    });
  });

  describe('instagram accounts', () => {
    test('the list is empty and removing an unknown account is 404', async () => {
      assert.deepEqual((await api.get('/api/v1/instagram/accounts')).body, { data: [], total: 0 });
      assert.equal((await api.delete('/api/v1/instagram/accounts/nobody')).status, 404);
    });

    test('a username that could reach outside the sessions folder is refused with 400', async () => {
      assert.equal((await api.delete('/api/v1/instagram/accounts/..%2F..%2Fsecret')).status, 400);
    });

    test('a two-factor code for a login nobody started is 404', async () => {
      assert.equal((await api.post('/api/v1/instagram/accounts/someone/two-factor').send({ code: '123456' })).status, 404);
    });
  });

  describe('whisper models and transcriptions', () => {
    test('models are listed and an unknown one is 404', async () => {
      assert.equal((await api.get('/api/v1/whisper-models')).body.total, 1);
      assert.equal((await api.get('/api/v1/whisper-models/huge')).status, 404);
    });

    test('a relative file path is refused and a missing file is 404', async () => {
      assert.equal((await api.post('/api/v1/transcriptions').send({ filePath: 'clip.mp4' })).status, 400);
      const res = await api.post('/api/v1/transcriptions').send({ filePath: path.join(root, 'missing.mp4') });
      assert.equal(res.status, 404);
    });
  });

  describe('folders and images', () => {
    test('an existing folder is returned and a missing one is 404', async () => {
      assert.equal((await api.get(`/api/v1/folders/${encodeURIComponent(root)}`)).body.data.exists, true);
      assert.equal((await api.get(`/api/v1/folders/${encodeURIComponent(path.join(root, 'nope'))}`)).status, 404);
    });

    test('an image from a host off the allowlist is 403 and a missing url is 400', async () => {
      assert.equal((await api.get('/api/v1/images?url=https://evilcdninstagram.com/x.png')).status, 403);
      assert.equal((await api.get('/api/v1/images')).status, 400);
    });
  });
});

async function waitFor(condition: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 100 && !condition(); attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
