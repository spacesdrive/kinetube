import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';

import request from 'supertest';

import { createApp } from '../../src/app.ts';
import { createServices } from '../../src/container.ts';
import { createLogger } from '../../src/lib/logger.ts';
import { createFakeManagers } from '../fixtures/fakeManagers.ts';
import { parseSseBody } from '../fixtures/sseEvents.ts';
import { makeTempPaths, removeDir } from '../fixtures/tempDir.ts';
import { CHANNEL_PLAYLISTS_SAMPLE, PLAYLIST_SAMPLE } from '../fixtures/youtubeSamples.ts';

import type { Express } from 'express';
import type { FakeWhisper, FakeYtdlp } from '../fixtures/fakeManagers.ts';

const PORT = 3001;
const HOST = `localhost:${PORT}`;
const PLAYLIST_LINK = 'https://www.youtube.com/playlist?list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI';

describe('/api/v1', () => {
  let root = '';
  let app: Express;
  let ytdlp: FakeYtdlp;
  let whisper: FakeWhisper;

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
    whisper = managers.whisper;
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

  test('GET /health answers ok and says this backend does not serve the page', async () => {
    const res = await api.get('/health');
    assert.deepEqual(res.body, { ok: true, servesApp: false });
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

    test('a playlist is read flat from yt-dlp and returned with its entries', async () => {
      ytdlp.metadataCalls.length = 0;
      ytdlp.metadata = { exitCode: 0, stdout: JSON.stringify(PLAYLIST_SAMPLE), stderr: '', isTimedOut: false };
      const res = await api.get(`/api/v1/youtube/media?url=${encodeURIComponent(PLAYLIST_LINK)}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.data.kind, 'playlist');
      assert.equal(res.body.data.entries[1].status, 'unavailable');
      assert.ok(ytdlp.metadataCalls[0]?.args.includes('--flat-playlist'));
    });

    test('a channel playlists tab returns its playlists', async () => {
      ytdlp.metadata = { exitCode: 0, stdout: JSON.stringify(CHANNEL_PLAYLISTS_SAMPLE), stderr: '', isTimedOut: false };
      const res = await api.get(`/api/v1/youtube/media?url=${encodeURIComponent('https://www.youtube.com/@jawed/playlists')}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.data.tab, 'playlists');
      assert.equal(res.body.data.playlists.length, 1);
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

    test('a playlist link is refused with 400 and a message that says to pick its videos', async () => {
      const res = await api.post('/api/v1/downloads').send({ url: PLAYLIST_LINK });
      assert.equal(res.status, 400);
      assert.match(res.body.message, /channel or playlist link can't be downloaded in one go/);
      assert.equal(ytdlp.runs.length, 0);
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

    test('a batch with a bad shouldTranscribe or an unknown transcript format is refused with 400', async () => {
      const item = { url: 'https://youtu.be/dQw4w9WgXcQ' };
      assert.equal((await api.post('/api/v1/download-batches').send({ items: [{ ...item, shouldTranscribe: 'yes' }] })).status, 400);
      assert.equal((await api.post('/api/v1/download-batches').send({ items: [item], transcription: { formats: ['docx'] } })).status, 400);
    });

    test('an item is transcribed in the chosen formats after it downloads, before the next item starts', async () => {
      ytdlp.runs.length = 0;
      whisper.transcribeCalls.length = 0;
      const items = [{ url: 'https://youtu.be/dQw4w9WgXcQ', shouldTranscribe: true }, { url: 'https://youtu.be/aqz-KE-bpKQ' }];
      const responsePromise = api.post('/api/v1/download-batches').send({ items, quality: '360p', transcription: { formats: ['txt', 'srt'] } }).buffer(true).then((res) => res);

      await waitFor(() => ytdlp.runs.length === 1);
      ytdlp.runs[0]?.emit(`[download] Destination: ${path.join(root, 'first.mp4')}`);
      ytdlp.runs[0]?.exit(0);
      await waitFor(() => ytdlp.runs.length === 2);
      assert.equal(whisper.transcribeCalls.length, 1);
      ytdlp.runs[1]?.emit(`[download] Destination: ${path.join(root, 'second.mp4')}`);
      ytdlp.runs[1]?.exit(0);

      const events = parseSseBody((await responsePromise).text).filter((event) => event.event !== 'warning' && event.event !== 'itemProgress');
      assert.deepEqual(events.map((event) => event.event), ['start', 'itemStart', 'itemTranscribing', 'itemTranscribeProgress', 'itemDone', 'itemStart', 'itemDone', 'done']);
      const [first, second] = events.filter((event) => event.event === 'itemDone').map((event) => event.data as { filePath: string; transcriptPaths: string[]; transcriptError: string | null });
      assert.deepEqual(first?.transcriptPaths, [path.join(root, 'first.txt'), path.join(root, 'first.srt')]);
      assert.equal(first?.transcriptError, null);
      assert.deepEqual(second?.transcriptPaths, []);

      const call = whisper.transcribeCalls[0];
      assert.equal(call?.inputPath, first?.filePath);
      assert.deepEqual([call?.modelId, call?.language, call?.formats], ['base', 'auto', ['txt', 'srt']]);
    });

    test('a missing model is a warning, and the files are saved without transcripts', async () => {
      ytdlp.runs.length = 0;
      whisper.transcribeCalls.length = 0;
      const body = { items: [{ url: 'https://youtu.be/dQw4w9WgXcQ', shouldTranscribe: true }], quality: '360p', transcription: { modelId: 'small' } };
      const responsePromise = api.post('/api/v1/download-batches').send(body).buffer(true).then((res) => res);
      await waitFor(() => ytdlp.runs.length === 1);
      ytdlp.runs[0]?.emit(`[download] Destination: ${path.join(root, 'third.mp4')}`);
      ytdlp.runs[0]?.exit(0);

      const events = parseSseBody((await responsePromise).text);
      assert.ok(events.some((event) => event.event === 'warning' && /small model isn't downloaded/.test((event.data as { message: string }).message)));
      const itemDone = events.find((event) => event.event === 'itemDone')?.data as { isSuccess: boolean; transcriptError: string | null };
      assert.equal(itemDone.isSuccess, true);
      assert.match(itemDone.transcriptError ?? '', /small model isn't downloaded/);
      assert.equal(whisper.transcribeCalls.length, 0);
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

    test('an unknown or empty list of formats is refused', async () => {
      const filePath = path.join(root, 'talk.mp4');
      fs.writeFileSync(filePath, '');
      assert.equal((await api.post('/api/v1/transcriptions').send({ filePath, formats: ['docx'] })).status, 400);
      assert.equal((await api.post('/api/v1/transcriptions').send({ filePath, formats: [] })).status, 400);
    });

    test('the chosen formats reach whisper once each, and done carries every format', async () => {
      const filePath = path.join(root, 'talk.mp4');
      fs.writeFileSync(filePath, '');
      const res = await api.post('/api/v1/transcriptions').send({ filePath, formats: ['srt', 'txt', 'srt'] });
      const data = parseSseBody(res.text).find((event) => event.event === 'done')?.data as { success: boolean; transcripts: object; outputPaths: string[] };
      assert.equal(data.success, true);
      assert.deepEqual(Object.keys(data.transcripts).sort(), ['csv', 'json', 'lrc', 'srt', 'tsv', 'txt', 'vtt']);
      assert.deepEqual(data.outputPaths, [path.join(root, 'talk.srt'), path.join(root, 'talk.txt')]);
    });

    test('plain text is the only file when no formats are named', async () => {
      const filePath = path.join(root, 'talk.mp4');
      fs.writeFileSync(filePath, '');
      const res = await api.post('/api/v1/transcriptions').send({ filePath });
      const data = parseSseBody(res.text).find((event) => event.event === 'done')?.data as { outputPaths: string[] };
      assert.deepEqual(data.outputPaths, [path.join(root, 'talk.txt')]);
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
